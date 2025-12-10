/**
 * PartnerTypeCard Component
 * 
 * Displays a partner type option with icon, title, benefit, and CTA.
 * Includes hover lift animation with shadow expansion and click navigation.
 * 
 * Requirements: 2.2, 2.3, 2.4
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { softUITokens } from './design-tokens';
import { softLift, staggerItem } from '@/lib/animations/advertiseAnimations';

export interface PartnerTypeCardProps {
  /**
   * Icon component from lucide-react
   */
  icon: LucideIcon;
  
  /**
   * Partner type title (e.g., "Real Estate Agent")
   */
  title: string;
  
  /**
   * One-sentence benefit description
   */
  benefit: string;
  
  /**
   * Navigation URL for the partner type sub-landing page
   */
  href: string;
  
  /**
   * Index for staggered animation timing
   */
  index: number;
  
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
 * Track partner type selection for analytics
 */
const trackPartnerTypeClick = (partnerType: string, href: string) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'partner_type_click', {
      partnerType,
      location: 'partner_selection',
      href,
      timestamp: new Date().toISOString(),
    });
  }
  
  console.log('Partner Type Click:', { partnerType, href });
};

export const PartnerTypeCard: React.FC<PartnerTypeCardProps> = ({
  icon: Icon,
  title,
  benefit,
  href,
  index,
  onClick,
  className = '',
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Track analytics
    trackPartnerTypeClick(title, href);
    
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
      className={`partner-type-card ${className}`}
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
        boxShadow: softUITokens.shadows.soft,
        cursor: 'pointer',
        transition: `all ${softUITokens.transitions.base}`,
        position: 'relative',
        overflow: 'hidden',
      }}
      aria-label={`Learn more about ${title} advertising`}
    >
      {/* Gradient overlay on hover */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: softUITokens.colors.primary.gradient,
          opacity: 0,
          transition: `opacity ${softUITokens.transitions.base}`,
          pointerEvents: 'none',
        }}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 0.03 }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Icon */}
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
            scale: 1.05,
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

        {/* Benefit */}
        <p
          style={{
            fontSize: softUITokens.typography.fontSize.base,
            color: softUITokens.colors.neutral.gray600,
            lineHeight: softUITokens.typography.lineHeight.relaxed,
            marginBottom: softUITokens.spacing.lg,
          }}
        >
          {benefit}
        </p>

        {/* CTA */}
        <motion.div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: softUITokens.spacing.sm,
            fontSize: softUITokens.typography.fontSize.base,
            fontWeight: softUITokens.typography.fontWeight.semibold,
            color: softUITokens.colors.primary.base,
          }}
          whileHover={{ x: 4 }}
          transition={{ duration: 0.2 }}
        >
          <span>Learn More</span>
          <svg
            width="16"
            height="16"
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

