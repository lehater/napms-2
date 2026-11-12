import { test as base, expect } from '@playwright/test'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'

const root = resolve(import.meta.dirname, '../..')
const python = process.env.NAPMS_PYTHON || join(root, '.venv/bin/python')
type Harness = { stop: () => Promise<void>; start: () => Promise<void>; file: string; privateTokens: () => Promise<string[]> }
const test = base.extend<{}, { harness: Harness }>({
  harness: [async ({}, use) => {
    const dir = await mkdtemp(join(tmpdir(), 'napms-harness-'))
    const file = join(dir, 'credentials.json'), db = join(dir, 'test.sqlite3')
    let child: ReturnType<typeof spawn> | undefined, logs = ''
    async function privateTokens() { return Object.values(JSON.parse(await readFile(file, 'utf8')) as Record<string, { token: string }>).map(c => c.token) }
    async function stop() { if (child && child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit') } }
    async function start() {
      let ready = false
      child = spawn(python, ['-m', 'napms.dev', 'run', '--profile', 'local-demo', '--db', db, '--credentials', file], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
      child.stdout!.on('data', chunk => { const s = chunk.toString(); logs += s; if (s.includes('NAPMS LOCAL DEMO ready:')) ready = true })
      child.stderr!.on('data', chunk => { logs += chunk.toString() })
      for (let i = 0; i < 300 && !ready; i++) {
        if (child.exitCode !== null) throw new Error('One-command local demo exited before readiness')
        await new Promise(done => setTimeout(done, 100))
      }
      if (!ready) throw new Error('One-command local demo readiness timed out')
    }
    try {
      await start()
      await use({ stop, start, file, privateTokens })
      const tokens = await privateTokens()
      expect(tokens.some(token => logs.includes(token)), 'Service logs exclude private credentials').toBe(false)
      const assets = await readdir(join(root, 'web/dist/assets'))
      for (const asset of assets) {
        const data = await readFile(join(root, 'web/dist/assets', asset))
        expect(tokens.some(token => data.includes(token)), 'Production bundle excludes credentials').toBe(false)
        expect(data.includes('NAPMS_CREDENTIALS_FILE'), 'Server configuration is absent from client assets').toBe(false)
        expect(data.includes('/__napms_dev/profile'), 'Production assets contain no profile probe').toBe(false)
      }
    } finally { await stop(); await rm(dir, { recursive: true, force: true }) }
  }, { scope: 'worker' }],
})

test('one-command actor switching preserves independent grants and actual persistence', async ({ page, harness }) => {
  let browserBearer = false
  page.on('request', request => { browserBearer ||= Boolean(request.headers().authorization) })
  await page.goto('/business-processes')
  await expect(page.getByRole('alert')).toContainText('Authentication required')
  await page.getByLabel('Demo actor', { exact: true }).selectOption('requester')
  await page.getByRole('link', { name: 'Создать бизнес-процесс', exact: true }).click()
  await page.getByLabel('Название', { exact: true }).fill('Harness acceptance')
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Harness acceptance', exact: true })).toBeVisible()
  const processUrl = page.url()
  await page.getByLabel('Demo actor', { exact: true }).selectOption('decider')
  await expect(page.getByRole('heading', { name: 'Harness acceptance', exact: true })).toHaveCount(0)
  await expect(page.getByRole('alert')).toContainText('Permission denied')
  await page.getByRole('navigation', { name: 'Prototype navigation' }).getByRole('link', { name: 'Бизнес-процессы', exact: true }).click()
  await page.getByRole('link', { name: 'Создать бизнес-процесс', exact: true }).click()
  await page.getByLabel('Название', { exact: true }).fill('No create grant')
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Permission denied')
  await page.getByLabel('Demo actor', { exact: true }).selectOption('requester')
  await expect(page.getByLabel('Название', { exact: true })).toHaveValue('')
  await page.getByRole('navigation', { name: 'Real API navigation' }).getByRole('link', { name: 'Новая заявка →' }).click()
  await page.getByRole('button', { name: 'Create request', exact: true }).click()
  await expect(page.getByText('PENDING', { exact: true })).toBeVisible()
  const requestUrl = page.url()
  await page.getByLabel('Demo mode').selectOption('decider')
  await page.getByRole('button', { name: 'ALLOWED', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm ALLOWED', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Permission denied')
  await page.getByLabel('Demo actor', { exact: true }).selectOption('decider')
  await expect(page.getByRole('button', { name: 'Confirm ALLOWED', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'ALLOWED', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm ALLOWED', exact: true }).click()
  await expect(page.getByText('ALLOWED', { exact: true }).first()).toBeVisible()
  await page.getByLabel('Demo actor', { exact: true }).selectOption('exporter')
  await expect(page.getByRole('alert')).toContainText('Permission denied')
  await page.getByLabel('Demo actor', { exact: true }).selectOption('anonymous')
  await expect(page.getByRole('alert')).toContainText('Authentication required')
  await page.getByLabel('Demo actor', { exact: true }).selectOption('requester')
  await expect(page.getByText('ALLOWED', { exact: true }).first()).toBeVisible()
  await page.goto(processUrl)
  await expect(page.getByLabel('Demo actor', { exact: true })).toHaveValue('anonymous')
  await page.getByLabel('Demo actor', { exact: true }).selectOption('requester')
  await expect(page.getByRole('heading', { name: 'Harness acceptance', exact: true })).toBeVisible()
  await harness.stop(); await harness.start()
  await page.reload()
  await page.getByLabel('Demo actor', { exact: true }).selectOption('requester')
  await expect(page.getByRole('heading', { name: 'Harness acceptance', exact: true })).toBeVisible()
  const tokens = await harness.privateTokens()
  const browserData = await page.evaluate(() => JSON.stringify([document.documentElement.outerHTML, localStorage, sessionStorage, document.cookie, location.href]))
  expect(tokens.some(token => browserData.includes(token)), 'No private tokens in browser').toBe(false)
  expect(browserBearer, 'Browser never sends a bearer header in harness profile').toBe(false)
  expect(requestUrl).toMatch(/access-requests\/[0-9a-f-]{36}$/)
})

test('proxy rejects CSRF, unknown actors and private static file access; backend still supplies 401/403', async ({ request, harness }) => {
  const busy = spawnSync(python, ['-m', 'napms.dev', 'run', '--profile', 'local-demo', '--db', harness.file + '.unused.db', '--credentials', harness.file + '.unused.json'], { cwd: root, encoding: 'utf8', timeout: 10_000 })
  expect(busy.status).toBe(1)
  expect(busy.stderr).toContain('Port 8000 is busy')
  const headers = { Origin: 'http://127.0.0.1:5173', 'X-NAPMS-Dev': '1', 'X-NAPMS-Demo-Actor': 'requester' }
  const profile = await request.get('/__napms_dev/profile', { headers })
  expect(await profile.json()).toEqual({ enabled: true, actors: ['anonymous', 'requester', 'decider', 'exporter'] })
  const attempts: Record<string, string>[] = [{ Origin: 'null' }, { Origin: 'http://evil.example' }, { Origin: 'http://127.0.0.1:5174' },
    { Host: 'rebind.example:5173' }, { 'X-NAPMS-Dev': '' }, { 'Sec-Fetch-Site': 'cross-site' }, { Origin: '' }]
  for (const extra of attempts) {
    const response = await request.post('/business-processes', { headers: { ...headers, ...extra }, data: { name: 'CSRF must not persist' } })
    expect(response.status()).toBe(403)
  }
  expect((await request.fetch('/business-processes', { method: 'OPTIONS', headers })).status()).toBe(403)
  expect((await request.get('/business-processes', { headers: { ...headers, 'X-NAPMS-Demo-Actor': 'admin' } })).status()).toBe(422)
  expect((await request.get('/business-processes', { headers: { ...headers, Authorization: 'Bearer conflicting' } })).status()).toBe(422)
  expect((await request.get('/business-processes', { headers: { ...headers, 'X-NAPMS-Demo-Actor': 'anonymous' } })).status()).toBe(401)
  expect((await request.get('/business-processes', { headers: { ...headers, 'X-NAPMS-Demo-Actor': 'decider' } })).status()).toBe(403)
  const listing = await request.get('/business-processes', { headers })
  expect(listing.status()).toBe(200)
  const body = await listing.text()
  expect(body.includes('CSRF must not persist')).toBe(false)
  const tokens = await harness.privateTokens()
  expect(tokens.some(t => body.includes(t))).toBe(false)
  const response = await request.get('/@fs' + harness.file)
  expect(response.status()).toBe(403)
  const staticBody = await response.text()
  expect(tokens.some(t => staticBody.includes(t))).toBe(false)
  const direct = await request.get('http://127.0.0.1:8000/business-processes', { headers: { 'X-NAPMS-Demo-Actor': 'requester' } })
  expect(direct.status()).toBe(401)
})

test('production and preview reject activation', async ({ harness }) => {
  const vite = join(root, 'web/node_modules/vite/bin/vite.js')
  for (const args of [['build', '--mode', 'local-demo'], ['preview', '--mode', 'local-demo'], ['build'], ['preview']]) {
    const result = spawnSync(process.execPath, [vite, ...args], { cwd: join(root, 'web'), env: { ...process.env, NAPMS_LOCAL_DEMO: '1', NAPMS_CREDENTIALS_FILE: harness.file }, encoding: 'utf8', timeout: 15_000 })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('build and preview cannot activate it')
  }
})
