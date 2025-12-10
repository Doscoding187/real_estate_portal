# Reduced Motion Quick Reference

## Quick Start

```tsx
import { useReducedMotion } from '@/hooks/useReducedMotion.advertise';
import { motion } from 'framer-motion';

function MyComponent() {
  const prefersReducedMotion = useReducedMotion();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0.01 : 0.4 }}
    >
      Content
    </motion.div>
  );
}
```

## Hooks

### `useReducedMotion()`
Returns `true` if user prefers reduced motion.

```tsx
const prefersReducedMotion = useReducedMotion();
```

### `useAnimationDuration(normalDuration, reducedDuration?)`
Returns appropriate duration based on preference.

```tsx
const duration = useAnimationDuration(0.4, 0.01); // 0.4s or 0.01s
```

### `useAnimationVariants(normalVariants, reducedVariants)`
Returns appropriate variants based on preference.

```tsx
const variants = useAnimationVariants(
  { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } },
  { initial: { opacity: 0 }, animate: { opacity: 1 } }
);
```

### `useConditionalAnimation(animationProps)`
Returns animation props or minimal animation based on preference.

```tsx
const props = useConditionalAnimation({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
});
```

## Utilities

### `createAccessibleVariants(variants)`
Converts variants to reduced motion-safe versions.

```tsx
import { createAccessibleVariants } from '@/lib/animations/motionUtils';

const safeVariants = createAccessibleVariants(fadeUp);
```

### `applyReducedMotion(props, prefersReducedMotion)`
Applies reduced motion to motion props.

```tsx
import { applyReducedMotion } from '@/lib/animations/motionUtils';

const safeProps = applyReducedMotion(motionProps, prefersReducedMotion);
```

### `shouldDisableAnimations()`
Checks if animations should be disabled (reduced motion OR low-end device).

```tsx
import { shouldDisableAnimations } from '@/lib/animations/motionUtils';

if (shouldDisableAnimations()) {
  // Skip animations
}
```

## CSS Classes

### `.no-motion`
Explicitly disables all animations.

```tsx
<div className={prefersReducedMotion ? 'no-motion' : ''}>
  Content
</div>
```

### `.motion-safe`
Allows minimal animations even with reduced motion (use sparingly).

```tsx
<div className="motion-safe">
  <LoadingSpinner />
</div>
```

## Testing

### Enable Reduced Motion in Browser

**Chrome/Edge:**
1. Open DevTools (F12)
2. Press `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
3. Type "Emulate CSS prefers-reduced-motion"
4. Select "reduce"

**Firefox:**
1. Type `about:config` in address bar
2. Search for `ui.prefersReducedMotion`
3. Set to `1`

### Run Tests

```bash
npm test -- ReducedMotion.test.tsx --run
```

## Common Patterns

### Scroll-Triggered Animation

```tsx
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

function MyComponent() {
  const { ref, isVisible } = useScrollAnimation();
  // Automatically respects reduced motion
  
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

### Hover Animation

```tsx
import { softLift } from '@/lib/animations/advertiseAnimations';

function MyCard() {
  return (
    <motion.div
      variants={softLift}
      initial="rest"
      whileHover="hover"
      // Automatically respects reduced motion via CSS
    >
      Card Content
    </motion.div>
  );
}
```

### Stagger Animation

```tsx
import { staggerContainer, staggerItem } from '@/lib/animations/advertiseAnimations';

function MyList() {
  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      {items.map(item => (
        <motion.div key={item.id} variants={staggerItem}>
          {item.content}
        </motion.div>
      ))}
    </motion.div>
  );
}
```

## What Gets Disabled?

✅ **Disabled with Reduced Motion:**
- Transform animations (translate, scale, rotate)
- Parallax effects
- Hover lift effects
- Stagger delays
- Pulse/bounce/spin animations

✅ **Preserved (Minimal):**
- Opacity transitions (instant)
- Focus indicators (instant)
- Essential UI feedback

## Checklist

When adding animations:

- [ ] Use `useReducedMotion()` hook or motion utilities
- [ ] Test with reduced motion enabled
- [ ] Ensure functionality works without animations
- [ ] Provide alternative feedback (color, text, icons)
- [ ] Verify CSS respects media query

## Resources

- [Full Guide](./REDUCED_MOTION_GUIDE.md)
- [Demo Page](../../pages/ReducedMotionDemo.tsx)
- [Tests](../__tests__/ReducedMotion.test.tsx)
