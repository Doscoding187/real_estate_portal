/**
 * Analytics Tracking for Advertise With Us Landing Page
 *
 * Provides tracking utilities for CTA clicks, scroll depth, and user engagement.
 *
 * Requirements: 8.4, 8.5
 */

// Event types
export type AdvertiseEventType =
  | 'page_view'
  | 'cta_click'
  | 'partner_type_click'
  | 'faq_expand'
  | 'scroll_depth'
  | 'sticky_cta_dismiss'
  | 'pricing_card_click'
  | 'feature_tile_hover';

// Device type detection
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export const getDeviceType = (): DeviceType => {
  if (typeof window === 'undefined') return 'desktop';

  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

// Session ID management
let sessionId: string | null = null;

export const getSessionId = (): string => {
  if (sessionId) return sessionId;

  // Try to get from sessionStorage
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const stored = sessionStorage.getItem('advertise_session_id');
    if (stored) {
      sessionId = stored;
      return sessionId;
    }
  }

  // Generate new session ID
  sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Store in sessionStorage
  if (typeof window !== 'undefined' && window.sessionStorage) {
    sessionStorage.setItem('advertise_session_id', sessionId);
  }

  return sessionId;
};

// User ID (if authenticated)
export const getUserId = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;

  // Try to get from localStorage or auth context
  try {
    const stored = localStorage.getItem('user_id');
    return stored || undefined;
  } catch {
    return undefined;
  }
};

// Referrer tracking
export const getReferrer = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  return document.referrer || undefined;
};

// Base event metadata
interface BaseEventMetadata {
  deviceType: DeviceType;
  sessionId: string;
  userId?: string;
  referrer?: string;
  timestamp: string;
}

const getBaseMetadata = (): BaseEventMetadata => ({
  deviceType: getDeviceType(),
  sessionId: getSessionId(),
  userId: getUserId(),
  referrer: getReferrer(),
  timestamp: new Date().toISOString(),
});

// CTA Click Tracking
export interface CTAClickMetadata {
  ctaLabel: string;
  ctaLocation: string;
  ctaHref: string;
}

export const trackCTAClick = (metadata: CTAClickMetadata): void => {
  const event = {
    eventType: 'cta_click' as const,
    ...getBaseMetadata(),
    ...metadata,
  };

  // Send to Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'cta_click', {
      event_category: 'engagement',
      event_label: metadata.ctaLabel,
      cta_location: metadata.ctaLocation,
      cta_href: metadata.ctaHref,
      ...getBaseMetadata(),
    });
  }

  // Send to custom analytics endpoint (if available)
  sendToAnalytics(event);

  // Console log for development
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 CTA Click:', event);
  }
};

// Scroll Depth Tracking
export interface ScrollDepthMetadata {
  percentage: number;
  section?: string;
}

const scrollDepthThresholds = [25, 50, 75, 100];
const trackedScrollDepths = new Set<number>();

export const trackScrollDepth = (metadata: ScrollDepthMetadata): void => {
  // Only track each threshold once per session
  if (trackedScrollDepths.has(metadata.percentage)) {
    return;
  }

  trackedScrollDepths.add(metadata.percentage);

  const event = {
    eventType: 'scroll_depth' as const,
    ...getBaseMetadata(),
    ...metadata,
  };

  // Send to Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'scroll_depth', {
      event_category: 'engagement',
      event_label: `${metadata.percentage}%`,
      scroll_percentage: metadata.percentage,
      section: metadata.section,
      ...getBaseMetadata(),
    });
  }

  // Send to custom analytics endpoint
  sendToAnalytics(event);

  // Console log for development
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Scroll Depth:', event);
  }
};

// Reset scroll depth tracking (useful for SPA navigation)
export const resetScrollDepthTracking = (): void => {
  trackedScrollDepths.clear();
};

// Partner Type Click Tracking
export interface PartnerTypeClickMetadata {
  partnerType: string;
  location: string;
}

export const trackPartnerTypeClick = (metadata: PartnerTypeClickMetadata): void => {
  const event = {
    eventType: 'partner_type_click' as const,
    ...getBaseMetadata(),
    ...metadata,
  };

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'partner_type_click', {
      event_category: 'engagement',
      event_label: metadata.partnerType,
      ...getBaseMetadata(),
    });
  }

  sendToAnalytics(event);

  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Partner Type Click:', event);
  }
};

// FAQ Interaction Tracking
export interface FAQExpandMetadata {
  question: string;
  index: number;
}

export const trackFAQExpand = (metadata: FAQExpandMetadata): void => {
  const event = {
    eventType: 'faq_expand' as const,
    ...getBaseMetadata(),
    ...metadata,
  };

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'faq_expand', {
      event_category: 'engagement',
      event_label: metadata.question,
      faq_index: metadata.index,
      ...getBaseMetadata(),
    });
  }

  sendToAnalytics(event);

  if (process.env.NODE_ENV === 'development') {
    console.log('📊 FAQ Expand:', event);
  }
};

// Page View Tracking
export const trackPageView = (): void => {
  const event = {
    eventType: 'page_view' as const,
    ...getBaseMetadata(),
    page: window.location.pathname,
    title: document.title,
  };

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'page_view', {
      page_path: window.location.pathname,
      page_title: document.title,
      ...getBaseMetadata(),
    });
  }

  sendToAnalytics(event);

  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Page View:', event);
  }
};

// Send event to custom analytics endpoint
const sendToAnalytics = async (event: any): Promise<void> => {
  try {
    // Only send in production or if analytics endpoint is configured
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    const endpoint = '/api/analytics/track';

    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
      // Don't wait for response
      keepalive: true,
    });
  } catch (error) {
    // Silently fail - don't disrupt user experience
    console.error('Analytics tracking error:', error);
  }
};

// Hook for scroll depth tracking
export const useScrollDepthTracking = () => {
  if (typeof window === 'undefined') return;

  const handleScroll = () => {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;

    const scrollPercentage = Math.round(((scrollTop + windowHeight) / documentHeight) * 100);

    // Track each threshold
    scrollDepthThresholds.forEach(threshold => {
      if (scrollPercentage >= threshold && !trackedScrollDepths.has(threshold)) {
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
};
