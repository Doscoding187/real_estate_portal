# FilterPanel Component

Modern filter panel with Zustand integration and Airbnb-inspired chip-style filters.

## Overview

The FilterPanel component has been refactored to:
- ✅ Integrate with Zustand filter store for global state management
- ✅ Use modern chip-style filters (MicroPill component)
- ✅ Apply subtle shadows instead of heavy neumorphism
- ✅ Implement clear Apply and Reset buttons
- ✅ Add smooth animations with Framer Motion
- ✅ Maintain accessibility with proper ARIA labels

## Requirements

**Validates:** Requirements 4.3, 4.4

## Features

### 1. Zustand Integration
- Automatically syncs with global filter state
- Persists filters to localStorage
- Shared across all Explore pages (Home, Feed, Shorts, Map)

### 2. Modern Chip-Style Filters
- Uses MicroPill component for property type, bedrooms, and bathrooms
- Smooth selection animations
- High contrast for readability
- Keyboard accessible

### 3. Subtle Modern Design
- Subtle shadows (2-4px) instead of heavy neumorphism
- Clean, modern layout inspired by Airbnb
- Glass overlay backdrop with blur effect
- Smooth slide-in animation

### 4. Clear Actions
- **Apply Filters** button with accent gradient and check icon
- **Reset All Filters** button (only shown when filters are active)
- Filter count indicator in header
- Smooth transitions and feedback

## Usage

```tsx
import { useState } from 'react';
import { FilterPanel } from '@/components/explore-discovery/FilterPanel';
import { useExploreFiltersStore } from '@/store/exploreFiltersStore';

function MyComponent() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { getFilterCount } = useExploreFiltersStore();

  const handleApplyFilters = () => {
    // Trigger data fetch with current filter state
    console.log('Filters applied!');
  };

  return (
    <>
      <button onClick={() => setIsFilterOpen(true)}>
        Filters ({getFilterCount()})
      </button>

      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={handleApplyFilters}
      />
    </>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls panel visibility |
| `onClose` | `() => void` | Yes | Called when panel should close |
| `onApply` | `() => void` | No | Called when Apply button is clicked |

## Filter State

The component reads from and writes to the Zustand store:

```typescript
const {
  propertyType,      // 'residential' | 'development' | 'land' | null
  priceMin,          // number | null
  priceMax,          // number | null
  bedrooms,          // number | null
  bathrooms,         // number | null
  categoryId,        // number | null
  location,          // string | null
  setPropertyType,   // (type: string | null) => void
  setPriceRange,     // (min: number | null, max: number | null) => void
  setBedrooms,       // (count: number | null) => void
  setBathrooms,      // (count: number | null) => void
  setCategoryId,     // (id: number | null) => void
  setLocation,       // (location: string | null) => void
  clearFilters,      // () => void
  getFilterCount,    // () => number
} = useExploreFiltersStore();
```

## Design Tokens

The component uses design tokens from `@/lib/design-tokens`:

- **Shadows:** `sm`, `md`, `accent`, `accentHover`, `2xl`
- **Colors:** `accent.primary`, `accent.gradient`
- **Transitions:** Smooth spring animations for panel slide-in

## Accessibility

- ✅ Keyboard navigation support
- ✅ Proper ARIA labels on all interactive elements
- ✅ Focus indicators on all buttons and inputs
- ✅ Screen reader friendly
- ✅ Escape key closes panel

## Animations

- **Panel Entry:** Smooth slide-in from right with spring animation
- **Backdrop:** Fade in/out with blur effect
- **Buttons:** Scale on hover (1.05) and tap (0.98)
- **Chips:** Smooth selection state transitions

## Migration from Old API

### Before (Old API)
```tsx
<FilterPanel
  isOpen={isOpen}
  onClose={onClose}
  propertyType={propertyType}
  onPropertyTypeChange={setPropertyType}
  priceMin={priceMin}
  priceMax={priceMax}
  onPriceChange={setPriceRange}
  residentialFilters={residentialFilters}
  onResidentialFiltersChange={setResidentialFilters}
  developmentFilters={developmentFilters}
  onDevelopmentFiltersChange={setDevelopmentFilters}
  landFilters={landFilters}
  onLandFiltersChange={setLandFilters}
  filterCount={filterCount}
  onClearAll={clearFilters}
/>
```

### After (New API)
```tsx
<FilterPanel
  isOpen={isOpen}
  onClose={onClose}
  onApply={handleApply}
/>
```

All filter state is now managed by Zustand! 🎉

## Related Components

- `MicroPill` - Chip-style filter buttons
- `IconButton` - Modern icon buttons
- `useExploreFiltersStore` - Zustand filter store
- `useFilterUrlSync` - URL synchronization hook

## Example

See `FilterPanel.example.tsx` for a complete working example.
