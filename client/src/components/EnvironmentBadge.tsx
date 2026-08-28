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
    <aside
      className="fixed bottom-2 right-2 z-[9999] hidden rounded bg-red-600 px-2 py-1 text-xs font-bold uppercase text-white shadow-lg pointer-events-none sm:block"
      aria-label="Environment status"
      title={`Backend: ${API_BASE_URL}`}
    >
      {label} ENV
    </aside>
  );
};
