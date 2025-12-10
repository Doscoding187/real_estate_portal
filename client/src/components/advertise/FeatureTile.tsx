/**
 * FeatureTile Component
 * 
 * Displays a specific advertising feature with soft-UI card styling,
 * icon, title, and description. Includes hover lift animation.
 * 
 * Requirements: 5.2, 5.3, 11.2
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { softUITokens } from './design-tokens';

export interface FeatureTileProps {
  /**
   * Icon component from lucide-react
   */
  icon: LucideIcon;
  
  /**
   * Feature title
   */
  title: string;
  
  /**
   * Feature description text
   */
  description: string;
  
  /**
   * Optional additional CSS classes
   */
  className?: string;
}

export const FeatureTile: React.FC<FeatureTileProps> = ({
  icon: Icon,
  title,
  description,
  className = '',
}) => {
  return (
    <motion.div
      className={`feature-tile ${className}`}
      initial="rest"
      whileHover="hover"
      animate="rest"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: softUITokens.spacing.lg,
        padding: softUITokens.spacing.xl,
        borderRadius: softUITokens.borderRadius.softLarge,
        background: softUITokens.colors.neutral.white,
        boxShadow: softUITokens.shadows.soft,
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
      variants={{
        rest: {
          y: 0,
          boxShadow: softUITokens.shadows.soft,
        },
        hover: {
          y: -4,
          boxShadow: softUITokens.shadows.softHover,
          transition: {
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1],
          },
        },
      }}
    >
      {/* Icon Container with color transition on hover */}
      <motion.div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: softUITokens.borderRadius.soft,
          background: softUITokens.colors.primary.light,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        variants={{
          rest: {
            background: softUITokens.colors.primary.light,
          },
          hover: {
            background: softUITokens.colors.primary.subtle,
            transition: {
              duration: 0.3,
              ease: [0.4, 0, 0.2, 1],
            },
          },
        }}
      >
        <motion.div
          variants={{
            rest: {
              color: softUITokens.colors.primary.base,
            },
            hover: {
              color: softUITokens.colors.primary.dark,
              transition: {
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
              },
            },
          }}
        >
          <Icon
            size={28}
            aria-hidden="true"
          />
        </motion.div>
      </motion.div>

      {/* Text Content */}
      <div>
        {/* Title */}
        <h3
          style={{
            fontSize: softUITokens.typography.fontSize.xl,
            fontWeight: softUITokens.typography.fontWeight.semibold,
            color: softUITokens.colors.neutral.gray900,
            marginBottom: softUITokens.spacing.sm,
            lineHeight: softUITokens.typography.lineHeight.snug,
          }}
        >
          {title}
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
