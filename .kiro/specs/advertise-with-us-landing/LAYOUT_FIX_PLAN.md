# Advertise With Us - Layout Fix Plan

## Overview
This document outlines the comprehensive fixes needed for alignment, spacing, and heading issues on the Advertise With Us page based on the deployed UI review.

## Issues Identified

### 1. General Alignment Issues
- Sections are not centered - shifted left
- Missing `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` wrapper on many sections
- Some items stretch full width instead of following grid constraints

### 2. Heading Size & Consistency Issues
- Headings are too small or too large in various sections
- Not following design token specifications:
  - h1 should be: `text-4xl md:text-5xl font-bold`
  - h2 should be: `text-3xl md:text-4xl font-semibold`
  - h3 should be: `text-2xl font-semibold`
- Missing spacing above/below headings

### 3. Section Spacing Problems
- Inconsistent vertical rhythm
- Some sections have huge empty space
- Some sections collapse into each other
- Should use: `pt-20 pb-20 md:pt-28 md:pb-28`

### 4. Grid Layout Breaking
- Partner card grid collapsing unexpectedly
- Features grid not maintaining proper columns
- Grids should be:
  - Partner cards: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8`
  - Features: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10`
  - How It Works: `flex flex-col md:flex-row items-center justify-between gap-10`

### 5. Hero Section Issues
- Headline alignment off
- Image/card overlapping or overflowing
- CTAs not aligning vertically
- Background orbs overlay incorrectly

### 6. Typography Inconsistencies
- Wrong font weights
- Inconsistent line heights
- Mis-sized icons and labels

### 7. Responsive CSS Issues
- Mobile spacing incorrect, especially headings
- CTAs don't stack properly
- Images don't scale correctly
- Overflow-x issues

## Fix Strategy

### Phase 1: Standardize Container Wrappers
Apply consistent wrapper to ALL sections:
```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {children}
</div>
```

### Phase 2: Fix Heading Hierarchy
Enforce design tokens:
- H1: `className="text-4xl md:text-5xl font-bold leading-tight"`
- H2: `className="text-3xl md:text-4xl font-semibold leading-tight"`
- H3: `className="text-2xl font-semibold leading-snug"`
- Subheadings: `className="text-lg md:text-xl text-gray-600 leading-relaxed"`

### Phase 3: Standardize Section Spacing
Apply consistent padding:
```tsx
className="py-20 md:py-28"
```

Block gaps:
```tsx
className="mt-10 md:mt-16"  // Standard
className="mt-16 md:mt-24"  // Large
```

### Phase 4: Fix Grid Definitions
Ensure proper responsive grids:
```tsx
// 4-column grid (partner cards)
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"

// 3-column grid (features)
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10"

// 2-column grid (hero, value prop)
className="grid grid-cols-1 lg:grid-cols-2 gap-12"
```

### Phase 5: Fix Hero Section
- Ensure proper grid layout
- Fix image container constraints
- Align CTAs properly
- Fix background orb positioning

### Phase 6: Update Responsive CSS
- Review and update `advertise-responsive.css`
- Ensure mobile spacing is correct
- Fix CTA stacking
- Prevent overflow issues

## Files to Update

1. `client/src/components/advertise/HeroSection.tsx`
2. `client/src/components/advertise/PartnerSelectionSection.tsx`
3. `client/src/components/advertise/ValuePropositionSection.tsx`
4. `client/src/components/advertise/HowItWorksSection.tsx`
5. `client/src/components/advertise/FeaturesGridSection.tsx`
6. `client/src/components/advertise/PricingPreviewSection.tsx`
7. `client/src/components/advertise/FAQSection.tsx`
8. `client/src/components/advertise/FinalCTASection.tsx`
9. `client/src/styles/advertise-responsive.css`

## Implementation Order

1. Fix HeroSection (most visible)
2. Fix PartnerSelectionSection
3. Fix ValuePropositionSection
4. Fix HowItWorksSection
5. Fix FeaturesGridSection
6. Fix PricingPreviewSection
7. Fix FAQSection
8. Fix FinalCTASection
9. Update responsive CSS
10. Test on all breakpoints

## Success Criteria

- [ ] All sections centered with max-w-7xl wrapper
- [ ] Consistent heading sizes across all sections
- [ ] Consistent spacing (py-20 md:py-28)
- [ ] Grids maintain proper columns at all breakpoints
- [ ] No horizontal overflow
- [ ] CTAs stack properly on mobile
- [ ] Images scale correctly
- [ ] Typography follows design tokens
- [ ] No alignment issues on any device

## Testing Checklist

- [ ] Mobile (< 768px): Single column, proper spacing
- [ ] Tablet (768px - 1024px): 2-column grids work
- [ ] Desktop (> 1024px): Full grids, centered content
- [ ] No overflow-x on any breakpoint
- [ ] Headings are correct size
- [ ] Spacing is consistent
- [ ] Grids don't collapse unexpectedly
