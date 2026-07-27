import { describe, expect, it } from 'vitest';

import { getMainPlatformAccountHref } from '@/components/EnhancedNavbar';

describe('Main Platform Navigation account routing', () => {
  it('routes manager identities before every role destination', () => {
    expect(getMainPlatformAccountHref({ role: 'agent', hasManagerIdentity: true })).toBe(
      '/distribution/manager',
    );
  });

  it('routes eligible referrer identities to the partner workspace', () => {
    expect(getMainPlatformAccountHref({ role: 'visitor', hasReferrerIdentity: true })).toBe(
      '/distribution/partner/overview',
    );
  });

  it.each([
    ['super_admin', '/admin/overview'],
    ['property_developer', '/developer/dashboard'],
    ['agency_admin', '/agency/dashboard'],
  ])('keeps %s in its primary operational workspace', (role, href) => {
    expect(getMainPlatformAccountHref({ role, hasReferrerIdentity: true })).toBe(href);
  });

  it('preserves ordinary and unauthenticated destinations', () => {
    expect(getMainPlatformAccountHref({ role: 'visitor' })).toBe('/dashboard');
    expect(getMainPlatformAccountHref(null)).toBe('/login');
  });
});
