import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests for Advertise With Us Landing Page
 * 
 * These tests capture screenshots of the entire page and individual sections
 * across different viewports to detect unintended visual changes.
 * 
 * Requirements: 10.2, 10.3, 10.4
 */

test.describe('Advertise With Us - Full Page Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the advertise page
    await page.goto('/advertise');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Wait for any animations to complete
    await page.waitForTimeout(1000);
  });

  test('should match full page screenshot - desktop', async ({ page }) => {
    // Capture full page screenshot
    await expect(page).toHaveScreenshot('advertise-full-page-desktop.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match full page screenshot - tablet', async ({ page }) => {
    // This test will run on tablet viewports defined in playwright.config.ts
    await expect(page).toHaveScreenshot('advertise-full-page-tablet.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match full page screenshot - mobile', async ({ page }) => {
    // This test will run on mobile viewports defined in playwright.config.ts
    await expect(page).toHaveScreenshot('advertise-full-page-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Advertise With Us - Hero Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/advertise');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test('should match hero section screenshot', async ({ page }) => {
    const heroSection = page.locator('[data-testid="hero-section"]').first();
    
    // Wait for hero section to be visible
    await heroSection.waitFor({ state: 'visible' });
    
    // Capture screenshot of hero section
    await expect(heroSection).toHaveScreenshot('hero-section.png', {
      animations: 'disabled',
    });
  });

  test('should match hero section with billboard banner', async ({ page }) => {
    const billboard = page.locator('[data-testid="billboard-banner"]').first();
    
    if (await billboard.isVisible()) {
      await expect(billboard).toHaveScreenshot('billboard-banner.png', {
        animations: 'disabled',
      });
    }
  });
});

test.describe('Advertise With Us - Partner Selection Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/advertise');
    await page.waitForLoadState('networkidle');
    
    // Scroll to partner selection section
    const partnerSection = page.locator('[data-testid="partner-selection-section"]').first();
    await partnerSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  });

  test('should match partner selection section', async ({ page }) => {
    const partnerSection = page.locator('[data-testid="partner-selection-section"]').first();
    
    await expect(partnerSection).toHaveScreenshot('partner-selection-section.png', {
      animations: 'disabled',
    });
  });

  test('should match individual partner cards', async ({ page }) => {
    const partnerCards = page.locator('[data-testid="partner-type-card"]');
    const count = await partnerCards.count();
    
    // Capture first partner card as representative
    if (count > 0) {
      await expect(partnerCards.first()).toHaveScreenshot('partner-card-sample.png', {
        animations: 'disabled',
      });
    }
  });
});

test.describe('Advertise With Us - Value Proposition Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/advertise');
    await page.waitForLoadState('networkidle');
    
    const valueSection = page.locator('[data-testid="value-proposition-section"]').first();
    await valueSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  });

  test('should match value proposition section', async ({ page }) => {
    const valueSection = page.locator('[data-testid="value-proposition-section"]').first();
    
    await expect(valueSection).toHaveScreenshot('value-proposition-section.png', {
      animations: 'disabled',
    });
  });
});

test.describe('Advertise With Us - How It Works Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/advertise');
    await page.waitForLoadState('networkidle');
    
    const howItWorksSection = page.locator('[data-testid="how-it-works-section"]').first();
    await howItWorksSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  });

  test('should match how it works section', async ({ page }) => {
    const howItWorksSection = page.locator('[data-testid="how-it-works-section"]').first();
    
    await expect(howItWorksSection).toHaveScreenshot('how-it-works-section.png', {
      animations: 'disabled',
    });
  });
});

test.describe('Advertise With Us - Features Grid Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/advertise');
    await page.waitForLoadState('networkidle');
    
    const featuresSection = page.locator('[data-testid="features-grid-section"]').first();
    await featuresSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  });

  test('should match features grid section', async ({ page }) => {
    const featuresSection = page.locator('[data-testid="features-grid-section"]').first();
    
    await expect(featuresSection).toHaveScreenshot('features-grid-section.png', {
      animations: 'disabled',
    });
  });
});

test.describe('Advertise With Us - Social Proof Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/advertise');
    await page.waitForLoadState('networkidle');
    
    const socialProofSection = page.locator('[data-testid="social-proof-section"]').first();
    await socialProofSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  });

  test('should match social proof section', async ({ page }) => {
    const socialProofSection = page.locator('[data-testid="social-proof-section"]').first();
    
    await expect(socialProofSection).toHaveScreenshot('social-proof-section.png', {
      animations: 'disabled',
    });
  });
});

test.describe('Advertise With Us - Pricing Preview Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/advertise');
    await page.waitForLoadState('networkidle');
    
    const pricingSection = page.locator('[data-testid="pricing-preview-section"]').first();
    await pricingSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  });

  test('should match pricing preview section', async ({ page }) => {
    const pricingSection = page.locator('[data-testid="pricing-preview-section"]').first();
    
    await expect(pricingSection).toHaveScreenshot('pricing-preview-section.png', {
      animations: 'disabled',
    });
  });
});

test.describe('Advertise With Us - Final CTA Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/advertise');
    await page.waitForLoadState('networkidle');
    
    const finalCTASection = page.locator('[data-testid="final-cta-section"]').first();
    await finalCTASection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  });

  test('should match final CTA section', async ({ page }) => {
    const finalCTASection = page.locator('[data-testid="final-cta-section"]').first();
    
    await expect(finalCTASection).toHaveScreenshot('final-cta-section.png', {
      animations: 'disabled',
    });
  });
});

test.describe('Advertise With Us - FAQ Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/advertise');
    await page.waitForLoadState('networkidle');
    
    const faqSection = page.locator('[data-testid="faq-section"]').first();
    await faqSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  });

  test('should match FAQ section - collapsed state', async ({ page }) => {
    const faqSection = page.locator('[data-testid="faq-section"]').first();
    
    await expect(faqSection).toHaveScreenshot('faq-section-collapsed.png', {
      animations: 'disabled',
    });
  });

  test('should match FAQ section - expanded state', async ({ page }) => {
    // Expand first FAQ item
    const firstFAQ = page.locator('[data-testid="faq-accordion-item"]').first();
    await firstFAQ.click();
    await page.waitForTimeout(500);
    
    const faqSection = page.locator('[data-testid="faq-section"]').first();
    
    await expect(faqSection).toHaveScreenshot('faq-section-expanded.png', {
      animations: 'disabled',
    });
  });
});
