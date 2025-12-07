# Soft UI Component Library

Modern, hybrid design system for the Explore feature with subtle shadows, smooth animations, and clean aesthetics.

## 🎨 Design Philosophy

- **Hybrid Modern + Soft**: Combines clean, modern layouts with soft shadows and gentle gradients
- **Subtle, Not Heavy**: Avoids heavy neumorphism in favor of lightweight elevation
- **High Readability**: Maintains crisp contrast and clear typography
- **Smooth Interactions**: All animations use smooth easing curves and respect `prefers-reduced-motion`

## 📦 Components

### ModernCard
Versatile card component with multiple variants:
- `default`: Clean white background with subtle shadow
- `glass`: Semi-transparent with blur effect (perfect for overlays)
- `elevated`: Higher elevation with larger shadow

**Props:**
- `variant`: 'default' | 'glass' | 'elevated'
- `hoverable`: boolean (enables hover animations)
- `onClick`: () => void (makes card interactive)

### IconButton
Icon button with smooth animations and multiple variants:
- `default`: White background with subtle shadow
- `glass`: Semi-transparent for use on images/videos
- `accent`: Gradient background for primary actions

**Props:**
- `icon`: LucideIcon
- `onClick`: () => void
- `label`: string (for accessibility)
- `size`: 'sm' | 'md' | 'lg'
- `variant`: 'default' | 'glass' | 'accent'
- `disabled`: boolean

### MicroPill
Category chips with selection states:
- Smooth selection animations
- Optional icon support
- Multiple sizes

**Props:**
- `label`: string
- `selected`: boolean
- `onClick`: () => void
- `icon`: LucideIcon (optional)
- `size`: 'sm' | 'md' | 'lg'
- `variant`: 'default' | 'accent'
- `disabled`: boolean

### AvatarBubble
User avatars with status indicators:
- Image loading with fallback
- Initials generation
- Status indicators (online, offline, busy)
- Multiple sizes

**Props:**
- `src`: string (optional)
- `alt`: string (optional)
- `name`: string (optional, for initials)
- `size`: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
- `status`: 'online' | 'offline' | 'busy' | null
- `onClick`: () => void (optional)

### ModernSkeleton
Loading skeleton with pulse animation:
- Multiple variants (text, card, avatar, video)
- Respects `prefers-reduced-motion`
- Pre-built card skeletons (PropertyCard, VideoCard, NeighbourhoodCard, InsightCard)

**Props:**
- `variant`: 'text' | 'card' | 'avatar' | 'video' | 'custom'
- `width`: string | number
- `height`: string | number
- `count`: number (for multiple skeletons)

## 🎭 Interactive Demo

Visit the component demo page to see all components in action:

**Route:** `/explore/component-demo`

The demo page includes:
- All component variants
- Interactive state controls
- Different sizes and configurations
- Animation examples
- Usage code snippets
- Design token reference

## 🚀 Usage

```tsx
import { ModernCard } from '@/components/ui/soft/ModernCard';
import { IconButton } from '@/components/ui/soft/IconButton';
import { MicroPill } from '@/components/ui/soft/MicroPill';
import { AvatarBubble } from '@/components/ui/soft/AvatarBubble';
import { ModernSkeleton } from '@/components/ui/soft/ModernSkeleton';
import { Heart } from 'lucide-react';

// Example: Property Card
<ModernCard variant="default" hoverable>
  <img src="property.jpg" alt="Property" />
  <h3>Luxury Villa</h3>
  <div className="flex gap-2">
    <MicroPill label="5 Beds" size="sm" />
    <MicroPill label="4 Baths" size="sm" />
  </div>
  <IconButton 
    icon={Heart} 
    onClick={handleLike} 
    label="Save property" 
  />
</ModernCard>
```

## 🎨 Design Tokens

Import design tokens for consistent styling:

```tsx
import { designTokens } from '@/lib/design-tokens';

const shadow = designTokens.shadows.md;
const radius = designTokens.borderRadius.lg;
const spacing = designTokens.spacing.md;
```

## 🎬 Animations

Import animation variants for Framer Motion:

```tsx
import { cardVariants, buttonVariants } from '@/lib/animations/exploreAnimations';
import { motion } from 'framer-motion';

<motion.div 
  variants={cardVariants} 
  initial="initial" 
  animate="animate"
  whileHover="hover"
>
  Content
</motion.div>
```

## 🛠️ Tailwind Utilities

Custom utility classes available:

- `.modern-card` - Default card with shadow and hover effect
- `.glass-overlay` - Glass effect with blur (light background)
- `.glass-overlay-dark` - Glass effect with blur (dark background)
- `.modern-btn` - Modern button style
- `.accent-btn` - Accent gradient button

## ♿ Accessibility

All components follow WCAG AA standards:
- Proper ARIA labels
- Keyboard navigation support
- Focus indicators
- Color contrast compliance
- Screen reader friendly

## 📱 Responsive

All components are fully responsive and work across:
- Desktop (1920x1080, 1366x768)
- Tablet (iPad)
- Mobile (iOS Safari, Chrome Mobile)

## 🎯 Best Practices

1. **Use ModernCard** for all card-based layouts
2. **Apply hoverable** only when cards are interactive
3. **Use glass variant** for overlays on images/videos
4. **Always provide aria-label** for IconButtons
5. **Use MicroPill** for filters and category selection
6. **Respect prefers-reduced-motion** in custom animations
7. **Use skeleton loaders** during data fetching

## 📚 Related Files

- Design Tokens: `client/src/lib/design-tokens.ts`
- Animations: `client/src/lib/animations/exploreAnimations.ts`
- Tailwind Config: `client/tailwind.config.js`
- Demo Page: `client/src/pages/ExploreComponentDemo.tsx`

## 🔗 Requirements

This component library satisfies:
- **Requirement 1.1**: Consistent design tokens
- **Requirement 1.2**: Unified Soft UI styling
- **Requirement 1.3**: Visual continuity
- **Requirement 8.1-8.3**: Standardized components
- **Requirement 9.1-9.3**: Micro-interactions and animations

---

**Version:** 1.0  
**Last Updated:** Phase 1 - Design System Foundation  
**Status:** ✅ Complete
