# Advertise With Us - Layout Fix Expert Reference

## Problem Summary

The `/advertise` page has layout issues where cards have no styling, spacing, or margins. The root cause is a conflict between:
1. **Inline CSS styles** (highest specificity) used for layout properties
2. **Tailwind utility classes** that should handle responsive layout

## Architecture Rule (MUST FOLLOW)

| Property Type | Where to Define | Example |
|--------------|-----------------|---------|
| **Layout** (display, flex, padding, margin, gap, width, height, position) | Tailwind classes | `className="flex flex-col p-8 gap-6"` |
| **Visual tokens** (shadows, gradients, dynamic colors) | Inline styles | `style={{ boxShadow: softUITokens.shadows.soft }}` |

---

## Files That Need Review

### 1. Main Page: `client/src/pages/AdvertiseWithUs.tsx`

```tsx
/**
 * Advertise With Us Landing Page
 */

import React, { lazy, Suspense, useState } from 'react';

// CRITICAL: Import responsive CSS for proper layout
import '@/styles/advertise-responsive.css';
import '@/styles/advertise-focus-indicators.css';

import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { Footer } from '@/components/Footer';
import { HeroSection } from '@/components/advertise/HeroSection';
import { PartnerSelectionSection } from '@/components/advertise/PartnerSelectionSection';
import { ValuePropositionSection } from '@/components/advertise/ValuePropositionSection';
import { HowItWorksSection } from '@/components/advertise/HowItWorksSection';
// ... other imports

export default function AdvertiseWithUs() {
  // ... component logic
  
  return (
    <>
      <EnhancedNavbar />
      
      <main id="main-content" className="bg-white">
        {/* Each section should use max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 */}
        <section id="hero-section">
          <HeroSection {...props} />
        </section>
        
        <section id="partner-selection">
          <PartnerSelectionSection />
        </section>
        
        {/* ... other sections */}
      </main>
      
      <Footer />
    </>
  );
}
```

---

### 2. Card Components (ALREADY REFACTORED - Should be correct)

#### `client/src/components/advertise/FeatureTile.tsx`
```tsx
export const FeatureTile: React.FC<FeatureTileProps> = ({
  icon: Icon,
  title,
  description,
  className = '',
}) => {
  return (
    <motion.div
      // ✅ CORRECT: Layout via Tailwind classes
      className={`feature-tile flex flex-col items-start gap-6 p-8 rounded-2xl bg-white relative overflow-hidden cursor-default ${className}`}
      style={{
        // ✅ CORRECT: Only visual tokens in inline styles
        boxShadow: softUITokens.shadows.soft,
      }}
      // ... animation variants
    >
      {/* Icon Container */}
      <motion.div
        className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: softUITokens.colors.primary.light,
        }}
      >
        {/* ... */}
      </motion.div>
      
      {/* Text Content */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2 leading-snug">
          {title}
        </h3>
        <p className="text-base text-gray-600 leading-relaxed">
          {description}
        </p>
      </div>
    </motion.div>
  );
};
```

#### `client/src/components/advertise/PricingCard.tsx`
```tsx
export const PricingCard: React.FC<PricingCardProps> = ({
  icon: Icon,
  category,
  description,
  href,
  onClick,
  className = '',
}) => {
  return (
    <motion.a
      href={href}
      onClick={handleClick}
      // ✅ CORRECT: Layout via Tailwind classes
      className={`pricing-card block no-underline bg-white rounded-2xl p-8 border-2 border-gray-200 cursor-pointer relative overflow-hidden transition-all duration-300 ${className}`}
      // ... animation props
    >
      {/* Hover border glow effect */}
      <motion.div
        className="absolute -top-0.5 -left-0.5 -right-0.5 -bottom-0.5 rounded-2xl pointer-events-none z-0"
        style={{
          // ✅ CORRECT: Only visual tokens
          background: softUITokens.colors.primary.gradient,
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Icon */}
        <motion.div
          className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
          style={{
            background: softUITokens.colors.primary.light,
          }}
        >
          <Icon size={28} style={{ color: softUITokens.colors.primary.base }} />
        </motion.div>

        <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight">
          {category}
        </h3>
        <p className="text-base text-gray-600 leading-relaxed mb-6">
          {description}
        </p>
        {/* ... */}
      </div>
    </motion.a>
  );
};
```

#### `client/src/components/advertise/PartnerTypeCard.tsx`
```tsx
export const PartnerTypeCard: React.FC<PartnerTypeCardProps> = ({
  icon: Icon,
  title,
  benefit,
  href,
  onClick,
  className = '',
}) => {
  return (
    <motion.a
      href={href}
      onClick={handleClick}
      // ✅ CORRECT: Layout via Tailwind classes
      className={`partner-type-card block no-underline bg-white rounded-2xl p-8 cursor-pointer relative overflow-hidden transition-all duration-300 ${className}`}
      style={{
        // ✅ CORRECT: Only visual tokens
        boxShadow: softUITokens.shadows.soft,
      }}
    >
      {/* Content */}
      <div className="relative z-10">
        <motion.div
          className="w-16 h-16 rounded-xl flex items-center justify-center mb-6"
          style={{
            background: softUITokens.colors.primary.light,
          }}
        >
          <Icon size={32} style={{ color: softUITokens.colors.primary.base }} />
        </motion.div>

        <h3 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">
          {title}
        </h3>
        <p className="text-base text-gray-600 leading-relaxed mb-6">
          {benefit}
        </p>
        {/* ... */}
      </div>
    </motion.a>
  );
};
```

---

### 3. Section Components (Check these for issues)

#### `client/src/components/advertise/PartnerSelectionSection.tsx`
```tsx
export const PartnerSelectionSection: React.FC<PartnerSelectionSectionProps> = ({
  partnerTypes = defaultPartnerTypes,
  title = 'Who Are You Advertising As?',
  subtitle = 'Choose your partner type to see tailored advertising solutions',
  className = '',
}) => {
  return (
    <section
      className={`partner-selection-section py-20 md:py-28 bg-gray-50 ${className}`}
    >
      {/* ✅ Standard container wrapper */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold leading-tight mb-4">
            {title}
          </h2>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        {/* ✅ Grid with proper responsive classes */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 partner-cards-grid"
        >
          {partnerTypes.map((partnerType, index) => (
            <div key={partnerType.id}>
              <PartnerTypeCard
                icon={partnerType.icon}
                title={partnerType.title}
                benefit={partnerType.benefit}
                href={partnerType.href}
                index={index}
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
```

#### `client/src/components/advertise/FeaturesGridSection.tsx`
```tsx
export const FeaturesGridSection: React.FC<FeaturesGridSectionProps> = ({
  title = 'Powerful Features for Your Success',
  subtitle = 'Everything you need to advertise effectively and grow your business',
  className = '',
}) => {
  return (
    <section
      className={`features-grid-section py-20 md:py-28 bg-gray-50 ${className}`}
    >
      {/* ✅ Standard container wrapper */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold leading-tight mb-4">
            {title}
          </h2>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
            {subtitle}
          </p>
        </motion.div>

        {/* ✅ Grid with proper responsive classes */}
        <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {features.map((feature) => (
            <motion.div key={feature.title}>
              <FeatureTile
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
```

#### `client/src/components/advertise/PricingPreviewSection.tsx`
```tsx
export const PricingPreviewSection: React.FC<PricingPreviewSectionProps> = ({
  pricingCategories = defaultPricingCategories,
  fullPricingHref = '/pricing',
  title = 'Pricing That Fits Your Business',
  subtitle = '...',
}) => {
  return (
    <section className="pricing-preview-section py-20 md:py-28 bg-gray-50">
      {/* ✅ Standard container wrapper */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold leading-tight mb-4">
            {title}
          </h2>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
            {subtitle}
          </p>
        </motion.div>

        {/* ✅ Grid with proper responsive classes */}
        <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pricing-cards-grid mb-10 md:mb-12">
          {pricingCategories.map((category) => (
            <PricingCard
              key={category.category}
              icon={category.icon}
              category={category.category}
              description={category.description}
              href={category.href}
            />
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div className="flex justify-center">
          <CTAButton label="View Full Pricing" href={fullPricingHref} variant="secondary" />
        </motion.div>
      </div>
    </section>
  );
};
```

---

### 4. CSS Files (Should be minimal, scoped)

#### `client/src/styles/advertise-responsive.css`
```css
/**
 * FIXED VERSION: Tailwind-compatible, no global overrides
 * This file provides SUPPLEMENTARY styles only.
 * All layout is handled by Tailwind classes in components.
 */

/* Hero section enhancements */
.hero-section {
  position: relative;
  overflow: hidden;
}

@media (min-width: 1024px) {
  .hero-section {
    min-height: max(90vh, 640px);
  }
}

/* Billboard banner responsive heights */
.billboard-banner {
  position: relative;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
}

@media (max-width: 767px) {
  .billboard-banner { height: 300px; }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .billboard-banner { height: 400px; }
}

@media (min-width: 1024px) {
  .billboard-banner { height: 500px; }
}

/* Card hover effects - NO layout properties */
.feature-tile {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.feature-tile:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.1);
}

.pricing-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.pricing-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.1);
}

.partner-type-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.partner-type-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.1);
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .feature-tile,
  .pricing-card,
  .partner-type-card {
    transition: none;
  }
  
  .feature-tile:hover,
  .pricing-card:hover,
  .partner-type-card:hover {
    transform: none;
  }
}
```

---

### 5. Design Tokens (Visual only)

#### `client/src/components/advertise/design-tokens.ts`
```typescript
export const softUITokens = {
  colors: {
    primary: {
      base: '#667eea',
      light: '#f0f4ff',
      subtle: '#e0e7ff',
      dark: '#4f46e5',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    secondary: {
      base: '#764ba2',
      light: '#fdf4ff',
    },
    neutral: {
      white: '#ffffff',
      gray50: '#f8fafc',
      gray100: '#f1f5f9',
      gray600: '#475569',
      gray900: '#0f172a',
    },
  },
  shadows: {
    soft: '0 4px 20px -2px rgba(0, 0, 0, 0.08), 0 2px 8px -2px rgba(0, 0, 0, 0.04)',
    softHover: '0 8px 30px -4px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.06)',
    softLarge: '0 12px 40px -8px rgba(0, 0, 0, 0.15), 0 6px 16px -4px rgba(0, 0, 0, 0.08)',
  },
  // ... other tokens
};
```

---

## Standard Container Pattern

Every section should use this wrapper:

```tsx
<section className="py-20 md:py-28 bg-gray-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    {/* Section content */}
  </div>
</section>
```

| Breakpoint | Padding |
|------------|---------|
| Mobile (< 640px) | `px-4` (1rem) |
| Tablet (640px+) | `sm:px-6` (1.5rem) |
| Desktop (1024px+) | `lg:px-8` (2rem) |
| Wide (1280px+) | Centered with `max-w-7xl` |

---

## Checklist for Expert

1. [ ] Verify all card components use Tailwind for layout (no inline `display`, `padding`, `margin`, `gap`)
2. [ ] Verify all section components have `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` wrapper
3. [ ] Verify CSS files have NO `!important` declarations
4. [ ] Verify CSS files have NO global selectors overriding layout
5. [ ] Check if any parent component is applying conflicting styles
6. [ ] Test at mobile (375px), tablet (768px), desktop (1280px)

---

## Live URL

https://real-estate-portal-xi.vercel.app/advertise

---

## Git Commits Made

1. `bbd8518` - Rewrote CSS files to remove global overrides
2. `64c5f4e` - Refactored components to use Tailwind for layout
3. `2fa1488` - Updated task documentation
4. `e09441b` - Removed unused `index` parameter from PartnerTypeCard
