import { describe, expect, it } from 'vitest';

import { getMainPlatformAccountHref } from '@/components/EnhancedNavbar';
import { getCanonicalAccountDestination } from '@/lib/publicNavigation';

describe('Main Platform Navigation account routing', () => {
  it('routes manager identities before every role destination', () => {
    expect(getCanonicalAccountDestination({ role: 'agent', hasManagerIdentity: true })).toBe(
      '/distribution/manager',
    );
  });

  it('routes eligible referrer identities to the partner workspace', () => {
    expect(getCanonicalAccountDestination({ role: 'visitor', hasReferrerIdentity: true })).toBe(
      '/distribution/partner/overview',
    );
  });

  it.each([
    ['super_admin', '/admin/overview'],
    ['property_developer', '/developer/dashboard'],
    ['agency_admin', '/agency/overview'],
    ['agent', '/agent/dashboard'],
    ['service_provider', '/service/dashboard'],
  ])('keeps %s in its primary operational workspace', (role, href) => {
    expect(getCanonicalAccountDestination({ role, hasReferrerIdentity: true })).toBe(href);
  });

  it('preserves ordinary and unauthenticated destinations', () => {
    expect(getCanonicalAccountDestination({ role: 'visitor' })).toBe('/user/dashboard');
    expect(getCanonicalAccountDestination(null)).toBeNull();
    expect(getMainPlatformAccountHref(null)).toBe('/login?mode=signin');
  });
});
