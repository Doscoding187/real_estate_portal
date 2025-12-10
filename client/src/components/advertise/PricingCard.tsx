/**
 * PricingCard Component
 * 
 * Displays a pricing category card with minimalist styling and hover border glow effect.
 * Navigates to full pricing page on click and tracks analytics.
 * 
 * Requirements: 7.2, 7.3
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { softUITokens } from './design-tokens';
import { staggerItem } from '@/lib/animations/advertiseAnimations';

export interface PricingCardProps {
  /**
   * Icon component from lucide-react
   */
  icon: LucideIcon;
  
  /**
   * Pricing category title (e.g., "Agent Plans")
   */
  category: string;
  
  /**
   * Brief description of the pricing category
   */
  description: string;
  
  /**
   * Navigation URL to full pricing page
   */
  href: string;
  
  /**
   * Optional click handler
   */
  onClick?: () => void;
  
  /**
   * Optional additional CSS classes
   */
  className?: string;
}

/**
 * Track pricing card click for analytics
 */
const trackPricingCardClick = (category: string, href: string) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'pricing_card_click', {
      category,
      location: 'pricing_preview',
      href,
      timestamp: new Date().toISOString(),
    });
  }
  
  console.log('Pricing Card Click:', { category, href });
};

export const PricingCard: React.FC<PricingCardProps> = ({
  icon: Icon,
  category,
  description,
  href,
  onClick,
  className = '',
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Track analytics
    trackPricingCardClick(category, href);
    
    // Call custom onClick if provided
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <motion.a
      href={href}
      onClick={handleClick}
      className={`pricing-card ${className}`}
      variants={staggerItem}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: '-50px' }}
      whileHover="hover"
      whileTap="tap"
      style={{
        display: 'block',
        textDecoration: 'none',
        background: softUITokens.colors.neutral.white,
        borderRadius: softUITokens.borderRadius.softLarge,
        padding: softUITokens.spacing['2xl'],
        border: `2px solid ${softUITokens.colors.neutral.gray200}`,
        cursor: 'pointer',
        transition: `all ${softUITokens.transitions.base}`,
        position: 'relative',
        overflow: 'hidden',
      }}
      aria-label={`View ${category} pricing details`}
    >
      {/* Hover border glow effect */}
      <motion.div
        style={{
          position: 'absolute',
          top: -2,
          left: -2,
          right: -2,
          bottom: -2,
          borderRadius: softUITokens.borderRadius.softLarge,
          background: softUITokens.colors.primary.gradient,
          opacity: 0,
          transition: `opacity ${softUITokens.transitions.base}`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Icon */}
        <motion.div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: softUITokens.borderRadius.soft,
            background: softUITokens.colors.primary.light,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: softUITokens.spacing.lg,
          }}
          whileHover={{
            scale: 1.05,
            background: softUITokens.colors.primary.subtle,
          }}
          transition={{ duration: 0.3 }}
        >
          <Icon
            size={28}
            style={{
              color: softUITokens.colors.primary.base,
            }}
            aria-hidden="true"
          />
        </motion.div>

        {/* Category */}
        <h3
          style={{
            fontSize: softUITokens.typography.fontSize.xl,
            fontWeight: softUITokens.typography.fontWeight.bold,
            color: softUITokens.colors.neutral.gray900,
            marginBottom: softUITokens.spacing.md,
            lineHeight: softUITokens.typography.lineHeight.tight,
          }}
        >
          {category}
        </h3>

        {/* Description */}
        <p
          style={{
            fontSize: softUITokens.typography.fontSize.base,
            color: softUITokens.colors.neutral.gray600,
            lineHeight: softUITokens.typography.lineHeight.relaxed,
            marginBottom: softUITokens.spacing.lg,
          }}
        >
          {description}
        </p>

        {/* View Pricing Arrow */}
        <motion.div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: softUITokens.spacing.sm,
            fontSize: softUITokens.typography.fontSize.sm,
            fontWeight: softUITokens.typography.fontWeight.semibold,
            color: softUITokens.colors.primary.base,
          }}
          whileHover={{ x: 4 }}
          transition={{ duration: 0.2 }}
        >
          <span>View Pricing</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M6 3L11 8L6 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      </div>
    </motion.a>
  );
};
