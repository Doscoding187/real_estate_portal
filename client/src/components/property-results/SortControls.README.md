# SortControls Component

Sort dropdown and view mode toggle for the property results page.

## Features

- **Sort Dropdown**: Allows users to sort properties by:
  - Price: Low to High
  - Price: High to Low
  - Newest Listed
  - Oldest Listed
  - Suburb A-Z
  - Suburb Z-A

- **View Mode Toggle**: Switch between:
  - List View
  - Grid View
  - Map View

- **Persistence**: View mode preference is persisted to localStorage via the Zustand store

- **Accessibility**: Full keyboard navigation and ARIA labels

## Usage

### Basic Usage

```tsx
import { SortControls } from '@/components/property-results';
import { usePropertyFiltersStore } from '@/store/propertyFiltersStore';

function PropertyResultsPage() {
  const { sortOption, viewMode, setSortOption, setViewMode } = usePropertyFiltersStore();

  return (
    <SortControls
      sortOption={sortOption}
      viewMode={viewMode}
      onSortChange={setSortOption}
      onViewModeChange={setViewMode}
    />
  );
}
```

### With Store Integration

```tsx
import { SortControls, MobileViewModeSelector } from '@/components/property-results';
import { usePropertyFiltersStore } from '@/store/propertyFiltersStore';

function PropertyResultsHeader() {
  const { sortOption, viewMode, setSortOption, setViewMode } = usePropertyFiltersStore();

  return (
    <div className="flex flex-col gap-4">
      {/* Desktop controls */}
      <SortControls
        sortOption={sortOption}
        viewMode={viewMode}
        onSortChange={setSortOption}
        onViewModeChange={setViewMode}
      />
      
      {/* Mobile view mode selector */}
      <MobileViewModeSelector
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
    </div>
  );
}
```

### Customization

```tsx
// Hide view mode toggle
<SortControls
  sortOption={sortOption}
  viewMode={viewMode}
  onSortChange={setSortOption}
  onViewModeChange={setViewMode}
  showViewModeToggle={false}
/>

// Hide sort dropdown
<SortControls
  sortOption={sortOption}
  viewMode={viewMode}
  onSortChange={setSortOption}
  onViewModeChange={setViewMode}
  showSortDropdown={false}
/>
```

## Props

### SortControlsProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sortOption` | `SortOption` | required | Current sort option |
| `viewMode` | `ViewMode` | required | Current view mode |
| `onSortChange` | `(sort: SortOption) => void` | required | Callback when sort changes |
| `onViewModeChange` | `(mode: ViewMode) => void` | required | Callback when view mode changes |
| `showViewModeToggle` | `boolean` | `true` | Whether to show view mode toggle |
| `showSortDropdown` | `boolean` | `true` | Whether to show sort dropdown |
| `className` | `string` | `''` | Additional CSS classes |

## Types

```typescript
type SortOption = 
  | 'price_asc'
  | 'price_desc'
  | 'date_desc'
  | 'date_asc'
  | 'suburb_asc'
  | 'suburb_desc';

type ViewMode = 'list' | 'grid' | 'map';
```

## Requirements

- **Requirement 2.3**: Sort order support (Price, Newest, Suburb)
- **Requirement 3.1**: Grid view support
- **Requirement 3.4**: View mode filter preservation

## Test IDs

- `sort-controls` - Main container
- `view-mode-toggle` - Desktop view mode toggle group
- `view-mode-list` - List view button
- `view-mode-grid` - Grid view button
- `view-mode-map` - Map view button
- `sort-dropdown` - Sort dropdown trigger
- `sort-option-{value}` - Individual sort options
- `mobile-view-mode-toggle` - Mobile view mode toggle
- `mobile-view-mode-{value}` - Mobile view mode buttons
