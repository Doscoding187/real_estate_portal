# Explore Discovery Engine - Filtering System Quick Reference

## Overview

The dynamic filtering system allows users to refine property searches across all Explore views with intelligent property type detection and multi-view synchronization.

## Hook Usage

```typescript
import { usePropertyFilters } from '@/hooks/usePropertyFilters';

const {
  filters,                      // Current filter state
  setPropertyType,              // Change property type
  updateCommonFilters,          // Update price/location
  updateResidentialFilters,     // Update residential filters
  updateDevelopmentFilters,     // Update development filters
  updateLandFilters,            // Update land filters
  clearFilters,                 // Clear all filters
  clearTypeFilters,             // Clear type-specific only
  getFilterCount,               // Get active filter count
  hasActiveFilters,             // Check if any filters active
} = usePropertyFilters();
```

## Filter Types

### Property Types
- `all` - All properties (default)
- `residential` - Residential properties
- `development` - New developments
- `land` - Land parcels

### Common Filters (All Types)
```typescript
{
  priceMin?: number;
  priceMax?: number;
  location?: string;
}
```

### Residential Filters
```typescript
{
  beds?: number[];              // [1, 2, 3, 4, 5]
  baths?: number[];             // [1, 2, 3, 4]
  parking?: number[];           // [1, 2, 3, 4]
  securityLevel?: string[];     // ['Basic', 'Standard', 'High', 'Maximum']
  petFriendly?: boolean;
  furnished?: boolean;
}
```

### Development Filters
```typescript
{
  launchStatus?: string[];      // ['Pre-Launch', 'Launching Soon', 'Now Selling', 'Final Phase']
  phase?: string[];             // ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4']
  unitConfigurations?: string[]; // ['Studio', '1 Bed', '2 Bed', '3 Bed', '4+ Bed', 'Penthouse']
  developerOffers?: boolean;
}
```

### Land Filters
```typescript
{
  zoning?: string[];            // ['Residential', 'Commercial', 'Industrial', 'Agricultural', 'Mixed Use']
  utilities?: string[];         // ['Water', 'Electricity', 'Sewage', 'Gas', 'Fiber Internet']
  sizeMin?: number;             // Square meters
  sizeMax?: number;             // Square meters
  surveyStatus?: string[];      // ['Surveyed', 'Not Surveyed', 'Survey in Progress']
}
```

## Component Integration

### FilterPanel Component
```typescript
import { FilterPanel } from '@/components/explore-discovery/FilterPanel';

<FilterPanel
  isOpen={showFilters}
  onClose={() => setShowFilters(false)}
  propertyType={filters.propertyType}
  onPropertyTypeChange={setPropertyType}
  priceMin={filters.priceMin}
  priceMax={filters.priceMax}
  onPriceChange={(min, max) => updateCommonFilters({ priceMin: min, priceMax: max })}
  residentialFilters={filters.residential}
  onResidentialFiltersChange={updateResidentialFilters}
  developmentFilters={filters.development}
  onDevelopmentFiltersChange={updateDevelopmentFilters}
  landFilters={filters.land}
  onLandFiltersChange={updateLandFilters}
  filterCount={getFilterCount()}
  onClearAll={clearFilters}
/>
```

## Usage Examples

### Example 1: Basic Filter Button
```typescript
<button onClick={() => setShowFilters(true)}>
  <Filter className="w-5 h-5" />
  {getFilterCount() > 0 && (
    <span className="badge">{getFilterCount()}</span>
  )}
</button>
```

### Example 2: Update Price Range
```typescript
updateCommonFilters({
  priceMin: 500000,
  priceMax: 1000000
});
```

### Example 3: Update Residential Filters
```typescript
updateResidentialFilters({
  beds: [2, 3],
  baths: [2],
  petFriendly: true
});
```

### Example 4: Change Property Type
```typescript
// Automatically clears type-specific filters
setPropertyType('development');
```

### Example 5: Clear All Filters
```typescript
clearFilters(); // Resets to default state
```

## Multi-View Synchronization

All three Explore views automatically sync with the same filter state:

1. **ExploreHome** (Discovery Cards)
   - Floating filter button (bottom-right)
   - Filters apply to card feed

2. **ExploreDiscovery** (Video Feed)
   - Header filter button (top-right)
   - Filters apply to video feed

3. **ExploreMap** (Map Hybrid View)
   - Inline filter button (header)
   - Filters apply to map markers and feed

## Session Persistence

Filters are automatically saved to `sessionStorage`:
- Persists across page navigation
- Survives page refresh
- Cleared when browser closes
- Storage key: `explore_property_filters`

## Filter Count Logic

The filter count includes:
- Property type (if not 'all')
- Price min/max (each counts as 1)
- Location (if set)
- All active type-specific filters

Example counts:
- Property type + 2 beds + pet-friendly = 3 filters
- Price range (min+max) + 3 bed + 2 bath = 4 filters

## API Integration (Future)

Convert filters to query parameters:
```typescript
const queryParams = {
  propertyType: filters.propertyType,
  priceMin: filters.priceMin,
  priceMax: filters.priceMax,
  ...filters.residential,
  ...filters.development,
  ...filters.land,
};
```

## Styling

### Filter Button States
- **Default**: Gray background
- **Active**: Blue background with count badge
- **Hover**: Darker shade
- **Badge**: Red circle with white text

### Panel States
- **Open**: Slides in from right
- **Backdrop**: Black with 50% opacity + blur
- **Scrollable**: Content area scrolls
- **Sticky**: Header and footer fixed

## Accessibility

- All buttons have `aria-label`
- Keyboard navigation supported
- Focus management on open/close
- Screen reader friendly
- Proper heading hierarchy

## Performance

- Memoized callbacks prevent re-renders
- SessionStorage for persistence (no API calls)
- Efficient filter count calculation
- Lazy loading of filter sections

## Troubleshooting

### Filters not persisting
- Check browser sessionStorage is enabled
- Verify storage key: `explore_property_filters`
- Check for storage quota errors in console

### Filters not syncing across views
- Ensure all views use `usePropertyFilters()` hook
- Check that filter state is passed to components
- Verify no local state overrides

### Filter count incorrect
- Check `getFilterCount()` logic
- Verify all filter types are counted
- Ensure undefined values don't count

## Best Practices

1. **Always use the hook**: Don't manage filter state locally
2. **Pass filters to API**: Use the filter object for backend queries
3. **Show filter count**: Always display active filter count
4. **Provide clear action**: Make "Clear all" easily accessible
5. **Validate inputs**: Check min < max for ranges
6. **Handle errors**: Gracefully handle storage failures

## Future Enhancements

- [ ] Saved filter presets
- [ ] Smart filter suggestions
- [ ] Filter analytics
- [ ] Slider inputs for ranges
- [ ] Location autocomplete
- [ ] URL-based filter sharing
- [ ] Filter history
- [ ] Popular filter combinations

---

**Version**: 1.0  
**Last Updated**: December 6, 2024  
**Status**: Production Ready ✅
