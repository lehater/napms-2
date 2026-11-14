import { test as base, expect, type Page } from '@playwright/test'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
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
    const probe = createServer()
    probe.listen(8000, '127.0.0.1')
    await once(probe, 'listening')
    await new Promise<void>(done => probe.close(() => done()))
    const dir = await mkdtemp(join(tmpdir(), 'napms-catalog-e2e-'))
    const args = ['--db', join(dir, 'test.sqlite3'), '--credentials', join(dir, 'credentials.json')]
    const init = spawnSync(python, ['-m', 'napms.dev', 'init-demo', ...args], { cwd: root })
    if (init.status !== 0) throw new Error('Temporary catalog database initialization failed')
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
    } finally {
      server.kill('SIGTERM')
      if (server.exitCode === null) await once(server, 'exit')
      const leaked = Object.values(credentials).some(item => logs.includes(item.token))
      await rm(dir, { recursive: true, force: true })
      expect(leaked, 'API logs must exclude credentials').toBe(false)
    }
  }, { scope: 'worker' }],
})

async function login(page: Page, token: string) {
  try { await page.getByLabel('Bearer token', { exact: true }).fill(token) }
  catch { throw new Error('Could not enter private catalog credential') }
  await page.getByRole('button', { name: 'Применить token', exact: true }).click()
}

test('REAL catalogs create an active policy from a new application profile', async ({ page, credentials }) => {
  const requester = { Authorization: `Bearer ${credentials.requester.token}` }
  const evidence = join(root, 'docs/ux/acc-revisions/evidence')
  await mkdir(evidence, { recursive: true })
  await page.goto('/applications')
  await login(page, credentials.requester.token)
  await expect(page.getByRole('table')).toContainText('Демонстрационный HTTPS')
  await page.locator('.ux-heading').getByRole('link', { name: 'Создать профиль', exact: true }).click()
  await page.getByLabel('Название профиля', { exact: true }).fill('Order')
  await page.getByRole('button', { name: 'Создать профиль', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Order', exact: true })).toBeVisible()
  const applicationId = page.url().split('/').pop()!

  await page.getByRole('link', { name: 'Компоненты', exact: true }).click()
  await page.getByLabel('Название компонента', { exact: true }).fill('Sender')
  await page.getByRole('button', { name: 'Добавить компонент', exact: true }).click()
  await expect(page.getByRole('table')).toContainText('Sender')
  await page.getByLabel('Название компонента', { exact: true }).fill('Receiver')
  await page.getByRole('button', { name: 'Добавить компонент', exact: true }).click()
  await expect(page.getByRole('table')).toContainText('Receiver')
  await page.getByRole('link', { name: 'Sender', exact: true }).click()
  const senderComponentId = page.url().split('/').pop()!
  await expect(page.getByRole('heading', { name: 'Sender', exact: true })).toBeVisible()
  await page.getByRole('navigation', { name: 'Breadcrumbs' }).getByRole('link', { name: 'Order', exact: true }).click()
  await page.getByRole('link', { name: 'Компоненты', exact: true }).click()
  await page.getByRole('link', { name: 'Receiver', exact: true }).click()
  const receiverComponentId = page.url().split('/').pop()!
  await expect(page.getByRole('heading', { name: 'Receiver', exact: true })).toBeVisible()
  await page.evaluate(applicationId => {
    const missingId = '00000000-0000-4000-8000-000000000000'
    history.pushState({}, '', `/applications/${applicationId}/components/${missingId}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, applicationId)
  await expect(page.getByRole('alert')).toContainText('Объект или связанный каталог не найден.')
  await expect(page.getByRole('heading', { name: 'Receiver', exact: true })).toHaveCount(0)
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Receiver', exact: true })).toBeVisible()
  await page.getByRole('navigation', { name: 'Breadcrumbs' }).getByRole('link', { name: 'Order', exact: true }).click()
  await page.getByRole('link', { name: 'Взаимодействия', exact: true }).click()
  await expect(page.locator('.interaction-draft-form')).toHaveCount(0)
  await page.getByRole('link', { name: 'Создать', exact: true }).click()
  await expect(page).toHaveURL(`/applications/${applicationId}/interactions/new`)
  await page.getByLabel('Назначение взаимодействия').fill('Unpublished interaction draft')
  await page.getByRole('link', { name: 'Отмена', exact: true }).click()
  const discarded = await (await page.request.get(`/applications/${applicationId}/interactions`, {headers: requester})).json()
  expect(discarded.items).toHaveLength(0)
  await page.getByRole('link', { name: 'Создать', exact: true }).click()
  await page.getByLabel('Назначение взаимодействия').fill('Order fulfillment traffic')
  await page.getByRole('combobox', { name: 'Источник', exact: true }).selectOption({ label: 'Sender' })
  await page.getByRole('combobox', { name: 'Получатель', exact: true }).selectOption({ label: 'Receiver' })
  await page.getByLabel('Источник от 1').fill('40000')
  await page.getByLabel('Источник до 1').fill('40100')
  await page.getByRole('button', { name: 'Добавить условие', exact: true }).click()
  await page.getByLabel('Протокол условия 2').selectOption('UDP')
  await page.getByLabel('Назначение от 2').fill('123')
  await page.getByLabel('Назначение до 2').fill('123')
  for (const [width, height] of [[1920, 1080], [1440, 900]]) {
    await page.setViewportSize({ width, height })
    await page.evaluate(() => document.querySelector('.ux-main')?.scrollTo(0, 0))
    const form = page.locator('.interaction-draft-form')
    await expect(form.getByRole('group', { name: 'TrafficClause #1' })).toBeVisible()
    const sourceBox = await form.getByRole('combobox', { name: 'Источник', exact: true }).boundingBox()
    const destinationBox = await form.getByRole('combobox', { name: 'Получатель', exact: true }).boundingBox()
    expect(sourceBox && destinationBox).toBeTruthy()
    expect(Math.abs(sourceBox!.y - destinationBox!.y)).toBeLessThan(12)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: join(evidence, `interaction-create-${width}.png`), fullPage: true })
  }
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await expect(page).toHaveURL(/\/applications\/[0-9a-f-]{36}\/interactions\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('heading', { name: 'Order fulfillment traffic', exact: true })).toBeVisible()
  await expect(page.getByText('Sender → Receiver', { exact: true })).toBeVisible()
  const interactionUrl = page.url()
  const interactionId = interactionUrl.split('/').pop()!
  const interactionSnapshot = await (await page.request.get(`/applications/${applicationId}/interactions/${interactionId}`,
    {headers: requester})).json()
  const revisionId = interactionSnapshot.revisions[0].interactionRevisionId as string
  expect(revisionId).toBeTruthy()
  await page.getByRole('link', { name: 'Ревизии', exact: true }).click()
  await expect(page.getByRole('table')).toContainText('#1')
  for (const [width, height] of [[1920, 1080], [1440, 900]]) {
    await page.setViewportSize({ width, height })
    await page.evaluate(() => document.querySelector('.ux-main')?.scrollTo(0, 0))
    await page.screenshot({ path: join(evidence, `revision-list-${width}.png`), fullPage: true })
  }
  await page.getByRole('table').getByRole('link', { name: '#1', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/revisions/${revisionId}$`))
  await expect(page.getByRole('heading', { name: 'Ревизия #1', exact: true })).toBeVisible()
  const breadcrumbs = page.getByRole('navigation', { name: 'Breadcrumbs' })
  await expect(breadcrumbs.getByRole('link', { name: 'Order', exact: true })).toHaveAttribute('href', `/applications/${applicationId}?tab=interactions`)
  await expect(breadcrumbs.getByRole('link', { name: 'Order fulfillment traffic', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Условия трафика', exact: true }).click()
  await expect(page.getByRole('table')).toContainText('40000–40100')
  await expect(page.getByRole('table')).toContainText('443')
  await expect(page.getByRole('button', { name: 'Удалить', exact: true })).toHaveCount(0)
  const firstRevisionUrl = page.url()
  for (const [width, height] of [[1920, 1080], [1440, 900]]) {
    await page.setViewportSize({ width, height })
    await page.evaluate(() => document.querySelector('.ux-main')?.scrollTo(0, 0))
    await expect(page.getByRole('table')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: join(evidence, `revision-detail-${width}.png`), fullPage: true })
  }
  await page.goto(`/applications/${applicationId}/interactions/${interactionId}/revisions/00000000-0000-4000-8000-000000000000`)
  await login(page, credentials.requester.token)
  await expect(page.getByRole('alert')).toContainText('Ревизия не найдена.')
  await page.goto(firstRevisionUrl)
  await login(page, credentials.requester.token)
  await expect(page.getByRole('heading', { name: 'Ревизия #1', exact: true })).toBeVisible()
  await page.getByRole('navigation', { name: 'Основная навигация' }).getByRole('link', { name: 'Развёрнутые компоненты', exact: true }).click()
  await login(page, credentials.requester.token)
  await page.locator('.ux-heading').getByRole('link', { name: 'Создать развёртывание', exact: true }).click()
  await page.getByLabel('Компонент', { exact: true }).selectOption({ label: 'Order · Sender' })
  await page.getByLabel('Resource', { exact: true }).selectOption({ label: 'sender.demo.example' })
  await page.getByRole('button', { name: 'Создать развёртывание', exact: true }).click()
  await expect(page).toHaveURL(/\/deployments\/[0-9a-f-]{36}$/)
  const sourceDeploymentId = page.url().split('/').pop()!
  await expect(page.getByRole('link', { name: 'sender.demo.example', exact: true })).toBeVisible()
  await page.getByRole('navigation', { name: 'Breadcrumbs' }).getByRole('link', { name: 'Развёрнутые компоненты', exact: true }).click()
  await page.locator('.ux-heading').getByRole('link', { name: 'Создать развёртывание', exact: true }).click()
  await page.getByLabel('Компонент', { exact: true }).selectOption({ label: 'Order · Receiver' })
  await page.getByLabel('Resource', { exact: true }).selectOption({ label: 'receiver.demo.example' })
  await page.getByRole('button', { name: 'Создать развёртывание', exact: true }).click()
  await expect(page).toHaveURL(/\/deployments\/[0-9a-f-]{36}$/)
  const destinationDeploymentId = page.url().split('/').pop()!
  await expect(page.getByRole('link', { name: 'Order', exact: true })).toBeVisible()
  await page.screenshot({ path: '/tmp/napms-issue64-deployment-detail.png', fullPage: true })
  await page.getByRole('link', { name: 'Receiver', exact: true }).click()
  await expect(page).toHaveURL(/\/applications\/[0-9a-f-]{36}\/components\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('heading', { name: 'Receiver', exact: true })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(`/deployments/${destinationDeploymentId}`)
  await page.getByRole('link', { name: 'receiver.demo.example', exact: true }).click()
  await expect(page).toHaveURL(/\/resources\/[0-9a-f-]{36}$/)
  await login(page, credentials.requester.token)
  await expect(page.getByRole('heading', { name: 'receiver.demo.example', exact: true })).toBeVisible()

  await page.getByRole('navigation', { name: 'Основная навигация' }).getByRole('link', { name: 'Бизнес-процессы', exact: true }).click()
  await login(page, credentials.requester.token)
  await page.getByRole('link', { name: 'Создать бизнес-процесс', exact: true }).click()
  await page.getByLabel('Название', { exact: true }).fill('Order fulfillment')
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await page.getByRole('link', { name: 'Потребности', exact: true }).click()
  await expect(page.getByLabel('Коммуникация', { exact: true })).toBeVisible()
  const communicationOptions = await page.locator('#need-communication option').allTextContents()
  const orderCommunication = communicationOptions.find(text => text.includes('Order · Sender → Receiver'))
  expect(orderCommunication).toBeTruthy()
  await page.getByLabel('Коммуникация', { exact: true }).selectOption({ label: orderCommunication! })
  await page.getByRole('button', { name: 'Создать потребность', exact: true }).click()
  await expect(page.getByText('Потребность сохранена.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Order fulfillment/ }).click()
  await page.getByLabel('Revision', { exact: true }).selectOption({ index: 1 })
  await page.getByLabel('Source Deployment', { exact: true }).selectOption({ index: 1 })
  await page.getByLabel('Destination Deployment', { exact: true }).selectOption({ index: 1 })
  const requestSummary = page.getByRole('group', { name: 'Сводка заявки' })
  await expect(requestSummary).toContainText('#1 · TCP · 40000–40100 → 443')
  await expect(requestSummary).toContainText('#2 · UDP · ANY → 123')
  await page.getByLabel('Подтверждаю состав заявки', { exact: true }).check()
  await page.getByRole('button', { name: 'Подтвердить заявку', exact: true }).click()
  await expect(page).toHaveURL(/\/access-requests\/[0-9a-f-]{36}$/)
  const requestId = page.url().split('/').pop()!
  await login(page, credentials.requester.token)
  await expect(page.getByText('PENDING', { exact: true })).toBeVisible()
  await page.getByLabel('Demo mode', { exact: true }).selectOption('decider')
  await login(page, credentials.decider.token)
  await page.getByRole('button', { name: 'ALLOWED', exact: true }).click()
  await page.getByRole('button', { name: 'Подтвердить ALLOWED', exact: true }).click()
  await expect(page.getByText('ALLOWED', { exact: true }).first()).toBeVisible()

  const requestResponse = await page.request.get(`/access-requests/${requestId}`, { headers: requester })
  const accessRequest = await requestResponse.json()
  const policyRuleId = accessRequest.decision.policyRuleId as string
  expect(accessRequest.status).toBe('ALLOWED')
  expect(accessRequest.subject.sourceDeploymentId).toBe(sourceDeploymentId)
  expect(accessRequest.subject.destinationDeploymentId).toBe(destinationDeploymentId)
  expect(accessRequest.subject.interactionRevisionId).toBe(revisionId)
  expect(policyRuleId).toMatch(/^[0-9a-f-]{36}$/i)
  const requestsBeforeInvalid = await (await page.request.get('/access-requests?limit=100', { headers: requester })).json()
  const invalid = await page.request.post('/access-requests', { headers: requester, data: {
    connectivityNeedId: accessRequest.connectivityNeedId,
    interactionRevisionId: revisionId,
    sourceDeploymentId, destinationDeploymentId: sourceDeploymentId,
  } })
  expect([400, 422]).toContain(invalid.status())
  const requestsAfterInvalid = await (await page.request.get('/access-requests?limit=100', { headers: requester })).json()
  expect(requestsAfterInvalid.items).toHaveLength(requestsBeforeInvalid.items.length)
  const rulesResponse = await page.request.get('/policy-rules?limit=100', { headers: { Authorization: `Bearer ${credentials.exporter.token}` } })
  expect(rulesResponse.status()).toBe(200)
  const rules = await rulesResponse.json()
  const linkedRules = rules.items.filter((rule: { subject: { sourceDeploymentId: string; destinationDeploymentId: string; interactionRevisionId: string } }) =>
    rule.subject.sourceDeploymentId === sourceDeploymentId && rule.subject.destinationDeploymentId === destinationDeploymentId && rule.subject.interactionRevisionId === revisionId)
  expect(linkedRules).toHaveLength(1)
  expect(linkedRules[0].state).toBe('ACTIVE')
  expect(linkedRules[0].ruleId).toBe(policyRuleId)
  expect(linkedRules[0].originatingDecisionId).toBe(accessRequest.decision.decisionId)
  const ruleDetailResponse = await page.request.get(`/policy-rules/${policyRuleId}`, { headers: { Authorization: `Bearer ${credentials.exporter.token}` } })
  expect(ruleDetailResponse.status()).toBe(200)
  expect((await ruleDetailResponse.json()).state).toBe('ACTIVE')

  await page.goto(`/policy-rules/${policyRuleId}`)
  await login(page, credentials.exporter.token)
  await expect(page.locator('.ux-heading').getByText('ACTIVE', { exact: true })).toBeVisible()
  await expect(page.locator('.ux-heading')).toContainText('Order')
  for (let index = 0; index < 20; index++) {
    const extraComponent = await page.request.post(`/applications/${applicationId}/components`, { headers: requester, data: {
      name: `Pagination receiver ${index}`,
    } })
    expect(extraComponent.status()).toBe(201)
    const extraDestinationId = (await extraComponent.json()).componentId as string
    const extra = await page.request.post(`/applications/${applicationId}/interactions`, { headers: requester, data: {
      sourceComponentId: senderComponentId, destinationComponentId: extraDestinationId,
      ipProtocol: 'TCP', destinationPortStart: 20000 + index, destinationPortEnd: 20000 + index,
    } })
    expect(extra.status()).toBe(201)
  }
  await page.goto(`/applications/${applicationId}?tab=interactions`)
  await login(page, credentials.requester.token)
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(20)
  await page.getByRole('button', { name: 'Далее', exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: '/tmp/napms-issue64-interactions-page.png' })
  await page.getByRole('button', { name: 'Далее', exact: true }).click()
  await expect(page).toHaveURL(/tab=interactions&interactionOffset=20/)
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1)
  await page.getByRole('button', { name: 'Назад', exact: true }).click()
  await expect(page).toHaveURL(/tab=interactions$/)
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(20)
  expect(applicationId).toMatch(/^[0-9a-f-]{36}$/i)
  expect(interactionUrl).toContain(applicationId)

  // An immutable revision owns its clause set: a cancelled draft leaves no history.
  await page.goto(interactionUrl)
  await login(page, credentials.requester.token)
  await page.getByRole('link', { name: 'Ревизии', exact: true }).click()
  await expect(page.getByRole('table')).toContainText('#1')
  await page.getByRole('link', { name: 'Создать ревизию', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Новая ревизия #2' })).toBeVisible()
  await page.getByRole('button', { name: 'Добавить условие', exact: true }).click()
  await page.getByRole('button', { name: 'Удалить условие 3' }).click()
  await expect(page.getByRole('group', { name: 'TrafficClause #3' })).toHaveCount(0)
  await page.getByLabel('Назначение от 1').fill('444')
  await page.getByLabel('Назначение до 1').fill('444')
  await page.getByRole('link', { name: 'Отмена', exact: true }).click()
  await expect(page.getByRole('table')).toContainText('#1')
  await expect(page.getByRole('table')).not.toContainText('#2')
  await page.getByRole('link', { name: 'Создать ревизию', exact: true }).click()
  await page.getByLabel('Назначение от 1').fill('444')
  await page.getByLabel('Назначение до 1').fill('444')
  await expect(page.getByRole('group', { name: 'TrafficClause #2' })).toBeVisible()
  for (const [width, height] of [[1920, 1080], [1440, 900]]) {
    await page.setViewportSize({ width, height })
    await page.evaluate(() => document.querySelector('.ux-main')?.scrollTo(0, 0))
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: join(evidence, `revision-draft-${width}.png`), fullPage: true })
  }
  await page.route(`**/applications/${applicationId}/interactions/${interactionId}/revisions`, route => route.fulfill({
    status: 409, contentType: 'application/json', body: JSON.stringify({ error: { code: 'UNCHANGED_REVISION' } }),
  }))
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).click()
  await expect(page.getByText('Набор условий не изменился. Новая ревизия не создана.', { exact: true })).toBeVisible()
  await page.unroute(`**/applications/${applicationId}/interactions/${interactionId}/revisions`)
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Ревизия #2' })).toBeVisible()
  await expect(page).toHaveURL(/\/revisions\/[0-9a-f-]{36}$/)
  const newRevisionUrl = page.url()
  await page.getByRole('link', { name: 'Условия трафика', exact: true }).click()
  await expect(page.getByRole('table')).toContainText('UDP')
  await expect(page.getByRole('table')).toContainText('123')
  await expect(page.getByRole('table')).toContainText('TCP')
  await expect(page.getByRole('table')).toContainText('40000–40100')
  await expect(page.getByRole('table')).toContainText('444')
  await expect(page.getByRole('button', { name: /Удалить|Редактировать/ })).toHaveCount(0)
  await page.goto(newRevisionUrl)
  await login(page, credentials.requester.token)
  await expect(page.getByRole('heading', { name: 'Ревизия #2' })).toBeVisible()
  const afterRevision = await (await page.request.get(`/applications/${applicationId}/interactions/${interactionUrl.split('/').pop()}`,
    { headers: requester })).json()
  expect(afterRevision.revisions).toHaveLength(2)
  expect(afterRevision.revisions[0].interactionRevisionId).toBe(revisionId)
  expect(afterRevision.revisions[1].trafficClauses).toHaveLength(2)
  expect(afterRevision.revisions[0].trafficClauses).toEqual(interactionSnapshot.revisions[0].trafficClauses)
  expect(afterRevision.revisions[0].trafficClauses[0].destinationPortStart).toBe(443)
  expect(afterRevision.revisions[1].trafficClauses[0].destinationPortStart).toBe(444)
  const originalRuleAfter = await (await page.request.get(`/policy-rules/${policyRuleId}`,
    { headers: { Authorization: `Bearer ${credentials.exporter.token}` } })).json()
  expect(originalRuleAfter.subject.interactionRevisionId).toBe(revisionId)

  // Directed pair is unique regardless of purpose or traffic. Guide the actor
  // back to the existing Interaction instead of allowing a duplicate.
  await page.goto(`/applications/${applicationId}/interactions/new`)
  await login(page, credentials.requester.token)
  await page.getByLabel('Назначение взаимодействия').fill('Different traffic, same direction')
  await page.getByRole('combobox', { name: 'Источник', exact: true }).selectOption({ label: 'Sender' })
  await page.getByRole('combobox', { name: 'Получатель', exact: true }).selectOption({ label: 'Receiver' })
  await expect(page.getByRole('alert')).toContainText('направленная связь уже существует')
  await expect(page.getByRole('button', { name: 'Создать', exact: true })).toBeDisabled()
  await page.getByRole('alert').getByRole('link', { name: 'Order fulfillment traffic' }).click()
  await expect(page).toHaveURL(interactionUrl)
  const afterAttempt = await (await page.request.get(`/applications/${applicationId}/interactions`,
    { headers: requester })).json()
  const sameDirectedPair = afterAttempt.items.filter((item: { sourceComponentId: string; destinationComponentId: string }) =>
    item.sourceComponentId === senderComponentId && item.destinationComponentId === receiverComponentId)
  expect(sameDirectedPair).toHaveLength(1)
  expect(sameDirectedPair[0].interactionId).toBe(interactionId)
})
