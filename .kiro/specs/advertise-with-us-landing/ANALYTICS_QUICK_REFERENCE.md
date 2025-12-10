# Analytics Tracking - Quick Reference

## Setup (One Line)

```tsx
import { useAdvertiseAnalytics } from '@/hooks/useAdvertiseAnalytics';

function Page() {
  useAdvertiseAnalytics(); // Tracks page view + scroll depth automatically
  return <div>...</div>;
}
```

## Track CTA Clicks

```tsx
import { useCTATracking } from '@/hooks/useAdvertiseAnalytics';

function Section() {
  const trackCTA = useCTATracking('section_name');
  
  return (
    <button onClick={() => {
      trackCTA('Button Label', '/destination');
      // navigate...
    }}>
      Click Me
    </button>
  );
}
```

## Track Partner Type Selection

```tsx
import { trackPartnerTypeClick } from '@/lib/analytics/advertiseTracking';

trackPartnerTypeClick({
  partnerType: 'agent', // or 'developer', 'bank', etc.
  location: 'partner_selection',
});
```

## Track FAQ Interactions

```tsx
import { trackFAQExpand } from '@/lib/analytics/advertiseTracking';

trackFAQExpand({
  question: 'How much does it cost?',
  index: 0,
});
```

## What Gets Tracked Automatically

When you use `useAdvertiseAnalytics()`:
- ✅ Page view on mount
- ✅ Scroll depth at 25%, 50%, 75%, 100%
- ✅ Device type (mobile/tablet/desktop)
- ✅ Session ID (persists across refreshes)
- ✅ User ID (if authenticated)
- ✅ Referrer (traffic source)
- ✅ Timestamp (ISO format)

## Event Locations

Use these standard location strings:
- `hero_section` - Hero CTAs
- `final_cta_section` - Final CTA section
- `mobile_sticky` - Mobile sticky CTA
- `pricing_preview` - Pricing cards
- `partner_selection` - Partner type cards
- `faq` - FAQ section

## Development Mode

All events are logged to console with 📊 emoji:
```
📊 Page View: { eventType: 'page_view', ... }
📊 CTA Click: { eventType: 'cta_click', ... }
📊 Scroll Depth: { eventType: 'scroll_depth', percentage: 50, ... }
```

## Production Mode

- Events sent to Google Analytics (gtag)
- Events sent to `/api/analytics/track`
- No console logging
- Silent error handling

## Testing Checklist

1. Open browser console
2. Navigate to /advertise
3. Verify page view event
4. Scroll and verify scroll depth events
5. Click CTAs and verify click events
6. Expand FAQs and verify expand events
7. Check all events include metadata

## Common Patterns

### Track Section Visibility
```tsx
import { useSectionTracking } from '@/hooks/useAdvertiseAnalytics';

function Section() {
  useSectionTracking('section-name');
  return <section id="section-name">...</section>;
}
```

### Manual Scroll Tracking
```tsx
import { trackScrollDepth } from '@/lib/analytics/advertiseTracking';

trackScrollDepth({
  percentage: 50,
  section: 'features',
});
```

### Reset Scroll Tracking (SPA Navigation)
```tsx
import { resetScrollDepthTracking } from '@/lib/analytics/advertiseTracking';

// On route change
resetScrollDepthTracking();
```

## Metadata Structure

Every event includes:
```typescript
{
  eventType: string,
  // Event-specific data...
  deviceType: 'mobile' | 'tablet' | 'desktop',
  sessionId: string,
  userId?: string,
  referrer?: string,
  timestamp: string (ISO 8601)
}
```

## Requirements Coverage

- ✅ **8.4**: Track CTA clicks with location metadata
- ✅ **8.5**: Track scroll depth to measure engagement

## Documentation

- Full guide: `advertiseTracking.README.md`
- Implementation: `TASK_17_ANALYTICS_COMPLETE.md`
