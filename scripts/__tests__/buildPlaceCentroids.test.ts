import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  buildPlaceCentroids,
  normaliseGridCode,
  type ExternalFile,
  type PlaceCentroidEntry,
  type SourceRow,
  type UrlEntry,
} from '../build-place-centroids';

const row = (
  key: string,
  name: string,
  level: 'city' | 'suburb',
  parent: string | null,
  lat?: number,
  lng?: number,
): SourceRow => ({
  runtime_storage_level: level,
  runtime_natural_key: key,
  runtime_parent_natural_key: parent,
  name,
  slug: key.split('/').pop()!,
  ...(lat === undefined ? {} : { latitude: lat, longitude: lng }),
});

const entry = (
  path: string,
  name: string,
  scope: 'metro_city' | 'locality',
  context?: { place_id: string; path_segment: string },
): UrlEntry => ({
  place_id: `pl-${path.replace(/\W+/g, '-')}`,
  preferred_public_name: name,
  search_scope: scope,
  path,
  path_segment: path.split('/').pop()!,
  province_slug: 'gauteng',
  path_context: context ?? null,
});

const CITY = entry('/gauteng/citytown', 'Citytown', 'metro_city');
const ctx = { place_id: CITY.place_id, path_segment: 'citytown' };
const cityRow = row('gauteng/citytown', 'Citytown', 'city', 'gauteng', -26.0, 28.0);

const external = (entries: ExternalFile['entries']): ExternalFile => ({
  version: '0.1',
  source: {
    name: 'Wikidata',
    licence: 'CC0-1.0',
    url: 'https://query.wikidata.org',
    retrievedAt: 'x',
  },
  entries,
});

const find = (output: PlaceCentroidEntry[], placeId: string) =>
  output.find(item => item.canonicalPlaceId === placeId);

describe('normaliseGridCode', () => {
  it('treats "C.E. 1" and "CE1" as the same code, only for grid families', () => {
    expect(normaliseGridCode('C.E. 1')).toBe('ce1');
    expect(normaliseGridCode('CE1')).toBe('ce1');
    expect(normaliseGridCode('s.w. 10')).toBe('sw10');
    expect(normaliseGridCode('N.W. 7')).toBe('nw7');
    expect(normaliseGridCode('Sandton')).toBeNull();
    expect(normaliseGridCode('ES1')).toBeNull();
  });
});

describe('tier3b grid code', () => {
  it('matches CE1 to "C.E. 1" and records the method', () => {
    const grid = entry('/gauteng/localities/c-e-1', 'C.E. 1', 'locality');
    const { output } = buildPlaceCentroids({
      rows: [row('gauteng/vanderbijlpark/ce1', 'CE1', 'suburb', null, -26.7, 27.8)],
      entries: [grid],
      overrides: [],
    });
    expect(find(output, grid.place_id)).toMatchObject({
      lat: -26.7,
      matchMethod: 'tier3b_grid_code',
    });
  });

  it('does not match when two rows share the code', () => {
    const grid = entry('/gauteng/localities/c-e-1', 'C.E. 1', 'locality');
    const { output, unresolved } = buildPlaceCentroids({
      rows: [
        row('gauteng/vanderbijlpark/ce1', 'CE1', 'suburb', null, -26.7, 27.8),
        row('gauteng/vereeniging/ce1', 'CE1', 'suburb', null, -26.6, 27.9),
      ],
      entries: [grid],
      overrides: [],
    });
    expect(output).toHaveLength(0);
    expect(unresolved).toHaveLength(2);
  });
});

describe('tier4 level bridge', () => {
  const locality = entry('/gauteng/citytown/melton', 'Melton', 'locality', ctx);

  it('bridges a runtime city row to the unique URL locality near the parent city', () => {
    const { output } = buildPlaceCentroids({
      rows: [cityRow, row('gauteng/melton', 'Melton', 'city', 'gauteng', -26.05, 28.05)],
      entries: [CITY, locality],
      overrides: [],
    });
    expect(find(output, locality.place_id)).toMatchObject({
      level: 'suburb',
      parentCityPlaceId: CITY.place_id,
      lat: -26.05,
      matchMethod: 'tier4_level_bridge',
    });
  });

  it('rejects a row further than the maximum distance from the parent city', () => {
    const { output, dropped } = buildPlaceCentroids({
      rows: [cityRow, row('gauteng/melton', 'Melton', 'city', 'gauteng', -27.5, 28.05)],
      entries: [CITY, locality],
      overrides: [],
    });
    expect(find(output, locality.place_id)).toBeUndefined();
    expect(dropped[0]).toMatchObject({ method: 'tier4_level_bridge' });
  });

  it('does not bridge when the parent city has no centre', () => {
    const { output } = buildPlaceCentroids({
      rows: [
        row('gauteng/citytown', 'Citytown', 'city', 'gauteng'),
        row('gauteng/melton', 'Melton', 'city', 'gauteng', -26.05, 28.05),
      ],
      entries: [CITY, locality],
      overrides: [],
    });
    expect(find(output, locality.place_id)).toBeUndefined();
  });

  it('stays unique: two candidate URL entries mean no bridge, and one entry serves one row', () => {
    const twin = entry('/gauteng/localities/melton', 'Melton', 'locality');
    const ambiguous = buildPlaceCentroids({
      rows: [cityRow, row('gauteng/melton', 'Melton', 'city', 'gauteng', -26.05, 28.05)],
      entries: [CITY, locality, twin],
      overrides: [],
    });
    expect(find(ambiguous.output, locality.place_id)).toBeUndefined();
    expect(find(ambiguous.output, twin.place_id)).toBeUndefined();

    const duplicateRows = buildPlaceCentroids({
      rows: [
        cityRow,
        row('gauteng/melton', 'Melton', 'city', 'gauteng', -26.05, 28.05),
        row('gauteng/other/melton', 'Melton', 'city', 'gauteng', -26.06, 28.06),
      ],
      entries: [CITY, locality],
      overrides: [],
    });
    expect(find(duplicateRows.output, locality.place_id)).toBeUndefined();
  });
});

describe('external tier', () => {
  const locality = entry('/gauteng/citytown/fillville', 'Fillville', 'locality', ctx);
  const ext = (lat: number, lng: number) =>
    external([
      { naturalKey: 'gauteng/citytown/fillville', lat, lng, qid: 'Q1', label: 'Fillville' },
    ]);

  it('fills a place with no internal row, with external_wikidata provenance', () => {
    const { output, externalApplied } = buildPlaceCentroids({
      rows: [cityRow],
      entries: [CITY, locality],
      overrides: [],
      external: ext(-26.02, 28.02),
    });
    expect(externalApplied).toBe(1);
    expect(find(output, locality.place_id)).toMatchObject({
      level: 'suburb',
      parentCityPlaceId: CITY.place_id,
      lat: -26.02,
      matchMethod: 'external_wikidata',
    });
  });

  it('is read after the internal tiers: internal coordinates win', () => {
    const { output, externalRejected } = buildPlaceCentroids({
      rows: [
        cityRow,
        row('gauteng/citytown/fillville', 'Fillville', 'suburb', 'gauteng/citytown', -26.5, 28.5),
      ],
      entries: [CITY, locality],
      overrides: [],
      external: ext(-26.02, 28.02),
    });
    expect(find(output, locality.place_id)).toMatchObject({
      lat: -26.5,
      matchMethod: 'tier1_exact_path',
    });
    expect(externalRejected[0].reason).toMatch(/internal/);
  });

  it('fills a matched place whose internal row has no coordinates', () => {
    const { output } = buildPlaceCentroids({
      rows: [cityRow, row('gauteng/citytown/fillville', 'Fillville', 'suburb', 'gauteng/citytown')],
      entries: [CITY, locality],
      overrides: [],
      external: ext(-26.02, 28.02),
    });
    expect(find(output, locality.place_id)).toMatchObject({
      lat: -26.02,
      matchMethod: 'external_wikidata',
    });
  });

  it('rejects an entry further than the maximum distance from the parent city', () => {
    const { output, externalRejected } = buildPlaceCentroids({
      rows: [cityRow],
      entries: [CITY, locality],
      overrides: [],
      external: ext(-27.5, 28.0),
    });
    expect(find(output, locality.place_id)).toBeUndefined();
    expect(externalRejected[0].reason).toMatch(/km from parent/);
  });
});

describe('committed Gauteng centroid file', () => {
  const file = JSON.parse(
    readFileSync(resolve(process.cwd(), 'data/place-centroids-gauteng-v0.1.json'), 'utf8'),
  ) as { entries: PlaceCentroidEntry[] };
  const urls = (
    JSON.parse(
      readFileSync(resolve(process.cwd(), 'data/place-url-projection-national-v0.1.json'), 'utf8'),
    ) as { entries: UrlEntry[] }
  ).entries;
  const centreByPath = (path: string) => {
    const place = urls.find(item => item.path === path);
    return file.entries.find(item => item.canonicalPlaceId === place?.place_id);
  };

  it.each([
    '/gauteng/randburg/north-riding',
    '/gauteng/city-of-johannesburg/fourways',
    '/gauteng/city-of-johannesburg/bryanston',
    '/gauteng/city-of-tshwane/menlyn',
    '/gauteng/localities/c-e-1',
  ])('has a centre for %s', path => {
    const found = centreByPath(path);
    expect(found?.lat).toEqual(expect.any(Number));
    expect(found?.lng).toEqual(expect.any(Number));
  });

  it('records provenance on every centred entry and uses the new methods', () => {
    const methods = new Set(file.entries.map(item => item.matchMethod));
    expect(
      file.entries.every(item => typeof item.matchMethod === 'string' && item.matchMethod),
    ).toBe(true);
    expect(methods).toContain('external_wikidata');
    expect(methods).toContain('tier3b_grid_code');
    expect(methods).toContain('tier4_level_bridge');
  });
});
