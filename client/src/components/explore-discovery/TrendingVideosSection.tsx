import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Flame, Video } from 'lucide-react';
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
  onSeeAll,
}: TrendingVideosSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { videos, isLoading, isEmpty } = useTrendingVideos({ categoryId, limit: 12 });

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
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-600">
            <Flame className="h-3.5 w-3.5" />
            Trending now
          </div>
          <h2
            className="mt-3 text-2xl font-semibold"
            style={{ color: designTokens.colors.text.primary }}
          >
            The fastest-moving media on Explore
          </h2>
          <p className="mt-1 text-sm" style={{ color: designTokens.colors.text.secondary }}>
            Walkthroughs, listings, neighbourhood clips, and home transformations people are watching right now.
          </p>
        </div>

        <motion.button
          onClick={onSeeAll}
          className="hidden items-center gap-1 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white md:inline-flex"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          aria-label="Watch all trending videos"
        >
          <span>Watch all</span>
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>

      <div className="relative overflow-hidden rounded-[36px] border border-slate-200/70 bg-white/80 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              className="flex gap-4 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              role="list"
              aria-label="Loading trending videos"
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} index={i} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="content"
              ref={scrollContainerRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
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
                    variant={index === 0 ? 'hero' : 'rail'}
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

function SkeletonCard({ index }: { index: number }) {
  const isHero = index === 0;

  return (
    <motion.div
      className="flex-shrink-0"
      style={{ width: isHero ? 352 : 272 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
    >
      <div
        className="overflow-hidden rounded-[28px]"
        style={{
          aspectRatio: isHero ? '9/14' : '4/6',
          backgroundColor: designTokens.colors.bg.tertiary,
        }}
      >
        <motion.div
          className="h-full w-full"
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ backgroundColor: designTokens.colors.bg.tertiary }}
        />
      </div>
    </motion.div>
  );
}

function EmptyCategoryState({ onViewAll }: { onViewAll: () => void }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center px-4 py-8 text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: designTokens.colors.bg.tertiary }}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Video className="h-6 w-6" style={{ color: designTokens.colors.text.tertiary }} />
      </motion.div>
      <p className="mb-2 text-sm" style={{ color: designTokens.colors.text.secondary }}>
        No trending videos in this category
      </p>
      <motion.button
        onClick={onViewAll}
        className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        View all videos
      </motion.button>
    </motion.div>
  );
}
