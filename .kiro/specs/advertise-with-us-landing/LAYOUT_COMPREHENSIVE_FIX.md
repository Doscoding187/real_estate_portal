# Advertise With Us - Comprehensive Layout Fix

## Issue Summary
Multiple alignment, spacing, and heading issues identified on the deployed Advertise With Us page that need systematic correction.

## Problems Identified

### 1. General Alignment Issues
- Sections not centered - shifted left
- Missing or inconsistent `max-w-*` wrapper usage
- Items stretching full width instead of following grid constraints

### 2. Heading Size & Consistency Issues
- Inconsistent heading sizes across sections
- Misaligned headings
- Missing spacing above/below headings
- Not following design token standards

### 3. Section Spacing Problems
- Huge empty space in some sections
- Sections collapsing into each other
- Icons overlapping with text
- Inconsistent vertical rhythm

### 4. Grid Layout Breaking
- Grids collapsing to 1-column unexpectedly
- Incorrect responsive breakpoints

### 5. Hero Section Specific Issues
- Headline alignment off
- Image/card overlapping or overflowing
- CTAs not aligning vertically
- Background orbs overlay incorrectly

### 6. Typography Inconsistencies
- Wrong font weights
- Inconsistent line heights
- Mis-sized icons and labels

### 7. Responsive CSS Issues
- Spacing incorrect on mobile (especially headings)
- CTAs not stacking properly
- Images not scaling correctly
- Overflow-x issues

## Solution: Standardized Wrapper Pattern

### Standard Section Wrapper
Every section MUST use this exact wrapper structure:

```tsx
<section className="py-20 md:py-28">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    {/* Section content */}
  </div>
</section>
```

### Standard Heading Hierarchy
```tsx
// H1 - Hero only
<h1 className="text-4xl md:text-5xl font-bold">

// H2 - Section headings
<h2 className="text-3xl md:text-4xl font-semibold mb-4">

// H3 - Subsection headings  
<h3 className="text-2xl font-semibold mb-3">
```

### Standard Section Spacing
```tsx
// Section padding
className="pt-20 pb-20 md:pt-28 md:pb-28"

// Block gap (between heading and content)
className="mt-10 md:mt-16"

// Content gap (between content blocks)
className="mt-6 md:mt-8"
```

## Files Requiring Updates

### Priority 1 - Core Sections
1. `client/src/components/advertise/HeroSection.tsx`
2. `client/src/components/advertise/PartnerSelectionSection.tsx`
3. `client/src/components/advertise/ValuePropositionSection.tsx`
4. `client/src/components/advertise/HowItWorksSection.tsx`

### Priority 2 - Feature Sections
5. `client/src/components/advertise/FeaturesGridSection.tsx`
6. `client/src/components/advertise/PricingPreviewSection.tsx`
7. `client/src/components/advertise/FAQSection.tsx`
8. `client/src/components/advertise/FinalCTASection.tsx`

### Priority 3 - Supporting Files
9. `client/src/styles/advertise-responsive.css`
10. `client/src/components/advertise/design-tokens.ts`

## Specific Fixes Per Section

### HeroSection.tsx
- [ ] Fix container: Add `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- [ ] Fix headline alignment: Ensure proper text-center lg:text-left
- [ ] Fix grid gap: Use consistent `gap-8 lg:gap-12`
- [ ] Fix CTA alignment: Ensure proper flex direction and spacing
- [ ] Fix background orbs: Ensure proper z-index and positioning

### PartnerSelectionSection.tsx
- [ ] Replace inline max-width with `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- [ ] Fix heading: Use `text-3xl md:text-4xl font-semibold`
- [ ] Fix grid: Use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8`
- [ ] Remove inline styles, use Tailwind classes

### ValuePropositionSection.tsx
- [ ] Replace inline max-width with standard wrapper
- [ ] Fix heading size and spacing
- [ ] Fix grid: Use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10`
- [ ] Ensure consistent spacing between blocks

### HowItWorksSection.tsx
- [ ] Add standard wrapper
- [ ] Fix steps container: `flex flex-col md:flex-row items-center justify-between gap-10`
- [ ] Fix heading hierarchy
- [ ] Ensure proper spacing around CTA

### FeaturesGridSection.tsx
- [ ] Add standard wrapper
- [ ] Fix grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10`
- [ ] Fix heading spacing
- [ ] Remove conflicting inline styles

### PricingPreviewSection.tsx
- [ ] Add standard wrapper
- [ ] Fix grid layout
- [ ] Fix CTA button spacing
- [ ] Ensure cards have consistent height

### FAQSection.tsx
- [ ] Replace `max-w-4xl` with `max-w-7xl` for consistency
- [ ] Fix heading sizes
- [ ] Ensure proper accordion spacing
- [ ] Fix mobile padding

### FinalCTASection.tsx
- [ ] Add standard wrapper (can use `max-w-4xl` for this section as it's intentionally narrower)
- [ ] Fix heading size
- [ ] Ensure CTA buttons stack properly on mobile

## Responsive CSS Updates

### advertise-responsive.css
Add/update these rules:

```css
/* Standard section wrapper */
.advertise-section-wrapper {
  max-width: 1280px; /* max-w-7xl */
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem; /* px-4 */
  padding-right: 1rem;
}

@media (min-width: 640px) {
  .advertise-section-wrapper {
    padding-left: 1.5rem; /* sm:px-6 */
    padding-right: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .advertise-section-wrapper {
    padding-left: 2rem; /* lg:px-8 */
    padding-right: 2rem;
  }
}

/* Standard section spacing */
.advertise-section {
  padding-top: 5rem; /* pt-20 */
  padding-bottom: 5rem; /* pb-20 */
}

@media (min-width: 768px) {
  .advertise-section {
    padding-top: 7rem; /* md:pt-28 */
    padding-bottom: 7rem; /* md:pb-28 */
  }
}

/* Fix grid layouts */
.partner-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 640px) {
  .partner-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .partner-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.features-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2.5rem;
}

@media (min-width: 640px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

## Implementation Checklist

### Phase 1: Core Structure (Priority 1)
- [ ] Update HeroSection with standard wrapper
- [ ] Update PartnerSelectionSection with standard wrapper
- [ ] Update ValuePropositionSection with standard wrapper
- [ ] Update HowItWorksSection with standard wrapper

### Phase 2: Feature Sections (Priority 2)
- [ ] Update FeaturesGridSection with standard wrapper
- [ ] Update PricingPreviewSection with standard wrapper
- [ ] Update FAQSection with standard wrapper
- [ ] Update FinalCTASection with standard wrapper

### Phase 3: Responsive CSS (Priority 3)
- [ ] Update advertise-responsive.css with standard classes
- [ ] Remove conflicting inline styles
- [ ] Test all breakpoints (mobile, tablet, desktop)

### Phase 4: Verification
- [ ] Visual regression test on mobile (375px, 414px)
- [ ] Visual regression test on tablet (768px, 1024px)
- [ ] Visual regression test on desktop (1280px, 1920px)
- [ ] Check heading hierarchy with accessibility tools
- [ ] Verify no horizontal overflow on any breakpoint

## Design Token Reference

Use these consistently across all sections:

```typescript
// Spacing
sectionPadding: "py-20 md:py-28"
containerPadding: "px-4 sm:px-6 lg:px-8"
blockGap: "mt-10 md:mt-16"
contentGap: "mt-6 md:mt-8"

// Typography
h1: "text-4xl md:text-5xl font-bold"
h2: "text-3xl md:text-4xl font-semibold"
h3: "text-2xl font-semibold"
body: "text-base md:text-lg"
bodyLarge: "text-lg md:text-xl"

// Container
maxWidth: "max-w-7xl"
narrowMaxWidth: "max-w-4xl" // For CTA sections only
```

## Testing Strategy

1. **Visual Inspection**: Check each section on deployed site
2. **Responsive Testing**: Test all breakpoints in browser dev tools
3. **Cross-browser**: Test in Chrome, Firefox, Safari, Edge
4. **Accessibility**: Run axe DevTools to verify heading hierarchy
5. **Performance**: Ensure no layout shift (CLS) issues

## Success Criteria

- [ ] All sections use consistent max-w-7xl wrapper
- [ ] All headings follow size hierarchy (h1 > h2 > h3)
- [ ] All sections have consistent vertical spacing
- [ ] All grids respond correctly at all breakpoints
- [ ] No horizontal overflow on any screen size
- [ ] Hero section properly aligned and contained
- [ ] All CTAs stack properly on mobile
- [ ] Typography is consistent throughout

## Notes

- This fix addresses all 8 categories of issues identified
- Changes should be made systematically, section by section
- Each section should be tested after changes before moving to next
- Maintain existing functionality while fixing layout
- Preserve all accessibility features and ARIA labels
