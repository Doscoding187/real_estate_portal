# Task 8: Pricing Preview Section - Visual Guide

## Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                  PRICING PREVIEW SECTION                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Pricing That Fits Your Business              │  │
│  │  Choose the plan that works for you. All plans...    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  [Icon]  │  │  [Icon]  │  │  [Icon]  │  │  [Icon]  │  │
│  │          │  │          │  │          │  │          │  │
│  │  Agent   │  │Developer │  │Bank/Loan │  │ Service  │  │
│  │  Plans   │  │  Plans   │  │ Provider │  │ Provider │  │
│  │          │  │          │  │  Plans   │  │  Plans   │  │
│  │ Flexible │  │Comprehen-│  │ Targeted │  │Affordable│  │
│  │ pricing  │  │  sive    │  │advertis- │  │ options  │  │
│  │   for    │  │packages  │  │   ing    │  │   for    │  │
│  │individual│  │   for    │  │   for    │  │ property │  │
│  │  agents  │  │ property │  │financial │  │ service  │  │
│  │   and    │  │developer │  │instituti-│  │providers │  │
│  │  small   │  │          │  │   ons    │  │          │  │
│  │  teams   │  │          │  │          │  │          │  │
│  │          │  │          │  │          │  │          │  │
│  │View Price│  │View Price│  │View Price│  │View Price│  │
│  │    →     │  │    →     │  │    →     │  │    →     │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                              │
│              ┌──────────────────────────┐                   │
│              │  View Full Pricing  →    │                   │
│              └──────────────────────────┘                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Desktop Layout (>1024px)

```
┌────────────────────────────────────────────────────────────────┐
│                     Max Width: 1440px                          │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                    Section Header                         │ │
│  │              Pricing That Fits Your Business              │ │
│  │         Choose the plan that works for you...             │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│  │ Card 1  │    │ Card 2  │    │ Card 3  │    │ Card 4  │   │
│  │ Agent   │    │Developer│    │Bank/Loan│    │ Service │   │
│  │ Plans   │    │ Plans   │    │ Provider│    │Provider │   │
│  │         │    │         │    │ Plans   │    │ Plans   │   │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘   │
│                                                                 │
│                  ┌──────────────────────┐                      │
│                  │ View Full Pricing →  │                      │
│                  └──────────────────────┘                      │
└────────────────────────────────────────────────────────────────┘
```

## Tablet Layout (768px - 1024px)

```
┌──────────────────────────────────────────┐
│         Section Header                   │
│   Pricing That Fits Your Business        │
│  Choose the plan that works for you...   │
└──────────────────────────────────────────┘

┌──────────────┐      ┌──────────────┐
│   Card 1     │      │   Card 2     │
│ Agent Plans  │      │Developer Plans│
└──────────────┘      └──────────────┘

┌──────────────┐      ┌──────────────┐
│   Card 3     │      │   Card 4     │
│ Bank/Loan    │      │  Service     │
│ Provider     │      │  Provider    │
└──────────────┘      └──────────────┘

      ┌──────────────────────┐
      │ View Full Pricing →  │
      └──────────────────────┘
```

## Mobile Layout (<768px)

```
┌────────────────────────┐
│   Section Header       │
│ Pricing That Fits      │
│   Your Business        │
│  Choose the plan...    │
└────────────────────────┘

┌────────────────────────┐
│      Card 1            │
│    Agent Plans         │
│                        │
│  Flexible pricing for  │
│  individual agents...  │
│                        │
│  View Pricing →        │
└────────────────────────┘

┌────────────────────────┐
│      Card 2            │
│   Developer Plans      │
│                        │
│  Comprehensive         │
│  packages for...       │
│                        │
│  View Pricing →        │
└────────────────────────┘

┌────────────────────────┐
│      Card 3            │
│  Bank/Loan Provider    │
│                        │
│  Targeted advertising  │
│  for financial...      │
│                        │
│  View Pricing →        │
└────────────────────────┘

┌────────────────────────┐
│      Card 4            │
│  Service Provider      │
│                        │
│  Affordable options    │
│  for property...       │
│                        │
│  View Pricing →        │
└────────────────────────┘

┌────────────────────────┐
│ View Full Pricing →    │
└────────────────────────┘
```

## Card Anatomy

```
┌─────────────────────────────────────┐
│  ┌─────────┐                        │ ← Border (2px gray)
│  │  Icon   │                        │   Hover: Gradient glow
│  │  56x56  │                        │
│  └─────────┘                        │
│                                     │
│  Category Title                     │ ← H3, Bold, 20px
│  (e.g., "Agent Plans")              │
│                                     │
│  Brief description of the pricing   │ ← P, 16px, Gray
│  category. Explains what's included │
│  and who it's for.                  │
│                                     │
│  View Pricing →                     │ ← CTA with arrow
│                                     │   Slides right on hover
└─────────────────────────────────────┘
```

## Hover States

### Card Hover
```
Before Hover:
┌─────────────────────┐
│  [Icon]             │ ← Border: 2px gray
│  Category           │
│  Description        │
│  View Pricing →     │
└─────────────────────┘

During Hover:
┌═════════════════════┐
║  [Icon] (scaled)    ║ ← Border: Gradient glow
║  Category           ║   Icon: 1.05x scale
║  Description        ║   Arrow: Slides right 4px
║  View Pricing  →    ║
└═════════════════════┘
```

### Icon Hover
```
Before:              After:
┌─────────┐         ┌─────────┐
│  Icon   │   →     │  Icon   │ (1.05x scale)
│  56x56  │         │  58x58  │ (background lighter)
└─────────┘         └─────────┘
```

## Color Scheme

### Card Colors
- **Background**: White (#ffffff)
- **Border**: Gray 200 (#e5e7eb)
- **Border Hover**: Primary gradient (#667eea → #764ba2)
- **Icon Background**: Primary light (#f0f4ff)
- **Icon Color**: Primary base (#667eea)

### Typography Colors
- **Category Title**: Gray 900 (#111827)
- **Description**: Gray 600 (#4b5563)
- **CTA**: Primary base (#667eea)

## Spacing

```
Section Padding:
  Top/Bottom: 96px (5xl)
  Left/Right: 24px (lg)

Card Padding:
  All sides: 48px (2xl)

Grid Gap:
  Between cards: 32px (xl)

Element Spacing:
  Icon → Title: 24px (lg)
  Title → Description: 16px (md)
  Description → CTA: 24px (lg)
```

## Animations

### Scroll Animations
```
Timeline:
0ms    → Section header fades in
100ms  → Card 1 fades up
200ms  → Card 2 fades up
300ms  → Card 3 fades up
400ms  → Card 4 fades up
700ms  → CTA button fades in
```

### Hover Animations
```
Card Hover:
  Duration: 300ms
  Easing: cubic-bezier(0.4, 0, 0.2, 1)
  Properties:
    - Border opacity: 0 → 1
    - Transform: none → translateY(-2px)

Icon Hover:
  Duration: 300ms
  Properties:
    - Scale: 1 → 1.05
    - Background: light → subtle

Arrow Hover:
  Duration: 200ms
  Properties:
    - Transform: translateX(0) → translateX(4px)
```

## Accessibility Features

```
┌─────────────────────────────────────┐
│  <section                           │
│    aria-labelledby="pricing-heading"│
│  >                                  │
│    <h2 id="pricing-heading">        │
│      Pricing That Fits...           │
│    </h2>                            │
│                                     │
│    <a                               │
│      href="/pricing/agents"         │
│      aria-label="View Agent Plans   │
│                  pricing details"   │
│      tabindex="0"                   │
│    >                                │
│      [Card Content]                 │
│    </a>                             │
│  </section>                         │
└─────────────────────────────────────┘
```

## Analytics Events

### Card Click
```javascript
Event: 'pricing_card_click'
Data: {
  category: 'Agent Plans',
  location: 'pricing_preview',
  href: '/pricing/agents',
  timestamp: '2024-01-01T12:00:00.000Z'
}
```

### CTA Click
```javascript
Event: 'cta_click'
Data: {
  label: 'View Full Pricing',
  location: 'pricing_preview',
  href: '/pricing',
  timestamp: '2024-01-01T12:00:00.000Z'
}
```

## Integration Example

```tsx
import { PricingPreviewSection } from '@/components/advertise/PricingPreviewSection';

function AdvertiseWithUsPage() {
  return (
    <main>
      <HeroSection {...heroProps} />
      <PartnerSelectionSection />
      <ValuePropositionSection />
      <HowItWorksSection />
      <FeaturesGridSection />
      <SocialProofSection />
      
      {/* Pricing Preview Section */}
      <PricingPreviewSection />
      
      <FinalCTASection />
      <FAQSection />
    </main>
  );
}
```

## Testing Checklist

- ✅ All 4 pricing cards render correctly
- ✅ Cards navigate to correct URLs on click
- ✅ Hover border glow effect works
- ✅ Icon scales on hover
- ✅ Arrow slides on hover
- ✅ "View Full Pricing" CTA renders
- ✅ Responsive layout works (4 → 2 → 1 columns)
- ✅ Analytics tracking fires on clicks
- ✅ Accessibility attributes present
- ✅ Keyboard navigation works
- ✅ Property tests pass (100 iterations)
- ✅ No TypeScript errors
- ✅ No console warnings

## Browser Testing

Test in:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Safari (iOS 14+)
- ✅ Chrome Mobile (Android 10+)

## Performance Metrics

- Initial render: < 200ms
- Hover response: < 16ms (60fps)
- Animation duration: 300-500ms
- Bundle size impact: Minimal
- Lighthouse score: 90+
