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

const test = base.extend<{}, { backend: { credentials: Credentials; stop: () => Promise<void>; start: () => Promise<void> } }>({
  backend: [async ({}, use) => {
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
    let server: ReturnType<typeof spawn> | undefined
    let logs = ''
    async function stop() {
      if (server && server.exitCode === null) {
        server.kill('SIGTERM')
        await once(server, 'exit')
      }
    }
    async function start() {
      server = spawn(python, ['-m', 'napms.dev', 'serve', ...args], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
      server.stdout!.on('data', chunk => { logs += chunk.toString() })
      server.stderr!.on('data', chunk => { logs += chunk.toString() })
      let ready = false
      for (let i = 0; i < 100; i++) {
        if (server.exitCode !== null) throw new Error('Temporary API exited')
        try { ready = (await fetch('http://127.0.0.1:8000/openapi.json')).ok } catch { /* starting */ }
        if (ready) break
        await new Promise(done => setTimeout(done, 50))
      }
      if (!ready) throw new Error('Temporary API did not become ready')
    }
    try {
      await start()
      await use({ credentials, stop, start })
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
      await stop()
      const leaked = Object.values(credentials).some(c => logs.includes(c.token))
      await rm(dir, { recursive: true, force: true })
      expect(leaked, 'API logs must exclude credentials').toBe(false)
    }
  }, { scope: 'worker' }],
})

async function login(page: Page, token: string) {
  try { await page.getByLabel('Bearer token', { exact: true }).fill(token) }
  catch { throw new Error('Could not enter private demo credential') }
  await page.getByRole('button', { name: 'Применить token', exact: true }).click()
}

test('REAL Process persists through refresh and actual backend restart; MOCK remains isolated', async ({ page, backend }) => {
  const { credentials } = backend
  await page.goto('/prototype')
  await page.getByRole('navigation', { name: 'Prototype navigation' }).getByRole('link', { name: 'Бизнес-процессы', exact: true }).click()
  await expect(page).toHaveURL(/\/business-processes$/)
  await login(page, credentials.requester.token)
  await page.getByRole('link', { name: 'Создать бизнес-процесс', exact: true }).click()
  await page.getByLabel('Название', { exact: true }).fill('Приёмка SQLite')
  await page.getByLabel('Описание', { exact: true }).fill('Сохраняется после перезапуска')
  await page.getByLabel('Ответственная организация', { exact: true }).fill('Финансы')
  await page.getByRole('button', { name: 'Сохранить', exact: true }).dblclick()
  await expect(page.getByRole('heading', { name: 'Приёмка SQLite', exact: true })).toBeVisible()
  const detail = page.url()
  expect(detail).toMatch(/business-processes\/[0-9a-f-]{36}$/)
  await page.getByRole('link', { name: 'Потребности', exact: true }).click()
  await expect(page.getByText('Серверное чтение потребностей ещё не подключено.')).toBeVisible()
  await page.getByRole('navigation', { name: 'Prototype navigation' }).getByRole('link', { name: 'Бизнес-процессы', exact: true }).click()
  await expect(page.getByRole('table')).toContainText('Приёмка SQLite')
  await page.getByRole('link', { name: 'Приёмка SQLite', exact: true }).click()
  await page.reload()
  await expect(page.getByLabel('Bearer token')).toHaveValue('')
  await expect(page.getByRole('heading', { name: 'Приёмка SQLite', exact: true })).toHaveCount(0)
  await login(page, credentials.requester.token)
  await expect(page.getByText('Сохраняется после перезапуска', { exact: true })).toBeVisible()
  await backend.stop()
  await backend.start()
  await page.reload()
  await login(page, credentials.requester.token)
  await expect(page.getByRole('heading', { name: 'Приёмка SQLite', exact: true })).toBeVisible()
  await expect(page.getByText('Финансы', { exact: true })).toBeVisible()
  const stored = await page.request.get('/business-processes', { headers: { Authorization: 'Bearer ' + credentials.requester.token } })
  const items = (await stored.json()).items
  expect(items.filter((p: { name: string }) => p.name === 'Приёмка SQLite')).toHaveLength(1)
  expect(items.some((p: { processId: string }) => p.processId.startsWith('mock-'))).toBe(false)
  const storage = await page.evaluate(() => [...Object.values(localStorage), ...Object.values(sessionStorage), document.cookie])
  expect(Object.values(credentials).some(c => storage.some(v => v.includes(c.token)))).toBe(false)
  await page.getByRole('link', { name: /MOCK Simulation:/ }).click()
  await expect(page.getByRole('heading', { name: 'Бизнес-процессы', exact: true })).toBeVisible()
  await expect(page.getByText('Приёмка SQLite', { exact: true })).toHaveCount(0)
})

test('REAL Process authorization, failed POST and actual API outage have safe retry states', async ({ page, backend }) => {
  const { credentials } = backend
  await page.goto('/business-processes')
  await login(page, 'invalid-local-test-credential')
  await expect(page.getByRole('alert')).toContainText('недействителен')
  await expect(page.getByLabel('Bearer token')).toHaveValue('')
  await login(page, credentials.decider.token)
  await expect(page.getByRole('alert')).toContainText('403 · Недостаточно полномочий')
  await page.getByRole('link', { name: 'Создать бизнес-процесс', exact: true }).click()
  await page.getByLabel('Название', { exact: true }).fill('Нельзя сохранить')
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('403 · Недостаточно полномочий')
  await expect(page).toHaveURL(/\/business-processes\/new$/)
  await page.getByRole('button', { name: 'Очистить credential' }).click()
  await login(page, credentials.requester.token)
  await page.getByRole('navigation', { name: 'Prototype navigation' }).getByRole('link', { name: 'Бизнес-процессы', exact: true }).click()
  await expect(page.getByRole('table')).not.toContainText('Нельзя сохранить')
  await backend.stop()
  await page.getByRole('link', { name: 'Создать бизнес-процесс', exact: true }).click()
  await page.getByLabel('Название', { exact: true }).fill('Не записано при сбое')
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('navigation', { name: 'Prototype navigation' }).getByRole('link', { name: 'Бизнес-процессы', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('table')).toHaveCount(0)
  await backend.start()
  await page.getByRole('button', { name: 'Повторить', exact: true }).click()
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByRole('table')).not.toContainText('Не записано при сбое')
})
