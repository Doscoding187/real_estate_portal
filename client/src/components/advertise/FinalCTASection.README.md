# FinalCTASection Component

## Overview

The `FinalCTASection` component is a clean, minimal call-to-action section designed to appear at the end of the "Advertise With Us" landing page. It provides a final conversion opportunity with a compelling headline, descriptive subtext, and both primary and secondary CTA buttons.

## Requirements

- **8.1**: Display a clean, minimal section with compelling headline and subtext
- **8.2**: Present both "Get Started" and "Request a Demo" buttons with distinct visual hierarchy

## Features

- **Clean Design**: Minimal, focused layout that draws attention to the CTAs
- **Compelling Copy**: Large headline and descriptive subtext to reinforce value proposition
- **Dual CTAs**: Primary and secondary buttons for different user intents
- **Smooth Animations**: Fade-up animations on scroll for engaging reveal
- **Responsive Layout**: Adapts gracefully from mobile to desktop
- **Accessibility**: Proper ARIA labels and semantic HTML

## Usage

```tsx
import { FinalCTASection } from '@/components/advertise/FinalCTASection';

function AdvertisePage() {
  return (
    <FinalCTASection
      headline="Ready to Reach High-Intent Property Buyers?"
      subtext="Join thousands of successful partners who are growing their business with our platform. Get started today or schedule a demo to learn more."
      primaryCTA={{
        label: "Get Started",
        href: "/register",
        onClick: () => console.log('Get Started clicked'),
      }}
      secondaryCTA={{
        label: "Request a Demo",
        href: "/contact",
        onClick: () => console.log('Request Demo clicked'),
      }}
    />
  );
}
```

## Props

### FinalCTASectionProps

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `headline` | `string` | Yes | Main headline text (compelling, action-oriented) |
| `subtext` | `string` | Yes | Supporting text that reinforces value proposition |
| `primaryCTA` | `CTAConfig` | Yes | Configuration for primary CTA button |
| `secondaryCTA` | `CTAConfig` | Yes | Configuration for secondary CTA button |
| `className` | `string` | No | Additional CSS classes |

### CTAConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `label` | `string` | Yes | Button text |
| `href` | `string` | Yes | Destination URL |
| `onClick` | `() => void` | No | Optional click handler |

## Design Tokens

The component uses the following design tokens:

- **Background**: `softUITokens.colors.neutral.gray50` - Light gray background
- **Headline Color**: `softUITokens.colors.neutral.gray900` - Dark gray for contrast
- **Subtext Color**: `softUITokens.colors.neutral.gray600` - Medium gray for hierarchy
- **Spacing**: Generous padding (py-20 md:py-24) for breathing room
- **Max Width**: 4xl container (max-w-4xl) for optimal readability

## Animations

- **Container**: Stagger animation for sequential reveal of elements
- **Headline**: Fade-up animation with slight delay
- **Subtext**: Fade-up animation following headline
- **CTA Group**: Fade-up animation as final element
- **Viewport Trigger**: Animations trigger when section enters viewport

## Accessibility

- Semantic `<section>` element with proper ARIA label
- Heading hierarchy with `<h2>` for section title
- Descriptive text in `<p>` tag
- Keyboard-accessible CTA buttons
- Screen reader friendly structure

## Responsive Behavior

### Mobile (< 768px)
- Single column layout
- Smaller headline (text-4xl)
- Stacked CTA buttons
- Reduced padding (py-20)

### Desktop (≥ 768px)
- Centered content with max-width
- Larger headline (text-5xl)
- Side-by-side CTA buttons
- Increased padding (py-24)

## Best Practices

1. **Headline**: Keep it action-oriented and benefit-focused (50-70 characters)
2. **Subtext**: Reinforce key benefits and create urgency (100-150 characters)
3. **Primary CTA**: Use for main conversion action (e.g., "Get Started")
4. **Secondary CTA**: Use for lower-commitment action (e.g., "Request a Demo")
5. **Placement**: Position at the end of the page after all value propositions

## Example Content

```tsx
<FinalCTASection
  headline="Start Advertising Today"
  subtext="Join thousands of successful partners who are growing their business with our platform. Get started in minutes or schedule a personalized demo."
  primaryCTA={{
    label: "Get Started",
    href: "/register",
  }}
  secondaryCTA={{
    label: "Request a Demo",
    href: "/contact",
  }}
/>
```

## Related Components

- `CTAButton` - Individual CTA button component
- `CTAButtonGroup` - Groups primary and secondary CTAs
- `HeroSection` - Similar CTA pattern at top of page
- `MobileStickyCTA` - Mobile-specific sticky CTA

## Testing

The component should be tested for:
- Proper rendering of headline and subtext
- CTA button functionality and navigation
- Responsive layout at different breakpoints
- Animation triggers on scroll
- Accessibility compliance (ARIA, keyboard navigation)

