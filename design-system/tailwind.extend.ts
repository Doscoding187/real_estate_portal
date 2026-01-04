// Ikhaya Design System - Tailwind theme.extend helper
import type { Config } from 'tailwindcss';
import { colors, radius, shadows, typography } from './tokens';

export const themeExtend: Config['theme'] = {
  extend: {
    colors: {
      primary: {
        900: colors.primary[900],
        600: colors.primary[600],
        500: colors.primary[500],
        400: colors.primary[400],
        100: colors.primary[100],
        50: colors.primary[50],
      },
      success: {
        600: colors.success[600],
        400: colors.success[400],
        50: colors.success[50],
      },
      warning: {
        600: colors.warning[600],
        50: colors.warning[50],
      },
      error: {
        600: colors.error[600],
        50: colors.error[50],
      },
      gray: {
        900: colors.gray[900],
        700: colors.gray[700],
        500: colors.gray[500],
        300: colors.gray[300],
        200: colors.gray[200],
        100: colors.gray[100],
        50: colors.gray[50],
      },
      // alias neutrals if needed
      neutral: {
        900: colors.gray[900],
        700: colors.gray[700],
        500: colors.gray[500],
        300: colors.gray[300],
        200: colors.gray[200],
        100: colors.gray[100],
        50: colors.gray[50],
      },
    },
    fontFamily: {
      sans: ['var(--font-inter)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
    },
    borderRadius: {
      card: 'var(--card-radius)', // Map to CSS variable
      widget: radius.widget,
      button: radius.button,
      input: radius.input,
      pill: radius.pill,
      16: radius.card,
      12: radius.button,
      20: radius.pill,
    },
    boxShadow: {
      soft: shadows.soft,
      hover: shadows.hover,
    },
    // Fluid spacing tokens (padding, margin, width, height, gap)
    spacing: {
      'fluid-xs': 'var(--space-xs)',
      'fluid-sm': 'var(--space-sm)',
      'fluid-md': 'var(--space-md)',
      'fluid-lg': 'var(--space-lg)',
      'fluid-xl': 'var(--space-xl)',
      'card-p': 'var(--card-padding)',
      'card-g': 'var(--card-gap)',
    },
    // We rely mainly on CSS utilities for typography, but expose sizes for convenience
    fontSize: {
      // Fluid base font
      base: ['clamp(0.9rem, 0.95vw, 1rem)', { lineHeight: '1.55' }],
      
      // Fluid headings
      'fluid-h1': ['clamp(1.6rem, 2.2vw, 2.2rem)', { lineHeight: '1.2', fontWeight: '700' }],
      'fluid-h2': ['clamp(1.3rem, 1.6vw, 1.75rem)', { lineHeight: '1.3', fontWeight: '700' }],
      'fluid-h3': ['clamp(1.1rem, 1.2vw, 1.35rem)', { lineHeight: '1.3', fontWeight: '600' }],
      'fluid-h4': ['clamp(1rem, 1.1vw, 1.15rem)', { lineHeight: '1.4', fontWeight: '600' }],
      
      h1: [typography.h1.fontSize, { fontWeight: typography.h1.fontWeight }],
      h2: [typography.h2.fontSize, { fontWeight: typography.h2.fontWeight }],
      h3: [typography.h3.fontSize, { fontWeight: typography.h3.fontWeight }],
      h4: [typography.h4.fontSize, { fontWeight: typography.h4.fontWeight }],
      'body-l': [typography.bodyL.fontSize, { fontWeight: typography.bodyL.fontWeight }],
      'body-m': [typography.bodyM.fontSize, { fontWeight: typography.bodyM.fontWeight }],
      'body-s': [typography.bodyS.fontSize, { fontWeight: typography.bodyS.fontWeight }],
      'numeric-xl': [
        typography.numericXL.fontSize,
        {
          fontWeight: typography.numericXL.fontWeight,
          letterSpacing: typography.numericXL.letterSpacing,
        },
      ],
    },
  },
};

export default themeExtend;
