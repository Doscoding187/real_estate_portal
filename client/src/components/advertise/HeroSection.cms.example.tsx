/**
 * HeroSection Component - CMS Integration Example
 * 
 * This is an example showing how to update the HeroSection component
 * to use CMS-managed content instead of hardcoded props.
 * 
 * BEFORE: Component received props with hardcoded content
 * AFTER: Component fetches content from CMS
 */

import React from 'react';
import { motion } from 'framer-motion';
import { softUITokens } from './design-tokens';
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations/advertiseAnimations';
import { CTAButtonGroup } from './CTAButton';
import { BillboardBanner } from './BillboardBanner';
import { TrustSignals } from './TrustSignals';
import { BackgroundOrbs } from './BackgroundOrbs';
import { useAdvertiseCMSSection } from '@/hooks/useAdvertiseCMS';
import { SkeletonLoaders } from './SkeletonLoaders';
import { ErrorStates } from './ErrorStates';

/**
 * CMS-Integrated Hero Section
 * 
 * This version fetches content from CMS instead of receiving it as props.
 * It handles loading and error states gracefully.
 */
export const HeroSectionCMS: React.FC = () => {
  // Fetch hero content from CMS
  const { content, isLoading, error } = useAdvertiseCMSSection('hero');

  // Loading state
  if (isLoading) {
    return <SkeletonLoaders.HeroSection />;
  }

  // Error state
  if (error) {
    return (
      <ErrorStates.SectionError
        title="Unable to load hero content"
        message={error.message}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // No content (shouldn't happen with fallback, but handle it)
  if (!content) {
    return null;
  }

  return (
    <section
      className="relative overflow-hidden"
      aria-labelledby="hero-headline"
      aria-describedby="hero-subheadline"
      role="banner"
      style={{
        background: `linear-gradient(135deg, ${softUITokens.colors.primary.light} 0%, ${softUITokens.colors.neutral.white} 50%, ${softUITokens.colors.secondary.light} 100%)`,
        minHeight: 'max(90vh, 640px)',
      }}
    >
      {/* Container with max width */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Left Column: Text Content */}
          <motion.div
            className="text-center lg:text-left space-y-6"
            variants={staggerItem}
          >
            {/* Headline with gradient text - FROM CMS */}
            <motion.h1
              id="hero-headline"
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight tracking-tight"
              variants={fadeUp}
              style={{
                background: softUITokens.colors.primary.gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {content.headline}
            </motion.h1>

            {/* Subheadline - FROM CMS */}
            <motion.p
              id="hero-subheadline"
              className="text-lg sm:text-xl lg:text-2xl text-gray-600 leading-relaxed max-w-2xl mx-auto lg:mx-0"
              variants={fadeUp}
            >
              {content.subheadline}
            </motion.p>

            {/* CTA Button Group - FROM CMS */}
            <motion.div
              className="justify-center lg:justify-start"
              variants={fadeUp}
            >
              <CTAButtonGroup
                primaryCTA={content.primaryCTA}
                secondaryCTA={content.secondaryCTA}
              />
            </motion.div>

            {/* Trust Signals - FROM CMS */}
            {content.trustSignals.length > 0 && (
              <TrustSignals signals={content.trustSignals} />
            )}
          </motion.div>

          {/* Right Column: Static Billboard Banner - FROM CMS */}
          <motion.div
            className="relative"
            variants={staggerItem}
          >
            <BillboardBanner
              imageUrl={content.billboard.imageUrl}
              alt={content.billboard.alt}
              developmentName={content.billboard.developmentName}
              tagline={content.billboard.tagline}
              ctaLabel={content.billboard.ctaLabel}
              href={content.billboard.href}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Background Orbs */}
      <BackgroundOrbs />
    </section>
  );
};

/**
 * Migration Notes:
 * 
 * 1. REMOVED: Props interface (HeroSectionProps)
 *    - No longer needed as content comes from CMS
 * 
 * 2. ADDED: useAdvertiseCMSSection hook
 *    - Fetches hero content from CMS
 *    - Provides loading and error states
 * 
 * 3. ADDED: Loading state handling
 *    - Shows skeleton loader while fetching
 * 
 * 4. ADDED: Error state handling
 *    - Shows error message with retry option
 * 
 * 5. CHANGED: All content references
 *    - From: props.headline
 *    - To: content.headline
 * 
 * 6. BENEFIT: Content is now editable via CMS admin panel
 *    - No code changes needed to update text
 *    - Validation ensures content quality
 *    - Easy A/B testing of headlines
 */

/**
 * Usage in parent component:
 * 
 * BEFORE:
 * ```tsx
 * <HeroSection
 *   headline="Reach Thousands..."
 *   subheadline="Advertise your properties..."
 *   primaryCTA={{ label: "Get Started", href: "/register", variant: "primary" }}
 *   secondaryCTA={{ label: "Request Demo", href: "/contact", variant: "secondary" }}
 *   billboard={{ ... }}
 *   trustSignals={[ ... ]}
 * />
 * ```
 * 
 * AFTER:
 * ```tsx
 * <HeroSectionCMS />
 * ```
 * 
 * Much simpler! Content is managed in CMS.
 */
