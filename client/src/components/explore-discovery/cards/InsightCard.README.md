# InsightCard Component

## Overview

The `InsightCard` component displays market insights, price analysis, investment tips, and area spotlights with modern design, accent colors, and smooth micro-interactions.

## Features

✅ **Modern Design**: Uses ModernCard base with subtle shadows and clean layout
✅ **Accent Colors**: Type-specific color schemes for visual hierarchy
✅ **Micro-interactions**: Smooth hover effects, animated icons, and pulsing arrows
✅ **Glass Effects**: Backdrop blur on icon containers and badges
✅ **Progressive Loading**: Smooth image loading with skeleton states
✅ **Accessibility**: Proper ARIA labels and keyboard navigation via ModernCard

## Design Tokens Used

- **Colors**: Accent gradients (emerald, blue, purple, orange)
- **Shadows**: `shadow-md` → `shadow-hover` on hover
- **Border Radius**: `rounded-lg` for modern card style
- **Transitions**: 200ms for micro-interactions, 500ms for image zoom

## Props

```typescript
interface InsightCardProps {
  insight: {
    id: number;
    title: string;
    description: string;
    imageUrl?: string;
    insightType: 'market-trend' | 'price-analysis' | 'investment-tip' | 'area-spotlight';
    data?: {
      value: string;      // Main metric (e.g., "R 2.5M")
      change?: number;    // Percentage change (e.g., 12.5)
      label?: string;     // Context label (e.g., "Average price")
    };
  };
  onClick: () => void;
}
```

## Insight Types & Colors

### Market Trend
- **Gradient**: Emerald to Green
- **Icon**: TrendingUp
- **Use**: Market trends, growth indicators

### Price Analysis
- **Gradient**: Blue to Indigo
- **Icon**: BarChart3
- **Use**: Price statistics, market analysis

### Investment Tip
- **Gradient**: Purple to Pink
- **Icon**: Lightbulb
- **Use**: Investment advice, tips

### Area Spotlight
- **Gradient**: Orange to Red
- **Icon**: MapPin
- **Use**: Location highlights, area features

## Micro-interactions

1. **Icon Hover**: Scale 1.1 + 5° rotation
2. **Badge**: Fade in from right with 0.1s delay
3. **Data Display**: Fade in from bottom with 0.15s delay
4. **Change Indicator**: Slides right 2px on hover
5. **Image**: Scales to 1.05 on hover (500ms smooth)
6. **Arrow**: Continuous pulse animation (0 → 4px → 0)
7. **Title**: Color transition to indigo on card hover

## Usage Example

```tsx
import { InsightCard } from '@/components/explore-discovery/cards/InsightCard';

function InsightsFeed() {
  const insights = [
    {
      id: 1,
      title: 'Sandton Property Prices Rising',
      description: 'Average property prices in Sandton have increased by 12.5% over the past quarter...',
      insightType: 'market-trend',
      data: {
        value: 'R 2.5M',
        change: 12.5,
        label: 'Average price',
      },
      imageUrl: '/images/sandton-skyline.jpg',
    },
    {
      id: 2,
      title: 'Best Time to Invest in Cape Town',
      description: 'Market analysis suggests Q2 2024 is optimal for Cape Town investments...',
      insightType: 'investment-tip',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {insights.map((insight) => (
        <InsightCard
          key={insight.id}
          insight={insight}
          onClick={() => console.log('Insight clicked:', insight.id)}
        />
      ))}
    </div>
  );
}
```

## Accessibility

- Uses `ModernCard` with proper `role="button"` and `tabIndex={0}`
- Keyboard navigation: Enter/Space to activate
- Descriptive alt text for images
- High contrast text on gradient backgrounds
- Smooth focus indicators via ModernCard

## Performance

- Lazy loading for images with `loading="lazy"`
- Progressive image loading with skeleton state
- Optimized animations with Framer Motion
- Respects `prefers-reduced-motion` via animation library

## Requirements Validation

✅ **Requirement 1.2**: Uses modern design with consistent design tokens
✅ **Requirement 9.3**: Implements micro-interactions (icon rotation, arrow pulse, hover effects)

## Related Components

- `ModernCard` - Base card component
- `PropertyCard` - Similar card for properties
- `NeighbourhoodCard` - Similar card for neighbourhoods
- `VideoCard` - Similar card for videos
