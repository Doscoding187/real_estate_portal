import { defineConfig, devices } from '@playwright/test';

/**
 * B06 runs through a fresh authority-wrapped local runtime and a disposable
 * worktree database. Its only enabled commercial selector is the exact
 * Developer Launch Access product; the normal release remains
 * preparation-only and Agency/Agent products remain unavailable here.
 */
const runtimeLog = '/tmp/property-listify-b06-developer-paid-mvp-browser-runtime.log';
const emailCapture = '/tmp/property-listify-b06-developer-paid-mvp-email-capture.jsonl';

export default defineConfig({
  testDir: './e2e/b06',
  outputDir: '/tmp/property-listify-b06-developer-paid-mvp-browser-results',
  // One deliberately joined Developer commercial, publication and enquiry
  // journey crosses several real session boundaries.
  timeout: 14 * 60_000,
  expect: { timeout: 25_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['html', { outputFolder: '/tmp/property-listify-b06-developer-paid-mvp-browser-report' }],
    ['list'],
  ],
  use: {
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
      command: `sh -c 'umask 077; : > ${runtimeLog}; : > ${emailCapture}; chmod 600 ${emailCapture}; exec pnpm exec tsx scripts/mvp-local-runtime.mts >> ${runtimeLog} 2>&1'`,
      env: {
        PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_FIXTURE: 'true',
        PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_PRODUCT_KEYS: 'developer_launch_access',
        PROPERTY_LISTIFY_GOVERNED_B06_EMAIL_CAPTURE_PATH: emailCapture,
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
