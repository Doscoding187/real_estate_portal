# QuickFilters Component

## Overview

The `QuickFilters` component provides preset filter buttons for common South African property searches. It enables users to quickly apply popular filter combinations with a single click.

## Features

- **SA-Specific Presets**: Pet-Friendly, Fibre Ready, Sectional Title, Under R2M, Security Estate
- **Active State Styling**: Visual feedback showing which filters are currently active
- **Icon-Based Indicators**: Each preset has a relevant icon for quick recognition
- **Toggle Behavior**: Clicking an active filter deactivates it
- **Responsive Layout**: Wraps gracefully on smaller screens

## Usage

```tsx
import { QuickFilters } from '@/components/property-results/QuickFilters';
import { usePropertyFiltersStore } from '@/store/propertyFiltersStore';

function PropertyResultsPage() {
  const { filters, setFilters } = usePropertyFiltersStore();
  
  return (
    <QuickFilters
      activeFilters={filters}
      onFilterSelect={(newFilters) => setFilters(newFilters)}
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onFilterSelect` | `(filters: Partial<PropertyFilters>) => void` | Yes | Callback when a preset is selected |
| `activeFilters` | `PropertyFilters` | Yes | Current active filters to determine preset state |
| `className` | `string` | No | Additional CSS classes |

## Quick Filter Presets

### Pet-Friendly
- **Filter**: `petFriendly: true`
- **Icon**: Heart
- **Use Case**: Find properties that allow pets

### Fibre Ready
- **Filter**: `fibreReady: true`
- **Icon**: Wifi
- **Use Case**: Find properties with fibre internet connectivity

### Sectional Title
- **Filter**: `titleType: ['sectional']`
- **Icon**: Home
- **Use Case**: Find properties in complexes with shared ownership

### Under R2M
- **Filter**: `maxPrice: 2000000`
- **Icon**: Zap
- **Use Case**: Find affordable properties under R2 million

### Security Estate
- **Filter**: `securityEstate: true`
- **Icon**: Shield
- **Use Case**: Find properties in secure estates

## Behavior

1. **Activation**: Clicking an inactive preset applies its filters
2. **Deactivation**: Clicking an active preset removes its filters
3. **Visual Feedback**: Active presets have primary styling with shadow
4. **Combination**: Multiple presets can be active simultaneously

## Testing

The component includes property-based tests to verify:
- Correct filter application for each preset
- Active state detection
- Toggle behavior (activate/deactivate)

See `QuickFilters.property.test.tsx` for test implementation.

## Requirements

Validates: **Requirements 2.2** - Quick filter preset application

## Accessibility

- Keyboard navigable (Tab key)
- Clear visual focus indicators
- Semantic button elements
- ARIA-compliant active states via data attributes
