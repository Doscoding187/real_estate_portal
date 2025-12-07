# React Query Client Configuration

## Overview

This module provides an optimized React Query client configuration for the Explore feature and the entire application. The configuration focuses on performance, caching efficiency, and user experience.

## Configuration Details

### Query Options

| Option | Value | Purpose |
|--------|-------|---------|
| `staleTime` | 5 minutes | Data stays fresh for 5 minutes before refetch |
| `gcTime` | 10 minutes | Cached data persists for 10 minutes after last use |
| `refetchOnWindowFocus` | false | Prevents unnecessary refetches when window regains focus |
| `refetchOnMount` | false | Doesn't refetch if data is still fresh on component mount |
| `refetchOnReconnect` | true | Refetches data after network reconnection |
| `retry` | 2 | Retries failed requests up to 2 times |
| `retryDelay` | Exponential | 1s → 2s → 4s (capped at 30s) |

### Mutation Options

| Option | Value | Purpose |
|--------|-------|---------|
| `retry` | 1 | Retries failed mutations once |
| `retryDelay` | Exponential | 1s → 2s (capped at 30s) |

## Prefetch Strategies

The module provides several prefetch functions to proactively load data and improve perceived performance:

### `prefetchExploreFeed(filters)`

Prefetches the next page of explore feed data. Call this when the user is near the end of the current page.

```typescript
import { prefetchExploreFeed } from '@/lib/queryClient';

// When user scrolls to 80% of current page
prefetchExploreFeed({
  categoryId: 1,
  offset: 20,
  limit: 20,
});
```

### `prefetchVideoFeed(filters)`

Prefetches the next batch of videos. Call this when the user is viewing videos.

```typescript
import { prefetchVideoFeed } from '@/lib/queryClient';

// When user is on video 8 of 10
prefetchVideoFeed({
  categoryId: 2,
  offset: 10,
  limit: 10,
});
```

### `prefetchMapProperties(bounds, categoryId?)`

Prefetches properties within map bounds. Call this when the map is panned or zoomed.

```typescript
import { prefetchMapProperties } from '@/lib/queryClient';

// When map bounds change
prefetchMapProperties({
  north: -25.7,
  south: -26.3,
  east: 28.2,
  west: 27.8,
}, 1);
```

### `prefetchNeighbourhoodDetail(neighbourhoodId)`

Prefetches neighbourhood details. Call this when the user hovers over a neighbourhood card.

```typescript
import { prefetchNeighbourhoodDetail } from '@/lib/queryClient';

// On card hover
<NeighbourhoodCard
  onMouseEnter={() => prefetchNeighbourhoodDetail(neighbourhood.id)}
/>
```

## Cache Invalidation

### `invalidateExploreFeed()`

Invalidates and refetches all explore feed queries. Call this after user actions that should refresh the feed.

```typescript
import { invalidateExploreFeed } from '@/lib/queryClient';

// After saving a property
await saveProperty(propertyId);
await invalidateExploreFeed();
```

### `invalidateVideoFeed()`

Invalidates and refetches all video feed queries.

```typescript
import { invalidateVideoFeed } from '@/lib/queryClient';

// After video interaction
await recordVideoView(videoId);
await invalidateVideoFeed();
```

### `clearExploreCache()`

Clears all explore-related cache. Call this on logout or when the user wants to reset.

```typescript
import { clearExploreCache } from '@/lib/queryClient';

// On logout
const handleLogout = async () => {
  await clearExploreCache();
  // ... rest of logout logic
};
```

## Performance Benefits

### Reduced API Calls

- **5-minute staleTime**: Prevents unnecessary refetches for data that hasn't changed
- **10-minute gcTime**: Keeps data in cache even after components unmount
- **Smart refetch**: Only refetches on reconnect, not on window focus or mount

### Improved User Experience

- **Prefetching**: Next page loads instantly when user scrolls
- **Exponential backoff**: Gracefully handles temporary network issues
- **Cache persistence**: Instant navigation between pages with cached data

### Network Resilience

- **Retry logic**: Automatically retries failed requests
- **Exponential backoff**: Prevents overwhelming servers during outages
- **Reconnect refetch**: Gets latest data after network recovery

## Integration with Explore Feature

The queryClient is designed to work seamlessly with the Explore feature hooks:

```typescript
// In useDiscoveryFeed.ts
import { queryClient, prefetchExploreFeed } from '@/lib/queryClient';

export function useDiscoveryFeed(filters: ExploreFeedFilters) {
  const query = useQuery({
    queryKey: ['explore', 'feed', filters],
    queryFn: () => fetchExploreFeed(filters),
  });

  // Prefetch next page when user scrolls
  useEffect(() => {
    if (query.data && shouldPrefetch) {
      prefetchExploreFeed({
        ...filters,
        offset: (filters.offset || 0) + (filters.limit || 20),
      });
    }
  }, [query.data, filters]);

  return query;
}
```

## Requirements Validation

✅ **Requirement 6.3**: React Query cache configured with 5-minute staleTime and 10-minute gcTime  
✅ **Requirement 6.6**: Exponential backoff retry logic implemented with 2 retries and capped delays  
✅ **Prefetch strategies**: Implemented for feed, videos, map, and neighbourhood data  
✅ **Cache invalidation**: Utilities provided for manual cache management

## Testing

To verify the configuration is working:

1. **Check staleTime**: Data should not refetch within 5 minutes
2. **Check gcTime**: Cached data should persist for 10 minutes after unmount
3. **Check retry**: Failed requests should retry with exponential backoff
4. **Check prefetch**: Next page should load instantly when scrolling

## Migration Notes

If you were previously using a different QueryClient configuration:

1. Import from `@/lib/queryClient` instead of creating a new instance
2. Use the provided prefetch functions for optimal performance
3. Update any custom retry logic to use the default exponential backoff
4. Remove any manual staleTime/cacheTime overrides unless specifically needed

## Future Enhancements

Potential improvements for future iterations:

- [ ] Add query key factories for type-safe query keys
- [ ] Implement optimistic updates for mutations
- [ ] Add query cancellation for aborted requests
- [ ] Implement background refetch strategies
- [ ] Add query persistence to localStorage
