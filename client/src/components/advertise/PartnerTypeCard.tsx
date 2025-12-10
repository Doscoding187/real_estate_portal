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
import { staggerItem } from '@/lib/animations/advertiseAnimations';

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
      className={`partner-type-card block no-underline bg-white rounded-2xl p-8 cursor-pointer relative overflow-hidden transition-all duration-300 ${className}`}
      variants={staggerItem}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: '-50px' }}
      whileHover="hover"
      whileTap="tap"
      style={{
        // Visual token only - shadow
        boxShadow: softUITokens.shadows.soft,
      }}
      aria-label={`Learn more about ${title} advertising`}
    >
      {/* Gradient overlay on hover */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          // Visual token only - gradient
          background: softUITokens.colors.primary.gradient,
        }}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 0.03 }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Icon */}
        <motion.div
          className="w-16 h-16 rounded-xl flex items-center justify-center mb-6"
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
            size={32}
            style={{
              color: softUITokens.colors.primary.base,
            }}
            aria-hidden="true"
          />
        </motion.div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">
          {title}
        </h3>

        {/* Benefit */}
        <p className="text-base text-gray-600 leading-relaxed mb-6">
          {benefit}
        </p>

        {/* CTA */}
        <motion.div
          className="inline-flex items-center gap-2 text-base font-semibold"
          style={{
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

