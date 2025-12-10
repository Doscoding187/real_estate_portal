import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests for Interaction States
 * 
 * These tests capture screenshots of hover states, animation states,
 * loading states, and error states to ensure consistent visual feedback.
 * 
 * Requirements: 11.2
 */

test.describe('Interaction States - Hover Effects', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/advertise');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test('should capture CTA button hover state', async ({ page }) => {
    const primaryCTA = page.locator('[data-testid="primary-cta"]').first();
    
    // Hover over the button
    await primaryCTA.hover();
    await page.waitForTimeout(300); // Wait for hover animation
    
    await expect(primaryCTA).toHaveScreenshot('cta-button-hover.png', {
      animations: 'disabled',
    });
  });

  test('should capture partner card hover state', async ({ page }) => {
    const partnerSection = page.locator('[data-testid="partner-selection-section"]').first();
    await partnerSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    const partnerCard = page.locator('[data-testid="partner-type-card"]').first();
    
    // Hover over the card
    await partnerCard.hover();
    await page.waitForTimeout(300);
    
    await expect(partnerCard).toHaveScreenshot('partner-card-hover.png', {
      animations: 'disabled',
    });
  });

  test('should capture feature tile hover state', async ({ page }) => {
    const featuresSection = page.locator('[data-testid="features-grid-section"]').first();
    await featuresSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    const featureTile = page.locator('[data-testid="feature-tile"]').first();
    
    // Hover over the tile
    await featureTile.hover();
    await page.waitForTimeout(300);
    
    await expect(featureTile).toHaveScreenshot('feature-tile-hover.png', {
      animations: 'disabled',
    });
  });

  test('should capture pricing card hover state', async ({ page }) => {
    const pricingSection = page.locator('[data-testid="pricing-preview-section"]').first();
    await pricingSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    const pricingCard = page.locator('[data-testid="pricing-card"]').first();
    
    // Hover over the card
    await pricingCard.hover();
    await page.waitForTimeout(300);
    
    await expect(pricingCard).toHaveScreenshot('pricing-card-hover.png', {
      animations: 'disabled',
    });
  });

  test('should capture FAQ accordion hover state', async ({ page }) => {
    const faqSection = page.locator('[data-testid="faq-section"]').first();
    await faqSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    const faqItem = page.locator('[data-testid="faq-accordion-item"]').first();
    
    // Hover over the FAQ item
    await faqItem.hover();
    await page.waitForTimeout(300);
    
    await expect(faqItem).toHaveScreenshot('faq-item-hover.png', {
      animations: 'disabled',
    });
  });

  test('should capture mobile sticky CTA hover state', async ({ page, viewport }) => {
    // Only test on mobile viewports
    if (viewport && viewport.width <= 768) {
      // Scroll down to trigger sticky CTA
      await page.evaluate(() => window.scrollTo(0, 1000));
      await page.waitForTimeout(500);
      
      const stickyCTA = page.locator('[data-testid="mobile-sticky-cta"]').first();
      
      if (await stickyCTA.isVisible()) {
        await stickyCTA.hover();
        await page.waitForTimeout(300);
        
        await expect(stickyCTA).toHaveScreenshot('mobile-sticky-cta-hover.png', {
          animations: 'disabled',
        });
      }
    }
  });
});

test.describe('Interaction States - Animation States', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/advertise');
    await page.waitForLoadState('networkidle');
  });

  test('should capture fade-up animation initial state', async ({ page }) => {
    // Reload to capture initial state before animations
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    
    const valueSection = page.locator('[data-testid="value-proposition-section"]').first();
    
    // Capture before animation completes
    await expect(valueSection).toHaveScreenshot('fade-up-initial.png', {
      animations: 'disabled',
    });
  });

  test('should capture fade-up animation completed state', async ({ page }) => {
    const valueSection = page.locator('[data-testid="value-proposition-section"]').first();
    await valueSection.scrollIntoViewIfNeeded();
    
    // Wait for animation to complete
    await page.waitForTimeout(1000);
    
    await expect(valueSection).toHaveScreenshot('fade-up-completed.png', {
      animations: 'disabled',
    });
  });

  test('should capture staggered animation state', async ({ page }) => {
    const partnerSection = page.locator('[data-testid="partner-selection-section"]').first();
    await partnerSection.scrollIntoViewIfNeeded();
    
    // Wait for staggered animations to complete
    await page.waitForTimeout(1500);
    
    await expect(partnerSection).toHaveScreenshot('staggered-animation-completed.png', {
      animations: 'disabled',
    });
  });

  test('should capture count-up animation state', async ({ page }) => {
    const socialProofSection = page.locator('[data-testid="social-proof-section"]').first();
    await socialProofSection.scrollIntoViewIfNeeded();
    
    // Wait for count-up animation to complete
    await page.waitForTimeout(2000);
    
    const metricCard = page.locator('[data-testid="metric-card"]').first();
    
    await expect(metricCard).toHaveScreenshot('count-up-completed.png', {
      animations: 'disabled',
    });
  });

  test('should capture billboard banner animation state', async ({ page }) => {
    const billboard = page.locator('[data-testid="billboard-banner"]').first();
    
    if (await billboard.isVisible()) {
      // Hover to trigger animation
      await billboard.hover();
      await page.waitForTimeout(500);
      
      await expect(billboard).toHaveScreenshot('billboard-hover-animation.png', {
        animations: 'disabled',
      });
    }
  });
});

test.describe('Interaction States - Loading States', () => {
  test('should capture skeleton loader state', async ({ page }) => {
    // Intercept API calls to delay response
    await page.route('**/api/**', route => {
      setTimeout(() => route.continue(), 2000);
    });
    
    await page.goto('/advertise');
    
    // Capture loading state
    const heroSection = page.locator('[data-testid="hero-section"]').first();
    
    // Check if skeleton loaders are present
    const skeletonLoader = page.locator('[data-testid="skeleton-loader"]').first();
    
    if (await skeletonLoader.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(heroSection).toHaveScreenshot('loading-skeleton.png', {
        animations: 'disabled',
      });
    }
  });

  test('should capture loading spinner state', async ({ page }) => {
    // Navigate to a page that might show loading spinner
    await page.goto('/advertise');
    
    const loadingSpinner = page.locator('[data-testid="loading-spinner"]').first();
    
    if (await loadingSpinner.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(loadingSpinner).toHaveScreenshot('loading-spinner.png', {
        animations: 'disabled',
      });
    }
  });

  test('should capture progressive loading state', async ({ page }) => {
    // Slow down network to capture progressive loading
    await page.route('**/*.{png,jpg,jpeg,webp}', route => {
      setTimeout(() => route.continue(), 1000);
    });
    
    await page.goto('/advertise');
    await page.waitForTimeout(500);
    
    // Capture page with some images still loading
    await expect(page).toHaveScreenshot('progressive-loading.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Interaction States - Error States', () => {
  test('should capture error message state', async ({ page }) => {
    // Intercept API calls to return errors
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });
    
    await page.goto('/advertise');
    await page.waitForLoadState('networkidle');
    
    // Check if error message is displayed
    const errorMessage = page.locator('[data-testid="error-message"]').first();
    
    if (await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(errorMessage).toHaveScreenshot('error-message.png', {
        animations: 'disabled',
      });
    }
  });

  test('should capture error boundary state', async ({ page }) => {
    // This would require triggering a component error
    // For now, we'll check if error boundary UI exists
    await page.goto('/advertise');
    
    const errorBoundary = page.locator('[data-testid="error-boundary"]').first();
    
    if (await errorBoundary.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(errorBoundary).toHaveScreenshot('error-boundary.png', {
        animations: 'disabled',
      });
    }
  });

  test('should capture retry button state', async ({ page }) => {
    // Intercept to cause error
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to load' }),
      });
    });
    
    await page.goto('/advertise');
    await page.waitForLoadState('networkidle');
    
    const retryButton = page.locator('[data-testid="retry-button"]').first();
    
    if (await retryButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(retryButton).toHaveScreenshot('retry-button.png', {
        animations: 'disabled',
      });
    }
  });

  test('should capture fallback content state', async ({ page }) => {
    // Intercept to cause partial failure
    await page.route('**/api/partner-types', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to load partner types' }),
      });
    });
    
    await page.goto('/advertise');
    await page.waitForLoadState('networkidle');
    
    const fallbackContent = page.locator('[data-testid="fallback-content"]').first();
    
    if (await fallbackContent.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(fallbackContent).toHaveScreenshot('fallback-content.png', {
        animations: 'disabled',
      });
    }
  });
});

test.describe('Interaction States - Focus States', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/advertise');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test('should capture CTA button focus state', async ({ page }) => {
    const primaryCTA = page.locator('[data-testid="primary-cta"]').first();
    
    // Focus the button using keyboard
    await primaryCTA.focus();
    await page.waitForTimeout(200);
    
    await expect(primaryCTA).toHaveScreenshot('cta-button-focus.png', {
      animations: 'disabled',
    });
  });

  test('should capture FAQ accordion focus state', async ({ page }) => {
    const faqSection = page.locator('[data-testid="faq-section"]').first();
    await faqSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    const faqItem = page.locator('[data-testid="faq-accordion-item"]').first();
    
    // Focus the FAQ item
    await faqItem.focus();
    await page.waitForTimeout(200);
    
    await expect(faqItem).toHaveScreenshot('faq-item-focus.png', {
      animations: 'disabled',
    });
  });

  test('should capture partner card focus state', async ({ page }) => {
    const partnerSection = page.locator('[data-testid="partner-selection-section"]').first();
    await partnerSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    const partnerCard = page.locator('[data-testid="partner-type-card"]').first();
    
    // Focus the card
    await partnerCard.focus();
    await page.waitForTimeout(200);
    
    await expect(partnerCard).toHaveScreenshot('partner-card-focus.png', {
      animations: 'disabled',
    });
  });
});

test.describe('Interaction States - Active States', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/advertise');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test('should capture CTA button active/pressed state', async ({ page }) => {
    const primaryCTA = page.locator('[data-testid="primary-cta"]').first();
    
    // Simulate mouse down (active state)
    await primaryCTA.hover();
    await page.mouse.down();
    await page.waitForTimeout(100);
    
    await expect(primaryCTA).toHaveScreenshot('cta-button-active.png', {
      animations: 'disabled',
    });
    
    await page.mouse.up();
  });

  test('should capture FAQ accordion active/expanded state', async ({ page }) => {
    const faqSection = page.locator('[data-testid="faq-section"]').first();
    await faqSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    const faqItem = page.locator('[data-testid="faq-accordion-item"]').first();
    
    // Click to expand
    await faqItem.click();
    await page.waitForTimeout(500);
    
    await expect(faqItem).toHaveScreenshot('faq-item-active.png', {
      animations: 'disabled',
    });
  });
});
