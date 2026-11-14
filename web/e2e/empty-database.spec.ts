import { test, expect } from '@playwright/test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'

const root = resolve(import.meta.dirname, '../..')
const python = process.env.NAPMS_PYTHON || join(root, '.venv/bin/python')

test('empty schema-only SQLite renders only real API data, without synthetic fallback', async ({ page }) => {
  const dir = await mkdtemp(join(tmpdir(), 'napms-empty-'))
  const db = join(dir, 'empty.sqlite3'), credentials = join(dir, 'credentials.json')
  const args = ['--db', db, '--credentials', credentials]
  let backend: ChildProcess | undefined
  const command = (name: string, flags: string[] = []) => {
    const result = spawnSync(python, ['-m', 'napms.dev', name, ...flags, ...args],
      { cwd: root, encoding: 'utf8' })
    expect(result.status, name + ' must succeed').toBe(0)
  }
  const counts = () => {
    const result = spawnSync(python, ['-c',
      'import json,sqlite3,sys; c=sqlite3.connect(sys.argv[1]); tables=[r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type=\'table\' AND name NOT LIKE \'sqlite_%\'")]; print(json.dumps({t:c.execute("SELECT COUNT(*) FROM "+t).fetchone()[0] for t in tables}))',
      db], { encoding: 'utf8' })
    expect(result.status).toBe(0)
    return JSON.parse(result.stdout) as Record<string, number>
  }

  try {
    // Playwright owns port 5173; reset-demo correctly refuses to run with NAPMS
    // active. The destructive reset is covered by backend tests with stopped ports.
    // This browser test begins with a fresh schema-only SQLite instead.
    const schema = spawnSync(python, ['-c',
      'import sys; from napms.storage import Database; Database(sys.argv[1]).initialize()', db],
      { cwd: root, encoding: 'utf8' })
    expect(schema.status, 'schema initialization must succeed').toBe(0)
    expect(Object.values(counts()).every(n => n === 0)).toBe(true)
    command('init-auth')
    const afterAuth = counts()
    expect(afterAuth.actors).toBe(3)
    for (const table of ['applications', 'components', 'interaction_revisions', 'resources',
      'deployments', 'processes', 'needs', 'access_requests', 'decisions', 'policy_rules'])
      expect(afterAuth[table], table + ' should be empty').toBe(0)

    backend = spawn(python, ['-m', 'napms.dev', 'serve', ...args], {
      cwd: root, env: { ...process.env, NAPMS_DEMO_SHARED_READ: '1' }, stdio: 'ignore',
    })
    let ready = false
    for (let i = 0; i < 120; i++) {
      if (backend.exitCode !== null) throw new Error('Temporary empty SQLite backend exited')
      try { ready = (await fetch('http://127.0.0.1:8000/openapi.json')).ok } catch { /* startup */ }
      if (ready) break
      await new Promise(done => setTimeout(done, 50))
    }
    if (!ready) throw new Error('Empty SQLite backend did not become ready')

    const tokens = JSON.parse(await readFile(credentials, 'utf8')) as Record<string, { token: string }>
    await page.goto('/business-processes')
    try { await page.getByLabel('Bearer token', { exact: true }).fill(tokens.requester.token) }
    catch { throw new Error('Cannot enter temporary private credential') }
    await page.getByRole('button', { name: 'Применить token', exact: true }).click()
    await expect(page.getByText('На этой странице нет бизнес-процессов')).toBeVisible()

    const nav = page.getByRole('navigation', { name: 'Основная навигация' })
    for (const [label, emptyText] of [
      ['Ресурсы', 'Ресурсы ещё не созданы.'],
      ['Профили приложений', 'Профили приложений ещё не созданы.'],
      ['Развёрнутые компоненты', 'Развёртывания ещё не созданы.'],
      ['Заявки на доступ', 'Нет доступных заявок.'],
      ['Правила политики', 'Нет доступных вам правил'],
    ]) {
      await nav.getByRole('link', { name: label, exact: true }).click()
      // Manual credentials are scoped to each screen; do not persist tokens.
      try { await page.getByLabel('Bearer token', { exact: true }).fill(tokens.requester.token) }
      catch { throw new Error('Cannot enter temporary private credential') }
      await page.getByRole('button', { name: 'Применить token', exact: true }).click()
      await expect(page.getByText(emptyText, { exact: false })).toBeVisible()
    }
    for (const url of ['/business-processes', '/resources', '/applications', '/deployments',
      '/access-requests', '/policy-rules']) {
      const response = await page.request.get(url, {
        headers: { Authorization: 'Bearer ' + tokens.requester.token },
      })
      expect(response.status(), url).toBe(200)
      expect((await response.json()).items, url).toEqual([])
    }
    for (const table of ['applications', 'components', 'interaction_revisions', 'resources',
      'deployments', 'processes', 'needs', 'access_requests', 'decisions', 'policy_rules'])
      expect(counts()[table], table).toBe(0)

    await page.goto('/prototype/resources')
    await expect(page.getByRole('heading', { name: 'Страница не найдена' })).toBeVisible()
  } finally {
    if (backend && backend.exitCode === null) {
      backend.kill('SIGTERM')
      await once(backend, 'exit')
    }
    await rm(dir, { recursive: true, force: true })
  }
})
