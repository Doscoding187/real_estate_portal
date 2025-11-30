/**
 * GradientSkeleton Component
 * Loading skeleton with gradient shimmer animation
 * Part of the Soft UI design system
 * 
 * Requirements: 11.1
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface GradientSkeletonProps {
  /**
   * Shape of the skeleton
   */
  shape?: 'text' | 'circle' | 'rectangle';
  /**
   * Width (CSS value or preset)
   */
  width?: string | number;
  /**
   * Height (CSS value or preset)
   */
  height?: string | number;
  /**
   * Additional className
   */
  className?: string;
}

export const GradientSkeleton = React.forwardRef<HTMLDivElement, GradientSkeletonProps>(
  ({ shape = 'rectangle', width, height, className }, ref) => {
    const getShapeStyles = () => {
      switch (shape) {
        case 'circle':
          return 'rounded-full aspect-square';
        case 'text':
          return 'rounded h-4';
        case 'rectangle':
        default:
          return 'rounded-lg';
      }
    };

    const getDefaultSize = () => {
      switch (shape) {
        case 'circle':
          return { width: '3rem', height: '3rem' };
        case 'text':
          return { width: '100%', height: '1rem' };
        case 'rectangle':
        default:
          return { width: '100%', height: '6rem' };
      }
    };

    const defaultSize = getDefaultSize();
    const style = {
      width: width ?? defaultSize.width,
      height: height ?? defaultSize.height,
    };

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'relative overflow-hidden',
          'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200',
          'bg-[length:200%_100%]',
          // Shimmer animation
          'animate-shimmer',
          getShapeStyles(),
          className
        )}
        style={style}
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
);

GradientSkeleton.displayName = 'GradientSkeleton';
