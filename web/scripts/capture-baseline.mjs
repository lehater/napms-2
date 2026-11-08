// Reproduce Issue #34 evidence against a running local mock UI. Never opens REAL API.
import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../../', import.meta.url))
const output = resolve(root, 'docs/research/ui-baseline-v0.2/evidence')
await mkdir(output, { recursive: true })
const browser = await chromium.launch()
const captures = []
const collections = ['processes', 'needs', 'resources', 'applications', 'deployments', 'requests', 'policy']
const details = ['needs/mock-process', 'needs/mock-need', 'resources/mock-resource-order', 'applications/mock-application', 'deployments/mock-deployment-order', 'requests/mock-request-allowed', 'policy/mock-rule']
const extra = ['resources/mock-resource-order?tab=endpoints', 'applications/mock-application?tab=components', 'applications/mock-interaction-ledger?tab=revisions', 'requests/mock-request-allowed?tab=decision', 'policy/mock-rule?tab=authorization']
try {
  for (const [width, height] of [[1440, 900], [1920, 1080], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } })
    for (const path of [...collections, ...details, ...extra]) {
      await page.goto('http://127.0.0.1:5174/prototype/' + path)
      await page.evaluate(() => document.fonts.ready)
      const file = `${width}-${path.replaceAll('/', '-').replace('?tab=', '-')}.png`
      const geometry = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, sidebar: document.querySelector('.ux-sidebar').getBoundingClientRect().width, tables: [...document.querySelectorAll('table')].map(table => ({ width: table.getBoundingClientRect().width, container: table.parentElement.clientWidth })) }))
      if (geometry.document > width) throw new Error('Page overflow: ' + path)
      await page.screenshot({ path: resolve(output, file), fullPage: true })
      captures.push({ path, width, height, file, geometry })
    }
    await page.goto(new URL('docs/research/ui-baseline-v0.1/reference.html', 'file://' + root).href)
    await page.screenshot({ path: resolve(output, `${width}-reference.png`), fullPage: true })
    await page.close()
  }
  await writeFile(resolve(output, 'geometry.json'), JSON.stringify(captures, null, 2) + '\n')
  console.log(`${captures.length} implementation screenshots + 3 reference screenshots; no document overflow`)
} finally { await browser.close() }
