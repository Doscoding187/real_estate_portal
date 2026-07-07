import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false });

if (!process.env.LOCAL_DEMO_AGENCY_PASSWORD) {
  throw new Error('LOCAL_DEMO_AGENCY_PASSWORD is required for agency browser smoke.');
}

export default defineConfig({
  testDir: './e2e/agency',
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report-agency' }], ['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3009',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: [
    {
      command: 'pnpm dev:backend',
      url: 'http://localhost:5000/api/health',
      reuseExistingServer: true,
      timeout: 120 * 1000,
    },
    {
      command: 'pnpm dev:frontend',
      url: 'http://localhost:3009',
      reuseExistingServer: true,
      timeout: 120 * 1000,
    },
  ],
});
