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
    expect(readRepoFile('client/src/components/EnhancedNavbar.tsx')).toContain('--plds-nav-height');
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
