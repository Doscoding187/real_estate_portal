# ValuePropositionSection Component

## Overview

The `ValuePropositionSection` component displays four key benefits of advertising on the platform, highlighting the value proposition for potential partners. This section uses the `FeatureBlock` component to present each benefit with consistent styling, animations, and spacing.

## Features

### Four Key Benefits

1. **High-Intent Audience** - Connect with verified home seekers actively searching for properties
2. **AI-Driven Visibility** - Smart algorithms ensure listings reach the right audience at the right time
3. **Verified Leads** - Receive qualified inquiries from authenticated users
4. **Dashboard Control** - Track performance and manage campaigns with comprehensive analytics

### Design Features

- **Soft-UI Aesthetic**: Pastel gradients, soft shadows, and rounded elements
- **Scroll-Triggered Animations**: Fade-up animations when blocks enter viewport
- **Icon Pulse on Hover**: Interactive feedback on icon containers
- **Responsive Grid Layout**: Auto-fit grid that adapts to all screen sizes
- **Consistent Spacing**: Uniform gap spacing between all feature blocks
- **Staggered Animations**: 100ms delay between each block for elegant reveal

## Usage

```tsx
import { ValuePropositionSection } from '@/components/advertise/ValuePropositionSection';

function AdvertisePage() {
  return (
    <div>
      {/* Other sections */}
      <ValuePropositionSection />
      {/* Other sections */}
    </div>
  );
}
```

## Component Structure

```
ValuePropositionSection
├── Section Header
│   ├── Heading (h2): "Why Advertise With Us?"
│   └── Subheading: Platform description
└── Feature Blocks Grid
    ├── FeatureBlock (High-Intent Audience)
    ├── FeatureBlock (AI-Driven Visibility)
    ├── FeatureBlock (Verified Leads)
    └── FeatureBlock (Dashboard Control)
```

## Responsive Behavior

### Mobile (< 768px)
- Single column layout
- Full-width feature blocks
- Stacked vertically with consistent spacing

### Tablet (768px - 1024px)
- Two-column grid
- Responsive gap spacing
- Maintains visual hierarchy

### Desktop (> 1024px)
- Up to 4 columns (auto-fit)
- Maximum container width: 1440px
- Optimal spacing for large screens

## Animations

### Scroll-Triggered Fade-Up
- **Initial State**: `opacity: 0, translateY: 20px`
- **Animated State**: `opacity: 1, translateY: 0`
- **Duration**: 400ms
- **Easing**: cubic-bezier(0.4, 0, 0.2, 1)
- **Stagger Delay**: 100ms per block

### Icon Pulse on Hover
- **Scale**: 1 → 1.1 → 1
- **Duration**: 600ms
- **Easing**: easeInOut
- **Background**: Transitions to subtle variant

## Accessibility

- **Semantic HTML**: Uses `<section>` with proper heading hierarchy
- **ARIA Labels**: Section labeled with `aria-labelledby`
- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Reduced Motion**: Respects `prefers-reduced-motion` user preference
- **Screen Reader**: Proper heading structure and descriptive text

## Testing

### Property-Based Tests

The component includes comprehensive property-based tests:

1. **Feature Block Structure** (Property 6)
   - Validates icon, headline, and description presence
   - Tests with 100 random feature configurations

2. **Feature Block Animation** (Property 5)
   - Validates fade-up animation properties
   - Tests icon hover animation capability
   - Verifies staggered animation delays

3. **Spacing Consistency** (Property 7)
   - Validates consistent grid gap spacing
   - Tests responsive grid structure
   - Verifies all 4 blocks are rendered

### Running Tests

```bash
# Run all ValuePropositionSection tests
npm test -- ValueProposition

# Run specific test files
npm test -- ValuePropositionSpacing.property.test.tsx --run
npm test -- FeatureBlock.property.test.tsx --run
npm test -- FeatureBlockAnimation.property.test.tsx --run
```

## Demo Page

A demo page is available at `client/src/pages/ValuePropositionDemo.tsx` to showcase the component in isolation with scroll behavior.

## Requirements Validation

This component satisfies the following requirements:

- **3.1**: Displays four feature blocks with key benefits
- **3.2**: Implements scroll-triggered fade-up animations
- **3.3**: Uses soft-UI icons, headlines, and descriptions
- **3.4**: Maintains consistent spacing and alignment
- **3.5**: Responsive grid layout for all viewport sizes

## Design Tokens

The component uses the following design tokens from `design-tokens.ts`:

- **Colors**: `primary.light`, `primary.base`, `neutral.gray50`, `neutral.gray600`, `neutral.gray900`
- **Spacing**: `spacing.lg`, `spacing['2xl']`, `spacing['3xl']`, `spacing['4xl']`, `spacing['5xl']`
- **Typography**: `fontSize['2xl']`, `fontSize['4xl']`, `fontWeight.bold`, `lineHeight.tight`, `lineHeight.relaxed`
- **Border Radius**: `borderRadius.softLarge`
- **Shadows**: `shadows.soft`

## Related Components

- **FeatureBlock**: Individual feature display component
- **PartnerSelectionSection**: Similar section with partner type cards
- **HeroSection**: Landing page hero with similar animations

## Performance Considerations

- **Lazy Loading**: Uses Intersection Observer for scroll animations
- **Animation Performance**: Uses GPU-accelerated properties (transform, opacity)
- **Reduced Motion**: Automatically disables animations when user prefers reduced motion
- **Minimal Re-renders**: Memoized animation variants and static content

## Future Enhancements

- [ ] Add CMS integration for editable content
- [ ] Support custom feature configurations
- [ ] Add analytics tracking for feature block interactions
- [ ] Implement A/B testing for different benefit messaging
