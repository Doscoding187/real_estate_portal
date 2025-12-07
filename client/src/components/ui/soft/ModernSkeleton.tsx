/**
 * ModernSkeleton Component
 * 
 * A modern skeleton loader with subtle pulse animation.
 * Provides variants for different card types and content layouts.
 * 
 * Features:
 * - Smooth pulse animation
 * - Multiple variants (text, card, avatar, video)
 * - Respects prefers-reduced-motion
 * - Customizable dimensions
 */

import { motion } from 'framer-motion';
import { designTokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

interface ModernSkeletonProps {
  variant?: 'text' | 'card' | 'avatar' | 'video' | 'custom';
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
}

const variantClasses = {
  text: 'h-4 rounded',
  card: 'h-64 rounded-lg',
  avatar: 'w-10 h-10 rounded-full',
  video: 'aspect-[9/16] rounded-lg',
  custom: '',
} as const;

export function ModernSkeleton({ 
  variant = 'text',
  width,
  height,
  className = '',
  count = 1,
}: ModernSkeletonProps) {
  const skeletonStyle = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height,
  };

  const skeletons = Array.from({ length: count }, (_, i) => (
    <motion.div
      key={i}
      className={cn(
        variantClasses[variant],
        'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200',
        'bg-[length:200%_100%]',
        className
      )}
      style={skeletonStyle}
      animate={{
        backgroundPosition: ['0% 0%', '100% 0%'],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      }}
      aria-label="Loading..."
      role="status"
    />
  ));

  return count > 1 ? (
    <div className="space-y-3">
      {skeletons}
    </div>
  ) : (
    skeletons[0]
  );
}

/**
 * PropertyCardSkeleton
 * Skeleton loader matching PropertyCard layout
 */
export function PropertyCardSkeleton() {
  return (
    <div className="modern-card p-0 overflow-hidden">
      <ModernSkeleton variant="custom" height="200px" className="rounded-t-lg" />
      <div className="p-4 space-y-3">
        <ModernSkeleton variant="text" width="60%" />
        <ModernSkeleton variant="text" width="40%" />
        <div className="flex gap-2 mt-4">
          <ModernSkeleton variant="text" width="30%" />
          <ModernSkeleton variant="text" width="30%" />
        </div>
      </div>
    </div>
  );
}

/**
 * VideoCardSkeleton
 * Skeleton loader matching VideoCard layout
 */
export function VideoCardSkeleton() {
  return (
    <div className="relative w-full aspect-[9/16] rounded-lg overflow-hidden bg-gray-200">
      <ModernSkeleton variant="video" className="absolute inset-0" />
      <div className="absolute bottom-4 left-4 right-4 space-y-2">
        <ModernSkeleton variant="text" width="80%" className="bg-white/30" />
        <ModernSkeleton variant="text" width="60%" className="bg-white/30" />
      </div>
    </div>
  );
}

/**
 * NeighbourhoodCardSkeleton
 * Skeleton loader matching NeighbourhoodCard layout
 */
export function NeighbourhoodCardSkeleton() {
  return (
    <div className="modern-card p-0 overflow-hidden">
      <ModernSkeleton variant="custom" height="160px" className="rounded-t-lg" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <ModernSkeleton variant="avatar" />
          <div className="flex-1 space-y-2">
            <ModernSkeleton variant="text" width="70%" />
            <ModernSkeleton variant="text" width="50%" />
          </div>
        </div>
        <ModernSkeleton variant="text" count={2} />
      </div>
    </div>
  );
}

/**
 * InsightCardSkeleton
 * Skeleton loader matching InsightCard layout
 */
export function InsightCardSkeleton() {
  return (
    <div className="modern-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <ModernSkeleton variant="custom" width="48px" height="48px" className="rounded-lg" />
        <div className="flex-1 space-y-2">
          <ModernSkeleton variant="text" width="60%" />
          <ModernSkeleton variant="text" width="40%" />
        </div>
      </div>
      <ModernSkeleton variant="text" count={3} />
    </div>
  );
}
