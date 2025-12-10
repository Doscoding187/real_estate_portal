# HowItWorksSection Component

## Overview

The `HowItWorksSection` component displays a three-step process guide for partners to understand how to get started with advertising on the platform. It includes sequential reveal animations, numbered step indicators with gradient badges, connecting lines (desktop only), and a prominent CTA button.

## Requirements

- **4.1**: Display three sequential steps with numbered indicators
- **4.2**: Show icon, step title, and brief description for each step
- **4.3**: Present a prominent CTA button below the steps
- **4.4**: Use visual hierarchy to indicate sequential nature
- **4.5**: Stack steps vertically on mobile with clear visual separation

## Features

- ✅ Three default process steps (Create Profile, Add Listings, Get Leads)
- ✅ Numbered gradient badges for each step
- ✅ Icon, title, and description for each step
- ✅ Connecting lines between steps (desktop only, hidden on mobile)
- ✅ Sequential reveal animation using Intersection Observer
- ✅ Staggered animation for each step (100ms delay)
- ✅ Prominent CTA button below steps
- ✅ Fully responsive (desktop, tablet, mobile)
- ✅ Respects `prefers-reduced-motion`
- ✅ Accessible with proper ARIA labels

## Usage

### Basic Usage

```tsx
import { HowItWorksSection } from '@/components/advertise/HowItWorksSection';

function AdvertisePage() {
  return (
    <div>
      <HowItWorksSection />
    </div>
  );
}
```

### Custom Configuration

```tsx
<HowItWorksSection
  heading="Start Your Journey"
  subheading="Join thousands of successful partners in just three steps"
  ctaButton={{
    label: 'Get Started Free',
    href: '/register',
    onClick: () => console.log('CTA clicked'),
  }}
/>
```

## Props

```typescript
interface HowItWorksSectionProps {
  /**
   * Optional custom heading
   * @default "How It Works"
   */
  heading?: string;
  
  /**
   * Optional custom subheading
   * @default "Get started in three simple steps"
   */
  subheading?: string;
  
  /**
   * CTA button configuration
   * @default { label: 'Start Advertising Now', href: '/register' }
   */
  ctaButton?: {
    label: string;
    href: string;
    onClick?: () => void;
  };
  
  /**
   * Optional additional CSS classes
   */
  className?: string;
}
```

## Default Steps

The component includes three default steps:

1. **Create Profile** (UserPlus icon)
   - "Set up your partner account in minutes with our streamlined registration process."

2. **Add Listings** (FileText icon)
   - "Upload your properties or services with our intuitive listing wizard and media tools."

3. **Get Leads** (TrendingUp icon)
   - "Start receiving high-intent leads from verified buyers actively searching for properties."

## Responsive Behavior

### Desktop (> 1024px)
- Steps displayed in horizontal row
- Connecting lines visible between steps
- Full spacing between elements

### Tablet (768px - 1024px)
- Steps displayed in horizontal row with reduced spacing
- Connecting lines visible
- Optimized gap spacing

### Mobile (< 768px)
- Steps stacked vertically
- Connecting lines hidden
- Full-width layout
- Touch-optimized spacing

## Animation Details

### Sequential Reveal
- Uses Intersection Observer to detect when section enters viewport
- Triggers staggered animation for all steps
- Each step animates with 100ms delay after previous step

### Step Animation
- Fade-up animation (opacity 0 → 1, translateY 20px → 0)
- Duration: 0.6s
- Easing: ease-out
- Respects `prefers-reduced-motion`

### Hover Effects
- Number badge scales to 1.05 on hover
- Icon container scales to 1.1 on hover
- Smooth transitions (0.3s)

## Accessibility

- Semantic HTML structure with `<section>` and proper heading hierarchy
- ARIA label on section (`aria-labelledby`)
- Proper heading structure (H2 for section, H3 for step titles)
- Keyboard accessible CTA button
- Screen reader friendly descriptions
- Respects `prefers-reduced-motion` for animations

## Styling

The component uses the soft-UI design tokens for consistent styling:

- **Colors**: Primary gradient for badges, neutral grays for text
- **Spacing**: Consistent spacing using design tokens
- **Typography**: Font sizes and weights from design system
- **Shadows**: Soft shadows for depth
- **Border Radius**: Soft rounded corners

## Demo

View the component in action:
```
/how-it-works-demo
```

## Testing

The ProcessStep component (used by HowItWorksSection) has comprehensive property-based tests:

- ✅ Property 8: Process step structure (Requirements 4.2)
- ✅ All steps contain exactly 3 elements: icon, title, description
- ✅ 6 test cases with 100+ iterations each
- ✅ All tests passing

## Integration Example

```tsx
import { HowItWorksSection } from '@/components/advertise/HowItWorksSection';
import { HeroSection } from '@/components/advertise/HeroSection';
import { ValuePropositionSection } from '@/components/advertise/ValuePropositionSection';

function AdvertiseWithUsPage() {
  return (
    <main>
      <HeroSection />
      <ValuePropositionSection />
      <HowItWorksSection />
      {/* Other sections */}
    </main>
  );
}
```

## Related Components

- `ProcessStep` - Individual step component with number badge, icon, title, description
- `CTAButton` - Call-to-action button with primary/secondary variants
- `ValuePropositionSection` - Feature blocks section
- `HeroSection` - Hero section with CTA buttons

## Notes

- The component is fully self-contained with default content
- All content can be customized via props
- The CTA button uses the existing CTAButton component for consistency
- Connecting lines are implemented in the ProcessStep component
- Mobile responsiveness is handled with CSS media queries
