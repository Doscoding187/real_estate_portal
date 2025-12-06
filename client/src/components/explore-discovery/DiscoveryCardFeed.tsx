import { useRef, useEffect } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { PropertyCard } from './cards/PropertyCard';
import { VideoCard } from './cards/VideoCard';
import { NeighbourhoodCard } from './cards/NeighbourhoodCard';
import { InsightCard } from './cards/InsightCard';
import { useDiscoveryFeed, ContentBlock, DiscoveryItem } from '@/hooks/useDiscoveryFeed';

interface DiscoveryCardFeedProps {
  categoryId?: number;
  filters?: Record<string, any>;
  onItemClick?: (item: DiscoveryItem) => void;
}

export function DiscoveryCardFeed({ categoryId, filters, onItemClick }: DiscoveryCardFeedProps) {
  const {
    contentBlocks,
    isLoading,
    error,
    hasMore,
    recordEngagement,
    setupObserver,
    refetch,
  } = useDiscoveryFeed({ categoryId, filters });

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (loadMoreRef.current) {
      setupObserver(loadMoreRef.current);
    }
  }, [setupObserver]);

  const handleItemClick = (item: DiscoveryItem) => {
    recordEngagement(item.id, 'click');
    onItemClick?.(item);
  };

  const handleSave = (item: DiscoveryItem) => {
    recordEngagement(item.id, 'save');
  };

  const handleFollow = (item: DiscoveryItem) => {
    recordEngagement(item.id, 'click');
  };

  const renderCard = (item: DiscoveryItem) => {
    switch (item.type) {
      case 'property':
        return (
          <PropertyCard
            key={item.id}
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
            onClick={() => handleItemClick(item)}
            onSave={() => handleSave(item)}
          />
        );

      case 'video':
        return (
          <VideoCard
            key={item.id}
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
            onClick={() => handleItemClick(item)}
            onSave={() => handleSave(item)}
          />
        );

      case 'neighbourhood':
        return (
          <NeighbourhoodCard
            key={item.id}
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
            onClick={() => handleItemClick(item)}
            onFollow={() => handleFollow(item)}
          />
        );

      case 'insight':
        return (
          <InsightCard
            key={item.id}
            insight={{
              id: item.data.id,
              title: item.data.title,
              description: item.data.description,
              imageUrl: item.data.imageUrl,
              insightType: item.data.insightType || 'market-trend',
              data: item.data.data,
            }}
            onClick={() => handleItemClick(item)}
          />
        );

      default:
        return null;
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load content</h3>
        <p className="text-sm text-gray-600 mb-4 text-center max-w-md">
          We couldn't load the discovery feed. Please try again.
        </p>
        <button
          onClick={() => refetch()}
          className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (isLoading && contentBlocks.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="ml-3 text-gray-600">Loading discovery feed...</span>
      </div>
    );
  }

  if (contentBlocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">🏠</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No content found</h3>
        <p className="text-sm text-gray-600 text-center max-w-md">
          We couldn't find any properties or content matching your preferences. Try adjusting your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Content blocks */}
      <div className="space-y-8">
        {contentBlocks.map((block) => (
          <ContentBlockSection
            key={block.id}
            block={block}
            renderCard={renderCard}
          />
        ))}
      </div>

      {/* Load more trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex items-center justify-center py-8">
          {isLoading && (
            <>
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <span className="ml-2 text-gray-600">Loading more...</span>
            </>
          )}
        </div>
      )}

      {/* End of feed */}
      {!hasMore && contentBlocks.length > 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          You've reached the end of the feed
        </div>
      )}
    </div>
  );
}

// Content block section with horizontal scroll
interface ContentBlockSectionProps {
  block: ContentBlock;
  renderCard: (item: DiscoveryItem) => React.ReactNode;
}

function ContentBlockSection({ block, renderCard }: ContentBlockSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4 px-4">
        <h2 className="text-xl font-bold text-gray-900">{block.title}</h2>
        <button
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          onClick={() => console.log('See all:', block.type)}
        >
          <span>See All</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Horizontal scroll container */}
      <div className="relative group">
        {/* Scroll buttons */}
        <button
          onClick={scrollLeft}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
          aria-label="Scroll left"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <button
          onClick={scrollRight}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Cards container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-4 pb-2 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {block.items.map((item) => (
            <div
              key={item.id}
              className="flex-shrink-0 w-72 snap-start"
            >
              {renderCard(item)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
