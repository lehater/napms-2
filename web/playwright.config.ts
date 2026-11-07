import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1, retries: 0,
  reporter: 'list', timeout: 30_000,
  // Never record credentials, including failures.
  use: { baseURL: 'http://127.0.0.1:5173', browserName: 'chromium', trace: 'off', screenshot: 'off', video: 'off' },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: false },
})
