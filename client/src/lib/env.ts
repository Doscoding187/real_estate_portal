/**
 * Environment Configuration & Runtime Guards
 *
 * This file centralizes environment variable access and enforces safety rules
 * to prevent cross-environment contamination.
 */

export const IS_PROD_BUILD = import.meta.env.PROD;
export const IS_DEV_MODE = import.meta.env.DEV;
export const MODE = import.meta.env.MODE;

// Get the configured API URL (from Vercel env vars)
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  ''
).replace(/\/+$/, '');

// STRICT ALLOWLISTS
// Define exact allowed hostnames for each environment.
// No fuzzy matching.
export const PROD_BACKEND_HOSTS = [
  'api.propertylistifysa.co.za',
  'realestateportal-production.up.railway.app',
];

export const STAGING_BACKEND_HOST = 'realestateportal-staging.up.railway.app';

/**
 * Extracts the hostname from a URL string safely.
 */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Validates that the current build environment matches the configured Backend URL.
 * Throws a CRITICAL error if a mismatch is detected.
 */
export function validateEnvironmentConfig() {
  const host = hostOf(API_BASE_URL);

  console.log(`[ENV] Booting... Mode=${MODE}, ProdBuild=${IS_PROD_BUILD}, Host=${host}`);

  if (!API_BASE_URL || !host) {
    if (IS_PROD_BUILD) {
      throw new Error('CRITICAL: VITE_API_URL is missing or invalid in Production build!');
    } else {
      console.warn('[ENV] VITE_API_URL missing. defaulting to local/empty.');
      return;
    }
  }

  // GUARD: Production Build Integrity
  if (IS_PROD_BUILD) {
    // Prod build MUST connect to one of the allowed Prod hosts
    if (!PROD_BACKEND_HOSTS.includes(host)) {
      throw new Error(
        `CRITICAL ENV MISMATCH: PROD build must use Production Backend (${PROD_BACKEND_HOSTS.join(' or ')}). Got: ${host}`,
      );
    }
  } else {
    // GUARD: Non-Production Build (Preview, Staging, Dev)
    // MUST NOT connect to Production
    if (PROD_BACKEND_HOSTS.includes(host)) {
      throw new Error(
        `CRITICAL ENV MISMATCH: NON-PROD build must NOT use Production Backend! Got: ${host}`,
      );
    }

    // Optional: Enforce Staging Host for Previews (if not localhost)
    if (!host.includes('localhost') && host !== '127.0.0.1' && host !== STAGING_BACKEND_HOST) {
      console.warn(
        `[ENV] Warning: Non-prod build using unknown host: ${host}. Expected: ${STAGING_BACKEND_HOST} or localhost.`,
      );
    }
  }
}
