/**
 * VirtualizedFeed Component
 * Implements virtualized scrolling for long lists using react-window
 * Requirements: 6.1, 6.5
 */

import { List } from 'react-window';
import { useRef, useEffect, useState } from 'react';
import { PropertyCard } from './cards/PropertyCard';
import { VideoCard } from './cards/VideoCard';
import { NeighbourhoodCard } from './cards/NeighbourhoodCard';
import { InsightCard } from './cards/InsightCard';
import type { DiscoveryItem } from '@/hooks/useDiscoveryFeed';

interface VirtualizedFeedProps {
  items: DiscoveryItem[];
  onItemClick: (item: DiscoveryItem) => void;
  onItemSave?: (item: DiscoveryItem) => void;
  onItemFollow?: (item: DiscoveryItem) => void;
  itemHeight?: number;
  overscanCount?: number;
  className?: string;
}

export function VirtualizedFeed({
  items,
  onItemClick,
  onItemSave,
  onItemFollow,
  itemHeight = 280,
  overscanCount = 3,
  className = '',
}: VirtualizedFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Measure container dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    // Initial measurement
    updateDimensions();

    // Update on resize
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Render card based on item type
  const renderCard = (item: DiscoveryItem) => {
    switch (item.type) {
      case 'property':
        return (
          <PropertyCard
            property={{
              id: item.data.id,
              title: item.data.title,
              price: item.data.priceMin || item.data.price,
              priceMax: item.data.priceMax,
              location: item.data.location || `${item.data.city}, ${item.data.province}`,
              beds: item.data.beds,
              baths: item.data.baths,
              size: item.data.size,
              imageUrl: item.data.thumbnailUrl || item.data.imageUrl,
              propertyType: item.data.propertyType || 'Property',
              isSaved: item.data.isSaved,
            }}
            onClick={() => onItemClick(item)}
            onSave={() => onItemSave?.(item)}
          />
        );

      case 'video':
        return (
          <VideoCard
            video={{
              id: item.data.id,
              title: item.data.title,
              thumbnailUrl: item.data.thumbnailUrl,
              duration: item.data.duration || 30,
              views: item.data.viewCount || 0,
              creatorName: item.data.creatorName || 'Unknown',
              creatorAvatar: item.data.creatorAvatar,
              isSaved: item.data.isSaved,
            }}
            onClick={() => onItemClick(item)}
            onSave={() => onItemSave?.(item)}
          />
        );

      case 'neighbourhood':
        return (
          <NeighbourhoodCard
            neighbourhood={{
              id: item.data.id,
              name: item.data.name,
              city: item.data.city,
              imageUrl: item.data.heroBannerUrl || item.data.imageUrl,
              propertyCount: item.data.propertyCount || 0,
              avgPrice: item.data.avgPropertyPrice || 0,
              priceChange: item.data.priceChange,
              followerCount: item.data.followerCount,
              highlights: item.data.highlights,
            }}
            onClick={() => onItemClick(item)}
            onFollow={() => onItemFollow?.(item)}
          />
        );

      case 'insight':
        return (
          <InsightCard
            insight={{
              id: item.data.id,
              title: item.data.title,
              description: item.data.description,
              imageUrl: item.data.imageUrl,
              insightType: item.data.insightType || 'market-trend',
              data: item.data.data,
            }}
            onClick={() => onItemClick(item)}
          />
        );

      default:
        return null;
    }
  };

  // Don't render until we have dimensions
  if (dimensions.width === 0 || dimensions.height === 0) {
    return (
      <div ref={containerRef} className={`w-full h-full ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      <List
        defaultHeight={dimensions.height}
        rowCount={items.length}
        rowHeight={itemHeight}
        overscanCount={overscanCount}
        rowComponent={({ index }) => {
          const item = items[index];
          return <div className="px-4 py-2">{renderCard(item)}</div>;
        }}
        rowProps={{}}
      />
    </div>
  );
}
