import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { objects, objectPath, visibleCollection } from '../src/prototype/data'

const contract = JSON.parse(readFileSync(new URL('../../docs/contracts/ux-0-semantic-boundaries.json', import.meta.url), 'utf8')) as {
  enforced: { statusDomains: Record<string, { label: string | null; values: string[] }>; catalogues: { policy: { allowedKinds: string[] } } }
}
const domains = contract.enforced.statusDomains

test('every displayed policy row is an actual PolicyRule with typed status', async ({ page }) => {
  await page.goto('/prototype/policy')
  const catalogue = page.getByRole('region', { name: 'Правила политики' })
  const rows = catalogue.locator('tbody tr')
  const expected = visibleCollection('policy')
  await expect(rows).toHaveCount(expected.length)
  const kinds = await rows.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-object-kind')))
  expect(kinds.every(kind => contract.enforced.catalogues.policy.allowedKinds.includes(kind ?? ''))).toBe(true)
  expect(await rows.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-object-id')))).toEqual(expected.map(o => o.id))
  for (const item of expected) {
    const row = catalogue.locator('tr[data-object-id="' + item.id + '"]')
    await expect(row.getByRole('status', { name: domains.PolicyRule.label! })).toContainText(item.state!)
  }
})

test('all mock requests have their own type and each DENIED has null rule provenance', async ({ page }) => {
  const requests = objects.filter(o => o.kind === 'AccessRequest')
  await page.goto('/prototype/requests')
  const catalogue = page.getByRole('region', { name: 'Заявки на доступ (MOCK)' })
  const rows = catalogue.locator('tbody tr')
  await expect(rows).toHaveCount(requests.length)
  expect(await rows.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-object-kind')))).toEqual(requests.map(() => 'AccessRequest'))
  for (const request of requests) {
    await page.goto(objectPath(request))
    const card = page.getByRole('region', { name: 'Карточка объекта' })
    await expect(card.getByRole('status', { name: domains.AccessRequest.label! })).toContainText(request.state!)
    await expect(card.getByRole('status', { name: domains.PolicyRule.label! })).toHaveCount(0)
    if (request.state === 'DENIED') {
      await expect(card.getByText('policyRuleId', { exact: true }).locator('..').locator('dd')).toHaveText('null')
      expect(request.links.every(l => objects.find(o => o.id === l.id)?.kind !== 'PolicyRule')).toBe(true)
    }
  }
  const first = requests[0]
  await page.goto('/prototype/policy/' + first.id)
  await expect(page).toHaveURL(new RegExp('/prototype/requests/' + first.id + '$'))
})

test('Application mode and immutable revision are never lifecycle states', async ({ page }) => {
  for (const kind of ['Application', 'InteractionRevision'] as const) {
    const item = objects.find(o => o.kind === kind)!
    await page.goto(objectPath(item))
    const card = page.getByRole('region', { name: 'Карточка объекта' })
    await expect(card.getByRole('status')).toHaveCount(0)
    if (kind === 'InteractionRevision') await expect(card).toContainText('Неизменяемость параметров')
  }
  await expect(page.locator('.ux-topbar')).toContainText('Simulation')
})

test('Reconciliation displays comparison outcome and never request decision status', async ({ page }) => {
  for (const item of objects.filter(o => o.kind === 'Reconciliation')) {
    await page.goto(objectPath(item))
    const card = page.getByRole('region', { name: 'Карточка объекта' })
    await expect(card.getByRole('status', { name: domains.Reconciliation.label! })).toContainText(item.state!)
    await expect(card.getByRole('status', { name: domains.AccessRequest.label! })).toHaveCount(0)
  }
})
