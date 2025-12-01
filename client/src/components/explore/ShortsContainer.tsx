import { useEffect, useRef, useState } from 'react';
import { FeedType } from '@/../../shared/types';
import { useShortsFeed } from '@/hooks/useShortsFeed';
import { PropertyCard } from './PropertyCard';
import { SwipeEngine } from './SwipeEngine';
import { Loader2 } from 'lucide-react';

interface ShortsContainerProps {
  feedType: FeedType;
  feedId?: number;
  category?: string;
}

export function ShortsContainer({ feedType, feedId, category }: ShortsContainerProps) {
  const {
    cards,
    currentIndex,
    currentCard,
    isLoading,
    error,
    goToNext,
    goToPrevious,
    refresh,
  } = useShortsFeed({ feedType, feedId, category });

  const containerRef = useRef<HTMLDivElement>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  // Reset media index when card changes
  useEffect(() => {
    setCurrentMediaIndex(0);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious]);

  // Loading state
  if (isLoading && cards.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
          <p className="text-white text-lg">Loading properties...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && cards.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4 px-6 text-center">
          <div className="text-red-500 text-6xl">⚠️</div>
          <p className="text-white text-lg">{error}</p>
          <button
            onClick={refresh}
            className="px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (cards.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4 px-6 text-center">
          <div className="text-gray-400 text-6xl">🏠</div>
          <p className="text-white text-lg">No properties found</p>
          <p className="text-gray-400">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black overflow-hidden"
      role="region"
      aria-label="Property shorts feed"
    >
      {/* Property cards with gesture detection */}
      <SwipeEngine
        onSwipeUp={goToNext}
        onSwipeDown={goToPrevious}
        onTapLeft={() => {
          // Navigate to previous photo
          if (currentCard?.media && currentCard.media.length > 1) {
            setCurrentMediaIndex((prev) => 
              prev > 0 ? prev - 1 : currentCard.media.length - 1
            );
          }
        }}
        onTapRight={() => {
          // Navigate to next photo
          if (currentCard?.media && currentCard.media.length > 1) {
            setCurrentMediaIndex((prev) => 
              prev < currentCard.media.length - 1 ? prev + 1 : 0
            );
          }
        }}
        onDoubleTap={() => {
          // Double tap to save
          console.log('Double tap save:', currentCard?.id);
        }}
        onLongPress={() => {
          // Long press for more options
          console.log('Long press:', currentCard?.id);
        }}
        className="relative w-full h-full"
      >
        {cards.map((card, index) => (
          <div
            key={card.id}
            className={`absolute inset-0 transition-opacity duration-300 ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
            aria-hidden={index !== currentIndex}
          >
            <PropertyCard
              property={card}
              isActive={index === currentIndex}
              currentMediaIndex={index === currentIndex ? currentMediaIndex : 0}
              onSave={() => console.log('Save property:', card.id)}
              onShare={() => console.log('Share property:', card.id)}
              onMore={() => console.log('More options:', card.id)}
              onContactAgent={() => console.log('Contact agent for property:', card.id)}
              onBookViewing={() => console.log('Book viewing for property:', card.id)}
              onWhatsApp={() => console.log('WhatsApp agent for property:', card.id)}
            />
          </div>
        ))}
      </SwipeEngine>

      {/* Navigation indicators */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
        {cards.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map((_, idx) => {
          const actualIndex = Math.max(0, currentIndex - 2) + idx;
          return (
            <div
              key={actualIndex}
              className={`h-1 rounded-full transition-all ${
                actualIndex === currentIndex
                  ? 'w-8 bg-white'
                  : 'w-1 bg-gray-500'
              }`}
              aria-label={`Property ${actualIndex + 1}`}
            />
          );
        })}
      </div>

      {/* Loading indicator for infinite scroll */}
      {isLoading && cards.length > 0 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
      )}
    </div>
  );
}
