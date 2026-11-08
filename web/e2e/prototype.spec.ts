import { test, expect } from '@playwright/test'
import { byId, dataNature, natureLabel, objects, objectPath, sections, legacySections, visibleCollection } from '../src/prototype/data'

test('fixture has one coherent allow-only communication with honest comparison evidence', () => {
  expect(byId.size).toBe(objects.length)
  for (const object of objects) {
    expect(object.id).toMatch(/^mock-/)
    expect([...sections, ...legacySections].some(section => section.id === object.section)).toBe(true)
    for (const link of object.links) expect(byId.has(link.id), `${object.id} → ${link.id}`).toBe(true)
  }
  const resources = objects.filter(object => object.kind === 'Resource')
  expect(resources).toHaveLength(2)
  expect(new Set(resources.map(object => object.fields.endpoint)).size).toBe(2)
  expect(resources.every(object => Boolean(object.fields.endpoint))).toBe(true)
  for (const resource of resources) {
    const endpoints = resource.links.map(link => byId.get(link.id)!).filter(object => object.kind === 'Endpoint')
    expect(endpoints).toHaveLength(1)
    expect(endpoints[0].id).toBe(resource.fields.endpoint)
    expect(endpoints[0].fields.addressHistory).toContain('[2026-11-01T00:00:00Z, ∞)')
    expect(resource.fields.currentAddressFromHistory).toContain('EndpointAddressHistory')
    expect(resource.fields.siteHistory).toContain('[2026-11-01T00:00:00Z, ∞)')
    expect(resource.fields.responsibilityHistory).toContain('не grant')
  }
  expect(objects.filter(object => object.kind === 'Interaction')).toHaveLength(1)
  expect(objects.filter(object => object.kind === 'InteractionRevision')).toHaveLength(1)
  const need = byId.get('mock-need')!
  expect(need.links.some(link => link.id === 'mock-interaction-ledger')).toBe(true)
  expect(need.links.some(link => byId.get(link.id)?.kind === 'InteractionRevision')).toBe(false)
  expect(need.fields.participantComponent).toBe(byId.get('mock-interaction-ledger')!.fields.sourceComponent + ' / sender')
  expect(byId.get('mock-revision')!.fields.interaction).toBe('mock-interaction-ledger')
  expect(byId.get('mock-revision')!.state).toBeUndefined() // invariant, not lifecycle
  expect(byId.get('mock-application')!.state).toBeUndefined() // read-only is UI mode
  for (const request of objects.filter(object => object.kind === 'AccessRequest')) {
    for (const kind of ['BusinessProcess', 'ConnectivityNeed', 'InteractionRevision']) {
      expect(request.links.some(link => byId.get(link.id)?.kind === kind)).toBe(true)
    }
    expect(request.links.filter(link => byId.get(link.id)?.kind === 'ComponentDeployment')).toHaveLength(2)
    expect(request.links.find(link => byId.get(link.id)?.kind === 'InteractionRevision')!.id).toBe('mock-revision')
    expect(request.fields.RequestAuthorityEvidence).toContain('source Resource mock-resource-order only')
    expect(request.fields.RequestAuthorityEvidence).toContain('evaluatedAt')
    expect(request.fields.decisionAuthority).toContain('access.decide')
  }
  const rule = byId.get('mock-rule')!
  expect(rule.permits).toEqual([443])
  expect(rule.fields.effect).toBe('PERMIT only')
  expect(rule.state).toBe('Active')
  expect(rule.fields.RuleAuthorizationEvidence).toContain('mock-decision-allowed (Q1 ALLOWED)')
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

test('TAE facts remain independent of AP/NEP and configured is a computed interpretation', () => {
  const set = byId.get('mock-evidence-set-f2')!
  const entry = byId.get('mock-evidence-entry-f2')!
  const configured = byId.get('mock-configured')!
  for (const field of ['sourceIdentity', 'captureReference', 'sourceScopeReference', 'sourceTime', 'recordedAt', 'reliability', 'completeness']) expect(set.fields[field]).toBeTruthy()
  for (const field of ['sourceAddresses', 'destinationAddresses', 'protocol', 'sourcePorts', 'destinationPorts']) expect(entry.fields[field]).toBeTruthy()
  expect(entry.fields.sourcePorts).toContain('Any (явное значение источника, не Unknown)')
  expect(entry.fields.destinationPorts).toBe('Ranges [8443, 8443]')
  expect(entry.fields.action).toContain('не ALLOWED')
  expect(set.links.some(link => link.id === entry.id)).toBe(true)
  for (const fact of [set, entry]) {
    expect(dataNature[fact.kind]).toBe('persistent')
    // TAE has its own stored facts and a UI drill-down to interpretation, no AP/NEP references.
    expect(fact.links.every(link => ['TechnicalAccessEvidenceSet', 'TechnicalAccessEntry', 'ConfiguredEffectivePolicySnapshot'].includes(byId.get(link.id)!.kind))).toBe(true)
    expect(fact.permits).toBeUndefined()
  }
  expect(configured.links.some(link => link.id === set.id)).toBe(true)
  expect(configured.links.some(link => link.id === entry.id)).toBe(true)
  expect(configured.fields.interpretation).toContain(entry.id)
  for (const kind of ['NST', 'TargetRequiredPolicy', 'ConfiguredEffectivePolicySnapshot', 'Reconciliation'] as const) expect(dataNature[kind]).toBe('computed')
  for (const kind of ['Resource', 'Endpoint', 'Interaction', 'InteractionRevision', 'BusinessProcess', 'ConnectivityNeed', 'AccessRequest', 'PolicyRule'] as const) expect(dataNature[kind]).toBe('persistent')
  expect(byId.get('mock-configured-unknown')!.links.some(link => byId.get(link.id)?.kind === 'TechnicalAccessEvidenceSet')).toBe(false)
  expect(byId.get('mock-configured-unknown')!.permits).toBeNull() // unknown ≠ [] ≠ Any
})

for (const [width, height] of [[1440, 900], [1920, 1080], [2560, 1440]]) {
  test(`baseline fluid geometry and sidebar bounds at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/prototype/resources')
    const separator = page.getByRole('separator', { name: 'Sidebar width' })
    const measure = () => page.evaluate(() => ({
      sidebar: document.querySelector('.ux-sidebar')!.getBoundingClientRect().width,
      work: document.querySelector('.ux-workspace')!.getBoundingClientRect().width,
      main: document.querySelector('main')!.getBoundingClientRect().width,
      page: document.documentElement.scrollWidth,
    }))
    await expect(separator).toHaveAttribute('aria-valuenow', '264')
    expect(await measure()).toEqual({ sidebar: 264, work: width - 270, main: width - 270, page: width })
    await separator.focus()
    for (const [key, expected] of [['Home', 200], ['ArrowLeft', 200], ['End', 360], ['ArrowRight', 360], ['ArrowLeft', 350], ['Shift+ArrowLeft', 300]] as const) {
      await separator.press(key)
      await expect(separator).toHaveAttribute('aria-valuenow', String(expected))
      expect(await measure()).toEqual({ sidebar: expected, work: width - expected - 6, main: width - expected - 6, page: width })
    }
    const bounds = await separator.boundingBox()
    await page.mouse.move(bounds!.x + 3, 300)
    await page.mouse.down()
    await page.mouse.move(330, 300)
    await page.mouse.up()
    await expect(separator).toHaveAttribute('aria-valuenow', '330')
    await page.reload()
    await expect(separator).toHaveAttribute('aria-valuenow', '330')
    expect(await page.evaluate(() => Object.entries(localStorage))).toEqual([['napms.prototype.sidebarWidth', '330']])
    for (const tab of ['overview', 'endpoints', 'deployments', 'history']) {
      await page.goto('/prototype/resources/mock-resource-order?tab=' + tab)
      expect((await measure()).main).toBe(width - 336)
      expect((await measure()).page).toBe(width)
      await expect(page.getByRole('navigation', { name: 'Resource tabs' })).toBeVisible()
    }
    await page.goto('/prototype/applications/mock-application')
    expect((await measure()).main).toBe(width - 336)
    expect((await measure()).page).toBe(width)
  })
}

test('Resources collection filtering, pagination, tabs, direct URLs and return retain context', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => { if (['fetch', 'xhr'].includes(request.resourceType())) requests.push(request.url()) })
  await page.goto('/prototype/resources')
  const table = page.getByRole('table')
  await expect(table.getByRole('columnheader')).toHaveText(['Resource', 'Scope', 'Endpoints / текущий адрес', 'Площадка', 'Ответственность'])
  await expect(table.getByRole('row')).toHaveCount(3)
  await expect(table).not.toContainText('Endpoint ·')
  await page.getByLabel('Scope', { exact: true }).selectOption('orders-prod')
  await expect(table.getByRole('row')).toHaveCount(2)
  await expect(table).toContainText('order-api-01')
  await page.getByLabel('Площадка', { exact: true }).selectOption('DC-2')
  await expect(page.getByText('Нет совпадений. Измените поисковый запрос.')).toBeVisible()
  await page.getByLabel('Scope', { exact: true }).selectOption('')
  await expect(table).toContainText('ledger-api-01')
  await page.getByLabel('Площадка', { exact: true }).selectOption('')
  await expect(table.getByRole('row')).toHaveCount(3)
  await page.getByLabel('Поиск объектов').fill('192.0.2.10')
  await expect(table.getByRole('row')).toHaveCount(2)
  await expect(table).toContainText('order-api-01')
  await page.getByLabel('Поиск объектов').fill('')
  await expect(table.getByRole('row')).toHaveCount(3)
  await expect(page).toHaveURL(/\/prototype\/resources$/)
  await page.getByLabel('Строк на странице').selectOption('1')
  await expect(page).toHaveURL(/\?size=1$/)
  await expect(table.getByRole('row')).toHaveCount(2)
  await expect(page.getByRole('status')).toHaveText('Показано 2 из 2')
  await page.getByRole('button', { name: 'Следующая страница' }).click()
  await expect(table).toContainText('ledger-api-01')
  const listUrl = page.url()
  await page.getByRole('link', { name: 'ledger-api-01', exact: true }).click()
  const tabs = page.getByRole('navigation', { name: 'Resource tabs' })
  await expect(tabs.getByRole('link', { name: 'Обзор' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('region', { name: 'Карточка объекта' })).toContainText('192.0.2.20')
  await expect(page.getByRole('region', { name: 'Связанные объекты' })).toHaveCount(0)
  await tabs.getByRole('link', { name: /Endpoints/ }).click()
  const endpointUrl = page.url()
  await page.reload()
  await expect(tabs.getByRole('link', { name: /Endpoints/ })).toHaveAttribute('aria-current', 'page')
  await page.getByRole('table').getByRole('link', { name: 'Endpoint · ledger-api-01 →', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Endpoint · ledger-api-01', exact: true })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Breadcrumbs' })).toContainText('ledger-api-01')
  await page.goBack()
  await expect(page).toHaveURL(endpointUrl)
  await tabs.getByRole('link', { name: /Развёрнутые компоненты/ }).click()
  await page.getByRole('table').getByRole('link', { name: 'dep-ledger-1 →' }).click()
  await expect(page.getByRole('heading', { name: 'dep-ledger-1', exact: true })).toBeVisible()
  await page.goBack()
  await tabs.getByRole('link', { name: /История/ }).click()
  await expect(page.getByText(/Предыдущие значения, авторы/)).toBeVisible()
  await page.getByLabel('Тип факта').selectOption('Ответственность')
  await expect(page.getByRole('table')).toContainText('OWNER Finance')
  await expect(page.getByRole('table')).toContainText('[2026-11-01T00:00:00Z, ∞)')
  await page.getByRole('link', { name: '← К списку Resources' }).click()
  await expect(page).toHaveURL(listUrl)
  await expect(page.getByRole('table')).toContainText('ledger-api-01')
  await expect(page.getByLabel('Строк на странице')).toHaveValue('1')
  await page.getByRole('button', { name: 'Предыдущая страница' }).click()
  await expect(page.getByRole('table')).toContainText('order-api-01')
  // Changing a filter on a later page resets pagination.
  await page.getByRole('button', { name: 'Следующая страница' }).click()
  await page.getByLabel('Scope', { exact: true }).selectOption('orders-prod')
  await expect(page.getByRole('table')).toContainText('order-api-01')
  await expect(page.getByRole('button', { name: 'Следующая страница' })).toBeDisabled()
  expect(requests).toEqual([])
})

test('Resource slice stays usable at 390px and rejects invalid width preferences', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('napms.prototype.sidebarWidth', 'not-a-width'))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/prototype/resources')
  const nav = page.getByRole('navigation', { name: 'Prototype navigation', exact: true })
  await expect(nav.getByRole('link')).toHaveCount(7)
  await expect(nav.getByRole('link', { name: 'Ресурсы', exact: true })).toBeVisible()
  await page.getByRole('table').getByRole('link', { name: 'order-api-01', exact: true }).click()
  for (const name of ['Обзор', 'Endpoints', 'Развёрнутые компоненты', 'История']) {
    await page.getByRole('navigation', { name: 'Resource tabs' }).getByRole('link', { name: new RegExp(name) }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
    if (name !== 'Обзор') {
      await expect(page.getByRole('table')).toBeVisible()
      await page.getByLabel('Поиск объектов').fill('no-such-object')
      await expect(page.getByText('Нет совпадений. Измените поисковый запрос.')).toBeVisible()
    }
  }
  await page.getByRole('link', { name: '← К списку Resources' }).click()
  await expect(page.getByRole('heading', { name: 'Ресурсы', exact: true })).toBeVisible()
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(page.getByRole('separator', { name: 'Sidebar width' })).toHaveAttribute('aria-valuenow', '264')
  await page.getByRole('separator', { name: 'Sidebar width' }).press('ArrowRight')
  expect(await page.evaluate(() => [Object.entries(localStorage), Object.keys(sessionStorage), document.cookie])).toEqual([[['napms.prototype.sidebarWidth', '274']], [], ''])
})

const journeys = [
  ['processes', 'mock-process', 'Потребности', 'mock-need'],
  ['needs', 'mock-need', 'Заявки', 'mock-request-allowed'],
  ['resources', 'mock-resource-order', 'Endpoints', 'mock-endpoint-order'],
  ['applications', 'mock-application', 'Коммуникации', 'mock-interaction-ledger'],
  ['deployments', 'mock-deployment-order', 'Ресурс', 'mock-resource-order'],
  ['requests', 'mock-request-allowed', 'Бизнес-основание', 'mock-need'],
  ['policy', 'mock-rule', 'Основания разрешения', 'mock-request-allowed'],
] as const
for (const [sectionId, id, tab, targetId] of journeys) {
  test(`Sidebar → ${sectionId} → Detail → ${tab} → related object`, async ({ page }) => {
    const requests: string[] = []
    page.on('request', request => { if (['fetch', 'xhr'].includes(request.resourceType())) requests.push(request.url()) })
    await page.goto('/prototype')
    const nav = page.getByRole('navigation', { name: 'Prototype navigation', exact: true })
    await expect(nav.getByRole('link')).toHaveText(sections.map(item => item.title))
    await expect(nav.locator('.ux-nav-label')).toHaveText(['Бизнес-контекст', 'Каталоги', 'Управление доступом'])
    await nav.getByRole('link', { name: sections.find(item => item.id === sectionId)!.title, exact: true }).click()
    const rows = page.locator('tbody tr')
    const expected = visibleCollection(sectionId)
    await expect(rows).toHaveCount(Math.min(2, expected.length))
    expect(await rows.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-object-kind')))).toEqual(expected.slice(0, 2).map(item => item.kind))
    if (expected.length > 2) {
      await page.getByRole('button', { name: 'Следующая страница', exact: true }).click()
      await expect(rows).toHaveCount(expected.length - 2)
      expect(await rows.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-object-id')))).toEqual(expected.slice(2).map(item => item.id))
      await page.getByRole('button', { name: 'Предыдущая страница', exact: true }).click()
    }
    const object = byId.get(id)!, target = byId.get(targetId)!
    await page.getByRole('table').getByRole('link', { name: object.name, exact: true }).click()
    await expect(page.getByRole('heading', { name: object.name, exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: sections.find(item => item.id === sectionId)!.title, exact: true })).toHaveAttribute('aria-current', 'page')
    const tabs = page.getByRole('navigation', { name: /^(Object|Resource) tabs$/ })
    await expect(tabs.getByRole('link', { name: 'Обзор', exact: true })).toHaveAttribute('aria-current', 'page')
    await tabs.getByRole('link', { name: new RegExp(tab) }).click()
    const tabUrl = page.url()
    await page.reload()
    await expect(tabs.getByRole('link', { name: new RegExp(tab) })).toHaveAttribute('aria-current', 'page')
    await page.getByRole('table').getByRole('link', { name: sectionId === 'resources' ? target.name + ' →' : target.name, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(objectPath(target) + '$'))
    await expect(page.getByRole('navigation', { name: 'Breadcrumbs' })).toContainText(target.name)
    await page.goBack()
    await expect(page).toHaveURL(tabUrl)
    expect(requests).toEqual([])
  })
}

test('all fixture relations remain reachable through typed tabs and technical deep links', async ({ page }) => {
  for (const object of objects) {
    await page.goto(objectPath(object))
    await expect(page.getByRole('heading', { name: object.name, exact: true })).toBeVisible()
    const visited = new Set<string>()
    const hrefs = await page.getByRole('navigation', { name: /^(Object|Resource) tabs$/ }).getByRole('link').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')!))
    for (const href of hrefs) {
      await page.goto(href)
      for (const link of await page.getByRole('table').getByRole('link').all()) visited.add((await link.getAttribute('href'))!)
    }
    for (const relation of object.links) expect(visited.has(objectPath(byId.get(relation.id)!)), `${object.id} → ${relation.id}`).toBe(true)
    await expect(page.getByRole('heading', { name: 'Связанные объекты', exact: true })).toHaveCount(0)
  }
})

test('Application components and directed communication lead to immutable Revision', async ({ page }) => {
  for (const width of [1440, 800, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/prototype/applications')
    const table = page.getByRole('table')
    await expect(table.getByRole('columnheader')).toHaveText(['Объект', 'Компоненты', 'Коммуникации', 'Назначение'])
    await expect(table.locator('tbody tr')).toHaveCount(1)
    await expect(table).toContainText('OrderClient\nLedgerApi')
    await table.getByRole('link', { name: byId.get('mock-application')!.name }).click()
    await expect(page.getByText('Назначение: Запись проводки')).toBeVisible()
    await expect(page.getByLabel('Направление коммуникации')).toHaveText('→')
    await expect(page.getByText(/TCP\/443 не подтверждает HTTPS/)).toBeVisible()
    const tabs = page.getByRole('navigation', { name: 'Object tabs' })
    await tabs.getByRole('link', { name: 'Компоненты', exact: true }).click()
    await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(2)
    await tabs.getByRole('link', { name: 'Коммуникации', exact: true }).click()
    await page.getByRole('table').getByRole('link', { name: byId.get('mock-interaction-ledger')!.name, exact: true }).click()
    await tabs.getByRole('link', { name: 'Ревизии', exact: true }).click()
    await page.getByRole('table').getByRole('link', { name: byId.get('mock-revision')!.name, exact: true }).click()
    await expect(page.getByRole('region', { name: 'Карточка объекта' })).toContainText('Неизменяемость параметров')
    const crumbs = page.getByRole('navigation', { name: 'Breadcrumbs' })
    await expect(crumbs).toContainText(byId.get('mock-application')!.name)
    await expect(crumbs).toContainText(byId.get('mock-interaction-ledger')!.name)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})

test('collection state survives breadcrumb and reload; real API stays separate', async ({ page }) => {
  await page.goto('/prototype/requests')
  await page.getByLabel('Строк на странице').selectOption('1')
  await page.getByRole('button', { name: 'Следующая страница' }).click()
  await page.getByRole('table').getByRole('link', { name: byId.get('mock-request-denied')!.name }).click()
  await page.getByRole('navigation', { name: 'Object tabs' }).getByRole('link', { name: 'Решение и evidence' }).click()
  await expect(page.locator('main')).toContainText('mock-decision-denied')
  await expect(page.locator('main')).toContainText('access.decide')
  await page.reload()
  await page.getByRole('navigation', { name: 'Breadcrumbs' }).getByRole('link', { name: 'Заявки на доступ', exact: true }).click()
  await expect(page.getByLabel('Строк на странице')).toHaveValue('1')
  await expect(page.getByRole('table')).toContainText(byId.get('mock-request-denied')!.name)
  await page.getByLabel('Состояние', { exact: true }).selectOption('ALLOWED')
  await expect(page.getByRole('table')).toContainText(byId.get('mock-request-allowed')!.name)
  await expect(page.getByRole('button', { name: 'Следующая страница' })).toBeDisabled()
  await page.getByLabel('Поиск объектов').fill('absent')
  await expect(page.getByText('Нет совпадений. Измените поисковый запрос.')).toBeVisible()
  await page.getByRole('navigation', { name: 'Real API navigation' }).getByRole('link', { name: 'Новая заявка →' }).click()
  await expect(page).toHaveURL(/\/access-requests\/new$/)
  await expect(page.getByLabel('Bearer token', { exact: true })).toHaveValue('')
  await page.getByRole('link', { name: 'UX-0 prototype · MOCK' }).click()
  await expect(page.getByText('RESEARCH / MOCK', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Bearer token', { exact: true })).toHaveCount(0)
  await page.goto('/prototype/resources/missing')
  await expect(page.getByRole('heading', { name: 'Объект не найден' })).toBeVisible()
})
