import { test, expect } from '@playwright/test'
import { byId, dataNature, natureLabel, objects, objectPath, sections, stateDefinitions } from '../src/prototype/data'

test('fixture has one coherent allow-only communication with honest comparison evidence', () => {
  expect(byId.size).toBe(objects.length)
  for (const object of objects) {
    expect(object.id).toMatch(/^mock-/)
    expect(sections.some(section => section.id === object.section) || (object.kind === 'AccessRequest' && object.section === 'requests')).toBe(true)
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

test('all eight sections, filtering and every object relation work without API requests', async ({ page }) => {
  const apiRequests: string[] = []
  // Observe real browser traffic. Do not intercept or stub API calls.
  page.on('request', request => { if (['fetch', 'xhr'].includes(request.resourceType())) apiRequests.push(request.url()) })
  await page.goto('/prototype')
  for (const section of sections) {
    await page.getByRole('navigation', { name: 'Prototype navigation', exact: true }).getByRole('link', { name: section.title, exact: true }).click()
    await expect(page.getByRole('heading', { name: section.title, exact: true })).toBeVisible()
    await expect(page.getByText('RESEARCH / MOCK', { exact: true })).toBeVisible()
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
    await page.getByText('О данных', { exact: true }).click()
    await expect(page.getByRole('region', { name: 'Карточка объекта' })).toContainText(natureLabel[dataNature[object.kind]])
    if (object.kind === 'Resource') {
      for (const [tab, kind] of [['Endpoints', 'Endpoint'], ['Deployments', 'ComponentDeployment']] as const) {
        await page.getByRole('navigation', { name: 'Resource tabs' }).getByRole('link', { name: new RegExp(tab) }).click()
        const links = page.getByRole('region', { name: 'Связанные объекты' }).getByRole('table').getByRole('link')
        const targets = object.links.map(link => byId.get(link.id)!).filter(target => target.kind === kind)
        await expect(links).toHaveCount(targets.length)
        for (let index = 0; index < targets.length; index++) await expect(links.nth(index)).toHaveAttribute('href', objectPath(targets[index]))
      }
    } else {
      const links = page.getByRole('region', { name: 'Связанные объекты' }).getByRole('link')
      await expect(links).toHaveCount(object.links.length)
      for (let index = 0; index < object.links.length; index++) await expect(links.nth(index)).toHaveAttribute('href', objectPath(byId.get(object.links[index].id)!))
    }
  }
  expect(apiRequests).toEqual([])
  await expect(page.getByLabel('Bearer token', { exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => ({
    local: Object.entries(localStorage).filter(([key]) => key !== 'napms.prototype.sidebarWidth'),
    validWidth: localStorage.getItem('napms.prototype.sidebarWidth') === null || /^(2\d\d|3[0-5]\d|360)$/.test(localStorage.getItem('napms.prototype.sidebarWidth')!), session: Object.keys(sessionStorage), cookie: document.cookie,
  }))).toEqual({ local: [], validWidth: true, session: [], cookie: '' })
})

test('linked chain supports reload, browser back, unknown evidence and real-route boundary', async ({ page }) => {
  const chain = ['mock-resource-order', 'mock-deployment-order', 'mock-interaction-ledger', 'mock-need', 'mock-request-allowed', 'mock-rule', 'mock-required', 'mock-configured', 'mock-evidence-set-f2', 'mock-evidence-entry-f2', 'mock-configured', 'mock-drift']
  await page.goto(objectPath(byId.get(chain[0])!))
  await page.getByRole('navigation', { name: 'Resource tabs' }).getByRole('link', { name: /Deployments/ }).click()
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
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible()
})

test('ObjectTable headers match object, type, status and description cells', async ({ page }) => {
  for (const id of ['mock-request-allowed', 'mock-need', 'mock-application'] as const) {
    const object = byId.get(id)!
    await page.goto('/prototype/' + object.section)
    const table = page.getByRole('table')
    await expect(table.getByRole('columnheader')).toHaveText(['Объект', 'Тип', 'Состояние', 'Описание'])
    const row = table.getByRole('row').filter({ has: page.getByRole('link', { name: object.name, exact: true }) })
    const cells = row.getByRole('cell')
    await expect(cells).toHaveCount(4)
    await expect(cells.nth(0)).toHaveText(object.name)
    await expect(cells.nth(1)).toHaveText(object.kind)
    if (object.state) {
      await expect(cells.nth(2)).toContainText(stateDefinitions[object.kind].label!)
      await expect(cells.nth(2)).toContainText(object.state)
    } else await expect(cells.nth(2)).toHaveText('—')
    await expect(cells.nth(3)).toHaveText(object.summary)
  }
})

test('Applications presents profile → interaction → revision with parent context and distinct properties', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => { if (['fetch', 'xhr'].includes(request.resourceType())) requests.push(request.url()) })
  const application = byId.get('mock-application')!
  const interaction = byId.get('mock-interaction-ledger')!
  const revision = byId.get('mock-revision')!
  for (const width of [1440, 800, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/prototype/applications')
    const nav = page.getByRole('navigation', { name: 'Prototype navigation', exact: true })
    await expect(nav.getByRole('link', { name: 'Applications', exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link')).toHaveCount(8)
    const table = page.getByRole('table')
    await expect(table.getByRole('row')).toHaveCount(2)
    await expect(table).not.toContainText('Immutable')
    await expect(table).not.toContainText('Read-only')
    await expect(table).not.toContainText(natureLabel.persistent)
    await table.getByRole('link', { name: application.name, exact: true }).click()
    await expect(page.getByRole('region', { name: 'Components', exact: true })).toContainText('OrderClient')
    await expect(page.getByRole('region', { name: 'Components', exact: true })).toContainText('LedgerApi')
    await expect(page.getByRole('region', { name: 'Карточка объекта' })).not.toContainText('Read-only')
    await page.getByRole('region', { name: 'Interactions', exact: true }).getByRole('link', { name: 'Interaction details', exact: true }).click()
    const communication = page.getByRole('region', { name: 'Communication', exact: true })
    await expect(communication).toContainText('OrderClient')
    await expect(communication).toContainText('LedgerApi')
    await expect(communication).toContainText('Назначение: Запись проводки')
    await expect(page.getByRole('region', { name: 'Карточка объекта' })).toContainText('Актуальность')
    await expect(page.getByRole('region', { name: 'Карточка объекта' })).toContainText('Current')
    await page.getByRole('region', { name: 'Interaction revisions', exact: true }).getByRole('link', { name: revision.name + ' →', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(objectPath(revision) + '$'))
    await expect(page.getByRole('region', { name: 'Карточка объекта' })).toContainText('Неизменяемость параметров')
    await expect(page.getByRole('region', { name: 'Карточка объекта' })).not.toContainText('Immutable')
    const crumbs = page.getByRole('navigation', { name: 'Breadcrumbs' })
    await expect(crumbs.getByRole('link', { name: application.name, exact: true })).toBeVisible()
    await expect(crumbs.getByRole('link', { name: interaction.name, exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.reload()
    await expect(page.getByRole('heading', { name: revision.name, exact: true })).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('heading', { name: interaction.name, exact: true })).toBeVisible()
    await page.getByRole('navigation', { name: 'Breadcrumbs' }).getByRole('link', { name: application.name, exact: true }).click()
    await expect(page.getByRole('heading', { name: application.name, exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
  expect(requests).toEqual([])
})

test('Application Detail prioritizes communication above metadata without implying L7', async ({ page }) => {
  const application = byId.get('mock-application')!
  const revision = byId.get('mock-revision')!
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(objectPath(application))
    await expect(page.getByText('RESEARCH / MOCK', { exact: true })).toBeVisible()
    const interactions = page.getByRole('region', { name: 'Interactions', exact: true })
    const components = interactions.getByRole('region', { name: 'Components', exact: true })
    const purpose = interactions.getByLabel('Назначение коммуникации', { exact: true })
    await expect(components).toContainText('OrderClient')
    await expect(components).toContainText('LedgerApi')
    await expect(interactions.getByLabel('Направление коммуникации')).toHaveText('→')
    await expect(purpose).toHaveText('Назначение: Запись проводки')
    await expect(interactions).toContainText('TCP/443 не подтверждает HTTPS')
    await expect(interactions).toContainText(revision.fields.traffic)
    await expect(interactions.getByRole('link', { name: /Revision ·/ })).toHaveAttribute('href', objectPath(revision))
    // Navigation labels are separate from the communication direction.
    for (const link of await interactions.getByRole('link').all()) await expect(link).not.toContainText('→')
    if (width === 1440) {
      await expect(page.getByRole('heading', { name: application.name, exact: true })).toBeInViewport({ ratio: 1 })
      await expect(components).toBeInViewport({ ratio: 1 })
      await expect(purpose).toBeInViewport({ ratio: 1 })
      expect(await page.evaluate(() => window.scrollY)).toBe(0)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    const card = page.getByRole('region', { name: 'Карточка объекта' })
    await expect(card.getByText(application.id, { exact: true })).not.toBeVisible()
    await card.getByText('Application · технические свойства', { exact: true }).click()
    await expect(card.getByText(application.id, { exact: true })).toBeVisible()
    await card.getByText('О данных', { exact: true }).click()
    await expect(card).toContainText(natureLabel.persistent)
  }
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
  await expect(table.getByRole('columnheader')).toHaveText(['Resource', 'Scope', 'Текущий адрес / тип', 'Площадка', 'Ответственность'])
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
  await expect(tabs.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
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
  await tabs.getByRole('link', { name: /Deployments/ }).click()
  await page.getByRole('table').getByRole('link', { name: 'dep-ledger-1 →' }).click()
  await expect(page.getByRole('heading', { name: 'dep-ledger-1', exact: true })).toBeVisible()
  await page.goBack()
  await tabs.getByRole('link', { name: /History/ }).click()
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
  await expect(nav.getByRole('link')).toHaveCount(8)
  await expect(nav.getByRole('link', { name: 'Resources', exact: true })).toBeVisible()
  await page.getByRole('table').getByRole('link', { name: 'order-api-01', exact: true }).click()
  for (const name of ['Overview', 'Endpoints', 'Deployments', 'History']) {
    await page.getByRole('navigation', { name: 'Resource tabs' }).getByRole('link', { name: new RegExp(name) }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
    if (name !== 'Overview') {
      await expect(page.getByRole('table')).toBeVisible()
      await page.getByLabel('Поиск объектов').fill('no-such-object')
      await expect(page.getByText('Нет совпадений. Измените поисковый запрос.')).toBeVisible()
    }
  }
  await page.getByRole('link', { name: '← К списку Resources' }).click()
  await expect(page.getByRole('heading', { name: 'Resources', exact: true })).toBeVisible()
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(page.getByRole('separator', { name: 'Sidebar width' })).toHaveAttribute('aria-valuenow', '264')
  await page.getByRole('separator', { name: 'Sidebar width' }).press('ArrowRight')
  expect(await page.evaluate(() => [Object.entries(localStorage), Object.keys(sessionStorage), document.cookie])).toEqual([[['napms.prototype.sidebarWidth', '274']], [], ''])
})
