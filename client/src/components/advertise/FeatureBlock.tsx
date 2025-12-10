/**
 * FeatureBlock Component
 * 
 * Displays a value proposition feature with soft-UI icon, headline, and description.
 * Includes scroll-triggered fade-up animation and icon pulse on hover.
 * 
 * Requirements: 3.2, 3.3, 11.1
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { softUITokens } from './design-tokens';
import { fadeUp } from '@/lib/animations/advertiseAnimations';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

export interface FeatureBlockProps {
  /**
   * Icon component from lucide-react
   */
  icon: LucideIcon;
  
  /**
   * Feature headline
   */
  headline: string;
  
  /**
   * Feature description text
   */
  description: string;
  
  /**
   * Index for staggered animation timing
   */
  index: number;
  
  /**
   * Optional additional CSS classes
   */
  className?: string;
}

export const FeatureBlock: React.FC<FeatureBlockProps> = ({
  icon: Icon,
  headline,
  description,
  index,
  className = '',
}) => {
  const { ref, isVisible } = useScrollAnimation({
    threshold: 0.2,
    triggerOnce: true,
  });

  return (
    <motion.div
      ref={ref}
      className={`feature-block ${className}`}
      variants={fadeUp}
      initial="initial"
      animate={isVisible ? "animate" : "initial"}
      transition={{
        duration: 0.4,
        delay: index * 0.1, // Staggered animation
        ease: [0.4, 0, 0.2, 1],
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: softUITokens.spacing.lg,
      }}
    >
      {/* Icon Container with pulse animation on hover */}
      <motion.div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: softUITokens.borderRadius.softLarge,
          background: softUITokens.colors.primary.light,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        whileHover={{
          scale: [1, 1.1, 1],
          background: softUITokens.colors.primary.subtle,
        }}
        transition={{
          scale: {
            duration: 0.6,
            ease: 'easeInOut',
          },
          background: {
            duration: 0.3,
          },
        }}
      >
        <Icon
          size={36}
          style={{
            color: softUITokens.colors.primary.base,
          }}
          aria-hidden="true"
        />
      </motion.div>

      {/* Text Content */}
      <div>
        {/* Headline */}
        <h3
          style={{
            fontSize: softUITokens.typography.fontSize['2xl'],
            fontWeight: softUITokens.typography.fontWeight.bold,
            color: softUITokens.colors.neutral.gray900,
            marginBottom: softUITokens.spacing.md,
            lineHeight: softUITokens.typography.lineHeight.tight,
          }}
        >
          {headline}
        </h3>

        {/* Description */}
        <p
          style={{
            fontSize: softUITokens.typography.fontSize.base,
            color: softUITokens.colors.neutral.gray600,
            lineHeight: softUITokens.typography.lineHeight.relaxed,
          }}
        >
          {description}
        </p>
      </div>
    </motion.div>
  );
};
