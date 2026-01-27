/**
 * Design Tokens for Explore Feature
 * Hybrid Modern + Soft UI Design System
 *
 * Inspired by: Airbnb, Instagram Explore, Google Discover, Zillow, TikTok
 *
 * Design Philosophy:
 * - Clean, modern layouts with high readability
 * - Subtle shadows (1-4px, not heavy neumorphism)
 * - Gentle gradients and soft edges
 * - Glass/blur overlays for controls
 * - Crisp contrast and modern typography
 * - Smooth micro-interactions
 */

export const designTokens = {
  colors: {
    // Modern, clean backgrounds
    bg: {
      primary: '#ffffff',
      secondary: '#f8f9fa',
      tertiary: '#f1f3f5',
      dark: '#1f2937',
    },
    // Soft accent colors (WCAG AA compliant)
    accent: {
      primary: '#4f46e5', // Darker for better contrast (was #6366f1)
      hover: '#4338ca', // Even darker for hover state
      light: '#6366f1', // Lighter shade for backgrounds
      subtle: '#e0e7ff',
      gradient: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
    },
    // Glass/overlay effects
    glass: {
      bg: 'rgba(255, 255, 255, 0.85)',
      bgDark: 'rgba(0, 0, 0, 0.4)',
      border: 'rgba(255, 255, 255, 0.3)',
      borderDark: 'rgba(255, 255, 255, 0.1)',
      backdrop: 'blur(12px)',
    },
    // Text colors (WCAG AA compliant)
    text: {
      primary: '#1f2937',
      secondary: '#6b7280',
      tertiary: '#6b7280', // Changed from #9ca3af for better contrast
      inverse: '#ffffff',
      disabled: '#9ca3af', // Keep light gray for truly disabled states (non-text)
    },
    // Status colors (WCAG AA compliant)
    status: {
      success: '#047857', // Darker green for 4.5:1 contrast (was #10b981)
      warning: '#b45309', // Darker orange for 4.5:1 contrast (was #f59e0b)
      error: '#dc2626', // Darker red for better contrast (was #ef4444)
      info: '#2563eb', // Darker blue for better contrast (was #3b82f6)
    },
  },

  spacing: {
    xs: '0.25rem', // 4px
    sm: '0.5rem', // 8px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    '2xl': '3rem', // 48px
    '3xl': '4rem', // 64px
  },

  borderRadius: {
    sm: '0.5rem', // 8px
    md: '0.75rem', // 12px
    lg: '1rem', // 16px
    xl: '1.5rem', // 24px
    pill: '9999px',
  },

  shadows: {
    // Subtle, modern shadows (not neumorphic)
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 2px 4px 0 rgba(0, 0, 0, 0.08)',
    lg: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    xl: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    '2xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    // Glass effect shadow
    glass: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
    // Hover states
    hover: '0 6px 12px -2px rgba(0, 0, 0, 0.12)',
    // Accent shadow for buttons
    accent: '0 4px 6px -1px rgba(99, 102, 241, 0.3)',
    accentHover: '0 6px 12px -2px rgba(99, 102, 241, 0.4)',
  },

  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    },
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },

  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
} as const;

// Type exports for TypeScript
export type DesignTokens = typeof designTokens;
export type ColorToken = keyof typeof designTokens.colors;
export type SpacingToken = keyof typeof designTokens.spacing;
export type ShadowToken = keyof typeof designTokens.shadows;
