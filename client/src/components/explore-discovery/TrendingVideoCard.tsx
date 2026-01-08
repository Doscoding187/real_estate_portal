/**
 * TrendingVideoCard Component
 * 
 * Compact video card optimized for horizontal scrolling in the Trending Videos section.
 * Features 9:16 aspect ratio, glass overlays, and smooth hover animations.
 * 
 * Requirements: 2.1, 2.2, 2.3
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Eye } from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

interface TrendingVideoCardProps {
  video: {
    id: number;
    title: string;
    thumbnailUrl: string;
    duration: number;
    views: number;
    creatorName: string;
    creatorAvatar?: string;
  };
  onClick: () => void;
  index?: number;
}

export function TrendingVideoCard({ video, onClick, index = 0 }: TrendingVideoCardProps) {
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

  return (
    <motion.article
      className="flex-shrink-0 cursor-pointer"
      style={{ width: 160 }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      role="listitem"
      aria-label={`${video.title} by ${video.creatorName}, ${formatViews(video.views)} views`}
    >
      {/* Card container */}
      <motion.div
        className="relative overflow-hidden rounded-xl"
        style={{
          aspectRatio: '9/16',
          boxShadow: isHovered ? designTokens.shadows.md : designTokens.shadows.sm,
        }}
        animate={{
          boxShadow: isHovered ? designTokens.shadows.md : designTokens.shadows.sm,
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Loading skeleton */}
        {!imageLoaded && (
          <motion.div
            className="absolute inset-0"
            style={{ backgroundColor: designTokens.colors.bg.tertiary }}
            animate={{
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* Thumbnail */}
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
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />

        {/* Gradient overlay for text readability */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 40%, transparent 60%)',
          }}
        />

        {/* Play button overlay */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0.8 }}
          animate={{ opacity: isHovered ? 1 : 0.8 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
            animate={{
              scale: isHovered ? 1.1 : 1,
            }}
            transition={{ duration: 0.2 }}
          >
            <Play 
              className="w-5 h-5 text-white ml-0.5" 
              fill="currentColor" 
              aria-hidden="true"
            />
          </motion.div>
        </motion.div>

        {/* Duration badge - bottom right */}
        <motion.div
          className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-white text-xs font-medium"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            fontSize: '11px',
          }}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          aria-label={`Duration: ${formatDuration(video.duration)}`}
        >
          {formatDuration(video.duration)}
        </motion.div>

        {/* Views badge - bottom left */}
        <motion.div
          className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-white text-xs font-medium"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            fontSize: '11px',
          }}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          aria-label={`${formatViews(video.views)} views`}
        >
          <Eye className="w-3 h-3" aria-hidden="true" />
          <span>{formatViews(video.views)}</span>
        </motion.div>
      </motion.div>

      {/* Title and creator info */}
      <div className="mt-2 px-1">
        <h3 
          className="text-xs font-medium line-clamp-2 leading-tight"
          style={{ color: designTokens.colors.text.primary }}
        >
          {video.title}
        </h3>
        <div className="flex items-center gap-1.5 mt-1">
          {video.creatorAvatar ? (
            <img
              src={video.creatorAvatar}
              alt=""
              className="w-4 h-4 rounded-full object-cover"
              aria-hidden="true"
            />
          ) : (
            <div 
              className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold"
              style={{ background: designTokens.colors.accent.gradient }}
              aria-hidden="true"
            >
              {video.creatorName.charAt(0).toUpperCase()}
            </div>
          )}
          <span 
            className="text-[11px] truncate"
            style={{ color: designTokens.colors.text.secondary }}
          >
            {video.creatorName}
          </span>
        </div>
      </div>
    </motion.article>
  );
}
