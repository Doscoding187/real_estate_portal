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
  });

  it('uses the shared tokens for audience and City menu primitives', () => {
    const css = readRepoFile('client/src/styles/enhanced-navbar.css');

    expect(css).toContain('font-size: var(--plds-nav-menu-kicker-size)');
    expect(css).toContain('min-height: var(--plds-nav-menu-link-height)');
    expect(css).toContain('padding: var(--plds-nav-menu-panel-padding)');
    expect(css).toContain('width: var(--plds-nav-city-panel-width)');
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
});
