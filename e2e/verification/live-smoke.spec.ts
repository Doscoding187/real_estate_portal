import { test, expect } from '@playwright/test';

// Use BASE_URL from environment or default to live
const BASE_URL = process.env.BASE_URL || 'https://www.propertylistifysa.co.za';

test.describe('Live Site Smoke Tests', () => {

  // Test 1: Verify Backend Fix (City with no ID -> Text Fallback)
  // Durban previously returned 0 results due to missing cityId
  test('Backend Fix: ?city=durban returns results', async ({ page }) => {
    // Go to the search results page directly with the query that was failing
    await page.goto(`${BASE_URL}/property-for-sale?city=durban`);
    
    // Check we arrive at the right page
    // Note: URL might normalize to lowercase
    expect(page.url()).toContain('city=durban');

    // ASSERT: We should see results, not the "No matching properties found" state
    await expect(page.getByText('No matching properties found')).not.toBeVisible();
    
    // ASSERT: We should see at least one property card
    await expect(page.locator('text=Showing').first()).toBeVisible();
  });

  // Test 2: Double check Suburb fallback
  // Umhlanga (suburb) was also failing
  test('Backend Fix: ?suburb=umhlanga returns results', async ({ page }) => {
      await page.goto(`${BASE_URL}/property-for-sale?suburb=umhlanga`);
      await expect(page.getByText('No matching properties found')).not.toBeVisible();
  });

});
