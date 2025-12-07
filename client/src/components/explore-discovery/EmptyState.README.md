# EmptyState Component

A comprehensive empty state component system for the Explore feature, providing user-friendly feedback when no content is available.

## Overview

The EmptyState component displays meaningful messages and suggested actions when users encounter empty states, such as no search results, missing location permissions, or offline status.

## Features

- ✅ **7 Pre-configured States**: No results, no location, offline, no saved items, no followed items, no content, no filter matches
- ✅ **Modern Design**: Follows Hybrid Modern + Soft UI design system
- ✅ **Smooth Animations**: Framer Motion animations with spring physics
- ✅ **Accessible**: Proper ARIA labels and keyboard navigation
- ✅ **Flexible**: Multiple variants (full, card, inline)
- ✅ **Customizable**: Override titles, descriptions, and action labels
- ✅ **Responsive**: Works on mobile and desktop

## Components

### EmptyState (Main Component)

The primary empty state component with full features.

```tsx
import { EmptyState } from '@/components/explore-discovery/EmptyState';

function MyComponent() {
  return (
    <EmptyState
      type="noResults"
      onAction={() => clearFilters()}
      onSecondaryAction={() => browseAll()}
    />
  );
}
```

### EmptyStateCard

EmptyState wrapped in a ModernCard for use within other components.

```tsx
import { EmptyStateCard } from '@/components/explore-discovery/EmptyState';

function MyComponent() {
  return (
    <EmptyStateCard
      type="noSavedProperties"
      onAction={() => navigate('/explore')}
      cardClassName="max-w-lg mx-auto"
    />
  );
}
```

### InlineEmptyState

Compact empty state for inline use within lists or grids.

```tsx
import { InlineEmptyState } from '@/components/explore-discovery/EmptyState';

function MyList() {
  return (
    <div>
      {items.length === 0 && (
        <InlineEmptyState
          message="No items to display"
          actionLabel="Add Item"
          onAction={() => openAddDialog()}
        />
      )}
    </div>
  );
}
```

## Empty State Types

### `noResults`
- **Use Case**: Search or filter returns no results
- **Icon**: Search
- **Actions**: Clear Filters, Browse All
- **Color**: Blue

### `noLocation`
- **Use Case**: Location permission not granted
- **Icon**: MapPin
- **Actions**: Enable Location, Search Manually
- **Color**: Green

### `offline`
- **Use Case**: No internet connection
- **Icon**: WifiOff
- **Actions**: Retry Connection, View Cached Content
- **Color**: Orange

### `noSavedProperties`
- **Use Case**: User hasn't saved any properties
- **Icon**: Heart
- **Actions**: Explore Properties
- **Color**: Pink

### `noFollowedItems`
- **Use Case**: User isn't following anyone
- **Icon**: Users
- **Actions**: Discover Creators
- **Color**: Purple

### `noContent`
- **Use Case**: Generic empty state
- **Icon**: Compass
- **Actions**: Go to Home
- **Color**: Indigo

### `noFiltersMatch`
- **Use Case**: Active filters exclude all results
- **Icon**: Filter
- **Actions**: Reset Filters, Adjust Filters
- **Color**: Teal

## Props

### EmptyState Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `EmptyStateType` | Required | The type of empty state to display |
| `onAction` | `() => void` | `undefined` | Handler for primary action button |
| `onSecondaryAction` | `() => void` | `undefined` | Handler for secondary action button |
| `className` | `string` | `''` | Additional CSS classes |
| `compact` | `boolean` | `false` | Use compact sizing |
| `customTitle` | `string` | `undefined` | Override default title |
| `customDescription` | `string` | `undefined` | Override default description |
| `customActionLabel` | `string` | `undefined` | Override default action label |

### EmptyStateCard Props

Extends `EmptyStateProps` with:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `cardClassName` | `string` | `''` | Additional CSS classes for the card |

### InlineEmptyState Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `LucideIcon` | `Search` | Custom icon component |
| `message` | `string` | Required | Message to display |
| `actionLabel` | `string` | `undefined` | Label for action button |
| `onAction` | `() => void` | `undefined` | Handler for action button |
| `className` | `string` | `''` | Additional CSS classes |

## Usage Examples

### Basic Usage

```tsx
import { EmptyState } from '@/components/explore-discovery/EmptyState';

function SearchResults({ results, onClearFilters }) {
  if (results.length === 0) {
    return (
      <EmptyState
        type="noResults"
        onAction={onClearFilters}
      />
    );
  }

  return <ResultsList results={results} />;
}
```

### Custom Messages

```tsx
<EmptyState
  type="noContent"
  customTitle="No properties in this area"
  customDescription="Try expanding your search radius or exploring nearby neighborhoods."
  customActionLabel="Expand Search"
  onAction={() => expandSearchRadius()}
/>
```

### Compact Mode

```tsx
<EmptyState
  type="noSavedProperties"
  compact
  onAction={() => navigate('/explore')}
/>
```

### With Card Wrapper

```tsx
<EmptyStateCard
  type="offline"
  onAction={() => window.location.reload()}
  cardClassName="shadow-lg"
/>
```

### Inline in List

```tsx
function PropertyList({ properties }) {
  return (
    <div className="space-y-4">
      {properties.length === 0 ? (
        <InlineEmptyState
          message="No properties match your criteria"
          actionLabel="Clear Filters"
          onAction={() => clearFilters()}
        />
      ) : (
        properties.map(property => (
          <PropertyCard key={property.id} property={property} />
        ))
      )}
    </div>
  );
}
```

### With useEmptyState Hook

```tsx
import { useEmptyState, EmptyState } from '@/components/explore-discovery/EmptyState';

function MyComponent() {
  const { data, isLoading, error } = useQuery('properties');
  const { showEmpty, emptyType } = useEmptyState(
    data?.length > 0,
    isLoading,
    error
  );

  if (showEmpty && emptyType) {
    return (
      <EmptyState
        type={emptyType}
        onAction={() => refetch()}
      />
    );
  }

  return <PropertyList properties={data} />;
}
```

### Conditional Actions

```tsx
function SavedProperties({ savedItems, onExplore }) {
  return (
    <div>
      {savedItems.length === 0 ? (
        <EmptyState
          type="noSavedProperties"
          onAction={onExplore}
          // No secondary action
        />
      ) : (
        <SavedItemsList items={savedItems} />
      )}
    </div>
  );
}
```

## Integration with Explore Pages

### ExploreHome

```tsx
import { EmptyState } from '@/components/explore-discovery/EmptyState';

function ExploreHome() {
  const { contentBlocks, isLoading } = useDiscoveryFeed();

  if (!isLoading && contentBlocks.length === 0) {
    return (
      <EmptyState
        type="noContent"
        onAction={() => navigate('/explore/feed')}
      />
    );
  }

  return <DiscoveryCardFeed contentBlocks={contentBlocks} />;
}
```

### ExploreFeed with Filters

```tsx
function ExploreFeed() {
  const filters = useExploreFiltersStore();
  const { properties } = usePropertyFeed(filters);
  const hasActiveFilters = filters.getFilterCount() > 0;

  if (properties.length === 0) {
    return (
      <EmptyState
        type={hasActiveFilters ? 'noFiltersMatch' : 'noResults'}
        onAction={() => filters.clearFilters()}
        onSecondaryAction={() => navigate('/explore')}
      />
    );
  }

  return <PropertyGrid properties={properties} />;
}
```

### ExploreMap with Location

```tsx
function ExploreMap() {
  const { hasLocationPermission, requestPermission } = useLocation();

  if (!hasLocationPermission) {
    return (
      <EmptyState
        type="noLocation"
        onAction={requestPermission}
        onSecondaryAction={() => navigate('/explore/feed')}
      />
    );
  }

  return <MapHybridView />;
}
```

### Offline Detection

```tsx
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

function ExploreShorts() {
  const isOnline = useOnlineStatus();
  const { videos, cachedVideos } = useShortsFeed();

  if (!isOnline) {
    return (
      <EmptyState
        type="offline"
        onAction={() => window.location.reload()}
        onSecondaryAction={() => showCachedContent()}
      />
    );
  }

  return <ShortsContainer videos={videos} />;
}
```

## Styling

The component uses:
- Design tokens from `@/lib/design-tokens`
- Tailwind CSS utilities
- Framer Motion for animations
- ModernCard component for card variant

### Customization

```tsx
// Custom styling
<EmptyState
  type="noResults"
  className="bg-gray-50 rounded-xl"
  onAction={handleAction}
/>

// Custom card styling
<EmptyStateCard
  type="noSavedProperties"
  cardClassName="shadow-2xl border-2 border-indigo-100"
  onAction={handleAction}
/>
```

## Accessibility

- ✅ Proper ARIA labels on all interactive elements
- ✅ Semantic HTML structure
- ✅ Keyboard navigation support
- ✅ Focus indicators on buttons
- ✅ Screen reader friendly
- ✅ Icon role="img" with aria-label

## Animation

The component uses Framer Motion with:
- **Icon**: Scale and rotate spring animation
- **Text**: Staggered fade-in with y-axis translation
- **Buttons**: Hover scale and tap feedback
- **Container**: Fade-in with scale

Respects `prefers-reduced-motion` through Framer Motion's built-in support.

## Testing

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders correct content for type', () => {
    render(<EmptyState type="noResults" />);
    expect(screen.getByText('No properties found')).toBeInTheDocument();
  });

  it('calls onAction when primary button clicked', () => {
    const handleAction = jest.fn();
    render(
      <EmptyState
        type="noResults"
        onAction={handleAction}
      />
    );
    
    fireEvent.click(screen.getByText('Clear Filters'));
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('supports custom messages', () => {
    render(
      <EmptyState
        type="noContent"
        customTitle="Custom Title"
        customDescription="Custom description"
      />
    );
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom description')).toBeInTheDocument();
  });
});
```

## Requirements Validation

✅ **Requirement 7.2**: Empty states with meaningful messages and suggested actions
- Provides 7 pre-configured empty state types
- Clear, actionable messaging for each scenario
- Suggested actions guide users to next steps

## Related Components

- `ErrorBoundary` - For error states
- `ModernCard` - Card wrapper component
- `NetworkError` - For network-related errors
- `ModernSkeleton` - For loading states

## Best Practices

1. **Choose the Right Type**: Use the most specific empty state type for your scenario
2. **Provide Actions**: Always include at least one action button when possible
3. **Clear Messaging**: Keep descriptions concise and actionable
4. **Test Edge Cases**: Ensure empty states appear in all no-data scenarios
5. **Accessibility**: Test with keyboard navigation and screen readers
6. **Responsive**: Test on mobile and desktop viewports
7. **Loading States**: Show skeletons during loading, empty states only when confirmed empty

## Migration from Old Empty States

If you have existing empty state implementations:

```tsx
// Old
{items.length === 0 && (
  <div className="text-center py-8">
    <p>No items found</p>
    <button onClick={handleAction}>Try Again</button>
  </div>
)}

// New
{items.length === 0 && (
  <EmptyState
    type="noResults"
    onAction={handleAction}
  />
)}
```

## Performance

- Lightweight component (~5KB gzipped)
- Lazy-loaded icons from lucide-react
- Optimized animations with Framer Motion
- No unnecessary re-renders

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Future Enhancements

- [ ] Add illustration support
- [ ] Add custom icon support for all types
- [ ] Add animation variants
- [ ] Add dark mode support
- [ ] Add i18n support for messages
