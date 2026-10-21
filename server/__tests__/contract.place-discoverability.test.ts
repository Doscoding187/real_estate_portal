import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Discoverability is not gated by the licence.
 *
 * A place we hold a record for is always searchable and always has its own page. Only
 * publication — a place appearing in a guide's curated place list — is gated. The licence
 * classification of a place decides whether we may publish it, never whether a customer may
 * find it.
 *
 * This is a founder decision of 2026-10-20, recorded in launch packet 62 and here so that a
 * later change cannot quietly tighten the search filters and break the location picker, the
 * suburb search and the direct place URLs.
 */

const ROOT = path.resolve(import.meta.dirname, '../..');

function source(relativePath: string) {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('place discoverability is not gated by the licence', () => {
  it('resolves a place by slug whether it is verified or provisional', () => {
    const resolver = source('server/services/locationResolverService.ts');
    // A place is excluded when it is retired, not when it is unverified.
    expect(resolver).toContain("ne(provinces.status, 'retired')");
    expect(resolver).toContain("ne(cities.status, 'retired')");
    expect(resolver).toContain("ne(suburbs.status, 'retired')");
    expect(resolver).not.toContain("eq(cities.status, 'verified')");
    expect(resolver).not.toContain("eq(suburbs.status, 'verified')");
  });

  it('offers every non-retired place in the location search', () => {
    const discovery = source('server/services/searchDiscoveryService.ts');
    expect(discovery).toContain("ne(provinces.status, 'retired')");
    expect(discovery).toContain("ne(cities.status, 'retired')");
    expect(discovery).toContain("ne(suburbs.status, 'retired')");
    expect(discovery).not.toContain("eq(cities.status, 'verified')");
    expect(discovery).not.toContain("eq(suburbs.status, 'verified')");
  });

  it('keeps the licence gate on publication only', () => {
    const authority = source('server/services/geographyAuthorityService.ts');
    // The guide place list is the publication surface, and it is the only place that asks
    // for a verified place.
    expect(authority).toContain("eq(cities.status, 'verified')");
    expect(authority).toContain("eq(suburbs.status, 'verified')");
  });

  it('keeps a place page reachable for a place that is not published as a guide', () => {
    const pages = source('server/services/locationPagesService.ts');
    // A place page resolves on its own identity and its parent's identity, and does not
    // require the place to be published.
    expect(pages).not.toContain("eq(suburbs.status, 'verified')");
    expect(pages).not.toContain("eq(cities.status, 'verified')");
  });
});
