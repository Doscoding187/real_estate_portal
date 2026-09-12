import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/consumer-activity',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report-consumer-activity' }], ['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3009',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: [
    {
      command: 'cross-env NODE_ENV=development APP_ENV=development pnpm dev:backend',
      url: 'http://localhost:5000/api/health',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'cross-env NODE_ENV=development APP_ENV=development pnpm dev:frontend',
      url: 'http://localhost:3009',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
