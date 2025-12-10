/**
 * Skeleton Loaders for Advertise Landing Page
 * 
 * Provides loading states for all major sections while content is being fetched.
 * Implements progressive loading with skeleton screens.
 * 
 * Requirements: 10.1
 */

import React from 'react';
import { motion } from 'framer-motion';
import { softUITokens } from './design-tokens';

/**
 * Base skeleton component with shimmer animation
 */
const SkeletonBase: React.FC<{ 
  className?: string; 
  style?: React.CSSProperties;
  'aria-label'?: string;
}> = ({ className = '', style = {}, 'aria-label': ariaLabel }) => (
  <div
    className={`skeleton-base ${className}`}
    style={{
      background: `linear-gradient(90deg, ${softUITokens.colors.neutral.gray200} 25%, ${softUITokens.colors.neutral.gray100} 50%, ${softUITokens.colors.neutral.gray200} 75%)`,
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      borderRadius: softUITokens.borderRadius.soft,
      ...style,
    }}
    role="status"
    aria-label={ariaLabel || 'Loading content'}
    aria-live="polite"
  >
    <style>{`
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  </div>
);

/**
 * Hero Section Skeleton Loader
 */
export const HeroSectionSkeleton: React.FC = () => {
  return (
    <div
      className="hero-skeleton"
      style={{
        background: `linear-gradient(135deg, ${softUITokens.colors.primary.light} 0%, ${softUITokens.colors.neutral.white} 50%, ${softUITokens.colors.secondary.light} 100%)`,
        minHeight: 'max(90vh, 640px)',
        padding: '3rem 1rem',
      }}
      role="region"
      aria-label="Loading hero section"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Column: Text Content Skeleton */}
          <div className="space-y-6">
            {/* Headline skeleton */}
            <div className="space-y-3">
              <SkeletonBase
                style={{ height: '3rem', width: '100%' }}
                aria-label="Loading headline"
              />
              <SkeletonBase
                style={{ height: '3rem', width: '90%' }}
                aria-label="Loading headline"
              />
              <SkeletonBase
                style={{ height: '3rem', width: '80%' }}
                aria-label="Loading headline"
              />
            </div>

            {/* Subheadline skeleton */}
            <div className="space-y-2">
              <SkeletonBase
                style={{ height: '1.5rem', width: '100%' }}
                aria-label="Loading subheadline"
              />
              <SkeletonBase
                style={{ height: '1.5rem', width: '95%' }}
                aria-label="Loading subheadline"
              />
            </div>

            {/* CTA buttons skeleton */}
            <div className="flex gap-4 justify-center lg:justify-start">
              <SkeletonBase
                style={{ height: '3.5rem', width: '10rem' }}
                aria-label="Loading primary button"
              />
              <SkeletonBase
                style={{ height: '3.5rem', width: '10rem' }}
                aria-label="Loading secondary button"
              />
            </div>

            {/* Trust signals skeleton */}
            <div className="flex gap-6 justify-center lg:justify-start">
              <SkeletonBase
                style={{ height: '1.5rem', width: '8rem' }}
                aria-label="Loading trust signal"
              />
              <SkeletonBase
                style={{ height: '1.5rem', width: '8rem' }}
                aria-label="Loading trust signal"
              />
              <SkeletonBase
                style={{ height: '1.5rem', width: '8rem' }}
                aria-label="Loading trust signal"
              />
            </div>
          </div>

          {/* Right Column: Billboard skeleton */}
          <div>
            <SkeletonBase
              style={{ 
                height: '400px', 
                width: '100%',
                borderRadius: softUITokens.borderRadius.softLarge,
              }}
              aria-label="Loading billboard banner"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Partner Selection Section Skeleton
 */
export const PartnerSelectionSkeleton: React.FC = () => {
  return (
    <div
      className="partner-selection-skeleton"
      style={{
        padding: `${softUITokens.spacing['5xl']} ${softUITokens.spacing.xl}`,
        background: softUITokens.colors.neutral.gray50,
      }}
      role="region"
      aria-label="Loading partner selection"
    >
      <div className="container mx-auto max-w-7xl">
        {/* Section header skeleton */}
        <div className="text-center mb-12 space-y-4">
          <SkeletonBase
            style={{ height: '2.5rem', width: '20rem', margin: '0 auto' }}
            aria-label="Loading section title"
          />
          <SkeletonBase
            style={{ height: '1.5rem', width: '30rem', margin: '0 auto' }}
            aria-label="Loading section subtitle"
          />
        </div>

        {/* Partner cards grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="space-y-4">
              <SkeletonBase
                style={{ 
                  height: '200px',
                  borderRadius: softUITokens.borderRadius.softLarge,
                }}
                aria-label={`Loading partner card ${index + 1}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Value Proposition Section Skeleton
 */
export const ValuePropositionSkeleton: React.FC = () => {
  return (
    <div
      className="value-proposition-skeleton"
      style={{
        padding: `${softUITokens.spacing['5xl']} ${softUITokens.spacing.xl}`,
        background: softUITokens.colors.neutral.white,
      }}
      role="region"
      aria-label="Loading value proposition"
    >
      <div className="container mx-auto max-w-7xl">
        {/* Section header skeleton */}
        <div className="text-center mb-12 space-y-4">
          <SkeletonBase
            style={{ height: '2.5rem', width: '25rem', margin: '0 auto' }}
            aria-label="Loading section title"
          />
        </div>

        {/* Feature blocks grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="space-y-4">
              <SkeletonBase
                style={{ height: '3rem', width: '3rem' }}
                aria-label={`Loading feature icon ${index + 1}`}
              />
              <SkeletonBase
                style={{ height: '1.5rem', width: '80%' }}
                aria-label={`Loading feature title ${index + 1}`}
              />
              <div className="space-y-2">
                <SkeletonBase
                  style={{ height: '1rem', width: '100%' }}
                  aria-label={`Loading feature description ${index + 1}`}
                />
                <SkeletonBase
                  style={{ height: '1rem', width: '90%' }}
                  aria-label={`Loading feature description ${index + 1}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Features Grid Section Skeleton
 */
export const FeaturesGridSkeleton: React.FC = () => {
  return (
    <div
      className="features-grid-skeleton"
      style={{
        padding: `${softUITokens.spacing['5xl']} ${softUITokens.spacing.xl}`,
        background: softUITokens.colors.neutral.gray50,
      }}
      role="region"
      aria-label="Loading features grid"
    >
      <div className="container mx-auto max-w-7xl">
        {/* Section header skeleton */}
        <div className="text-center mb-12 space-y-4">
          <SkeletonBase
            style={{ height: '2.5rem', width: '20rem', margin: '0 auto' }}
            aria-label="Loading section title"
          />
        </div>

        {/* Feature tiles grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              style={{
                padding: softUITokens.spacing.xl,
                background: softUITokens.colors.neutral.white,
                borderRadius: softUITokens.borderRadius.softLarge,
                boxShadow: softUITokens.shadows.soft,
              }}
            >
              <div className="space-y-4">
                <SkeletonBase
                  style={{ height: '2.5rem', width: '2.5rem' }}
                  aria-label={`Loading feature icon ${index + 1}`}
                />
                <SkeletonBase
                  style={{ height: '1.5rem', width: '70%' }}
                  aria-label={`Loading feature title ${index + 1}`}
                />
                <div className="space-y-2">
                  <SkeletonBase
                    style={{ height: '1rem', width: '100%' }}
                    aria-label={`Loading feature description ${index + 1}`}
                  />
                  <SkeletonBase
                    style={{ height: '1rem', width: '95%' }}
                    aria-label={`Loading feature description ${index + 1}`}
                  />
                  <SkeletonBase
                    style={{ height: '1rem', width: '85%' }}
                    aria-label={`Loading feature description ${index + 1}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Social Proof Section Skeleton
 */
export const SocialProofSkeleton: React.FC = () => {
  return (
    <div
      className="social-proof-skeleton"
      style={{
        padding: `${softUITokens.spacing['5xl']} ${softUITokens.spacing.xl}`,
        background: softUITokens.colors.neutral.white,
      }}
      role="region"
      aria-label="Loading social proof"
    >
      <div className="container mx-auto max-w-7xl">
        {/* Metrics grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="text-center space-y-2">
              <SkeletonBase
                style={{ height: '3rem', width: '8rem', margin: '0 auto' }}
                aria-label={`Loading metric value ${index + 1}`}
              />
              <SkeletonBase
                style={{ height: '1rem', width: '10rem', margin: '0 auto' }}
                aria-label={`Loading metric label ${index + 1}`}
              />
            </div>
          ))}
        </div>

        {/* Partner logos skeleton */}
        <div className="flex flex-wrap justify-center gap-8">
          {[...Array(6)].map((_, index) => (
            <SkeletonBase
              key={index}
              style={{ height: '3rem', width: '8rem' }}
              aria-label={`Loading partner logo ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Pricing Preview Section Skeleton
 */
export const PricingPreviewSkeleton: React.FC = () => {
  return (
    <div
      className="pricing-preview-skeleton"
      style={{
        padding: `${softUITokens.spacing['5xl']} ${softUITokens.spacing.xl}`,
        background: softUITokens.colors.neutral.gray50,
      }}
      role="region"
      aria-label="Loading pricing preview"
    >
      <div className="container mx-auto max-w-7xl">
        {/* Section header skeleton */}
        <div className="text-center mb-12 space-y-4">
          <SkeletonBase
            style={{ height: '2.5rem', width: '15rem', margin: '0 auto' }}
            aria-label="Loading section title"
          />
        </div>

        {/* Pricing cards grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              style={{
                padding: softUITokens.spacing.xl,
                background: softUITokens.colors.neutral.white,
                borderRadius: softUITokens.borderRadius.softLarge,
                boxShadow: softUITokens.shadows.soft,
              }}
            >
              <div className="space-y-4">
                <SkeletonBase
                  style={{ height: '1.5rem', width: '70%' }}
                  aria-label={`Loading pricing category ${index + 1}`}
                />
                <div className="space-y-2">
                  <SkeletonBase
                    style={{ height: '1rem', width: '100%' }}
                    aria-label={`Loading pricing description ${index + 1}`}
                  />
                  <SkeletonBase
                    style={{ height: '1rem', width: '90%' }}
                    aria-label={`Loading pricing description ${index + 1}`}
                  />
                </div>
                <SkeletonBase
                  style={{ height: '2.5rem', width: '100%' }}
                  aria-label={`Loading pricing button ${index + 1}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * FAQ Section Skeleton
 */
export const FAQSectionSkeleton: React.FC = () => {
  return (
    <div
      className="faq-skeleton"
      style={{
        padding: `${softUITokens.spacing['5xl']} ${softUITokens.spacing.xl}`,
        background: softUITokens.colors.neutral.white,
      }}
      role="region"
      aria-label="Loading FAQ section"
    >
      <div className="container mx-auto max-w-4xl">
        {/* Section header skeleton */}
        <div className="text-center mb-12 space-y-4">
          <SkeletonBase
            style={{ height: '2.5rem', width: '20rem', margin: '0 auto' }}
            aria-label="Loading section title"
          />
        </div>

        {/* FAQ items skeleton */}
        <div className="space-y-4">
          {[...Array(8)].map((_, index) => (
            <div
              key={index}
              style={{
                padding: softUITokens.spacing.lg,
                background: softUITokens.colors.neutral.gray50,
                borderRadius: softUITokens.borderRadius.soft,
              }}
            >
              <SkeletonBase
                style={{ height: '1.5rem', width: '80%' }}
                aria-label={`Loading FAQ question ${index + 1}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Generic Section Loader
 * Used as a fallback for lazy-loaded sections
 */
export const SectionLoader: React.FC<{ 
  minHeight?: string;
  message?: string;
}> = ({ 
  minHeight = '400px',
  message = 'Loading content...'
}) => {
  return (
    <div
      className="section-loader"
      style={{
        minHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: softUITokens.spacing['5xl'],
      }}
      role="status"
      aria-label={message}
      aria-live="polite"
    >
      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{
          width: '3rem',
          height: '3rem',
          border: `4px solid ${softUITokens.colors.neutral.gray200}`,
          borderTopColor: softUITokens.colors.primary.dark,
          borderRadius: '50%',
        }}
        aria-hidden="true"
      />
      <p
        style={{
          marginTop: softUITokens.spacing.lg,
          color: softUITokens.colors.neutral.gray600,
          fontSize: softUITokens.typography.fontSize.lg,
        }}
      >
        {message}
      </p>
    </div>
  );
};

/**
 * Progressive Loading Indicator
 * Shows loading progress for multi-step operations
 */
export const ProgressiveLoadingIndicator: React.FC<{
  progress: number; // 0-100
  message?: string;
}> = ({ progress, message = 'Loading...' }) => {
  return (
    <div
      className="progressive-loading"
      style={{
        padding: softUITokens.spacing.xl,
        textAlign: 'center',
      }}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={message}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          height: '8px',
          background: softUITokens.colors.neutral.gray200,
          borderRadius: softUITokens.borderRadius.soft,
          overflow: 'hidden',
          margin: '0 auto',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: softUITokens.colors.primary.gradient,
          }}
        />
      </div>
      <p
        style={{
          marginTop: softUITokens.spacing.md,
          color: softUITokens.colors.neutral.gray600,
          fontSize: softUITokens.typography.fontSize.sm,
        }}
      >
        {message} ({Math.round(progress)}%)
      </p>
    </div>
  );
};
