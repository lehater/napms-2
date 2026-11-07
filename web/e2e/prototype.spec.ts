import { test, expect } from '@playwright/test'
import { byId, dataNature, natureLabel, objects, objectPath, sections } from '../src/prototype/data'

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
  expect(byId.get('mock-revision')!.state).toBe('Immutable')
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
    await expect(page.getByRole('region', { name: 'Карточка объекта' })).toContainText(natureLabel[dataNature[object.kind]])
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
  const chain = ['mock-resource-order', 'mock-deployment-order', 'mock-interaction-ledger', 'mock-need', 'mock-request-allowed', 'mock-rule', 'mock-required', 'mock-configured', 'mock-evidence-set-f2', 'mock-evidence-entry-f2', 'mock-configured', 'mock-drift']
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
