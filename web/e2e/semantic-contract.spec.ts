import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const contract = JSON.parse(readFileSync(new URL('../../docs/contracts/ux-0-semantic-boundaries.json', import.meta.url), 'utf8')) as {
  catalogues: { policy: { allowedKinds: string[] } }
  statusDomains: Record<string, { label: string | null; values: string[] }>
}

test('semantic contract: policy catalogue exposes only declared rules', async ({ page }) => {
  await page.goto('/prototype/policy')
  const rules = page.getByRole('region', { name: 'Правила политики' })
  await expect(rules.locator('tbody tr')).toHaveCount(1)
  await expect(rules.getByRole('link', { name: 'P1 · Order → Ledger', exact: true })).toBeVisible()
  await expect(rules.locator('tbody tr td:nth-child(2)')).toContainText(contract.catalogues.policy.allowedKinds[0])
  await expect(rules.getByRole('link', { name: /Q1|Q2/ })).toHaveCount(0)
  await expect(rules.getByRole('status', { name: contract.statusDomains.PolicyRule.label! })).toContainText('Active')
})

test('semantic contract: request outcomes are separate and retain provenance links', async ({ page }) => {
  await page.goto('/prototype')
  const requests = page.getByRole('region', { name: 'Заявки на доступ (MOCK)' })
  await expect(requests.locator('tbody tr')).toHaveCount(2)
  await requests.getByRole('link', { name: 'Q1 · разрешённая заявка' }).click()
  let card = page.getByRole('region', { name: 'Карточка объекта' })
  await expect(card.getByRole('status', { name: contract.statusDomains.AccessRequest.label! })).toContainText('ALLOWED')
  await expect(card.getByRole('status', { name: contract.statusDomains.PolicyRule.label! })).toHaveCount(0)
  await page.goto('/prototype/policy/mock-request-denied') // legacy bookmark
  await expect(page).toHaveURL(/\/prototype\/requests\/mock-request-denied$/)
  card = page.getByRole('region', { name: 'Карточка объекта' })
  await expect(card.getByRole('status', { name: contract.statusDomains.AccessRequest.label! })).toContainText('DENIED')
  await expect(card).toContainText('policyRuleId')
  await expect(page.getByRole('region', { name: 'Связанные объекты' }).getByRole('link', { name: /P1/ })).toHaveCount(0)
})

test('semantic contract: UI mode and revision invariant are not lifecycle states', async ({ page }) => {
  await page.goto('/prototype/applications/mock-application')
  let card = page.getByRole('region', { name: 'Карточка объекта' })
  await expect(card.getByRole('status')).toHaveCount(0)
  await expect(card).toContainText('Read-only — режим исследовательского UI')
  await page.goto('/prototype/applications/mock-revision')
  card = page.getByRole('region', { name: 'Карточка объекта' })
  await expect(card.getByRole('status')).toHaveCount(0)
  await expect(card).toContainText('Immutable — инвариант параметров revision')
})

test('semantic contract: reconciliation outcome has its own semantic category', async ({ page }) => {
  await page.goto('/prototype/comparison/mock-uncomparable')
  const card = page.getByRole('region', { name: 'Карточка объекта' })
  await expect(card.getByRole('status', { name: contract.statusDomains.Reconciliation.label! })).toContainText('Uncomparable')
  await expect(card.getByRole('status', { name: contract.statusDomains.AccessRequest.label! })).toHaveCount(0)
})
