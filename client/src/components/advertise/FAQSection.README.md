# FAQ Section Components

## Overview

The FAQ Section provides an accessible, animated accordion interface for displaying frequently asked questions. Built with Framer Motion for smooth animations and full keyboard support.

## Components

### FAQSection

Main container component that manages the accordion state and displays FAQ items.

**Props:**
```typescript
interface FAQSectionProps {
  faqs?: FAQ[];  // Optional custom FAQ items
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  order: number;
}
```

**Features:**
- 8 default FAQ items covering common partner concerns
- Only one item open at a time
- Scroll-triggered fade-in animation
- Contact CTA for additional questions
- Fully responsive (mobile, tablet, desktop)

**Usage:**
```tsx
import { FAQSection } from '@/components/advertise/FAQSection';

// With default FAQs
<FAQSection />

// With custom FAQs
<FAQSection faqs={customFAQs} />
```

### FAQAccordionItem

Individual FAQ item with expand/collapse functionality.

**Props:**
```typescript
interface FAQAccordionItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}
```

**Features:**
- Smooth expand/collapse animation (300ms)
- Keyboard accessible (Enter/Space to toggle)
- ARIA attributes for screen readers
- Hover states with soft elevation
- Chevron icon rotation animation

**Usage:**
```tsx
import { FAQAccordionItem } from '@/components/advertise/FAQAccordionItem';

<FAQAccordionItem
  question="How much does it cost?"
  answer="Pricing varies by partner type..."
  isOpen={openIndex === 0}
  onToggle={() => setOpenIndex(openIndex === 0 ? null : 0)}
/>
```

## Default FAQ Content

The component includes 8 default FAQ items:

1. **Pricing** - Cost breakdown by partner type
2. **Advertising Opportunities** - Available formats and placements
3. **Getting Started** - Onboarding process
4. **Platform Differentiation** - Unique value propositions
5. **Lead Verification** - How leads are verified and delivered
6. **Multi-Property Management** - Scale and team collaboration
7. **Analytics & Reporting** - Dashboard insights
8. **Contracts & Cancellation** - Flexible terms

## Accessibility

### Keyboard Navigation
- `Tab` - Navigate between FAQ items
- `Enter` or `Space` - Toggle accordion
- `Shift + Tab` - Navigate backwards

### Screen Reader Support
- Semantic HTML structure
- ARIA `expanded` and `controls` attributes
- Proper heading hierarchy
- Focus management

### Visual Accessibility
- Focus indicators (2px ring with primary color)
- High contrast text (WCAG AA compliant)
- Touch-friendly tap targets (minimum 44x44px)
- Respects `prefers-reduced-motion`

## Animation Details

### Expand/Collapse
- **Duration:** 300ms
- **Easing:** cubic-bezier(0.4, 0, 0.2, 1)
- **Properties:** height, opacity
- **Performance:** GPU-accelerated

### Chevron Rotation
- **Duration:** 300ms
- **Rotation:** 0° → 180°
- **Easing:** cubic-bezier(0.4, 0, 0.2, 1)

### Scroll-Triggered Fade-In
- **Duration:** 600ms
- **Delay:** Staggered (0ms, 200ms, 400ms)
- **Properties:** opacity, translateY

## Styling

Uses soft-UI design tokens:
- **Border Radius:** 12px (soft)
- **Shadow:** soft (default), softHover (hover/open)
- **Colors:** Gray scale with primary accent
- **Typography:** 18px question, 16px answer

## Responsive Behavior

### Mobile (< 768px)
- Single column layout
- Full-width accordion items
- Touch-optimized spacing
- Larger tap targets

### Tablet (768px - 1024px)
- Centered content (max-width: 768px)
- Comfortable reading width

### Desktop (> 1024px)
- Centered content (max-width: 896px)
- Optimal line length for readability

## Performance

- Lazy animation with AnimatePresence
- No layout thrashing
- Efficient re-renders with proper key usage
- Minimal DOM manipulation

## Testing

See property-based tests in:
- `__tests__/FAQAccordion.property.test.tsx`

Tests verify:
- Only one item open at a time
- Smooth animation timing
- Keyboard accessibility
- ARIA attributes

## Demo

View the component in action:
```
/faq-demo
```

## Requirements Validation

Validates requirements:
- **9.1** - 6-10 FAQ items in collapsible accordion format ✓
- **9.2** - Smooth expand/collapse animation ✓
- **9.3** - Clear, concise language ✓
- **9.4** - Organized by importance ✓
- **9.5** - Touch-friendly on mobile ✓
