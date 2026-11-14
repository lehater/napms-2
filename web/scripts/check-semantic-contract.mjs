import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { navigation } from '../src/navigation.ts'

const contract = JSON.parse(readFileSync(new URL('../../docs/contracts/ux-0-semantic-boundaries.json', import.meta.url), 'utf8'))
const issues = []
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
if (contract.schemaVersion !== 3 || contract.runtime?.sourceOfTruth !== 'FastAPI/SQLite')
  issues.push('Missing runtime FastAPI/SQLite source-of-truth contract')
if (!same(navigation, contract.realNavigation?.entries))
  issues.push('Working navigation differs from accepted API-backed collections')
if (navigation.length !== 6 || navigation.filter(x => x.group === 'Каталоги').map(x => x.path).join(',') !== '/resources,/applications,/deployments')
  issues.push('Expected six REAL navigation entries with Resources first')

function scan(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory)
    if (entry.isDirectory()) {
      if (entry.name === 'prototype') issues.push('Synthetic prototype source remains in runtime')
      else scan(path)
    } else if (/\.tsx?$/.test(entry.name)) {
      const content = readFileSync(path, 'utf8')
      if (/from\s*['"][^'"]*prototype\//.test(content) || /import\s*\([^)]*prototype\//.test(content))
        issues.push('Runtime imports a prototype: ' + path.pathname)
      if (entry.name === 'main.tsx' && /\/prototype\b/.test(content))
        issues.push('Production router exposes prototype URL')
    }
  }
}
scan(new URL('../src/', import.meta.url))
for (const path of ['../e2e/mock-journey.spec.ts','../e2e/prototype.spec.ts','../e2e/semantic-contract.spec.ts'])
  if (existsSync(new URL(path, import.meta.url))) issues.push('Obsolete mock suite remains: ' + path)

if (issues.length) {
  for (const item of issues) console.error('SEMANTIC_CONTRACT_VIOLATION: ' + item)
  process.exitCode = 1
} else {
  console.log('SEMANTIC_CONTRACT_PASS: API-backed navigation, no runtime prototype/mock fixtures')
}
