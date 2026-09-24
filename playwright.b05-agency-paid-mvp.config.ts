import { defineConfig, devices } from '@playwright/test';

/**
 * B05 runs only through an authority-wrapped disposable target. The backend
 * receives the exact Agency product selector and a private local mail capture
 * sink; the capture is deliberately under /tmp and never a committed artifact.
 */
const runtimeLog = '/tmp/property-listify-b05-agency-paid-mvp-browser-runtime.log';
const emailCapture = '/tmp/property-listify-b05-agency-paid-mvp-email-capture.jsonl';

export default defineConfig({
  testDir: './e2e/b05',
  outputDir: '/tmp/property-listify-b05-agency-paid-mvp-browser-results',
  // This is one deliberately joined paid/member/business journey. Keep the
  // timeout above the sum of its real browser and local-transport boundaries.
  timeout: 12 * 60_000,
  expect: { timeout: 25_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['html', { outputFolder: '/tmp/property-listify-b05-agency-paid-mvp-browser-report' }],
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
