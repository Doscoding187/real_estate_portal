/**
 * React Query Client - Usage Examples
 * 
 * This file demonstrates how to use the optimized queryClient
 * and prefetch strategies in the Explore feature.
 */

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  prefetchExploreFeed,
  prefetchVideoFeed,
  prefetchMapProperties,
  prefetchNeighbourhoodDetail,
  invalidateExploreFeed,
  clearExploreCache,
} from './queryClient';

// ============================================================================
// Example 1: Basic Query with Automatic Caching
// ============================================================================

export function ExploreHomeExample() {
  // This query will automatically use the optimized configuration:
  // - 5 minute staleTime
  // - 10 minute gcTime
  // - Exponential backoff retry
  const { data, isLoading, error } = useQuery({
    queryKey: ['explore', 'feed', { categoryId: 1 }],
    queryFn: async () => {
      const response = await fetch('/api/explore/getFeed?categoryId=1');
      return response.json();
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading feed</div>;

  return (
    <div>
      {data?.items.map((item: any) => (
        <div key={item.id}>{item.title}</div>
      ))}
    </div>
  );
}

// ============================================================================
// Example 2: Prefetching Next Page on Scroll
// ============================================================================

export function InfiniteScrollExample() {
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const { data } = useQuery({
    queryKey: ['explore', 'feed', { offset, limit }],
    queryFn: async () => {
      const response = await fetch(`/api/explore/getFeed?offset=${offset}&limit=${limit}`);
      return response.json();
    },
  });

  // Prefetch next page when user scrolls to 80%
  useEffect(() => {
    const handleScroll = () => {
      const scrollPercentage = 
        (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
      
      if (scrollPercentage > 0.8) {
        // Prefetch next page
        prefetchExploreFeed({
          offset: offset + limit,
          limit,
        });
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [offset, limit]);

  return (
    <div>
      {data?.items.map((item: any) => (
        <div key={item.id}>{item.title}</div>
      ))}
      <button onClick={() => setOffset(offset + limit)}>
        Load More
      </button>
    </div>
  );
}

// ============================================================================
// Example 3: Video Feed with Preloading
// ============================================================================

export function VideoFeedExample() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const videosPerPage = 10;

  const { data } = useQuery({
    queryKey: ['explore', 'videos', { offset: currentIndex }],
    queryFn: async () => {
      const response = await fetch(`/api/explore/getVideoFeed?offset=${currentIndex}`);
      return response.json();
    },
  });

  // Prefetch next batch when user is near the end
  useEffect(() => {
    if (data && currentIndex >= videosPerPage - 3) {
      prefetchVideoFeed({
        offset: currentIndex + videosPerPage,
        limit: videosPerPage,
      });
    }
  }, [currentIndex, data]);

  return (
    <div>
      <video src={data?.videos[currentIndex]?.url} />
      <button onClick={() => setCurrentIndex(currentIndex + 1)}>
        Next Video
      </button>
    </div>
  );
}

// ============================================================================
// Example 4: Map with Bounds Prefetching
// ============================================================================

export function MapViewExample() {
  const [mapBounds, setMapBounds] = useState({
    north: -25.7,
    south: -26.3,
    east: 28.2,
    west: 27.8,
  });

  const { data } = useQuery({
    queryKey: ['explore', 'map', mapBounds],
    queryFn: async () => {
      const params = new URLSearchParams({
        north: mapBounds.north.toString(),
        south: mapBounds.south.toString(),
        east: mapBounds.east.toString(),
        west: mapBounds.west.toString(),
      });
      const response = await fetch(`/api/explore/getMapProperties?${params}`);
      return response.json();
    },
  });

  // Prefetch adjacent map areas
  const handleMapMove = (newBounds: typeof mapBounds) => {
    setMapBounds(newBounds);
    
    // Prefetch the new bounds
    prefetchMapProperties(newBounds);
  };

  return (
    <div>
      {/* Map component would go here */}
      <div>Map with {data?.properties?.length || 0} properties</div>
    </div>
  );
}

// ============================================================================
// Example 5: Neighbourhood Card with Hover Prefetch
// ============================================================================

export function NeighbourhoodCardExample({ neighbourhood }: { neighbourhood: any }) {
  const handleMouseEnter = () => {
    // Prefetch neighbourhood details on hover
    prefetchNeighbourhoodDetail(neighbourhood.id);
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onClick={() => {
        // Navigate to detail page - data will already be cached!
        window.location.href = `/neighbourhood/${neighbourhood.id}`;
      }}
    >
      <h3>{neighbourhood.name}</h3>
      <p>{neighbourhood.description}</p>
    </div>
  );
}

// ============================================================================
// Example 6: Cache Invalidation After Mutation
// ============================================================================

export function SavePropertyExample({ propertyId }: { propertyId: number }) {
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async () => {
    try {
      // Save property
      await fetch('/api/explore/toggleSaveProperty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: propertyId }),
      });

      setIsSaved(true);

      // Invalidate explore feed to show updated save status
      await invalidateExploreFeed();
    } catch (error) {
      console.error('Failed to save property:', error);
    }
  };

  return (
    <button onClick={handleSave}>
      {isSaved ? 'Saved ✓' : 'Save'}
    </button>
  );
}

// ============================================================================
// Example 7: Clear Cache on Logout
// ============================================================================

export function LogoutExample() {
  const handleLogout = async () => {
    try {
      // Clear all explore cache
      await clearExploreCache();

      // Perform logout
      await fetch('/api/auth/logout', { method: 'POST' });

      // Redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <button onClick={handleLogout}>
      Logout
    </button>
  );
}

// ============================================================================
// Example 8: Custom Hook with Prefetching
// ============================================================================

export function useExploreFeedWithPrefetch(filters: any) {
  const query = useQuery({
    queryKey: ['explore', 'feed', filters],
    queryFn: async () => {
      const params = new URLSearchParams(
        Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v != null)
        ) as any
      );
      const response = await fetch(`/api/explore/getFeed?${params}`);
      return response.json();
    },
  });

  // Automatically prefetch next page when data loads
  useEffect(() => {
    if (query.data && query.data.hasMore) {
      const nextOffset = (filters.offset || 0) + (filters.limit || 20);
      prefetchExploreFeed({
        ...filters,
        offset: nextOffset,
      });
    }
  }, [query.data, filters]);

  return query;
}

// Usage:
export function SmartFeedExample() {
  const { data, isLoading } = useExploreFeedWithPrefetch({
    categoryId: 1,
    offset: 0,
    limit: 20,
  });

  // Next page is already prefetched and will load instantly!
  return <div>{/* ... */}</div>;
}

// ============================================================================
// Example 9: Retry Logic Demonstration
// ============================================================================

export function RetryExample() {
  const { data, error, failureCount, isError } = useQuery({
    queryKey: ['explore', 'test-retry'],
    queryFn: async () => {
      // This will automatically retry with exponential backoff:
      // Attempt 1: immediate
      // Attempt 2: after 1 second
      // Attempt 3: after 2 seconds
      const response = await fetch('/api/explore/unreliable-endpoint');
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
  });

  if (isError) {
    return (
      <div>
        <p>Failed after {failureCount} attempts</p>
        <p>Error: {error.message}</p>
      </div>
    );
  }

  return <div>{data?.message}</div>;
}

// ============================================================================
// Example 10: Stale Time Demonstration
// ============================================================================

export function StaleTimeExample() {
  const { data, dataUpdatedAt, isStale } = useQuery({
    queryKey: ['explore', 'stale-demo'],
    queryFn: async () => {
      const response = await fetch('/api/explore/getFeed');
      return response.json();
    },
  });

  return (
    <div>
      <p>Data last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}</p>
      <p>Is stale: {isStale ? 'Yes (will refetch on next mount)' : 'No (still fresh)'}</p>
      <p>Data will stay fresh for 5 minutes from last update</p>
    </div>
  );
}
