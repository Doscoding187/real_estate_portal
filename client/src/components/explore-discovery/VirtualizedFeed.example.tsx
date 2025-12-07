/**
 * VirtualizedFeed Example Usage
 * Demonstrates how to use the VirtualizedFeed component
 */

import { VirtualizedFeed } from './VirtualizedFeed';
import { useDiscoveryFeed } from '@/hooks/useDiscoveryFeed';
import { useState } from 'react';

/**
 * Example 1: Basic Usage with Discovery Feed
 */
export function BasicVirtualizedFeedExample() {
  const { contentBlocks, recordEngagement } = useDiscoveryFeed();
  
  // Flatten content blocks into a single array for virtualization
  const allItems = contentBlocks.flatMap(block => block.items);

  const handleItemClick = (item: any) => {
    recordEngagement(item.id, 'click');
    console.log('Item clicked:', item);
  };

  const handleItemSave = (item: any) => {
    recordEngagement(item.id, 'save');
    console.log('Item saved:', item);
  };

  return (
    <div className="h-screen w-full">
      <VirtualizedFeed
        items={allItems}
        onItemClick={handleItemClick}
        onItemSave={handleItemSave}
      />
    </div>
  );
}

/**
 * Example 2: With Custom Item Height
 * Use when your cards are taller or shorter than default
 */
export function CustomHeightExample() {
  const { contentBlocks } = useDiscoveryFeed();
  const allItems = contentBlocks.flatMap(block => block.items);

  return (
    <div className="h-screen w-full">
      <VirtualizedFeed
        items={allItems}
        itemHeight={320} // Taller cards
        onItemClick={(item) => console.log(item)}
      />
    </div>
  );
}

/**
 * Example 3: With Custom Overscan
 * Higher overscan for smoother fast scrolling
 */
export function CustomOverscanExample() {
  const { contentBlocks } = useDiscoveryFeed();
  const allItems = contentBlocks.flatMap(block => block.items);

  return (
    <div className="h-screen w-full">
      <VirtualizedFeed
        items={allItems}
        overscanCount={5} // Render 5 items above/below viewport
        onItemClick={(item) => console.log(item)}
      />
    </div>
  );
}

/**
 * Example 4: With Filters
 * Combine with filter state management
 */
export function FilteredVirtualizedFeedExample() {
  const [filters, setFilters] = useState({
    propertyType: null,
    priceMin: null,
    priceMax: null,
  });

  const { contentBlocks } = useDiscoveryFeed({ filters });
  const allItems = contentBlocks.flatMap(block => block.items);

  return (
    <div className="h-screen flex flex-col">
      {/* Filter controls */}
      <div className="p-4 bg-white border-b">
        <button
          onClick={() => setFilters({ ...filters, propertyType: 'residential' })}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Residential Only
        </button>
        <button
          onClick={() => setFilters({ propertyType: null, priceMin: null, priceMax: null })}
          className="ml-2 px-4 py-2 bg-gray-200 rounded"
        >
          Clear Filters
        </button>
      </div>

      {/* Virtualized feed */}
      <div className="flex-1">
        <VirtualizedFeed
          items={allItems}
          onItemClick={(item) => console.log(item)}
        />
      </div>
    </div>
  );
}

/**
 * Example 5: With Loading State
 * Show loading indicator while fetching
 */
export function LoadingStateExample() {
  const { contentBlocks, isLoading } = useDiscoveryFeed();
  const allItems = contentBlocks.flatMap(block => block.items);

  if (isLoading && allItems.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <VirtualizedFeed
        items={allItems}
        onItemClick={(item) => console.log(item)}
      />
    </div>
  );
}

/**
 * Example 6: With Empty State
 * Handle case when no items are available
 */
export function EmptyStateExample() {
  const { contentBlocks } = useDiscoveryFeed();
  const allItems = contentBlocks.flatMap(block => block.items);

  if (allItems.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🏠</div>
          <h3 className="text-xl font-semibold mb-2">No properties found</h3>
          <p className="text-gray-600">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <VirtualizedFeed
        items={allItems}
        onItemClick={(item) => console.log(item)}
      />
    </div>
  );
}

/**
 * Example 7: With Infinite Scroll
 * Load more items as user scrolls
 */
export function InfiniteScrollExample() {
  const { contentBlocks, hasMore, loadMore, isLoading } = useDiscoveryFeed();
  const allItems = contentBlocks.flatMap(block => block.items);

  // Detect when user scrolls near bottom
  const handleScroll = (event: any) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Load more when 80% scrolled
    if (scrollPercentage > 0.8 && hasMore && !isLoading) {
      loadMore();
    }
  };

  return (
    <div className="h-screen w-full" onScroll={handleScroll}>
      <VirtualizedFeed
        items={allItems}
        onItemClick={(item) => console.log(item)}
      />
      
      {isLoading && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-white px-4 py-2 rounded-full shadow-lg">
            Loading more...
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Example 8: Performance Comparison Demo
 * Toggle between virtualized and non-virtualized
 */
export function PerformanceComparisonExample() {
  const [useVirtualization, setUseVirtualization] = useState(true);
  const { contentBlocks } = useDiscoveryFeed();
  const allItems = contentBlocks.flatMap(block => block.items);

  return (
    <div className="h-screen flex flex-col">
      {/* Toggle control */}
      <div className="p-4 bg-white border-b">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={useVirtualization}
            onChange={(e) => setUseVirtualization(e.target.checked)}
            className="w-4 h-4"
          />
          <span>Use Virtualization</span>
        </label>
        <p className="text-sm text-gray-600 mt-2">
          {useVirtualization
            ? '✅ Rendering only visible items (fast)'
            : '⚠️ Rendering all items (slow with 50+ items)'}
        </p>
      </div>

      {/* Feed */}
      <div className="flex-1">
        {useVirtualization ? (
          <VirtualizedFeed
            items={allItems}
            onItemClick={(item) => console.log(item)}
          />
        ) : (
          <div className="overflow-y-auto h-full">
            {allItems.map((item) => (
              <div key={item.id} className="p-4">
                {/* Render cards normally */}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
