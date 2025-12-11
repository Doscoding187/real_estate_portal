# Typography & Spacing Quick Reference

## Typography Standards

### Text Sizing Classes
```tsx
// Headings
text-3xl md:text-4xl        // Section headings (H2)
text-2xl md:text-3xl        // Subsection headings (H3)
text-xl md:text-2xl         // Card headings
text-lg md:text-xl          // Large body text

// Body Text
text-base                   // Standard body text
text-sm sm:text-base        // Small text with responsive sizing

// Buttons
text-base sm:text-lg        // CTA buttons
```

### Font Weights
```tsx
font-bold                   // Headings
font-semibold               // Subheadings, buttons
font-medium                 // Emphasis text
```

### Line Heights
```tsx
leading-tight               // Headings (1.25)
leading-snug                // Subheadings (1.375)
leading-relaxed             // Body text (1.625)
```

## Spacing Standards

### Section Spacing
```tsx
py-20 md:py-28              // Standard section padding
```

### Container Pattern
```tsx
<section className="py-20 md:py-28 bg-white">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    {/* Content */}
  </div>
</section>
```

### Section Header Spacing
```tsx
mb-12 md:mb-16              // Space below section headers
```

### Grid Gaps
```tsx
gap-6 md:gap-8              // Standard grid gap
gap-8 md:gap-10             // Larger grid gap (if needed)
```

### Card Padding
```tsx
p-6 md:p-8                  // Card internal padding
```

## Background Alternation Pattern

```tsx
// Alternating pattern for visual rhythm
Hero Section          → Gradient
Partner Selection     → bg-gray-50
Value Proposition     → bg-white
How It Works          → bg-gray-50
Features Grid         → bg-white
Social Proof          → bg-gray-50
Pricing Preview       → bg-white
Final CTA             → bg-gray-50
FAQ Section           → Gradient
```

## Responsive Breakpoints

```tsx
// Mobile First Approach
className="..."                    // Mobile (< 640px)
className="sm:..."                 // Small (≥ 640px)
className="md:..."                 // Medium (≥ 768px)
className="lg:..."                 // Large (≥ 1024px)
```

## Component Examples

### Button
```tsx
<button className="inline-flex items-center justify-center px-8 py-3.5 text-base sm:text-lg font-semibold">
  Click Me
</button>
```

### Card
```tsx
<div className="p-6 md:p-8 rounded-2xl bg-white">
  <h3 className="text-xl md:text-2xl font-bold mb-3">Title</h3>
  <p className="text-base text-gray-600">Description</p>
</div>
```

### Section
```tsx
<section className="py-20 md:py-28 bg-white">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-12 md:mb-16">
      <h2 className="text-3xl md:text-4xl font-semibold mb-4">Heading</h2>
      <p className="text-lg md:text-xl text-gray-600">Subheading</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
      {/* Cards */}
    </div>
  </div>
</section>
```

## Visual Tokens (Keep in Inline Styles)

Only these should remain in inline styles:
- Gradients: `background: softUITokens.colors.primary.gradient`
- Shadows: `boxShadow: softUITokens.shadows.soft`
- Custom colors: `color: softUITokens.colors.primary.base`
- Border radius: `borderRadius: softUITokens.borderRadius.soft`
- Transitions: `transition: softUITokens.transitions.base`

## Common Patterns

### Responsive Grid
```tsx
// 1 column mobile, 2 tablet, 4 desktop
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8

// 1 column mobile, 2 tablet, 3 desktop
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8
```

### Responsive Text
```tsx
// Heading
text-3xl md:text-4xl font-semibold leading-tight

// Body
text-lg md:text-xl text-gray-600 leading-relaxed

// Small
text-sm sm:text-base text-gray-500
```

### Responsive Padding
```tsx
// Section
py-20 md:py-28

// Card
p-6 md:p-8

// Container
px-4 sm:px-6 lg:px-8
```

## Testing Checklist

- [ ] Mobile (375px): Single column, readable text, no overflow
- [ ] Tablet (768px): Two columns, proper spacing
- [ ] Desktop (1280px): Full grid, generous spacing
- [ ] Large Desktop (1920px): Max width container (1440px)
- [ ] Text readability at all sizes
- [ ] Proper line heights
- [ ] Consistent spacing rhythm
- [ ] Background alternation visible
