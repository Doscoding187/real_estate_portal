# Advertise Landing Page Analytics Tracking

## Overview

Comprehensive analytics tracking system for the "Advertise With Us" landing page. Tracks CTA clicks, scroll depth, user engagement, and conversion funnel metrics.

## Requirements

- **8.4**: Track all CTA clicks with location metadata
- **8.5**: Track scroll depth to measure engagement

## Features

- **CTA Click Tracking**: Track all CTA interactions with location context
- **Scroll Depth Tracking**: Measure user engagement at 25%, 50%, 75%, 100%
- **Partner Type Tracking**: Track which partner types users are interested in
- **FAQ Interaction Tracking**: Measure which questions users expand
- **Session Management**: Unique session IDs for user journey tracking
- **Device Detection**: Automatic mobile/tablet/desktop classification
- **Referrer Tracking**: Track traffic sources
- **Google Analytics Integration**: Automatic gtag event sending
- **Custom Analytics Endpoint**: Send events to custom backend

## Usage

### Basic Setup

```tsx
import { useAdvertiseAnalytics } from '@/hooks/useAdvertiseAnalytics';

function AdvertiseLandingPage() {
  // Automatically tracks page view and scroll depth
  useAdvertiseAnalytics();
  
  return (
    <div>
      {/* Your landing page content */}
    </div>
  );
}
```

### Track CTA Clicks

```tsx
import { useCTATracking } from '@/hooks/useAdvertiseAnalytics';

function HeroSection() {
  const trackCTA = useCTATracking('hero_section');
  
  const handleGetStarted = () => {
    trackCTA('Get Started', '/register');
    // Navigate to registration
  };
  
  return (
    <button onClick={handleGetStarted}>
      Get Started
    </button>
  );
}
```

### Track Section Visibility

```tsx
import { useSectionTracking } from '@/hooks/useAdvertiseAnalytics';

function ValuePropositionSection() {
  // Tracks when section becomes 50% visible
  useSectionTracking('value-proposition');
  
  return (
    <section id="value-proposition">
      {/* Section content */}
    </section>
  );
}
```

### Manual Event Tracking

```tsx
import {
  trackCTAClick,
  trackScrollDepth,
  trackPartnerTypeClick,
  trackFAQExpand,
} from '@/lib/analytics/advertiseTracking';

// Track CTA click
trackCTAClick({
  ctaLabel: 'Get Started',
  ctaLocation: 'hero_section',
  ctaHref: '/register',
});

// Track scroll depth
trackScrollDepth({
  percentage: 50,
  section: 'features',
});

// Track partner type selection
trackPartnerTypeClick({
  partnerType: 'agent',
  location: 'partner_selection',
});

// Track FAQ interaction
trackFAQExpand({
  question: 'How much does it cost?',
  index: 2,
});
```

## Event Types

### CTA Click Event

```typescript
{
  eventType: 'cta_click',
  ctaLabel: string,
  ctaLocation: string,
  ctaHref: string,
  deviceType: 'mobile' | 'tablet' | 'desktop',
  sessionId: string,
  userId?: string,
  referrer?: string,
  timestamp: ISO string
}
```

**Locations:**
- `hero_section` - Hero CTAs
- `final_cta_section` - Final CTA section
- `mobile_sticky` - Mobile sticky CTA
- `pricing_preview` - Pricing card CTAs
- `partner_selection` - Partner type cards

### Scroll Depth Event

```typescript
{
  eventType: 'scroll_depth',
  percentage: 25 | 50 | 75 | 100,
  section?: string,
  deviceType: 'mobile' | 'tablet' | 'desktop',
  sessionId: string,
  userId?: string,
  referrer?: string,
  timestamp: ISO string
}
```

**Thresholds:**
- 25% - User is engaged
- 50% - User is interested
- 75% - User is highly engaged
- 100% - User read entire page

### Partner Type Click Event

```typescript
{
  eventType: 'partner_type_click',
  partnerType: 'agent' | 'developer' | 'bank' | 'bond_originator' | 'service_provider',
  location: string,
  deviceType: 'mobile' | 'tablet' | 'desktop',
  sessionId: string,
  userId?: string,
  referrer?: string,
  timestamp: ISO string
}
```

### FAQ Expand Event

```typescript
{
  eventType: 'faq_expand',
  question: string,
  index: number,
  deviceType: 'mobile' | 'tablet' | 'desktop',
  sessionId: string,
  userId?: string,
  referrer?: string,
  timestamp: ISO string
}
```

## Session Management

### Session ID

- Generated on first page load
- Stored in sessionStorage
- Persists across page refreshes
- Resets when browser tab is closed
- Format: `session_{timestamp}_{random}`

### User ID

- Retrieved from localStorage (if authenticated)
- Optional field in all events
- Allows tracking authenticated user journeys

## Device Detection

Automatic device type classification:

- **Mobile**: < 768px width
- **Tablet**: 768px - 1024px width
- **Desktop**: > 1024px width

## Google Analytics Integration

All events are automatically sent to Google Analytics (if gtag is available):

```javascript
gtag('event', 'cta_click', {
  event_category: 'engagement',
  event_label: 'Get Started',
  cta_location: 'hero_section',
  cta_href: '/register',
  // ... metadata
});
```

## Custom Analytics Endpoint

Events are also sent to a custom backend endpoint:

```
POST /api/analytics/track
Content-Type: application/json

{
  eventType: 'cta_click',
  // ... event data
}
```

**Note:** Only sends in production environment.

## Scroll Depth Tracking

### Automatic Tracking

The `useAdvertiseAnalytics` hook automatically sets up scroll depth tracking:

```tsx
function AdvertiseLandingPage() {
  useAdvertiseAnalytics(); // Tracks 25%, 50%, 75%, 100%
  
  return <div>{/* content */}</div>;
}
```

### How It Works

1. Calculates scroll percentage on scroll events
2. Tracks each threshold once per session
3. Uses requestAnimationFrame for performance
4. Passive event listeners for smooth scrolling

### Reset Tracking

```tsx
import { resetScrollDepthTracking } from '@/lib/analytics/advertiseTracking';

// Reset when navigating to new page (SPA)
resetScrollDepthTracking();
```

## Performance Considerations

### Throttling

- Scroll events are throttled using requestAnimationFrame
- Prevents excessive event firing
- Maintains 60fps scrolling performance

### Passive Listeners

- All scroll listeners use `{ passive: true }`
- Improves scroll performance
- Prevents blocking main thread

### Deduplication

- Each scroll depth threshold tracked only once
- Prevents duplicate events
- Reduces analytics noise

## Development vs Production

### Development Mode

- All events logged to console with 📊 emoji
- Easier debugging and verification
- No events sent to backend

### Production Mode

- Console logging disabled
- Events sent to Google Analytics
- Events sent to custom backend
- Silent error handling

## Best Practices

1. **Use Hooks**: Prefer `useAdvertiseAnalytics` and `useCTATracking` over manual tracking
2. **Location Context**: Always provide meaningful location strings
3. **Session Tracking**: Don't manually manage session IDs
4. **Error Handling**: Analytics failures should never disrupt UX
5. **Privacy**: Respect user privacy settings and GDPR compliance

## Example: Complete Landing Page

```tsx
import { useAdvertiseAnalytics, useCTATracking } from '@/hooks/useAdvertiseAnalytics';
import { FinalCTASection } from '@/components/advertise/FinalCTASection';
import { MobileStickyCTA, useMobileStickyCTA } from '@/components/advertise/MobileStickyCTA';

export default function AdvertiseLandingPage() {
  // Set up analytics tracking
  useAdvertiseAnalytics();
  
  // Mobile sticky CTA visibility
  const isStickyCTAVisible = useMobileStickyCTA('hero-section');
  
  return (
    <div>
      {/* Hero Section */}
      <section id="hero-section">
        {/* Hero content with CTAs */}
      </section>
      
      {/* Other sections */}
      <section id="partner-selection">
        {/* Partner type cards */}
      </section>
      
      <section id="value-proposition">
        {/* Feature blocks */}
      </section>
      
      {/* Final CTA Section */}
      <FinalCTASection
        headline="Ready to Get Started?"
        subtext="Join thousands of successful partners today."
        primaryCTA={{
          label: "Get Started",
          href: "/register",
        }}
        secondaryCTA={{
          label: "Request a Demo",
          href: "/contact",
        }}
      />
      
      {/* Mobile Sticky CTA */}
      <MobileStickyCTA
        label="Get Started"
        href="/register"
        isVisible={isStickyCTAVisible}
      />
    </div>
  );
}
```

## Testing

### Manual Testing

1. Open browser console
2. Interact with CTAs
3. Scroll through page
4. Verify events are logged with 📊 emoji

### Automated Testing

```tsx
import { trackCTAClick } from '@/lib/analytics/advertiseTracking';

describe('Analytics Tracking', () => {
  it('should track CTA clicks', () => {
    const spy = jest.spyOn(window, 'gtag');
    
    trackCTAClick({
      ctaLabel: 'Get Started',
      ctaLocation: 'hero',
      ctaHref: '/register',
    });
    
    expect(spy).toHaveBeenCalledWith('event', 'cta_click', expect.any(Object));
  });
});
```

## Related Components

- `FinalCTASection` - Uses CTA tracking
- `MobileStickyCTA` - Uses CTA tracking and dismiss tracking
- `CTAButton` - Uses CTA tracking
- `PartnerTypeCard` - Uses partner type tracking
- `FAQAccordionItem` - Uses FAQ tracking

