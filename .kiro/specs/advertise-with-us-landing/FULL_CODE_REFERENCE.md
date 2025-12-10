# Advertise With Us - Complete Code Reference

This document contains all the code for the "Advertise With Us" landing page feature.

## Table of Contents
1. [Main Page Component](#main-page-component)
2. [Section Components](#section-components)
3. [UI Components](#ui-components)
4. [Hooks & Utilities](#hooks--utilities)
5. [Styles](#styles)
6. [Analytics & Tracking](#analytics--tracking)
7. [SEO & Accessibility](#seo--accessibility)
8. [CMS Integration](#cms-integration)
9. [Tests](#tests)

---

## Main Page Component

### AdvertiseWithUs.tsx
**Location:** `client/src/pages/AdvertiseWithUs.tsx`

This is the main page that orchestrates all sections of the landing page.

```typescript
// See file for complete implementation
```

Key features:
- Integrates all section components
- Handles CMS content loading
- Implements error boundaries
- Manages analytics tracking
- SEO optimization with structured data

---

## Section Components

### 1. HeroSection.tsx
**Location:** `client/src/components/advertise/HeroSection.tsx`

The hero section with animated background and primary CTA.

```typescript
// Main hero with gradient background, animated orbs, trust signals
```

Features:
- Animated gradient background
- Floating orb animations
- Trust signals (verified badge, user count)
- Primary and secondary CTAs
- Responsive design

### 2. PartnerSelectionSection.tsx
**Location:** `client/src/components/advertise/PartnerSelectionSection.tsx`

Partner type selection cards (Agencies, Developers, Agents).

```typescript
// Interactive cards for different partner types
```

### 3. ValuePropositionSection.tsx
**Location:** `client/src/components/advertise/ValuePropositionSection.tsx`

Key value propositions with feature blocks.

```typescript
// Feature blocks with icons and descriptions
```

### 4. HowItWorksSection.tsx
**Location:** `client/src/components/advertise/HowItWorksSection.tsx`

Step-by-step process visualization.

```typescript
// Process steps with connecting lines
```

### 5. FeaturesGridSection.tsx
**Location:** `client/src/components/advertise/FeaturesGridSection.tsx`

Grid of feature tiles with hover effects.

```typescript
// Responsive grid of feature tiles
```

### 6. SocialProofSection.tsx
**Location:** `client/src/components/advertise/SocialProofSection.tsx`

Testimonials and social proof metrics.

```typescript
// Testimonial carousel and metric cards
```

### 7. PricingPreviewSection.tsx
**Location:** `client/src/components/advertise/PricingPreviewSection.tsx`

Pricing tiers preview.

```typescript
// Pricing cards with feature lists
```

### 8. FAQSection.tsx
**Location:** `client/src/components/advertise/FAQSection.tsx`

Frequently asked questions accordion.

```typescript
// Accessible accordion with smooth animations
```

### 9. FinalCTASection.tsx
**Location:** `client/src/components/advertise/FinalCTASection.tsx`

Final call-to-action before footer.

```typescript
// Strong final CTA with urgency elements
```

### 10. MobileStickyCTA.tsx
**Location:** `client/src/components/advertise/MobileStickyCTA.tsx`

Sticky CTA bar for mobile devices.

```typescript
// Fixed bottom CTA on mobile
```

---

## UI Components

### CTAButton.tsx
**Location:** `client/src/components/advertise/CTAButton.tsx`

Reusable CTA button with variants.

### PartnerTypeCard.tsx
**Location:** `client/src/components/advertise/PartnerTypeCard.tsx`

Card component for partner types.

### FeatureBlock.tsx
**Location:** `client/src/components/advertise/FeatureBlock.tsx`

Feature block with icon and description.

### FeatureTile.tsx
**Location:** `client/src/components/advertise/FeatureTile.tsx`

Grid tile for features section.

### ProcessStep.tsx
**Location:** `client/src/components/advertise/ProcessStep.tsx`

Individual step in the process flow.

### MetricCard.tsx
**Location:** `client/src/components/advertise/MetricCard.tsx`

Social proof metric display.

### PricingCard.tsx
**Location:** `client/src/components/advertise/PricingCard.tsx`

Pricing tier card.

### FAQAccordionItem.tsx
**Location:** `client/src/components/advertise/FAQAccordionItem.tsx`

Individual FAQ accordion item.

### BackgroundOrbs.tsx
**Location:** `client/src/components/advertise/BackgroundOrbs.tsx`

Animated background orbs for hero.

### TrustSignals.tsx
**Location:** `client/src/components/advertise/TrustSignals.tsx`

Trust indicators (badges, counts).

### PreviewCarousel.tsx
**Location:** `client/src/components/advertise/PreviewCarousel.tsx`

Image carousel component.

### BillboardBanner.tsx
**Location:** `client/src/components/advertise/BillboardBanner.tsx`

Billboard-style banner component.

---

## Hooks & Utilities

### useAdvertiseAnalytics.ts
**Location:** `client/src/hooks/useAdvertiseAnalytics.ts`

Analytics tracking hook.

```typescript
export const useAdvertiseAnalytics = () => {
  // Track page views, CTA clicks, section views
}
```

### useScrollAnimation.ts
**Location:** `client/src/hooks/useScrollAnimation.ts`

Scroll-triggered animations.

```typescript
export const useScrollAnimation = (options) => {
  // Intersection Observer for scroll animations
}
```

### useReducedMotion.advertise.ts
**Location:** `client/src/hooks/useReducedMotion.advertise.ts`

Reduced motion preference detection.

```typescript
export const useReducedMotion = () => {
  // Respects prefers-reduced-motion
}
```

### useOptimizedAnimation.ts
**Location:** `client/src/hooks/useOptimizedAnimation.ts`

Performance-optimized animations.

```typescript
export const useOptimizedAnimation = () => {
  // RAF-based animations with performance monitoring
}
```

### useFocusManagement.ts
**Location:** `client/src/hooks/useFocusManagement.ts`

Keyboard focus management.

```typescript
export const useFocusManagement = () => {
  // Focus trap, focus restoration
}
```

### useRovingTabIndex.ts
**Location:** `client/src/hooks/useRovingTabIndex.ts`

Roving tabindex for keyboard navigation.

```typescript
export const useRovingTabIndex = () => {
  // Arrow key navigation
}
```

### useAdvertiseCMS.ts
**Location:** `client/src/hooks/useAdvertiseCMS.ts`

CMS content loading hook.

```typescript
export const useAdvertiseCMS = () => {
  // Fetch and validate CMS content
}
```

---

## Styles

### advertise-responsive.css
**Location:** `client/src/styles/advertise-responsive.css`

Responsive layout styles.

```css
/* Mobile-first responsive styles */
/* Breakpoints: 640px, 768px, 1024px, 1280px */
```

### advertise-focus-indicators.css
**Location:** `client/src/styles/advertise-focus-indicators.css`

Accessible focus indicators.

```css
/* High-contrast focus rings */
/* Keyboard navigation styles */
```

### Design Tokens

**Location:** `client/src/components/advertise/design-tokens.ts`

```typescript
export const designTokens = {
  colors: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    // ... all color tokens
  },
  spacing: {
    // ... spacing scale
  },
  typography: {
    // ... font sizes, weights
  },
  animations: {
    // ... animation durations, easings
  }
}
```

---

## Analytics & Tracking

### advertiseTracking.ts
**Location:** `client/src/lib/analytics/advertiseTracking.ts`

Analytics tracking functions.

```typescript
export const trackAdvertiseEvent = (event, properties) => {
  // Google Analytics, custom events
}

export const trackCTAClick = (ctaLocation, ctaText) => {
  // Track CTA interactions
}

export const trackSectionView = (sectionName) => {
  // Track section visibility
}

export const trackFormSubmission = (formType) => {
  // Track form submissions
}
```

---

## SEO & Accessibility

### SEOHead.tsx
**Location:** `client/src/components/advertise/SEOHead.tsx`

SEO meta tags component.

```typescript
export const SEOHead = () => {
  return (
    <Helmet>
      <title>Advertise With Us | Property Platform</title>
      <meta name="description" content="..." />
      <meta property="og:title" content="..." />
      {/* ... all meta tags */}
    </Helmet>
  )
}
```

### StructuredData.tsx
**Location:** `client/src/components/advertise/StructuredData.tsx`

JSON-LD structured data.

```typescript
export const StructuredData = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    // ... structured data
  }
  
  return (
    <script type="application/ld+json">
      {JSON.stringify(schema)}
    </script>
  )
}
```

### SkipLinks.tsx
**Location:** `client/src/components/advertise/SkipLinks.tsx`

Skip navigation links.

```typescript
export const SkipLinks = () => {
  return (
    <div className="skip-links">
      <a href="#main-content">Skip to main content</a>
      <a href="#pricing">Skip to pricing</a>
      <a href="#faq">Skip to FAQ</a>
    </div>
  )
}
```

### Breadcrumb.tsx
**Location:** `client/src/components/advertise/Breadcrumb.tsx`

Breadcrumb navigation.

```typescript
export const Breadcrumb = ({ items }) => {
  // Accessible breadcrumb with schema.org markup
}
```

### KeyboardNavigationGuide.tsx
**Location:** `client/src/components/advertise/KeyboardNavigationGuide.tsx`

Keyboard shortcuts guide.

```typescript
export const KeyboardNavigationGuide = () => {
  // Modal showing keyboard shortcuts
}
```

---

## CMS Integration

### CMS Types
**Location:** `client/src/services/cms/types.ts`

```typescript
export interface HeroContent {
  headline: string
  subheadline: string
  primaryCTA: CTAConfig
  secondaryCTA: CTAConfig
  backgroundImage?: string
}

export interface FeatureContent {
  icon: string
  title: string
  description: string
}

// ... all content types
```

### CMS Client
**Location:** `client/src/services/cms/cmsClient.ts`

```typescript
export class CMSClient {
  async fetchHeroContent(): Promise<HeroContent> {
    // Fetch from CMS API
  }
  
  async fetchFeatures(): Promise<FeatureContent[]> {
    // Fetch features
  }
  
  // ... all CMS methods
}
```

### Default Content
**Location:** `client/src/services/cms/defaultContent.ts`

```typescript
export const defaultHeroContent: HeroContent = {
  headline: "Reach More Buyers",
  subheadline: "Showcase your properties...",
  // ... fallback content
}
```

### Content Validator
**Location:** `client/src/services/cms/contentValidator.ts`

```typescript
export const validateHeroContent = (content: unknown): HeroContent => {
  // Zod validation
}
```

---

## Error Handling

### AdvertiseErrorBoundary.tsx
**Location:** `client/src/components/advertise/AdvertiseErrorBoundary.tsx`

Error boundary component.

```typescript
export class AdvertiseErrorBoundary extends React.Component {
  // Catch and display errors gracefully
}
```

### ErrorStates.tsx
**Location:** `client/src/components/advertise/ErrorStates.tsx`

Error state components.

```typescript
export const ErrorState = ({ error, retry }) => {
  // User-friendly error display
}
```

### SkeletonLoaders.tsx
**Location:** `client/src/components/advertise/SkeletonLoaders.tsx`

Loading skeleton components.

```typescript
export const HeroSkeleton = () => {
  // Skeleton for hero section
}

export const FeaturesSkeleton = () => {
  // Skeleton for features
}
```

---

## Performance Optimization

### PerformanceOptimizer.tsx
**Location:** `client/src/components/advertise/PerformanceOptimizer.tsx`

Performance optimization wrapper.

```typescript
export const PerformanceOptimizer = ({ children }) => {
  // Resource hints, preloading, lazy loading
}
```

### Animation Utilities

**Location:** `client/src/lib/animations/advertiseAnimations.ts`

```typescript
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
}

export const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}
```

**Location:** `client/src/lib/animations/motionUtils.ts`

```typescript
export const getMotionProps = (reducedMotion: boolean) => {
  // Return appropriate motion props
}
```

**Location:** `client/src/lib/animations/performanceUtils.ts`

```typescript
export const usePerformanceMonitor = () => {
  // Monitor animation performance
}
```

---

## Tests

### Property-Based Tests

**CTAButton.property.test.tsx**
```typescript
// Property: All CTA buttons should be keyboard accessible
// Property: CTA text should always be visible
```

**HeroSection.property.test.tsx**
```typescript
// Property: Hero should render with any valid content
// Property: CTAs should always be clickable
```

**FeatureTile.property.test.tsx**
```typescript
// Property: Hover states should be consistent
// Property: Icons should always render
```

**FAQAccordion.property.test.tsx**
```typescript
// Property: Only one item open at a time
// Property: Keyboard navigation works
```

### Unit Tests

**ReducedMotion.test.tsx**
```typescript
// Test reduced motion preference detection
```

**CrossBrowserCompatibility.test.tsx**
```typescript
// Test browser compatibility
```

### Visual Regression Tests

**AdvertisePage.visual.test.ts**
```typescript
// Screenshot tests for all sections
```

**InteractionStates.visual.test.ts**
```typescript
// Test hover, focus, active states
```

### Accessibility Tests

**LighthouseAccessibility.property.test.tsx**
```typescript
// Property: All pages should pass WCAG AA
```

---

## Configuration Files

### Environment Variables

**.env.production.template**
```bash
VITE_CMS_API_URL=https://cms.example.com
VITE_GA_TRACKING_ID=UA-XXXXXXXXX-X
VITE_ENABLE_ANALYTICS=true
```

### Build Configuration

**vite.config.ts** (relevant sections)
```typescript
export default defineConfig({
  // Optimizations for advertise page
})
```

---

## Documentation Files

All documentation is located in `.kiro/specs/advertise-with-us-landing/`:

- `requirements.md` - User stories and acceptance criteria
- `design.md` - Technical design and architecture
- `tasks.md` - Implementation task list
- `PROJECT_COMPLETE.md` - Project completion summary
- `DEPLOYMENT_CHECKLIST.md` - Deployment checklist
- `TESTING_QUICK_REFERENCE.md` - Testing guide
- `ACCESSIBILITY_QUICK_REFERENCE.md` - Accessibility guide
- `ANALYTICS_QUICK_REFERENCE.md` - Analytics guide
- `SEO_QUICK_REFERENCE.md` - SEO guide
- `CMS_QUICK_START.md` - CMS integration guide

---

## Key Features Summary

### 1. **Responsive Design**
- Mobile-first approach
- Breakpoints: 640px, 768px, 1024px, 1280px
- Touch-friendly interactions
- Sticky mobile CTA

### 2. **Accessibility**
- WCAG 2.1 AA compliant
- Keyboard navigation
- Screen reader support
- Focus management
- Reduced motion support
- High contrast mode

### 3. **Performance**
- Lazy loading
- Image optimization
- Code splitting
- Resource hints
- Animation performance monitoring

### 4. **SEO**
- Semantic HTML
- Meta tags
- Open Graph
- Twitter Cards
- Structured data (JSON-LD)
- Breadcrumbs

### 5. **Analytics**
- Page view tracking
- CTA click tracking
- Section view tracking
- Form submission tracking
- Scroll depth tracking
- Time on page

### 6. **CMS Integration**
- Dynamic content loading
- Content validation
- Fallback content
- Cache management
- Preview mode

### 7. **Error Handling**
- Error boundaries
- Graceful degradation
- Retry mechanisms
- User-friendly error messages
- Loading states

### 8. **Testing**
- Property-based tests
- Unit tests
- Integration tests
- Visual regression tests
- Accessibility tests
- Cross-browser tests

---

## File Structure

```
client/src/
├── pages/
│   └── AdvertiseWithUs.tsx
├── components/
│   └── advertise/
│       ├── HeroSection.tsx
│       ├── PartnerSelectionSection.tsx
│       ├── ValuePropositionSection.tsx
│       ├── HowItWorksSection.tsx
│       ├── FeaturesGridSection.tsx
│       ├── SocialProofSection.tsx
│       ├── PricingPreviewSection.tsx
│       ├── FAQSection.tsx
│       ├── FinalCTASection.tsx
│       ├── MobileStickyCTA.tsx
│       ├── CTAButton.tsx
│       ├── PartnerTypeCard.tsx
│       ├── FeatureBlock.tsx
│       ├── FeatureTile.tsx
│       ├── ProcessStep.tsx
│       ├── MetricCard.tsx
│       ├── PricingCard.tsx
│       ├── FAQAccordionItem.tsx
│       ├── BackgroundOrbs.tsx
│       ├── TrustSignals.tsx
│       ├── PreviewCarousel.tsx
│       ├── BillboardBanner.tsx
│       ├── SEOHead.tsx
│       ├── StructuredData.tsx
│       ├── SkipLinks.tsx
│       ├── Breadcrumb.tsx
│       ├── KeyboardNavigationGuide.tsx
│       ├── AdvertiseErrorBoundary.tsx
│       ├── ErrorStates.tsx
│       ├── SkeletonLoaders.tsx
│       ├── PerformanceOptimizer.tsx
│       ├── design-tokens.ts
│       └── __tests__/
├── hooks/
│   ├── useAdvertiseAnalytics.ts
│   ├── useScrollAnimation.ts
│   ├── useReducedMotion.advertise.ts
│   ├── useOptimizedAnimation.ts
│   ├── useFocusManagement.ts
│   ├── useRovingTabIndex.ts
│   └── useAdvertiseCMS.ts
├── lib/
│   ├── analytics/
│   │   └── advertiseTracking.ts
│   ├── animations/
│   │   ├── advertiseAnimations.ts
│   │   ├── motionUtils.ts
│   │   └── performanceUtils.ts
│   └── accessibility/
│       ├── ariaHelpers.ts
│       └── focusManager.ts
├── services/
│   └── cms/
│       ├── types.ts
│       ├── cmsClient.ts
│       ├── defaultContent.ts
│       ├── contentValidator.ts
│       └── iconMapper.ts
└── styles/
    ├── advertise-responsive.css
    └── advertise-focus-indicators.css
```

---

## Next Steps for Improvement

Based on this codebase, here are areas you might want to enhance:

1. **A/B Testing**: Add variant testing for CTAs and headlines
2. **Personalization**: Dynamic content based on user type
3. **Advanced Analytics**: Heatmaps, session recordings
4. **Internationalization**: Multi-language support
5. **Progressive Web App**: Offline support, install prompt
6. **Advanced Animations**: More sophisticated micro-interactions
7. **Video Content**: Hero video background option
8. **Live Chat**: Integrated support widget
9. **Social Proof**: Real-time user activity feed
10. **Exit Intent**: Popup for leaving users

---

## Getting Started with Improvements

To work on improvements:

1. Review the requirements in `.kiro/specs/advertise-with-us-landing/requirements.md`
2. Check the design document for architecture details
3. Run tests: `npm test -- advertise`
4. Start dev server: `npm run dev`
5. Navigate to `/advertise` route

All components are modular and can be enhanced independently.
