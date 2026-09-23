import { defineConfig, devices } from '@playwright/test';

/**
 * Local-only acceptance from owner acquisition through the invited member to CRM.
 *
 * The reviewer fixture is prepared through its canonical database adapter.
 * The spec supplies and releases an explicitly marked disposable agency term
 * after proving pre-payment invitation containment. Its API process receives
 * the existing governed fixture marker only after Database Authority wrapping;
 * this does not enable normal commercial activation, initiate payment, or
 * follow a hosted URL.
 */
const runtimeLog = '/tmp/property-listify-mvp-ple-agency-browser-runtime.log';
const emailCapture = '/tmp/property-listify-b05-ple-agency-browser-email-capture.jsonl';

export default defineConfig({
  testDir: './e2e/ple',
  outputDir: '/tmp/property-listify-mvp-ple-agency-browser-results',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['html', { outputFolder: '/tmp/property-listify-mvp-ple-agency-browser-report' }],
    ['list'],
  ],
  use: {
    // Keep this proof on the owned local runtime even if a caller supplies
    // another base URL through its shell environment.
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
        PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_PRODUCT_KEYS: 'agency_launch_access',
        PROPERTY_LISTIFY_GOVERNED_B05_EMAIL_CAPTURE_PATH: emailCapture,
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
