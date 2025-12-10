# Task 6: Features Grid Section - Visual Guide

## Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                  FeaturesGridSection                         │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Powerful Features for Your Success          │    │
│  │   Everything you need to advertise effectively...   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ FeatureTile  │  │ FeatureTile  │  │ FeatureTile  │    │
│  │              │  │              │  │              │    │
│  │  📢 Icon     │  │  🎥 Icon     │  │  📈 Icon     │    │
│  │              │  │              │  │              │    │
│  │  Listing     │  │  Explore     │  │  Boost       │    │
│  │  Promotion   │  │  Feed Ads    │  │  Campaigns   │    │
│  │              │  │              │  │              │    │
│  │  Description │  │  Description │  │  Description │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ FeatureTile  │  │ FeatureTile  │  │ FeatureTile  │    │
│  │              │  │              │  │              │    │
│  │  👥 Icon     │  │  👤➕ Icon    │  │  🖼️ Icon     │    │
│  │              │  │              │  │              │    │
│  │  Lead        │  │  Team        │  │  Media       │    │
│  │  Engine      │  │  Collab      │  │  Templates   │    │
│  │              │  │              │  │              │    │
│  │  Description │  │  Description │  │  Description │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Responsive Layouts

### Desktop (≥1024px) - 3 Columns
```
┌─────────────────────────────────────────────────────┐
│  [Tile 1]      [Tile 2]      [Tile 3]              │
│  [Tile 4]      [Tile 5]      [Tile 6]              │
└─────────────────────────────────────────────────────┘
```

### Tablet (768px-1023px) - 2 Columns
```
┌───────────────────────────────────┐
│  [Tile 1]      [Tile 2]          │
│  [Tile 3]      [Tile 4]          │
│  [Tile 5]      [Tile 6]          │
└───────────────────────────────────┘
```

### Mobile (<768px) - 1 Column
```
┌─────────────────┐
│   [Tile 1]      │
│   [Tile 2]      │
│   [Tile 3]      │
│   [Tile 4]      │
│   [Tile 5]      │
│   [Tile 6]      │
└─────────────────┘
```

## FeatureTile Component Anatomy

```
┌────────────────────────────────────────┐
│  FeatureTile                           │
│                                        │
│  ┌──────────┐                         │
│  │          │  ← Icon Container       │
│  │   📢     │     (56×56px)           │
│  │          │     Rounded corners     │
│  └──────────┘     Light background    │
│                                        │
│  Title Text                            │
│  ├─ Font: xl (20px)                   │
│  ├─ Weight: semibold (600)            │
│  └─ Color: gray900                    │
│                                        │
│  Description text that explains       │
│  the feature in detail...             │
│  ├─ Font: base (16px)                 │
│  ├─ Weight: normal (400)              │
│  ├─ Color: gray600                    │
│  └─ Line height: relaxed (1.625)     │
│                                        │
└────────────────────────────────────────┘
```

## Hover States

### Rest State
```
┌────────────────────────────────────────┐
│  FeatureTile                           │
│  Position: y = 0                       │
│  Shadow: soft (subtle)                 │
│  Icon Color: primary.base (#667eea)   │
└────────────────────────────────────────┘
```

### Hover State
```
┌────────────────────────────────────────┐
│  FeatureTile                           │
│  Position: y = -4px ↑                  │
│  Shadow: softHover (expanded)          │
│  Icon Color: primary.dark (#5a67d8)   │
└────────────────────────────────────────┘
```

## Animation Timeline

### Scroll-Triggered Stagger Animation
```
Time:  0ms    100ms   200ms   300ms   400ms   500ms
       │      │       │       │       │       │
Tile1: [fade-up]
       │      │
Tile2: │      [fade-up]
       │      │       │
Tile3: │      │       [fade-up]
       │      │       │       │
Tile4: │      │       │       [fade-up]
       │      │       │       │       │
Tile5: │      │       │       │       [fade-up]
       │      │       │       │       │       │
Tile6: │      │       │       │       │       [fade-up]
```

### Hover Animation
```
Time:  0ms           300ms
       │             │
Rest:  [y:0, shadow:soft]
       │             │
Hover: └─────────────[y:-4, shadow:softHover]
```

## Color Palette

### Icon Container
- **Rest**: `#f0f4ff` (primary.light)
- **Hover**: `#e9ecff` (primary.subtle)

### Icon Color
- **Rest**: `#667eea` (primary.base)
- **Hover**: `#5a67d8` (primary.dark)

### Text Colors
- **Title**: `#111827` (gray900)
- **Description**: `#4b5563` (gray600)

### Card Styling
- **Background**: `#ffffff` (white)
- **Border Radius**: `16px` (softLarge)
- **Shadow (Rest)**: `0 2px 8px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)`
- **Shadow (Hover)**: `0 4px 12px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12)`

## Spacing System

### FeatureTile Internal Spacing
```
┌─────────────────────────────────────┐
│ ← 2rem padding                      │
│                                     │
│  [Icon]                             │
│    ↕ 1.5rem gap                     │
│  [Title]                            │
│    ↕ 0.5rem gap                     │
│  [Description]                      │
│                                     │
│                      2rem padding → │
└─────────────────────────────────────┘
```

### Grid Spacing
- **Desktop/Tablet**: 2rem (32px) gap
- **Mobile**: 1.5rem (24px) gap

## Feature Icons

| Feature | Icon | Lucide Component |
|---------|------|------------------|
| Listing Promotion | 📢 | `Megaphone` |
| Explore Feed Ads | 🎥 | `Video` |
| Boost Campaigns | 📈 | `TrendingUp` |
| Lead Engine | 👥 | `Users` |
| Team Collaboration | 👤➕ | `UserPlus` |
| Media Templates | 🖼️ | `Image` |

## Accessibility Tree

```
section (role: region)
├─ aria-labelledby: "features-grid-heading"
│
├─ div (container)
│  │
│  ├─ div (header)
│  │  ├─ h2#features-grid-heading
│  │  │  └─ "Powerful Features for Your Success"
│  │  └─ p
│  │     └─ "Everything you need to advertise..."
│  │
│  └─ div (grid)
│     ├─ div (motion wrapper)
│     │  └─ FeatureTile
│     │     ├─ div (icon container)
│     │     │  └─ svg (aria-hidden="true")
│     │     ├─ h3
│     │     │  └─ "Listing Promotion"
│     │     └─ p
│     │        └─ "Showcase your properties..."
│     │
│     ├─ div (motion wrapper)
│     │  └─ FeatureTile [...]
│     │
│     └─ ... (4 more tiles)
```

## CSS Grid Implementation

```css
/* Base grid */
display: grid;
gap: 2rem;
grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));

/* Desktop (≥1024px) */
@media (min-width: 1024px) {
  grid-template-columns: repeat(3, 1fr);
}

/* Tablet (768px-1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
  grid-template-columns: repeat(2, 1fr);
}

/* Mobile (<768px) */
@media (max-width: 767px) {
  grid-template-columns: 1fr;
  gap: 1.5rem;
}
```

## Testing Viewport Sizes

### Desktop Testing
- **1920×1080**: Full 3-column layout
- **1440×900**: Standard 3-column layout
- **1280×720**: Compact 3-column layout

### Tablet Testing
- **1024×768**: Breakpoint transition
- **768×1024**: Portrait 2-column layout
- **834×1194**: iPad Pro portrait

### Mobile Testing
- **375×667**: iPhone SE
- **390×844**: iPhone 12/13
- **414×896**: iPhone 11 Pro Max

## Performance Metrics

### Animation Performance
- **Target FPS**: 60fps
- **Animation Duration**: 300ms
- **Stagger Delay**: 100ms per tile
- **Total Animation Time**: 800ms (6 tiles)

### Load Performance
- **Component Size**: ~5KB (minified)
- **Dependencies**: Framer Motion, Lucide React
- **Render Time**: <50ms
- **First Paint**: <100ms

## Browser Compatibility

### Supported Browsers
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile Safari (iOS 14+)
- ✅ Chrome Mobile (Android 10+)

### CSS Features Used
- ✅ CSS Grid (full support)
- ✅ Flexbox (full support)
- ✅ CSS Custom Properties (full support)
- ✅ Media Queries (full support)
- ✅ Transform (full support)
- ✅ Box Shadow (full support)

## Quick Reference

### Component Props
```typescript
interface FeaturesGridSectionProps {
  title?: string;
  subtitle?: string;
  className?: string;
}
```

### FeatureTile Props
```typescript
interface FeatureTileProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}
```

### Design Tokens
```typescript
borderRadius: '16px'
shadows: {
  soft: '0 2px 8px rgba(0,0,0,0.04)...',
  softHover: '0 4px 12px rgba(0,0,0,0.08)...'
}
spacing: {
  lg: '1.5rem',
  xl: '2rem'
}
```
