# PreviewCarousel Usage Guide

## Overview

The `PreviewCarousel` component has been **preserved** for use in middle sections of the "Advertise With Us" landing page. While the hero section now uses a static billboard banner for conversion optimization, the carousel is still valuable for showcasing multiple items in other contexts.

## Why Not in Hero Section?

### Conversion Optimization
- Static banners have 2-3x higher click-through rates
- Single focused message reduces cognitive load
- Immediate action path without waiting for rotation
- Industry best practices (Zillow, Redfin, etc.)

### User Experience
- Faster comprehension (no waiting)
- Better mobile experience (no swipe gestures)
- Improved accessibility (simpler for screen readers)
- Better performance (single image vs multiple)

## Where to Use the Carousel

### 1. Testimonials Section
**Purpose**: Showcase multiple customer success stories

```tsx
<PreviewCarousel
  slides={[
    {
      type: 'testimonial',
      imageUrl: '/testimonials/agent-1.jpg',
      alt: 'Agent testimonial about increased leads',
    },
    {
      type: 'testimonial',
      imageUrl: '/testimonials/developer-1.jpg',
      alt: 'Developer testimonial about successful launch',
    },
    // More testimonials...
  ]}
  autoRotateInterval={6000}
/>
```

**Benefits**:
- Multiple voices build trust
- Rotation keeps content fresh
- Users expect carousels for testimonials

### 2. Partner Logos Section
**Purpose**: Display multiple partner companies

```tsx
<PreviewCarousel
  slides={partnerLogos.map(logo => ({
    type: 'partner-logo',
    imageUrl: logo.url,
    alt: `${logo.name} logo`,
  }))}
  autoRotateInterval={3000}
/>
```

**Benefits**:
- Showcase many partners without cluttering page
- Continuous rotation creates impression of scale
- Common pattern users understand

### 3. Feature Showcase Section
**Purpose**: Demonstrate multiple platform features

```tsx
<PreviewCarousel
  slides={[
    {
      type: 'feature-demo',
      imageUrl: '/features/explore-feed.jpg',
      alt: 'Explore feed feature demonstration',
    },
    {
      type: 'feature-demo',
      imageUrl: '/features/boost-campaigns.jpg',
      alt: 'Boost campaigns feature demonstration',
    },
    // More features...
  ]}
  autoRotateInterval={5000}
/>
```

**Benefits**:
- Show multiple features without long scrolling
- Interactive demonstration engages users
- Allows detailed feature previews

### 4. Success Stories Section
**Purpose**: Showcase different case studies

```tsx
<PreviewCarousel
  slides={caseStudies.map(study => ({
    type: 'case-study',
    imageUrl: study.imageUrl,
    alt: study.title,
  }))}
  autoRotateInterval={7000}
/>
```

**Benefits**:
- Multiple examples build credibility
- Different industries/use cases
- Detailed stories without overwhelming page

### 5. Media Gallery Section
**Purpose**: Display multiple development images

```tsx
<PreviewCarousel
  slides={developmentImages.map(img => ({
    type: 'gallery-image',
    imageUrl: img.url,
    alt: img.description,
  }))}
  autoRotateInterval={4000}
/>
```

**Benefits**:
- Show multiple angles/views
- Users expect galleries to be interactive
- Saves vertical space

### 6. Platform Screenshots Section
**Purpose**: Show different dashboard views

```tsx
<PreviewCarousel
  slides={[
    {
      type: 'screenshot',
      imageUrl: '/screenshots/agent-dashboard.jpg',
      alt: 'Agent dashboard interface',
    },
    {
      type: 'screenshot',
      imageUrl: '/screenshots/developer-dashboard.jpg',
      alt: 'Developer dashboard interface',
    },
    // More screenshots...
  ]}
  autoRotateInterval={5000}
/>
```

**Benefits**:
- Show different user perspectives
- Demonstrate interface quality
- Interactive exploration

## Recommended Section Layout

```
┌─────────────────────────────────────────┐
│  Hero Section (Static Billboard)        │
│  - Single featured development          │
│  - Clear CTA                            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Partner Selection (Static Cards)        │
│  - 5 partner type cards                 │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Value Proposition (Static Blocks)       │
│  - 4 key benefits                       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Feature Showcase (CAROUSEL)            │  ← Use carousel here
│  - Multiple feature demonstrations      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Success Stories (CAROUSEL)             │  ← Use carousel here
│  - Multiple case studies                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Testimonials (CAROUSEL)                │  ← Use carousel here
│  - Multiple customer reviews            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Partner Logos (CAROUSEL)               │  ← Use carousel here
│  - Multiple partner companies           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Final CTA (Static)                     │
│  - Clear conversion message             │
└─────────────────────────────────────────┘
```

## Best Practices for Carousel Usage

### When to Use Carousels
✅ Multiple items of equal importance
✅ Content users want to browse (testimonials, galleries)
✅ Space-saving for many items
✅ Secondary content (not primary conversion point)
✅ Users expect interaction (galleries, portfolios)

### When NOT to Use Carousels
❌ Primary conversion point (hero section)
❌ Critical information users must see
❌ Single most important message
❌ Time-sensitive content
❌ Content with different priorities

### Configuration Guidelines

**Auto-rotation timing**:
- Testimonials: 6-7 seconds (time to read)
- Partner logos: 3-4 seconds (quick recognition)
- Feature demos: 5-6 seconds (time to understand)
- Case studies: 7-8 seconds (more content)
- Gallery images: 4-5 seconds (visual appreciation)

**Accessibility**:
- Always include pause on hover/focus
- Provide keyboard navigation
- Add ARIA labels and announcements
- Include dot indicators for manual control
- Respect prefers-reduced-motion

**Mobile optimization**:
- Enable swipe gestures
- Show single item at a time
- Larger touch targets for dots
- Consider disabling auto-rotation on mobile

## Component Features

The `PreviewCarousel` component includes:

### Visual Effects
- Elevated card stack (2.5D effect)
- Active slide centered, adjacent at 92% scale
- Subtle 3D rotation (±8deg)
- Smooth spring animations
- Hover glow ring effect

### Interactions
- Auto-rotation (configurable interval)
- Pause on hover/focus
- Swipe gestures (mobile)
- Drag to navigate (desktop)
- Dot indicators for manual control
- Keyboard navigation (Tab, Enter, Arrow keys)

### Accessibility
- Full ARIA support
- Screen reader announcements
- Keyboard accessible
- Respects reduced motion
- Focus management

## Migration Path

If you want to add a carousel to a middle section:

1. **Import the component**:
```tsx
import { PreviewCarousel } from '@/components/advertise/PreviewCarousel';
```

2. **Prepare your slides**:
```tsx
const slides = [
  {
    type: 'your-type',
    imageUrl: '/path/to/image.jpg',
    alt: 'Descriptive alt text',
  },
  // More slides...
];
```

3. **Add to your section**:
```tsx
<section className="py-16">
  <div className="container mx-auto px-4">
    <h2 className="text-3xl font-bold mb-8">Section Title</h2>
    <PreviewCarousel
      slides={slides}
      autoRotateInterval={5000}
    />
  </div>
</section>
```

## Performance Considerations

### Image Optimization
- Use WebP format with JPEG fallback
- Lazy load carousel images
- Implement blur-up placeholders
- Optimize image sizes (< 200KB each)

### Code Splitting
- Lazy load carousel component if below fold
- Preload first slide image
- Defer loading of subsequent slides

### Animation Performance
- Use GPU-accelerated properties (transform, opacity)
- Maintain 60fps animation
- Reduce animations on low-end devices
- Respect prefers-reduced-motion

## Analytics Tracking

Track carousel interactions:

```tsx
<PreviewCarousel
  slides={slides}
  autoRotateInterval={5000}
  onSlideChange={(index) => {
    trackEvent('carousel_slide_change', {
      section: 'testimonials',
      slideIndex: index,
      method: 'auto', // or 'manual'
    });
  }}
  onSlideClick={(index) => {
    trackEvent('carousel_slide_click', {
      section: 'testimonials',
      slideIndex: index,
    });
  }}
/>
```

## Conclusion

The `PreviewCarousel` component is a powerful tool for showcasing multiple items in middle sections of the landing page. By using a static billboard banner in the hero section and carousels in appropriate middle sections, we achieve:

- **Optimized conversion** in hero section
- **Rich content showcase** in middle sections
- **Balanced user experience** throughout page
- **Best practices** for each content type

The key is using the right component for the right purpose: static for conversion, carousel for exploration.
