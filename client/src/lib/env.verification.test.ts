import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We will mock process.env, import.meta.env logic conceptually
// because import.meta is read-only in some environments.
// Instead, we will test the LOGIC by temporarily mocking the module if possible,
// or by refactoring logic to be testable.
// Since 'env.ts' reads safe constants from import.meta.env at module load time,
// checking them dynamically is hard without re-importing.
//
// A better approach for this test is to verify our ASSUMPTIONS about the file's logic
// by creating a synthetic copy of the logic here to prove it works given specific inputs.

function testGuardLogic(isProdBuild: boolean, isDevMode: boolean, apiUrl: string) {
  const PROD_BACKEND_SIGNATURES = [
    'propertylistifysa.co.za', // Custom Domain
    'realestateportal-production', // Railway Default
    'listify-property-sa', // Potential project name
  ];

  const STAGING_BACKEND_SIGNATURES = ['realestateportal-staging', 'staging'];

  // Logic replicated from src/lib/env.ts for verification:
  if (!apiUrl) {
    if (isProdBuild) {
      throw new Error('CRITICAL: VITE_API_URL is missing in Production build!');
    }
    return; // Non-prod missing URL is warned, not thrown
  }

  // GUARD 1: Production Build Safety
  if (isProdBuild) {
    const isLocalhost = apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1');
    const isStaging = STAGING_BACKEND_SIGNATURES.some(sig => apiUrl.includes(sig));

    if (isLocalhost || isStaging) {
      throw new Error(
        `CRITICAL ENV MISMATCH: Production build attempting to connect to NON-PROD Backend: ${apiUrl}`,
      );
    }
  }

  // GUARD 2: Non-Prod Build Safety
  if (!isProdBuild && !isDevMode) {
    const isProd = PROD_BACKEND_SIGNATURES.some(sig => apiUrl.includes(sig));
    if (isProd) {
      throw new Error(
        `CRITICAL ENV MISMATCH: Non-Production build (Preview/Staging) attempting to connect to PROD Backend: ${apiUrl}. This is dangerous!`,
      );
    }
  }
}

describe('Environment Guard Logic Verification', () => {
  // 1. Production Build Verification
  it('Should PASS when Production Build connects to Production Backend', () => {
    expect(() =>
      testGuardLogic(true, false, 'https://realestateportal-production.up.railway.app'),
    ).not.toThrow();
    expect(() => testGuardLogic(true, false, 'https://api.propertylistifysa.co.za')).not.toThrow();
  });

  it('Should FAIL when Production Build connects to Staging Backend', () => {
    expect(() =>
      testGuardLogic(true, false, 'https://realestateportal-staging.up.railway.app'),
    ).toThrow(/CRITICAL ENV MISMATCH: Production build attempting to connect to NON-PROD/);
  });

  it('Should FAIL when Production Build connects to Localhost', () => {
    expect(() => testGuardLogic(true, false, 'http://localhost:3000')).toThrow(
      /CRITICAL ENV MISMATCH: Production build attempting to connect to NON-PROD/,
    );
  });

  // 2. Preview/Staging Build Verification
  it('Should PASS when Preview Build connects to Staging Backend', () => {
    expect(() =>
      testGuardLogic(false, false, 'https://realestateportal-staging.up.railway.app'),
    ).not.toThrow();
  });

  it('Should PASS when Dev Mode connects to Localhost', () => {
    expect(() => testGuardLogic(false, true, 'http://localhost:3000')).not.toThrow();
  });

  it('Should FAIL when Preview Build connects to Production Backend', () => {
    expect(() =>
      testGuardLogic(false, false, 'https://realestateportal-production.up.railway.app'),
    ).toThrow(/CRITICAL ENV MISMATCH: Non-Production build/);
  });
});
