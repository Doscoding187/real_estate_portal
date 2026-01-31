import { describe, it, expect } from 'vitest';

// Replicating/Importing consts for verification
const PROD_HOSTS = new Set(['api.propertylistifysa.co.za']);

const NONPROD_HOSTS = new Set([
  'realestateportal-staging.up.railway.app',
  'localhost',
  '127.0.0.1',
]);

function getHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function testGuardLogic(isProdBuild: boolean, apiUrl: string) {
  const host = getHost(apiUrl);

  if (!apiUrl || !host) {
    if (isProdBuild) throw new Error('CRITICAL: VITE_API_URL is missing');
    return;
  }

  if (isProdBuild) {
    if (!PROD_HOSTS.has(host)) {
      throw new Error(`CRITICAL ENV MISMATCH: PROD build must use Production Backend`);
    }
  } else {
    if (!NONPROD_HOSTS.has(host)) {
      if (PROD_HOSTS.has(host)) {
        throw new Error(`CRITICAL ENV MISMATCH: NON-PROD build must NOT use Production Backend`);
      }
      throw new Error(`CRITICAL ENV MISMATCH: NON-PROD build must use allowed Backend`);
    }
  }
}

describe('Environment Guard Logic Verification (Final Strict)', () => {
  // 1. Production Build Verification
  it('Should PASS when Production Build connects to Verified Prod Host', () => {
    expect(() => testGuardLogic(true, 'https://api.propertylistifysa.co.za')).not.toThrow();
  });

  it('Should FAIL when Production Build connects to Old Railway Prod Host', () => {
    expect(() =>
      testGuardLogic(true, 'https://realestateportal-production.up.railway.app'),
    ).toThrow(/CRITICAL ENV MISMATCH: PROD build must use Production Backend/);
  });

  it('Should FAIL when Production Build connects to Staging Backend', () => {
    expect(() => testGuardLogic(true, 'https://realestateportal-staging.up.railway.app')).toThrow(
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

  it('Should FAIL when Non-Prod connects to Unknown Host', () => {
    expect(() => testGuardLogic(false, 'https://unknown-host.com')).toThrow(
      /CRITICAL ENV MISMATCH: NON-PROD build must use allowed Backend/,
    );
  });
});
