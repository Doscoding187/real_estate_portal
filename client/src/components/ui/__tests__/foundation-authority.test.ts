import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('FPE-S1A foundation authority', () => {
  it('keeps index.css as the global runtime entry for the canonical PLDS layers', () => {
    const entry = readRepoFile('client/src/main.tsx');
    const tokens = readRepoFile('client/src/index.css');

    expect(entry).toContain("import './index.css'");
    expect(entry).not.toContain("import './styles/theme.css'");
    expect(tokens).toContain("@import './styles/plds/theme.css'");
    expect(tokens).toContain("@import './styles/plds/semantic.css'");
    expect(tokens).toContain("@import './styles/plds/components.css'");
    expect(readRepoFile('client/src/styles/plds/theme.css')).toContain('--primary:');
    expect(readRepoFile('client/src/styles/plds/semantic.css')).toContain('--content-rail-width:');
    expect(readRepoFile('client/src/styles/plds/components.css')).toContain('--plds-nav-height:');
    expect(existsSync('client/src/globals.css')).toBe(false);
    expect(existsSync('client/src/styles/theme.css')).toBe(false);
  });

  it('keeps the four PLDS pilots on component-scoped values without changing responsive ownership', () => {
    const navbar = readRepoFile('client/src/components/EnhancedNavbar.tsx');
    const navbarStyles = readRepoFile('client/src/styles/enhanced-navbar.css');

    expect(navbar).toContain("import '@/styles/enhanced-navbar.css'");
    expect(navbarStyles).toMatch(
      /\.public-navbar__shell\s*\{[\s\S]*?min-height:\s*var\(--plds-nav-height\)/,
    );
    expect(navbarStyles).toMatch(/@media\s*\(min-width:\s*1280px\)/);
    expect(navbarStyles).toMatch(/@media\s*\(max-width:\s*1279px\)/);
    expect(readRepoFile('client/src/components/EnhancedHero.tsx')).toContain(
      '--plds-home-hero-search-max-width',
    );
    expect(readRepoFile('client/src/components/SimplePropertyListingCard.tsx')).toContain(
      '--plds-listing-card-max-width',
    );

    const field = readRepoFile('client/src/components/ui/field.tsx');
    expect(field).toContain('--plds-field-group-gap');
    expect(field).toContain('@container/field-group');
    expect(field).toContain('@md/field-group:flex-row');
  });

  it('preserves the listing-card radius relationship and corrected PLDS-R1 evidence', () => {
    const tokens = readRepoFile('client/src/styles/plds/components.css');
    const indexCss = readRepoFile('client/src/index.css');
    const listingCard = readRepoFile('client/src/components/SimplePropertyListingCard.tsx');
    const sidebar = readRepoFile('client/src/components/ui/sidebar.tsx');
    const main = readRepoFile('client/src/main.tsx');
    const overlay = readRepoFile('client/src/components/explore/PropertyOverlay.tsx');
    const unitAudit = readRepoFile(
      'docs/architecture/frontend-design-system/audits/plds-r1/01-current-unit-authority-audit.md',
    );
    const responsiveInventory = readRepoFile(
      'docs/architecture/frontend-design-system/audits/plds-r1/03-responsive-authority-inventory.tsv',
    );
    const riskInventory = readRepoFile(
      'docs/architecture/frontend-design-system/audits/plds-r1/04-fixed-size-and-content-growth-risks.tsv',
    );

    expect(tokens).toMatch(/--plds-listing-card-radius:\s*calc\(var\(--radius\) \+ 4px\);/);
    expect(tokens).toMatch(/--plds-nav-height:\s*4rem;/);
    expect(tokens).toMatch(/--plds-nav-action-height:\s*2\.25rem;/);
    expect(tokens).toMatch(/--plds-home-hero-title-max-width:\s*24rem;/);
    expect(tokens).toMatch(/--plds-home-hero-search-max-width:\s*64rem;/);
    expect(tokens).toMatch(/--plds-home-hero-search-radius:\s*1rem;/);
    expect(tokens).toMatch(/--plds-field-group-gap:\s*1\.75rem;/);
    expect(tokens).toMatch(/--plds-field-gap:\s*0\.75rem;/);
    expect(tokens).toMatch(/--plds-field-content-gap:\s*0\.375rem;/);
    expect(indexCss).toMatch(/--radius-xl:\s*calc\(var\(--radius\) \+ 4px\);/);
    expect(listingCard).toContain('rounded-[var(--plds-listing-card-radius)]');
    expect(listingCard).not.toMatch(/\brounded-xl\b/);
    expect(sidebar).toContain('min-h-svh');
    expect(sidebar).toContain('h-svh');
    expect(main).not.toContain("import './styles/accessibility.css'");
    expect(overlay).toContain('h-full overflow-y-auto');
    expect(unitAudit).toContain('min-h-svh` and `h-svh');
    expect(unitAudit).toContain('intrinsic `max-content` sizing');
    expect(responsiveInventory).toMatch(
      /client\/src\/styles\/accessibility\.css[\s\S]*DORMANT_AUTHORITY/,
    );
    expect(riskInventory).toContain('h-full overflow-y-auto');
  });

  it('keeps foundation components inside the accepted primitive authority without engine imports', () => {
    for (const relativePath of [
      'client/src/components/ui/page-frame.tsx',
      'client/src/components/ui/feedback-state.tsx',
    ]) {
      const source = readRepoFile(relativePath);

      expect(source).not.toMatch(/@\/lib\/trpc|useQuery|useMutation|RequireRole|@\/_core\/roles/);
      expect(source).not.toMatch(
        /#[0-9a-fA-F]{3,8}|from-(blue|green|red|purple)|bg-(blue|green|red|purple)/,
      );
    }

    expect(readRepoFile('client/src/components/ui/feedback-state.tsx')).toContain(
      "from '@/components/ui/button'",
    );
    expect(readRepoFile('client/src/components/ui/page-frame.tsx')).toContain(
      'data-slot="page-frame"',
    );
  });

  it('keeps the three bounded consumers on their existing business authorities', () => {
    const home = readRepoFile('client/src/pages/Home.tsx');
    const favorites = readRepoFile('client/src/pages/Favorites.tsx');
    const notFound = readRepoFile('client/src/pages/NotFound.tsx');

    expect(home).toContain("from '@/components/ui/page-frame'");
    expect(favorites).toContain('trpc.properties.getFavorites.useQuery');
    expect(favorites).toContain('trpc.properties.toggleFavorite.useMutation');
    expect(notFound).toContain("setLocation('/')");
  });
});
