# Error Handling Implementation Guide

## Overview

This document describes the comprehensive error handling system implemented for the Advertise With Us landing page. The system provides graceful degradation, user-friendly error messages, and robust recovery mechanisms.

## Architecture

### Three-Layer Error Handling Strategy

1. **Error Boundaries** - Catch React component errors
2. **Loading States** - Provide feedback during data fetching
3. **Error States** - Handle specific failure scenarios

## Components

### 1. Error Boundaries

#### `AdvertiseErrorBoundary`
Main error boundary component that wraps sections to catch React errors.

**Features:**
- Catches and logs errors to monitoring service
- Provides user-friendly fallback UI
- Offers retry, reload, and navigation options
- Shows detailed error info in development mode

**Usage:**
```tsx
import { AdvertiseErrorBoundary } from '@/components/advertise/AdvertiseErrorBoundary';

<AdvertiseErrorBoundary
  sectionName="Hero Section"
  showSectionName={true}
  onError={(error, errorInfo) => {
    // Custom error handling
  }}
>
  <YourComponent />
</AdvertiseErrorBoundary>
```

#### `SectionErrorBoundary`
Convenience wrapper for individual sections.

**Usage:**
```tsx
import { SectionErrorBoundary } from '@/components/advertise/AdvertiseErrorBoundary';

<SectionErrorBoundary sectionName="Partner Selection">
  <PartnerSelectionSection />
</SectionErrorBoundary>
```

### 2. Skeleton Loaders

Provide visual feedback while content is loading.

#### Available Skeletons:
- `HeroSectionSkeleton` - Hero section loading state
- `PartnerSelectionSkeleton` - Partner cards loading state
- `ValuePropositionSkeleton` - Feature blocks loading state
- `FeaturesGridSkeleton` - Features grid loading state
- `SocialProofSkeleton` - Metrics and logos loading state
- `PricingPreviewSkeleton` - Pricing cards loading state
- `FAQSectionSkeleton` - FAQ items loading state
- `SectionLoader` - Generic section loader with spinner
- `ProgressiveLoadingIndicator` - Progress bar for multi-step operations

**Usage:**
```tsx
import { HeroSectionSkeleton } from '@/components/advertise/SkeletonLoaders';

{isLoading ? (
  <HeroSectionSkeleton />
) : (
  <HeroSection {...props} />
)}
```

### 3. Error States

Handle specific failure scenarios with appropriate UI.

#### Available Error States:

##### `ErrorState`
Generic error component with customizable message and retry.

```tsx
import { ErrorState } from '@/components/advertise/ErrorStates';

<ErrorState
  message="Failed to load content"
  onRetry={handleRetry}
  type="network" // 'error' | 'warning' | 'network'
/>
```

##### `PartnerTypesError`
Specialized error for partner types loading failure.

```tsx
import { PartnerTypesError } from '@/components/advertise/ErrorStates';

{hasError ? (
  <PartnerTypesError onRetry={handleRetry} />
) : (
  <PartnerSelectionSection />
)}
```

##### `MetricsPlaceholder`
Shows placeholder values when metrics fail to load.

```tsx
import { MetricsPlaceholder } from '@/components/advertise/ErrorStates';

{metricsError ? (
  <MetricsPlaceholder />
) : (
  <SocialProofSection metrics={metrics} />
)}
```

##### `PricingFallbackCTA`
Generic pricing CTA when pricing data fails.

```tsx
import { PricingFallbackCTA } from '@/components/advertise/ErrorStates';

{pricingError ? (
  <PricingFallbackCTA />
) : (
  <PricingPreviewSection />
)}
```

##### `InlineError`
Small inline error message for use within sections.

```tsx
import { InlineError } from '@/components/advertise/ErrorStates';

<InlineError
  message="Failed to load this content"
  onRetry={handleRetry}
/>
```

## Implementation Pattern

### Complete Section Implementation

```tsx
import React, { useState, useEffect } from 'react';
import { SectionErrorBoundary } from '@/components/advertise/AdvertiseErrorBoundary';
import { PartnerSelectionSkeleton } from '@/components/advertise/SkeletonLoaders';
import { PartnerTypesError } from '@/components/advertise/ErrorStates';
import { PartnerSelectionSection } from '@/components/advertise/PartnerSelectionSection';

function PartnerSelectionWithErrorHandling() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchPartnerTypes()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const handleRetry = () => {
    setError(false);
    setLoading(true);
    fetchPartnerTypes()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  return (
    <SectionErrorBoundary sectionName="Partner Selection">
      <section id="partner-selection">
        {loading ? (
          <PartnerSelectionSkeleton />
        ) : error ? (
          <PartnerTypesError onRetry={handleRetry} />
        ) : (
          <PartnerSelectionSection data={data} />
        )}
      </section>
    </SectionErrorBoundary>
  );
}
```

## Error Logging

### Development Mode
Errors are logged to console with full stack traces.

### Production Mode
Errors should be sent to monitoring service (e.g., Sentry, LogRocket).

**Integration Example:**
```tsx
// In AdvertiseErrorBoundary.tsx
private logErrorToService(error: Error, errorInfo: ErrorInfo) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        section: this.props.sectionName || 'unknown',
        page: 'advertise-landing',
      },
    });
  }
}
```

## Accessibility

All error handling components follow accessibility best practices:

- **ARIA Roles**: `role="alert"` for errors, `role="status"` for loading
- **Live Regions**: `aria-live="assertive"` for errors, `aria-live="polite"` for loading
- **Labels**: Clear `aria-label` attributes on all interactive elements
- **Keyboard Navigation**: All retry buttons are keyboard accessible
- **Screen Reader Support**: Meaningful error messages and loading states

## Testing

### Manual Testing Checklist

- [ ] Test each section with simulated errors
- [ ] Verify skeleton loaders appear during loading
- [ ] Test retry functionality
- [ ] Verify error boundaries catch component errors
- [ ] Test with screen reader
- [ ] Test keyboard navigation
- [ ] Verify error logging in development
- [ ] Test on mobile devices

### Simulating Errors

Add to component for testing:
```tsx
// Simulate random errors (remove in production)
useEffect(() => {
  if (Math.random() > 0.9) {
    throw new Error('Simulated error for testing');
  }
}, []);
```

## Performance Considerations

### Lazy Loading
Error boundaries work seamlessly with React.lazy and Suspense:

```tsx
const LazyComponent = lazy(() => import('./Component'));

<SectionErrorBoundary sectionName="Lazy Section">
  <Suspense fallback={<SectionLoader />}>
    <LazyComponent />
  </Suspense>
</SectionErrorBoundary>
```

### Progressive Loading
Use `ProgressiveLoadingIndicator` for multi-step operations:

```tsx
import { ProgressiveLoadingIndicator } from '@/components/advertise/SkeletonLoaders';

<ProgressiveLoadingIndicator
  progress={loadingProgress}
  message="Loading content..."
/>
```

## Best Practices

### 1. Always Wrap Sections
Every major section should be wrapped in an error boundary:
```tsx
<SectionErrorBoundary sectionName="Section Name">
  <YourSection />
</SectionErrorBoundary>
```

### 2. Provide Retry Mechanisms
Always offer users a way to retry failed operations:
```tsx
<ErrorState
  message="Failed to load"
  onRetry={handleRetry}
  showRetry={true}
/>
```

### 3. Use Appropriate Loading States
Match skeleton loaders to actual content structure:
```tsx
{loading ? <HeroSectionSkeleton /> : <HeroSection />}
```

### 4. Handle Specific Errors
Use specialized error components for known failure scenarios:
```tsx
{metricsError ? <MetricsPlaceholder /> : <Metrics />}
```

### 5. Log All Errors
Ensure all errors are logged for monitoring:
```tsx
onError={(error, errorInfo) => {
  logToMonitoringService(error, errorInfo);
}}
```

## FAQ Handling

The FAQ section is hidden entirely if it fails to load:

```tsx
{!faqError && (
  <SectionErrorBoundary sectionName="FAQ">
    <Suspense fallback={<FAQSectionSkeleton />}>
      <FAQSection />
    </Suspense>
  </SectionErrorBoundary>
)}
```

This prevents a broken FAQ section from disrupting the page flow.

## Monitoring Integration

### Recommended Services
- **Sentry** - Error tracking and monitoring
- **LogRocket** - Session replay and error tracking
- **Datadog** - Full-stack monitoring
- **New Relic** - Application performance monitoring

### Key Metrics to Track
- Error rate by section
- Error types and frequencies
- User retry attempts
- Time to recovery
- Impact on conversion rates

## Troubleshooting

### Common Issues

**Issue**: Error boundary not catching errors
- **Solution**: Ensure error boundaries wrap the component, not inside it

**Issue**: Skeleton loaders not showing
- **Solution**: Check loading state is properly set before render

**Issue**: Retry not working
- **Solution**: Verify retry callback resets error state and refetches data

**Issue**: Errors not logged in production
- **Solution**: Check monitoring service integration and API keys

## Requirements Validation

This implementation satisfies **Requirement 10.1**:
- ✅ Loading states for all sections
- ✅ Content loading failure handling
- ✅ Fallback content for errors
- ✅ Error boundaries wrapping major sections
- ✅ Error logging to monitoring service
- ✅ User-friendly error messages
- ✅ Retry mechanisms
- ✅ Accessibility compliance

## Related Documentation

- [Skeleton Loaders Component](./SkeletonLoaders.tsx)
- [Error States Component](./ErrorStates.tsx)
- [Error Boundary Component](./AdvertiseErrorBoundary.tsx)
- [Accessibility Guide](./ACCESSIBILITY_QUICK_REFERENCE.md)
- [Performance Optimization](./TASK_12_PERFORMANCE_COMPLETE.md)
