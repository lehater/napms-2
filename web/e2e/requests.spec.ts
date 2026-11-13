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

async function login(page: Page, token: string, mode: 'requester' | 'decider' = 'requester', expectActive = true) {
  await page.getByLabel('Demo mode').selectOption(mode)
  // Suppress fill call details even on failure: tokens must never appear in reports.
  try { await page.getByLabel('Bearer token', { exact: true }).fill(token) }
  catch { throw new Error('Could not enter private demo credential') }
  await page.getByRole('button', { name: 'Применить token', exact: true }).click()
  if (expectActive) await expect(page.getByRole('button', { name: 'Очистить credential' })).toBeVisible()
}
async function create(page: Page, token: string) {
  await page.goto('/business-processes/00000000-0000-0000-0000-00000000000c?tab=needs')
  try { await page.getByLabel('Bearer token', {exact:true}).fill(token) } catch { throw new Error('Could not enter private credential') }
  await page.getByRole('button', {name:'Применить token',exact:true}).click()
  await page.locator('tbody button').first().click()
  await page.getByLabel('Revision', {exact:true}).selectOption({index:1})
  await page.getByLabel('Source Deployment', {exact:true}).selectOption({index:1})
  await page.getByLabel('Destination Deployment', {exact:true}).selectOption({index:1})
  await page.getByLabel('Подтверждаю состав заявки', {exact:true}).check()
  await page.getByRole('button', {name:'Подтвердить заявку',exact:true}).click()
  await expect(page).toHaveURL(/access-requests\/[0-9a-f-]{36}$/)
  await login(page, token)
  await expect(page.getByText('PENDING', {exact:true})).toBeVisible()
  return page.url().split('/').pop()!
}

test('requester creates, lists and opens persisted request', async ({ page, credentials }) => {
  await page.goto('/access-requests')
  await login(page, credentials.requester.token)
  await expect(page.getByText('Нет доступных заявок.')).toBeVisible()
  const id = await create(page, credentials.requester.token)
  await page.getByRole('navigation', { name: 'Основная навигация' }).getByRole('link', { name: 'Заявки на доступ', exact: true }).click()
  await page.locator(`tbody a[href^="/access-requests/${id}"]`).click()
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
    const id = await create(page, credentials.requester.token)
    await page.getByRole('navigation', { name: 'Основная навигация' }).getByRole('link', { name: 'Заявки на доступ', exact: true }).click()
    await page.locator(`tbody a[href^="/access-requests/${id}"]`).click()
    await page.getByLabel('Demo mode').selectOption('decider')
    await expect(page.getByText(id, { exact: true })).toHaveCount(0)
    await expect(page.getByLabel('Bearer token', { exact: true })).toHaveValue('')
    await login(page, credentials.decider.token, 'decider')
    await page.getByRole('button', { name: outcome, exact: true }).click()
    await page.getByRole('button', { name: 'Отмена', exact: true }).click()
    await expect(page.getByText('PENDING', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: outcome, exact: true }).click()
    await page.getByRole('button', { name: `Подтвердить ${outcome}`, exact: true }).dblclick()
    await expect(page.getByText(outcome, { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Подтвердить ' + outcome, exact: true })).toHaveCount(0)
    await page.getByRole('link', { name: 'Решение и основания', exact: true }).click()
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
  const id = await create(page, credentials.requester.token)
  await page.getByLabel('Demo mode').selectOption('decider')
  await login(page, credentials.requester.token, 'decider')
  await page.getByRole('button', { name: 'ALLOWED', exact: true }).click()
  await page.getByRole('button', { name: 'Подтвердить ALLOWED', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('403 · Недостаточно полномочий')
  await expect(page.getByText('PENDING', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Очистить credential' }).click()
  await login(page, credentials.decider.token, 'decider')
  await page.getByRole('button', { name: 'DENIED', exact: true }).click()
  const response = await page.request.post('/access-requests/' + id + '/decision', {
    headers: { Authorization: 'Bearer ' + credentials.decider.token }, data: { outcome: 'ALLOWED' },
  })
  expect(response.status()).toBe(201)
  await page.getByRole('button', { name: 'Подтвердить DENIED', exact: true }).click()
  await expect(page.getByText('Для заявки уже принято решение.', { exact: false })).toBeVisible()
  await expect(page.getByText('ALLOWED', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'DENIED', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Очистить credential' }).click()
  await login(page, credentials.exporter.token, 'decider')
  await expect(page.getByRole('alert')).toContainText('403 · Недостаточно полномочий')
  await expect(page.getByText(id, { exact: true })).toHaveCount(0)
  await page.getByRole('navigation', { name: 'Основная навигация' }).getByRole('link', { name: 'Заявки на доступ', exact: true }).click()
  await expect(page.getByText('Нет доступных заявок.')).toBeVisible()
})

test('validation, 404, 401 and offline errors have safe correction/retry paths', async ({ page, credentials }) => {
  await page.goto('/access-requests/new')
  await login(page, credentials.decider.token)
  await expect(page.getByRole('link', {name:'Выбрать процесс и потребность'})).toBeVisible()
  const invalid = await page.request.post('/access-requests', {headers:{Authorization:'Bearer '+credentials.decider.token},data:{sourceDeploymentId:'00000000-0000-0000-0000-00000000000a',destinationDeploymentId:'00000000-0000-0000-0000-00000000000b',interactionRevisionId:'00000000-0000-0000-0000-000000000009',connectivityNeedId:'00000000-0000-0000-0000-00000000000d'}})
  expect(invalid.status()).toBe(403)
  await create(page, credentials.requester.token)
  const absent = await page.request.post('/access-requests', {headers:{Authorization:'Bearer '+credentials.requester.token},data:{sourceDeploymentId:'00000000-0000-0000-0000-00000000000a',destinationDeploymentId:'00000000-0000-0000-0000-000000000001',interactionRevisionId:'00000000-0000-0000-0000-000000000009',connectivityNeedId:'00000000-0000-0000-0000-00000000000d'}})
  expect(absent.status()).toBe(404)
  await page.goto('/access-requests/00000000-0000-0000-0000-000000000001')
  await login(page, credentials.requester.token)
  await expect(page.getByRole('alert')).toContainText('403 · Недостаточно полномочий')
  await page.getByRole('button', { name: 'Очистить credential' }).click()
  await login(page, 'invalid-local-test-credential', 'requester', false)
  await expect(page.getByLabel('Bearer token', { exact: true })).toHaveValue('')
  await expect(page.getByRole('alert')).toContainText('недействителен')
  await page.goto('/access-requests')
  await login(page, credentials.requester.token)
  await expect(page.getByRole('heading', { name: 'Заявки на доступ', exact: true })).toBeVisible()
  await page.context().setOffline(true)
  await page.getByRole('link', { name: 'Новая заявка', exact: true }).click()
  await page.getByRole('navigation', { name: 'Основная навигация' }).getByRole('link', { name: 'Заявки на доступ', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Сеть недоступна')
  await page.context().setOffline(false)
  await page.getByRole('button', { name: 'Повторить', exact: true }).click()
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

test('a late 401 from a cleared credential cannot revoke the new manual session', async ({ page, credentials }) => {
  await page.goto('/access-requests')
  let release!: () => void, received!: () => void
  const gate = new Promise<void>(resolve => {release = resolve})
  const held = new Promise<void>(resolve => {received = resolve})
  await page.route('**/access-requests?limit=20&offset=0', async route => {
    if (route.request().headers().authorization !== 'Bearer invalid-local-test-credential') {await route.continue(); return}
    const response = await route.fetch()
    expect(response.status()).toBe(401)
    received()
    await gate
    await route.fulfill({response})
  })
  try {
    await login(page, 'invalid-local-test-credential')
    await held
    await page.getByRole('button', {name:'Очистить credential',exact:true}).click()
    await login(page, credentials.requester.token)
    await expect(page.getByRole('heading', {name:'Заявки на доступ',exact:true})).toBeVisible()
  } finally {release(); await page.unrouteAll({behavior:'wait'})}
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await expect(page.getByRole('button', {name:'Очистить credential',exact:true})).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})
