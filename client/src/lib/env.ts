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
}
