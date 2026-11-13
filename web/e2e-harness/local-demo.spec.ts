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

test('form errors, drafts and demo action hints stay within the actor session', async ({ page, harness }) => {
  expect(harness.file).toBeTruthy()
  await page.goto('/business-processes/new')
  await page.getByLabel('Demo actor', { exact: true }).selectOption('requester')
  const name = page.getByLabel('Название', { exact: true })
  await name.fill('   ')
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(name).toBeFocused()
  await expect(name).toHaveAttribute('aria-invalid', 'true')
  await expect(name).toHaveAccessibleDescription('Укажите непустое название.')
  await name.fill('Черновик процесса')
  await page.getByLabel('Описание', { exact: true }).fill('Не потерять при переходе')
  await page.getByRole('navigation', { name: 'Prototype navigation' }).getByRole('link', { name: 'Ресурсы', exact: true }).click()
  await page.goBack()
  await expect(name).toHaveValue('Черновик процесса')
  await expect(page.getByLabel('Описание', { exact: true })).toHaveValue('Не потерять при переходе')
  await page.getByRole('link', { name: 'Отмена', exact: true }).click()
  await page.getByRole('link', { name: 'Создать бизнес-процесс', exact: true }).click()
  await expect(name).toHaveValue('')
  await name.fill('Не передавать другому actor')
  await page.getByLabel('Demo actor', { exact: true }).selectOption('decider')
  await page.getByLabel('Demo actor', { exact: true }).selectOption('requester')
  await expect(name).toHaveValue('')
  await page.getByRole('navigation', { name: 'Prototype navigation' }).getByRole('link', { name: 'Заявки на доступ', exact: true }).click()
  await page.getByRole('link', { name: 'Новая заявка', exact: true }).click()
  const source = page.getByLabel('Исходное размещение (sourceDeploymentId)', { exact: true })
  await expect(source).toHaveValue('')
  await page.getByRole('button', { name: 'Создать заявку', exact: true }).click()
  await expect(source).toBeFocused()
  await expect(source).toHaveAttribute('aria-invalid', 'true')
  await page.getByRole('button', { name: 'Заполнить demo-пример', exact: true }).click()
  await page.getByRole('navigation', { name: 'Prototype navigation' }).getByRole('link', { name: 'Ресурсы', exact: true }).click()
  await page.goBack()
  await expect(source).toHaveValue('00000000-0000-0000-0000-00000000000a')
  await page.getByLabel('Demo actor', { exact: true }).selectOption('decider')
  await expect(page.getByText('В стандартном демопрофиле заявки создаёт Requester.', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Создать заявку', exact: true })).toHaveCount(0)
  await page.getByLabel('Demo actor', { exact: true }).selectOption('requester')
  await expect(source).toHaveValue('')
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('one-command actor switching preserves independent grants and actual persistence', async ({ page, harness }) => {
  let browserBearer = false
  page.on('request', request => { browserBearer ||= Boolean(request.headers().authorization) })
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('401 · Требуется авторизация')
  await page.getByLabel('Demo actor', { exact: true }).selectOption('requester')
  await page.getByRole('link', { name: 'Создать бизнес-процесс', exact: true }).click()
  await page.getByLabel('Название', { exact: true }).fill('Harness acceptance')
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Harness acceptance', exact: true })).toBeVisible()
  const processUrl = page.url()
  await page.getByRole('link', { name: 'Потребности', exact: true }).click()
  await page.getByLabel('Коммуникация', {exact:true}).selectOption('00000000-0000-0000-0000-000000000009')
  await page.getByRole('button', {name:'Создать потребность',exact:true}).click()
  await expect(page.getByRole('region', {name:'Потребности REAL'}).locator('tbody tr')).toHaveCount(1)
  await expect(page.getByText('На этой странице нет доступных коммуникаций.')).toBeVisible()
  await page.getByLabel('Demo actor', { exact: true }).selectOption('decider')
  await expect(page.getByRole('heading', { name: 'Harness acceptance', exact: true })).toHaveCount(0)
  await expect(page.getByRole('alert')).toContainText('403 · Недостаточно полномочий')
  await page.getByRole('navigation', { name: 'Prototype navigation' }).getByRole('link', { name: 'Бизнес-процессы', exact: true }).click()
  await page.getByRole('link', { name: 'Создать бизнес-процесс', exact: true }).click()
  await page.getByLabel('Название', { exact: true }).fill('No create grant')
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('403 · Недостаточно полномочий')
  await page.getByLabel('Demo actor', { exact: true }).selectOption('requester')
  await expect(page.getByLabel('Название', { exact: true })).toHaveValue('')
  await page.getByRole('navigation', { name: 'Prototype navigation' }).getByRole('link', { name: 'Заявки на доступ', exact: true }).click()
  await expect(page.locator('.ux-shell')).toHaveCount(1)
  await expect(page.getByLabel('Demo actor', { exact: true })).toHaveCount(1)
  await expect(page.getByLabel('Demo mode')).toHaveCount(0)
  await page.getByRole('link', { name: 'Новая заявка', exact: true }).click()
  await page.getByRole('button', { name: 'Заполнить demo-пример', exact: true }).click()
  await page.getByRole('button', { name: 'Создать заявку', exact: true }).click()
  await expect(page.getByText('PENDING', { exact: true })).toBeVisible()
  const requestUrl = page.url()
  await page.getByLabel('Demo actor', { exact: true }).selectOption('decider')
  await expect(page.getByRole('button', { name: 'Подтвердить ALLOWED', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'ALLOWED', exact: true }).click()
  await page.getByLabel('Demo actor', { exact: true }).selectOption('requester')
  await expect(page.getByRole('button', { name: 'Подтвердить ALLOWED', exact: true })).toHaveCount(0)
  await page.getByLabel('Demo actor', { exact: true }).selectOption('decider')
  await page.getByRole('button', { name: 'ALLOWED', exact: true }).click()
  await page.getByRole('button', { name: 'Подтвердить ALLOWED', exact: true }).click()
  await expect(page.getByText('ALLOWED', { exact: true }).first()).toBeVisible()
  await page.getByLabel('Demo actor', { exact: true }).selectOption('exporter')
  await expect(page.getByRole('alert')).toContainText('403 · Недостаточно полномочий')
  await page.getByLabel('Demo actor', { exact: true }).selectOption('anonymous')
  await expect(page.getByRole('alert')).toContainText('401 · Требуется авторизация')
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

  for (const size of [{width:1920,height:1080},{width:1440,height:900},{width:2560,height:1440},{width:390,height:844}]) {
    await page.setViewportSize(size)
    for (const url of ['/', processUrl, '/business-processes/new', '/access-requests', requestUrl, '/access-requests/new']) {
      await page.goto(url)
      await page.getByLabel('Demo actor', {exact:true}).selectOption('requester')
      if (url === '/') await expect(page.getByRole('table')).toBeVisible()
      else if (url === processUrl) await expect(page.getByRole('heading', {name:'Harness acceptance',exact:true})).toBeVisible()
      else if (url === requestUrl) await expect(page.getByText('ALLOWED', {exact:true}).first()).toBeVisible()
      else if (url === '/access-requests') await expect(page.getByRole('table')).toBeVisible()
      else await expect(page.getByRole('button', {name: url.startsWith('/business') ? 'Сохранить' : 'Создать заявку',exact:true})).toBeVisible()
      await expect(page.locator('.ux-shell')).toHaveCount(1)
      if (size.width < 768) await page.getByRole('button', {name:'Открыть меню',exact:true}).click()
      await expect(page.getByRole('navigation', {name:'Prototype navigation'}).getByRole('link')).toHaveCount(7)
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(size.width)
    }
  }
  await page.goto('/unknown/application/path')
  await expect(page.getByRole('heading', {name:'Страница не найдена'})).toBeVisible()
  await page.goto('/prototype/needs/mock-need?tab=communication')
  await expect(page.getByLabel('Demo actor', {exact:true})).toHaveCount(0)
  await expect(page.getByLabel('Демонстрационная роль', {exact:true})).toBeVisible()
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


test('late real reads cannot restore protected Process or Request data after actor changes', async ({ page, request, harness }) => {
  // Delay real upstream responses; no fictional API DTO or mocked authorization.
  const headers = { Origin: 'http://127.0.0.1:5173', 'X-NAPMS-Dev': '1', 'X-NAPMS-Demo-Actor': 'requester' }
  const createdProcess = await request.post('/business-processes', {headers, data:{name:'Late protected process'}})
  expect(createdProcess.status()).toBe(201)
  const process = await createdProcess.json()
  const createdRequest = await request.post('/access-requests', {headers, data:{
    sourceDeploymentId:'00000000-0000-0000-0000-00000000000a', destinationDeploymentId:'00000000-0000-0000-0000-00000000000b',
    interactionRevisionId:'00000000-0000-0000-0000-000000000009', connectivityNeedId:'00000000-0000-0000-0000-00000000000d',
  }})
  expect(createdRequest.status()).toBe(201)
  const accessRequest = await createdRequest.json()
  for (const [path, secret] of [[`/business-processes/${process.processId}`, process.name], [`/access-requests/${accessRequest.requestId}`, accessRequest.requestId]]) {
    await page.goto(path)
    await expect(page.getByLabel('Demo actor', {exact:true})).toHaveValue('anonymous')
    let release!: () => void, received!: () => void
    const gate = new Promise<void>(resolve => {release = resolve})
    const held = new Promise<void>(resolve => {received = resolve})
    await page.route('**' + path, async route => {
      if (route.request().headers()['x-napms-demo-actor'] !== 'requester') {await route.continue(); return}
      const response = await route.fetch({headers: {...await route.request().allHeaders(), origin:'http://127.0.0.1:5173', 'sec-fetch-site':'same-origin'}})
      expect(response.status()).toBe(200)
      received()
      await gate
      await route.fulfill({response})
    })
    try {
      await page.getByLabel('Demo actor', {exact:true}).selectOption('requester')
      await held
      await page.getByLabel('Demo actor', {exact:true}).selectOption('exporter')
      await expect(page.getByRole('alert')).toContainText('403 · Недостаточно полномочий')
    } finally {release(); await page.unrouteAll({behavior:'wait'})}
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    await expect(page.getByText(secret, {exact:true})).toHaveCount(0)
    await expect(page.getByRole('alert')).toContainText('403 · Недостаточно полномочий')
  }

})

test('real collection pagination survives detail tabs, breadcrumbs and reload', async ({ page, request, harness }) => {
  const headers = { Origin: 'http://127.0.0.1:5173', 'X-NAPMS-Dev': '1', 'X-NAPMS-Demo-Actor': 'requester' }
  const cases = [
    { path: '/business-processes', title: 'Бизнес-процессы', tab: 'Потребности', data: {name: 'Pagination acceptance'} },
    { path: '/access-requests', title: 'Заявки на доступ', tab: 'Решение и основания', data: {
      sourceDeploymentId:'00000000-0000-0000-0000-00000000000a', destinationDeploymentId:'00000000-0000-0000-0000-00000000000b',
      interactionRevisionId:'00000000-0000-0000-0000-000000000009', connectivityNeedId:'00000000-0000-0000-0000-00000000000d',
    } },
  ]
  for (const collection of cases) {
    for (let i = 0; i < 21; i++) expect((await request.post(collection.path, {headers, data:collection.data})).status()).toBe(201)
    await page.goto(collection.path)
    await page.getByLabel('Demo actor', {exact:true}).selectOption('requester')
    await page.getByRole('button', {name:'Далее',exact:true}).click()
    await expect(page).toHaveURL(collection.path + '?offset=20')
    const listing = await request.get(collection.path + '?limit=20&offset=20', {headers})
    const body = await listing.json()
    await expect(page.locator('tbody tr')).toHaveCount(body.items.length)
    await page.locator('tbody tr').first().getByRole('link').click()
    await page.getByRole('link', {name:collection.tab,exact:true}).click()
    await page.getByRole('navigation', {name:'Breadcrumbs'}).getByRole('link', {name:collection.title,exact:true}).click()
    await expect(page).toHaveURL(collection.path + '?offset=20')
    await page.reload()
    await page.getByLabel('Demo actor', {exact:true}).selectOption('requester')
    await expect(page.locator('tbody tr')).toHaveCount(body.items.length)
    await expect(page.getByText('Страница 2', {exact:true})).toBeVisible()
  }
  // The mock role never changes the remembered real actor.
  await page.getByRole('link', {name:'MOCK Simulation →',exact:true}).click()
  await expect(page.getByLabel('Demo actor', {exact:true})).toHaveCount(0)
  await page.getByLabel('Демонстрационная роль', {exact:true}).selectOption('Decider')
  await page.getByRole('navigation', {name:'Prototype navigation'}).getByRole('link', {name:'Заявки на доступ',exact:true}).click()
  await expect(page.getByLabel('Demo actor', {exact:true})).toHaveValue('requester')
  await expect(page.getByLabel('Demo mode')).toHaveCount(0)
  for (const path of ['/unknown/application/path', '/prototype/unknown/path/extra', '/business-processes/unknown/extra', '/access-requests/unknown/extra']) {
    await page.goto(path)
    await expect(page.getByRole('heading', {name:'Страница не найдена',exact:true})).toBeVisible()
    await expect(page.getByRole('link', {name:'На главную',exact:true})).toBeVisible()
  }
  expect(harness.file).toBeTruthy()
})
