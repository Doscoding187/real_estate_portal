import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { searchPublicPlaceSuggestions } from '../services/nationalPlaceSearchService';

/**
 * The published-place registry is the published-URL contract.
 *
 * Every location the product publishes must appear in the registry exactly once, either bound
 * to a canonical Place identity or recorded as having no canonical identity, with a reason. A
 * published location may not be silently dropped, and a canonical Place may not carry two
 * published URLs, because a published link would then move under a customer.
 */

const ROOT = path.resolve(import.meta.dirname, '../..');
const PROJECTION = path.join(
  ROOT,
  'data/geography-coverage-v0.1/output/gauteng_runtime_reference_projection_v0.2.json',
);
const REGISTRY = path.join(
  ROOT,
  'data/geography-coverage-v0.1/output/gauteng_published_place_registry_v0.2.json',
);

const PLACE_ID = /^pl-place-01-[a-f0-9]{24}$/;

function publishedRows() {
  const projection = JSON.parse(readFileSync(PROJECTION, 'utf8'));
  return projection.rows
    .filter((row: { runtime_natural_key: string }) => row.runtime_natural_key.split('/').length >= 1)
    .map((row: { runtime_natural_key: string; name: string }) => ({
      key: row.runtime_natural_key,
      name: String(row.name),
      path: `/${row.runtime_natural_key}`,
    }));
}

/** The published locations, excluding the province the others sit under. */
function publishedLocations() {
  return publishedRows().filter(row => row.key.split('/').length >= 2);
}

function registry() {
  return JSON.parse(readFileSync(REGISTRY, 'utf8'));
}

describe('the published-place registry covers every published location', () => {
  it('places every published location in the registry exactly once', () => {
    const published = publishedRows();
    const current = registry();
    const paths = [
      ...Object.values(current.places).map((entry: { path: string }) => entry.path),
      ...current.unmapped.map((entry: { path: string }) => entry.path),
    ];
    expect(paths.length).toBe(published.length);
    expect(new Set(paths).size).toBe(paths.length);
    for (const row of published) expect(paths).toContain(row.path);
  });

  it('keeps the published path and the published label the projection records', () => {
    const current = registry();
    const byPath = new Map<string, { label: string; path: string }>();
    for (const entry of Object.values(current.places)) {
      byPath.set(entry.path, entry);
    }
    for (const row of publishedRows()) {
      const entry = byPath.get(row.path);
      if (!entry) continue;
      expect(entry.path).toBe(row.path);
      expect(entry.label).toBe(row.name);
    }
  });

  it('binds a canonical Place to at most one published URL', () => {
    const current = registry();
    const paths = Object.values(current.places).map((entry: { path: string }) => entry.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const placeId of Object.keys(current.places)) expect(placeId).toMatch(PLACE_ID);
  });

  it('gives every location without a canonical identity a reason', () => {
    const current = registry();
    for (const entry of current.unmapped) {
      expect(entry.reason).toBeTruthy();
      expect(entry.label).toBeTruthy();
      expect(entry.path.startsWith('/gauteng/')).toBe(true);
    }
  });

  it('reports the reconciliation it claims', () => {
    const current = registry();
    expect(current.reconciliation.publishedLocations).toBe(publishedLocations().length);
    expect(current.reconciliation.boundToCanonicalPlace).toBe(
      Object.keys(current.places).length,
    );
    expect(current.reconciliation.unmappedPublishedLocations).toBe(current.unmapped.length);
  });
});

describe('public place search reproduces the published URL', () => {
  it('offers a published location at the URL we publish', async () => {
    const published = publishedLocations();
    // A spread across the set, so a regression in any part of the reconciliation is caught
    // without making the suite carry the whole sweep.
    const sample = published.filter((_, index) => index % 61 === 0);
    expect(sample.length).toBeGreaterThan(15);

    for (const row of sample) {
      const results = await searchPublicPlaceSuggestions({ query: row.name, limit: 40 });
      const matches = results.filter(result => result.label === row.name);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.map(result => result.canonicalPath)).toContain(row.path);
    }
  }, 120_000);

  it('offers a published location that the Place Authority has not admitted', async () => {
    const current = registry();
    for (const entry of current.unmapped) {
      const results = await searchPublicPlaceSuggestions({ query: entry.label, limit: 40 });
      const match = results.find(result => result.canonicalPath === entry.path);
      expect(match, `${entry.path} is not offered by public place search`).toBeTruthy();
      expect(match?.source).toBe('published_projection');
    }
  }, 60_000);
});
