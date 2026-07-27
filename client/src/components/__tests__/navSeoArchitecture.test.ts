import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('PXF-S1 public navigation contract', () => {
  it('promotes only verified launch surfaces in the shared public header', () => {
    const nav = readRepoFile('client/src/components/EnhancedNavbar.tsx');

    for (const route of [
      "{ href: '/', label: 'Home' }",
      "{ href: '/property-for-sale', label: 'Buy' }",
      "{ href: '/property-to-rent', label: 'Rent' }",
      "{ href: '/new-developments', label: 'Developments' }",
      "{ href: '/agents', label: 'Agents' }",
      "{ href: '/developers', label: 'Developers' }",
      "{ href: '/advertise', label: 'Advertise / List Property' }",
    ]) {
      expect(nav).toContain(route);
    }

    expect(nav).toContain('Search properties');
    expect(nav).toContain("const accountHref = isAuthenticated ? '/dashboard' : '/login'");
  });

  it('does not market deferred engines in primary public navigation', () => {
    const nav = readRepoFile('client/src/components/EnhancedNavbar.tsx');
    const footer = readRepoFile('client/src/components/ModernFooter.tsx');

    for (const deferredRoute of [
      '/explore/',
      '/services',
      '/distribution-network',
      '/insights/',
      '/guides/',
      '/tools/',
      'Referrer Dashboard',
    ]) {
      expect(nav).not.toContain(deferredRoute);
      expect(footer).not.toContain(deferredRoute);
    }

    expect(footer).toContain('Marketplace footer navigation');
    expect(footer).toContain('Advertise / List Property');
  });

  it('keeps the search and property-detail header free of a referrer primary action', () => {
    const listingNav = readRepoFile('client/src/components/ListingNavbar.tsx');
    const prospectNav = readRepoFile('client/src/components/Navbar.tsx');

    expect(listingNav).not.toContain('Referrer Dashboard');
    expect(listingNav).not.toContain('distribution.referrer.status');
    expect(prospectNav).not.toContain("{ href: '/explore'");
    expect(prospectNav).not.toContain("{ href: '/services'");
    expect(prospectNav).not.toContain("{ href: '/distribution-network'");
  });
});
