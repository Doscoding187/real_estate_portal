/**
 * TrendingVideosSection Component
 * 
 * Displays a horizontal scrollable section of trending videos.
 * First content section after the header in the Explore Home page.
 * 
 * Requirements: 1.1, 1.2, 2.4, 2.5, 3.2, 3.3, 4.2
 */

import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Play, Video } from 'lucide-react';
import { TrendingVideoCard } from './TrendingVideoCard';
import { useTrendingVideos, TrendingVideo } from '@/hooks/useTrendingVideos';
import { designTokens } from '@/lib/design-tokens';
import { staggerContainerVariants, staggerItemVariants } from '@/lib/animations/exploreAnimations';

interface TrendingVideosSectionProps {
  categoryId?: number;
  onVideoClick: (video: TrendingVideo) => void;
  onSeeAll: () => void;
}

export function TrendingVideosSection({ 
  categoryId, 
  onVideoClick, 
  onSeeAll 
}: TrendingVideosSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { videos, isLoading, isEmpty } = useTrendingVideos({ categoryId, limit: 12 });

  // Don't render if empty and not loading (graceful hide)
  if (isEmpty && !isLoading) {
    return (
      <motion.section
        className="py-4"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        role="region"
        aria-label="Trending videos"
      >
        <EmptyCategoryState onViewAll={onSeeAll} />
      </motion.section>
    );
  }

  return (
    <motion.section
      className="py-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      role="region"
      aria-label="Trending videos"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: designTokens.colors.accent.gradient }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />
          </motion.div>
          <div>
            <h2 
              className="text-lg font-semibold"
              style={{ color: designTokens.colors.text.primary }}
            >
              Trending Now
            </h2>
            <p 
              className="text-xs"
              style={{ color: designTokens.colors.text.secondary }}
            >
              Popular videos this week
            </p>
          </div>
        </div>
        
        <motion.button
          onClick={onSeeAll}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
          style={{
            color: designTokens.colors.accent.primary,
            backgroundColor: `${designTokens.colors.accent.primary}10`,
          }}
          whileHover={{ 
            backgroundColor: `${designTokens.colors.accent.primary}20`,
            scale: 1.02,
          }}
          whileTap={{ scale: 0.98 }}
          aria-label="See all trending videos"
        >
          <span>See All</span>
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Scrollable Video Row */}
      <div className="relative -mx-4 sm:-mx-6 lg:-mx-8">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              className="flex gap-3 px-4 sm:px-6 lg:px-8 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              role="list"
              aria-label="Loading trending videos"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} index={i} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="content"
              ref={scrollContainerRef}
              className="flex gap-3 px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-hide pb-2"
              style={{
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
              }}
              variants={staggerContainerVariants}
              initial="initial"
              animate="animate"
              role="list"
              aria-label="Trending videos"
            >
              {videos.map((video, index) => (
                <motion.div
                  key={video.id}
                  variants={staggerItemVariants}
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <TrendingVideoCard
                    video={video}
                    onClick={() => onVideoClick(video)}
                    index={index}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

// Skeleton card for loading state
function SkeletonCard({ index }: { index: number }) {
  return (
    <motion.div
      className="flex-shrink-0"
      style={{ width: 160 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
    >
      <div 
        className="rounded-xl overflow-hidden"
        style={{ 
          aspectRatio: '9/16',
          backgroundColor: designTokens.colors.bg.tertiary,
        }}
      >
        <motion.div
          className="w-full h-full"
          animate={{
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ backgroundColor: designTokens.colors.bg.tertiary }}
        />
      </div>
      <div className="mt-2 px-1 space-y-2">
        <div 
          className="h-3 rounded"
          style={{ 
            backgroundColor: designTokens.colors.bg.tertiary,
            width: '90%',
          }}
        />
        <div 
          className="h-3 rounded"
          style={{ 
            backgroundColor: designTokens.colors.bg.tertiary,
            width: '60%',
          }}
        />
      </div>
    </motion.div>
  );
}

// Empty state when no videos match category
function EmptyCategoryState({ onViewAll }: { onViewAll: () => void }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-8 px-4 text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
        style={{ backgroundColor: designTokens.colors.bg.tertiary }}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Video 
          className="w-6 h-6" 
          style={{ color: designTokens.colors.text.tertiary }}
        />
      </motion.div>
      <p 
        className="text-sm mb-2"
        style={{ color: designTokens.colors.text.secondary }}
      >
        No trending videos in this category
      </p>
      <motion.button
        onClick={onViewAll}
        className="text-sm font-medium"
        style={{ color: designTokens.colors.accent.primary }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        View all videos →
      </motion.button>
    </motion.div>
  );
}
