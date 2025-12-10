/**
 * FeatureTile Component
 * 
 * Displays a specific advertising feature with soft-UI card styling,
 * icon, title, and description. Includes hover lift animation.
 * 
 * Requirements: 5.2, 5.3, 11.2
 * 
 * REFACTORED: Layout via Tailwind, visual tokens via inline styles only
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
      className={`feature-tile flex flex-col items-start gap-6 p-8 rounded-2xl bg-white relative overflow-hidden cursor-default ${className}`}
      initial="rest"
      whileHover="hover"
      animate="rest"
      style={{
        // Visual tokens only - shadows
        boxShadow: softUITokens.shadows.soft,
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
        className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          // Visual tokens only - background color
          background: softUITokens.colors.primary.light,
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
          style={{
            color: softUITokens.colors.primary.base,
          }}
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
        <h3 className="text-xl font-semibold text-gray-900 mb-2 leading-snug">
          {title}
        </h3>

        {/* Description */}
        <p className="text-base text-gray-600 leading-relaxed">
          {description}
        </p>
      </div>
    </motion.div>
  );
};
