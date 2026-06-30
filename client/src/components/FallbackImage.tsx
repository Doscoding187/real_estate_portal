import React, { useEffect, useRef, useState } from 'react';
import { PROPERTY_IMAGE_FALLBACK } from '@/lib/mediaUtils';

type FallbackImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null;
  fallbackSrc?: string;
  timeoutMs?: number;
};

export function FallbackImage({
  src,
  fallbackSrc = PROPERTY_IMAGE_FALLBACK,
  timeoutMs = 12000,
  loading = 'lazy',
  onLoad,
  onError,
  ...props
}: FallbackImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(loading === 'eager');

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc);
    setIsLoaded(false);
    setIsInView(loading === 'eager');
  }, [fallbackSrc, loading, src]);

  useEffect(() => {
    if (loading === 'eager' || !imgRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' },
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [loading, currentSrc]);

  useEffect(() => {
    if (!isInView || isLoaded || currentSrc === fallbackSrc) return;

    const timer = window.setTimeout(() => {
      if (!imgRef.current?.complete || imgRef.current.naturalWidth === 0) {
        setCurrentSrc(fallbackSrc);
      }
    }, timeoutMs);

    return () => window.clearTimeout(timer);
  }, [currentSrc, fallbackSrc, isInView, isLoaded, timeoutMs]);

  return (
    <img
      {...props}
      ref={imgRef}
      src={currentSrc}
      loading={loading}
      onLoad={event => {
        setIsLoaded(true);
        onLoad?.(event);
      }}
      onError={event => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
        onError?.(event);
      }}
    />
  );
}
