/**
 * useAdvertiseAnalytics Hook
 * 
 * React hook for tracking analytics events on the Advertise With Us landing page.
 * Provides easy-to-use functions for tracking CTAs, scroll depth, and user interactions.
 * 
 * Requirements: 8.4, 8.5
 */

import { useEffect, useCallback } from 'react';
import {
  trackCTAClick,
  trackScrollDepth,
  trackPartnerTypeClick,
  trackFAQExpand,
  trackPageView,
  resetScrollDepthTracking,
  type CTAClickMetadata,
  type ScrollDepthMetadata,
  type PartnerTypeClickMetadata,
  type FAQExpandMetadata,
} from '@/lib/analytics/advertiseTracking';

export const useAdvertiseAnalytics = () => {
  // Track page view on mount
  useEffect(() => {
    trackPageView();
    
    // Reset scroll depth tracking for new page view
    resetScrollDepthTracking();
  }, []);
  
  // Set up scroll depth tracking
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const scrollDepthThresholds = [25, 50, 75, 100];
    const trackedDepths = new Set<number>();
    
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      
      const scrollPercentage = Math.round(
        ((scrollTop + windowHeight) / documentHeight) * 100
      );
      
      // Track each threshold once
      scrollDepthThresholds.forEach(threshold => {
        if (scrollPercentage >= threshold && !trackedDepths.has(threshold)) {
          trackedDepths.add(threshold);
          trackScrollDepth({ percentage: threshold });
        }
      });
    };
    
    // Throttle scroll events
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
    };
  }, []);
  
  // Memoized tracking functions
  const trackCTA = useCallback((metadata: CTAClickMetadata) => {
    trackCTAClick(metadata);
  }, []);
  
  const trackScroll = useCallback((metadata: ScrollDepthMetadata) => {
    trackScrollDepth(metadata);
  }, []);
  
  const trackPartnerType = useCallback((metadata: PartnerTypeClickMetadata) => {
    trackPartnerTypeClick(metadata);
  }, []);
  
  const trackFAQ = useCallback((metadata: FAQExpandMetadata) => {
    trackFAQExpand(metadata);
  }, []);
  
  return {
    trackCTA,
    trackScroll,
    trackPartnerType,
    trackFAQ,
  };
};

/**
 * Hook for tracking CTA clicks with location context
 */
export const useCTATracking = (location: string) => {
  const { trackCTA } = useAdvertiseAnalytics();
  
  const handleCTAClick = useCallback(
    (label: string, href: string) => {
      trackCTA({
        ctaLabel: label,
        ctaLocation: location,
        ctaHref: href,
      });
    },
    [trackCTA, location]
  );
  
  return handleCTAClick;
};

/**
 * Hook for tracking section visibility (for engagement metrics)
 */
export const useSectionTracking = (sectionName: string) => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Track section view
            if ((window as any).gtag) {
              (window as any).gtag('event', 'section_view', {
                event_category: 'engagement',
                event_label: sectionName,
                timestamp: new Date().toISOString(),
              });
            }
            
            if (process.env.NODE_ENV === 'development') {
              console.log('📊 Section View:', sectionName);
            }
          }
        });
      },
      {
        threshold: 0.5, // Section is 50% visible
        rootMargin: '0px',
      }
    );
    
    const element = document.getElementById(sectionName);
    if (element) {
      observer.observe(element);
    }
    
    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [sectionName]);
};

