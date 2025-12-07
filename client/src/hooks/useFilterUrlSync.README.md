# useFilterUrlSync Hook

A React hook that provides bidirectional synchronization between the Explore filters store and URL query parameters.

## Overview

The `useFilterUrlSync` hook automatically keeps your filter state in sync with the browser's URL, enabling:
- **Shareable URLs**: Users can share filtered views via URL
- **Browser history**: Back/forward buttons work with filter changes
- **Bookmarkable states**: Users can bookmark specific filter configurations
- **Deep linking**: Direct navigation to filtered views

## Features

- ✅ Bidirectional sync: Store ↔ URL
- ✅ Updates URL without page reload (uses `replaceState`)
- ✅ Reads URL params on mount and syncs to store
- ✅ Prevents infinite loops with intelligent tracking
- ✅ Preserves base path when updating query params
- ✅ Handles all filter types (property type, price, beds, baths, category, location)

## Installation

The hook is already set up. Just import and use:

```typescript
import { useFilterUrlSync } from '@/hooks/useFilterUrlSync';
```

## Usage

### Basic Usage

Simply call the hook once at the top level of your Explore page component:

```typescript
import { useFilterUrlSync } from '@/hooks/useFilterUrlSync';

function ExplorePage() {
  useFilterUrlSync(); // That's it!
  
  // Rest of your component...
  return <div>...</div>;
}
```

### Complete Example

```typescript
import { useFilterUrlSync } from '@/hooks/useFilterUrlSync';
import { useExploreFiltersStore } from '@/store/exploreFiltersStore';

function ExploreHome() {
  // Enable URL sync
  useFilterUrlSync();
  
  // Access filters from store
  const filters = useExploreFiltersStore();
  
  // Use filters in your API calls
  const { data: properties } = useQuery({
    queryKey: ['properties', filters],
    queryFn: () => fetchProperties(filters),
  });
  
  return (
    <div>
      <FilterPanel />
      <PropertyFeed properties={properties} />
    </div>
  );
}
```

## URL Parameter Mapping

The hook maps filter state to URL query parameters as follows:

| Filter State | URL Parameter | Example |
|--------------|---------------|---------|
| `propertyType` | `type` | `?type=residential` |
| `priceMin` | `minPrice` | `?minPrice=100000` |
| `priceMax` | `maxPrice` | `?maxPrice=500000` |
| `bedrooms` | `beds` | `?beds=3` |
| `bathrooms` | `baths` | `?baths=2` |
| `categoryId` | `category` | `?category=5` |
| `location` | `location` | `?location=Cape%20Town` |

### Example URLs

```
# Single filter
/explore?type=residential

# Multiple filters
/explore?type=residential&beds=3&baths=2

# Price range
/explore?minPrice=100000&maxPrice=500000

# Complete filter set
/explore?type=residential&minPrice=100000&maxPrice=500000&beds=3&baths=2&category=5&location=Cape%20Town
```

## How It Works

### 1. URL → Store (On Mount)

When the component mounts, the hook:
1. Reads URL query parameters
2. Parses them into filter values
3. Updates the filter store with these values

```typescript
// User navigates to: /explore?type=residential&beds=3
// Hook automatically sets:
// - propertyType: 'residential'
// - bedrooms: 3
```

### 2. Store → URL (On Change)

When filters change in the store, the hook:
1. Detects the change via useEffect
2. Builds new query parameters
3. Updates the URL using `replaceState` (no page reload)

```typescript
// User changes filter in UI
setPropertyType('residential');

// Hook automatically updates URL to:
// /explore?type=residential
```

### 3. Loop Prevention

The hook uses refs to track the last URL update and prevent infinite loops:
- `isInitialMount`: Ensures URL→Store sync only happens once
- `lastUrlUpdate`: Prevents redundant URL updates

## Integration with Other Pages

Use the hook on all Explore pages for consistent behavior:

```typescript
// ExploreHome.tsx
function ExploreHome() {
  useFilterUrlSync();
  // ...
}

// ExploreFeed.tsx
function ExploreFeed() {
  useFilterUrlSync();
  // ...
}

// ExploreShorts.tsx
function ExploreShorts() {
  useFilterUrlSync();
  // ...
}

// ExploreMap.tsx
function ExploreMap() {
  useFilterUrlSync();
  // ...
}
```

## Best Practices

### 1. Call Once Per Page

Only call `useFilterUrlSync()` once at the top level of each page:

```typescript
// ✅ Good
function ExplorePage() {
  useFilterUrlSync();
  return <div>...</div>;
}

// ❌ Bad - Don't call in multiple components
function ExplorePage() {
  useFilterUrlSync();
  return (
    <div>
      <FilterPanel /> {/* Don't call here */}
      <PropertyFeed /> {/* Don't call here */}
    </div>
  );
}
```

### 2. Use with Filter Store

Always use in conjunction with the filter store:

```typescript
import { useFilterUrlSync } from '@/hooks/useFilterUrlSync';
import { useExploreFiltersStore } from '@/store/exploreFiltersStore';

function ExplorePage() {
  useFilterUrlSync();
  const filters = useExploreFiltersStore();
  
  // Use filters...
}
```

### 3. Handle Initial Load

The hook automatically handles initial URL params, so you don't need to:

```typescript
// ✅ Good - Hook handles it
function ExplorePage() {
  useFilterUrlSync();
  const filters = useExploreFiltersStore();
  // filters will already be populated from URL
}

// ❌ Bad - Don't manually parse URL
function ExplorePage() {
  useFilterUrlSync();
  const params = new URLSearchParams(window.location.search); // Unnecessary
}
```

## Testing

The hook includes comprehensive unit tests covering:
- URL → Store sync on mount
- Store → URL sync on changes
- Bidirectional sync scenarios
- Edge cases (invalid params, empty strings, etc.)
- Loop prevention

Run tests with:
```bash
npm test useFilterUrlSync
```

## Requirements

- **Requirement 4.2:** Filter state reflected in URL ✅
- **Requirement 11.7:** URL query sync ✅

## Related Files

- `client/src/store/exploreFiltersStore.ts` - Filter state store
- `client/src/components/explore-discovery/FilterPanel.tsx` (Task 13) - Filter UI
- All Explore pages (Tasks 24-27) - Pages using this hook

## Troubleshooting

### Filters not syncing to URL

Make sure you're calling the hook at the top level:
```typescript
function ExplorePage() {
  useFilterUrlSync(); // Must be here
  // ...
}
```

### URL not updating on filter change

Check that you're using the filter store actions:
```typescript
const { setPropertyType } = useExploreFiltersStore();
setPropertyType('residential'); // This will trigger URL update
```

### Infinite loop errors

This shouldn't happen due to built-in loop prevention, but if it does:
1. Check you're only calling the hook once per page
2. Verify you're not manually updating the URL elsewhere
3. Check the console for error messages

## Performance

The hook is optimized for performance:
- Uses `replaceState` instead of `pushState` (no history pollution)
- Tracks dependencies precisely to minimize re-renders
- Uses refs to prevent unnecessary updates
- Only updates URL when values actually change

## Browser Compatibility

Works in all modern browsers that support:
- `URLSearchParams` API
- `window.history.replaceState`
- React hooks

Supported browsers:
- Chrome 49+
- Firefox 44+
- Safari 10.1+
- Edge 14+
