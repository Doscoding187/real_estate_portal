# Advertise With Us - Layout Fix Code Reference

## Issue Summary
Cards on the `/advertise` page have lost their styling, spacing, and margins after refactoring inline styles to Tailwind classes.

## Architecture Rule
- **Tailwind classes** → Layout properties (display, flex, padding, margin, gap, width, height, position)
- **Inline styles** → Visual tokens only (boxShadow, background gradients, colors from design tokens)

---

## 1. FeatureTile.tsx (Current State)

```tsx
/**
 * FeatureTile Component
 * 
 * Displays a specific advertising feature with soft-UI card styling,
 * icon, title, and description. Includes hover lift animation.
 * 
 * Requirements: 5.2, 5.3, 11.2
 * 
 * REFACTORED: Layout via Tailwind, visual tokens via inline styles only
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { softUITokens } from './design-tokens';

export interface FeatureTileProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export const FeatureTile: React.FC<FeatureTileProps> = ({
  icon: Icon,
  title,
  description,
  className = '',
}) => {
  return (
    <motion.div
      className={`feature-tile flex flex-col items-start gap-6 p-8 rounded-2xl bg-white relative overflow-hidden cursor-default ${className}`}
      initial="rest"
      whileHover="hover"
      animate="rest"
      style={{
        // Visual tokens only - shadows
        boxShadow: softUITokens.shadows.soft,
      }}
      variants={{
        rest: {
          y: 0,
          boxShadow: softUITokens.shadows.soft,
        },
        hover: {
          y: -4,
          boxShadow: softUITokens.shadows.softHover,
          transition: {
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1],
          },
        },
      }}
    >
      {/* Icon Container with color transition on hover */}
      <motion.div
        className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: softUITokens.colors.primary.light,
        }}
        variants={{
          rest: {
            background: softUITokens.colors.primary.light,
          },
          hover: {
            background: softUITokens.colors.primary.subtle,
            transition: {
              duration: 0.3,
              ease: [0.4, 0, 0.2, 1],
            },
          },
        }}
      >
        <motion.div
          style={{
            color: softUITokens.colors.primary.base,
          }}
          variants={{
            rest: {
              color: softUITokens.colors.primary.base,
            },
            hover: {
              color: softUITokens.colors.primary.dark,
              transition: {
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
              },
            },
          }}
        >
          <Icon size={28} aria-hidden="true" />
        </motion.div>
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

---

## 2. PricingCard.tsx (Current State)

```tsx
/**
 * PricingCard Component
 * 
 * Displays a pricing category card with minimalist styling and hover border glow effect.
 * Navigates to full pricing page on click and tracks analytics.
 * 
 * Requirements: 7.2, 7.3
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { softUITokens } from './design-tokens';
import { staggerItem } from '@/lib/animations/advertiseAnimations';

export interface PricingCardProps {
  icon: LucideIcon;
  category: string;
  description: string;
  href: string;
  onClick?: () => void;
  className?: string;
}

const trackPricingCardClick = (category: string, href: string) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'pricing_card_click', {
      category,
      location: 'pricing_preview',
      href,
      timestamp: new Date().toISOString(),
    });
  }
  console.log('Pricing Card Click:', { category, href });
};

export const PricingCard: React.FC<PricingCardProps> = ({
  icon: Icon,
  category,
  description,
  href,
  onClick,
  className = '',
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    trackPricingCardClick(category, href);
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <motion.a
      href={href}
      onClick={handleClick}
      className={`pricing-card block no-underline bg-white rounded-2xl p-8 border-2 border-gray-200 cursor-pointer relative overflow-hidden transition-all duration-300 ${className}`}
      variants={staggerItem}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: '-50px' }}
      whileHover="hover"
      whileTap="tap"
      aria-label={`View ${category} pricing details`}
    >
      {/* Hover border glow effect */}
      <motion.div
        className="absolute -top-0.5 -left-0.5 -right-0.5 -bottom-0.5 rounded-2xl pointer-events-none z-0"
        style={{
          background: softUITokens.colors.primary.gradient,
        }}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Icon */}
        <motion.div
          className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
          style={{
            background: softUITokens.colors.primary.light,
          }}
          whileHover={{
            scale: 1.05,
            background: softUITokens.colors.primary.subtle,
          }}
          transition={{ duration: 0.3 }}
        >
          <Icon
            size={28}
            style={{
              color: softUITokens.colors.primary.base,
            }}
            aria-hidden="true"
          />
        </motion.div>

        {/* Category */}
        <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight">
          {category}
        </h3>

        {/* Description */}
        <p className="text-base text-gray-600 leading-relaxed mb-6">
          {description}
        </p>

        {/* View Pricing Arrow */}
        <motion.div
          className="inline-flex items-center gap-2 text-sm font-semibold"
          style={{
            color: softUITokens.colors.primary.base,
          }}
          whileHover={{ x: 4 }}
          transition={{ duration: 0.2 }}
        >
          <span>View Pricing</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M6 3L11 8L6 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      </div>
    </motion.a>
  );
};
```

---

## 3. PartnerTypeCard.tsx (Current State)

```tsx
/**
 * PartnerTypeCard Component
 * 
 * Displays a partner type option with icon, title, benefit, and CTA.
 * Includes hover lift animation with shadow expansion and click navigation.
 * 
 * Requirements: 2.2, 2.3, 2.4
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { softUITokens } from './design-tokens';
import { staggerItem } from '@/lib/animations/advertiseAnimations';

export interface PartnerTypeCardProps {
  icon: LucideIcon;
  title: string;
  benefit: string;
  href: string;
  index: number;
  onClick?: () => void;
  className?: string;
}

const trackPartnerTypeClick = (partnerType: string, href: string) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'partner_type_click', {
      partnerType,
      location: 'partner_selection',
      href,
      timestamp: new Date().toISOString(),
    });
  }
  console.log('Partner Type Click:', { partnerType, href });
};

export const PartnerTypeCard: React.FC<PartnerTypeCardProps> = ({
  icon: Icon,
  title,
  benefit,
  href,
  onClick,
  className = '',
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    trackPartnerTypeClick(title, href);
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <motion.a
      href={href}
      onClick={handleClick}
      className={`partner-type-card block no-underline bg-white rounded-2xl p-8 cursor-pointer relative overflow-hidden transition-all duration-300 ${className}`}
      variants={staggerItem}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: '-50px' }}
      whileHover="hover"
      whileTap="tap"
      style={{
        boxShadow: softUITokens.shadows.soft,
      }}
      aria-label={`Learn more about ${title} advertising`}
    >
      {/* Gradient overlay on hover */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: softUITokens.colors.primary.gradient,
        }}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 0.03 }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Icon */}
        <motion.div
          className="w-16 h-16 rounded-xl flex items-center justify-center mb-6"
          style={{
            background: softUITokens.colors.primary.light,
          }}
          whileHover={{
            scale: 1.05,
            background: softUITokens.colors.primary.subtle,
          }}
          transition={{ duration: 0.3 }}
        >
          <Icon
            size={32}
            style={{
              color: softUITokens.colors.primary.base,
            }}
            aria-hidden="true"
          />
        </motion.div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">
          {title}
        </h3>

        {/* Benefit */}
        <p className="text-base text-gray-600 leading-relaxed mb-6">
          {benefit}
        </p>

        {/* CTA */}
        <motion.div
          className="inline-flex items-center gap-2 text-base font-semibold"
          style={{
            color: softUITokens.colors.primary.base,
          }}
          whileHover={{ x: 4 }}
          transition={{ duration: 0.2 }}
        >
          <span>Learn More</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M6 3L11 8L6 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      </div>
    </motion.a>
  );
};
```

---

## 4. Design Tokens (design-tokens.ts)

```typescript
export const softUITokens = {
  colors: {
    primary: {
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      light: '#f0f4ff',
      base: '#667eea',
      dark: '#5a67d8',
      subtle: '#e9ecff',
    },
    secondary: {
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      light: '#fff5f7',
      base: '#f093fb',
      dark: '#e53e3e',
      subtle: '#ffe9f0',
    },
    neutral: {
      white: '#ffffff',
      gray50: '#f9fafb',
      gray100: '#f3f4f6',
      gray200: '#e5e7eb',
      gray300: '#d1d5db',
      gray400: '#9ca3af',
      gray500: '#6b7280',
      gray600: '#4b5563',
      gray700: '#374151',
      gray800: '#1f2937',
      gray900: '#111827',
    },
    accent: {
      blue: '#3b82f6',
      green: '#10b981',
      yellow: '#f59e0b',
      purple: '#8b5cf6',
    },
  },

  shadows: {
    soft: '0 2px 8px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.06)',
    softHover: '0 4px 12px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.12)',
    softLarge: '0 8px 24px rgba(0, 0, 0, 0.08), 0 16px 48px rgba(0, 0, 0, 0.12)',
    primaryGlow: '0 4px 16px rgba(102, 126, 234, 0.3)',
    secondaryGlow: '0 4px 16px rgba(240, 147, 251, 0.3)',
  },

  borderRadius: {
    soft: '12px',
    softLarge: '16px',
    softXL: '24px',
    pill: '9999px',
  },

  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
    spring: '400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem',    // 64px
    '4xl': '5rem',    // 80px
    '5xl': '6rem',    // 96px
  },
} as const;
```

---

## 5. CSS Files

### advertise-responsive.css (Key Sections)

```css
/* FEATURE TILE HOVER EFFECTS */
.feature-tile {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.feature-tile:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.1);
}

/* PRICING CARD HOVER EFFECTS */
.pricing-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.pricing-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.1);
}

/* PARTNER TYPE CARD HOVER EFFECTS */
.partner-type-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.partner-type-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.1);
}
```

---

## 6. Parent Section Components

### FeaturesGridSection.tsx (Grid Container)

```tsx
<motion.div
  variants={staggerContainer}
  initial="initial"
  animate={isVisible ? "animate" : "initial"}
  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10"
>
  {features.map((feature) => (
    <motion.div key={feature.title} variants={staggerItem}>
      <FeatureTile
        icon={feature.icon}
        title={feature.title}
        description={feature.description}
      />
    </motion.div>
  ))}
</motion.div>
```

### PricingPreviewSection.tsx (Grid Container)

```tsx
<motion.div
  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pricing-cards-grid mb-10 md:mb-12"
  variants={staggerContainer}
  initial="initial"
  whileInView="animate"
  viewport={{ once: true, margin: '-50px' }}
>
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
```

### PartnerSelectionSection.tsx (Grid Container)

```tsx
<motion.div
  variants={staggerContainer}
  initial="initial"
  whileInView="animate"
  viewport={{ once: true, margin: '-100px' }}
  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 partner-cards-grid"
  role="list"
  aria-label="Partner type options"
>
  {partnerTypes.map((partnerType, index) => (
    <div key={partnerType.id} role="listitem">
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
```

---

## 7. Tailwind Classes Used

### Card Layout Classes
- `flex flex-col` - Flexbox column layout
- `items-start` - Align items to start
- `gap-6` - 24px gap between children
- `p-8` - 32px padding all sides
- `rounded-2xl` - 16px border radius
- `bg-white` - White background
- `relative` - Position relative
- `overflow-hidden` - Hide overflow
- `cursor-default` / `cursor-pointer` - Cursor styles

### Grid Layout Classes
- `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` - Responsive grid
- `gap-8` / `gap-10` - Grid gap

### Typography Classes
- `text-xl font-semibold text-gray-900` - Title styling
- `text-base text-gray-600 leading-relaxed` - Description styling
- `mb-2`, `mb-3`, `mb-6` - Margin bottom

### Icon Container Classes
- `w-14 h-14` / `w-16 h-16` - Fixed dimensions
- `rounded-xl` - Border radius
- `flex items-center justify-center` - Centering
- `flex-shrink-0` - Prevent shrinking

---

## 8. Potential Issues to Check

1. **Tailwind CSS not loading** - Check if Tailwind is properly configured and the CSS is being imported
2. **CSS specificity conflicts** - Check if other CSS is overriding Tailwind classes
3. **Framer Motion conflicts** - The `style` prop on motion components might be conflicting with Tailwind
4. **Build/compilation issues** - Check if Tailwind is processing the component files
5. **Missing Tailwind classes** - Verify all classes exist in the Tailwind config

---

## 9. Live URL
https://real-estate-portal-xi.vercel.app/advertise

## 10. Files to Check
- `client/src/components/advertise/FeatureTile.tsx`
- `client/src/components/advertise/PricingCard.tsx`
- `client/src/components/advertise/PartnerTypeCard.tsx`
- `client/src/components/advertise/FeaturesGridSection.tsx`
- `client/src/components/advertise/PricingPreviewSection.tsx`
- `client/src/components/advertise/PartnerSelectionSection.tsx`
- `client/src/components/advertise/design-tokens.ts`
- `client/src/styles/advertise-responsive.css`
- `client/src/styles/advertise-focus-indicators.css`
- `client/tailwind.config.js`
