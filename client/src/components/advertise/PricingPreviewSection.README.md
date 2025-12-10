# PricingPreviewSection Component

## Overview

The `PricingPreviewSection` component displays four pricing category cards with navigation to the full pricing page. It provides a preview of pricing options for different partner types (Agents, Developers, Banks/Loan Providers, Service Providers) with a minimalist, soft-UI design aesthetic.

## Requirements

- **7.1**: Display four pricing category cards
- **7.2**: Use minimalist card styling consistent with Zillow and 99Acres aesthetics
- **7.3**: Navigate to full pricing page on card click
- **7.4**: Include "View Full Pricing" CTA below cards
- **7.5**: Stack pricing cards vertically on mobile with adequate spacing

## Components

### PricingCard

Individual pricing category card with:
- Icon representing the partner type
- Category title (e.g., "Agent Plans")
- Brief description
- "View Pricing" link with arrow
- Hover border glow effect
- Click tracking for analytics

### PricingPreviewSection

Main section component that:
- Displays section heading and subtitle
- Renders grid of 4 pricing cards
- Includes "View Full Pricing" CTA button
- Responsive layout (4 columns → 2 columns → 1 column)
- Smooth scroll animations

## Usage

```tsx
import { PricingPreviewSection } from '@/components/advertise/PricingPreviewSection';

// Basic usage with defaults
<PricingPreviewSection />

// Custom configuration
<PricingPreviewSection
  title="Custom Pricing Title"
  subtitle="Custom subtitle text"
  fullPricingHref="/custom-pricing-page"
  pricingCategories={[
    {
      icon: CustomIcon,
      category: 'Custom Plan',
      description: 'Custom description',
      href: '/custom-plan',
    },
  ]}
/>
```

## Props

### PricingPreviewSectionProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `pricingCategories` | `Array<PricingCategory>` | Default categories | Array of pricing category objects |
| `fullPricingHref` | `string` | `/pricing` | URL for full pricing page |
| `title` | `string` | "Pricing That Fits Your Business" | Section heading |
| `subtitle` | `string` | Default subtitle | Section description |

### PricingCardProps

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `icon` | `LucideIcon` | Yes | Icon component from lucide-react |
| `category` | `string` | Yes | Pricing category title |
| `description` | `string` | Yes | Brief description of the category |
| `href` | `string` | Yes | Navigation URL |
| `onClick` | `() => void` | No | Optional click handler |
| `className` | `string` | No | Additional CSS classes |

## Default Pricing Categories

1. **Agent Plans**
   - Icon: Users
   - Description: Flexible pricing for individual agents and small teams
   - Link: `/pricing/agents`

2. **Developer Plans**
   - Icon: Building2
   - Description: Comprehensive packages for property developers
   - Link: `/pricing/developers`

3. **Bank/Loan Provider Plans**
   - Icon: Landmark
   - Description: Targeted advertising for financial institutions
   - Link: `/pricing/financial`

4. **Service Provider Plans**
   - Icon: Wrench
   - Description: Affordable options for property service providers
   - Link: `/pricing/services`

## Design Features

### Minimalist Card Styling
- Clean white background
- Subtle border (2px gray)
- Generous padding (48px)
- Rounded corners (16px)
- Soft shadows

### Hover Border Glow Effect
- Gradient border appears on hover
- Smooth opacity transition (300ms)
- Primary gradient colors
- Icon scales up slightly

### Responsive Layout
- **Desktop (>1024px)**: 4-column grid
- **Tablet (768px-1024px)**: 2-column grid
- **Mobile (<768px)**: 1-column stack
- Consistent gap spacing (32px)

### Animations
- Staggered fade-up on scroll
- Smooth hover transitions
- Icon scale animation
- Arrow slide on hover

## Analytics Tracking

### Pricing Card Click
```javascript
{
  event: 'pricing_card_click',
  category: 'Agent Plans',
  location: 'pricing_preview',
  href: '/pricing/agents',
  timestamp: '2024-01-01T12:00:00.000Z'
}
```

### View Full Pricing CTA Click
```javascript
{
  event: 'cta_click',
  label: 'View Full Pricing',
  location: 'pricing_preview',
  href: '/pricing',
  timestamp: '2024-01-01T12:00:00.000Z'
}
```

## Accessibility

- Semantic HTML structure
- ARIA labels for screen readers
- Keyboard navigation support
- Focus indicators
- Descriptive link text
- Proper heading hierarchy

## Demo

View the component in action:
```
/pricing-preview-demo
```

## Testing

Property-based tests validate:
- Pricing card navigation (Property 12)
- Card structure and content
- Hover effects
- Analytics tracking
- Responsive behavior

## Related Components

- `PricingCard` - Individual pricing category card
- `CTAButton` - Call-to-action button
- `HeroSection` - Hero section with CTAs
- `PartnerTypeCard` - Similar card component for partner types

## Design Tokens

Uses soft-UI design tokens from `design-tokens.ts`:
- Colors: Primary gradient, neutral palette
- Shadows: Soft, softHover
- Border radius: softLarge (16px)
- Transitions: base (300ms cubic-bezier)
- Spacing: Consistent spacing scale
- Typography: Font sizes, weights, line heights

## Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

## Performance

- Lazy loading with Intersection Observer
- GPU-accelerated animations (transform, opacity)
- Optimized re-renders with React.memo
- Minimal bundle size impact
