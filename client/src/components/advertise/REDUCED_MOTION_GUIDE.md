# Reduced Motion Support Guide

## Overview

The Advertise With Us landing page fully supports the `prefers-reduced-motion` media query, ensuring that users who have enabled reduced motion in their operating system or browser settings have a comfortable, accessible experience.

**Requirements**: 11.4 - Respect user preferences for reduced motion

## What is Reduced Motion?

Reduced motion is an accessibility feature that allows users to minimize the amount of animation and motion effects on websites. This is particularly important for users with:

- Vestibular disorders
- Motion sensitivity
- Epilepsy or seizure disorders
- Attention disorders
- Preference for minimal distractions

## Implementation Approach

Our implementation uses a **three-layer approach** to ensure comprehensive reduced motion support:

### 1. CSS Layer (Global)

The `reduced-motion.css` file provides global CSS rules that automatically disable or reduce animations when the user has enabled reduced motion.

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Benefits**:
- Works automatically for all elements
- No JavaScript required
- Immediate effect on page load
- Covers CSS animations and transitions

### 2. JavaScript/React Layer (Component-Level)

React hooks and utilities provide fine-grained control over animations in components.

**Key Hooks**:
- `useReducedMotion()` - Detects user preference
- `useAnimationDuration()` - Returns appropriate duration
- `useAnimationVariants()` - Returns appropriate variants
- `useConditionalAnimation()` - Conditionally applies animations

**Key Utilities**:
- `createAccessibleVariants()` - Converts variants to reduced motion
- `createAccessibleTransition()` - Converts transitions to reduced motion
- `applyReducedMotion()` - Applies reduced motion to props
- `shouldDisableAnimations()` - Checks if animations should be disabled

### 3. Framer Motion Layer (Animation Library)

Framer Motion animations are automatically adapted to respect reduced motion preferences.

## Usage Examples

### Basic Component with Reduced Motion

```tsx
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion.advertise';
import { fadeUp } from '@/lib/animations/advertiseAnimations';

function MyComponent() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={prefersReducedMotion ? { initial: { opacity: 0 }, animate: { opacity: 1 } } : fadeUp}
    >
      Content
    </motion.div>
  );
}
```

### Using Animation Variants Hook

```tsx
import { motion } from 'framer-motion';
import { useAnimationVariants } from '@/hooks/useReducedMotion.advertise';
import { fadeUp } from '@/lib/animations/advertiseAnimations';

function MyComponent() {
  const variants = useAnimationVariants(
    fadeUp, // Normal animation
    { initial: { opacity: 0 }, animate: { opacity: 1 } } // Reduced motion
  );

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={variants}
    >
      Content
    </motion.div>
  );
}
```

### Using Conditional Animation Hook

```tsx
import { motion } from 'framer-motion';
import { useConditionalAnimation } from '@/hooks/useReducedMotion.advertise';

function MyComponent() {
  const animationProps = useConditionalAnimation({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 },
  });

  return <motion.div {...animationProps}>Content</motion.div>;
}
```

### Using Motion Utilities

```tsx
import { motion } from 'framer-motion';
import { applyReducedMotion } from '@/lib/animations/motionUtils';
import { useReducedMotion } from '@/hooks/useReducedMotion.advertise';

function MyComponent() {
  const prefersReducedMotion = useReducedMotion();
  
  const motionProps = applyReducedMotion(
    {
      initial: { opacity: 0, y: 20, scale: 0.9 },
      animate: { opacity: 1, y: 0, scale: 1 },
      transition: { duration: 0.4 },
    },
    prefersReducedMotion
  );

  return <motion.div {...motionProps}>Content</motion.div>;
}
```

### Scroll-Triggered Animations

The `useScrollAnimation` hook automatically respects reduced motion:

```tsx
import { motion } from 'framer-motion';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { fadeUp } from '@/lib/animations/advertiseAnimations';

function MyComponent() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <motion.div
      ref={ref}
      initial="initial"
      animate={isVisible ? "animate" : "initial"}
      variants={fadeUp}
    >
      Content
    </motion.div>
  );
}
```

## What Gets Reduced?

When reduced motion is enabled, the following changes occur:

### Disabled Completely
- Transform animations (translate, scale, rotate)
- Parallax effects
- Hover lift effects
- Pulse animations
- Bounce animations
- Spin animations
- Background orb animations
- Stagger delays

### Reduced to Minimal
- Opacity transitions (0.01ms duration)
- Focus indicators (instant)
- CTA button feedback (0.15s for essential feedback)

### Preserved
- Essential UI feedback (loading spinners with `.motion-safe` class)
- Focus indicators (visible but instant)
- Color changes (for button states)

## Testing Reduced Motion

### Manual Testing

#### Chrome/Edge
1. Open DevTools (F12)
2. Press `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
3. Type "Emulate CSS prefers-reduced-motion"
4. Select "Emulate CSS prefers-reduced-motion: reduce"

#### Firefox
1. Type `about:config` in the address bar
2. Search for `ui.prefersReducedMotion`
3. Set value to `1`

#### Safari
1. Open System Preferences > Accessibility
2. Select "Display"
3. Check "Reduce motion"

#### Windows
1. Open Settings > Ease of Access > Display
2. Turn on "Show animations in Windows"

#### macOS
1. Open System Preferences > Accessibility
2. Select "Display"
3. Check "Reduce motion"

### Automated Testing

Run the test suite:

```bash
npm test -- ReducedMotion.test.tsx
```

## Best Practices

### DO ✅

1. **Use the provided hooks and utilities**
   - They handle reduced motion automatically
   - They're tested and reliable

2. **Keep opacity transitions**
   - Opacity changes are generally safe
   - They provide minimal visual feedback

3. **Test with reduced motion enabled**
   - Verify the experience is comfortable
   - Ensure content is still accessible

4. **Use `.motion-safe` for essential feedback**
   - Loading spinners
   - Critical state changes
   - Use sparingly

5. **Provide alternative feedback**
   - Use color changes
   - Use text labels
   - Use icons

### DON'T ❌

1. **Don't ignore reduced motion**
   - It's an accessibility requirement
   - It affects real users

2. **Don't use transform animations with reduced motion**
   - They can cause discomfort
   - They're disabled by CSS anyway

3. **Don't rely solely on animation for feedback**
   - Always provide alternative indicators
   - Use ARIA labels

4. **Don't override reduced motion without good reason**
   - Respect user preferences
   - Only use `.motion-force` for critical feedback

5. **Don't test only with animations enabled**
   - Always test both modes
   - Ensure functionality works in both

## Component Checklist

When creating or updating components, ensure:

- [ ] Component uses `useReducedMotion()` hook or motion utilities
- [ ] Animations are disabled or reduced when reduced motion is preferred
- [ ] Component is tested with reduced motion enabled
- [ ] Essential functionality works without animations
- [ ] Alternative feedback is provided (color, text, icons)
- [ ] CSS classes respect reduced motion media query
- [ ] Hover effects are disabled with reduced motion
- [ ] Focus indicators remain visible (but instant)

## Browser Support

Reduced motion support is available in:

- Chrome 74+
- Firefox 63+
- Safari 10.1+
- Edge 79+
- iOS Safari 10.3+
- Android Chrome 74+

For older browsers, animations will display normally (graceful degradation).

## Performance Considerations

Reduced motion also improves performance:

- Fewer GPU operations
- Lower CPU usage
- Better battery life on mobile devices
- Faster page rendering

This makes it beneficial for:
- Low-end devices
- Mobile devices
- Battery-constrained situations

## Resources

- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [WCAG 2.1: Animation from Interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)
- [Framer Motion: Accessibility](https://www.framer.com/motion/guide-accessibility/)
- [Web.dev: prefers-reduced-motion](https://web.dev/prefers-reduced-motion/)

## Support

If you encounter issues with reduced motion support:

1. Check the browser console for errors
2. Verify the media query is detected: `window.matchMedia('(prefers-reduced-motion: reduce)').matches`
3. Check that CSS is loaded: Look for `reduced-motion.css` in DevTools
4. Review component implementation against this guide
5. Run the test suite to identify issues

## Conclusion

Reduced motion support is a critical accessibility feature that ensures all users can comfortably use the Advertise With Us landing page. By following this guide and using the provided hooks and utilities, you can create animations that are both beautiful and accessible.
