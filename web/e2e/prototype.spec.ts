import { test, expect } from '@playwright/test'
import { byId, objects, objectPath, sections } from '../src/prototype/data'

test('fixture has one coherent allow-only communication with honest comparison evidence', () => {
  expect(byId.size).toBe(objects.length)
  for (const object of objects) {
    expect(object.id).toMatch(/^mock-/)
    expect(sections.some(section => section.id === object.section)).toBe(true)
    for (const link of object.links) expect(byId.has(link.id), `${object.id} → ${link.id}`).toBe(true)
  }
  const resources = objects.filter(object => object.kind === 'Resource')
  expect(resources).toHaveLength(2)
  expect(new Set(resources.map(object => object.fields.endpoint)).size).toBe(2)
  expect(resources.every(object => Boolean(object.fields.endpoint))).toBe(true)
  expect(objects.filter(object => object.kind === 'InteractionRevision')).toHaveLength(1)
  for (const request of objects.filter(object => object.kind === 'AccessRequest')) {
    for (const kind of ['BusinessProcess', 'ConnectivityNeed', 'InteractionRevision']) {
      expect(request.links.some(link => byId.get(link.id)?.kind === kind)).toBe(true)
    }
    expect(request.links.filter(link => byId.get(link.id)?.kind === 'ComponentDeployment')).toHaveLength(2)
  }
  const rule = byId.get('mock-rule')!
  expect(rule.permits).toEqual([443])
  expect(rule.fields.effect).toBe('PERMIT only')
  expect(rule.state).toBe('Active')
  const denied = byId.get('mock-request-denied')!
  expect(denied.fields.policyRuleId).toBe('null')
  expect(denied.links.some(link => byId.get(link.id)?.kind === 'PolicyRule')).toBe(false)
  const required = byId.get('mock-required')!.permits!
  const configured = byId.get('mock-configured')!.permits!
  const drift = byId.get('mock-drift')!
  expect(required.filter(port => !configured.includes(port))).toEqual([443])
  expect(configured.filter(port => !required.includes(port))).toEqual([8443])
  expect(drift.fields.missing).toBe('TCP/443')
  expect(drift.fields.excess).toBe('TCP/8443')
  expect(byId.get('mock-configured-unknown')!.permits).toBeNull()
  expect(byId.get('mock-uncomparable')!.state).toBe('Uncomparable')
})

test('all eight sections, filtering and every object relation work without API requests', async ({ page }) => {
  const apiRequests: string[] = []
  // Observe real browser traffic. Do not intercept or stub API calls.
  page.on('request', request => { if (['fetch', 'xhr'].includes(request.resourceType())) apiRequests.push(request.url()) })
  await page.goto('/prototype')
  for (const section of sections) {
    await page.getByRole('navigation', { name: 'Prototype navigation', exact: true }).getByRole('link', { name: section.title, exact: true }).click()
    await expect(page.getByRole('heading', { name: section.title, exact: true })).toBeVisible()
    await expect(page.getByText('MOCK / FICTIONAL NETWORK DATA', { exact: true })).toBeVisible()
  }
  await page.goto('/prototype/resources')
  await page.getByLabel('Поиск объектов').fill('192.0.2.10')
  await expect(page.getByRole('link', { name: 'order-api-01', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'ledger-api-01', exact: true })).toHaveCount(0)
  await page.getByLabel('Поиск объектов').fill('no-such-object')
  await expect(page.getByText('Нет совпадений. Измените поисковый запрос.')).toBeVisible()
  for (const object of objects) {
    await page.goto(objectPath(object))
    await expect(page.getByRole('heading', { name: object.name, exact: true })).toBeVisible()
    const links = page.getByRole('region', { name: 'Связанные объекты' }).getByRole('link')
    await expect(links).toHaveCount(object.links.length)
    for (let index = 0; index < object.links.length; index++) {
      await expect(links.nth(index)).toHaveAttribute('href', objectPath(byId.get(object.links[index].id)!))
    }
  }
  expect(apiRequests).toEqual([])
  await expect(page.getByLabel('Bearer token', { exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => [Object.keys(localStorage), Object.keys(sessionStorage), document.cookie])).toEqual([[], [], ''])
})

test('linked chain supports reload, browser back, unknown evidence and real-route boundary', async ({ page }) => {
  const chain = ['mock-resource-order', 'mock-deployment-order', 'mock-revision', 'mock-need', 'mock-rule', 'mock-required', 'mock-configured', 'mock-drift']
  await page.goto(objectPath(byId.get(chain[0])!))
  for (const id of chain.slice(1)) {
    const target = byId.get(id)!
    await page.getByRole('region', { name: 'Связанные объекты' }).getByRole('link', { name: target.name + ' →', exact: true }).click()
    await expect(page.getByRole('heading', { name: target.name, exact: true })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Breadcrumbs' })).toContainText(target.name)
  }
  await expect(page.getByRole('region', { name: 'Карточка объекта' })).toContainText('Drift')
  await page.reload()
  await expect(page.getByRole('heading', { name: byId.get('mock-drift')!.name, exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: byId.get('mock-configured')!.name, exact: true })).toBeVisible()
  await page.goto('/prototype/comparison/mock-uncomparable')
  await expect(page.getByRole('region', { name: 'Карточка объекта' })).toContainText('Uncomparable')
  await expect(page.getByRole('region', { name: 'Карточка объекта' })).toContainText('Unknown')
  await page.goto('/prototype/resources/missing')
  await expect(page.getByRole('heading', { name: 'Объект не найден' })).toBeVisible()
  await page.getByRole('link', { name: 'Новая заявка →', exact: true }).click()
  await expect(page).toHaveURL(/\/access-requests\/new$/)
  await expect(page.getByRole('heading', { name: 'Enter a demo credential' })).toBeVisible()
  await expect(page.getByLabel('Bearer token', { exact: true })).toHaveValue('')
  await page.getByRole('link', { name: 'UX-0 prototype · MOCK', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Обзор', exact: true })).toBeVisible()
})
