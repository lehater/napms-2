import { readFileSync } from 'node:fs'
import { objects, objectPath, visibleCollection, statusCaptions } from '../src/prototype/data.ts'

const contract = JSON.parse(readFileSync(new URL('../../docs/contracts/ux-0-semantic-boundaries.json', import.meta.url), 'utf8'))

function validate(items, policyRows) {
  const errors = []
  if (contract.schemaVersion !== 1) errors.push('unsupported semantic contract schemaVersion')
  for (const [kind, domain] of Object.entries(contract.statusDomains)) {
    const matches = items.filter(item => item.kind === kind)
    if (matches.length === 0) errors.push(`no fixture object for contracted kind ${kind}`)
    if (domain.label !== null && statusCaptions[kind] !== domain.label) {
      errors.push(`${kind}: UI caption ${JSON.stringify(statusCaptions[kind])} differs from contract ${JSON.stringify(domain.label)}`)
    }
    for (const item of matches) {
      if (domain.values.length === 0 && item.state !== undefined) {
        errors.push(`${item.id} (${kind}): ${JSON.stringify(item.state)} is a UI mode/invariant, not a status`)
      } else if (domain.values.length > 0 && !domain.values.includes(item.state)) {
        errors.push(`${item.id} (${kind}): invalid state ${JSON.stringify(item.state)}; expected ${domain.values.join(', ')}`)
      }
    }
  }
  for (const [kind, prefix] of Object.entries(contract.routes)) {
    for (const item of items.filter(obj => obj.kind === kind)) {
      const actual = objectPath(item)
      if (!actual.startsWith(prefix)) errors.push(`${item.id} (${kind}): route ${actual} must start with ${prefix}`)
    }
  }
  const allowedPolicyKinds = contract.catalogues.policy.allowedKinds
  if (policyRows.length === 0) errors.push('policy catalogue is empty')
  for (const item of policyRows) {
    if (!allowedPolicyKinds.includes(item.kind)) {
      errors.push(`policy catalogue contains ${item.id} (${item.kind}); only ${allowedPolicyKinds.join(', ')} allowed`)
    }
  }
  const rejected = items.find(item => item.id === 'mock-request-denied')
  if (!rejected || rejected.kind !== 'AccessRequest' || rejected.state !== 'DENIED'
      || rejected.links.some(link => items.find(item => item.id === link.id)?.kind === 'PolicyRule')) {
    errors.push('DENIED request must remain distinct from policy rules and must not create a rule')
  }
  return errors
}

const policy = visibleCollection('policy')
const errors = validate(objects, policy)
const allowed = objects.find(object => object.kind === 'AccessRequest')
if (!allowed) errors.push('fixture must contain one AccessRequest for negative regression probes')
else {
  if (validate([...objects.filter(o => o.id !== allowed.id), { ...allowed, state: 'Active' }], policy).length === 0) {
    errors.push('mutation sentinel did not detect request incorrectly assigned PolicyRule status')
  }
  if (validate(objects, [...policy, allowed]).length === 0) {
    errors.push('mutation sentinel did not detect AccessRequest leaking into policy catalogue')
  }
}

if (errors.length) {
  for (const error of errors) console.error(`SEMANTIC_CONTRACT_VIOLATION: ${error}`)
  process.exitCode = 1
} else {
  console.log(`SEMANTIC_CONTRACT_PASS: ${Object.keys(contract.statusDomains).length} status domains, policy catalogue, denial provenance, two mutation sentinels`)
}
