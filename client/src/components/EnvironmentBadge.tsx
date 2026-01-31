import React from 'react';
import { IS_PROD_BUILD, API_BASE_URL } from '../lib/env';

/**
 * A visible badge for Non-Production environments to prevent confusion.
 * Does not render in Production.
 */
export const EnvironmentBadge: React.FC = () => {
  if (IS_PROD_BUILD) return null;

  // Determine label based on URL or Mode
  let label = 'DEV';
  if (API_BASE_URL.includes('staging')) label = 'STAGING';
  else if (import.meta.env.MODE === 'test') label = 'TEST';
  else if (API_BASE_URL.includes('localhost')) label = 'LOCAL';

  return (
    <div
      className="fixed bottom-2 right-2 z-[9999] px-2 py-1 bg-red-600 text-white text-xs font-bold rounded shadow-lg opacity-80 pointer-events-none uppercase"
      title={`Backend: ${API_BASE_URL}`}
    >
      {label} ENV
    </div>
  );
};
