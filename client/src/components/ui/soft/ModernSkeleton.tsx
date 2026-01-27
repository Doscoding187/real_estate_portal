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
 * - Matches actual card layouts precisely
 *
 * Requirements: 7.4
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

/**
 * Base skeleton component with subtle pulse animation
 */
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
        className,
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

  return count > 1 ? <div className="space-y-3">{skeletons}</div> : skeletons[0];
}

/**
 * PropertyCardSkeleton
 * Skeleton loader matching PropertyCard layout exactly
 *
 * Layout:
 * - Image (aspect-[4/3])
 * - Price (text-xl)
 * - Title (2 lines)
 * - Location
 * - Features (beds, baths, size)
 */
export function PropertyCardSkeleton() {
  return (
    <div className="modern-card p-0 overflow-hidden" role="status" aria-label="Loading property">
      {/* Image skeleton - matches aspect-[4/3] */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <ModernSkeleton variant="custom" className="absolute inset-0 rounded-t-lg" />

        {/* Property type badge skeleton */}
        <div className="absolute top-3 left-3">
          <ModernSkeleton variant="custom" width="80px" height="24px" className="rounded-full" />
        </div>

        {/* Save button skeleton */}
        <div className="absolute top-3 right-3">
          <ModernSkeleton variant="custom" width="40px" height="40px" className="rounded-full" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* Price skeleton - text-xl */}
        <ModernSkeleton variant="custom" width="50%" height="28px" className="rounded" />

        {/* Title skeleton - 2 lines */}
        <div className="space-y-2">
          <ModernSkeleton variant="text" width="90%" />
          <ModernSkeleton variant="text" width="70%" />
        </div>

        {/* Location skeleton */}
        <ModernSkeleton variant="text" width="60%" />

        {/* Features skeleton - beds, baths, size */}
        <div className="flex items-center gap-4 pt-1">
          <ModernSkeleton variant="text" width="50px" />
          <ModernSkeleton variant="text" width="50px" />
          <ModernSkeleton variant="text" width="60px" />
        </div>
      </div>
    </div>
  );
}

/**
 * VideoCardSkeleton
 * Skeleton loader matching VideoCard layout exactly
 *
 * Layout:
 * - Thumbnail (aspect-[9/16])
 * - Duration badge (bottom-right)
 * - Views badge (bottom-left)
 * - Save button (top-right)
 * - Title (2 lines)
 * - Creator info
 */
export function VideoCardSkeleton() {
  return (
    <div className="modern-card p-0 overflow-hidden" role="status" aria-label="Loading video">
      {/* Thumbnail skeleton - matches aspect-[9/16] */}
      <div className="relative aspect-[9/16] overflow-hidden bg-gray-100">
        <ModernSkeleton variant="custom" className="absolute inset-0 rounded-t-lg" />

        {/* Play button skeleton */}
        <div className="absolute inset-0 flex items-center justify-center">
          <ModernSkeleton variant="custom" width="64px" height="64px" className="rounded-full" />
        </div>

        {/* Duration badge skeleton */}
        <div className="absolute bottom-3 right-3">
          <ModernSkeleton variant="custom" width="48px" height="24px" className="rounded" />
        </div>

        {/* Views badge skeleton */}
        <div className="absolute bottom-3 left-3">
          <ModernSkeleton variant="custom" width="60px" height="24px" className="rounded" />
        </div>

        {/* Save button skeleton */}
        <div className="absolute top-3 right-3">
          <ModernSkeleton variant="custom" width="40px" height="40px" className="rounded-full" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-3 space-y-3">
        {/* Title skeleton - 2 lines */}
        <div className="space-y-2">
          <ModernSkeleton variant="text" width="95%" />
          <ModernSkeleton variant="text" width="75%" />
        </div>

        {/* Creator info skeleton */}
        <div className="flex items-center gap-2">
          <ModernSkeleton variant="avatar" className="w-6 h-6" />
          <ModernSkeleton variant="text" width="100px" />
        </div>
      </div>
    </div>
  );
}

/**
 * NeighbourhoodCardSkeleton
 * Skeleton loader matching NeighbourhoodCard layout exactly
 *
 * Layout:
 * - Image with gradient overlay (aspect-[16/10])
 * - Follow button (top-right)
 * - Name and city (overlay on image)
 * - Avg price and price change
 * - Highlights (pills)
 * - Property count and followers
 */
export function NeighbourhoodCardSkeleton() {
  return (
    <div
      className="modern-card p-0 overflow-hidden"
      role="status"
      aria-label="Loading neighbourhood"
    >
      {/* Image skeleton - matches aspect-[16/10] */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        <ModernSkeleton variant="custom" className="absolute inset-0 rounded-t-lg" />

        {/* Follow button skeleton */}
        <div className="absolute top-3 right-3">
          <ModernSkeleton variant="custom" width="80px" height="36px" className="rounded-full" />
        </div>

        {/* Name and city skeleton (overlay) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
          <ModernSkeleton
            variant="custom"
            width="60%"
            height="28px"
            className="rounded bg-white/30"
          />
          <ModernSkeleton
            variant="custom"
            width="40%"
            height="20px"
            className="rounded bg-white/30"
          />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="p-4 space-y-3">
        {/* Price info skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <ModernSkeleton variant="text" width="60px" />
            <ModernSkeleton variant="custom" width="100px" height="24px" className="rounded" />
          </div>
          <ModernSkeleton variant="custom" width="60px" height="24px" className="rounded" />
        </div>

        {/* Highlights skeleton - pills */}
        <div className="flex flex-wrap gap-2">
          <ModernSkeleton variant="custom" width="80px" height="28px" className="rounded-full" />
          <ModernSkeleton variant="custom" width="90px" height="28px" className="rounded-full" />
        </div>

        {/* Meta info skeleton */}
        <div className="flex items-center gap-4">
          <ModernSkeleton variant="text" width="100px" />
          <ModernSkeleton variant="text" width="90px" />
        </div>
      </div>
    </div>
  );
}

/**
 * InsightCardSkeleton
 * Skeleton loader matching InsightCard layout exactly
 *
 * Layout:
 * - Header with gradient background
 * - Icon and badge
 * - Data value and change
 * - Title
 * - Description (3 lines)
 * - Optional image
 * - Read more indicator
 */
export function InsightCardSkeleton() {
  return (
    <div className="modern-card p-0 overflow-hidden" role="status" aria-label="Loading insight">
      {/* Header skeleton with gradient background */}
      <div className="relative p-4 bg-gradient-to-br from-gray-300 to-gray-400">
        <div className="flex items-start justify-between mb-3">
          {/* Icon skeleton */}
          <ModernSkeleton
            variant="custom"
            width="40px"
            height="40px"
            className="rounded-full bg-white/30"
          />

          {/* Badge skeleton */}
          <ModernSkeleton
            variant="custom"
            width="60px"
            height="24px"
            className="rounded-full bg-white/30"
          />
        </div>

        {/* Data value skeleton */}
        <div className="space-y-2">
          <ModernSkeleton
            variant="custom"
            width="120px"
            height="36px"
            className="rounded bg-white/30"
          />
          <ModernSkeleton
            variant="custom"
            width="100px"
            height="20px"
            className="rounded bg-white/30"
          />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* Title skeleton */}
        <ModernSkeleton variant="custom" width="80%" height="20px" className="rounded" />

        {/* Description skeleton - 3 lines */}
        <div className="space-y-2">
          <ModernSkeleton variant="text" width="100%" />
          <ModernSkeleton variant="text" width="95%" />
          <ModernSkeleton variant="text" width="70%" />
        </div>
      </div>

      {/* Optional image skeleton */}
      <div className="relative h-32 overflow-hidden bg-gray-100">
        <ModernSkeleton variant="custom" className="absolute inset-0" />
      </div>

      {/* Read more indicator skeleton */}
      <div className="px-4 pb-4 pt-2">
        <ModernSkeleton variant="text" width="100px" />
      </div>
    </div>
  );
}
