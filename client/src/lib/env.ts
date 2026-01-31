/**
 * Environment Configuration & Runtime Guards
 *
 * This file centralizes environment variable access and enforces safety rules
 * to prevent cross-environment contamination (e.g., Staging frontend talking to Prod backend).
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

// KNOWN DOMAINS
// We check against these signatures to verify we are connecting to the right place.
const PROD_BACKEND_SIGNATURES = [
  'propertylistifysa.co.za', // Custom Domain
  'realestateportal-production', // Railway Default
  'listify-property-sa', // Potential project name
];

const STAGING_BACKEND_SIGNATURES = ['realestateportal-staging', 'staging'];

/**
 * Validates that the current build environment matches the configured Backend URL.
 * Throws a CRITICAL error if a mismatch is detected.
 */
export function validateEnvironmentConfig() {
  console.log(`[ENV] Booting... Mode=${MODE}, ProdBuild=${IS_PROD_BUILD}, API=${API_BASE_URL}`);

  if (!API_BASE_URL) {
    if (IS_PROD_BUILD) {
      // It is critical to have an API URL in production
      throw new Error('CRITICAL: VITE_API_URL is missing in Production build!');
    } else {
      console.warn('[ENV] VITE_API_URL missing in Dev/Preview. Defaults may apply.');
      return;
    }
  }

  // GUARD 1: Production Build Safety
  if (IS_PROD_BUILD) {
    // If we are building for PROD, we MUST connect to a Prod-like Backend.
    // AND securely NOT connect to localhost or staging.

    const isLocalhost = API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1');
    const isStaging = STAGING_BACKEND_SIGNATURES.some(sig => API_BASE_URL.includes(sig));

    if (isLocalhost || isStaging) {
      throw new Error(
        `CRITICAL ENV MISMATCH: Production build attempting to connect to NON-PROD Backend: ${API_BASE_URL}`,
      );
    }

    // Optional: Enforce specific prod domain if desired
    // const isProd = PROD_BACKEND_SIGNATURES.some(sig => API_BASE_URL.includes(sig));
    // if (!isProd) { ... }
  }

  // GUARD 2: Non-Prod Build Safety (Prevention of Accidental Prod Usage)
  if (!IS_PROD_BUILD && !IS_DEV_MODE) {
    // This catches "Preview" deployments or Staging builds.
    // They should NOT be looking at the live production DB.

    const isProd = PROD_BACKEND_SIGNATURES.some(sig => API_BASE_URL.includes(sig));

    if (isProd) {
      throw new Error(
        `CRITICAL ENV MISMATCH: Non-Production build (Preview/Staging) attempting to connect to PROD Backend: ${API_BASE_URL}. This is dangerous!`,
      );
    }
  }
}

// Auto-validate on import logic?
// Better to call explicitly in main.tsx to ensure it runs before React mounts.
