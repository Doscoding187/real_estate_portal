# Responsive Layout Implementation Guide

## Overview

This document provides comprehensive guidance for implementing responsive layouts across the Advertise With Us landing page. All components have been designed and tested to work seamlessly across mobile, tablet, and desktop viewports.

**Requirements Addressed**: 10.1, 10.2, 10.3, 10.4

## Breakpoint Strategy

### Breakpoints Defined

```typescript
breakpoints: {
  mobile: '768px',    // < 768px
  tablet: '1024px',   // 768px - 1024px
  desktop: '1440px',  // > 1024px (max container width)
}
```

### Viewport Ranges

- **Mobile**: `< 768px` - Single column, stacked sections, touch-optimized
- **Tablet**: `768px - 1024px` - Two-column grids, adjusted spacing
- **Desktop**: `> 1024px` - Full-width grids, max 1440px container

## Implementation Files

### Core Files

1. **`client/src/styles/advertise-responsive.css`**
   - Comprehensive responsive styles
   - Mobile-first approach
   - Touch target optimization
   - Accessibility features

2. **`client/src/components/advertise/design-tokens.ts`**
   - Breakpoint definitions
   - Spacing scales
   - Typography scales

## Mobile Layouts (< 768px)

### Requirements: 10.2

### Key Principles

1. **Single Column Layout**
   - All sections stack vertically
   - No horizontal scrolling
   - Full-width components

2. **Touch Optimization**
   - Minimum touch target: 44px × 44px
   - Increased padding on interactive elements
   - Larger tap areas for icons

3. **Typography Scaling**
   - H1: 2rem (32px)
   - H2: 2rem (32px)
   - Body: 1rem (16px)
   - Reduced line heights for mobile

4. **Spacing Reduction**
   - Section padding: 3rem vertical, 1rem horizontal
   - Component gaps: 1rem - 1.5rem
   - Compact layouts

### Component-Specific Mobile Styles

#### Hero Section
```css
.hero-section {
  min-height: auto !important;
  padding: 3rem 1rem !important;
}

.hero-section .grid {
  grid-template-columns: 1fr !important;
  gap: 2rem !important;
}

.hero-section h1 {
  font-size: 2rem !important;
  line-height: 1.2 !important;
}
```

#### Partner Selection
```css
.partner-cards-grid {
  grid-template-columns: 1fr !important;
  gap: 1rem !important;
}
```

#### Value Proposition
```css
.feature-blocks-grid {
  grid-template-columns: 1fr !important;
  gap: 1.5rem !important;
}
```

#### How It Works
```css
.process-steps-container {
  flex-direction: column !important;
  align-items: center !important;
}

.connector-line {
  display: none !important;
}
```

#### Features Grid
```css
.features-grid-section .grid {
  grid-template-columns: 1fr !important;
  gap: 1rem !important;
}
```

#### Social Proof
```css
.social-proof-section .metrics-grid {
  grid-template-columns: 1fr !important;
}

.social-proof-section .partner-logos {
  grid-template-columns: repeat(2, 1fr) !important;
}
```

#### Pricing Preview
```css
.pricing-cards-grid {
  grid-template-columns: 1fr !important;
  gap: 1rem !important;
}
```

#### CTA Buttons
```css
.cta-button-group {
  flex-direction: column !important;
  width: 100% !important;
}

.cta-button {
  width: 100% !important;
  padding: 1rem 1.5rem !important;
}
```

### Mobile Sticky CTA

The `MobileStickyCTA` component is specifically designed for mobile:

```tsx
<MobileStickyCTA
  label="Start Advertising"
  href="/register"
  isVisible={isScrolledPastHero}
/>
```

Features:
- Appears after scrolling past hero
- Fixed to bottom with safe area insets
- Dismissible with X button
- Slide-up animation

## Tablet Layouts (768px - 1024px)

### Requirements: 10.3

### Key Principles

1. **Two-Column Grids**
   - Partner cards: 2 columns
   - Feature blocks: 2 columns
   - Pricing cards: 2 columns
   - Metrics: 2 columns

2. **Adjusted Spacing**
   - Section padding: 4rem vertical, 2rem horizontal
   - Component gaps: 1.5rem - 2rem
   - Balanced whitespace

3. **Typography Scaling**
   - H1: 2.5rem (40px)
   - H2: 2.5rem (40px)
   - Body: 1.125rem (18px)

### Component-Specific Tablet Styles

#### Hero Section
```css
.hero-section .grid {
  grid-template-columns: 1fr 1fr !important;
  gap: 3rem !important;
}
```

#### Partner Selection
```css
.partner-cards-grid {
  grid-template-columns: repeat(2, 1fr) !important;
  gap: 1.5rem !important;
}
```

#### Features Grid
```css
.features-grid-section .grid {
  grid-template-columns: repeat(2, 1fr) !important;
  gap: 1.5rem !important;
}
```

#### Social Proof
```css
.social-proof-section .metrics-grid {
  grid-template-columns: repeat(2, 1fr) !important;
}

.social-proof-section .partner-logos {
  grid-template-columns: repeat(3, 1fr) !important;
}
```

## Desktop Layouts (> 1024px)

### Requirements: 10.4

### Key Principles

1. **Full-Width Grids**
   - Partner cards: Auto-fit with min 280px
   - Feature blocks: Auto-fit with min 280px
   - Features grid: 3 columns
   - Metrics: 4 columns

2. **Max Container Width**
   - Maximum: 1440px
   - Centered with auto margins
   - Generous horizontal padding

3. **Optimal Spacing**
   - Section padding: 6rem vertical, 2rem horizontal
   - Component gaps: 2rem - 3rem
   - Generous whitespace

4. **Typography Scaling**
   - H1: 3.75rem (60px)
   - H2: 3rem (48px)
   - Body: 1.25rem (20px)

### Component-Specific Desktop Styles

#### Hero Section
```css
.hero-section {
  padding: 5rem 2rem !important;
}

.hero-section h1 {
  font-size: 3.75rem !important;
}
```

#### Partner Selection
```css
.partner-cards-grid {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)) !important;
  gap: 2rem !important;
}
```

#### Features Grid
```css
.features-grid-section .grid {
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 2rem !important;
}
```

#### Social Proof
```css
.social-proof-section .metrics-grid {
  grid-template-columns: repeat(4, 1fr) !important;
}

.social-proof-section .partner-logos {
  grid-template-columns: repeat(5, 1fr) !important;
}
```

#### Max Width Container
```css
.advertise-section-container {
  max-width: 1440px !important;
  margin: 0 auto;
}
```

## Usage Instructions

### 1. Import Responsive Styles

Add to your main page or layout component:

```tsx
import '@/styles/advertise-responsive.css';
```

### 2. Apply Container Classes

Wrap sections in container classes:

```tsx
<section className="hero-section">
  <div className="advertise-section-container">
    {/* Content */}
  </div>
</section>
```

### 3. Use Utility Classes

```tsx
{/* Hide on mobile */}
<div className="hide-mobile">Desktop content</div>

{/* Show only on mobile */}
<div className="show-mobile">Mobile content</div>

{/* Hide on tablet */}
<div className="hide-tablet">Not for tablet</div>
```

### 4. Touch Targets

Ensure all interactive elements meet minimum touch target size:

```tsx
<button className="mobile-touch-target">
  Click me
</button>
```

## Testing Checklist

### Mobile Testing (< 768px)

- [ ] All sections stack vertically
- [ ] No horizontal scrolling
- [ ] Touch targets ≥ 44px × 44px
- [ ] Typography is readable
- [ ] Images scale properly
- [ ] CTA buttons are full-width
- [ ] Mobile sticky CTA appears after hero
- [ ] Tested on iPhone (Safari)
- [ ] Tested on Android (Chrome)

### Tablet Testing (768px - 1024px)

- [ ] Two-column grids display correctly
- [ ] Spacing is balanced
- [ ] Typography scales appropriately
- [ ] Images maintain aspect ratio
- [ ] CTA buttons are inline
- [ ] Tested on iPad (Safari)
- [ ] Tested on Android tablet (Chrome)

### Desktop Testing (> 1024px)

- [ ] Full-width grids display correctly
- [ ] Max container width is 1440px
- [ ] Spacing is generous
- [ ] Typography is large and readable
- [ ] Images are high quality
- [ ] Tested on Chrome (latest)
- [ ] Tested on Firefox (latest)
- [ ] Tested on Safari (latest)
- [ ] Tested on Edge (latest)

### Cross-Device Testing

- [ ] Smooth transitions between breakpoints
- [ ] No layout shifts during resize
- [ ] Animations work on all devices
- [ ] Performance is acceptable on all devices
- [ ] Accessibility features work on all devices

## Performance Considerations

### Mobile Performance

1. **Image Optimization**
   - Use responsive images with `srcset`
   - Lazy load below-the-fold images
   - Use WebP format with JPEG fallback

2. **Animation Performance**
   - Use `transform` and `opacity` for animations
   - Avoid animating layout properties
   - Respect `prefers-reduced-motion`

3. **Code Splitting**
   - Lazy load non-critical sections
   - Split vendor bundles
   - Inline critical CSS

### Tablet Performance

1. **Grid Layouts**
   - Use CSS Grid for efficient layouts
   - Avoid unnecessary nesting
   - Optimize grid calculations

2. **Touch Events**
   - Use passive event listeners
   - Debounce scroll events
   - Optimize touch interactions

### Desktop Performance

1. **Large Screens**
   - Optimize for high-DPI displays
   - Use vector graphics where possible
   - Ensure smooth scrolling

2. **Animations**
   - Maintain 60fps
   - Use GPU acceleration
   - Optimize animation complexity

## Accessibility

### Keyboard Navigation

- All interactive elements are keyboard accessible
- Focus indicators are visible (3px outline)
- Tab order is logical
- Skip links are provided

### Screen Readers

- Semantic HTML structure
- ARIA labels on interactive elements
- Descriptive alt text for images
- Proper heading hierarchy

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Common Issues & Solutions

### Issue: Layout Shifts on Resize

**Solution**: Use `min-height` instead of `height` for flexible sections.

### Issue: Touch Targets Too Small

**Solution**: Apply `.mobile-touch-target` class or ensure minimum 44px × 44px.

### Issue: Text Overflow on Mobile

**Solution**: Use `word-break: break-word` and `overflow-wrap: break-word`.

### Issue: Images Not Scaling

**Solution**: Use `max-width: 100%` and `height: auto`.

### Issue: Horizontal Scrolling on Mobile

**Solution**: Set `overflow-x: hidden` on body and ensure no fixed-width elements exceed viewport.

## Resources

- [MDN: Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [Web.dev: Responsive Web Design Basics](https://web.dev/responsive-web-design-basics/)
- [WCAG 2.1: Touch Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [Apple: Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design: Layout](https://material.io/design/layout/responsive-layout-grid.html)

## Conclusion

The responsive layout implementation ensures a consistent, optimized experience across all devices. By following mobile-first principles, using appropriate breakpoints, and optimizing for touch interactions, the Advertise With Us landing page delivers excellent performance and usability on mobile, tablet, and desktop viewports.
