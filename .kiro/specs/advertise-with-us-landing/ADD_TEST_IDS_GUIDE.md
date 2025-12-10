# Adding data-testid Attributes Guide

## Overview

To make visual regression tests more reliable, we need to add `data-testid` attributes to key components. This guide shows which components need test IDs and what values to use.

## Why data-testid?

- **Reliability**: Test IDs don't change when CSS classes or structure changes
- **Clarity**: Makes it obvious which elements are tested
- **Maintainability**: Easy to find and update test selectors

## Components Requiring Test IDs

### 1. HeroSection.tsx

```tsx
<section data-testid="hero-section" className="...">
  {/* Hero content */}
  <button data-testid="primary-cta" className="...">
    Get Started
  </button>
  <button data-testid="secondary-cta" className="...">
    Learn More
  </button>
</section>
```

### 2. BillboardBanner.tsx

```tsx
<div data-testid="billboard-banner" className="...">
  {/* Billboard content */}
</div>
```

### 3. PartnerSelectionSection.tsx

```tsx
<section data-testid="partner-selection-section" className="...">
  {/* Partner cards */}
</section>
```

### 4. PartnerTypeCard.tsx

```tsx
<div data-testid="partner-type-card" className="...">
  {/* Card content */}
</div>
```

### 5. ValuePropositionSection.tsx

```tsx
<section data-testid="value-proposition-section" className="...">
  {/* Feature blocks */}
</section>
```

### 6. FeatureBlock.tsx

```tsx
<div data-testid="feature-block" className="...">
  {/* Block content */}
</div>
```

### 7. HowItWorksSection.tsx

```tsx
<section data-testid="how-it-works-section" className="...">
  {/* Process steps */}
</section>
```

### 8. ProcessStep.tsx

```tsx
<div data-testid="process-step" className="...">
  {/* Step content */}
</div>
```

### 9. FeaturesGridSection.tsx

```tsx
<section data-testid="features-grid-section" className="...">
  {/* Feature tiles */}
</section>
```

### 10. FeatureTile.tsx

```tsx
<div data-testid="feature-tile" className="...">
  {/* Tile content */}
</div>
```

### 11. SocialProofSection.tsx

```tsx
<section data-testid="social-proof-section" className="...">
  {/* Metrics and logos */}
</section>
```

### 12. MetricCard.tsx

```tsx
<div data-testid="metric-card" className="...">
  {/* Metric content */}
</div>
```

### 13. PricingPreviewSection.tsx

```tsx
<section data-testid="pricing-preview-section" className="...">
  {/* Pricing cards */}
</section>
```

### 14. PricingCard.tsx

```tsx
<div data-testid="pricing-card" className="...">
  {/* Card content */}
</div>
```

### 15. FinalCTASection.tsx

```tsx
<section data-testid="final-cta-section" className="...">
  {/* CTA content */}
</section>
```

### 16. FAQSection.tsx

```tsx
<section data-testid="faq-section" className="...">
  {/* FAQ items */}
</section>
```

### 17. FAQAccordionItem.tsx

```tsx
<div data-testid="faq-accordion-item" className="...">
  {/* Accordion content */}
</div>
```

### 18. MobileStickyCTA.tsx

```tsx
<div data-testid="mobile-sticky-cta" className="...">
  {/* Sticky CTA content */}
</div>
```

### 19. SkeletonLoaders.tsx

```tsx
<div data-testid="skeleton-loader" className="...">
  {/* Skeleton content */}
</div>
```

### 20. ErrorStates.tsx

```tsx
<div data-testid="error-message" className="...">
  {/* Error message */}
</div>

<div data-testid="retry-button" className="...">
  Retry
</div>

<div data-testid="fallback-content" className="...">
  {/* Fallback content */}
</div>
```

### 21. AdvertiseErrorBoundary.tsx

```tsx
<div data-testid="error-boundary" className="...">
  {/* Error boundary UI */}
</div>
```

## Implementation Steps

1. **Open each component file**
2. **Add data-testid to the root element**
3. **Add data-testid to interactive elements** (buttons, links, cards)
4. **Test the changes** by running visual tests
5. **Commit the changes**

## Example Implementation

### Before
```tsx
export function HeroSection() {
  return (
    <section className="hero-section">
      <h1>Advertise With Us</h1>
      <button className="primary-cta">Get Started</button>
    </section>
  );
}
```

### After
```tsx
export function HeroSection() {
  return (
    <section data-testid="hero-section" className="hero-section">
      <h1>Advertise With Us</h1>
      <button data-testid="primary-cta" className="primary-cta">
        Get Started
      </button>
    </section>
  );
}
```

## Testing After Adding IDs

```bash
# Run visual tests to verify
pnpm test:visual

# If tests fail due to missing elements, check:
# 1. Test ID spelling matches exactly
# 2. Element is rendered (not conditional)
# 3. Element is visible (not hidden)
```

## Alternative: Use Existing Selectors

If adding test IDs is not feasible immediately, tests can use alternative selectors:

```typescript
// Instead of data-testid
const heroSection = page.locator('[data-testid="hero-section"]');

// Use class or role
const heroSection = page.locator('.hero-section').first();
const heroSection = page.locator('section[role="banner"]').first();

// Use text content
const primaryCTA = page.getByRole('button', { name: 'Get Started' });
```

## Best Practices

1. **Use kebab-case** for test IDs: `hero-section`, not `heroSection`
2. **Be descriptive**: `primary-cta` not just `button`
3. **Be consistent**: Use same naming pattern across components
4. **Don't overuse**: Only add to elements that are tested
5. **Document**: Keep this guide updated as components change

## Status

- [ ] HeroSection.tsx
- [ ] BillboardBanner.tsx
- [ ] PartnerSelectionSection.tsx
- [ ] PartnerTypeCard.tsx
- [ ] ValuePropositionSection.tsx
- [ ] FeatureBlock.tsx
- [ ] HowItWorksSection.tsx
- [ ] ProcessStep.tsx
- [ ] FeaturesGridSection.tsx
- [ ] FeatureTile.tsx
- [ ] SocialProofSection.tsx
- [ ] MetricCard.tsx
- [ ] PricingPreviewSection.tsx
- [ ] PricingCard.tsx
- [ ] FinalCTASection.tsx
- [ ] FAQSection.tsx
- [ ] FAQAccordionItem.tsx
- [ ] MobileStickyCTA.tsx
- [ ] SkeletonLoaders.tsx
- [ ] ErrorStates.tsx
- [ ] AdvertiseErrorBoundary.tsx

## Note

The visual regression tests are currently written to use data-testid selectors. If these attributes are not added, the tests will need to be updated to use alternative selectors (class names, roles, or text content). However, data-testid is the recommended approach for test stability.
