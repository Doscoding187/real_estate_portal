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
export const PROD_HOSTS = new Set([
  'api.propertylistifysa.co.za', // CDN + custom domain (PROD)
]);

export const NONPROD_HOSTS = new Set([
  'realestateportal-staging.up.railway.app', // STAGING backend
  'localhost',
  '127.0.0.1',
]);

/**
 * Extracts the hostname from a URL string safely.
 */
export function getHost(url: string): string {
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
  const host = getHost(API_BASE_URL);

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
    // Prod build MUST connect to the allowed Prod host
    if (!PROD_HOSTS.has(host)) {
      throw new Error(
        `CRITICAL ENV MISMATCH: PROD build must use Production Backend (${[...PROD_HOSTS].join(', ')}). Got: ${host}`,
      );
    }
  } else {
    // GUARD: Non-Production Build (Preview, Staging, Dev)
    // MUST NOT connect to Production
    if (!NONPROD_HOSTS.has(host)) {
      // We allow strict checking for non-prod too, to ensure we don't accidentally use some random URL.
      // But if it IS a prod host, that's the critical error.
      if (PROD_HOSTS.has(host)) {
        throw new Error(
          `CRITICAL ENV MISMATCH: NON-PROD build must NOT use Production Backend! Got: ${host}`,
        );
      }

      // If it's not in our allowed non-prod list, warn but maybe allow (e.g. new feature branch deployment with specific URL?)
      // User requirement: "NON-PROD follows strict list"
      throw new Error(
        `CRITICAL ENV MISMATCH: NON-PROD build must use allowed Backend (${[...NONPROD_HOSTS].join(', ')}). Got: ${host}`,
      );
    }
  }
}
