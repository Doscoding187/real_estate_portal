import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getPublicHeroJourney } from '@/lib/publicNavigation';

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('public route convergence', () => {
  it('preserves the founder-approved audience navigation labels', () => {
    const authority = readRepoFile('client/src/lib/publicNavigation.ts');

    expect(authority).toContain("label: 'For Buyers'");
    expect(authority).toContain("label: 'For Renters'");
    expect(authority).toContain("label: 'For Sellers'");
  });

  it('routes development searches directly to the canonical root with query preservation', () => {
    expect(getPublicHeroJourney('developments').destination).toBe('/new-developments');
  });

  it('keeps legacy development links compatible without discarding their query string', () => {
    const app = readRepoFile('client/src/App.tsx');

    expect(app).toContain('window.location.replace(`/new-developments${window.location.search}`)');
  });

  it('uses the canonical Land route for the Plots and Land journey', () => {
    expect(getPublicHeroJourney('plot_land').destination).toBe('/plots-and-land');
  });

  it('uses the canonical developments root on corrected public discovery surfaces', () => {
    const files = [
      'client/src/sections/home/HomeTrendingSection.tsx',
      'client/src/components/Footer.tsx',
    ];

    for (const file of files) {
      const source = readRepoFile(file);
      expect(source).toContain('/new-developments');
      expect(source).not.toContain('href="/developments"');
      expect(source).not.toContain("? '/developments'");
    }
  });
});
