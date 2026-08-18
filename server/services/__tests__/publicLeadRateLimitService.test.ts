import { describe, expect, it } from 'vitest';

import { getPublicLeadClientIp } from '../publicLeadRateLimitService';

describe('publicLeadRateLimitService client identity', () => {
  it('uses the framework-resolved request IP instead of a caller-controlled forwarded header', () => {
    expect(
      getPublicLeadClientIp({
        req: {
          ip: '198.51.100.42',
          socket: { remoteAddress: '10.0.0.8' },
          headers: { 'x-forwarded-for': '203.0.113.99, 10.0.0.8' },
        },
      }),
    ).toBe('198.51.100.42');
  });

  it('falls back to the connected socket address when the framework has no resolved IP', () => {
    expect(
      getPublicLeadClientIp({
        req: {
          socket: { remoteAddress: '10.0.0.8' },
          headers: { 'x-forwarded-for': '203.0.113.99' },
        },
      }),
    ).toBe('10.0.0.8');
  });

  it('does not trust a raw forwarded header as an identity by itself', () => {
    expect(
      getPublicLeadClientIp({ req: { headers: { 'x-forwarded-for': '203.0.113.99' } } }),
    ).toBe('unknown');
  });
});
