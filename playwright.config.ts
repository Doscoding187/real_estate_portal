import { defineConfig, devices } from '@playwright/test';

/**
 * Visual Regression Testing Configuration
 * 
 * This configuration sets up Playwright for visual regression testing
 * of the Advertise With Us landing page across multiple viewports.
 */
export default defineConfig({
  testDir: './client/src/components/advertise/__tests__/visual',
  
  // Timeout for each test
  timeout: 30 * 1000,
  
  // Expect timeout for assertions
  expect: {
    timeout: 5000,
    // Visual comparison settings
    toHaveScreenshot: {
      // Maximum pixel difference threshold
      maxDiffPixels: 100,
      // Threshold for pixel color difference (0-1)
      threshold: 0.2,
      // Animations can cause flakiness, so we use a slightly higher threshold
      animations: 'disabled',
    },
  },
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers and viewports
  projects: [
    // Desktop viewports
    {
      name: 'Desktop Chrome',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'Desktop Firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'Desktop Safari',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1440, height: 900 },
      },
    },
    
    // Tablet viewports
    {
      name: 'Tablet iPad',
      use: { 
        ...devices['iPad Pro'],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'Tablet Landscape',
      use: { 
        ...devices['iPad Pro landscape'],
        viewport: { width: 1024, height: 768 },
      },
    },
    
    // Mobile viewports
    {
      name: 'Mobile iPhone',
      use: { 
        ...devices['iPhone 13'],
        viewport: { width: 375, height: 667 },
      },
    },
    {
      name: 'Mobile Pixel',
      use: { 
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
      },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'pnpm dev:frontend',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
