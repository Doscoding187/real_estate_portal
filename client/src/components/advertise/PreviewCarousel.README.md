# PreviewCarousel Component

## Overview

The `PreviewCarousel` component is an auto-rotating image carousel designed for the Hero Section of the "Advertise With Us" landing page. It showcases platform features through smooth fade transitions and provides an engaging visual preview for potential advertising partners.

## Features

- **Auto-Rotation**: Automatically cycles through slides every 5 seconds (configurable)
- **Smooth Transitions**: Fade-in/fade-out animations using Framer Motion
- **Pause on Hover**: User can pause auto-rotation by hovering over the carousel
- **Manual Navigation**: Click indicators to jump to specific slides
- **Accessibility**: Full ARIA support with labels and live regions
- **Responsive**: Maintains 4:3 aspect ratio across all screen sizes
- **Performance**: Lazy loading for images, GPU-accelerated animations

## Usage

### Basic Example

```tsx
import { PreviewCarousel, PreviewSlide } from '@/components/advertise/PreviewCarousel';

const slides: PreviewSlide[] = [
  {
    type: 'explore-feed',
    imageUrl: '/images/explore-feed-preview.jpg',
    alt: 'Explore Feed - Discover properties through video content',
  },
  {
    type: 'property-card',
    imageUrl: '/images/property-card-preview.jpg',
    alt: 'Property Cards - Showcase your listings',
  },
  {
    type: 'developer-showcase',
    imageUrl: '/images/developer-showcase-preview.jpg',
    alt: 'Developer Showcase - Promote your developments',
  },
];

function MyComponent() {
  return <PreviewCarousel slides={slides} />;
}
```

### Custom Auto-Rotate Interval

```tsx
<PreviewCarousel 
  slides={slides} 
  autoRotateInterval={3000} // 3 seconds
/>
```

## Props

### `PreviewCarouselProps`

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `slides` | `PreviewSlide[]` | Yes | - | Array of slide objects to display |
| `autoRotateInterval` | `number` | No | `5000` | Time in milliseconds between slide transitions |

### `PreviewSlide`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `'explore-feed' \| 'property-card' \| 'developer-showcase'` | Yes | Semantic type of the slide content |
| `imageUrl` | `string` | Yes | URL of the image to display |
| `alt` | `string` | Yes | Alternative text for accessibility |

## Behavior

### Auto-Rotation

- Carousel automatically advances to the next slide after the specified interval
- Auto-rotation stops when user hovers over the carousel
- Auto-rotation resumes when user moves mouse away
- Auto-rotation is disabled if there's only one slide

### Manual Navigation

- Click any indicator dot to jump to that slide
- Active slide indicator is highlighted and elongated
- Clicking an indicator resets the auto-rotation timer

### Accessibility

- `role="region"` with `aria-label` for screen readers
- `aria-live="polite"` announces slide changes
- Each indicator has descriptive `aria-label`
- Active indicator marked with `aria-current="true"`
- Images have proper `alt` text

### Performance

- Images use `loading="lazy"` for deferred loading
- Animations use `opacity` (GPU-accelerated)
- Smooth 500ms fade transitions with cubic-bezier easing
- Minimal re-renders with React hooks optimization

## Styling

The component uses:
- **Soft-UI Design Tokens**: Shadows, border radius from design system
- **Aspect Ratio**: Fixed 4:3 ratio for consistent sizing
- **Gradient Overlay**: Subtle gradient for better indicator visibility
- **Responsive Indicators**: Dots expand when active

### Customization

To customize styling, modify the component or wrap it in a container:

```tsx
<div className="max-w-2xl mx-auto">
  <PreviewCarousel slides={slides} />
</div>
```

## Animation Details

### Fade Transition

```typescript
{
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: {
    duration: 0.5,
    ease: [0.4, 0, 0.2, 1], // cubic-bezier
  }
}
```

### Indicator Animation

```typescript
{
  width: isActive ? '32px' : '8px',
  transition: 'all 300ms',
}
```

## Requirements Validation

This component validates the following requirements:

- **Requirement 1.3**: Animated preview carousel in hero section
- **Requirement 11.1**: Scroll-triggered and timed animations
- **Requirement 11.2**: Smooth transitions with proper easing
- **Requirement 11.5**: Animation duration within 300-500ms range

## Testing

### Unit Tests

Test the following behaviors:
- Renders all slides correctly
- Auto-rotates after specified interval
- Pauses on hover
- Resumes on mouse leave
- Manual navigation works
- Handles empty slides array
- Handles single slide (no auto-rotation)

### Property-Based Tests

- **Property**: For any valid slides array, carousel should cycle through all slides
- **Property**: For any hover event, auto-rotation should pause
- **Property**: For any indicator click, carousel should navigate to that slide

### Accessibility Tests

- Screen reader announces slide changes
- Keyboard navigation works (Tab to indicators, Enter to activate)
- ARIA attributes are correct
- Alt text is present for all images

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

## Performance Considerations

- Use optimized images (WebP with JPEG fallback)
- Recommended image size: 800x600px
- Keep slides array under 10 items for optimal performance
- Consider preloading next slide for smoother transitions

## Related Components

- `HeroSection`: Parent component that uses PreviewCarousel
- `CTAButton`: Companion component in hero section
- `TrustBar`: Sibling component in hero section

## Future Enhancements

- [ ] Swipe gestures for mobile
- [ ] Keyboard arrow key navigation
- [ ] Preload next slide for instant transitions
- [ ] Video slide support
- [ ] Thumbnail navigation
- [ ] Progress bar indicator
