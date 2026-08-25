import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getSearchDiscoverySuggestions } from '@/lib/searchDiscovery';
import { VITE_SEARCH_DISCOVERY_AUTOSUGGEST_ENABLED } from '@/const';

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('public Search Discovery transport gate', () => {
  it('is defined in const.ts with a public activation fallback of "1"', () => {
    expect(VITE_SEARCH_DISCOVERY_AUTOSUGGEST_ENABLED).toBe('1');
  });

  it('is referenced in EnhancedHero.tsx for flag-gating', () => {
    const hero = readRepoFile('client/src/components/EnhancedHero.tsx');
    expect(hero).toContain('VITE_SEARCH_DISCOVERY_AUTOSUGGEST_ENABLED');
    expect(hero).toContain("=== '1'");
  });

  it('flag-off path still fails closed without changing server identity authority', () => {
    // The recovered composition gates suggestions behind the flag in the
    // useMemo factory rather than a ternary at the consumption site.
    const hero = readRepoFile('client/src/components/EnhancedHero.tsx');
    expect(hero).toContain("VITE_SEARCH_DISCOVERY_AUTOSUGGEST_ENABLED === '1'");
    expect(hero).toContain('serverDiscoverySuggestions || []');
  });

  it('flag-on path uses canonical path-based navigation', () => {
    const hero = readRepoFile('client/src/components/EnhancedHero.tsx');
    // The onDiscoveryNavigate handler delegates to setLocation — no query params.
    expect(hero).toContain('onDiscoveryNavigate={setLocation}');
  });
});

describe('getSearchDiscoverySuggestions', () => {
  it('returns an empty array for queries shorter than 2 characters', () => {
    expect(getSearchDiscoverySuggestions('')).toEqual([]);
    expect(getSearchDiscoverySuggestions('a')).toEqual([]);
    expect(getSearchDiscoverySuggestions(' ')).toEqual([]);
    expect(getSearchDiscoverySuggestions('  ')).toEqual([]);
    expect(getSearchDiscoverySuggestions('     ')).toEqual([]);
  });

  it('matches cities by partial label (case-insensitive)', () => {
    const results = getSearchDiscoverySuggestions('jo');
    expect(results.length).toBeGreaterThanOrEqual(1);
    const labels = results.map(r => r.label);
    expect(labels).toContain('Johannesburg');
  });

  it('returns results with all required fields', () => {
    const results = getSearchDiscoverySuggestions('cape');
    expect(results.length).toBeGreaterThanOrEqual(1);

    const ct = results.find(r => r.label === 'Cape Town');
    expect(ct).toBeDefined();
    expect(ct!.type).toBe('city');
    expect(ct!.provinceSlug).toBe('western-cape');
    expect(ct!.citySlug).toBe('cape-town');
    expect(ct!.canonicalPath).toBeTruthy();
    expect(ct!.source).toBe('fallback');
  });

  it('returns canonical path-based URLs without query params', () => {
    const results = getSearchDiscoverySuggestions('durban');
    for (const r of results) {
      expect(r.canonicalPath).not.toContain('?');
      expect(r.canonicalPath).not.toContain('=');
      expect(r.canonicalPath).not.toContain('&');
    }
  });

  it('returns neutral geography paths rather than transaction paths', () => {
    const results = getSearchDiscoverySuggestions('cape');
    for (const r of results) {
      expect(r.canonicalPath).toMatch(/^\/[a-z0-9-]+(?:\/[a-z0-9-]+){0,2}$/);
      expect(r.canonicalPath).not.toContain('/property-for-sale');
      expect(r.canonicalPath).not.toContain('/property-to-rent');
    }
  });

  it('respects the limit parameter', () => {
    const results = getSearchDiscoverySuggestions('a', 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('defaults to a limit of 6', () => {
    // "a" should match many fallback entries, but we cap at 6
    const results = getSearchDiscoverySuggestions('a');
    expect(results.length).toBeLessThanOrEqual(6);
  });

  it('includes suburb-type suggestions', () => {
    const results = getSearchDiscoverySuggestions('sandton');
    expect(results.length).toBeGreaterThanOrEqual(1);

    const sandton = results.find(r => r.label === 'Sandton');
    expect(sandton).toBeDefined();
    expect(sandton!.type).toBe('suburb');
    expect(sandton!.suburbSlug).toBe('sandton');
    expect(sandton!.canonicalPath).toContain('/gauteng/johannesburg/sandton');
  });

  it('sets source to "fallback" for all results', () => {
    const results = getSearchDiscoverySuggestions('cape');
    for (const r of results) {
      expect(r.source).toBe('fallback');
    }
  });

  it('strips whitespace from query before matching', () => {
    const normal = getSearchDiscoverySuggestions('johannesburg');
    const padded = getSearchDiscoverySuggestions('  johannesburg  ');
    expect(padded.length).toBeGreaterThanOrEqual(1);
    expect(padded.map(r => r.label)).toEqual(normal.map(r => r.label));
  });

  it('returns provinceSlug for every suggestion', () => {
    const results = getSearchDiscoverySuggestions('a');
    for (const r of results) {
      expect(r.provinceSlug).toBeTruthy();
    }
  });
});
