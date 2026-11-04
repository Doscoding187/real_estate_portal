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

  it('does not register a public legacy development search route', () => {
    const app = readRepoFile('client/src/App.tsx');

    expect(app).not.toContain('<Route path="/developments"');
    expect(app).toContain('<Route path="/new-developments" component={DevelopmentsDemo} />');
  });
  it('hands the stale public activation URL to preparation rather than a false live workspace', () => {
    const app = readRepoFile('client/src/App.tsx');

    expect(app).toContain('<Route path="/activation">\n            <Redirect to="/advertise" />');
    expect(app).not.toContain('<ActivationGate />');
  });

  it('removes obsolete development URL aliases and keeps authoring in the developer workspace', () => {
    const app = readRepoFile('client/src/App.tsx');
    const developerRoutes = readRepoFile('client/src/pages/DeveloperRoutes.tsx');

    expect(app).not.toContain('window.location.replace(`/new-developments${window.location.search}`)');
    expect(app).not.toContain('function LegacyDeveloperAuthoringRedirect() {');
    expect(app).not.toContain('<Route path="/developments/create"');
    expect(app).not.toContain('<Route path="/development-wizard"');
    expect(app).toContain('<Route path="/developer/:rest*" component={DeveloperRouteBoundary} />');
    expect(developerRoutes).toContain(
      '<Route path="/developer/create-development" component={CreateDevelopment} />',
    );
  });

  it('uses the canonical Land route for the Plots and Land journey', () => {
    expect(getPublicHeroJourney('plot_land').destination).toBe('/plots-and-land');
  });

  it('uses the canonical developments root on corrected public discovery surfaces', () => {
    const files = [
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
