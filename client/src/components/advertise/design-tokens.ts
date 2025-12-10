/**
 * Soft-UI Design Tokens for Advertise With Us Landing Page
 * 
 * Inspired by: Zillow Partners, 99Acres, SquareYards
 * 
 * Design Philosophy:
 * - Pastel gradients with soft color transitions
 * - Soft shadows (not harsh, not flat)
 * - Rounded elements with generous border radius
 * - Smooth, natural animations
 * - Premium, trustworthy aesthetic
 */

export const softUITokens = {
  colors: {
    // Primary gradient (purple/indigo)
    primary: {
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      light: '#f0f4ff',
      base: '#667eea',
      dark: '#5a67d8',
      subtle: '#e9ecff',
    },
    // Secondary gradient (pink/red)
    secondary: {
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      light: '#fff5f7',
      base: '#f093fb',
      dark: '#e53e3e',
      subtle: '#ffe9f0',
    },
    // Neutral palette
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
    // Accent colors for features
    accent: {
      blue: '#3b82f6',
      green: '#10b981',
      yellow: '#f59e0b',
      purple: '#8b5cf6',
    },
  },

  shadows: {
    // Soft shadows for cards and elements
    soft: '0 2px 8px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.06)',
    softHover: '0 4px 12px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.12)',
    softLarge: '0 8px 24px rgba(0, 0, 0, 0.08), 0 16px 48px rgba(0, 0, 0, 0.12)',
    // Colored shadows for gradient buttons
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
    // Smooth, natural timing functions
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
    // Spring-like bounce for interactive elements
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

  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      display: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    fontSize: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',     // 14px
      base: '1rem',       // 16px
      lg: '1.125rem',     // 18px
      xl: '1.25rem',      // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
      '4xl': '2.25rem',   // 36px
      '5xl': '3rem',      // 48px
      '6xl': '3.75rem',   // 60px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
    lineHeight: {
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2',
    },
  },

  breakpoints: {
    mobile: '768px',
    tablet: '1024px',
    desktop: '1440px',
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
export type SoftUITokens = typeof softUITokens;
export type SoftUIColor = keyof typeof softUITokens.colors;
export type SoftUIShadow = keyof typeof softUITokens.shadows;
export type SoftUIBorderRadius = keyof typeof softUITokens.borderRadius;
export type SoftUITransition = keyof typeof softUITokens.transitions;
