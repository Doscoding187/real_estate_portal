# MobileStickyCTA Component

## Overview

The `MobileStickyCTA` component is a mobile-only sticky call-to-action button that appears at the bottom of the screen after the user scrolls past the hero section. It provides a persistent conversion opportunity throughout the user's journey on the landing page.

## Requirements

- **8.3**: Display a sticky CTA button on mobile that remains visible during scroll

## Features

- **Mobile-Only**: Hidden on tablet and desktop (md:hidden)
- **Scroll-Triggered**: Appears after scrolling past hero section
- **Slide-Up Animation**: Smooth spring animation when appearing/disappearing
- **Dismissible**: Users can close the sticky CTA with an X button
- **Safe Area Support**: Respects iOS safe area insets for notched devices
- **Analytics Tracking**: Tracks clicks and dismissals
- **Accessibility**: Proper ARIA labels and keyboard support

## Usage

### Basic Usage

```tsx
import { MobileStickyCTA, useMobileStickyCTA } from '@/components/advertise/MobileStickyCTA';

function AdvertisePage() {
  const isVisible = useMobileStickyCTA('hero-section');

  return (
    <>
      <section id="hero-section">
        {/* Hero content */}
      </section>
      
      {/* Other sections */}
      
      <MobileStickyCTA
        label="Start Advertising"
        href="/register"
        isVisible={isVisible}
      />
    </>
  );
}
```

### With Custom Handlers

```tsx
import { MobileStickyCTA, useMobileStickyCTA } from '@/components/advertise/MobileStickyCTA';

function AdvertisePage() {
  const isVisible = useMobileStickyCTA('hero-section');
  const [isDismissed, setIsDismissed] = useState(false);

  const handleClick = () => {
    console.log('CTA clicked');
    // Custom navigation logic
  };

  const handleDismiss = () => {
    console.log('CTA dismissed');
    setIsDismissed(true);
  };

  return (
    <MobileStickyCTA
      label="Get Started"
      href="/register"
      isVisible={isVisible && !isDismissed}
      onClick={handleClick}
      onDismiss={handleDismiss}
    />
  );
}
```

## Props

### MobileStickyCTAProps

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `label` | `string` | Yes | Button text (keep short for mobile) |
| `href` | `string` | Yes | Destination URL |
| `isVisible` | `boolean` | Yes | Controls visibility (use hook) |
| `onDismiss` | `() => void` | No | Called when user dismisses CTA |
| `onClick` | `() => void` | No | Called when CTA is clicked |
| `className` | `string` | No | Additional CSS classes |

## Hook: useMobileStickyCTA

The `useMobileStickyCTA` hook manages the visibility logic based on scroll position.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `heroSectionId` | `string` | `'hero-section'` | ID of hero section element |

### Returns

| Return | Type | Description |
|--------|------|-------------|
| `isVisible` | `boolean` | Whether sticky CTA should be visible |

### Logic

The hook shows the sticky CTA when:
- The hero section's bottom edge is above 20% of the viewport height
- This ensures the CTA appears after the user has scrolled past the initial hero content

## Design Tokens

- **Background**: White with subtle shadow
- **Button**: Primary gradient with soft shadow
- **Dismiss Button**: Light gray background
- **Border**: Top border for visual separation
- **Z-Index**: `softUITokens.zIndex.sticky` (1020)
- **Safe Area**: Respects iOS safe area insets

## Animations

### Slide-Up Animation
```typescript
initial={{ y: 100, opacity: 0 }}
animate={{ y: 0, opacity: 1 }}
exit={{ y: 100, opacity: 0 }}
transition={{
  type: 'spring',
  stiffness: 300,
  damping: 30,
}
```

- **Type**: Spring animation for natural feel
- **Direction**: Slides up from bottom
- **Opacity**: Fades in/out simultaneously
- **Exit**: Smooth slide-down when dismissed

## Accessibility

- **ARIA Labels**: Both CTA and dismiss button have descriptive labels
- **Keyboard Support**: Fully keyboard accessible
- **Focus Management**: Proper focus indicators
- **Screen Readers**: Announces button purpose and state

## Analytics Tracking

### CTA Click Event
```typescript
{
  event: 'cta_click',
  label: string,
  location: 'mobile_sticky',
  href: string,
  timestamp: ISO string
}
```

### Dismiss Event
```typescript
{
  event: 'sticky_cta_dismiss',
  timestamp: ISO string
}
```

## Responsive Behavior

### Mobile (< 768px)
- **Visible**: Shows when scroll condition is met
- **Position**: Fixed at bottom of screen
- **Width**: Full width with padding
- **Safe Area**: Respects iOS notch and home indicator

### Tablet/Desktop (≥ 768px)
- **Hidden**: Component is completely hidden (md:hidden)
- **Reason**: Desktop has persistent navigation and multiple CTAs

## Best Practices

1. **Label Length**: Keep button text short (2-3 words max)
2. **Hero Section ID**: Ensure hero section has correct ID attribute
3. **Dismissal**: Allow users to dismiss for better UX
4. **Analytics**: Track both clicks and dismissals
5. **Safe Area**: Always include safe area insets for iOS

## Example Implementation

```tsx
// In your landing page component
import { MobileStickyCTA, useMobileStickyCTA } from '@/components/advertise/MobileStickyCTA';

export default function AdvertiseLandingPage() {
  const isStickyCTAVisible = useMobileStickyCTA('hero-section');

  return (
    <div>
      {/* Hero Section */}
      <section id="hero-section">
        <h1>Advertise With Us</h1>
        {/* Hero content */}
      </section>

      {/* Other sections */}
      <section>{/* Partner selection */}</section>
      <section>{/* Value proposition */}</section>
      <section>{/* Features */}</section>

      {/* Mobile Sticky CTA */}
      <MobileStickyCTA
        label="Get Started"
        href="/register"
        isVisible={isStickyCTAVisible}
      />
    </div>
  );
}
```

## Testing

The component should be tested for:
- Visibility toggle based on scroll position
- Slide-up/down animations
- Dismiss functionality
- Click tracking
- Safe area insets on iOS devices
- Keyboard accessibility
- Screen reader compatibility

## Related Components

- `CTAButton` - Standard CTA button component
- `FinalCTASection` - Desktop final CTA section
- `HeroSection` - Initial CTA placement

## Browser Support

- Modern browsers with CSS `env()` support for safe areas
- Fallback padding for browsers without safe area support
- Tested on iOS Safari, Chrome Mobile, Firefox Mobile

