import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Main Platform Navigation authority', () => {
  const nav = readRepoFile('client/src/components/EnhancedNavbar.tsx');
  const authority = readRepoFile('client/src/lib/publicNavigation.ts');
  const login = readRepoFile('client/src/pages/Login.tsx');
  const navSeoSpec = readRepoFile('e2e/routing/nav-seo-architecture.spec.ts');

  it('restores the canonical desktop platform menu breadth', () => {
    for (const label of [
      'City',
      'For Buyers',
      'For Renters',
      'For Sellers',
      'Professionals',
      'Insights',
      'Explore',
      'Services',
      'Referrals',
      'Advertise & Partner',
    ]) {
      expect(`${nav}\n${authority}`).toContain(label);
    }

    expect(nav).toContain('Main Platform Navigation is the canonical public marketing navigation.');
    expect(nav).not.toContain('>Log in<');
  });

  it('keeps every restored link routed and within its owning engine', () => {
    for (const href of [
      '/property-for-sale',
      '/property-to-rent',
      '/new-developments',
      '/agents',
      '/developers',
      '/explore/home',
      '/explore/feed',
      '/explore/map',
      '/explore/upload',
      '/explore/shorts',
      '/services/home-loans',
      '/services/property-valuation',
      '/services/legal-services',
      '/services/home-insurance',
      '/services/interior-design',
      '/distribution-network',
      '/advertise',
      '/insights/market-trends',
      '/guides/buying-property',
    ]) {
      expect(authority).toContain(href);
    }

    expect(authority).not.toContain('propertyType=office');
    expect(authority).not.toContain('propertyType=retail');
    expect(authority).not.toContain('propertyType=industrial');
    expect(authority).not.toContain('propertyType=student');
    expect(authority).not.toContain('propertyType=land');
    expect(authority).not.toContain('/saved-search/manage');
    expect(nav).not.toContain('href="#"');
    expect(nav).not.toContain('@ts-nocheck');
  });

  it('uses canonical location authority and preserves mobile account access', () => {
    expect(nav).toContain('FALLBACK_CITY_LINKS');
    expect(nav).toContain('cityToNavLink');
    expect(nav).toContain("transactionType: 'rent'");
    expect(nav).toContain('Open account menu');
    expect(nav).toContain('Create account');
    expect(nav).toContain('main-platform-mobile-menu');
    expect(authority).toContain("return '/agent/dashboard'");
    expect(authority).toContain("return '/distribution/manager'");
  });

  it('uses shared login redirect and explicit top-level active ownership', () => {
    expect(login).toContain("getSafeNextPath(searchParams.get('next'))");
    expect(login).toContain('getLoginRedirectPath(result.user, safeNextPath)');
    expect(login).not.toContain("redirectPath = '/agent/select-package'");
    expect(authority).toContain('PUBLIC_NAVIGATION_ACTIVE_ROUTES');
    expect(nav).toContain('getPublicNavigationActiveOwner');
  });

  it('uses semantic links and keyboard-capable menu primitives without nested controls', () => {
    expect(nav).toContain('NavigationMenuTrigger');
    expect(nav).toContain('aria-label="Main platform navigation"');
    expect(nav).toContain('aria-expanded={mobileMenuOpen}');
    expect(nav).toContain("event.key === 'Escape'");
    expect(nav).toContain('focus()');
    expect(nav).not.toContain('<Link href="/advertise">\n                  <button');
    expect(nav).not.toContain('<Link href="/explore/home">\n                  <button');
  });

  it('separates desktop mega-menu and narrow drawer coverage at the lg breakpoint', () => {
    expect(navSeoSpec).toContain('const DESKTOP_NAVIGATION_BREAKPOINT = 1280');
    expect(navSeoSpec).toContain('!hasDesktopNavigation(page)');
    expect(navSeoSpec).toContain('hasDesktopNavigation(page)');
    expect(navSeoSpec).toContain('narrow navigation exposes canonical platform destinations');
  });
});
