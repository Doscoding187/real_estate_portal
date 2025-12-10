# SocialProofSection Component

## Overview

The `SocialProofSection` component displays social proof elements including partner logos and key metrics to build trust and credibility with potential advertising partners.

## Features

- **Partner Logos Grid**: Displays logos of trusted partners (developers, agencies, financial institutions)
- **Key Metrics Display**: Shows 4 key performance metrics with count-up animations
- **Responsive Layout**: Adapts to mobile, tablet, and desktop viewports
- **Smooth Animations**: Scroll-triggered animations with staggered timing
- **Flexible Configuration**: Optional logos, customizable metrics, disclaimer text

## Usage

### Basic Example

```tsx
import { SocialProofSection } from '@/components/advertise/SocialProofSection';
import { TrendingUp, Users, Star, Award } from 'lucide-react';

function AdvertisePage() {
  const metrics = [
    {
      value: '5,000+',
      label: 'Verified Leads Generated',
      icon: TrendingUp,
      iconColor: 'green',
    },
    {
      value: '10,000+',
      label: 'Properties Promoted',
      icon: Award,
      iconColor: 'blue',
    },
    {
      value: '95%',
      label: 'Partner Satisfaction',
      icon: Star,
      iconColor: 'yellow',
    },
    {
      value: '500+',
      label: 'Active Partners',
      icon: Users,
      iconColor: 'purple',
    },
  ];

  const partnerLogos = [
    { name: 'Developer A', imageUrl: '/logos/developer-a.png', alt: 'Developer A Logo' },
    { name: 'Agency B', imageUrl: '/logos/agency-b.png', alt: 'Agency B Logo' },
  ];

  return (
    <SocialProofSection
      metrics={metrics}
      partnerLogos={partnerLogos}
      disclaimer="* Metrics updated monthly"
    />
  );
}
```

### Metrics Only (No Logos)

```tsx
<SocialProofSection
  heading="Our Impact in Numbers"
  metrics={metrics}
  showLogos={false}
/>
```

### With Count-up Animation

```tsx
<SocialProofSection
  metrics={[
    {
      value: 5234, // Numeric value triggers count-up animation
      label: 'Verified Leads Generated',
      icon: TrendingUp,
      iconColor: 'green',
    },
  ]}
/>
```

## Props

### SocialProofSectionProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `heading` | `string` | `"Trusted by Leading Property Professionals"` | Section heading |
| `subheading` | `string` | `undefined` | Optional subheading text |
| `partnerLogos` | `PartnerLogo[]` | `[]` | Array of partner logos to display |
| `metrics` | `SocialProofMetric[]` | **Required** | Array of metrics to display |
| `showLogos` | `boolean` | `true` | Whether to show partner logos section |
| `disclaimer` | `string` | `undefined` | Optional disclaimer text |

### PartnerLogo

| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | Partner name |
| `imageUrl` | `string` | Logo image URL (optional) |
| `alt` | `string` | Alt text for the logo |

### SocialProofMetric

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string \| number` | Metric value (number triggers count-up animation) |
| `label` | `string` | Descriptive label |
| `icon` | `LucideIcon` | Optional icon component |
| `iconColor` | `'primary' \| 'secondary' \| 'blue' \| 'green' \| 'yellow' \| 'purple'` | Icon color variant |

## Components Used

- **MetricCard**: Displays individual metrics with count-up animation
- **Framer Motion**: Provides smooth animations
- **Lucide Icons**: Icon library for metric icons

## Animations

- **Scroll-triggered**: Section animates when entering viewport
- **Staggered**: Child elements animate in sequence (100ms delay)
- **Count-up**: Numeric values animate from 0 to target value
- **Hover effects**: Logo opacity transitions on hover

## Responsive Behavior

- **Mobile (< 768px)**: Single column layout, stacked metrics
- **Tablet (768px - 1024px)**: 2-column metrics grid, 3-column logos
- **Desktop (> 1024px)**: 4-column metrics grid, 5-column logos

## Accessibility

- Semantic HTML structure
- Alt text for all logos
- Proper heading hierarchy
- Keyboard accessible
- Respects `prefers-reduced-motion`

## Requirements Validation

This component validates the following requirements:

- **6.1**: Display partner logos for developers, agencies, and financial institutions
- **6.2**: Show four key metrics with count-up animation
- **6.3**: Use large, readable numbers with descriptive labels
- **6.4**: Arrange logos in a visually balanced grid
- **6.5**: Use placeholder metrics with disclaimer when actual data unavailable

## Demo

View the component in action:
```
/social-proof-demo
```

## Testing

Property-based tests validate:
- Metric structure (value + label present)
- Responsive classes
- Icon display
- Accessibility compliance

Run tests:
```bash
npm test -- MetricCard.property.test.tsx
```

## Related Components

- `MetricCard` - Individual metric display with count-up animation
- `HeroSection` - Uses similar trust signals
- `PartnerSelectionSection` - Related partner-focused content
