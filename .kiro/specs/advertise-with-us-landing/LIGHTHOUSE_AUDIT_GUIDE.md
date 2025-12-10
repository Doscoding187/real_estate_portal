# Lighthouse Audit Guide for Advertise With Us Landing Page

## Overview

This guide explains how to run Lighthouse audits and interpret the results for the Advertise With Us landing page. The property-based tests validate that the implementation patterns are in place, but actual Lighthouse audits should be run to verify real-world performance and accessibility scores.

## Running Lighthouse Audits

### Method 1: Chrome DevTools (Recommended)

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open Chrome and navigate to:
   ```
   http://localhost:3000/advertise
   ```

3. Open Chrome DevTools (F12 or Right-click > Inspect)

4. Click on the "Lighthouse" tab

5. Configure the audit:
   - Categories: Select "Performance" and "Accessibility"
   - Device: Test both "Mobile" and "Desktop"
   - Mode: "Navigation"

6. Click "Analyze page load"

7. Review the results:
   - **Performance score should be >= 90**
   - **Accessibility score should be >= 95**

### Method 2: Command Line

```bash
# Install Lighthouse globally (if not already installed)
npm install -g lighthouse

# Run audit and open results in browser
npx lighthouse http://localhost:3000/advertise --view

# Run audit with specific categories
npx lighthouse http://localhost:3000/advertise --only-categories=performance,accessibility --view

# Run audit for mobile
npx lighthouse http://localhost:3000/advertise --preset=mobile --view

# Run audit for desktop
npx lighthouse http://localhost:3000/advertise --preset=desktop --view
```

## Expected Scores

### Performance (Target: >= 90)

The page implements the following optimizations:

1. **Code Splitting**: Below-the-fold sections are lazy loaded
   - FeaturesGridSection
   - SocialProofSection
   - PricingPreviewSection
   - FinalCTASection
   - FAQSection

2. **Critical Content Priority**: Above-the-fold content loads immediately
   - HeroSection
   - PartnerSelectionSection
   - ValuePropositionSection
   - HowItWorksSection

3. **Loading States**: Skeleton loaders prevent layout shifts
   - HeroSectionSkeleton
   - PartnerSelectionSkeleton
   - ValuePropositionSkeleton
   - FeaturesGridSkeleton
   - SocialProofSkeleton
   - PricingPreviewSkeleton
   - FAQSectionSkeleton

4. **Error Boundaries**: Graceful degradation prevents performance issues
   - SectionErrorBoundary wraps each section
   - Error states with retry functionality

5. **SEO Optimization**: Resource hints and meta tags
   - SEOHead component
   - StructuredData component
   - PerformanceOptimizer component

### Accessibility (Target: >= 95)

The page implements the following accessibility features:

1. **Semantic HTML**:
   - `<main id="main-content">` for main content
   - `<section>` elements with proper ARIA labels
   - `<nav>` for navigation
   - `<footer>` for footer

2. **ARIA Labels**:
   - All sections have `aria-labelledby` attributes
   - Interactive elements have accessible names
   - Proper landmark roles

3. **Keyboard Navigation**:
   - SkipLinks component for quick navigation
   - All interactive elements are keyboard accessible
   - Focus indicators (advertise-focus-indicators.css)
   - useFocusManagement hook

4. **Heading Hierarchy**:
   - Single H1 per page (in hero section)
   - Proper H2/H3 structure for sections
   - No skipped heading levels

5. **Color Contrast**:
   - Design tokens use WCAG AA compliant colors
   - Text meets 4.5:1 contrast ratio
   - Large text meets 3:1 contrast ratio

6. **Images**:
   - All images have alt text
   - Decorative images have empty alt=""

7. **Reduced Motion**:
   - useReducedMotion hook
   - Respects prefers-reduced-motion
   - Fallback to instant transitions

## Common Issues and Fixes

### Performance Issues

#### Issue: Low First Contentful Paint (FCP)
**Fix**: Ensure critical CSS is inlined and above-the-fold content loads first
- Check that HeroSection is not lazy loaded
- Verify PerformanceOptimizer component is working
- Inline critical CSS in index.html

#### Issue: Large JavaScript Bundle
**Fix**: Verify code splitting is working
- Check that lazy() imports are used for below-the-fold sections
- Verify Suspense boundaries are in place
- Run `npm run build` and check bundle sizes

#### Issue: Layout Shifts (CLS)
**Fix**: Ensure skeleton loaders are properly sized
- Verify skeleton loaders match actual content dimensions
- Add explicit width/height to images
- Use CSS aspect-ratio for responsive images

#### Issue: Slow Time to Interactive (TTI)
**Fix**: Reduce JavaScript execution time
- Defer non-critical JavaScript
- Use React.lazy for heavy components
- Optimize animation performance

### Accessibility Issues

#### Issue: Missing ARIA Labels
**Fix**: Add aria-labelledby to sections
```tsx
<section id="partner-selection" aria-labelledby="partner-selection-heading">
  <h2 id="partner-selection-heading">Who Are You Advertising As?</h2>
  {/* content */}
</section>
```

#### Issue: Missing Alt Text
**Fix**: Add alt attributes to all images
```tsx
<img src={imageUrl} alt="Descriptive text" />
// Or for decorative images:
<img src={imageUrl} alt="" role="presentation" />
```

#### Issue: Poor Color Contrast
**Fix**: Use design tokens with sufficient contrast
```tsx
// Use design tokens from design-tokens.ts
import { softUITokens } from '@/components/advertise/design-tokens';

// Ensure text color has sufficient contrast with background
```

#### Issue: Missing Skip Links
**Fix**: Verify SkipLinks component is rendered
```tsx
<SkipLinks />
<main id="main-content">
  {/* content */}
</main>
```

#### Issue: Keyboard Navigation Problems
**Fix**: Ensure all interactive elements are keyboard accessible
- Remove negative tabindex unless intentional
- Add focus indicators
- Test with keyboard only (no mouse)

## Testing Checklist

Before considering the Lighthouse audit complete, verify:

- [ ] Performance score >= 90 on mobile
- [ ] Performance score >= 90 on desktop
- [ ] Accessibility score >= 95 on mobile
- [ ] Accessibility score >= 95 on desktop
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Cumulative Layout Shift < 0.1
- [ ] Time to Interactive < 3.5s
- [ ] All images have alt text
- [ ] All sections have ARIA labels
- [ ] Keyboard navigation works throughout
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA
- [ ] Heading hierarchy is correct
- [ ] Skip links are present and functional

## Property-Based Tests

The property-based tests in the test suite validate that the implementation patterns are in place:

### Performance Tests
- `LighthousePerformance.property.test.tsx`
  - Validates code splitting strategy
  - Validates semantic HTML structure
  - Validates resource optimization
  - Validates error handling
  - Validates loading states
  - Validates Suspense usage
  - Validates critical content priority

### Accessibility Tests
- `LighthouseAccessibility.property.test.tsx`
  - Validates ARIA labels
  - Validates semantic HTML
  - Validates skip links
  - Validates heading hierarchy
  - Validates keyboard navigation
  - Validates focus management
  - Validates alt text
  - Validates color contrast
  - Validates form labels
  - Validates interactive elements
  - Validates breadcrumb navigation
  - Validates reduced motion support

## Next Steps

1. Run Lighthouse audits using Chrome DevTools
2. Document actual scores in this file
3. If scores are below targets, use the "Common Issues and Fixes" section
4. Re-run audits after fixes
5. Update this document with final scores

## Actual Audit Results

### Performance Audit Results
- **Mobile Score**: _[To be filled after audit]_
- **Desktop Score**: _[To be filled after audit]_
- **FCP**: _[To be filled after audit]_
- **LCP**: _[To be filled after audit]_
- **CLS**: _[To be filled after audit]_
- **TTI**: _[To be filled after audit]_

### Accessibility Audit Results
- **Mobile Score**: _[To be filled after audit]_
- **Desktop Score**: _[To be filled after audit]_
- **Issues Found**: _[To be filled after audit]_
- **Issues Fixed**: _[To be filled after audit]_

## Conclusion

The Advertise With Us landing page has been designed and implemented with performance and accessibility as top priorities. The property-based tests validate that all the necessary patterns are in place. Running actual Lighthouse audits will provide real-world validation of these scores.

**Status**: ✅ Property-based tests passing. Ready for manual Lighthouse audit.
