/**
 * CTAButton Component
 * 
 * Call-to-action button with primary and secondary variants.
 * Includes hover animations with soft lift effect and click tracking.
 * 
 * Requirements: 1.2, 8.4, 11.2
 */

import React from 'react';
import { motion } from 'framer-motion';
import { softUITokens } from './design-tokens';
import { buttonPress } from '@/lib/animations/advertiseAnimations';

export interface CTAButtonProps {
  label: string;
  href: string;
  variant: 'primary' | 'secondary';
  onClick?: () => void;
  className?: string;
  fullWidth?: boolean;
}

import { trackCTAClick as trackCTA } from '@/lib/analytics/advertiseTracking';

export const CTAButton: React.FC<CTAButtonProps> = ({
  label,
  href,
  variant,
  onClick,
  className = '',
  fullWidth = false,
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Track analytics
    trackCTA({
      ctaLabel: label,
      ctaLocation: 'hero',
      ctaHref: href,
    });
    
    // Call custom onClick if provided
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const isPrimary = variant === 'primary';

  // Visual tokens only - keep gradients, shadows, colors
  const primaryStyles = {
    background: softUITokens.colors.primary.gradient,
    color: softUITokens.colors.neutral.white,
    boxShadow: softUITokens.shadows.soft,
    borderRadius: softUITokens.borderRadius.soft,
    transition: `all ${softUITokens.transitions.base}`,
  };

  const secondaryStyles = {
    background: 'transparent',
    color: softUITokens.colors.primary.base,
    border: `2px solid ${softUITokens.colors.primary.base}`,
    borderRadius: softUITokens.borderRadius.soft,
    transition: `all ${softUITokens.transitions.base}`,
  };

  const hoverStyles = isPrimary
    ? {
        boxShadow: softUITokens.shadows.primaryGlow,
        transform: 'translateY(-2px)',
      }
    : {
        background: softUITokens.colors.primary.light,
        transform: 'translateY(-2px)',
      };

  return (
    <motion.a
      href={href}
      onClick={handleClick}
      className={`cta-button cta-button--${variant} inline-flex items-center justify-center px-8 py-3.5 text-base sm:text-lg font-semibold no-underline cursor-pointer ${fullWidth ? 'w-full' : ''} ${className}`}
      style={isPrimary ? primaryStyles : secondaryStyles}
      variants={buttonPress}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      aria-label={label}
    >
      {label}
    </motion.a>
  );
};

/**
 * CTAButtonGroup Component
 * 
 * Groups primary and secondary CTA buttons with proper spacing
 */
export interface CTAButtonGroupProps {
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

export const CTAButtonGroup: React.FC<CTAButtonGroupProps> = ({
  primaryCTA,
  secondaryCTA,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col sm:flex-row gap-4 ${className}`}
    >
      <CTAButton
        label={primaryCTA.label}
        href={primaryCTA.href}
        variant="primary"
        onClick={primaryCTA.onClick}
      />
      <CTAButton
        label={secondaryCTA.label}
        href={secondaryCTA.href}
        variant="secondary"
        onClick={secondaryCTA.onClick}
      />
    </div>
  );
};
