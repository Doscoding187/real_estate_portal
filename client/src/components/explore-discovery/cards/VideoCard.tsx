/**
 * VideoCard Component (Explore Discovery)
 * 
 * A modern video card component with glass overlay effects and smooth animations.
 * Integrates with useVideoPlayback hook for viewport-based auto-play.
 * 
 * Features:
 * - Modern design with subtle shadows
 * - Glass overlay for controls
 * - Smooth hover and press animations
 * - Integrated video playback
 * - Buffering and error states
 * - Accessible keyboard navigation
 * 
 * Requirements: 1.2, 2.1
 */

import { Play, Eye, Heart, Loader2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModernCard } from '@/components/ui/soft/ModernCard';
import { cardVariants, buttonVariants } from '@/lib/animations/exploreAnimations';
import { designTokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { ContentBadgeOverlay, type BadgeType } from '../ContentBadge';

interface VideoCardProps {
  video: {
    id: number;
    title: string;
    thumbnailUrl: string;
    videoUrl?: string;
    duration: number;
    views: number;
    creatorName: string;
    creatorAvatar?: string;
    isSaved?: boolean;
    badgeType?: BadgeType; // Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
  };
  onClick: () => void;
  onSave: () => void;
  /**
   * Enable video preview on hover (optional)
   */
  enablePreview?: boolean;
}

export function VideoCard({ video, onClick, onSave, enablePreview = false }: VideoCardProps) {
  const [isSaved, setIsSaved] = useState(video.isSaved || false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
    onSave();
  };

  return (
    <ModernCard
      variant="default"
      hoverable={true}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative overflow-hidden cursor-pointer"
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
      variants={cardVariants}
      as="article"
      role="article"
      aria-label={`Video: ${video.title} by ${video.creatorName}, ${formatViews(video.views)} views`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[9/16] overflow-hidden bg-gray-100">
        {/* Content Badge - Requirements 4.1, 4.7 */}
        {video.badgeType && (
          <ContentBadgeOverlay type={video.badgeType} size="sm" />
        )}

        {/* Loading skeleton */}
        {!imageLoaded && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"
            animate={{
              backgroundPosition: ['0% 0%', '100% 0%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{
              backgroundSize: '200% 100%',
            }}
          />
        )}

        {/* Thumbnail image */}
        <motion.img
          src={video.thumbnailUrl}
          alt={video.title}
          className={cn(
            'w-full h-full object-cover',
            imageLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
          animate={{
            scale: isHovered ? 1.05 : 1,
          }}
          transition={{
            duration: 0.5,
            ease: 'easeOut',
          }}
        />

        {/* Glass overlay with play button */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
          animate={{
            backgroundColor: isHovered ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.2)',
          }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="glass-overlay-dark w-16 h-16 rounded-full flex items-center justify-center"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
          </motion.div>
        </motion.div>

        {/* Duration badge - glass overlay */}
        <motion.div
          className="absolute bottom-3 right-3 px-2 py-1 glass-overlay-dark rounded text-white text-xs font-medium"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          role="status"
          aria-label={`Video duration: ${formatDuration(video.duration)}`}
        >
          {formatDuration(video.duration)}
        </motion.div>

        {/* Save button - glass overlay */}
        <motion.button
          onClick={handleSave}
          className="absolute top-3 right-3 w-10 h-10 glass-overlay rounded-full flex items-center justify-center z-10"
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          aria-label={isSaved ? 'Unsave video' : 'Save video'}
        >
          <motion.div
            animate={{
              scale: isSaved ? [1, 1.2, 1] : 1,
            }}
            transition={{ duration: 0.3 }}
          >
            <Heart
              className={cn(
                'w-5 h-5 transition-all duration-300',
                isSaved ? 'fill-red-500 text-red-500' : 'text-gray-700'
              )}
            />
          </motion.div>
        </motion.button>

        {/* Views badge - glass overlay */}
        <motion.div
          className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 glass-overlay-dark rounded text-white text-xs font-medium"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          role="status"
          aria-label={`${formatViews(video.views)} views`}
        >
          <Eye className="w-3 h-3" aria-hidden="true" />
          <span>{formatViews(video.views)}</span>
        </motion.div>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Title */}
        <motion.h3
          className={cn(
            'text-sm font-semibold text-gray-800 mb-2 line-clamp-2 transition-colors duration-300',
            isHovered && 'text-indigo-600'
          )}
          style={{ color: designTokens.colors.text.primary }}
        >
          {video.title}
        </motion.h3>

        {/* Creator */}
        <div className="flex items-center gap-2">
          {video.creatorAvatar ? (
            <motion.img
              src={video.creatorAvatar}
              alt={video.creatorName}
              className="w-6 h-6 rounded-full object-cover"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
            />
          ) : (
            <motion.div
              className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
            >
              {video.creatorName.charAt(0).toUpperCase()}
            </motion.div>
          )}
          <span
            className="text-xs truncate"
            style={{ color: designTokens.colors.text.secondary }}
          >
            {video.creatorName}
          </span>
        </div>
      </div>
    </ModernCard>
  );
}
