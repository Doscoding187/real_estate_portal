// Ikhaya Design System Tokens
// Tailwind + TypeScript token exports

export const colors = {
  primary: {
    900: '#1e3a8a',
    600: '#2563EB',
    500: '#3B82F6',
    400: '#60A5FA',
    100: '#dbeafe',
    50: '#EFF6FF',
  },
  success: {
    600: '#16A34A',
    400: '#4ADE80',
    50: '#F0FDF4',
  },
  warning: {
    600: '#D97706',
    50: '#FFFBEB',
  },
  error: {
    600: '#DC2626',
    50: '#FEF2F2',
  },
  gray: {
    900: '#111827',
    700: '#374151',
    500: '#6B7280',
    300: '#D1D5DB',
    200: '#E5E7EB',
    100: '#F3F4F6',
    50: '#F8FAFC',
  },
} as const;

export type TypographyToken = {
  fontSize: string;
  fontWeight: 400 | 500 | 600 | 700;
  letterSpacing?: string;
  lineHeight?: string;
};

export const typography = {
  h1: { fontSize: '32px', fontWeight: 700 } satisfies TypographyToken,
  h2: { fontSize: '24px', fontWeight: 600 } satisfies TypographyToken,
  h3: { fontSize: '20px', fontWeight: 600 } satisfies TypographyToken,
  h4: { fontSize: '18px', fontWeight: 500 } satisfies TypographyToken,
  bodyL: { fontSize: '16px', fontWeight: 400 } satisfies TypographyToken,
  bodyM: { fontSize: '14px', fontWeight: 400 } satisfies TypographyToken,
  bodyS: { fontSize: '12px', fontWeight: 400 } satisfies TypographyToken,
  numericXL: {
    fontSize: '28px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
  } satisfies TypographyToken,
} as const;

export const spacing = {
  4: '4px',
  8: '8px',
  12: '12px',
  16: '16px',
  20: '20px',
  24: '24px',
  28: '28px',
  32: '32px',
  40: '40px',
  48: '48px',
  56: '56px',
  64: '64px',
} as const;

export const radius = {
  card: '16px',
  widget: '16px',
  button: '12px',
  input: '12px',
  pill: '20px',
} as const;

export const shadows = {
  soft: '0px 4px 20px rgba(0,0,0,0.04)',
  hover: '0px 8px 24px rgba(0,0,0,0.06)',
} as const;

export const borders = {
  soft: '1px solid rgba(0,0,0,0.05)',
  light: '1px solid rgba(0,0,0,0.04)',
  input: `1px solid ${colors.gray[200]}`,
} as const;

export const tokens = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  borders,
} as const;

export type Tokens = typeof tokens;
