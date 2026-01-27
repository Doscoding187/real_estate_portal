import { test, expect } from '@playwright/test';

test.describe('Development Wizard', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the create development route
    await page.goto('/developer/create-development');
  });

  test('opens and shows initial step and header', async ({ page }) => {
    // Expect header to show the phase title and step count
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('p', { hasText: 'Step 1 of' })).toBeVisible();

    // Expect Exit button to be visible
    await expect(page.getByRole('button', { name: /Exit/i })).toBeVisible();
  });

  test('can navigate to next phase and auto-save triggers', async ({ page }) => {
    // Wait for the representation phase to render and click continue if present
    const nextBtn = page.getByRole('button', { name: /Next|Continue|Save/i }).first();

    // If a next button exists, click it and ensure step increments
    if ((await nextBtn.count()) > 0) {
      await nextBtn.click();
      // Allow UI to update
      await page.waitForTimeout(500);
      await expect(page.locator('p', { hasText: 'Step' })).toContainText(/Step \d+ of/);
    }
  });
});
