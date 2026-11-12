import { test as base, expect, type Page } from '@playwright/test'
import { mkdtemp, readFile, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'

type Credentials = Record<'requester' | 'decider' | 'exporter', { actorId: string; token: string }>
const root = resolve(import.meta.dirname, '../..')
const python = process.env.NAPMS_PYTHON || join(root, '.venv/bin/python')

const test = base.extend<{}, { credentials: Credentials }>({
  credentials: [async ({}, use) => {
    // Fail rather than accidentally test a pre-existing backend/database.
    const probe = createServer()
    probe.listen(8000, '127.0.0.1')
    await once(probe, 'listening')
    await new Promise<void>(done => probe.close(() => done()))
    const dir = await mkdtemp(join(tmpdir(), 'napms-web-e2e-'))
    const args = ['--db', join(dir, 'test.sqlite3'), '--credentials', join(dir, 'credentials.json')]
    const init = spawnSync(python, ['-m', 'napms.dev', 'init-demo', ...args], { cwd: root })
    if (init.status !== 0) throw new Error('Temporary demo initialization failed')
    const credentials: Credentials = JSON.parse(await readFile(join(dir, 'credentials.json'), 'utf8'))
    const server = spawn(python, ['-m', 'napms.dev', 'serve', ...args], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
    let logs = ''
    server.stdout.on('data', chunk => { logs += chunk.toString() })
    server.stderr.on('data', chunk => { logs += chunk.toString() })
    try {
      let ready = false
      for (let i = 0; i < 100; i++) {
        if (server.exitCode !== null) throw new Error('Temporary API exited')
        try { ready = (await fetch('http://127.0.0.1:8000/openapi.json')).ok } catch { /* starting */ }
        if (ready) break
        await new Promise(done => setTimeout(done, 50))
      }
      if (!ready) throw new Error('Temporary API did not become ready')
      await use(credentials)
      // Compare booleans only: failure output must never print a credential.
      const tracked = spawnSync('git', ['ls-files', '-z'], { cwd: root }).stdout.toString().split('\0').filter(Boolean)
      const assets = await readdir(join(root, 'web/dist/assets'))
      const paths = [...tracked.map(p => join(root, p)), ...assets.map(p => join(root, 'web/dist/assets', p))]
      let staticLeak = false
      for (const path of paths) {
        const contents = await readFile(path)
        staticLeak ||= Object.values(credentials).some(c => contents.includes(c.token))
      }
      expect(staticLeak, 'Tracked files and production bundle must exclude credentials').toBe(false)
    } finally {
      server.kill('SIGTERM')
      if (server.exitCode === null) await once(server, 'exit')
      const leaked = Object.values(credentials).some(c => logs.includes(c.token))
      await rm(dir, { recursive: true, force: true })
      expect(leaked, 'API logs must exclude credentials').toBe(false)
    }
  }, { scope: 'worker' }],
})

async function login(page: Page, token: string, mode: 'requester' | 'decider' = 'requester') {
  await page.getByLabel('Demo mode').selectOption(mode)
  // Suppress fill call details even on failure: tokens must never appear in reports.
  try { await page.getByLabel('Bearer token', { exact: true }).fill(token) }
  catch { throw new Error('Could not enter private demo credential') }
  await page.getByRole('button', { name: 'Use token', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Clear credential' })).toBeVisible()
}
async function create(page: Page) {
  await page.getByRole('link', { name: 'New request', exact: true }).click()
  await page.getByRole('button', { name: 'Create request', exact: true }).click()
  await expect(page.getByText('PENDING', { exact: true })).toBeVisible()
  return page.url().split('/').pop()!
}

test('requester creates, lists and opens persisted request', async ({ page, credentials }) => {
  await page.goto('/access-requests')
  await login(page, credentials.requester.token)
  await expect(page.getByText('No visible requests yet.')).toBeVisible()
  const id = await create(page)
  await page.getByRole('link', { name: 'Requests', exact: true }).click()
  await page.getByRole('link', { name: id, exact: true }).click()
  await expect(page.getByText('PENDING', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Bearer token', { exact: true })).toHaveValue('')
  await expect(page.getByText(id, { exact: true })).toHaveCount(0)
  await login(page, credentials.requester.token)
  await expect(page.getByText(id, { exact: true })).toBeVisible()
  await expect(page.getByText('PENDING', { exact: true })).toBeVisible()
})

test('real ALLOWED and DENIED persist across credential switches and browser reloads', async ({ page, credentials }) => {
  await page.goto('/access-requests')
  await login(page, credentials.requester.token)
  for (const outcome of ['ALLOWED', 'DENIED'] as const) {
    const id = await create(page)
    await page.getByRole('link', { name: 'Requests', exact: true }).click()
    await page.getByRole('link', { name: id, exact: true }).click()
    await page.getByLabel('Demo mode').selectOption('decider')
    await expect(page.getByText(id, { exact: true })).toHaveCount(0)
    await expect(page.getByLabel('Bearer token', { exact: true })).toHaveValue('')
    await login(page, credentials.decider.token, 'decider')
    await page.getByRole('button', { name: outcome, exact: true }).click()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.getByText('PENDING', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: outcome, exact: true }).click()
    await page.getByRole('button', { name: `Confirm ${outcome}`, exact: true }).dblclick()
    await expect(page.getByText(outcome, { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirm ' + outcome, exact: true })).toHaveCount(0)
    const policy = page.locator('dt').filter({ hasText: /^policyRuleId$/ }).locator('..').locator('dd')
    if (outcome === 'DENIED') await expect(policy).toHaveText('null')
    else await expect(policy).toHaveText(/[0-9a-f-]{36}/)
    await page.getByLabel('Demo mode').selectOption('requester')
    await expect(page.getByText(id, { exact: true })).toHaveCount(0)
    await login(page, credentials.requester.token)
    await expect(page.getByText(outcome, { exact: true }).first()).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Bearer token', { exact: true })).toHaveValue('')
    await login(page, credentials.requester.token)
    await expect(page.getByText(outcome, { exact: true }).first()).toBeVisible()
    const stored = await page.request.get('/access-requests/' + id, { headers: { Authorization: 'Bearer ' + credentials.requester.token } })
    const body = await stored.json()
    expect(body.status).toBe(outcome)
    expect(body.decision.outcome).toBe(outcome)
    expect(body.decision.policyRuleId === null).toBe(outcome === 'DENIED')
    const storage = await page.evaluate(() => [Object.keys(localStorage), Object.keys(sessionStorage), document.cookie])
    expect(storage).toEqual([[], [], ''])
    const content = await page.content()
    expect(Object.values(credentials).some(c => content.includes(c.token))).toBe(false)
  }
})

test('server rejects mismatched mode, isolates unrelated actor, and reloads a concurrent decision', async ({ page, credentials }) => {
  await page.goto('/access-requests')
  await login(page, credentials.requester.token)
  const id = await create(page)
  await page.getByLabel('Demo mode').selectOption('decider')
  await login(page, credentials.requester.token, 'decider')
  await page.getByRole('button', { name: 'ALLOWED', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm ALLOWED', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Permission denied')
  await expect(page.getByText('PENDING', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Clear credential' }).click()
  await login(page, credentials.decider.token, 'decider')
  await page.getByRole('button', { name: 'DENIED', exact: true }).click()
  const response = await page.request.post('/access-requests/' + id + '/decision', {
    headers: { Authorization: 'Bearer ' + credentials.decider.token }, data: { outcome: 'ALLOWED' },
  })
  expect(response.status()).toBe(201)
  await page.getByRole('button', { name: 'Confirm DENIED', exact: true }).click()
  await expect(page.getByText('This request already has a decision.', { exact: false })).toBeVisible()
  await expect(page.getByText('ALLOWED', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'DENIED', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Clear credential' }).click()
  await login(page, credentials.exporter.token, 'decider')
  await expect(page.getByRole('alert')).toContainText('Permission denied')
  await expect(page.getByText(id, { exact: true })).toHaveCount(0)
  await page.getByRole('link', { name: 'Requests', exact: true }).click()
  await expect(page.getByText('No visible requests yet.')).toBeVisible()
})

test('validation, 404, 401 and offline errors have safe correction/retry paths', async ({ page, credentials }) => {
  await page.goto('/access-requests/new')
  await login(page, credentials.decider.token)
  await page.getByRole('button', { name: 'Create request', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Permission denied')
  await page.getByRole('button', { name: 'Clear credential' }).click()
  await login(page, credentials.requester.token)
  await page.getByLabel('destinationDeploymentId', { exact: true }).fill('00000000-0000-0000-0000-000000000001')
  await page.getByRole('button', { name: 'Create request', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('not found')
  await page.goto('/access-requests/00000000-0000-0000-0000-000000000001')
  await login(page, credentials.requester.token)
  await expect(page.getByRole('alert')).toContainText('not found')
  await page.getByRole('button', { name: 'Clear credential' }).click()
  await login(page, 'invalid-local-test-credential')
  await expect(page.getByLabel('Bearer token', { exact: true })).toHaveValue('')
  await expect(page.getByRole('alert')).toContainText('invalid')
  await page.goto('/access-requests')
  await login(page, credentials.requester.token)
  await expect(page.getByRole('heading', { name: 'Requests', exact: true })).toBeVisible()
  await page.context().setOffline(true)
  await page.getByRole('link', { name: 'New request', exact: true }).click()
  await page.getByRole('link', { name: 'Requests', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Network unavailable')
  await page.context().setOffline(false)
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.getByRole('table')).toBeVisible()
})

test('supported Vite configuration rejects non-loopback CLI bind', () => {
  for (const host of ['0.0.0.0', '192.0.2.1', '::', 'localhost']) {
    const result = spawnSync(process.execPath, [join(root, 'web/node_modules/vite/bin/vite.js'), '--host', host], {
      cwd: join(root, 'web'), timeout: 10_000, encoding: 'utf8',
    })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Only 127.0.0.1 or ::1 is supported')
  }
})


test('normal development never enables actor substitution', async ({ request, credentials }) => {
  const profile = await request.get('/__napms_dev/profile', { headers: { 'X-NAPMS-Dev': '1', Origin: 'http://127.0.0.1:5173' } })
  expect(profile.headers()['content-type']).not.toContain('application/json')
  const response = await request.get('/business-processes', { headers: { 'X-NAPMS-Dev': '1', 'X-NAPMS-Demo-Actor': 'requester' } })
  expect(response.status()).toBe(401)
  expect(Boolean(credentials.requester.actorId)).toBe(true)
})
