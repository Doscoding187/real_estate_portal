# Advertise With Us Page - Runtime Error Fix

## Problem Summary

The "Advertise With Us" page is showing multiple error boundaries with yellow warning boxes instead of rendering properly:
- "Features Grid Error"
- "Social Proof Error"  
- "Pricing Preview Error"
- "Final CTA Error"
- "FAQ Error"

This indicates that the lazy-loaded components are throwing uncaught JavaScript exceptions at runtime.

## Root Cause Analysis

After examining the code, the most likely causes are:

### 1. **Missing Props or Undefined Data**
The lazy-loaded components may be receiving undefined props or trying to access properties on undefined objects.

### 2. **Import Path Issues**
The lazy imports might be failing due to incorrect module resolution.

### 3. **Framer Motion Animation Errors**
Animation variants or refs might be causing runtime errors.

### 4. **CSS/Styling Conflicts**
The recent layout refactor (commit 290925b) may have introduced CSS conflicts.

## Immediate Fixes

### Fix 1: Add Defensive Checks to Components

Each lazy-loaded component needs defensive programming to handle undefined props gracefully.

#### FeaturesGridSection.tsx
The component already has default props, but ensure the features array is never undefined:

```typescript
// At the top of the component
const features = [
  // ... existing features
];

// In the component
export const FeaturesGridSection: React.FC<FeaturesGridSectionProps> = ({
  title = 'Powerful Features for Your Success',
  subtitle = 'Everything you need to advertise effectively and grow your business',
  className = '',
}) => {
  // Add safety check
  if (!features || features.length === 0) {
    return null; // or return a fallback UI
  }
  
  // ... rest of component
};
```

#### SocialProofSection.tsx
The metrics prop is required but might be undefined:

```typescript
export const SocialProofSection: React.FC<SocialProofSectionProps> = ({
  heading = 'Trusted by Leading Property Professionals',
  subheading,
  partnerLogos = [],
  metrics,
  showLogos = true,
  disclaimer,
}) => {
  // Add safety check
  if (!metrics || metrics.length === 0) {
    return (
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-600">Loading metrics...</p>
        </div>
      </section>
    );
  }
  
  // ... rest of component
};
```

### Fix 2: Update AdvertiseWithUs.tsx with Better Error Handling

Replace the current implementation with more robust error handling:

```typescript
// Add this helper function at the top
const SafeLazyComponent = ({ 
  Component, 
  fallback, 
  ...props 
}: { 
  Component: React.LazyExoticComponent<any>; 
  fallback: React.ReactNode;
  [key: string]: any;
}) => {
  return (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  );
};

// Then in the render, replace each lazy-loaded section:

{/* Features Grid Section - Lazy loaded */}
<SectionErrorBoundary sectionName="Features Grid">
  <SafeLazyComponent
    Component={FeaturesGridSection}
    fallback={<FeaturesGridSkeleton />}
  />
</SectionErrorBoundary>

{/* Social Proof Section - Lazy loaded */}
<SectionErrorBoundary sectionName="Social Proof">
  <SafeLazyComponent
    Component={SocialProofSection}
    fallback={<SocialProofSkeleton />}
    metrics={metricsError ? [] : metrics}
  />
</SectionErrorBoundary>
```

### Fix 3: Check for Missing Dependencies

Run these commands to ensure all dependencies are properly installed:

```bash
# Clear cache
rm -rf node_modules/.vite
rm -rf node_modules/.cache

# Reinstall dependencies
pnpm install

# Check for TypeScript errors
pnpm check

# Build to check for compilation errors
pnpm build
```

### Fix 4: Add Console Logging for Debugging

Temporarily add logging to identify which component is failing:

```typescript
// In AdvertiseWithUs.tsx, add this to each lazy import:

const FeaturesGridSection = lazy(() => {
  console.log('Loading FeaturesGridSection...');
  return import('@/components/advertise/FeaturesGridSection')
    .then(module => {
      console.log('FeaturesGridSection loaded successfully');
      return module;
    })
    .catch(error => {
      console.error('Failed to load FeaturesGridSection:', error);
      throw error;
    });
});

// Repeat for each lazy-loaded component
```

### Fix 5: Verify Import Paths

Check that all imports in the lazy-loaded components are correct:

```bash
# Search for any broken imports
grep -r "from '@/" client/src/components/advertise/*.tsx
```

## Testing Protocol

### 1. Local Development Testing

```bash
# Start dev server
pnpm dev

# Open browser to http://localhost:5173/advertise-with-us
# Open DevTools Console (F12)
# Look for:
# - Red error messages
# - Failed network requests
# - Component loading logs
```

### 2. Check Browser Console

Look for specific error messages:
- `TypeError: Cannot read property 'map' of undefined` → Missing/undefined array prop
- `Error: Element type is invalid` → Import/export mismatch
- `ChunkLoadError` → Build/bundling issue
- `ReferenceError` → Missing variable/function

### 3. Test Each Section Individually

Create a test page to isolate each component:

```typescript
// client/src/pages/AdvertiseComponentTest.tsx
import { FeaturesGridSection } from '@/components/advertise/FeaturesGridSection';
import { SocialProofSection } from '@/components/advertise/SocialProofSection';
// ... import others

export default function AdvertiseComponentTest() {
  const testMetrics = [
    { value: '150,000+', label: 'Test Metric', icon: TrendingUp },
  ];

  return (
    <div>
      <h1>Component Tests</h1>
      
      <section>
        <h2>Features Grid</h2>
        <FeaturesGridSection />
      </section>
      
      <section>
        <h2>Social Proof</h2>
        <SocialProofSection metrics={testMetrics} />
      </section>
      
      {/* Test other components */}
    </div>
  );
}
```

## Rollback Plan

If fixes don't work immediately:

### Option 1: Revert Layout Changes

```bash
# Find the commit before the layout refactor
git log --oneline --grep="layout" -10

# Revert the specific commit
git revert 290925b

# Push the revert
git push origin main
```

### Option 2: Disable Lazy Loading Temporarily

Replace lazy imports with direct imports to isolate the issue:

```typescript
// Change from:
const FeaturesGridSection = lazy(() => import('@/components/advertise/FeaturesGridSection'));

// To:
import { FeaturesGridSection } from '@/components/advertise/FeaturesGridSection';

// Remove Suspense wrappers
```

## Prevention Measures

### 1. Add PropTypes or Zod Validation

```typescript
import { z } from 'zod';

const MetricSchema = z.object({
  value: z.union([z.string(), z.number()]),
  label: z.string(),
  icon: z.any().optional(),
  iconColor: z.string().optional(),
});

// In component:
const validatedMetrics = metrics.map(m => MetricSchema.parse(m));
```

### 2. Add Unit Tests

```typescript
// client/src/components/advertise/__tests__/FeaturesGridSection.test.tsx
import { render, screen } from '@testing-library/react';
import { FeaturesGridSection } from '../FeaturesGridSection';

describe('FeaturesGridSection', () => {
  it('renders without crashing', () => {
    render(<FeaturesGridSection />);
    expect(screen.getByText(/Powerful Features/i)).toBeInTheDocument();
  });

  it('handles empty features array', () => {
    // Test edge case
  });
});
```

### 3. Add Error Monitoring

```typescript
// In AdvertiseErrorBoundary.tsx, add Sentry or similar:
import * as Sentry from '@sentry/react';

componentDidCatch(error: Error, errorInfo: ErrorInfo) {
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
```

## Next Steps

1. **Immediate**: Add console logging to identify failing component
2. **Short-term**: Add defensive checks to all lazy-loaded components
3. **Medium-term**: Add comprehensive error handling and validation
4. **Long-term**: Implement monitoring and automated testing

## Expected Outcome

After implementing these fixes:
- All sections should render without error boundaries
- Page should load smoothly with proper lazy loading
- Error boundaries should only appear for genuine runtime errors
- Console should show clear error messages if issues persist

## Verification Checklist

- [ ] No error boundaries visible on page load
- [ ] All sections render with correct content
- [ ] Animations work smoothly
- [ ] No console errors
- [ ] Page loads in under 3 seconds
- [ ] Mobile layout works correctly
- [ ] All CTAs are clickable
- [ ] FAQ accordion functions properly

## Contact

If issues persist after following this guide:
1. Check browser console for specific error messages
2. Test in incognito mode to rule out extension conflicts
3. Try a different browser
4. Clear browser cache and hard reload (Ctrl+Shift+R)
5. Escalate to frontend team lead with error logs
