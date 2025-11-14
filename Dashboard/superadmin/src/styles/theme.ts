// Design Tokens for HomeFind.za Super Admin Dashboard
export const theme = {
  colors: {
    // Primary Colors
    primary: {
      DEFAULT: '#2563EB', // bg-blue-600 / text-blue-600
      hover: '#1D4ED8', // hover:bg-blue-700
    },

    // Accent Colors
    accent: {
      DEFAULT: '#38BDF8', // bg-sky-400 / text-sky-400
    },

    // Neutrals
    background: {
      DEFAULT: '#f8fafc', // bg-slate-50
    },
    surface: {
      DEFAULT: '#ffffff', // bg-white
    },
    border: {
      DEFAULT: '#e2e8f0', // border-slate-200
    },

    // Text Colors
    text: {
      heading: '#0f172a', // text-slate-900
      body: '#475569', // text-slate-600
    },

    // Status Colors
    status: {
      success: {
        DEFAULT: '#16a34a', // text-green-600
        background: '#dcfce7', // bg-green-100
      },
      warning: {
        DEFAULT: '#f97316', // text-orange-500
        background: '#ffedd5', // bg-orange-100
      },
      error: {
        DEFAULT: '#ef4444', // text-red-500
        background: '#fee2e2', // bg-red-100
      },
      info: {
        DEFAULT: '#0ea5e9', // text-sky-500
        background: '#e0f2fe', // bg-sky-100
      },
    },

    // Gradient Colors
    gradients: {
      header: 'linear-gradient(to right, #2563EB, #0ea5e9)', // from-blue-600 to-sky-500
      navbar: 'linear-gradient(to right, #0f172a, #1e40af)', // from-slate-900 to-blue-800
    },
  },

  // Typography
  typography: {
    font: {
      family: 'Inter, system-ui, sans-serif',
      sans: 'font-sans',
    },
    size: {
      xs: '0.75rem', // text-xs
      sm: '0.875rem', // text-sm
      base: '1rem', // text-base
      lg: '1.125rem', // text-lg
      xl: '1.25rem', // text-xl
      '2xl': '1.5rem', // text-2xl
      '3xl': '1.875rem', // text-3xl
    },
    weight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },

  // Spacing
  spacing: {
    xs: '0.25rem', // 1px
    sm: '0.5rem', // 2px
    md: '1rem', // 4px
    lg: '1.5rem', // 6px
    xl: '2rem', // 8px
    '2xl': '3rem', // 12px
    '3xl': '4rem', // 16px
  },

  // Border Radius
  borderRadius: {
    sm: '0.125rem', // rounded-sm
    DEFAULT: '0.25rem', // rounded
    md: '0.375rem', // rounded-md
    lg: '0.5rem', // rounded-lg
    xl: '0.75rem', // rounded-xl
    full: '9999px', // rounded-full
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', // shadow-sm
    DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
};

export type Theme = typeof theme;

export default theme;
