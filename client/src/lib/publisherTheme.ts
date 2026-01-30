/**
 * Publisher Emulator Theme System
 * Centralized design tokens for the Super Admin Publisher interface
 */

export const publisherTheme = {
  // Primary Brand Colors
  primary: {
    blue: 'oklch(54.6% .245 262.881)', // #4f46e5
    blueLight: 'oklch(64.6% .245 262.881)',
    blueDark: 'oklch(44.6% .245 262.881)',
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
    gradientSubtle:
      'linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)',
  },

  // Status Colors
  status: {
    success: 'oklch(70% 0.15 145)', // Green
    successLight: 'oklch(95% 0.05 145)',
    warning: 'oklch(75% 0.15 85)', // Amber
    warningLight: 'oklch(95% 0.05 85)',
    error: 'oklch(65% 0.20 25)', // Red
    errorLight: 'oklch(95% 0.05 25)',
    info: 'oklch(70% 0.12 240)', // Blue
    infoLight: 'oklch(95% 0.05 240)',
  },

  // Surface Colors
  surface: {
    glass: 'rgba(255, 255, 255, 0.7)',
    glassElevated: 'rgba(255, 255, 255, 0.85)',
    elevated: 'rgba(255, 255, 255, 0.95)',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // Shadows
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    colored: '0 10px 15px -3px rgba(79, 70, 229, 0.2), 0 4px 6px -4px rgba(79, 70, 229, 0.1)',
  },
} as const;

export const publisherTypography = {
  hero: 'text-4xl font-bold tracking-tight',
  heading1: 'text-3xl font-bold tracking-tight',
  heading2: 'text-2xl font-semibold',
  heading3: 'text-xl font-semibold',
  heading4: 'text-lg font-semibold',
  body: 'text-base',
  bodyLarge: 'text-lg',
  small: 'text-sm',
  caption: 'text-xs',
  overline: 'text-xs uppercase tracking-wider font-semibold',
} as const;

export const publisherSpacing = {
  section: 'space-y-8',
  card: 'space-y-6',
  group: 'space-y-4',
  tight: 'space-y-2',
  compact: 'space-y-1',
} as const;

export const publisherBorders = {
  radius: {
    sm: 'rounded-md',
    base: 'rounded-lg',
    lg: 'rounded-xl',
    full: 'rounded-full',
  },
  width: {
    thin: 'border',
    medium: 'border-2',
    thick: 'border-4',
  },
} as const;

/**
 * Utility function to get status color classes
 */
export const getStatusColor = (status: string) => {
  const statusMap: Record<string, string> = {
    published: 'bg-green-100 text-green-700 border-green-200',
    approved: 'bg-blue-100 text-blue-700 border-blue-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
    captured: 'bg-blue-100 text-blue-700 border-blue-200',
    claimed: 'bg-green-100 text-green-700 border-green-200',
  };
  return statusMap[status.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-200';
};

/**
 * Utility function to get tier color classes
 */
export const getTierColor = (tier: string | null) => {
  const tierMap: Record<string, string> = {
    national: 'bg-purple-100 text-purple-700 border-purple-200',
    regional: 'bg-blue-100 text-blue-700 border-blue-200',
    boutique: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  return tierMap[tier?.toLowerCase() || ''] || 'bg-gray-100 text-gray-700 border-gray-200';
};

/**
 * Glassmorphism utility classes
 */
export const glassEffect = {
  light: 'bg-white/70 backdrop-blur-md border border-white/30',
  medium: 'bg-white/80 backdrop-blur-lg border border-white/40',
  dark: 'bg-gray-900/70 backdrop-blur-md border border-gray-700/30',
} as const;

/**
 * Animation utility classes
 */
export const animations = {
  fadeIn: 'animate-in fade-in duration-300',
  slideUp: 'animate-in slide-in-from-bottom-4 duration-300',
  slideDown: 'animate-in slide-in-from-top-4 duration-300',
  scaleIn: 'animate-in zoom-in-95 duration-200',
  spin: 'animate-spin',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
  slideInLeft: 'animate-in slide-in-from-left-4 duration-300',
  slideInRight: 'animate-in slide-in-from-right-4 duration-300',
  stagger: 'stagger-anim', // For card animations
} as const;

/**
 * Card elevation variants
 */
export const cardElevation = {
  flat: '',
  low: 'shadow-sm',
  medium: 'shadow-md',
  high: 'shadow-lg',
  highest: 'shadow-xl',
  colored: 'shadow-lg shadow-indigo-500/20',
} as const;

/**
 * Background gradient variants
 */
export const gradients = {
  primary: 'bg-gradient-to-br from-indigo-500 to-purple-600',
  success: 'bg-gradient-to-br from-emerald-500 to-green-600',
  warning: 'bg-gradient-to-br from-amber-500 to-orange-600',
  error: 'bg-gradient-to-br from-red-500 to-pink-600',
  info: 'bg-gradient-to-br from-blue-500 to-cyan-600',
  subtle: 'bg-gradient-to-br from-gray-50 to-gray-100',
  dark: 'bg-gradient-to-br from-gray-900 to-gray-800',
} as const;
