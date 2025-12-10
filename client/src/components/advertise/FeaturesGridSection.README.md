# FeaturesGridSection Component

## Overview

The `FeaturesGridSection` component displays six feature tiles in a responsive grid layout, showcasing the specific advertising features available on the platform. It implements soft-UI design principles with hover animations and responsive breakpoints.

## Features

- ✅ Six feature tiles with soft-UI card styling
- ✅ Hover lift animation with shadow expansion
- ✅ Icon color transition on hover
- ✅ Responsive grid layout (3 columns → 2 columns → 1 column)
- ✅ Touch-optimized spacing on mobile
- ✅ Staggered fade-in animation on scroll
- ✅ Accessible with proper ARIA labels

## Usage

```tsx
import { FeaturesGridSection } from '@/components/advertise/FeaturesGridSection';

function AdvertisePage() {
  return (
    <div>
      {/* Default usage */}
      <FeaturesGridSection />
      
      {/* Custom title and subtitle */}
      <FeaturesGridSection
        title="Advertising Features"
        subtitle="Tools to help you succeed"
      />
    </div>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `"Powerful Features for Your Success"` | Section heading |
| `subtitle` | `string` | `"Everything you need to advertise effectively..."` | Section subheading |
| `className` | `string` | `""` | Additional CSS classes |

## Features Included

### 1. Listing Promotion
- **Icon**: Megaphone
- **Description**: Premium listing placements and enhanced visibility

### 2. Explore Feed Ads
- **Icon**: Video
- **Description**: Short-form video content in Explore feed

### 3. Boost Campaigns
- **Icon**: TrendingUp
- **Description**: Targeted boost campaigns for maximum reach

### 4. Lead Engine
- **Icon**: Users
- **Description**: Intelligent lead capture and management

### 5. Team Collaboration
- **Icon**: UserPlus
- **Description**: Seamless team management and permissions

### 6. Media Templates
- **Icon**: Image
- **Description**: Professional marketing material templates

## Responsive Breakpoints

### Desktop (≥1024px)
- 3 columns
- Full spacing (2rem gap)
- Maximum container width: 1440px

### Tablet (768px - 1023px)
- 2 columns
- Standard spacing (2rem gap)

### Mobile (<768px)
- 1 column
- Touch-optimized spacing (1.5rem gap)
- Reduced padding

## Animations

### Scroll-Triggered Animation
- Staggered fade-in for feature tiles
- 100ms delay between each tile
- Triggers once when section enters viewport

### Hover Animation
- Lift effect (y: -4px)
- Shadow expansion
- Icon color transition
- Duration: 300ms

## Accessibility

- Semantic HTML structure
- ARIA labels for section heading
- Keyboard navigation support
- Screen reader compatible
- Respects `prefers-reduced-motion`

## Testing

### Visual Testing
1. Resize browser to test responsive breakpoints
2. Hover over tiles to verify lift animation
3. Check icon color transitions
4. Verify staggered animation on scroll

### Accessibility Testing
1. Navigate with keyboard (Tab key)
2. Test with screen reader
3. Verify ARIA labels
4. Check color contrast

### Property-Based Tests
- ✅ Feature tile styling (border-radius, box-shadow)
- ✅ Feature tile hover interaction (lift animation)

## Demo

View the component in action:
```
/features-grid-demo
```

## Requirements Validation

- ✅ **5.1**: Displays six feature tiles
- ✅ **5.2**: Soft-UI card styling with rounded corners and shadows
- ✅ **5.3**: Hover lift animation
- ✅ **5.4**: Consistent iconography
- ✅ **5.5**: Responsive grid (3 → 2 → 1 columns)

## Related Components

- `FeatureTile` - Individual feature tile component
- `ValuePropositionSection` - Similar section with feature blocks
- `PartnerSelectionSection` - Partner type cards with similar styling

## Design Tokens

Uses soft-UI design tokens from `design-tokens.ts`:
- Colors: Primary gradient, neutral palette
- Shadows: Soft, softHover
- Border radius: softLarge (16px)
- Spacing: xl (2rem), lg (1.5rem)
- Typography: 4xl heading, xl subtitle

## Performance

- Lazy animation triggers (only animates when visible)
- Optimized re-renders with React.memo (if needed)
- CSS-based responsive layout (no JavaScript)
- GPU-accelerated animations (transform, opacity)
