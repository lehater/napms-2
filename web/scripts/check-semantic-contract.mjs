import { readFileSync, existsSync } from 'node:fs'
import { objects, objectPath, visibleCollection, stateDefinitions, dataNature, sections } from '../src/prototype/data.ts'

import { navigation } from '../src/navigation.ts'

const contract = JSON.parse(readFileSync(new URL('../../docs/contracts/ux-0-semantic-boundaries.json', import.meta.url), 'utf8'))
const enforced = contract.enforced
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const issue = (errors, message) => errors.push(message)

function validate(items, policyRows) {
  const errors = []
  if (contract.schemaVersion !== 2 || !enforced || !contract.documentationOnly)
    issue(errors, 'Contract schema v2 with enforced/documentationOnly is required')
  const definitions = enforced?.statusDomains ?? {}
  const kinds = Object.keys(dataNature)
  for (const kind of kinds) {
    const domain = definitions[kind]
    const actual = stateDefinitions[kind]
    if (!domain || !actual) {
      issue(errors, kind + ': missing mandatory status-domain decision (including no-status)')
      continue
    }
    if (!same(domain, actual)) issue(errors, kind + ': status definition differs from normative contract')
    if (domain.values.length && !domain.label) issue(errors, kind + ': status values require a semantic label')
    if (!domain.values.length && domain.label !== null) issue(errors, kind + ': a no-status kind must have null label')
    for (const item of items.filter(obj => obj.kind === kind)) {
      if (domain.values.length === 0 && item.state !== undefined)
        issue(errors, item.id + ' (' + kind + '): no-status kind has ' + JSON.stringify(item.state))
      if (domain.values.length > 0 && !domain.values.includes(item.state))
        issue(errors, item.id + ' (' + kind + '): unexpected value ' + JSON.stringify(item.state))
    }
  }
  for (const kind of Object.keys(definitions)) if (!kinds.includes(kind))
    issue(errors, kind + ': unknown kind in statusDomains')
  for (const item of items) if (!kinds.includes(item.kind))
    issue(errors, item.id + ': kind missing from dataNature and status contract')
  for (const [kind, prefix] of Object.entries(enforced?.routes ?? {}))
    for (const item of items.filter(obj => obj.kind === kind)) {
      const path = objectPath(item)
      if (!path.startsWith(prefix)) issue(errors, item.id + ': wrong canonical route ' + path)
    }
  const allowed = enforced?.catalogues?.policy?.allowedKinds ?? []
  if (policyRows.length === 0) issue(errors, 'empty declared policy catalogue')
  for (const row of policyRows)
    if (!allowed.includes(row.kind)) issue(errors, 'policy catalogue contains ' + row.id + ' (' + row.kind + ')')
  for (const request of items.filter(obj => obj.kind === 'AccessRequest' && obj.state === 'DENIED')) {
    if (enforced.deniedRequest.mustHaveExplicitNullPolicyRuleId && request.fields.policyRuleId !== 'null')
      issue(errors, request.id + ': DENIED must expose explicit null policyRuleId')
    if (enforced.deniedRequest.mustHaveNoPolicyRuleLink && request.links.some(l => items.some(t => t.id === l.id && t.kind === 'PolicyRule')))
      issue(errors, request.id + ': DENIED must not produce PolicyRule')
  }
  const expectedSections = enforced?.coverage?.topLevelSectionIds
  if (!same(sections.map(s => s.id), expectedSections))
    issue(errors, 'top-level section coverage changed: update contract, browser tests and review')
  for (const path of enforced?.coverage?.browserSuites ?? [])
    if (!existsSync(new URL('../../' + path, import.meta.url))) issue(errors, 'missing browser suite: ' + path)
  return errors
}

const errors = validate(objects, visibleCollection('policy'))
if (!same(navigation, contract.realNavigation?.entries)) errors.push('REAL main navigation differs from its accepted REAL collection contract')
// Validator sentinels: these check detection branches, not an actual UI render mutation.
const request = objects.find(o => o.kind === 'AccessRequest')
if (!request) errors.push('missing AccessRequest fixture')
else {
  if (!validate(objects.map(o => o.id === request.id ? { ...o, state: 'Active' } : o), visibleCollection('policy')).length)
    errors.push('validator sentinel missed incorrect request status')
  if (!validate(objects, [...visibleCollection('policy'), request]).length)
    errors.push('validator sentinel missed request leaking into policy catalogue')
}
if (errors.length) {
  for (const err of errors) console.error('SEMANTIC_CONTRACT_VIOLATION: ' + err)
  process.exitCode = 1
} else {
  console.log('SEMANTIC_CONTRACT_PASS: ' + Object.keys(enforced.statusDomains).length +
    ' kinds, ' + sections.length + ' research sections, 3 REAL collections, routes, denied provenance, 2 validator sentinels')
}
