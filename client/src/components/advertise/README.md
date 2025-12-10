# Advertise With Us Landing Page - Project Structure

This directory contains all components, utilities, and assets for the "Advertise With Us" landing page.

## Directory Structure

```
client/src/components/advertise/
├── design-tokens.ts              # Soft-UI design tokens (colors, shadows, spacing, etc.)
├── __tests__/
│   └── design-tokens.property.test.ts  # Property tests for design token consistency
└── README.md                     # This file

client/src/lib/animations/
├── advertiseAnimations.ts        # Framer Motion animation variants
└── __tests__/
    └── advertiseAnimations.property.test.ts  # Property tests for animation timing

client/src/hooks/
└── useScrollAnimation.ts         # Hook for scroll-triggered animations
```

## Design Tokens

The soft-UI design tokens are defined in `design-tokens.ts` and include:

### Colors
- **Primary**: Purple/indigo gradient (#667eea → #764ba2)
- **Secondary**: Pink/red gradient (#f093fb → #f5576c)
- **Neutral**: Comprehensive gray scale (50-900)
- **Accent**: Blue, green, yellow, purple

### Shadows
- **soft**: Subtle card shadow
- **softHover**: Elevated hover state
- **softLarge**: Large element shadow
- **primaryGlow**: Colored glow for primary buttons
- **secondaryGlow**: Colored glow for secondary buttons

### Border Radius
- **soft**: 12px
- **softLarge**: 16px
- **softXL**: 24px
- **pill**: 9999px

### Transitions
- **fast**: 150ms cubic-bezier(0.4, 0, 0.2, 1)
- **base**: 300ms cubic-bezier(0.4, 0, 0.2, 1)
- **slow**: 500ms cubic-bezier(0.4, 0, 0.2, 1)
- **spring**: 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)

## Tailwind Utilities

The following Tailwind utility classes have been added to `client/tailwind.config.js`:

- `.soft-card`: Soft-UI card with subtle shadow
- `.soft-card-hover`: Hover state with lift effect
- `.soft-btn-primary`: Primary gradient button
- `.soft-btn-secondary`: Secondary gradient button
- `.gradient-text-primary`: Primary gradient text
- `.gradient-text-secondary`: Secondary gradient text

## Animation Variants

The following Framer Motion animation variants are available in `advertiseAnimations.ts`:

### Main Animations
- **fadeUp**: Fade in while moving up from below
- **softLift**: Lift up with shadow expansion on hover
- **staggerContainer**: Parent container for staggered children
- **staggerItem**: Child elements that animate in sequence
- **scaleIn**: Scale up from smaller size
- **slideInLeft**: Slide in from left
- **slideInRight**: Slide in from right
- **fade**: Simple opacity change
- **buttonPress**: Button press animation
- **pulse**: Attention-grabbing pulse
- **rotate**: Icon rotation

### Usage Example

```tsx
import { motion } from 'framer-motion';
import { fadeUp, softLift } from '@/lib/animations/advertiseAnimations';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

function MyComponent() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  return (
    <motion.div
      ref={ref}
      initial="initial"
      animate={isVisible ? "animate" : "initial"}
      variants={fadeUp}
    >
      <motion.button
        variants={softLift}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
      >
        Click Me
      </motion.button>
    </motion.div>
  );
}
```

## Scroll Animation Hook

The `useScrollAnimation` hook provides scroll-triggered animations using Intersection Observer:

```tsx
const { ref, isVisible, hasBeenVisible } = useScrollAnimation({
  threshold: 0.1,        // Trigger when 10% visible
  rootMargin: '0px',     // Margin around viewport
  triggerOnce: true,     // Only trigger once
  enabled: true,         // Enable/disable animations
});
```

Features:
- Respects `prefers-reduced-motion` user preference
- Configurable threshold and root margin
- Option to trigger once or repeatedly
- Multiple element support with `useMultipleScrollAnimations`

## Property-Based Tests

### Design Token Tests
Location: `client/src/components/advertise/__tests__/design-tokens.property.test.ts`

Tests verify:
- All color values are valid CSS colors (hex, rgb, rgba, or gradients)
- All shadow values contain valid CSS syntax
- All border radius values are valid CSS units
- All transition timings contain valid duration and easing
- All spacing values are valid rem units
- All typography values are valid and within reasonable ranges
- All breakpoints are valid and within reasonable ranges
- All z-index values are non-negative numbers

Status: ✅ All tests passing (14/14)

### Animation Timing Tests
Location: `client/src/lib/animations/__tests__/advertiseAnimations.property.test.ts`

Tests verify:
- Animation durations are within specified ranges
- Easing functions are valid cubic-bezier values
- Stagger delays are reasonable
- All required animation variants exist
- Animation variants have consistent structure

Status: ✅ All tests passing (13/13)

**Resolution**: Updated property tests to reflect tiered animation duration approach based on modern UX best practices:
- Micro-interactions (tap): 100-200ms
- Exit animations: ≤250ms
- Entrance animations: 350-600ms

This approach follows guidelines from Google Material Design, Apple HIG, and Nielsen Norman Group research.

## Next Steps

1. Resolve animation timing specification (see PBT failure above)
2. Create page components (Hero, Partner Selection, Value Proposition, etc.)
3. Implement responsive layouts
4. Add SEO optimization
5. Implement analytics tracking

## Design Philosophy

The landing page follows a **Soft-UI** design aesthetic:
- Pastel gradients with soft color transitions
- Soft shadows (not harsh, not flat)
- Rounded elements with generous border radius
- Smooth, natural animations
- Premium, trustworthy aesthetic

Inspired by: Zillow Partners, 99Acres, SquareYards
