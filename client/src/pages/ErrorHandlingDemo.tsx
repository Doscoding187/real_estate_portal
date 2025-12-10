/**
 * Error Handling Demo Page
 * 
 * Demonstrates all error handling components and patterns
 * for the Advertise With Us landing page.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { softUITokens } from '@/components/advertise/design-tokens';
import { fadeUp } from '@/lib/animations/advertiseAnimations';

// Import skeleton loaders
import {
  HeroSectionSkeleton,
  PartnerSelectionSkeleton,
  ValuePropositionSkeleton,
  FeaturesGridSkeleton,
  SocialProofSkeleton,
  PricingPreviewSkeleton,
  FAQSectionSkeleton,
  SectionLoader,
  ProgressiveLoadingIndicator,
} from '@/components/advertise/SkeletonLoaders';

// Import error states
import {
  ErrorState,
  PartnerTypesError,
  MetricsPlaceholder,
  PricingFallbackCTA,
  InlineError,
} from '@/components/advertise/ErrorStates';

// Import error boundary
import {
  AdvertiseErrorBoundary,
  SectionErrorBoundary,
  MinimalErrorFallback,
} from '@/components/advertise/AdvertiseErrorBoundary';

// Component that throws an error for testing
const ErrorThrowingComponent: React.FC = () => {
  throw new Error('This is a simulated error for testing error boundaries');
};

export default function ErrorHandlingDemo() {
  const [activeDemo, setActiveDemo] = useState<string>('skeletons');
  const [showError, setShowError] = useState(false);
  const [progress, setProgress] = useState(0);

  // Simulate progress
  React.useEffect(() => {
    if (activeDemo === 'progressive') {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [activeDemo]);

  const demos = {
    skeletons: {
      title: 'Skeleton Loaders',
      description: 'Loading states for all sections',
    },
    errors: {
      title: 'Error States',
      description: 'Error handling components',
    },
    boundaries: {
      title: 'Error Boundaries',
      description: 'React error boundary demos',
    },
    progressive: {
      title: 'Progressive Loading',
      description: 'Multi-step loading indicator',
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        style={{
          background: softUITokens.colors.primary.gradient,
          color: softUITokens.colors.neutral.white,
          padding: softUITokens.spacing['5xl'],
        }}
      >
        <div className="container mx-auto max-w-7xl">
          <motion.h1
            variants={fadeUp}
            initial="initial"
            animate="animate"
            style={{
              fontSize: softUITokens.typography.fontSize['4xl'],
              fontWeight: softUITokens.typography.fontWeight.bold,
              marginBottom: softUITokens.spacing.md,
            }}
          >
            Error Handling Demo
          </motion.h1>
          <p
            style={{
              fontSize: softUITokens.typography.fontSize.xl,
              opacity: 0.9,
            }}
          >
            Comprehensive error handling system for the Advertise With Us landing page
          </p>
        </div>
      </div>

      {/* Demo Selector */}
      <div
        style={{
          background: softUITokens.colors.neutral.white,
          borderBottom: `1px solid ${softUITokens.colors.neutral.gray200}`,
          padding: softUITokens.spacing.xl,
        }}
      >
        <div className="container mx-auto max-w-7xl">
          <div className="flex gap-4 flex-wrap">
            {Object.entries(demos).map(([key, demo]) => (
              <button
                key={key}
                onClick={() => {
                  setActiveDemo(key);
                  setShowError(false);
                  setProgress(0);
                }}
                style={{
                  padding: `${softUITokens.spacing.md} ${softUITokens.spacing.xl}`,
                  background:
                    activeDemo === key
                      ? softUITokens.colors.primary.gradient
                      : softUITokens.colors.neutral.white,
                  color:
                    activeDemo === key
                      ? softUITokens.colors.neutral.white
                      : softUITokens.colors.neutral.gray700,
                  border: `2px solid ${
                    activeDemo === key
                      ? 'transparent'
                      : softUITokens.colors.neutral.gray300
                  }`,
                  borderRadius: softUITokens.borderRadius.soft,
                  fontSize: softUITokens.typography.fontSize.base,
                  fontWeight: softUITokens.typography.fontWeight.medium,
                  cursor: 'pointer',
                  transition: `all ${softUITokens.transitions.base}`,
                }}
              >
                <div>{demo.title}</div>
                <div
                  style={{
                    fontSize: softUITokens.typography.fontSize.xs,
                    opacity: 0.8,
                    marginTop: '0.25rem',
                  }}
                >
                  {demo.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Demo Content */}
      <div className="container mx-auto max-w-7xl py-12 px-4">
        {/* Skeleton Loaders Demo */}
        {activeDemo === 'skeletons' && (
          <div className="space-y-12">
            <div>
              <h2
                style={{
                  fontSize: softUITokens.typography.fontSize['2xl'],
                  fontWeight: softUITokens.typography.fontWeight.bold,
                  marginBottom: softUITokens.spacing.lg,
                }}
              >
                Hero Section Skeleton
              </h2>
              <HeroSectionSkeleton />
            </div>

            <div>
              <h2
                style={{
                  fontSize: softUITokens.typography.fontSize['2xl'],
                  fontWeight: softUITokens.typography.fontWeight.bold,
                  marginBottom: softUITokens.spacing.lg,
                }}
              >
                Partner Selection Skeleton
              </h2>
              <PartnerSelectionSkeleton />
            </div>

            <div>
              <h2
                style={{
                  fontSize: softUITokens.typography.fontSize['2xl'],
                  fontWeight: softUITokens.typography.fontWeight.bold,
                  marginBottom: softUITokens.spacing.lg,
                }}
              >
                Value Proposition Skeleton
              </h2>
              <ValuePropositionSkeleton />
            </div>

            <div>
              <h2
                style={{
                  fontSize: softUITokens.typography.fontSize['2xl'],
                  fontWeight: softUITokens.typography.fontWeight.bold,
                  marginBottom: softUITokens.spacing.lg,
                }}
              >
                Features Grid Skeleton
              </h2>
              <FeaturesGridSkeleton />
            </div>

            <div>
              <h2
                style={{
                  fontSize: softUITokens.typography.fontSize['2xl'],
                  fontWeight: softUITokens.typography.fontWeight.bold,
                  marginBottom: softUITokens.spacing.lg,
                }}
              >
                Social Proof Skeleton
              </h2>
              <SocialProofSkeleton />
            </div>

            <div>
              <h2
                style={{
                  fontSize: softUITokens.typography.fontSize['2xl'],
                  fontWeight: softUITokens.typography.fontWeight.bold,
                  marginBottom: softUITokens.spacing.lg,
                }}
              >
                Pricing Preview Skeleton
              </h2>
              <PricingPreviewSkeleton />
            </div>

            <div>
              <h2
                style={{
                  fontSize: softUITokens.typography.fontSize['2xl'],
                  fontWeight: softUITokens.typography.fontWeight.bold,
                  marginBottom: softUITokens.spacing.lg,
                }}
              >
                FAQ Section Skeleton
              </h2>
              <FAQSectionSkeleton />
            </div>

            <div>
              <h2
                style={{
                  fontSize: softUITokens.typography.fontSize['2xl'],
                  fontWeight: softUITokens.typography.fontWeight.bold,
                  marginBottom: softUITokens.spacing.lg,
                }}
              >
                Generic Section Loader
              </h2>
              <SectionLoader message="Loading content..." />
            </div>
          </div>
        )}

        {/* Error States Demo */}
        {activeDemo === 'errors' && (
          <div className="space-y-12">
            <div>
              <h2
                style={{
                  fontSize: softUITokens.typography.fontSize['2xl'],
                  fontWeight: softUITokens.typography.fontWeight.bold,
                  marginBottom: softUITokens.spacing.lg,
                }}
              >
                Generic Error State
              </h2>
              <ErrorState
                message="Failed to load content. Please try again."
                onRetry={() => alert('Retry clicked')}
                type="error"
              />
            </div>

            <div>
              <h2
                style={{
                  fontSize: softUITokens.typography.fontSize['2xl'],
                  fontWeight: softUITokens.typography.fontWeight.bold,
                  marginBottom: softUITokens.spacing.lg,
                }}
              >
                Network Error State
              </h2>
              <ErrorState
                message="Unable to connect to the server. Please check your internet connection."
                onRetry={() => alert('Retry clicked')}
                type="network"
              />
            </div>

            <div>
              <h2
                style={{
                  fontSize: softUITokens.typography.fontSize['2xl'],
                  fontWeight: softUITokens.typography.fontWeight.bold,
                  marginBottom: softUITokens.spacing.lg,
                }}
              >
                Warning State
              </h2>
              <ErrorState
                message="Some content could not be loaded. Showing partial results."
                onRetry={() => alert('Retry clicked')}
                type="warning"
              />
            </div>

            <div>
              <h2
                style={{
                  fontSize: softUITokens.typography.fontSize['2xl'],
                  fontWeight: softUITokens.typography.fontWeight.bold,
                  marginBottom: softUITokens.spacing.lg,
                }}
              >
                Partner Types Error
              </h2>
              <PartnerTypesError onRetry={() => alert('Retry clicked')} />
            </div>

            <div>
              <h2
                style={{
                  fontSize: softUITokens.typography.fontSize['2xl'],
                  fontWeight: softUITokens.typography.fontWeight.bold,
                  marginBottom: softUITokens.spacing.lg,
                }}
              >
                Metrics Placeholder
              </h2>
              <MetricsPlaceholder />
            </div>

            <div>
              <h2
                style={{
                  fontSize: softUITokens.typography.fontSize['2xl'],
                  fontWeight: softUITokens.typography.fontWeight.bold,
                  marginBottom: softUITokens.spacing.lg,
                }}
              >
                Pricing Fallback CTA
              </h2>
              <PricingFallbackCTA />
            </div>

            <div>
              <h2
                style={{
                  fontSize: softUITokens.typography.fontSize['2xl'],
                  fontWeight: softUITokens.typography.fontWeight.bold,
                  marginBottom: softUITokens.spacing.lg,
                }}
              >
                Inline Error
              </h2>
              <InlineError
                message="Failed to load this section"
                onRetry={() => alert('Retry clicked')}
              />
            </div>
          </div>
        )}

        {/* Error Boundaries Demo */}
        {activeDemo === 'boundaries' && (
          <div className="space-y-12">
            <div>
              <h2
                style={{
                  fontSize: softUITokens.typography.fontSize['2xl'],
                  fontWeight: softUITokens.typography.fontWeight.bold,
                  marginBottom: softUITokens.spacing.lg,
                }}
              >
                Error Boundary - Normal State
              </h2>
              <SectionErrorBoundary sectionName="Demo Section">
                <div
                  style={{
                    padding: softUITokens.spacing.xl,
                    background: softUITokens.colors.neutral.white,
                    borderRadius: softUITokens.borderRadius.soft,
                    boxShadow: softUITokens.shadows.soft,
                  }}
                >
                  <p>This content is protected by an error boundary.</p>
                  <p>Everything is working normally.</p>
                </div>
              </SectionErrorBoundary>
            </div>

            <div>
              <h2
                style={{
                  fontSize: softUITokens.typography.fontSize['2xl'],
                  fontWeight: softUITokens.typography.fontWeight.bold,
                  marginBottom: softUITokens.spacing.lg,
                }}
              >
                Error Boundary - Error State
              </h2>
              <button
                onClick={() => setShowError(!showError)}
                style={{
                  padding: `${softUITokens.spacing.sm} ${softUITokens.spacing.lg}`,
                  background: showError
                    ? '#ef4444'
                    : softUITokens.colors.primary.gradient,
                  color: softUITokens.colors.neutral.white,
                  border: 'none',
                  borderRadius: softUITokens.borderRadius.soft,
                  cursor: 'pointer',
                  marginBottom: softUITokens.spacing.md,
                }}
              >
                {showError ? 'Hide Error' : 'Trigger Error'}
              </button>
              <SectionErrorBoundary sectionName="Demo Section">
                {showError ? <ErrorThrowingComponent /> : <div>No error</div>}
              </SectionErrorBoundary>
            </div>

            <div>
              <h2
                style={{
                  fontSize: softUITokens.typography.fontSize['2xl'],
                  fontWeight: softUITokens.typography.fontWeight.bold,
                  marginBottom: softUITokens.spacing.lg,
                }}
              >
                Minimal Error Fallback
              </h2>
              <MinimalErrorFallback
                sectionName="Demo Section"
                onRetry={() => alert('Retry clicked')}
              />
            </div>
          </div>
        )}

        {/* Progressive Loading Demo */}
        {activeDemo === 'progressive' && (
          <div className="space-y-12">
            <div>
              <h2
                style={{
                  fontSize: softUITokens.typography.fontSize['2xl'],
                  fontWeight: softUITokens.typography.fontWeight.bold,
                  marginBottom: softUITokens.spacing.lg,
                }}
              >
                Progressive Loading Indicator
              </h2>
              <ProgressiveLoadingIndicator
                progress={progress}
                message="Loading content..."
              />
              <button
                onClick={() => setProgress(0)}
                style={{
                  marginTop: softUITokens.spacing.lg,
                  padding: `${softUITokens.spacing.sm} ${softUITokens.spacing.lg}`,
                  background: softUITokens.colors.primary.gradient,
                  color: softUITokens.colors.neutral.white,
                  border: 'none',
                  borderRadius: softUITokens.borderRadius.soft,
                  cursor: 'pointer',
                }}
              >
                Reset Progress
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
