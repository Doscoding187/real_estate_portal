/**
 * EnvironmentBadge Component
 *
 * Displays a visual indicator showing which environment the app is running in.
 * This prevents "oops" moments where developers accidentally test on production.
 *
 * - LOCAL: Green badge (safe to test)
 * - STAGING: Yellow badge (pre-production)
 * - PRODUCTION: Hidden by default (no badge in prod)
 */

import React from 'react';

type Environment = 'local' | 'staging' | 'production';

const getEnvironment = (): Environment => {
  const env = import.meta.env.VITE_APP_ENV || import.meta.env.MODE;

  if (env === 'local' || env === 'development') return 'local';
  if (env === 'staging') return 'staging';
  return 'production';
};

const envConfig: Record<Environment, { label: string; className: string; show: boolean }> = {
  local: {
    label: 'LOCAL',
    className: 'bg-green-600 text-white',
    show: true,
  },
  staging: {
    label: 'STAGING',
    className: 'bg-yellow-500 text-black',
    show: true,
  },
  production: {
    label: 'PROD',
    className: 'bg-red-600 text-white',
    show: false, // Hidden by default in production
  },
};

interface EnvironmentBadgeProps {
  /**
   * Force show badge even in production (for debugging)
   */
  forceShow?: boolean;

  /**
   * Position of the badge
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const EnvironmentBadge: React.FC<EnvironmentBadgeProps> = ({
  forceShow = false,
  position = 'bottom-left',
}) => {
  const env = getEnvironment();
  const config = envConfig[env];

  // Don't show in production unless forced
  if (!config.show && !forceShow) return null;

  const positionClasses: Record<string, string> = {
    'top-left': 'top-2 left-2',
    'top-right': 'top-2 right-2',
    'bottom-left': 'bottom-2 left-2',
    'bottom-right': 'bottom-2 right-2',
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-[9999] px-3 py-1 rounded-full text-xs font-bold shadow-lg select-none pointer-events-none ${config.className}`}
      style={{ fontFamily: 'monospace' }}
    >
      {config.label}
    </div>
  );
};

export default EnvironmentBadge;
