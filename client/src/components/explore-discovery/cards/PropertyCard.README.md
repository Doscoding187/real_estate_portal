# PropertyCard Component

## Overview

The `PropertyCard` component is a modern, polished card for displaying property listings in the Explore feature. It uses the `ModernCard` component as its base to ensure consistent design system integration.

## Features

- ✅ **Modern Design**: Subtle shadows and clean aesthetics (Requirements 1.2)
- ✅ **Hover Animation**: 2px lift on hover (Requirements 9.1)
- ✅ **Press Animation**: Scale 0.98 on press (Requirements 9.2)
- ✅ **High Contrast**: Optimized text colors for readability (Requirements 1.2)
- ✅ **Progressive Loading**: Smooth image loading with skeleton state
- ✅ **Save Integration**: Built-in save button functionality
- ✅ **Accessibility**: Proper ARIA labels and semantic HTML

## Design Tokens Used

The component uses design tokens from `@/lib/design-tokens`:

- **Text Colors**: 
  - Primary: `#1f2937` (high contrast for price and title)
  - Secondary: `#6b7280` (good contrast for location)
- **Shadows**: Subtle modern shadows via ModernCard
- **Transitions**: 300ms cubic-bezier for smooth animations
- **Border Radius**: 1rem (16px) for modern look

## Props

```typescript
interface PropertyCardProps {
  property: {
    id: number;
    title: string;
    price: number;
    priceMax?: number;
    location: string;
    beds?: number;
    baths?: number;
    size?: number;
    imageUrl: string;
    propertyType: string;
    isSaved?: boolean;
  };
  onClick: () => void;
  onSave: () => void;
}
```

## Usage Example

```tsx
import { PropertyCard } from '@/components/explore-discovery/cards/PropertyCard';

function PropertyList() {
  const handleClick = (propertyId: number) => {
    console.log('Property clicked:', propertyId);
  };

  const handleSave = (propertyId: number) => {
    console.log('Property saved:', propertyId);
  };

  return (
    <PropertyCard
      property={{
        id: 1,
        title: "Modern 3-Bedroom Apartment in Sandton",
        price: 2500000,
        priceMax: 2800000,
        location: "Sandton, Johannesburg",
        beds: 3,
        baths: 2,
        size: 120,
        imageUrl: "https://example.com/property.jpg",
        propertyType: "Apartment",
        isSaved: false,
      }}
      onClick={() => handleClick(1)}
      onSave={() => handleSave(1)}
    />
  );
}
```

## Animations

### Hover State
- **Transform**: `translateY(-2px)` and `scale(1.01)`
- **Duration**: 200ms
- **Easing**: ease-out
- **Shadow**: Increases from `md` to `hover`

### Press State
- **Transform**: `scale(0.98)`
- **Duration**: 150ms
- **Easing**: ease-out

### Image Zoom
- **Transform**: `scale(1.05)` on hover
- **Duration**: 500ms
- **Easing**: ease-out

## Accessibility

- Uses semantic `<article>` element via ModernCard
- Includes descriptive `aria-label` with property details
- Keyboard navigable (Enter/Space to activate)
- Focus indicators provided by ModernCard
- High contrast text for WCAG AA compliance

## Integration with Design System

The PropertyCard integrates seamlessly with the Hybrid Modern + Soft UI design system:

1. **ModernCard Base**: Inherits all modern card behaviors
2. **Design Tokens**: Uses centralized color and spacing tokens
3. **Consistent Animations**: Follows design system animation patterns
4. **Accessibility**: Meets design system accessibility standards

## Performance

- **Lazy Loading**: Images use `loading="lazy"` attribute
- **Progressive Enhancement**: Shows skeleton while image loads
- **Optimized Animations**: Uses CSS transforms for 60fps performance
- **Efficient Re-renders**: Memoization-friendly component structure

## Requirements Validation

- ✅ **1.2**: Modern card design with subtle shadow
- ✅ **9.1**: Hover lift animation (2px translateY)
- ✅ **9.2**: Press state animation (scale 0.98)
- ✅ **1.2**: High contrast for readability

## Related Components

- `ModernCard`: Base card component
- `SaveButton`: Save functionality
- `PropertyCardSkeleton`: Loading state
- `DiscoveryCardFeed`: Parent feed component

## Testing

The component has been validated for:
- TypeScript type safety
- Integration with existing feed components
- No diagnostic errors
- Compatibility with all parent components

## Migration Notes

### Changes from Previous Version

1. **Base Component**: Now uses `ModernCard` instead of plain `div`
2. **Animations**: Hover/press animations now handled by ModernCard
3. **Design Tokens**: Text colors now use design token values
4. **Accessibility**: Added semantic HTML and ARIA labels
5. **Contrast**: Improved text contrast for better readability

### Breaking Changes

None - the component interface remains fully compatible with existing usage.

## Future Enhancements

Potential improvements for future iterations:
- Add skeleton state integration
- Support for video thumbnails
- Enhanced property badges
- Favorite animation feedback
- Share functionality
