/**
 * ProcessStep Component
 *
 * Displays a single step in the "How It Works" process with number badge,
 * icon, title, and description. Includes staggered animation and gradient
 * number badge.
 *
 * Requirements: 4.2
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { softUITokens } from './design-tokens';
import { staggerItem } from '@/lib/animations/advertiseAnimations';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

export interface ProcessStepProps {
  /**
   * Step number (1, 2, 3, etc.)
   */
  stepNumber: number;

  /**
   * Icon component from lucide-react
   */
  icon: LucideIcon;

  /**
   * Step title
   */
  title: string;

  /**
   * Step description text
   */
  description: string;

  /**
   * Whether to show connecting line to next step (desktop only)
   */
  showConnector?: boolean;

  /**
   * Optional additional CSS classes
   */
  className?: string;
}

export const ProcessStep: React.FC<ProcessStepProps> = ({
  stepNumber,
  icon: Icon,
  title,
  description,
  showConnector = false,
  className = '',
}) => {
  const { ref, isVisible } = useScrollAnimation({
    threshold: 0.2,
    triggerOnce: true,
  });

  return (
    <motion.div
      ref={ref}
      className={`process-step ${className}`}
      variants={staggerItem}
      initial="initial"
      animate={isVisible ? 'animate' : 'initial'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative',
        flex: 1,
      }}
    >
      {/* Number Badge with Gradient Background */}
      <motion.div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: softUITokens.colors.primary.gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: softUITokens.spacing.lg,
          boxShadow: softUITokens.shadows.primaryGlow,
          position: 'relative',
          zIndex: 2,
        }}
        whileHover={{
          scale: 1.05,
          boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
        }}
        transition={{ duration: 0.3 }}
      >
        <span
          style={{
            fontSize: softUITokens.typography.fontSize['3xl'],
            fontWeight: softUITokens.typography.fontWeight.bold,
            color: softUITokens.colors.neutral.white,
          }}
        >
          {stepNumber}
        </span>
      </motion.div>

      {/* Connecting Line (Desktop Only) */}
      {showConnector && (
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: '50%',
            width: '100%',
            height: '2px',
            background: `linear-gradient(to right, ${softUITokens.colors.primary.base}, ${softUITokens.colors.primary.light})`,
            zIndex: 1,
            opacity: 0.3,
          }}
          className="connector-line"
        />
      )}

      {/* Icon Container */}
      <motion.div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: softUITokens.borderRadius.soft,
          background: softUITokens.colors.primary.light,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: softUITokens.spacing.lg,
        }}
        whileHover={{
          scale: 1.1,
          background: softUITokens.colors.primary.subtle,
        }}
        transition={{ duration: 0.3 }}
      >
        <Icon
          size={32}
          style={{
            color: softUITokens.colors.primary.base,
          }}
          aria-hidden="true"
        />
      </motion.div>

      {/* Title */}
      <h3
        style={{
          fontSize: softUITokens.typography.fontSize['2xl'],
          fontWeight: softUITokens.typography.fontWeight.bold,
          color: softUITokens.colors.neutral.gray900,
          marginBottom: softUITokens.spacing.md,
          lineHeight: softUITokens.typography.lineHeight.tight,
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
          maxWidth: '320px',
        }}
      >
        {description}
      </p>
    </motion.div>
  );
};
