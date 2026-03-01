// @ts-nocheck
/**
 * PersonalizedContentBlock Component
 * Displays a horizontal scrollable section of personalized content
 * Requirements: 12.1, 12.3, 12.4, 12.5, 12.6
 */

import { ChevronRight } from 'lucide-react';
import { PropertyCard } from './cards/PropertyCard';
import { VideoCard } from './cards/VideoCard';
import { NeighbourhoodCard } from './cards/NeighbourhoodCard';
import { InsightCard } from './cards/InsightCard';
import { DiscoveryItem } from '@/hooks/useDiscoveryFeed';
type CompactAspect = 'portrait' | 'landscape' | 'square';

interface PersonalizedContentBlockProps {
  title: string;
  subtitle?: string;
  items: DiscoveryItem[];
  onItemClick: (item: DiscoveryItem) => void;
  onSeeAll?: () => void;
  isLoading?: boolean;
  videoAspect?: CompactAspect;
}

export function PersonalizedContentBlock({
  title,
  subtitle,
  items,
  onItemClick,
  onSeeAll,
  isLoading = false,
  videoAspect,
}: PersonalizedContentBlockProps) {
  const getVideoAspectFromData = (data: any): CompactAspect => {
    if (videoAspect) {
      return videoAspect;
    }
    const orientation = String(data?.orientation || '').toLowerCase();
    if (orientation.includes('square')) return 'square';
    if (orientation.includes('horizontal') || orientation.includes('landscape')) return 'landscape';
    if (data?.contentType === 'walkthrough') return 'landscape';
    if (data?.contentType === 'showcase') return 'square';
    return 'portrait';
  };

  const getVideoWidthClass = (aspect: CompactAspect): string => {
    if (aspect === 'landscape') return 'w-96';
    if (aspect === 'square') return 'w-64';
    return 'w-56';
  };

  const mapVideoData = (data: any) => ({
    id: Number(data?.id || 0),
    title: data?.title || 'Explore Video',
    thumbnailUrl: data?.thumbnailUrl || data?.mediaUrl || '',
    videoUrl: data?.mediaUrl || data?.videoUrl || '',
    duration: Number(data?.durationSec || data?.duration || 0),
    views: Number(data?.stats?.views || data?.viewCount || 0),
    creatorName: data?.actor?.displayName || 'Creator',
    creatorAvatar: undefined,
    isSaved: false,
  });

  const mapPropertyCardData = (data: any) => {
    const location =
      data?.location ||
      [data?.suburb, data?.city, data?.province].filter(Boolean).join(', ') ||
      'South Africa';
    return {
      id: Number(data?.id || 0),
      title: data?.title || 'Featured Listing',
      price: Number(data?.priceMin || data?.price || 0),
      priceMax: Number(data?.priceMax || 0) || undefined,
      location,
      beds: Number(data?.beds || 0) || undefined,
      baths: Number(data?.baths || 0) || undefined,
      size: Number(data?.size || 0) || undefined,
      imageUrl: data?.imageUrl || data?.thumbnailUrl || data?.mediaUrl || '',
      propertyType: data?.propertyType || 'Property',
      isSaved: Boolean(data?.isSaved),
    };
  };

  const mapNeighbourhoodData = (data: any) => ({
    id: Number(data?.id || 0),
    name: data?.name || 'Neighbourhood',
    city: data?.city || 'Johannesburg',
    imageUrl: data?.heroBannerUrl || data?.imageUrl || data?.thumbnailUrl || '',
    propertyCount: Number(data?.propertyCount || 0),
    avgPrice: Number(data?.avgPropertyPrice || 0),
    priceChange: Number(data?.priceChange || 0),
    followerCount: Number(data?.followerCount || 0),
    highlights: Array.isArray(data?.highlights) ? data.highlights : [],
  });

  const mapInsightData = (data: any) => ({
    id: Number(data?.id || 0),
    title: data?.title || 'Market Insight',
    description: data?.description || 'Discover trends and opportunities in your area.',
    imageUrl: data?.imageUrl,
    insightType: data?.insightType || 'market-trend',
    data: data?.data,
  });

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
    return (
      <div className="mb-8">
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
        <div className="px-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
            Coming soon. No items yet.
          </div>
        </div>
      </div>
    );
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
            className={`flex-shrink-0 snap-start ${
              item.type === 'video'
                ? getVideoWidthClass(getVideoAspectFromData(item.data))
                : item.type === 'insight'
                  ? 'w-80'
                  : 'w-72'
            }`}
            onClick={() => onItemClick(item)}
          >
            {item.type === 'property' && (
              <PropertyCard
                property={mapPropertyCardData(item.data)}
                onClick={() => onItemClick(item)}
                onSave={() => onItemClick(item)}
              />
            )}
            {item.type === 'video' && (
              <VideoCard
                video={mapVideoData(item.data)}
                onClick={() => onItemClick(item)}
                onSave={() => onItemClick(item)}
              />
            )}
            {item.type === 'neighbourhood' && (
              <NeighbourhoodCard
                neighbourhood={mapNeighbourhoodData(item.data)}
                onClick={() => onItemClick(item)}
                onFollow={() => onItemClick(item)}
              />
            )}
            {item.type === 'insight' && (
              <InsightCard
                insight={mapInsightData(item.data)}
                onClick={() => onItemClick(item)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
