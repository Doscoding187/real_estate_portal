/**
 * VirtualizedFeed Demo Page
 * Demonstrates the performance benefits of virtualized scrolling
 */

import { useState } from 'react';
import { VirtualizedFeed } from '@/components/explore-discovery/VirtualizedFeed';
import { useDiscoveryFeed } from '@/hooks/useDiscoveryFeed';
import { Loader2, Zap, List as ListIcon } from 'lucide-react';

export default function VirtualizedFeedDemo() {
  const [useVirtualization, setUseVirtualization] = useState(true);
  const { contentBlocks, isLoading, error, recordEngagement } = useDiscoveryFeed();

  // Flatten content blocks into a single array
  const allItems = contentBlocks.flatMap(block => block.items);

  const handleItemClick = (item: any) => {
    recordEngagement(item.id, 'click');
    console.log('Item clicked:', item);
  };

  const handleItemSave = (item: any) => {
    recordEngagement(item.id, 'save');
    console.log('Item saved:', item);
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Feed</h2>
          <p className="text-gray-600">{String(error)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Zap className="w-6 h-6 text-blue-600" />
                Virtualized Feed Demo
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Compare performance with and without virtualization
              </p>
            </div>

            {/* Toggle Control */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useVirtualization}
                    onChange={e => setUseVirtualization(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-900">
                    {useVirtualization ? 'Virtualized' : 'Standard'}
                  </span>
                </label>
              </div>

              {/* Stats */}
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">{allItems.length} items</div>
                <div className="text-xs text-gray-500">
                  {useVirtualization ? '✅ Fast rendering' : '⚠️ Slow with 50+ items'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Info Banner */}
      <div
        className={`${useVirtualization ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} border-b px-4 py-3`}
      >
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          {useVirtualization ? (
            <>
              <Zap className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">Virtualization Enabled</p>
                <p className="text-xs text-green-700">
                  Only rendering visible items. Expect 55-60 FPS scrolling even with 1000+ items.
                </p>
              </div>
            </>
          ) : (
            <>
              <ListIcon className="w-5 h-5 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">Standard Rendering</p>
                <p className="text-xs text-yellow-700">
                  Rendering all items. Performance may degrade with 50+ items (20-30 FPS).
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && allItems.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading feed...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && allItems.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🏠</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-600">Try adjusting your filters</p>
          </div>
        </div>
      )}

      {/* Feed */}
      {allItems.length > 0 && (
        <div className="flex-1 overflow-hidden">
          {useVirtualization ? (
            <VirtualizedFeed
              items={allItems}
              onItemClick={handleItemClick}
              onItemSave={handleItemSave}
              itemHeight={280}
              overscanCount={3}
            />
          ) : (
            <div className="h-full overflow-y-auto">
              <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
                {allItems.map(item => (
                  <div key={item.id} className="h-[280px]">
                    {/* Non-virtualized rendering would go here */}
                    <div className="bg-white rounded-lg shadow p-4 h-full flex items-center justify-center">
                      <p className="text-gray-600">Item {item.id}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Tips Footer */}
      <div className="bg-white border-t px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-6">
              <div>
                <span className="font-semibold">Virtualized:</span> Renders ~10-15 items
              </div>
              <div>
                <span className="font-semibold">Standard:</span> Renders all {allItems.length} items
              </div>
            </div>
            <div className="text-gray-500">Scroll to see the difference in performance</div>
          </div>
        </div>
      </div>
    </div>
  );
}
