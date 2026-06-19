import { test, expect } from '@playwright/test';

test.describe('Listing Wizard V2 Smoke Test', () => {
  test('V1: /listings/create loads the existing listing wizard', async ({ page }) => {
    await page.goto('/listings/create');

    // If unauthenticated, the app may redirect to login.
    if (page.url().includes('/login')) {
      console.log('Redirected to login. V1 wizard route exists — skipping deep assertions.');
      return;
    }

    await expect(page.getByText('Create New Listing').first()).toBeVisible({ timeout: 10000 });

    // V2 Shell badge must NOT be present on the V1 route
    await expect(page.getByText('V2 Shell')).not.toBeVisible();
  });

  test('V2 route guard (flag off): /listings/create-v2 redirects when VITE_LISTING_WIZARD_V2_ENABLED !== "true"', async ({ page }) => {
    test.skip(
      process.env.VITE_LISTING_WIZARD_V2_ENABLED === 'true',
      'Flag is ON — this test only applies when the flag is OFF.',
    );

    await page.goto('/listings/create-v2');
    await page.waitForURL('**/listings/create', { timeout: 5000 });

    // V2 Shell badge must not be visible after redirect
    await expect(page.getByText('V2 Shell')).not.toBeVisible();
  });

  test('V2 route guard (flag on): /listings/create-v2 renders V2 shell when VITE_LISTING_WIZARD_V2_ENABLED === "true"', async ({ page }) => {
    test.skip(
      process.env.VITE_LISTING_WIZARD_V2_ENABLED !== 'true',
      'Flag is OFF — this test only applies when the flag is ON. Set VITE_LISTING_WIZARD_V2_ENABLED=true before starting the dev server.',
    );

    await page.goto('/listings/create-v2');

    // V2 shell badge must be visible
    const v2Badge = page.getByText('V2 Shell');
    await expect(v2Badge).toBeVisible({ timeout: 10000 });

    // The V2 engine should render the workflow-driven header
    const heading = page.locator('h1, h2, h3').filter({ hasText: /Listing Action|Create New Listing/ }).first();
    await expect(heading).toBeVisible();
  });
});
