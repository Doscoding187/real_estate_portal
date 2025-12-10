# Task 9: Final CTA Section - Quick Reference

## Components

### FinalCTASection
```tsx
import { FinalCTASection } from '@/components/advertise/FinalCTASection';

<FinalCTASection
  headline="Ready to Get Started?"
  subtext="Join thousands of successful partners today."
  primaryCTA={{ label: "Get Started", href: "/register" }}
  secondaryCTA={{ label: "Request a Demo", href: "/contact" }}
/>
```

### MobileStickyCTA
```tsx
import { MobileStickyCTA, useMobileStickyCTA } from '@/components/advertise/MobileStickyCTA';

const isVisible = useMobileStickyCTA('hero-section');

<MobileStickyCTA
  label="Get Started"
  href="/register"
  isVisible={isVisible}
/>
```

## Analytics Hooks

### Auto Tracking
```tsx
import { useAdvertiseAnalytics } from '@/hooks/useAdvertiseAnalytics';

// Tracks page view + scroll depth automatically
useAdvertiseAnalytics();
```

### CTA Tracking
```tsx
import { useCTATracking } from '@/hooks/useAdvertiseAnalytics';

const trackCTA = useCTATracking('hero_section');
trackCTA('Get Started', '/register');
```

### Manual Tracking
```tsx
import { trackCTAClick, trackScrollDepth } from '@/lib/analytics/advertiseTracking';

trackCTAClick({
  ctaLabel: 'Get Started',
  ctaLocation: 'final_cta_section',
  ctaHref: '/register',
});

trackScrollDepth({ percentage: 50 });
```

## Key Files

| File | Purpose |
|------|---------|
| `FinalCTASection.tsx` | Main final CTA component |
| `MobileStickyCTA.tsx` | Mobile sticky CTA component |
| `advertiseTracking.ts` | Analytics tracking utilities |
| `useAdvertiseAnalytics.ts` | React hooks for analytics |

## Requirements

| ID | Description | Status |
|----|-------------|--------|
| 8.1 | Clean, minimal CTA section | ✅ |
| 8.2 | Primary and secondary CTAs | ✅ |
| 8.3 | Mobile sticky CTA | ✅ |
| 8.4 | CTA navigation | ✅ |
| 8.5 | Strategic CTA placement | ✅ |

## Design Tokens

```typescript
// Colors
softUITokens.colors.neutral.gray50    // Background
softUITokens.colors.neutral.gray900   // Headline
softUITokens.colors.neutral.gray600   // Subtext
softUITokens.colors.primary.gradient  // Primary CTA

// Spacing
py-20 md:py-24  // Section padding
max-w-4xl      // Max width
gap-4          // CTA gap

// Typography
text-4xl md:text-5xl  // Headline
text-lg md:text-xl    // Subtext
```

## Analytics Events

### CTA Click
```typescript
{
  eventType: 'cta_click',
  ctaLabel: string,
  ctaLocation: string,
  ctaHref: string,
  deviceType: 'mobile' | 'tablet' | 'desktop',
  sessionId: string,
  timestamp: ISO string
}
```

### Scroll Depth
```typescript
{
  eventType: 'scroll_depth',
  percentage: 25 | 50 | 75 | 100,
  deviceType: 'mobile' | 'tablet' | 'desktop',
  sessionId: string,
  timestamp: ISO string
}
```

## Testing

### Manual
```bash
# View FinalCTASection demo
npm run dev
# Navigate to /final-cta-demo

# View MobileStickyCTA demo
npm run dev
# Navigate to /mobile-sticky-cta-demo
# Resize to mobile width
```

### Diagnostics
```bash
# Check for TypeScript errors
npm run type-check

# Run linter
npm run lint
```

## Common Issues

### Mobile Sticky CTA Not Appearing
- Ensure hero section has correct ID
- Check viewport width (< 768px)
- Verify scroll position past hero

### Analytics Not Tracking
- Check browser console for events
- Verify gtag is loaded
- Check development vs production mode

### Animations Not Smooth
- Check for layout shifts
- Verify requestAnimationFrame usage
- Test on actual device

## Next Steps

1. Add to main landing page
2. Finalize copy content
3. Test on real devices
4. Monitor analytics dashboard
5. Optimize based on data

