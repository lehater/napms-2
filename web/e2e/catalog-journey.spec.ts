import { test as base, expect, type Page } from '@playwright/test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
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
  await page.getByRole('link', { name: 'Взаимодействия', exact: true }).click()
  await page.getByRole('combobox', { name: 'Источник', exact: true }).selectOption({ label: 'Sender' })
  await page.getByRole('combobox', { name: 'Получатель', exact: true }).selectOption({ label: 'Receiver' })
  await page.getByRole('button', { name: 'Создать взаимодействие', exact: true }).click()
  await expect(page.getByRole('table')).toContainText('Sender → Receiver')
  await page.getByRole('link', { name: 'Sender → Receiver', exact: true }).click()
  await expect(page).toHaveURL(/\/applications\/[0-9a-f-]{36}\/interactions\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('heading', { name: 'Sender → Receiver', exact: true })).toBeVisible()
  const interactionUrl = page.url()
  const revisionId = (await page.locator('tbody tr').first().innerText()).match(/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}/i)?.[0]
  expect(revisionId).toBeTruthy()
  await page.screenshot({ path: '/tmp/napms-issue64-application-detail.png', fullPage: true })

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
  expect(applicationId).toMatch(/^[0-9a-f-]{36}$/i)
  expect(interactionUrl).toContain(applicationId)
})
