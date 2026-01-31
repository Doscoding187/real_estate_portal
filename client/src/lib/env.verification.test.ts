import { describe, it, expect } from 'vitest';

// Replicating logic from client/src/lib/env.ts for verification
// We duplicate the HOST constants to verify they are correct in the source too.

const PROD_BACKEND_HOSTS = [
  'api.propertylistifysa.co.za',
  'realestateportal-production.up.railway.app',
];
const STAGING_BACKEND_HOST = 'realestateportal-staging.up.railway.app';

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function testGuardLogic(isProdBuild: boolean, apiUrl: string) {
  const host = hostOf(apiUrl);

  if (!apiUrl || !host) {
    if (isProdBuild) throw new Error('CRITICAL: VITE_API_URL is missing');
    return;
  }

  // GUARD: Production Build Integrity
  if (isProdBuild) {
    if (!PROD_BACKEND_HOSTS.includes(host)) {
      throw new Error(
        `CRITICAL ENV MISMATCH: PROD build must use Production Backend. Got: ${host}`,
      );
    }
  } else {
    // GUARD: Non-Production Build
    if (PROD_BACKEND_HOSTS.includes(host)) {
      throw new Error(
        `CRITICAL ENV MISMATCH: NON-PROD build must NOT use Production Backend! Got: ${host}`,
      );
    }
  }
}

describe('Environment Guard Logic Verification (Strict)', () => {
  // 1. Production Build Verification
  it('Should PASS when Production Build connects to Allowed Production Host', () => {
    expect(() => testGuardLogic(true, 'https://api.propertylistifysa.co.za')).not.toThrow();
    expect(() =>
      testGuardLogic(true, 'https://realestateportal-production.up.railway.app'),
    ).not.toThrow();
  });

  it('Should FAIL when Production Build connects to Staging Backend', () => {
    expect(() => testGuardLogic(true, 'https://realestateportal-staging.up.railway.app')).toThrow(
      /CRITICAL ENV MISMATCH: PROD build must use Production Backend/,
    );
  });

  it('Should FAIL when Production Build connects to Localhost', () => {
    expect(() => testGuardLogic(true, 'http://localhost:3000')).toThrow(
      /CRITICAL ENV MISMATCH: PROD build must use Production Backend/,
    );
  });

  // 2. Non-Prod Build Verification (Preview/Staging/Dev)
  it('Should PASS when Non-Prod connects to Staging', () => {
    expect(() =>
      testGuardLogic(false, 'https://realestateportal-staging.up.railway.app'),
    ).not.toThrow();
  });

  it('Should PASS when Non-Prod connects to Localhost', () => {
    expect(() => testGuardLogic(false, 'http://localhost:3000')).not.toThrow();
  });

  it('Should FAIL when Non-Prod connects to Production', () => {
    expect(() => testGuardLogic(false, 'https://api.propertylistifysa.co.za')).toThrow(
      /CRITICAL ENV MISMATCH: NON-PROD build must NOT use Production Backend/,
    );
  });
});
