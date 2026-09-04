import { describe, expect, it } from 'vitest';

import { getMainPlatformAccountHref } from '@/components/EnhancedNavbar';
import {
  getAccountAuthHref,
  getAccountWorkspaceLabel,
  getCanonicalAccountDestination,
} from '@/lib/publicNavigation';

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

  it.each([
    ['super_admin', 'Open administrator workspace'],
    ['property_developer', 'Open developer workspace'],
    ['agency_admin', 'Open agency workspace'],
    ['agent', 'Open agent workspace'],
    ['service_provider', 'Open service provider workspace'],
    ['referrer', 'Open referral partner workspace'],
    ['visitor', 'Open member dashboard'],
  ])('uses governed workspace wording for %s', (role, label) => {
    expect(getAccountWorkspaceLabel({ role })).toBe(label);
  });

  it('preserves only safe same-origin return paths for auth links', () => {
    expect(getAccountAuthHref('signin', '/property-for-sale?city=Cape%20Town')).toBe(
      '/login?mode=signin&next=%2Fproperty-for-sale%3Fcity%3DCape%2520Town',
    );
    expect(getAccountAuthHref('register', 'https://example.com/phishing')).toBe(
      '/login?mode=register',
    );
    expect(getAccountAuthHref('signin', '/login?mode=signin')).toBe('/login?mode=signin');
  });

  it('keeps global registration entry neutral until a role is chosen', () => {
    const href = getAccountAuthHref('register', '/');
    expect(href).toBe('/login?mode=register&next=%2F');
    expect(new URLSearchParams(href.split('?')[1]).has('role')).toBe(false);
  });
});
