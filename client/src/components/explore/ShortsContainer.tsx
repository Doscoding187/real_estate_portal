/**
 * ShortsContainer - Refactored
 *
 * Container for vertical video feed with TikTok-inspired interactions
 * and enhanced video playback.
 *
 * Features:
 * - Smooth swipe gestures for navigation
 * - Enhanced video components with viewport detection
 * - Modern glass overlay UI
 * - Keyboard navigation support
 * - Loading and error states with modern design
 *
 * Requirements: 2.1, 2.5, 9.4
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FeedType } from '@/../../shared/types';
import { useShortsFeed } from '@/hooks/useShortsFeed';
import { PropertyCard } from './PropertyCard';
import { SwipeEngine } from './SwipeEngine';
import { Loader2, RefreshCw, Home } from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';
import { buttonVariants, fadeVariants } from '@/lib/animations/exploreAnimations';

interface ShortsContainerProps {
  feedType: FeedType;
  feedId?: number;
  category?: string;
}

export function ShortsContainer({ feedType, feedId, category }: ShortsContainerProps) {
  const { cards, currentIndex, currentCard, isLoading, error, goToNext, goToPrevious, refresh } =
    useShortsFeed({ feedType, feedId, category });

  const containerRef = useRef<HTMLDivElement>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  // Reset media index when card changes
  useEffect(() => {
    setCurrentMediaIndex(0);
  }, [currentIndex]);

  // Keyboard navigation with smooth transitions
  // Requirement 9.4: TikTok-inspired interactions
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

  // Modern Loading State with Glass Design
  if (isLoading && cards.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center bg-black"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-6 p-8 rounded-2xl"
          style={{
            background: designTokens.colors.glass.bgDark,
            backdropFilter: designTokens.colors.glass.backdrop,
            border: `1px solid ${designTokens.colors.glass.borderDark}`,
            boxShadow: designTokens.shadows.glass,
          }}
        >
          <Loader2 className="w-16 h-16 text-white animate-spin" strokeWidth={2} />
          <div className="text-center">
            <p className="text-white text-xl font-semibold mb-1">Loading Shorts</p>
            <p className="text-gray-300 text-sm">Preparing your personalized feed...</p>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Modern Error State with Glass Design
  if (error && cards.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center bg-black p-6"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-6 p-8 rounded-2xl max-w-md text-center"
          style={{
            background: designTokens.colors.glass.bgDark,
            backdropFilter: designTokens.colors.glass.backdrop,
            border: `1px solid ${designTokens.colors.glass.borderDark}`,
            boxShadow: designTokens.shadows.glass,
          }}
        >
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
            <RefreshCw className="w-10 h-10 text-red-400" />
          </div>
          <div>
            <h3 className="text-white text-2xl font-bold mb-2">Oops! Something went wrong</h3>
            <p className="text-gray-300 text-base leading-relaxed">{error}</p>
          </div>
          <motion.button
            onClick={refresh}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            className="px-8 py-4 rounded-xl text-white font-semibold text-lg flex items-center gap-3 shadow-xl"
            style={{
              background:
                'linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(79, 70, 229, 0.9) 100%)',
              backdropFilter: designTokens.colors.glass.backdrop,
              border: `1px solid ${designTokens.colors.glass.border}`,
            }}
          >
            <RefreshCw className="w-6 h-6" />
            Try Again
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }

  // Modern Empty State with Glass Design
  if (cards.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center bg-black p-6"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-6 p-8 rounded-2xl max-w-md text-center"
          style={{
            background: designTokens.colors.glass.bgDark,
            backdropFilter: designTokens.colors.glass.backdrop,
            border: `1px solid ${designTokens.colors.glass.borderDark}`,
            boxShadow: designTokens.shadows.glass,
          }}
        >
          <div className="w-24 h-24 rounded-full bg-gray-700/30 flex items-center justify-center">
            <Home className="w-12 h-12 text-gray-400" />
          </div>
          <div>
            <h3 className="text-white text-2xl font-bold mb-2">No Properties Found</h3>
            <p className="text-gray-300 text-base leading-relaxed">
              We couldn't find any properties matching your criteria. Try adjusting your filters or
              check back later.
            </p>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black overflow-hidden"
      role="region"
      aria-label="Property shorts feed"
    >
      {/* Property cards with enhanced gesture detection */}
      {/* Requirement 2.5: Smooth swipe behavior */}
      <SwipeEngine
        onSwipeUp={goToNext}
        onSwipeDown={goToPrevious}
        onTapLeft={() => {
          // Navigate to previous photo
          if (currentCard?.media && currentCard.media.length > 1) {
            setCurrentMediaIndex(prev => (prev > 0 ? prev - 1 : currentCard.media.length - 1));
          }
        }}
        onTapRight={() => {
          // Navigate to next photo
          if (currentCard?.media && currentCard.media.length > 1) {
            setCurrentMediaIndex(prev => (prev < currentCard.media.length - 1 ? prev + 1 : 0));
          }
        }}
        onDoubleTap={() => {
          // Double tap to save - TikTok-style interaction
          console.log('Double tap save:', currentCard?.id);
        }}
        onLongPress={() => {
          // Long press for more options
          console.log('Long press:', currentCard?.id);
        }}
        className="relative w-full h-full"
      >
        {/* Render cards with smooth transitions */}
        <AnimatePresence mode="wait">
          {cards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0 }}
              animate={{
                opacity: index === currentIndex ? 1 : 0,
                scale: index === currentIndex ? 1 : 0.95,
              }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`absolute inset-0 ${
                index === currentIndex ? 'z-10' : 'z-0 pointer-events-none'
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
            </motion.div>
          ))}
        </AnimatePresence>
      </SwipeEngine>

      {/* Modern Navigation Indicators with Glass Design */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-20 px-4 py-2 rounded-full"
        style={{
          background: designTokens.colors.glass.bgDark,
          backdropFilter: designTokens.colors.glass.backdrop,
          border: `1px solid ${designTokens.colors.glass.borderDark}`,
        }}
      >
        <div className="flex items-center gap-2">
          {cards.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map((_, idx) => {
            const actualIndex = Math.max(0, currentIndex - 2) + idx;
            return (
              <motion.div
                key={actualIndex}
                animate={{
                  width: actualIndex === currentIndex ? 32 : 4,
                  backgroundColor:
                    actualIndex === currentIndex
                      ? 'rgba(255, 255, 255, 1)'
                      : 'rgba(156, 163, 175, 0.5)',
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="h-1 rounded-full"
                aria-label={`Property ${actualIndex + 1} of ${cards.length}`}
                role="progressbar"
                aria-valuenow={actualIndex + 1}
                aria-valuemin={1}
                aria-valuemax={cards.length}
              />
            );
          })}
        </div>
      </motion.div>

      {/* Loading indicator for infinite scroll - Modern Glass Design */}
      <AnimatePresence>
        {isLoading && cards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 p-3 rounded-full"
            style={{
              background: designTokens.colors.glass.bgDark,
              backdropFilter: designTokens.colors.glass.backdrop,
              border: `1px solid ${designTokens.colors.glass.borderDark}`,
            }}
          >
            <Loader2 className="w-6 h-6 text-white animate-spin" strokeWidth={2.5} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
