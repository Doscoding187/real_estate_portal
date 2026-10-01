// client/src/lib/env.ts

import { parseDeployEnv, requireApiUrl, apiHostFromUrl, BACKEND_HOSTS } from './env.contract';

// Resolve once at module load (single source of truth)
export const DEPLOY_ENV = parseDeployEnv(import.meta.env.VITE_DEPLOY_ENV);
export const API_BASE_URL = requireApiUrl(import.meta.env.VITE_API_URL);
export const API_HOST = apiHostFromUrl(API_BASE_URL);

/**
 * Runtime environment safety guard.
 * Ensures frontend + backend environments can never drift.
 */
export function validateEnvironmentConfig() {
  const allowedHosts = BACKEND_HOSTS[DEPLOY_ENV];

  if (!allowedHosts.has(API_HOST)) {
    throw new Error(
      `CRITICAL ENV MISMATCH: ${DEPLOY_ENV.toUpperCase()} frontend must use allowed backend (${[
        ...allowedHosts,
      ].join(', ')}). Got: ${API_HOST}`,
    );
  }
  if (DEPLOY_ENV !== 'development' && new URL(API_BASE_URL).protocol !== 'https:') {
    throw new Error('CRITICAL ENV ERROR: deployed API origin must use HTTPS.');
  }
  if (DEPLOY_ENV === 'production' && import.meta.env.VITE_APP_URL !== 'https://www.propertylistifysa.co.za') {
    throw new Error('CRITICAL ENV ERROR: production frontend origin is invalid.');
  }
  if (DEPLOY_ENV === 'staging' && import.meta.env.VITE_APP_URL !== 'https://staging.propertylistifysa.co.za') {
    throw new Error('CRITICAL ENV ERROR: staging frontend origin is invalid.');
  }
}
