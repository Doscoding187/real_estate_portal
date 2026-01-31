import React from 'react';
import { API_BASE_URL } from '../lib/env';

/**
 * A visible badge for Non-Production environments to prevent confusion.
 * Does not render in Production builds.
 */
export const EnvironmentBadge: React.FC = () => {
  // Simple check: If this IS a production build, show nothing.
  if (import.meta.env.PROD) return null;

  // Otherwise, show the mode (DEV, TEST, etc.)
  const label = (import.meta.env.MODE || 'NON-PROD').toUpperCase();

  return (
    <div
      className="fixed bottom-2 right-2 z-[9999] px-2 py-1 bg-red-600 text-white text-xs font-bold rounded shadow-lg opacity-80 pointer-events-none uppercase"
      title={`Backend: ${API_BASE_URL}`}
    >
      {label} ENV
    </div>
  );
};
