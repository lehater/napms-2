import { test as base, expect } from '@playwright/test'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'

const root = resolve(import.meta.dirname, '../..')
const python = process.env.NAPMS_PYTHON || join(root, '.venv/bin/python')
type Harness = { sql: (sql: string, params?: unknown[]) => unknown[][]; stop: () => Promise<void>; start: () => Promise<void>; file: string; privateTokens: () => Promise<string[]> }
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
      function sql(statement: string, params: unknown[] = []): unknown[][] {
        const result = spawnSync(python, ['-c', 'import sqlite3,json,sys; c=sqlite3.connect(sys.argv[1]); r=c.execute(sys.argv[2],json.loads(sys.argv[3])); print(json.dumps(r.fetchall())); c.commit(); c.close()', db, statement, JSON.stringify(params)], {encoding:'utf8'})
        if (result.status !== 0) throw new Error('Test database operation failed')
        return JSON.parse(result.stdout)
      }
      await use({ stop, start, file, privateTokens, sql })
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
  await page.getByRole('link', {name:'Выбрать процесс и потребность REAL'}).click()
  await page.getByRole('link', {name:'Harness acceptance',exact:true}).click()
  await page.getByRole('link', {name:'Потребности',exact:true}).click()
  await page.locator('tbody button').first().click()
  await page.getByLabel('Revision', {exact:true}).selectOption({index:1})
  await page.getByLabel('Source Deployment', {exact:true}).selectOption({index:1})
  await page.getByLabel('Destination Deployment', {exact:true}).selectOption({index:1})
  await page.getByLabel('Подтверждаю состав заявки', {exact:true}).check()
  await page.getByRole('button', {name:'Подтвердить заявку',exact:true}).click()
  await expect(page.getByText('PENDING', { exact: true })).toBeVisible()
  const requestUrl = page.url()
  const readPending = async () => (await (await page.request.get(new URL(requestUrl).pathname,{headers:actorHeaders('requester')})).json())
  const pendingFacts = await readPending()
  expect(harness.sql('SELECT count(*) FROM decisions')).toEqual([[0]])
  expect(harness.sql('SELECT count(*) FROM policy_rules')).toEqual([[0]])
  await page.reload()
  await page.getByLabel('Demo actor', {exact:true}).selectOption('requester')
  await expect(page.getByText('PENDING', {exact:true})).toBeVisible()
  await harness.stop(); await harness.start()
  await page.reload()
  await page.getByLabel('Demo actor', {exact:true}).selectOption('requester')
  await expect(page.getByText('PENDING', {exact:true})).toBeVisible()
  await expect(page.locator('dt').filter({hasText:/^connectivityNeedId$/})).toBeVisible()
  expect(await readPending()).toEqual(pendingFacts)

  await page.getByLabel('Demo actor', { exact: true }).selectOption('decider')
  await expect(page.getByRole('button', { name: 'Подтвердить ALLOWED', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'ALLOWED', exact: true }).click()
  await page.getByLabel('Demo actor', { exact: true }).selectOption('requester')
  await expect(page.getByRole('button', { name: 'Подтвердить ALLOWED', exact: true })).toHaveCount(0)
  await page.getByLabel('Demo actor', { exact: true }).selectOption('decider')
  await page.getByRole('button', { name: 'ALLOWED', exact: true }).click()
  await page.getByRole('button', { name: 'Подтвердить ALLOWED', exact: true }).click()
  await expect(page.getByText('ALLOWED', { exact: true }).first()).toBeVisible()
  const ruleLink = page.getByRole('link', {name:'Открыть PolicyRule REAL',exact:true})
  const rulePath = await ruleLink.getAttribute('href')
  expect(harness.sql('SELECT count(*) FROM policy_rules')).toEqual([[1]])
  await ruleLink.click()
  await expect(page.getByRole('alert')).toContainText('403')
  await page.getByLabel('Demo actor', {exact:true}).selectOption('exporter')
  await expect(page.getByText(/ · ACTIVE$/)).toBeVisible()
  const storedRule = await (await page.request.get(rulePath!,{headers:actorHeaders('exporter')})).json()
  expect(storedRule.subject).toEqual(pendingFacts.subject)
  let exportedRow: Record<string, unknown> = {}
  for (const format of ['json','csv'] as const) {
    const pendingDownload = page.waitForEvent('download')
    await page.getByRole('button', {name:'Скачать '+format.toUpperCase(),exact:true}).click()
    const download = await pendingDownload
    expect(download.suggestedFilename()).toBe(`policy-rule-${rulePath!.split('/').pop()}.${format}`)
    const target = test.info().outputPath(download.suggestedFilename())
    await download.saveAs(target)
    const bytes = await readFile(target,'utf8')
    expect(bytes).toContain(rulePath!.split('/').pop()!)
    expect(bytes).toContain('TCP')
    expect(bytes).toContain('443')
    expect(bytes).toContain('READY')
    expect(bytes).toContain('evaluationAt')
    expect(bytes).toContain('decisionId')
    if (format === 'json') {
      const body = JSON.parse(bytes)
      expect(body.rows).toHaveLength(1)
      exportedRow = body.rows[0]
      expect(body.rows[0].subjectId).toBe(storedRule.subjectId)
      expect(body.rows[0].decisionId).toBe(storedRule.originatingDecision.decisionId)
      expect(body.rows[0].connectivityNeedId).toBe(pendingFacts.connectivityNeedId)
      expect(body.rows[0].sourceResourceId).toBe('00000000-0000-0000-0000-000000000001')
      expect(body.rows[0].destinationResourceId).toBe('00000000-0000-0000-0000-000000000002')
      expect(Number.isNaN(Date.parse(body.evaluationAt))).toBe(false)
      expect(body.rows[0].requestId).toBe(requestUrl.split('/').pop())
      expect(body.rows[0].evaluationAt).toBe(body.evaluationAt)
      expect(body.rows[0].interactionRevisionId).toBe('00000000-0000-0000-0000-000000000009')
    } else {
      const [columns, values] = bytes.trim().split(/\r?\n/).map(line => line.split(','))
      const row = Object.fromEntries(columns.map((key,index)=>[key,values[index]]))
      for (const [key,value] of Object.entries(exportedRow)) {
        if (key === 'evaluationAt') expect(Number.isNaN(Date.parse(row[key]))).toBe(false)
        else expect(row[key]).toBe(value === null ? '' : String(value))
      }
    }
  }
  await page.goto(requestUrl)
  await page.getByLabel('Demo actor', {exact:true}).selectOption('exporter')
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
      else if (url.startsWith('/business')) await expect(page.getByRole('button', {name:'Сохранить',exact:true})).toBeVisible()
      else await expect(page.getByRole('link', {name:'Выбрать процесс и потребность REAL'})).toBeVisible()
      await expect(page.locator('.ux-shell')).toHaveCount(1)
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

const demoInput = { sourceDeploymentId:'00000000-0000-0000-0000-00000000000a',destinationDeploymentId:'00000000-0000-0000-0000-00000000000b',interactionRevisionId:'00000000-0000-0000-0000-000000000009',connectivityNeedId:'00000000-0000-0000-0000-00000000000d' }
function actorHeaders(actor: string) { return {Origin:'http://127.0.0.1:5173','X-NAPMS-Dev':'1','X-NAPMS-Demo-Actor':actor} }

async function selectedRule(request: import('@playwright/test').APIRequestContext) {
  const created = await request.post('/access-requests',{headers:actorHeaders('requester'),data:demoInput})
  expect(created.status()).toBe(201)
  const pending = await created.json()
  const decision = await request.post(`/access-requests/${pending.requestId}/decision`,{headers:actorHeaders('decider'),data:{outcome:'ALLOWED'}})
  expect(decision.status()).toBe(201)
  return (await decision.json()).policyRuleId as string
}

async function downloaded(page: import('@playwright/test').Page, format: 'json'|'csv') {
  const waiting = page.waitForEvent('download')
  await page.getByRole('button',{name:'Скачать '+format.toUpperCase(),exact:true}).click()
  const download = await waiting
  const target = test.info().outputPath(download.suggestedFilename())
  await download.saveAs(target)
  return readFile(target,'utf8')
}

test('REAL Rule download boundaries, missing address retention and INACTIVE files', async ({page,request,harness}) => {
  const id = await selectedRule(request)
  await page.goto('/policy-rules/'+id)
  await expect(page.getByRole('alert')).toContainText('401')
  for (const actor of ['requester','decider']) {
    await page.getByLabel('Demo actor',{exact:true}).selectOption(actor)
    await expect(page.getByRole('alert')).toContainText('403')
    await expect(page.getByRole('button',{name:'Скачать JSON',exact:true})).toHaveCount(0)
    for (const format of ['json','csv']) expect((await request.get(`/policy/export?ruleId=${id}&format=${format}`,{headers:actorHeaders(actor)})).status()).toBe(403)
  }
  for (const resource of ['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002']) {
    harness.sql("UPDATE grants SET valid_until='2000-01-01T00:00:00Z' WHERE action='policy.export' AND scope=?",[resource])
    try {
      await page.getByLabel('Demo actor',{exact:true}).selectOption('exporter')
      await page.getByRole('button',{name:'Обновить PolicyRule',exact:true}).click()
      await expect(page.getByRole('alert')).toContainText('403')
      for (const format of ['json','csv']) expect((await request.get(`/policy/export?ruleId=${id}&format=${format}`,{headers:actorHeaders('exporter')})).status()).toBe(403)
    } finally {harness.sql("UPDATE grants SET valid_until=NULL WHERE action='policy.export' AND scope=?",[resource])}
  }
  await page.getByRole('button',{name:'Обновить PolicyRule',exact:true}).click()
  await expect(page.getByRole('button',{name:'Скачать JSON',exact:true})).toBeVisible()
  harness.sql("UPDATE endpoints SET address=NULL,kind=NULL WHERE id='00000000-0000-0000-0000-000000000004'")
  try {
    const json = JSON.parse(await downloaded(page,'json'))
    expect(json.rows[0].readiness).toBe('INCOMPLETE')
    expect(json.rows[0].destinationAddress).toBeNull()
    expect(json.rows[0].ruleId).toBe(id)
    const csv = await downloaded(page,'csv')
    expect(csv).toContain('INCOMPLETE')
    expect(csv).toContain(id)
    expect(csv.trim().split('\n')).toHaveLength(2)
  } finally {harness.sql("UPDATE endpoints SET address='192.0.2.20',kind='HOST' WHERE id='00000000-0000-0000-0000-000000000004'")}
  harness.sql("UPDATE policy_rules SET state='INACTIVE' WHERE id=?",[id])
  try {
    await page.getByRole('button',{name:'Обновить PolicyRule',exact:true}).click()
    await expect(page.getByText(/ · INACTIVE$/)).toBeVisible()
    expect(JSON.parse(await downloaded(page,'json')).rows).toEqual([])
    const csv = await downloaded(page,'csv')
    expect(csv.trim().split('\n')).toHaveLength(1)
    expect(csv).toContain('evaluationAt')
  } finally {harness.sql("UPDATE policy_rules SET state='ACTIVE' WHERE id=?",[id])}
  await page.goto('/policy-rules/ffffffff-ffff-ffff-ffff-ffffffffffff')
  await page.getByLabel('Demo actor',{exact:true}).selectOption('exporter')
  await expect(page.getByRole('alert')).toContainText('не найдены')
})

test('late Rule reads and downloads cannot cross actor boundary', async ({page,request,harness}) => {
  const id = await selectedRule(request)
  for (const path of [`/policy-rules/${id}`,`/policy/export?ruleId=${id}&format=json`]) {
    await page.goto('/policy-rules/'+id)
    if (path.startsWith('/policy/export')) {
      await page.getByLabel('Demo actor',{exact:true}).selectOption('exporter')
      await expect(page.getByRole('button',{name:'Скачать JSON',exact:true})).toBeVisible()
    }
    let release!: () => void, received!: () => void
    const gate = new Promise<void>(resolve=>{release=resolve}), held = new Promise<void>(resolve=>{received=resolve})
    let downloads = 0
    const onDownload = () => {downloads++}
    page.on('download',onDownload)
    await page.route('**'+path,async route=>{
      if (route.request().headers()['x-napms-demo-actor'] !== 'exporter') {await route.continue();return}
      const response=await route.fetch({headers:{...await route.request().allHeaders(),origin:'http://127.0.0.1:5173','sec-fetch-site':'same-origin'}})
      expect(response.status()).toBe(200);received();await gate;await route.fulfill({response})
    })
    try {
      if (path.startsWith('/policy/export')) await page.getByRole('button',{name:'Скачать JSON',exact:true}).click()
      else await page.getByLabel('Demo actor',{exact:true}).selectOption('exporter')
      await held
      await page.getByLabel('Demo actor',{exact:true}).selectOption('requester')
      await expect(page.getByRole('alert')).toContainText('403')
    } finally {release();await page.unrouteAll({behavior:'wait'})}
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
    expect(downloads).toBe(0)
    await expect(page.getByRole('button',{name:'Скачать JSON',exact:true})).toHaveCount(0)
    page.off('download',onDownload)
  }
  expect(harness.file).toBeTruthy()
})

async function openComposition(page: import('@playwright/test').Page) {
  await page.goto('/business-processes/00000000-0000-0000-0000-00000000000c?tab=needs')
  await page.getByLabel('Demo actor',{exact:true}).selectOption('requester')
  await page.locator('tbody button').first().click()
  await page.getByLabel('Revision',{exact:true}).selectOption({index:1})
  await page.getByLabel('Source Deployment',{exact:true}).selectOption({index:1})
  await page.getByLabel('Destination Deployment',{exact:true}).selectOption({index:1})
  await page.getByLabel('Подтверждаю состав заявки',{exact:true}).check()
}

test('composition resets, empty/error discovery and uncertain POST remain safe',async ({page,harness})=>{
  await openComposition(page)
  await page.getByRole('button',{name:'Обновить · Source Deployment',exact:true}).click()
  await expect(page.getByLabel('Source Deployment',{exact:true})).toHaveValue('')
  await expect(page.getByRole('button',{name:'Подтвердить заявку',exact:true})).toBeDisabled()
  await page.getByLabel('Source Deployment',{exact:true}).selectOption({index:1})
  await page.getByLabel('Подтверждаю состав заявки',{exact:true}).check()
  harness.sql("UPDATE grants SET valid_until='2000-01-01T00:00:00Z' WHERE action='access.request'")
  try {
    await page.getByRole('button',{name:'Подтвердить заявку',exact:true}).click()
    await expect(page.getByRole('region',{name:'Запрос из потребности'}).getByRole('alert')).toContainText('403')
    await expect(page.getByText('На этой странице нет доступных вариантов.')).toBeVisible()
    await expect(page.getByRole('button',{name:'Подтвердить заявку',exact:true})).toBeDisabled()
  } finally {harness.sql("UPDATE grants SET valid_until=NULL WHERE action='access.request'")}
  await openComposition(page)
  const before = harness.sql('SELECT count(*) FROM access_requests')[0][0] as number
  let posts = 0
  await page.route('**/access-requests',async route=>{
    if (route.request().method() !== 'POST') {await route.continue();return}
    posts++
    const response=await route.fetch({headers:{...await route.request().allHeaders(),origin:'http://127.0.0.1:5173','sec-fetch-site':'same-origin'}})
    expect(response.status()).toBe(201)
    await route.abort('failed')
  })
  await page.getByRole('button',{name:'Подтвердить заявку',exact:true}).dblclick()
  await expect(page.getByRole('alert')).toContainText('Результат отправки неизвестен')
  expect(posts).toBe(1)
  expect(harness.sql('SELECT count(*) FROM access_requests')).toEqual([[before+1]])
  await page.unrouteAll({behavior:'wait'})
  await expect(page.getByRole('link',{name:'Проверить список заявок',exact:true})).toBeVisible()
})

test('composition delayed options and POST do not restore old context or navigate after actor switch',async ({page,harness})=>{
  for (const submit of [false,true]) {
    if (submit) await openComposition(page)
    else {
      await page.goto('/business-processes/00000000-0000-0000-0000-00000000000c?tab=needs')
      await page.getByLabel('Demo actor',{exact:true}).selectOption('requester')
    }
    let release!:()=>void, received!:()=>void
    const gate=new Promise<void>(r=>{release=r}),held=new Promise<void>(r=>{received=r})
    await page.route(submit?'**/access-requests':'**/access-request-options?**',async route=>{
      if (submit && route.request().method()!=='POST') {await route.continue();return}
      const response=await route.fetch({headers:{...await route.request().allHeaders(),origin:'http://127.0.0.1:5173','sec-fetch-site':'same-origin'}})
      expect(response.status()).toBe(submit?201:200);received();await gate;await route.fulfill({response})
    })
    try {
      if(submit) await page.getByRole('button',{name:'Подтвердить заявку',exact:true}).click()
      else await page.locator('tbody button').first().click()
      await held
      if(!submit) await expect(page.getByText('Загрузка Revision…',{exact:true})).toBeVisible()
      await page.getByLabel('Demo actor',{exact:true}).selectOption('decider')
      await expect(page.getByRole('alert')).toContainText('403')
    } finally {release();await page.unrouteAll({behavior:'wait'})}
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
    await expect(page).toHaveURL(/business-processes\/.*tab=needs$/)
    await expect(page.getByRole('region',{name:'Запрос из потребности'})).toHaveCount(0)
  }
  expect(harness.file).toBeTruthy()
})
