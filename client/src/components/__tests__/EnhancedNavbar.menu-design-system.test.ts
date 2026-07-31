import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('EnhancedNavbar menu design-system contract', () => {
  it('defines semantic menu tokens for shared audience and City navigation', () => {
    const css = readRepoFile('client/src/styles/enhanced-navbar.css');

    expect(css).toContain('--plds-nav-menu-panel-padding');
    expect(css).toContain('--plds-nav-menu-title-size');
    expect(css).toContain('--plds-nav-menu-link-height');
    expect(css).toContain('--plds-nav-menu-item-radius');
    expect(css).toContain('--plds-nav-city-panel-width');
    expect(css).toContain('--plds-nav-journey-panel-width');
    expect(css).toContain('--plds-nav-journey-column-padding-x');
    expect(css).toContain('--plds-nav-journey-footer-height');
  });

  it('uses the shared tokens for audience and City menu primitives', () => {
    const css = readRepoFile('client/src/styles/enhanced-navbar.css');

    expect(css).toContain('font-size: var(--plds-nav-menu-kicker-size)');
    expect(css).toContain('min-height: var(--plds-nav-menu-link-height)');
    expect(css).toContain('padding: var(--plds-nav-menu-panel-padding)');
    expect(css).toContain('width: var(--plds-nav-city-panel-width)');
  });

  it('protects the differentiated Buyer panel geometry and semantic tokens', () => {
    const css = readRepoFile('client/src/styles/enhanced-navbar.css');
    const buyerMenu = readRepoFile('client/src/components/BuyerMegaMenu.tsx');

    expect(css).toContain('--plds-nav-journey-panel-width: min(1160px, calc(100vw - 48px))');
    expect(css).toContain('--plds-nav-buyers-column-padding-x');
    expect(css).toContain('--plds-nav-buyers-outcome-height');
    expect(css).toContain(
      'grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr) minmax(0, 0.96fr)',
    );
    expect(css).toContain('min-height: var(--plds-nav-journey-footer-height)');
    expect(buyerMenu).toContain('public-navbar__buyer-outcomes');
    expect(buyerMenu).toContain('public-navbar__buyer-signin');
  });

  it('uses the shared journey shell for the differentiated Renter panel', () => {
    const css = readRepoFile('client/src/styles/enhanced-navbar.css');
    const renterMenu = readRepoFile('client/src/components/RenterMegaMenu.tsx');

    expect(css).toContain('--plds-nav-renters-panel-width: var(--plds-nav-journey-panel-width)');
    expect(css).toContain('.public-navbar__mega-panel--renters');
    expect(css).toContain('public-navbar__journey-columns');
    expect(css).toContain(
      'grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr) minmax(0, 0.96fr)',
    );
    expect(renterMenu).toContain('public-navbar__renter-outcomes');
    expect(renterMenu).toContain('public-navbar__renter-signin');
  });

  it('keeps Seller within the shared primary-blue proposition-card system', () => {
    const css = readRepoFile('client/src/styles/enhanced-navbar.css');
    const sellerMenu = readRepoFile('client/src/components/SellerMegaMenu.tsx');
    const buyerMenu = readRepoFile('client/src/components/BuyerMegaMenu.tsx');
    const renterMenu = readRepoFile('client/src/components/RenterMegaMenu.tsx');
    const cityMenu = readRepoFile('client/src/components/CityDiscoveryMenu.tsx');

    expect(css).toContain('.public-navbar__journey-proposition-card--sellers');
    expect(css).toContain('background: color-mix(in srgb, var(--primary) 4%, var(--popover))');
    expect(css).toContain(
      'border: 1px solid color-mix(in srgb, var(--primary) 14%, var(--border))',
    );
    expect(css).not.toContain('var(--success) 7%');
    expect(css).toContain('--plds-nav-journey-proposition-inset');
    expect(css).not.toContain('#16a34a');
    expect(sellerMenu).toContain('public-navbar__journey-proposition-card--sellers');
    expect(sellerMenu).toContain('public-navbar__journey-footer');
    expect(buyerMenu).toContain('public-navbar__journey-proposition-card--buyers');
    expect(renterMenu).toContain('public-navbar__journey-proposition-card--renters');
    expect(cityMenu).not.toContain('public-navbar__journey-proposition-card');
  });

  it('keeps Professionals neutral and contained without changing Services', () => {
    const css = readRepoFile('client/src/styles/enhanced-navbar.css');
    const professionalsMenu = readRepoFile('client/src/components/ProfessionalsMegaMenu.tsx');
    const navbar = readRepoFile('client/src/components/EnhancedNavbar.tsx');

    expect(css).toContain('.public-navbar__journey-proposition-card--professionals');
    expect(css).toContain('background: var(--popover)');
    expect(css).toContain(
      'border: 1px solid color-mix(in srgb, var(--primary) 14%, var(--border))',
    );
    expect(css).not.toContain('var(--secondary) 4%');
    expect(professionalsMenu).toContain('public-navbar__journey-proposition-card--professionals');
    expect(professionalsMenu).toContain('public-navbar__journey-footer');
    expect(navbar).toContain("activeDesktopMenu?.id === 'professionals'");
    expect(navbar).toContain('ServicesMegaMenu');
  });

  it('keeps Insights contained, neutral and separate from Explore', () => {
    const css = readRepoFile('client/src/styles/enhanced-navbar.css');
    const insightsMenu = readRepoFile('client/src/components/InsightsMegaMenu.tsx');
    const navbar = readRepoFile('client/src/components/EnhancedNavbar.tsx');

    expect(css).toContain('.public-navbar__journey-proposition-card--insights');
    expect(css).toContain('background: var(--popover)');
    expect(css).toContain(
      'border: 1px solid color-mix(in srgb, var(--primary) 14%, var(--border))',
    );
    expect(css).not.toContain('public-navbar__journey-proposition-card--insights {\n  background: #');
    expect(insightsMenu).toContain('public-navbar__journey-proposition-card--insights');
    expect(insightsMenu).toContain('public-navbar__journey-footer');
    expect(navbar).toContain("activeDesktopMenu?.id === 'insights'");
    expect(navbar).not.toContain('ExploreMegaMenu');
  });

  it('keeps Services in the shared neutral journey system with catalog-driven geometry', () => {
    const css = readRepoFile('client/src/styles/enhanced-navbar.css');
    const servicesMenu = readRepoFile('client/src/components/ServicesMegaMenu.tsx');
    const navbar = readRepoFile('client/src/components/EnhancedNavbar.tsx');

    expect(css).toContain('--plds-nav-services-panel-width: var(--plds-nav-journey-panel-width)');
    expect(css).toContain('.public-navbar__mega-panel--services');
    expect(css).toContain('.public-navbar__journey-proposition-card--services');
    expect(css).toContain('background: var(--popover)');
    expect(css).toContain(
      'border: 1px solid color-mix(in srgb, var(--primary) 14%, var(--border))',
    );
    expect(css).not.toContain('var(--success)');
    expect(servicesMenu).toContain('public-navbar__journey-proposition-column');
    expect(servicesMenu).toContain('public-navbar__journey-proposition-card--services');
    expect(servicesMenu).toContain('public-navbar__journey-footer');
    expect(servicesMenu).toContain('Browse all services');
    expect(navbar).toContain("activeDesktopMenu?.id === 'services'");
  });

  it('keeps Advertise & Partner in the shared neutral journey system', () => {
    const css = readRepoFile('client/src/styles/enhanced-navbar.css');
    const advertiseMenu = readRepoFile('client/src/components/AdvertisePartnerMegaMenu.tsx');
    const navbar = readRepoFile('client/src/components/EnhancedNavbar.tsx');

    expect(css).toContain('--plds-nav-advertise-panel-width: var(--plds-nav-journey-panel-width)');
    expect(css).toContain('.public-navbar__mega-panel--advertise');
    expect(css).toContain('.public-navbar__journey-proposition-card--advertise');
    expect(css).toContain('background: var(--popover)');
    expect(css).toContain(
      'border: 1px solid color-mix(in srgb, var(--primary) 14%, var(--border))',
    );
    expect(css).not.toContain('#16a34a');
    expect(advertiseMenu).toContain('public-navbar__journey-proposition-column');
    expect(advertiseMenu).toContain('public-navbar__journey-proposition-card--advertise');
    expect(advertiseMenu).toContain('public-navbar__journey-footer');
    expect(navbar).toContain('AdvertisePartnerMegaMenu');
    expect(navbar).toContain('public-navbar-trigger-advertise');
  });

  it('keeps account access compact, neutral and token-led', () => {
    const css = readRepoFile('client/src/styles/enhanced-navbar.css');
    const navbar = readRepoFile('client/src/components/EnhancedNavbar.tsx');

    expect(css).toContain('.public-navbar__account-trigger');
    expect(css).toContain('background: var(--background)');
    expect(css).toContain('border-color: var(--border)');
    expect(css).toContain('background: var(--popover)');
    expect(navbar).toContain('getAccountWorkspaceLabel');
    expect(navbar).toContain('getAccountAuthHref');
    expect(navbar).toContain('public-navbar__account-menu-content');
    expect(navbar).toContain("Logging out…");
  });

  it('keeps City as a compact three-zone discovery menu', () => {
    const css = readRepoFile('client/src/styles/enhanced-navbar.css');
    const navbar = readRepoFile('client/src/components/CityDiscoveryMenu.tsx');

    expect(css).toContain(
      'grid-template-columns: minmax(0, 0.9fr) minmax(0, 1fr) minmax(17rem, 1.35fr)',
    );
    expect(navbar).toContain('public-navbar__city-grid');
    expect(navbar).toContain('public-navbar__city-discovery');
    expect(navbar).toContain('Popular cities');
    expect(navbar).toContain('Areas in');
  });

  it('uses one shared visual authority for equivalent journey menus and states', () => {
    const css = readRepoFile('client/src/styles/enhanced-navbar.css');

    for (const modifier of [
      'buyers',
      'renters',
      'sellers',
      'professionals',
      'insights',
      'services',
      'advertise',
    ]) {
      expect(css).toContain(`.public-navbar__journey-proposition-card--${modifier}`);
      expect(css).toContain(`.public-navbar__mega-panel--${modifier}`);
    }

    expect(css).toContain(
      'border: 1px solid color-mix(in srgb, var(--primary) 14%, var(--border))',
    );
    expect(css).toContain(
      'background: color-mix(in srgb, var(--primary) 4%, var(--popover))',
    );
    expect(css).toContain('.public-navbar__journey-nav-link:hover');
    expect(css).toContain(".public-navbar__journey-nav-link[aria-current='page']");
    expect(css).toContain('.public-navbar__desktop-trigger:hover');
    expect(css).toContain(".public-navbar__desktop-trigger[data-open='true']");
  });

  it('keeps mobile rows, active state and account surfaces on shared navbar primitives', () => {
    const css = readRepoFile('client/src/styles/enhanced-navbar.css');
    const navbar = readRepoFile('client/src/components/EnhancedNavbar.tsx');

    expect(css).toContain('.public-navbar__mobile-destination-link');
    expect(css).toContain('.public-navbar__mobile-section-heading');
    expect(css).toContain('.public-navbar__account-menu-content');
    expect(navbar).toContain('aria-current={active ? \'page\' : undefined}');
    expect(navbar).toContain('className="public-navbar__mobile-destination-link"');
  });
});
