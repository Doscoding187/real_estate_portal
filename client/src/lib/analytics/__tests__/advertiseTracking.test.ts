/**
 * Analytics Tracking Tests
 * 
 * Tests for the advertise landing page analytics tracking system.
 * Validates event tracking, metadata collection, and integration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  trackCTAClick,
  trackScrollDepth,
  trackPartnerTypeClick,
  trackFAQExpand,
  trackPageView,
  getDeviceType,
  getSessionId,
  getUserId,
  getReferrer,
  resetScrollDepthTracking,
} from '../advertiseTracking';

// Mock sessionStorage and localStorage
const mockSessionStorage = new Map<string, string>();
const mockLocalStorage = new Map<string, string>();

beforeEach(() => {
  vi.clearAllMocks();
  resetScrollDepthTracking();
  mockSessionStorage.clear();
  mockLocalStorage.clear();
  
  // Mock window
  Object.defineProperty(global, 'window', {
    value: {
      innerWidth: 1024,
      sessionStorage: {
        getItem: (key: string) => mockSessionStorage.get(key) || null,
        setItem: (key: string, value: string) => mockSessionStorage.set(key, value),
      },
      localStorage: {
        getItem: (key: string) => mockLocalStorage.get(key) || null,
      },
      gtag: vi.fn(),
      location: {
        pathname: '/advertise',
      },
    },
    writable: true,
  });
  
  // Mock document
  Object.defineProperty(global, 'document', {
    value: {
      referrer: 'https://google.com',
      title: 'Advertise With Us',
    },
    writable: true,
  });
});

describe('Device Type Detection', () => {
  it('should detect mobile devices', () => {
    mockWindow.innerWidth = 500;
    expect(getDeviceType()).toBe('mobile');
  });

  it('should detect tablet devices', () => {
    mockWindow.innerWidth = 800;
    expect(getDeviceType()).toBe('tablet');
  });

  it('should detect desktop devices', () => {
    mockWindow.innerWidth = 1440;
    expect(getDeviceType()).toBe('desktop');
  });
});

describe('Session Management', () => {
  it('should generate a session ID', () => {
    const sessionId = getSessionId();
    expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
  });

  it('should persist session ID in sessionStorage', () => {
    const sessionId = getSessionId();
    expect(mockSessionStorage.has('advertise_session_id')).toBe(true);
    expect(mockSessionStorage.get('advertise_session_id')).toBe(sessionId);
  });

  it('should retrieve existing session ID from sessionStorage', () => {
    const existingId = 'session_123_abc';
    mockSessionStorage.set('advertise_session_id', existingId);
    
    const sessionId = getSessionId();
    expect(sessionId).toBe(existingId);
  });
});

describe('User ID Retrieval', () => {
  it('should return user ID when authenticated', () => {
    mockLocalStorage.set('user_id', 'user_123');
    expect(getUserId()).toBe('user_123');
  });

  it('should return undefined when not authenticated', () => {
    expect(getUserId()).toBeUndefined();
  });
});

describe('Referrer Tracking', () => {
  it('should return referrer when available', () => {
    expect(getReferrer()).toBe('https://google.com');
  });

  it('should return undefined when no referrer', () => {
    mockDocument.referrer = '';
    expect(getReferrer()).toBeUndefined();
  });
});

describe('CTA Click Tracking', () => {
  it('should track CTA clicks with metadata', () => {
    const metadata = {
      ctaLabel: 'Get Started',
      ctaLocation: 'hero_section',
      ctaHref: '/register',
    };

    trackCTAClick(metadata);

    expect((window as any).gtag).toHaveBeenCalledWith(
      'event',
      'cta_click',
      expect.objectContaining({
        event_category: 'engagement',
        event_label: 'Get Started',
        cta_location: 'hero_section',
        cta_href: '/register',
        deviceType: expect.any(String),
        sessionId: expect.any(String),
      })
    );
  });
});

describe('Scroll Depth Tracking', () => {
  it('should track scroll depth events', () => {
    trackScrollDepth({ percentage: 50 });

    expect((window as any).gtag).toHaveBeenCalledWith(
      'event',
      'scroll_depth',
      expect.objectContaining({
        event_category: 'engagement',
        event_label: '50%',
        scroll_percentage: 50,
      })
    );
  });

  it('should track each threshold only once', () => {
    trackScrollDepth({ percentage: 50 });
    trackScrollDepth({ percentage: 50 });
    trackScrollDepth({ percentage: 50 });

    // Should only be called once
    expect((window as any).gtag).toHaveBeenCalledTimes(1);
  });

  it('should reset tracking when resetScrollDepthTracking is called', () => {
    trackScrollDepth({ percentage: 50 });
    expect((window as any).gtag).toHaveBeenCalledTimes(1);

    resetScrollDepthTracking();
    
    trackScrollDepth({ percentage: 50 });
    expect((window as any).gtag).toHaveBeenCalledTimes(2);
  });
});

describe('Partner Type Click Tracking', () => {
  it('should track partner type selection', () => {
    trackPartnerTypeClick({
      partnerType: 'agent',
      location: 'partner_selection',
    });

    expect((window as any).gtag).toHaveBeenCalledWith(
      'event',
      'partner_type_click',
      expect.objectContaining({
        event_category: 'engagement',
        event_label: 'agent',
      })
    );
  });
});

describe('FAQ Expand Tracking', () => {
  it('should track FAQ expand events', () => {
    trackFAQExpand({
      question: 'How much does it cost?',
      index: 0,
    });

    expect((window as any).gtag).toHaveBeenCalledWith(
      'event',
      'faq_expand',
      expect.objectContaining({
        event_category: 'engagement',
        event_label: 'How much does it cost?',
        faq_index: 0,
      })
    );
  });
});

describe('Page View Tracking', () => {
  it('should track page views', () => {
    trackPageView();

    expect((window as any).gtag).toHaveBeenCalledWith(
      'event',
      'page_view',
      expect.objectContaining({
        page_path: '/advertise',
        page_title: 'Advertise With Us',
      })
    );
  });
});

describe('Event Metadata', () => {
  it('should include device type in all events', () => {
    trackCTAClick({
      ctaLabel: 'Test',
      ctaLocation: 'test',
      ctaHref: '/test',
    });

    expect((window as any).gtag).toHaveBeenCalledWith(
      'event',
      'cta_click',
      expect.objectContaining({
        deviceType: expect.stringMatching(/^(mobile|tablet|desktop)$/),
      })
    );
  });

  it('should include session ID in all events', () => {
    trackCTAClick({
      ctaLabel: 'Test',
      ctaLocation: 'test',
      ctaHref: '/test',
    });

    expect((window as any).gtag).toHaveBeenCalledWith(
      'event',
      'cta_click',
      expect.objectContaining({
        sessionId: expect.stringMatching(/^session_\d+_[a-z0-9]+$/),
      })
    );
  });

  it('should include timestamp in all events', () => {
    trackCTAClick({
      ctaLabel: 'Test',
      ctaLocation: 'test',
      ctaHref: '/test',
    });

    expect((window as any).gtag).toHaveBeenCalledWith(
      'event',
      'cta_click',
      expect.objectContaining({
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
      })
    );
  });
});
