import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ImageUrls {
  thumbnail: string;
  small: string;
  medium: string;
  large: string;
  original: string;
}

interface OptimizedImageProps {
  images: ImageUrls;
  alt: string;
  className?: string;
  priority?: boolean;
}

/**
 * Optimized image component with responsive sizes and lazy loading
 * Automatically serves the right image size based on viewport
 */
export function OptimizedImage({
  images,
  alt,
  className = '',
  priority = false,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Use srcset for responsive images
  const srcSet = `
    ${images.thumbnail} 320w,
    ${images.small} 640w,
    ${images.medium} 1280w,
    ${images.large} 1920w
  `.trim();

  // Sizes attribute tells browser which image to use based on viewport
  const sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {isLoading && <div className="absolute inset-0 bg-muted animate-pulse" aria-hidden="true" />}

      {error ? (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="text-center space-y-2">
            <svg
              className="mx-auto h-12 w-12 text-muted-foreground/50"
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
            <span className="text-sm text-muted-foreground">Failed to load image</span>
          </div>
        </div>
      ) : (
        <img
          src={images.medium} // Default/fallback size
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setError(true);
            setIsLoading(false);
          }}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
          )}
        />
      )}
    </div>
  );
}

/**
 * Optimized image with aspect ratio container
 */
export function OptimizedImageCard({
  images,
  alt,
  aspectRatio = '16/9',
  className,
  priority,
}: OptimizedImageProps & { aspectRatio?: string }) {
  return (
    <div className={cn('relative w-full', className)} style={{ aspectRatio }}>
      <OptimizedImage images={images} alt={alt} className="absolute inset-0" priority={priority} />
    </div>
  );
}
