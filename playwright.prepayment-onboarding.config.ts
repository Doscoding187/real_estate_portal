import { defineConfig, devices } from '@playwright/test';

/**
 * This proof deliberately uses the exact task-owned runtime rather than the
 * legacy browser configurations, several of which name a separate local
 * database. The API runtime keeps real account/session logic and writes its
 * development-only verification link to a private local log. The frontend is
 * served separately so the browser follows the same cross-origin API path a
 * local stakeholder would use.
 */
const runtimeLog = '/tmp/property-listify-mvp-prepayment-browser-runtime.log';

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
      // The file contains temporary verification tokens. umask 077 and the
      // redirected server output keep it local-only; it is neither printed by
      // the test nor tracked by Git.
      command: `sh -c 'umask 077; : > ${runtimeLog}; exec pnpm exec tsx scripts/mvp-local-runtime.mts >> ${runtimeLog} 2>&1'`,
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
