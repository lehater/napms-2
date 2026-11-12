import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e-harness', workers: 1, retries: 0, fullyParallel: false, timeout: 45_000,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5173', browserName: 'chromium', trace: 'off', screenshot: 'off', video: 'off' },
})
