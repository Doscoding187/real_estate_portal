import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false, quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env.playwright.local'), override: true, quiet: true });

if (process.env.LISTIFY_E2E_DATABASE_URL) process.env.DATABASE_URL = process.env.LISTIFY_E2E_DATABASE_URL;

if (!process.env.LOCAL_DEMO_AGENCY_PASSWORD) {
  throw new Error('LOCAL_DEMO_AGENCY_PASSWORD is missing. Add it to the ignored .env.playwright.local file.');
}

/** Keeps focused acceptance output out of tracked Playwright report directories. */
export default defineConfig({
  testDir: './e2e/agency',
  testMatch: 'listing-performance.spec.ts',
  outputDir: '/tmp/property-listify-listing-performance-playwright',
  timeout: 120 * 1000,
  expect: { timeout: 12 * 1000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3009',
    trace: 'off', screenshot: 'off', video: 'off',
  },
  projects: [{ name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: [
    { command: 'DOTENV_CONFIG_QUIET=true pnpm dev:backend', url: 'http://localhost:5000/api/health', reuseExistingServer: false, timeout: 120 * 1000, stdout: 'ignore', stderr: 'ignore' },
    { command: 'DOTENV_CONFIG_QUIET=true pnpm dev:frontend', url: 'http://localhost:3009', reuseExistingServer: false, timeout: 120 * 1000, stdout: 'ignore', stderr: 'ignore' },
  ],
});
