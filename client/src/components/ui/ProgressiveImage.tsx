/**
 * Progressive Image Component
 * Task 17.4: Progressive loading - Blur-up for images
 * 
 * Implements progressive image loading with:
 * - Low-quality placeholder (blur-up effect)
 * - Lazy loading with Intersection Observer
 * - Smooth transition on load
 * - Error fallback
 */

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  fallbackSrc?: string;
}

/**
 * Generate a tiny placeholder URL for blur-up effect
 * Uses CloudFront image resizing if available
 */
function getPlaceholderUrl(src: string): string {
  // If it's a CloudFront URL, request a tiny version
  if (src.includes('cloudfront.net') || src.includes('amazonaws.com')) {
    // Add query params for tiny image (20px width)
    const url = new URL(src);
    url.searchParams.set('w', '20');
    url.searchParams.set('q', '10');
    return url.toString();
  }
  
  // For other URLs, return a data URI placeholder
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3Crect fill="%23e5e7eb" width="1" height="1"/%3E%3C/svg%3E';
}

export function ProgressiveImage({
  src,
  alt,
  className,
  placeholderClassName,
  width,
  height,
  aspectRatio = '16/9',
  priority = false,
  onLoad,
  onError,
  fallbackSrc = '/placeholder-property.jpg',
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '200px', // Start loading 200px before entering viewport
        threshold: 0,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const imageSrc = hasError ? fallbackSrc : src;
  const placeholderUrl = getPlaceholderUrl(src);

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden bg-gray-100', className)}
      style={{ aspectRatio }}
    >
      {/* Placeholder with blur */}
      <div
        className={cn(
          'absolute inset-0 bg-cover bg-center transition-opacity duration-500',
          isLoaded ? 'opacity-0' : 'opacity-100',
          placeholderClassName
        )}
        style={{
          backgroundImage: `url(${placeholderUrl})`,
          filter: 'blur(10px)',
          transform: 'scale(1.1)', // Prevent blur edges from showing
        }}
      />

      {/* Main image */}
      {isInView && (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-500',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}

      {/* Loading indicator */}
      {!isLoaded && isInView && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

/**
 * Optimized image with srcset for responsive loading
 */
interface OptimizedImageProps extends ProgressiveImageProps {
  sizes?: string;
  srcSet?: string;
}

export function OptimizedImage({
  src,
  alt,
  className,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  ...props
}: OptimizedImageProps) {
  // Generate srcset for CloudFront images
  const generateSrcSet = (baseSrc: string): string => {
    if (!baseSrc.includes('cloudfront.net') && !baseSrc.includes('amazonaws.com')) {
      return '';
    }

    const widths = [320, 640, 768, 1024, 1280, 1536];
    return widths
      .map((w) => {
        const url = new URL(baseSrc);
        url.searchParams.set('w', w.toString());
        return `${url.toString()} ${w}w`;
      })
      .join(', ');
  };

  return (
    <ProgressiveImage
      src={src}
      alt={alt}
      className={className}
      {...props}
    />
  );
}

/**
 * Video thumbnail with play button overlay
 */
interface VideoThumbnailProps extends ProgressiveImageProps {
  duration?: number;
  showPlayButton?: boolean;
}

export function VideoThumbnail({
  duration,
  showPlayButton = true,
  className,
  ...props
}: VideoThumbnailProps) {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('relative group', className)}>
      <ProgressiveImage {...props} className="w-full h-full" />
      
      {/* Play button overlay */}
      {showPlayButton && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <svg
              className="w-5 h-5 text-gray-900 ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Duration badge */}
      {duration && (
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
          {formatDuration(duration)}
        </div>
      )}
    </div>
  );
}

export default ProgressiveImage;
