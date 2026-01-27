/**
 * PersonalizedContentBlock Component
 * Displays a horizontal scrollable section of personalized content
 * Requirements: 12.1, 12.3, 12.4, 12.5, 12.6
 */

import { ChevronRight } from 'lucide-react';
import { PropertyCard } from './cards/PropertyCard';
import { VideoCard } from './cards/VideoCard';
import { NeighbourhoodCard } from './cards/NeighbourhoodCard';
import { DiscoveryItem } from '@/hooks/useDiscoveryFeed';

interface PersonalizedContentBlockProps {
  title: string;
  subtitle?: string;
  items: DiscoveryItem[];
  onItemClick: (item: DiscoveryItem) => void;
  onSeeAll?: () => void;
  isLoading?: boolean;
}

export function PersonalizedContentBlock({
  title,
  subtitle,
  items,
  onItemClick,
  onSeeAll,
  isLoading = false,
}: PersonalizedContentBlockProps) {
  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 px-4">
          <div>
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            {subtitle && <div className="h-4 w-48 bg-gray-100 rounded animate-pulse mt-1" />}
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-shrink-0 w-72 h-96 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>}
        </div>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
            aria-label={`See all ${title}`}
          >
            See All
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Horizontal Scroll Container */}
      <div className="flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide snap-x snap-mandatory">
        {items.map(item => (
          <div
            key={item.id}
            className="flex-shrink-0 w-72 snap-start"
            onClick={() => onItemClick(item)}
          >
            {item.type === 'property' && (
              <PropertyCard
                property={item.data}
                onClick={() => onItemClick(item)}
                variant="compact"
              />
            )}
            {item.type === 'video' && (
              <VideoCard video={item.data} onClick={() => onItemClick(item)} variant="compact" />
            )}
            {item.type === 'neighbourhood' && (
              <NeighbourhoodCard
                neighbourhood={item.data}
                onClick={() => onItemClick(item)}
                variant="compact"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
