# Error Handling Quick Reference

## Quick Start

### 1. Wrap Section with Error Boundary
```tsx
import { SectionErrorBoundary } from '@/components/advertise/AdvertiseErrorBoundary';

<SectionErrorBoundary sectionName="Your Section">
  <YourComponent />
</SectionErrorBoundary>
```

### 2. Add Loading State
```tsx
import { HeroSectionSkeleton } from '@/components/advertise/SkeletonLoaders';

{loading ? <HeroSectionSkeleton /> : <HeroSection />}
```

### 3. Handle Errors
```tsx
import { ErrorState } from '@/components/advertise/ErrorStates';

{error ? (
  <ErrorState message="Failed to load" onRetry={handleRetry} />
) : (
  <YourComponent />
)}
```

## Component Cheat Sheet

### Error Boundaries
| Component | Use Case |
|-----------|----------|
| `AdvertiseErrorBoundary` | Full-featured error boundary |
| `SectionErrorBoundary` | Quick section wrapper |
| `MinimalErrorFallback` | Lightweight fallback |

### Skeleton Loaders
| Component | Use Case |
|-----------|----------|
| `HeroSectionSkeleton` | Hero section loading |
| `PartnerSelectionSkeleton` | Partner cards loading |
| `ValuePropositionSkeleton` | Feature blocks loading |
| `FeaturesGridSkeleton` | Features grid loading |
| `SocialProofSkeleton` | Metrics loading |
| `PricingPreviewSkeleton` | Pricing cards loading |
| `FAQSectionSkeleton` | FAQ items loading |
| `SectionLoader` | Generic spinner |
| `ProgressiveLoadingIndicator` | Progress bar |

### Error States
| Component | Use Case |
|-----------|----------|
| `ErrorState` | Generic error with retry |
| `PartnerTypesError` | Partner types failure |
| `MetricsPlaceholder` | Metrics unavailable |
| `PricingFallbackCTA` | Pricing data failure |
| `InlineError` | Small inline error |

## Common Patterns

### Pattern 1: Basic Section
```tsx
<SectionErrorBoundary sectionName="Section">
  {loading ? <Skeleton /> : <Component />}
</SectionErrorBoundary>
```

### Pattern 2: With Error Handling
```tsx
<SectionErrorBoundary sectionName="Section">
  {loading ? (
    <Skeleton />
  ) : error ? (
    <ErrorState onRetry={retry} />
  ) : (
    <Component />
  )}
</SectionErrorBoundary>
```

### Pattern 3: Lazy Loading
```tsx
<SectionErrorBoundary sectionName="Section">
  <Suspense fallback={<Skeleton />}>
    <LazyComponent />
  </Suspense>
</SectionErrorBoundary>
```

### Pattern 4: Hide on Error
```tsx
{!error && (
  <SectionErrorBoundary sectionName="Section">
    <Component />
  </SectionErrorBoundary>
)}
```

## Error Types

### Network Errors
```tsx
<ErrorState type="network" message="Connection issue" />
```

### Warning Errors
```tsx
<ErrorState type="warning" message="Partial data loaded" />
```

### Critical Errors
```tsx
<ErrorState type="error" message="Failed to load" />
```

## Accessibility

### Required Attributes
- `role="alert"` for errors
- `role="status"` for loading
- `aria-live="assertive"` for errors
- `aria-live="polite"` for loading
- `aria-label` on all interactive elements

### Example
```tsx
<div
  role="alert"
  aria-live="assertive"
  aria-label="Error loading content"
>
  <ErrorState />
</div>
```

## Testing Commands

### Simulate Error
```tsx
if (Math.random() > 0.9) throw new Error('Test error');
```

### Simulate Loading
```tsx
const [loading, setLoading] = useState(true);
setTimeout(() => setLoading(false), 2000);
```

### Simulate Network Error
```tsx
fetch(url).catch(() => setError(true));
```

## Monitoring

### Log Error
```tsx
onError={(error, errorInfo) => {
  console.error('Error:', error);
  // Send to monitoring service
}}
```

### Track Metrics
- Error rate by section
- Retry success rate
- Time to recovery
- User impact

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Error boundary not catching | Wrap component, not inside it |
| Skeleton not showing | Check loading state timing |
| Retry not working | Reset error state in callback |
| Errors not logged | Check monitoring integration |

## Requirements Checklist

- [x] Loading states for all sections
- [x] Handle content loading failures
- [x] Implement fallback content
- [x] Add error boundaries
- [x] Error logging
- [x] Retry mechanisms
- [x] Accessibility compliance

## File Locations

```
client/src/components/advertise/
├── AdvertiseErrorBoundary.tsx    # Error boundary component
├── SkeletonLoaders.tsx            # Loading state components
├── ErrorStates.tsx                # Error state components
├── ERROR_HANDLING_GUIDE.md        # Full documentation
└── ERROR_HANDLING_QUICK_REFERENCE.md  # This file
```

## Next Steps

1. Integrate monitoring service (Sentry, LogRocket)
2. Add custom error messages per section
3. Implement error analytics
4. Test with real API failures
5. Optimize skeleton loader animations
