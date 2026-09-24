import { defineConfig, devices } from '@playwright/test';

const runtimeLog = '/tmp/property-listify-b04-independent-agent-paid-mvp-browser-runtime.log';
const emailCapture = '/tmp/property-listify-b04-independent-agent-paid-mvp-email-capture.jsonl';

export default defineConfig({
  testDir: './e2e/b04',
  outputDir: '/tmp/property-listify-b04-independent-agent-paid-mvp-browser-results',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['html', { outputFolder: '/tmp/property-listify-b04-independent-agent-paid-mvp-browser-report' }],
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
