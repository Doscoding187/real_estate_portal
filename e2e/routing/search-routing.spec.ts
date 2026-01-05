import { test, expect } from '@playwright/test';
import { provinces, cities, suburbs } from '../fixtures/locations';
import { searchAndSubmit, expectPathOnly, expectQueryParam } from '../helpers/search.helpers';

test.describe('Search Routing Architecture', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // -------------------------------
  // TEST SUITE A: Province Routing
  // -------------------------------
  test.describe('Province Routing (Hard-Block Rule)', () => {
    test('Province via search bar routes to SEO page', async ({ page }) => {
      await searchAndSubmit(page, provinces.kwazuluNatal.name);

      await expectPathOnly(
        page,
        `/property-for-sale/${provinces.kwazuluNatal.slug}`
      );
      
      // Explicitly wait for SEO content to confirm successful routing
      await expect(page.getByRole('heading', { level: 1 })).toContainText(new RegExp(provinces.kwazuluNatal.name, 'i'));
      await expect(page.url()).not.toContain('?city=');
    });

    test('Province abbreviation routes correctly (KZN)', async ({ page }) => {
      await searchAndSubmit(page, provinces.kwazuluNatal.abbreviations![0]);

      await expectPathOnly(
        page,
        `/property-for-sale/${provinces.kwazuluNatal.slug}`
      );
      
      // Explicitly wait for SEO content
      await expect(page.getByRole('heading', { level: 1 })).toContainText(new RegExp(provinces.kwazuluNatal.name, 'i'));
    });

    test('Province quick link navigates to SEO page', async ({ page }) => {
      await page.goto('/property-for-sale');

      await page.getByRole('link', { name: provinces.westernCape.name }).click();

      await expectPathOnly(
        page,
        `/property-for-sale/${provinces.westernCape.slug}`
      );
    });

    test('Direct province URL loads SEO discovery page', async ({ page }) => {
      await page.goto(`/property-for-sale/${provinces.gauteng.slug}`);

      await expect(page).toHaveTitle(/Property for Sale in Gauteng/i);
      await expect(page.locator('text=Top Localities')).toBeVisible();
    });
  });

  // -------------------------------
  // TEST SUITE B: City Routing
  // -------------------------------
  test.describe('City Routing', () => {
    test('City via search bar routes to query-based SRP', async ({ page }) => {
      await searchAndSubmit(page, cities.durban.name);

      await expect(page).toHaveURL(/property-for-sale\?/);
      await expectQueryParam(page, 'city', cities.durban.slug);
    });

    test('City dropdown selection routes to SRP', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/search/i);

      await searchInput.click();
      await searchInput.fill(cities.capeTown.name);

      // Wait for dropdown to appear and click first result
      await page.waitForTimeout(500);
      await page.getByText(cities.capeTown.name).first().click();

      await expectQueryParam(page, 'city', cities.capeTown.slug);
    });

    test('Direct city query param loads SRP', async ({ page }) => {
      await page.goto(`/property-for-sale?city=${cities.alberton.slug}`);

      await expect(page).toHaveTitle(/Properties for Sale/i);
    });
  });

  // -------------------------------
  // TEST SUITE C: Suburb Routing
  // -------------------------------
  test.describe('Suburb Routing', () => {
    test('Suburb via search bar routes to suburb SRP', async ({ page }) => {
      await searchAndSubmit(page, suburbs.umhlanga.name);

      await expectQueryParam(page, 'suburb', suburbs.umhlanga.slug);
    });

    test('Suburb dropdown selection routes correctly', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/search/i);

      await searchInput.click();
      await searchInput.fill(suburbs.sandton.name);

      // Wait for dropdown to appear and click first result
      await page.waitForTimeout(500);
      await page.getByText(suburbs.sandton.name).first().click();

      await expectQueryParam(page, 'suburb', suburbs.sandton.slug);
    });
  });

  // -------------------------------
  // TEST SUITE D: Enter Key Parity
  // -------------------------------
  test.describe('Enter Key Parity', () => {
    test('Enter key and click produce identical routing', async ({ page }) => {
      // Enter key
      await searchAndSubmit(page, cities.durban.name);
      const enterUrl = page.url();

      await page.goto('/');

      // Click selection
      const searchInput = page.getByPlaceholder(/search/i);
      await searchInput.fill(cities.durban.name);
      await page.waitForTimeout(500);
      await page.getByText(cities.durban.name).first().click();

      const clickUrl = page.url();

      expect(enterUrl).toBe(clickUrl);
    });

    test('Enter without selection still applies province detection', async ({ page }) => {
      await searchAndSubmit(page, provinces.westernCape.name);

      await expectPathOnly(
        page,
        `/property-for-sale/${provinces.westernCape.slug}`
      );
    });
  });
});
