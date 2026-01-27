/**
 * Skeleton Loading Components
 * Task 17.4: Progressive loading - Loading skeletons
 *
 * Provides animated placeholder components for content loading states.
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

/**
 * Base skeleton component with shimmer animation
 */
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-pulse rounded-md bg-gray-200 dark:bg-gray-700', className)} />;
}

/**
 * Property card skeleton for Explore feed
 */
export function PropertyCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
      {/* Image placeholder */}
      <Skeleton className="w-full h-48" />

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Price */}
        <Skeleton className="h-6 w-24" />

        {/* Title */}
        <Skeleton className="h-4 w-full" />

        {/* Location */}
        <Skeleton className="h-4 w-3/4" />

        {/* Features row */}
        <div className="flex gap-4 pt-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  );
}

/**
 * Video card skeleton for video feed
 */
export function VideoCardSkeleton() {
  return (
    <div className="relative aspect-[9/16] bg-gray-900 rounded-xl overflow-hidden">
      <Skeleton className="absolute inset-0 bg-gray-800" />

      {/* Overlay content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
        <Skeleton className="h-5 w-20 bg-gray-700" />
        <Skeleton className="h-4 w-full bg-gray-700" />
        <Skeleton className="h-4 w-2/3 bg-gray-700" />
      </div>

      {/* Action buttons */}
      <div className="absolute right-4 bottom-20 space-y-4">
        <Skeleton className="h-10 w-10 rounded-full bg-gray-700" />
        <Skeleton className="h-10 w-10 rounded-full bg-gray-700" />
        <Skeleton className="h-10 w-10 rounded-full bg-gray-700" />
      </div>
    </div>
  );
}

/**
 * Neighbourhood card skeleton
 */
export function NeighbourhoodCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
      {/* Hero image */}
      <Skeleton className="w-full h-32" />

      {/* Content */}
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />

        {/* Stats row */}
        <div className="flex gap-4 pt-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

/**
 * Content block skeleton (horizontal scroll section)
 */
export function ContentBlockSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center px-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>

      {/* Horizontal scroll items */}
      <div className="flex gap-4 px-4 overflow-hidden">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-shrink-0 w-64">
            <PropertyCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Category chip skeleton
 */
export function CategoryChipSkeleton() {
  return (
    <div className="flex gap-2 px-4 overflow-hidden">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <Skeleton key={i} className="h-8 w-24 rounded-full flex-shrink-0" />
      ))}
    </div>
  );
}

/**
 * Analytics card skeleton
 */
export function AnalyticsCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

/**
 * Full page skeleton for Explore home
 */
export function ExploreHomeSkeleton() {
  return (
    <div className="space-y-8 pb-20">
      {/* Category chips */}
      <CategoryChipSkeleton />

      {/* Content blocks */}
      <ContentBlockSkeleton />
      <ContentBlockSkeleton />
      <ContentBlockSkeleton />
    </div>
  );
}

/**
 * Grid skeleton for property listings
 */
export function PropertyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default Skeleton;
