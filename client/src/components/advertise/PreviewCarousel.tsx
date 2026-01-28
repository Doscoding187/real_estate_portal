/**
 * PreviewCarousel Component - Elevated Card Stack
 *
 * Premium billboard-style carousel with layered card stack effect.
 * Features auto-rotation, swipe gestures, and smooth spring animations.
 * Inspired by Vercel, Linear, and Apple marketing pages.
 *
 * Requirements: 1.3, 11.1, 11.4
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, PanInfo } from 'framer-motion';
import { softUITokens } from './design-tokens';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

export interface PreviewSlide {
  type: 'explore-feed' | 'property-card' | 'developer-showcase';
  imageUrl: string;
  alt: string;
}

export interface PreviewCarouselProps {
  slides: PreviewSlide[];
  autoRotateInterval?: number;
}

export const PreviewCarousel: React.FC<PreviewCarouselProps> = ({
  slides,
  autoRotateInterval = 4000,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState(0);
  const dragX = useMotionValue(0);

  const nextSlide = useCallback(() => {
    setDirection(1);
    setCurrentIndex(prev => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setDirection(-1);
    setCurrentIndex(prev => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goToSlide = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  // Auto-rotate functionality
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;

    const interval = setInterval(nextSlide, autoRotateInterval);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide, autoRotateInterval, slides.length]);

  // Handle drag end
  const handleDragEnd = (_: any, info: PanInfo) => {
    const swipeThreshold = 50;
    if (info.offset.x > swipeThreshold) {
      prevSlide();
    } else if (info.offset.x < -swipeThreshold) {
      nextSlide();
    }
  };

  if (slides.length === 0) {
    return (
      <div
        className="w-full h-96 rounded-3xl bg-gray-100 flex items-center justify-center"
        style={{
          boxShadow: softUITokens.shadows.softLarge,
        }}
      >
        <p className="text-gray-400">No preview available</p>
      </div>
    );
  }

  // Calculate adjacent slide indices
  const prevIndex = (currentIndex - 1 + slides.length) % slides.length;
  const nextIndex = (currentIndex + 1) % slides.length;

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      {/* Elevated Card Stack Container */}
      <div className="relative w-full h-[400px] sm:h-[450px] lg:h-[500px] flex items-center justify-center perspective-1000">
        {/* Previous Slide (Left) - Hidden on mobile */}
        {slides.length > 1 && (
          <motion.div
            key={`prev-${prevIndex}`}
            className="absolute left-0 hidden lg:block pointer-events-none"
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 0.6, x: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              width: '85%',
              height: '90%',
              zIndex: 1,
            }}
          >
            <div
              className="w-full h-full rounded-2xl overflow-hidden"
              style={{
                transform: 'scale(0.92) translateX(-8%) rotateY(8deg)',
                boxShadow: softUITokens.shadows.soft,
              }}
            >
              <OptimizedImage
                src={slides[prevIndex].imageUrl}
                alt=""
                priority={false}
                objectFit="cover"
                className="w-full h-full"
                sizes="(max-width: 1024px) 0px, 500px"
              />
            </div>
          </motion.div>
        )}

        {/* Active Slide (Center) */}
        <motion.div
          key={`active-${currentIndex}`}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          style={{ x: dragX }}
          className="relative cursor-grab active:cursor-grabbing group"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          whileHover={{ scale: 1.02, y: -8 }}
          style={{
            width: '100%',
            maxWidth: '600px',
            height: '100%',
            zIndex: 10,
          }}
        >
          {/* Glow ring effect */}
          <div
            className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${softUITokens.colors.primary.light}, ${softUITokens.colors.secondary.light})`,
              filter: 'blur(20px)',
              zIndex: -1,
            }}
          />

          {/* Card */}
          <div
            className="w-full h-full rounded-3xl overflow-hidden bg-white"
            style={{
              boxShadow: softUITokens.shadows.softLarge,
            }}
          >
            <OptimizedImage
              src={slides[currentIndex].imageUrl}
              alt={slides[currentIndex].alt}
              priority={true}
              objectFit="cover"
              className="w-full h-full"
              sizes="(max-width: 640px) 100vw, 600px"
            />
          </div>

          {/* Type badge */}
          <div
            className="absolute top-4 left-4 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              boxShadow: softUITokens.shadows.soft,
            }}
          >
            {slides[currentIndex].type === 'explore-feed' && '🎥 Explore Feed'}
            {slides[currentIndex].type === 'property-card' && '🏠 Property Card'}
            {slides[currentIndex].type === 'developer-showcase' && '🏗️ Developer Showcase'}
          </div>
        </motion.div>

        {/* Next Slide (Right) - Hidden on mobile */}
        {slides.length > 1 && (
          <motion.div
            key={`next-${nextIndex}`}
            className="absolute right-0 hidden lg:block pointer-events-none"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 0.6, x: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              width: '85%',
              height: '90%',
              zIndex: 1,
            }}
          >
            <div
              className="w-full h-full rounded-2xl overflow-hidden"
              style={{
                transform: 'scale(0.92) translateX(8%) rotateY(-8deg)',
                boxShadow: softUITokens.shadows.soft,
              }}
            >
              <OptimizedImage
                src={slides[nextIndex].imageUrl}
                alt=""
                priority={false}
                objectFit="cover"
                className="w-full h-full"
                sizes="(max-width: 1024px) 0px, 500px"
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Dot Indicators */}
      {slides.length > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className="transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2"
              aria-label={`Go to slide ${index + 1}`}
              aria-current={currentIndex === index ? 'true' : 'false'}
              style={{
                width: currentIndex === index ? '32px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background:
                  currentIndex === index
                    ? softUITokens.colors.primary.gradient
                    : softUITokens.colors.neutral.gray300,
                boxShadow: currentIndex === index ? softUITokens.shadows.soft : 'none',
              }}
            />
          ))}
        </div>
      )}

      {/* Keyboard navigation hint (screen reader only) */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Slide {currentIndex + 1} of {slides.length}
      </div>
    </div>
  );
};
