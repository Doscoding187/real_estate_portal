# Partner Selection Section

The Partner Selection Section allows potential advertising partners to self-identify and navigate to relevant content tailored to their business type.

## Components

### PartnerSelectionSection

Main section component that displays five partner type cards with staggered animations.

**Props:**
- `partnerTypes?: PartnerType[]` - Optional custom partner types (defaults to 5 standard types)
- `title?: string` - Optional section title (default: "Who Are You Advertising As?")
- `subtitle?: string` - Optional section subtitle
- `className?: string` - Optional additional CSS classes

**Features:**
- Staggered fade-up animations on scroll
- Responsive grid layout (auto-fit, min 280px)
- Intersection Observer for scroll detection
- Respects prefers-reduced-motion

### PartnerTypeCard

Individual partner type card with icon, title, benefit, and CTA.

**Props:**
- `icon: LucideIcon` - Icon component from lucide-react
- `title: string` - Partner type title (e.g., "Real Estate Agent")
- `benefit: string` - One-sentence benefit description
- `href: string` - Navigation URL for sub-landing page
- `index: number` - Index for staggered animation timing
- `onClick?: () => void` - Optional click handler
- `className?: string` - Optional additional CSS classes

**Features:**
- Hover lift animation with shadow expansion
- Click navigation to sub-landing pages
- Touch feedback for mobile
- Analytics tracking for partner type selection
- Accessibility (ARIA labels, keyboard navigation)

## Default Partner Types

1. **Real Estate Agent** - Showcase listings to verified buyers and renters
2. **Property Developer** - Promote developments with immersive media
3. **Bank / Financial Institution** - Connect with home buyers at the perfect moment
4. **Bond Originator** - Capture high-intent leads looking for home loans
5. **Property Service Provider** - Reach homeowners and property managers

## Usage

### Basic Usage

```tsx
import { PartnerSelectionSection } from '@/components/advertise/PartnerSelectionSection';

function AdvertisePage() {
  return (
    <div>
      <PartnerSelectionSection />
    </div>
  );
}
```

### Custom Partner Types

```tsx
import { PartnerSelectionSection } from '@/components/advertise/PartnerSelectionSection';
import { Home, Building2 } from 'lucide-react';

const customPartnerTypes = [
  {
    id: 'agent',
    icon: Home,
    title: 'Real Estate Agent',
    benefit: 'Custom benefit text here',
    href: '/advertise/agents',
  },
  {
    id: 'developer',
    icon: Building2,
    title: 'Property Developer',
    benefit: 'Custom benefit text here',
    href: '/advertise/developers',
  },
];

function AdvertisePage() {
  return (
    <div>
      <PartnerSelectionSection
        partnerTypes={customPartnerTypes}
        title="Choose Your Partner Type"
        subtitle="Select the option that best describes your business"
      />
    </div>
  );
}
```

### Individual Card Usage

```tsx
import { PartnerTypeCard } from '@/components/advertise/PartnerTypeCard';
import { Home } from 'lucide-react';

function CustomSection() {
  return (
    <PartnerTypeCard
      icon={Home}
      title="Real Estate Agent"
      benefit="Showcase your listings to thousands of verified buyers"
      href="/advertise/agents"
      index={0}
      onClick={() => console.log('Card clicked')}
    />
  );
}
```

## Animations

### Staggered Fade-Up

Cards animate in sequence with a 100ms delay between each card:

- Uses Framer Motion's `staggerContainer` and `staggerItem` variants
- Triggered by Intersection Observer when entering viewport
- Respects `prefers-reduced-motion` user preference

### Hover Lift

Cards lift up with shadow expansion on hover:

- Y-axis translation: -4px
- Box-shadow expands from `soft` to `softHover`
- Smooth 300ms transition with cubic-bezier easing

## Responsive Behavior

### Mobile (< 768px)
- Single column layout
- Full-width cards
- Touch-optimized spacing
- Vertical stacking

### Tablet (768px - 1024px)
- Two-column grid
- Adjusted spacing
- Hybrid layouts

### Desktop (> 1024px)
- Auto-fit grid (min 280px per card)
- Maximum container width: 1440px
- Optimal spacing for large screens

## Accessibility

- **ARIA Labels**: Each card has descriptive aria-label
- **Keyboard Navigation**: All cards are keyboard accessible
- **Focus Indicators**: Visible focus states
- **Screen Reader**: Proper semantic HTML structure
- **Reduced Motion**: Respects prefers-reduced-motion preference

## Analytics

Partner type selection is tracked with the following event:

```javascript
{
  event: 'partner_type_click',
  partnerType: 'agent', // or 'developer', 'bank', etc.
  location: 'partner_selection',
  href: '/advertise/agents',
  timestamp: '2024-01-01T00:00:00.000Z'
}
```

## Testing

Property-based tests verify:

1. **Card Completeness**: Each card contains icon, title, benefit, and CTA
2. **Navigation**: Cards navigate to correct URLs
3. **Hover Interaction**: Cards have proper hover styling
4. **Semantic Structure**: Proper HTML structure and accessibility

Run tests:
```bash
npm test -- PartnerTypeCard.property.test.tsx
```

## Requirements Validated

- **2.1**: Five distinct partner type cards displayed
- **2.2**: Each card shows icon, title, benefit, and CTA
- **2.3**: Cards navigate to sub-landing pages on click
- **2.4**: Hover lift animation with shadow expansion
- **2.5**: Mobile-optimized vertical stacking

## Demo

View the demo page at `/partner-selection-demo` to see:
- All five partner types
- Staggered animations
- Hover interactions
- Responsive layouts
- Accessibility features

