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
      className={`pricing-card block no-underline bg-white rounded-2xl p-6 md:p-8 border-2 border-gray-200 cursor-pointer relative overflow-hidden transition-all duration-300 ${className}`}
      variants={staggerItem}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: '-50px' }}
      whileHover="hover"
      whileTap="tap"
      aria-label={`View ${category} pricing details`}
    >
      {/* Hover border glow effect */}
      <motion.div
        className="absolute -top-0.5 -left-0.5 -right-0.5 -bottom-0.5 rounded-2xl pointer-events-none z-0"
        style={{
          // Visual token only - gradient
          background: softUITokens.colors.primary.gradient,
        }}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Icon */}
        <motion.div
          className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
          style={{
            // Visual token only - background
            background: softUITokens.colors.primary.light,
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
        <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight">{category}</h3>

        {/* Description */}
        <p className="text-base text-gray-600 leading-relaxed mb-6">{description}</p>

        {/* View Pricing Arrow */}
        <motion.div
          className="inline-flex items-center gap-2 text-sm font-semibold"
          style={{
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
