/**
 * MobileStickyCTA Component
 *
 * Sticky CTA button that appears on mobile devices after scrolling past the hero section.
 * Includes slide-up animation and dismissible functionality.
 *
 * Requirements: 8.3
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { softUITokens } from './design-tokens';
import { trackCTAClick } from '@/lib/analytics/advertiseTracking';

export interface MobileStickyCTAProps {
  label: string;
  href: string;
  isVisible: boolean;
  onDismiss?: () => void;
  onClick?: () => void;
  className?: string;
}

export const MobileStickyCTA: React.FC<MobileStickyCTAProps> = ({
  label,
  href,
  isVisible,
  onDismiss,
  onClick,
  className = '',
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  // Reset dismissed state when visibility changes
  useEffect(() => {
    if (!isVisible) {
      setIsDismissed(false);
    }
  }, [isVisible]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    trackCTAClick({
      ctaLabel: label,
      ctaLocation: 'mobile_sticky',
      ctaHref: href,
    });

    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const handleDismiss = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsDismissed(true);

    // Track dismiss event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'sticky_cta_dismiss', {
        event_category: 'engagement',
        timestamp: new Date().toISOString(),
      });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Mobile Sticky CTA Dismissed');
    }

    if (onDismiss) {
      onDismiss();
    }
  };

  const shouldShow = isVisible && !isDismissed;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
          }}
          className={`mobile-sticky-cta md:hidden ${className}`}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: softUITokens.zIndex.sticky,
            padding: '1rem',
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
            background: softUITokens.colors.neutral.white,
            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)',
            borderTop: `1px solid ${softUITokens.colors.neutral.gray200}`,
          }}
        >
          <div className="flex items-center gap-3">
            {/* CTA Button */}
            <motion.a
              href={href}
              onClick={handleClick}
              className="flex-1"
              whileTap={{ scale: 0.98 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.875rem 1.5rem',
                fontSize: softUITokens.typography.fontSize.lg,
                fontWeight: softUITokens.typography.fontWeight.semibold,
                borderRadius: softUITokens.borderRadius.soft,
                background: softUITokens.colors.primary.gradient,
                color: softUITokens.colors.neutral.white,
                textDecoration: 'none',
                boxShadow: softUITokens.shadows.soft,
                transition: `all ${softUITokens.transitions.base}`,
              }}
              aria-label={label}
            >
              {label}
            </motion.a>

            {/* Dismiss Button */}
            <motion.button
              onClick={handleDismiss}
              whileTap={{ scale: 0.9 }}
              className="dismiss-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: softUITokens.borderRadius.soft,
                background: softUITokens.colors.neutral.gray100,
                border: 'none',
                cursor: 'pointer',
                transition: `all ${softUITokens.transitions.base}`,
              }}
              aria-label="Dismiss sticky CTA"
            >
              <X size={20} style={{ color: softUITokens.colors.neutral.gray600 }} />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Hook to manage mobile sticky CTA visibility based on scroll position
 */
export const useMobileStickyCTA = (heroSectionId: string = 'hero-section') => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const heroSection = document.getElementById(heroSectionId);

      if (!heroSection) {
        return;
      }

      const heroBottom = heroSection.getBoundingClientRect().bottom;
      const windowHeight = window.innerHeight;

      // Show sticky CTA when hero section is scrolled past
      setIsVisible(heroBottom < windowHeight * 0.2);
    };

    // Initial check
    handleScroll();

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [heroSectionId]);

  return isVisible;
};
