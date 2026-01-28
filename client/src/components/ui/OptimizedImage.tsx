/**
 * Optimized Image Component
 *
 * Task 21: Add performance optimizations
 * Requirements 5.5, 24.5: Optimize image loading (lazy loading, WebP format)
 *
 * Features:
 * - Lazy loading with Intersection Observer
 * - WebP format with fallback
 * - Responsive srcset for different screen sizes
 * - Blur placeholder while loading
 * - Automatic loading strategy based on position
 */

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean; // Load immediately (above fold)
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Generate responsive image widths
 */
const RESPONSIVE_WIDTHS = [320, 640, 768, 1024, 1280, 1536, 1920];

/**
 * Generate srcset for responsive images
 */
function generateSrcSet(baseUrl: string, widths: number[]): string {
  return widths.map(width => `${baseUrl}?w=${width} ${width}w`).join(', ');
}

/**
 * Generate WebP srcset
 */
function generateWebPSrcSet(baseUrl: string, widths: number[]): string {
  return widths.map(width => `${baseUrl}?w=${width}&format=webp ${width}w`).join(', ');
}

/**
 * Optimized Image Component with lazy loading and WebP support
 */
export function OptimizedImage({
  src,
  alt,
  className,
  width,
  height,
  priority = false,
  objectFit = 'cover',
  sizes = '100vw',
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority); // Priority images start in view
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Lazy loading with Intersection Observer
  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
      },
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Generate srcsets
  const standardSrcSet = generateSrcSet(src, RESPONSIVE_WIDTHS);
  const webpSrcSet = generateWebPSrcSet(src, RESPONSIVE_WIDTHS);

  return (
    <div
      className={cn('relative overflow-hidden bg-gray-100', className)}
      style={{ width, height }}
    >
      {/* Blur placeholder while loading */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-400">
            <svg
              className="w-12 h-12 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">Image not available</p>
          </div>
        </div>
      )}

      {/* Actual image with WebP support */}
      {isInView && !hasError && (
        <picture>
          {/* WebP source for modern browsers */}
          <source type="image/webp" srcSet={webpSrcSet} sizes={sizes} />

          {/* Fallback to standard formats */}
          <img
            ref={imgRef}
            src={src}
            srcSet={standardSrcSet}
            sizes={sizes}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={handleLoad}
            onError={handleError}
            className={cn(
              'w-full h-full transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0',
              objectFit === 'cover' && 'object-cover',
              objectFit === 'contain' && 'object-contain',
              objectFit === 'fill' && 'object-fill',
              objectFit === 'none' && 'object-none',
              objectFit === 'scale-down' && 'object-scale-down',
            )}
            style={{
              width: width || '100%',
              height: height || '100%',
            }}
          />
        </picture>
      )}
    </div>
  );
}

/**
 * Optimized Background Image Component
 * For hero sections and backgrounds
 */
export function OptimizedBackgroundImage({
  src,
  alt,
  className,
  children,
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  children?: React.ReactNode;
  priority?: boolean;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy loading with Intersection Observer
  useEffect(() => {
    if (priority || !containerRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px',
      },
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', className)}>
      {/* Blur placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
      )}

      {/* Background image */}
      {isInView && (
        <picture>
          <source type="image/webp" srcSet={generateWebPSrcSet(src, RESPONSIVE_WIDTHS)} />
          <img
            src={src}
            srcSet={generateSrcSet(src, RESPONSIVE_WIDTHS)}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            onLoad={() => setIsLoaded(true)}
            className={cn(
              'absolute inset-0 w-full h-full object-cover transition-opacity duration-500',
              isLoaded ? 'opacity-100' : 'opacity-0',
            )}
          />
        </picture>
      )}

      {/* Content overlay */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/**
 * Image Gallery with lazy loading
 * Optimized for multiple images
 */
export function OptimizedImageGallery({
  images,
  className,
}: {
  images: Array<{ src: string; alt: string }>;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4', className)}>
      {images.map((image, index) => (
        <OptimizedImage
          key={image.src}
          src={image.src}
          alt={image.alt}
          priority={index < 2} // First 2 images load eagerly
          className="aspect-square rounded-lg"
          objectFit="cover"
        />
      ))}
    </div>
  );
}

export default OptimizedImage;
