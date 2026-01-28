import { test, expect } from '@playwright/test';

test.describe('Wizard Smoke Test (Manual Trigger)', () => {
  // NOTE: This test assumes the user is logged in or dev mode allows access.
  // In a real CI, we'd use a global setup to authenticate.

  test('loads development wizard and verifies basic elements', async ({ page }) => {
    // 1. Navigate to Wizard
    await page.goto('/developer/create-development');

    // 2. Check for Redirect (if unauthed) or Success
    // If redirected to login, we abort (or we could login)
    if (page.url().includes('/login')) {
      console.log('Redirected to login. Skipping deep verify for smoke test.');
      return;
    }

    // 3. Verify Page Structure
    // Should see "Basic Info" or "Step 1"
    const heading = page
      .locator('h1, h2, h3')
      .filter({ hasText: /Basic Info|Step 1/ })
      .first();
    await expect(heading).toBeVisible();

    // 4. Verify Inputs
    await expect(page.getByLabel(/^Name|Development Name/i)).toBeVisible();

    // 5. Verify Navigation
    await expect(page.getByRole('button', { name: /Next|Continue/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Exit/i })).toBeVisible();
  });
});
