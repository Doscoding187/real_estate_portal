/**
 * FinalCTASection Component
 *
 * Clean, minimal CTA section at the end of the landing page.
 * Displays compelling headline, subtext, and primary/secondary CTAs.
 *
 * Requirements: 8.1, 8.2
 */

import React from 'react';
import { motion } from 'framer-motion';
import { fadeUp, staggerContainer } from '@/lib/animations/advertiseAnimations';
import { CTAButtonGroup } from './CTAButton';
import { trackCTAClick } from '@/lib/analytics/advertiseTracking';

export interface FinalCTASectionProps {
  headline: string;
  subtext: string;
  primaryCTA: {
    label: string;
    href: string;
    onClick?: () => void;
  };
  secondaryCTA: {
    label: string;
    href: string;
    onClick?: () => void;
  };
  className?: string;
}

export const FinalCTASection: React.FC<FinalCTASectionProps> = ({
  headline,
  subtext,
  primaryCTA,
  secondaryCTA,
  className = '',
}) => {
  // Defensive checks: ensure required props are defined
  if (!headline || !subtext || !primaryCTA || !secondaryCTA) {
    console.warn('FinalCTASection: missing required props', {
      headline,
      subtext,
      primaryCTA,
      secondaryCTA,
    });
    return (
      <section
        className={`final-cta-section bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600 py-20 md:py-28 ${className}`}
        aria-labelledby="final-cta-heading"
      >
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-blue-100">Loading call to action...</p>
        </div>
      </section>
    );
  }

  // Wrap CTA handlers with tracking
  const handlePrimaryCTAClick = () => {
    trackCTAClick({
      ctaLabel: primaryCTA.label,
      ctaLocation: 'final_cta_section',
      ctaHref: primaryCTA.href,
    });
    primaryCTA.onClick?.();
  };

  const handleSecondaryCTAClick = () => {
    trackCTAClick({
      ctaLabel: secondaryCTA.label,
      ctaLocation: 'final_cta_section',
      ctaHref: secondaryCTA.href,
    });
    secondaryCTA.onClick?.();
  };

  return (
    <section
      className={`final-cta-section relative overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600 py-20 md:py-28 ${className}`}
      aria-labelledby="final-cta-heading"
    >
      <div
        className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-100px' }}
          className="text-center"
        >
          {/* Headline */}
          <motion.h2
            id="final-cta-heading"
            variants={fadeUp}
            className="mb-6 text-3xl font-semibold leading-tight text-white md:text-4xl"
          >
            {headline}
          </motion.h2>

          {/* Subtext */}
          <motion.p
            variants={fadeUp}
            className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-blue-100 md:text-xl"
          >
            {subtext}
          </motion.p>

          {/* CTA Button Group */}
          <motion.div variants={fadeUp}>
            <CTAButtonGroup
              primaryCTA={{
                ...primaryCTA,
                onClick: handlePrimaryCTAClick,
              }}
              secondaryCTA={{
                ...secondaryCTA,
                onClick: handleSecondaryCTAClick,
              }}
              surface="dark"
              className="justify-center"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTASection;
