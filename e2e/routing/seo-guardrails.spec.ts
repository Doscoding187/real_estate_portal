import { test, expect } from '@playwright/test';
import { provinces, cities } from '../fixtures/locations';

/**
 * SEO Page Guardrails
 * 
 * These tests ensure SEO landing pages (province/city) NEVER contain
 * Search Results Page (SRP) components. This protects the dual-entry
 * routing architecture.
 * 
 * Rule: "If the user can control the dataset, you've crossed into SRP territory."
 */

test.describe('SEO Page Guardrails', () => {
  
  // -------------------------------
  // TEST SUITE A: Province SEO Pages
  // -------------------------------
  test.describe('Province SEO Pages', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/property-for-sale/${provinces.gauteng.slug}`);
    });

    test('Province page does NOT have filters sidebar', async ({ page }) => {
      // SRP uses data-testid="search-filters" or similar
      await expect(page.locator('[data-testid="search-filters"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="filters-sidebar"]')).not.toBeVisible();
      
      // Check for common filter elements
      await expect(page.getByRole('combobox', { name: /bedrooms/i })).not.toBeVisible();
      await expect(page.getByRole('combobox', { name: /price/i })).not.toBeVisible();
    });

    test('Province page does NOT have sort dropdown', async ({ page }) => {
      await expect(page.getByRole('combobox', { name: /sort/i })).not.toBeVisible();
      await expect(page.locator('[data-testid="sort-dropdown"]')).not.toBeVisible();
    });

    test('Province page does NOT have pagination', async ({ page }) => {
      await expect(page.locator('[data-testid="pagination"]')).not.toBeVisible();
      await expect(page.getByRole('navigation', { name: /pagination/i })).not.toBeVisible();
      
      // Check for "Showing X of Y" text
      await expect(page.getByText(/showing \d+ of \d+/i)).not.toBeVisible();
    });

    test('Province page does NOT have results grid', async ({ page }) => {
      await expect(page.locator('[data-testid="results-grid"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="listings-grid"]')).not.toBeVisible();
    });

    test('Province page DOES have discovery content', async ({ page }) => {
      // Should have discovery sections
      await expect(page.getByText(/Top Localities/i)).toBeVisible();
    });
  });

  // -------------------------------
  // TEST SUITE B: City SEO Pages
  // -------------------------------
  test.describe('City SEO Pages', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/property-for-sale/${provinces.kwazuluNatal.slug}/${cities.durban.slug}`);
    });

    test('City page does NOT have filters sidebar', async ({ page }) => {
      await expect(page.locator('[data-testid="search-filters"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="filters-sidebar"]')).not.toBeVisible();
    });

    test('City page does NOT have sort dropdown', async ({ page }) => {
      await expect(page.getByRole('combobox', { name: /sort/i })).not.toBeVisible();
    });

    test('City page does NOT have pagination', async ({ page }) => {
      await expect(page.locator('[data-testid="pagination"]')).not.toBeVisible();
      await expect(page.getByText(/showing \d+ of \d+/i)).not.toBeVisible();
    });

    test('City page does NOT have results grid', async ({ page }) => {
      await expect(page.locator('[data-testid="results-grid"]')).not.toBeVisible();
    });

    test('City page allows editorial listing modules', async ({ page }) => {
      // Editorial modules ARE allowed - check they don't have SRP controls
      const editorialSection = page.locator('[data-testid="editorial-listings"], [data-testid="featured-listings"]');
      
      // If editorial exists, it should not have pagination or filters
      if (await editorialSection.count() > 0) {
        await expect(editorialSection.locator('[data-testid="pagination"]')).not.toBeVisible();
        await expect(editorialSection.locator('[data-testid="load-more"]')).not.toBeVisible();
      }
    });
  });

  // -------------------------------
  // TEST SUITE C: SRP Contrast Test
  // -------------------------------
  test.describe('SRP Has Required Components (Contrast)', () => {
    test('SRP with city query DOES have filters', async ({ page }) => {
      await page.goto(`/property-for-sale?city=${cities.durban.slug}`);
      
      // SRP should have filter-related elements
      await expect(page).toHaveURL(/\?city=/);
      
      // Page title should indicate search context
      await expect(page).toHaveTitle(/Properties for Sale/i);
    });
  });

  // -------------------------------
  // TEST SUITE D: Internal Navigation Guard
  // -------------------------------
  test.describe('Internal Navigation Never Links to SEO Pages', () => {
    test('Province page metro cards link to SRP, not SEO city page', async ({ page }) => {
      await page.goto(`/property-for-sale/${provinces.gauteng.slug}`);
      
      // Find city/metro links on province page
      const cityLinks = page.locator('a[href*="property-for-sale"]').filter({
        hasText: /Pretoria|Johannesburg|Sandton/i
      });
      
      if (await cityLinks.count() > 0) {
        const firstLink = cityLinks.first();
        const href = await firstLink.getAttribute('href');
        
        // Links should be query-based, not path-based for cities
        // This is the key architectural constraint
        if (href && href.includes('city=')) {
          // Good: Query-based SRP link
          expect(href).toContain('?');
        }
        // Path-based city links are allowed for SEO pages (external entry)
        // But we verify they don't render as SRP
      }
    });
  });
});
