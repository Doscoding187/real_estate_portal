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
import { softUITokens } from './design-tokens';
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
      className={`final-cta-section py-20 md:py-28 ${className}`}
      style={{
        background: softUITokens.colors.neutral.gray50,
      }}
      aria-labelledby="final-cta-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
            className="text-3xl md:text-4xl font-semibold mb-6 leading-tight"
            style={{
              color: softUITokens.colors.neutral.gray900,
            }}
          >
            {headline}
          </motion.h2>

          {/* Subtext */}
          <motion.p
            variants={fadeUp}
            className="text-lg md:text-xl mb-10 text-gray-600 leading-relaxed max-w-2xl mx-auto"
            style={{
              maxWidth: '600px',
              margin: '0 auto 2.5rem',
            }}
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
              className="justify-center"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};


export default FinalCTASection;
