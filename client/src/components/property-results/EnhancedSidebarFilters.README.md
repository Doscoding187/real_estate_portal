# Enhanced Sidebar Filters

SA-specific property filter panel for the property results page.

## Features

### SA-Specific Filters
- **Title Type**: Freehold or Sectional Title selection
- **Levy Range**: Monthly levy slider for sectional title properties
- **Security Estate**: Checkbox for gated communities
- **Pet-Friendly**: Checkbox for pet-friendly properties
- **Fibre-Ready**: Checkbox for fibre internet availability
- **Load-Shedding Solutions**: Solar, Generator, Inverter checkboxes
- **Erf Size**: Land size range slider (m²)
- **Floor Size**: Building size range slider (m²)

### Standard Filters
- Budget/Price range
- Property type (House, Apartment, Townhouse, Plot, Commercial)
- Number of bedrooms

## Components

### EnhancedSidebarFilters
Desktop sidebar filter panel with accordion sections.

```tsx
import { EnhancedSidebarFilters } from '@/components/property-results';

<EnhancedSidebarFilters
  filters={filters}
  onFilterChange={handleFilterChange}
  onSaveSearch={handleSaveSearch}
  resultCount={123}
/>
```

### MobileFilterBottomSheet
Mobile-optimized bottom sheet with drag-to-close.

```tsx
import { MobileFilterBottomSheet } from '@/components/property-results';

<MobileFilterBottomSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  filters={filters}
  onFilterChange={handleFilterChange}
  onApply={handleApply}
  resultCount={123}
/>
```

### ResponsiveFilterPanel
Auto-switching component that renders sidebar on desktop and bottom sheet on mobile.

```tsx
import { ResponsiveFilterPanel } from '@/components/property-results';

<ResponsiveFilterPanel
  filters={filters}
  onFilterChange={handleFilterChange}
  onSaveSearch={handleSaveSearch}
  resultCount={123}
/>
```

## Requirements Implemented

- **2.1**: Mobile filter bottom sheet with smooth animation
- **8.1**: Mobile-optimized filter experience
- **16.5**: SA-specific filter options (Fibre Ready, Pet-Friendly, Security Estate, Load-Shedding Solutions)

## Props

### EnhancedSidebarFiltersProps
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| filters | PropertyFilters | Yes | Current filter state |
| onFilterChange | (filters: PropertyFilters) => void | Yes | Filter change handler |
| onSaveSearch | () => void | No | Save search handler |
| resultCount | number | No | Number of matching results |
| className | string | No | Additional CSS classes |

### MobileFilterBottomSheetProps
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| isOpen | boolean | Yes | Whether sheet is open |
| onClose | () => void | Yes | Close handler |
| filters | PropertyFilters | Yes | Current filter state |
| onFilterChange | (filters: PropertyFilters) => void | Yes | Filter change handler |
| onApply | () => void | No | Apply filters handler |
| resultCount | number | No | Number of matching results |

## Accessibility

- Focus trap in mobile bottom sheet
- Escape key closes bottom sheet
- ARIA labels on all interactive elements
- Keyboard navigation support
- Touch-friendly targets (44x44px minimum)
