# ExploreHome Page - Developer Guide

## Overview

The ExploreHome page is the main entry point for the Explore feature. It provides a personalized home view with multiple content sections, as well as cards and videos views. The page has been refactored to use modern design patterns, centralized state management, and smooth animations.

## Architecture

### State Management

The page uses a **centralized state management** approach:

```typescript
// Single hook for all common state
const {
  viewMode,           // 'home' | 'cards' | 'videos'
  setViewMode,
  selectedCategoryId, // number | null
  setSelectedCategoryId,
  showFilters,        // boolean
  setShowFilters,
  filters,            // Property filters object
} = useExploreCommonState({ initialViewMode: 'home' });

// Zustand store for filter count
const getFilterCount = useExploreFiltersStore((state) => state.getFilterCount);
```

**Benefits:**
- Reduced code duplication
- Consistent state across all Explore pages
- Easier to maintain and extend

### Design System

All styling uses **design tokens** from `@/lib/design-tokens`:

```typescript
import { designTokens } from '@/lib/design-tokens';

// Colors
designTokens.colors.bg.primary
designTokens.colors.accent.gradient
designTokens.colors.text.primary

// Spacing
designTokens.spacing.md
designTokens.spacing.xl

// Shadows
designTokens.shadows.sm
designTokens.shadows.accent

// Typography
designTokens.typography.fontWeight.bold
```

**Benefits:**
- Consistent design language
- Easy to update globally
- Professional appearance

### Animations

All animations use **Framer Motion** with predefined variants:

```typescript
import { 
  pageVariants,
  staggerContainerVariants,
  staggerItemVariants,
  buttonVariants,
  getVariants 
} from '@/lib/animations/exploreAnimations';

// Page-level animation
<motion.div variants={getVariants(pageVariants)}>

// Staggered content
<motion.div variants={staggerContainerVariants}>
  <motion.div variants={staggerItemVariants}>

// Button interactions
<motion.button variants={buttonVariants} whileHover="hover" whileTap="tap">
```

**Benefits:**
- Smooth, professional animations
- Respects user motion preferences
- Consistent across all pages

## Component Structure

```
ExploreHome
├── Header (sticky)
│   ├── Title
│   ├── View Mode Toggle (home, cards, videos)
│   └── Category Selector
├── Content (animated transitions)
│   ├── Home View
│   │   ├── Personalized Content Sections (staggered)
│   │   └── Empty State
│   ├── Cards View
│   │   └── DiscoveryCardFeed
│   └── Videos View
│       └── ExploreVideoFeed
├── Filter Button (floating)
└── ResponsiveFilterPanel
```

## Key Features

### 1. View Mode Switching

Three view modes with smooth transitions:

```typescript
// Home: Personalized content sections
viewMode === 'home'

// Cards: Grid of property cards
viewMode === 'cards'

// Videos: Video feed
viewMode === 'videos'
```

### 2. Category Filtering

Users can filter content by lifestyle category:

```typescript
<LifestyleCategorySelector
  selectedCategoryId={selectedCategoryId ?? undefined}
  onCategoryChange={(id) => setSelectedCategoryId(id ?? null)}
/>
```

### 3. Advanced Filtering

Responsive filter panel that adapts to mobile/desktop:

```typescript
<ResponsiveFilterPanel
  isOpen={showFilters}
  onClose={() => setShowFilters(false)}
  onApply={() => setShowFilters(false)}
/>
```

Filters are managed by Zustand store and persist across navigation.

### 4. Personalized Content

Content sections are fetched based on user preferences:

```typescript
const { sections, isLoading } = usePersonalizedContent({
  categoryId: selectedCategoryId ?? undefined,
  location: userLocation,
});
```

## Animations Breakdown

### Page Entry
```typescript
// Entire page fades in
<motion.div variants={getVariants(pageVariants)}>
```

### Header
```typescript
// Header slides down
initial={{ y: -20, opacity: 0 }}
animate={{ y: 0, opacity: 1 }}

// Title slides from left
initial={{ x: -20, opacity: 0 }}
animate={{ x: 0, opacity: 1 }}

// Toggle slides from right
initial={{ x: 20, opacity: 0 }}
animate={{ x: 0, opacity: 1 }}
```

### Content Sections
```typescript
// Staggered reveal
<motion.div variants={staggerContainerVariants}>
  {sections.map((section) => (
    <motion.div variants={staggerItemVariants}>
```

### Filter Button
```typescript
// Spring animation on mount
initial={{ scale: 0, opacity: 0 }}
animate={{ scale: 1, opacity: 1 }}
transition={{ type: 'spring', stiffness: 300, damping: 20 }}
```

### Filter Badge
```typescript
// Badge pops in/out
<AnimatePresence>
  {count > 0 && (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
    />
  )}
</AnimatePresence>
```

## Type Conversions

The page handles type conversions between `number | null` and `number | undefined`:

```typescript
// Converting null to undefined
categoryId={selectedCategoryId ?? undefined}

// Converting undefined to null
onCategoryChange={(id) => setSelectedCategoryId(id ?? null)}
```

This ensures compatibility with different component APIs.

## Responsive Design

The page is fully responsive:

```typescript
// Responsive spacing
className="px-4 sm:px-6 lg:px-8"

// Hide labels on mobile
<span className="hidden sm:inline">Home</span>

// Responsive filter panel
<ResponsiveFilterPanel /> // Automatically adapts
```

## Accessibility

The page follows accessibility best practices:

- ✅ Proper aria-labels on buttons
- ✅ Keyboard navigation support
- ✅ Focus indicators
- ✅ Respects prefers-reduced-motion
- ✅ Semantic HTML structure

## Performance

The page is optimized for performance:

- ✅ Efficient re-renders
- ✅ Proper use of AnimatePresence
- ✅ Optimized animations
- ✅ No unnecessary state updates

## Usage Example

```typescript
import ExploreHome from '@/pages/ExploreHome';

// In your router
<Route path="/explore" component={ExploreHome} />
```

The page handles all state management internally and integrates with the global Zustand filter store.

## Extending the Page

### Adding a New View Mode

1. Update the view mode type in `useExploreCommonState`:
```typescript
export type ExploreViewMode = 'home' | 'cards' | 'videos' | 'map' | 'newMode';
```

2. Add a button to the toggle:
```typescript
<motion.button
  onClick={() => setViewMode('newMode')}
  variants={buttonVariants}
>
  <Icon className="w-4 h-4" />
  <span>New Mode</span>
</motion.button>
```

3. Add the view to the content area:
```typescript
<AnimatePresence mode="wait">
  {viewMode === 'newMode' ? (
    <motion.div variants={getVariants(pageVariants)}>
      <NewModeComponent />
    </motion.div>
  ) : ...}
</AnimatePresence>
```

### Customizing Animations

All animations can be customized in `@/lib/animations/exploreAnimations.ts`:

```typescript
export const customVariants: Variants = {
  initial: { ... },
  animate: { ... },
  exit: { ... },
};
```

### Updating Design Tokens

All design tokens can be updated in `@/lib/design-tokens.ts`:

```typescript
export const designTokens = {
  colors: {
    accent: {
      primary: '#your-color',
    },
  },
};
```

Changes will automatically apply to all components using the tokens.

## Testing

### Manual Testing Checklist

- [ ] View mode switching works
- [ ] Category selection works
- [ ] Filter button opens panel
- [ ] Filter count displays correctly
- [ ] Animations are smooth
- [ ] Responsive on mobile
- [ ] Accessible with keyboard
- [ ] Works with reduced motion

### Automated Testing

```typescript
// Example test
describe('ExploreHome', () => {
  it('should switch view modes', () => {
    render(<ExploreHome />);
    const cardsButton = screen.getByText('Cards');
    fireEvent.click(cardsButton);
    expect(screen.getByTestId('cards-view')).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Animations not working
- Check if `prefers-reduced-motion` is enabled
- Verify Framer Motion is installed
- Check browser console for errors

### Filter count not updating
- Verify Zustand store is properly configured
- Check localStorage for persisted state
- Ensure ResponsiveFilterPanel is connected

### Type errors
- Verify type conversions (null ↔ undefined)
- Check component prop types
- Ensure all imports are correct

## Related Files

- `client/src/hooks/useExploreCommonState.ts` - Common state hook
- `client/src/store/exploreFiltersStore.ts` - Zustand filter store
- `client/src/lib/design-tokens.ts` - Design system tokens
- `client/src/lib/animations/exploreAnimations.ts` - Animation variants
- `client/src/components/explore-discovery/ResponsiveFilterPanel.tsx` - Filter panel

## Next Steps

This page serves as the template for refactoring the other Explore pages:
- Task 25: ExploreFeed
- Task 26: ExploreShorts
- Task 27: ExploreMap

All pages will follow the same patterns established here.

---

**Questions?** Check the comparison and validation documents for more details.
