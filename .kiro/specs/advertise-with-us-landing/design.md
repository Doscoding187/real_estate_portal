# Design Document: Advertise With Us Landing Page

## Overview

The "Advertise With Us" landing page is a premium, conversion-optimized marketing page designed to attract and onboard advertising partners across five distinct categories: Agents, Developers, Banks, Bond Originators, and Property Service Providers. The page combines the best UX patterns from industry leaders (Zillow Partners, 99Acres, SquareYards) with the platform's signature soft-UI aesthetic to create a trustworthy, modern, and high-performing experience.

The design prioritizes:
- **Immediate value communication** through a compelling hero section
- **Clear segmentation** allowing partners to self-identify quickly
- **Trust building** through social proof, metrics, and professional presentation
- **Conversion optimization** with strategic CTA placement and minimal friction
- **Premium aesthetics** using soft-UI principles (pastel gradients, soft shadows, smooth animations)
- **Performance** with sub-1.5s load times and 90+ Lighthouse scores

## Architecture

### Component Hierarchy

```
AdvertiseWithUsPage
├── HeroSection
│   ├── HeroHeadline
│   ├── HeroSubheadline
│   ├── CTAGroup (Primary + Secondary)
│   ├── BillboardBanner (Static Clickable)
│   └── TrustBar
├── PartnerSelectionSection
│   └── PartnerTypeCard[] (5 cards)
├── ValuePropositionSection
│   └── FeatureBlock[] (4 blocks)
├── HowItWorksSection
│   ├── ProcessStep[] (3 steps)
│   └── CTAButton
├── FeaturesGridSection
│   └── FeatureTile[] (6 tiles)
├── SocialProofSection
│   ├── PartnerLogos
│   └── MetricsRow (4 metrics)
├── PricingPreviewSection
│   ├── PricingCard[] (4 cards)
│   └── CTAButton
├── FinalCTASection
│   ├── CTAHeadline
│   ├── CTASubtext
│   └── CTAGroup
├── FAQSection
│   └── FAQAccordionItem[] (6-10 items)
└── MobileStickyC TA (mobile only)
```

### Page Flow

1. **Entry**: User arrives from homepage navigation or external link
2. **Hero Impact**: Immediate value proposition with visual preview
3. **Self-Segmentation**: User identifies their partner type
4. **Value Discovery**: User learns key benefits and features
5. **Process Understanding**: User sees how easy it is to get started
6. **Trust Building**: User sees social proof and metrics
7. **Pricing Awareness**: User previews pricing options
8. **Conversion**: User clicks CTA to start registration or request demo
9. **FAQ Resolution**: User finds answers to remaining questions

### Responsive Strategy

- **Mobile (< 768px)**: Single column, stacked sections, sticky CTA, touch-optimized
- **Tablet (768px - 1024px)**: Two-column grids, reduced spacing, hybrid layouts
- **Desktop (> 1024px)**: Full grids, maximum 1440px container, optimal spacing

## Components and Interfaces

### HeroSection Component

**Purpose**: Create immediate impact and communicate core value proposition

**Props**:
```typescript
interface HeroSectionProps {
  headline: string;
  subheadline: string;
  primaryCTA: CTAConfig;
  secondaryCTA: CTAConfig;
  billboard: BillboardConfig;
  trustSignals: TrustSignal[];
}

interface CTAConfig {
  label: string;
  href: string;
  variant: 'primary' | 'secondary';
}

interface BillboardConfig {
  imageUrl: string;
  alt: string;
  developmentName: string;
  tagline: string;
  ctaLabel?: string;
  href: string;
}

interface TrustSignal {
  type: 'logo' | 'text';
  content: string;
  imageUrl?: string;
}
```

**Behavior**:
- Static billboard banner (no rotation)
- Fade-in animation on mount
- Parallax effect on scroll (subtle)
- CTA hover states with soft lift

### PartnerTypeCard Component

**Purpose**: Allow users to self-identify and navigate to relevant content

**Props**:
```typescript
interface PartnerTypeCardProps {
  icon: IconType;
  title: string;
  benefit: string;
  href: string;
  index: number; // for staggered animation
}
```

**Behavior**:
- Staggered fade-up on scroll (100ms delay per card)
- Hover: lift + shadow expansion
- Click: navigate to sub-landing page
- Touch: immediate visual feedback

### FeatureBlock Component

**Purpose**: Communicate key platform benefits

**Props**:
```typescript
interface FeatureBlockProps {
  icon: IconType;
  headline: string;
  description: string;
  index: number;
}
```

**Behavior**:
- Fade-up animation when entering viewport
- Icon pulse animation on hover
- Consistent spacing and alignment

### BillboardBanner Component

**Purpose**: Showcase featured development with focused conversion messaging

**Props**:
```typescript
interface BillboardBannerProps {
  imageUrl: string;
  alt: string;
  developmentName: string;
  tagline: string;
  ctaLabel?: string;
  href: string;
  onClick?: () => void;
}
```

**Behavior**:
- Entire banner is clickable link
- Hover: lift animation with glow ring
- Image zoom effect on hover
- Gradient overlay for text readability
- Featured badge indicator
- Smooth spring animations

### ProcessStep Component

**Purpose**: Visualize the onboarding process

**Props**:
```typescript
interface ProcessStepProps {
  stepNumber: number;
  icon: IconType;
  title: string;
  description: string;
}
```

**Behavior**:
- Sequential reveal animation
- Number badge with gradient background
- Connecting lines between steps (desktop only)

### FeatureTile Component

**Purpose**: Showcase specific advertising features

**Props**:
```typescript
interface FeatureTileProps {
  icon: IconType;
  title: string;
  description: string;
}
```

**Behavior**:
- Soft-UI card styling
- Hover lift animation
- Icon color transition on hover

### MetricCard Component

**Purpose**: Display social proof metrics

**Props**:
```typescript
interface MetricCardProps {
  value: string | number;
  label: string;
  icon?: IconType;
}
```

**Behavior**:
- Count-up animation when entering viewport
- Large, bold numbers
- Descriptive labels below

### PricingCard Component

**Purpose**: Preview pricing tiers

**Props**:
```typescript
interface PricingCardProps {
  category: string;
  description: string;
  href: string;
}
```

**Behavior**:
- Minimalist card design
- Hover: subtle border glow
- Click: navigate to full pricing page

### FAQAccordionItem Component

**Purpose**: Answer common questions

**Props**:
```typescript
interface FAQAccordionItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}
```

**Behavior**:
- Smooth expand/collapse animation
- Auto-close other items when opening
- Keyboard accessible (Enter/Space to toggle)

### MobileStickyCTA Component

**Purpose**: Maintain conversion opportunity on mobile

**Props**:
```typescript
interface MobileStickyCTAProps {
  label: string;
  href: string;
  isVisible: boolean; // based on scroll position
}
```

**Behavior**:
- Appears after scrolling past hero
- Slides up from bottom
- Fixed positioning with safe area insets
- Dismissible with slide-down gesture

## Data Models

### Page Content Model

```typescript
interface AdvertisePageContent {
  hero: {
    headline: string;
    subheadline: string;
    primaryCTA: CTAConfig;
    secondaryCTA: CTAConfig;
    billboard: BillboardConfig;
    trustSignals: TrustSignal[];
  };
  partnerTypes: PartnerType[];
  valueProposition: FeatureBlock[];
  howItWorks: ProcessStep[];
  features: Feature[];
  socialProof: {
    logos: PartnerLogo[];
    metrics: Metric[];
  };
  pricingPreview: PricingCategory[];
  finalCTA: {
    headline: string;
    subtext: string;
    primaryCTA: CTAConfig;
    secondaryCTA: CTAConfig;
  };
  faqs: FAQ[];
}

interface PartnerType {
  id: string;
  icon: IconType;
  title: string;
  benefit: string;
  href: string;
}

interface Feature {
  id: string;
  icon: IconType;
  title: string;
  description: string;
}

interface Metric {
  id: string;
  value: string | number;
  label: string;
  icon?: IconType;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  order: number;
}
```

### Analytics Event Model

```typescript
interface AdvertisePageEvent {
  eventType: 'page_view' | 'cta_click' | 'partner_type_click' | 'faq_expand' | 'scroll_depth';
  timestamp: Date;
  userId?: string;
  sessionId: string;
  metadata: {
    ctaLabel?: string;
    ctaLocation?: string;
    partnerType?: string;
    faqQuestion?: string;
    scrollPercentage?: number;
    deviceType: 'mobile' | 'tablet' | 'desktop';
    referrer?: string;
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Hero section load performance
*For any* page load, the hero section should be fully rendered and visible within 1.5 seconds from navigation start
**Validates: Requirements 1.1**

### Property 2: Partner card completeness
*For any* partner type card rendered on the page, the card should contain exactly four elements: an icon, a title, a benefit description, and a "Learn More" CTA
**Validates: Requirements 2.2**

### Property 3: Partner card navigation
*For any* partner type card, clicking the card should navigate to a URL that corresponds to that partner type's sub-landing page
**Validates: Requirements 2.3**

### Property 4: Partner card hover interaction
*For any* partner type card, hovering over the card should apply CSS transform and box-shadow changes that create a lift effect
**Validates: Requirements 2.4**

### Property 5: Feature block animation
*For any* feature block in the value proposition section, when the block enters the viewport, it should trigger a fade-up animation
**Validates: Requirements 3.2**

### Property 6: Feature block structure
*For any* feature block, the block should contain exactly three elements: a soft-UI icon, a headline, and descriptive text
**Validates: Requirements 3.3**

### Property 7: Feature block spacing consistency
*For any* two adjacent feature blocks in the value proposition section, the spacing between them should be equal to the spacing between any other pair of adjacent blocks
**Validates: Requirements 3.4**

### Property 8: Process step structure
*For any* step in the "How It Works" section, the step should contain exactly three elements: an icon, a step title, and a brief description
**Validates: Requirements 4.2**

### Property 9: Feature tile styling
*For any* feature tile in the features grid, the tile should have CSS properties for border-radius and box-shadow that match the soft-UI design system
**Validates: Requirements 5.2**

### Property 10: Feature tile hover interaction
*For any* feature tile, hovering over the tile should apply a CSS transform that creates a lift animation
**Validates: Requirements 5.3**

### Property 11: Metric structure
*For any* metric displayed in the social proof section, the metric should contain both a numeric value and a descriptive label
**Validates: Requirements 6.3**

### Property 12: Pricing card navigation
*For any* pricing category card, clicking the card should navigate to the full pricing page
**Validates: Requirements 7.3**

### Property 13: Primary CTA navigation
*For any* primary CTA button on the page, clicking the button should navigate to either the partner registration page or the contact form
**Validates: Requirements 8.4**

### Property 14: FAQ accordion behavior
*For any* FAQ item, clicking the item should expand that item and collapse all other currently expanded FAQ items
**Validates: Requirements 9.2**

### Property 15: Page load performance
*For any* device type (mobile, tablet, desktop), the page should complete initial render in under 1.5 seconds
**Validates: Requirements 10.1**

### Property 16: Lighthouse performance score
*For any* page load, running Lighthouse performance audit should return a score of 90 or higher
**Validates: Requirements 10.5**

### Property 17: Lighthouse accessibility score
*For any* page load, running Lighthouse accessibility audit should return a score of 95 or higher
**Validates: Requirements 10.5**

### Property 18: Viewport animation
*For any* page element with scroll-triggered animation, when the element enters the viewport, it should apply a fade-up animation with appropriate timing
**Validates: Requirements 11.1**

### Property 19: Interactive element hover
*For any* interactive element (buttons, cards, tiles), hovering over the element should apply hover effects including transform and shadow changes
**Validates: Requirements 11.2**

### Property 20: Animation duration
*For any* animation triggered on the page, the animation duration should be between 300ms and 500ms
**Validates: Requirements 11.5**

## Error Handling

### Loading States

**Hero Section Loading**:
- Display skeleton loaders for headline, subheadline, and CTAs
- Show placeholder for preview carousel
- Fade in content when loaded

**Content Loading Failures**:
- If partner types fail to load: Show error message with retry button
- If metrics fail to load: Show placeholder values with disclaimer
- If FAQs fail to load: Hide FAQ section entirely
- If pricing data fails: Show generic "View Pricing" CTA

### User Input Errors

**Navigation Errors**:
- If CTA link is broken: Log error, show toast notification, provide fallback contact link
- If partner type link is invalid: Navigate to general contact page

### Performance Degradation

**Slow Network**:
- Prioritize above-the-fold content
- Lazy load images below the fold
- Defer non-critical animations
- Show loading indicators for delayed sections

**Animation Performance**:
- Detect low-end devices using `navigator.hardwareConcurrency`
- Reduce or disable animations on low-end devices
- Respect `prefers-reduced-motion` media query

### Accessibility Errors

**Missing Alt Text**:
- Provide default alt text for all images
- Log warning in development mode

**Keyboard Navigation Issues**:
- Ensure all interactive elements are keyboard accessible
- Provide visible focus indicators
- Support Tab, Enter, Space, and Arrow keys

## Testing Strategy

### Unit Testing

**Component Tests**:
- Test each component renders with required props
- Test component behavior (hover, click, animation triggers)
- Test responsive behavior at different viewport sizes
- Test accessibility attributes (ARIA labels, roles, keyboard support)

**Utility Function Tests**:
- Test animation timing calculations
- Test scroll position detection
- Test viewport size detection
- Test URL generation for partner types

### Property-Based Testing

**Testing Framework**: fast-check (JavaScript/TypeScript property-based testing library)

**Test Configuration**: Each property test should run a minimum of 100 iterations

**Property Test Implementation**:

1. **Property 1: Hero section load performance**
   - Generate: Random page configurations
   - Test: Measure time from navigation to hero render
   - Assert: Time < 1500ms

2. **Property 2: Partner card completeness**
   - Generate: Random partner type data
   - Test: Render partner card, query DOM
   - Assert: Card contains icon, title, benefit, CTA

3. **Property 3: Partner card navigation**
   - Generate: Random partner types
   - Test: Simulate click, capture navigation
   - Assert: Navigation URL matches partner type

4. **Property 6: Feature block structure**
   - Generate: Random feature data
   - Test: Render feature block, query DOM
   - Assert: Block contains icon, headline, description

5. **Property 7: Feature block spacing consistency**
   - Generate: Random number of feature blocks
   - Test: Render blocks, measure spacing
   - Assert: All spacing values are equal

6. **Property 11: Metric structure**
   - Generate: Random metric data
   - Test: Render metric, query DOM
   - Assert: Metric contains value and label

7. **Property 14: FAQ accordion behavior**
   - Generate: Random FAQ data, random click sequence
   - Test: Simulate clicks, check expanded state
   - Assert: Only one item expanded at a time

8. **Property 16: Lighthouse performance score**
   - Generate: Random page configurations
   - Test: Run Lighthouse audit
   - Assert: Performance score >= 90

9. **Property 17: Lighthouse accessibility score**
   - Generate: Random page configurations
   - Test: Run Lighthouse audit
   - Assert: Accessibility score >= 95

10. **Property 20: Animation duration**
    - Generate: Random animated elements
    - Test: Trigger animation, measure duration
    - Assert: 300ms <= duration <= 500ms

### Integration Testing

**Page Flow Tests**:
- Test complete user journey from landing to CTA click
- Test navigation between sections
- Test scroll-triggered animations
- Test responsive layout changes

**Analytics Integration**:
- Test event tracking for all CTAs
- Test scroll depth tracking
- Test partner type selection tracking
- Test FAQ interaction tracking

### Performance Testing

**Load Time Tests**:
- Test initial page load on 3G, 4G, and WiFi
- Test Time to First Byte (TTFB)
- Test First Contentful Paint (FCP)
- Test Largest Contentful Paint (LCP)

**Animation Performance**:
- Test animation frame rate (should maintain 60fps)
- Test scroll performance with multiple animations
- Test memory usage during extended sessions

### Accessibility Testing

**Automated Tests**:
- Run axe-core accessibility audit
- Test keyboard navigation through all interactive elements
- Test screen reader compatibility (NVDA, JAWS, VoiceOver)
- Test color contrast ratios (WCAG AA compliance)

**Manual Tests**:
- Test with keyboard only (no mouse)
- Test with screen reader
- Test with browser zoom at 200%
- Test with reduced motion enabled

### Cross-Browser Testing

**Target Browsers**:
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

**Test Coverage**:
- Visual regression testing
- Animation compatibility
- CSS Grid/Flexbox support
- Intersection Observer API support

### Visual Regression Testing

**Tools**: Percy or Chromatic

**Test Scenarios**:
- Desktop viewport (1440px)
- Tablet viewport (768px)
- Mobile viewport (375px)
- Hover states
- Animation states
- Loading states
- Error states

## Implementation Notes

### Technology Stack

**Frontend Framework**: React with TypeScript
**Styling**: Tailwind CSS with custom soft-UI utilities
**Animation**: Framer Motion
**Scroll Detection**: Intersection Observer API
**Performance**: React.lazy for code splitting, image optimization

### Soft-UI Design Tokens

```typescript
const softUITokens = {
  colors: {
    primary: {
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      light: '#f0f4ff',
      dark: '#5a67d8',
    },
    secondary: {
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      light: '#fff5f7',
      dark: '#e53e3e',
    },
    neutral: {
      white: '#ffffff',
      gray50: '#f9fafb',
      gray100: '#f3f4f6',
      gray200: '#e5e7eb',
      gray300: '#d1d5db',
      gray400: '#9ca3af',
      gray500: '#6b7280',
      gray600: '#4b5563',
      gray700: '#374151',
      gray800: '#1f2937',
      gray900: '#111827',
    },
  },
  shadows: {
    soft: '0 2px 8px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.06)',
    softHover: '0 4px 12px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.12)',
    softLarge: '0 8px 24px rgba(0, 0, 0, 0.08), 0 16px 48px rgba(0, 0, 0, 0.12)',
  },
  borderRadius: {
    soft: '12px',
    softLarge: '16px',
    softXL: '24px',
  },
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
};
```

### Animation Patterns

**Fade-Up**:
```typescript
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
};
```

**Soft Lift**:
```typescript
const softLift = {
  rest: { y: 0, boxShadow: softUITokens.shadows.soft },
  hover: { y: -4, boxShadow: softUITokens.shadows.softHover },
  transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
};
```

**Staggered Children**:
```typescript
const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};
```

### SEO Optimization

**Meta Tags**:
```html
<title>Advertise With Us | Reach High-Intent Property Buyers</title>
<meta name="description" content="Advertise your properties, developments, and services to thousands of verified home seekers across South Africa. AI-powered visibility, verified leads, and full dashboard control." />
<meta property="og:title" content="Advertise With Us | Property Platform" />
<meta property="og:description" content="Reach high-intent property buyers and renters with AI-driven advertising." />
<meta property="og:image" content="/images/advertise-og-image.jpg" />
<meta property="og:type" content="website" />
```

**Structured Data**:
```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Advertise With Us",
  "description": "Advertising opportunities for property professionals",
  "url": "https://platform.com/advertise",
  "mainEntity": {
    "@type": "Service",
    "name": "Property Advertising Platform",
    "provider": {
      "@type": "Organization",
      "name": "Platform Name"
    }
  }
}
```

### Performance Optimization

**Image Optimization**:
- Use WebP format with JPEG fallback
- Implement responsive images with srcset
- Lazy load images below the fold
- Use blur-up placeholder technique

**Code Splitting**:
- Lazy load FAQ section
- Lazy load pricing preview section
- Lazy load social proof logos

**Critical CSS**:
- Inline critical CSS for above-the-fold content
- Defer non-critical CSS

**Resource Hints**:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="dns-prefetch" href="https://analytics.platform.com" />
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin />
```

### Analytics Implementation

**Event Tracking**:
```typescript
// Track CTA clicks
trackEvent('cta_click', {
  label: 'Get Started',
  location: 'hero',
  partnerType: null,
});

// Track partner type selection
trackEvent('partner_type_click', {
  partnerType: 'agent',
  location: 'partner_selection',
});

// Track scroll depth
trackEvent('scroll_depth', {
  percentage: 75,
  section: 'pricing_preview',
});

// Track FAQ interactions
trackEvent('faq_expand', {
  question: 'How much does it cost?',
  index: 2,
});
```

### Accessibility Implementation

**ARIA Labels**:
```jsx
<button
  aria-label="Get started with advertising"
  aria-describedby="hero-subheadline"
>
  Get Started
</button>

<section
  aria-labelledby="partner-types-heading"
  role="region"
>
  <h2 id="partner-types-heading">Who Are You Advertising As?</h2>
  {/* Partner type cards */}
</section>
```

**Keyboard Navigation**:
- All interactive elements must be keyboard accessible
- Provide skip links to main content sections
- Implement roving tabindex for card grids
- Support arrow key navigation in FAQ accordion

**Focus Management**:
- Visible focus indicators with 3px outline
- Focus trap in mobile sticky CTA when visible
- Return focus to trigger element after modal close

### Content Management

**CMS Integration**:
- All text content should be editable via CMS
- Partner type cards should be manageable via CMS
- FAQ items should be manageable via CMS
- Metrics should be updatable via CMS

**Content Validation**:
- Headline: 50-70 characters
- Subheadline: 100-150 characters
- Feature descriptions: 80-120 characters
- FAQ answers: 150-300 characters

### Deployment Checklist

- [ ] Run Lighthouse audit (Performance >= 90, Accessibility >= 95)
- [ ] Test on all target browsers
- [ ] Test on mobile devices (iOS and Android)
- [ ] Verify all CTAs navigate correctly
- [ ] Verify analytics tracking
- [ ] Test with screen reader
- [ ] Test keyboard navigation
- [ ] Verify SEO meta tags
- [ ] Test loading states
- [ ] Test error states
- [ ] Verify responsive layouts
- [ ] Test animation performance
- [ ] Verify image optimization
- [ ] Test with reduced motion enabled
- [ ] Verify WCAG AA compliance
