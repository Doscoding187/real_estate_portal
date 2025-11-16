// Ikhaya Design System - Tailwind theme.extend helper
import type { Config } from 'tailwindcss';
import { colors, radius, shadows, typography } from './tokens';

export const themeExtend: Config['theme'] = {
  extend: {
    colors: {
      primary: {
        600: colors.primary[600],
        500: colors.primary[500],
        400: colors.primary[400],
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
      card: radius.card,
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
    // We rely mainly on CSS utilities for typography, but expose sizes for convenience
    fontSize: {
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
