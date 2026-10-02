import { defineConfig, devices } from '@playwright/test';

/**
 * This proof deliberately uses the exact task-owned runtime rather than the
 * legacy browser configurations, several of which name a separate local
 * database. The API runtime keeps real account/session logic and writes its
 * development-only verification link to a governed private capture. The frontend is
 * served separately so the browser follows the same cross-origin API path a
 * local stakeholder would use.
 */
const runtimeLog = '/tmp/property-listify-mvp-prepayment-browser-runtime.log';
const emailCapture = '/tmp/property-listify-b04-prepayment-browser-email-capture.jsonl';

export default defineConfig({
  testDir: './e2e/prepayment',
  outputDir: '/tmp/property-listify-mvp-prepayment-browser-results',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['html', { outputFolder: '/tmp/property-listify-mvp-prepayment-browser-report' }],
    ['list'],
  ],
  use: {
    // Hard-code the local browser origin. This acceptance proof must never
    // silently follow BASE_URL to a hosted environment.
    baseURL: 'http://localhost:5177',
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
      // Temporary token material is written only to the governed mode-0600
      // capture file; routine server output contains no verification URL.
      command: `sh -c 'umask 077; : > ${runtimeLog}; : > ${emailCapture}; chmod 600 ${emailCapture}; exec pnpm exec tsx scripts/mvp-local-runtime.mts >> ${runtimeLog} 2>&1'`,
      env: {
        PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_FIXTURE: 'true',
        PROPERTY_LISTIFY_GOVERNED_B04_EMAIL_CAPTURE_PATH: emailCapture,
      },
      url: 'http://localhost:5000/api/health',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        'cross-env VITE_API_URL=http://localhost:5000 VITE_DEPLOY_ENV=development pnpm exec vite --host localhost --port 5177 --strictPort',
      url: 'http://localhost:5177',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
