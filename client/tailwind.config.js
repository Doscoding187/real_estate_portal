import { themeExtend } from '../design-system/tailwind.extend';
import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: themeExtend,
  plugins: [
    // Hybrid Modern + Soft UI utilities for Explore feature
    plugin(function({ addUtilities }) {
      addUtilities({
        // Modern card with subtle shadow
        '.modern-card': {
          background: '#ffffff',
          borderRadius: '1rem',
          boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.08)',
          transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 6px 12px -2px rgba(0, 0, 0, 0.12)',
            transform: 'translateY(-2px)',
          },
        },
        // Glass overlay for video/map controls
        '.glass-overlay': {
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        },
        // Dark glass for video overlays
        '.glass-overlay-dark': {
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        // Modern button with soft shadow
        '.modern-btn': {
          background: '#ffffff',
          borderRadius: '0.75rem',
          boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.08)',
          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transform: 'scale(1.02)',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
        // Accent button
        '.accent-btn': {
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          borderRadius: '0.75rem',
          boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)',
          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 6px 12px -2px rgba(99, 102, 241, 0.4)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
      });
    }),
  ],
};