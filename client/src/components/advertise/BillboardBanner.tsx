/**
 * BillboardBanner Component
 * 
 * Static, clickable banner showcasing a featured development.
 * Designed for hero section to maximize conversion with focused messaging.
 * 
 * Requirements: 1.3, 11.1, 11.2
 */

import React from 'react';
import { motion } from 'framer-motion';
import { softUITokens } from './design-tokens';
import { fadeUp } from '@/lib/animations/advertiseAnimations';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

export interface BillboardBannerProps {
  imageUrl: string;
  alt: string;
  developmentName: string;
  tagline: string;
  ctaLabel?: string;
  href: string;
  onClick?: () => void;
}

export const BillboardBanner: React.FC<BillboardBannerProps> = ({
  imageUrl,
  alt,
  developmentName,
  tagline,
  ctaLabel = 'View Development',
  href,
  onClick,
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <motion.a
      href={href}
      onClick={handleClick}
      className="block relative w-full group cursor-pointer"
      variants={fadeUp}
      initial="initial"
      animate="animate"
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      aria-label={`View ${developmentName} development`}
    >
      {/* Glow ring effect on hover */}
      <div
        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${softUITokens.colors.primary.light}, ${softUITokens.colors.secondary.light})`,
          filter: 'blur(20px)',
          zIndex: -1,
        }}
      />

      {/* Banner card */}
      <div
        className="relative w-full h-[400px] sm:h-[450px] lg:h-[500px] rounded-3xl overflow-hidden bg-white"
        style={{
          boxShadow: softUITokens.shadows.softLarge,
        }}
      >
        {/* Background image with optimization */}
        <OptimizedImage
          src={imageUrl}
          alt={alt}
          priority={true}
          objectFit="cover"
          className="w-full h-full transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 720px"
        />

        {/* Gradient overlay for text readability */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
        />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8 lg:p-10">
          {/* Development name */}
          <motion.h3
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 leading-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {developmentName}
          </motion.h3>

          {/* Tagline */}
          <motion.p
            className="text-base sm:text-lg lg:text-xl text-white/90 mb-4 leading-relaxed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {tagline}
          </motion.p>

          {/* CTA button */}
          <motion.div
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm sm:text-base font-medium backdrop-blur-md transition-all duration-300 group-hover:gap-3"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              boxShadow: softUITokens.shadows.soft,
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <span className="text-gray-900">{ctaLabel}</span>
            <svg
              className="w-4 h-4 text-gray-900 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </motion.div>
        </div>

        {/* Featured badge */}
        <div
          className="absolute top-4 left-4 px-4 py-2 rounded-full text-xs sm:text-sm font-medium backdrop-blur-md"
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            boxShadow: softUITokens.shadows.soft,
          }}
        >
          🏗️ Featured Development
        </div>
      </div>
    </motion.a>
  );
};
