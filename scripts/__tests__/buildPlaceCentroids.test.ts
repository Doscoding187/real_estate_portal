import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  buildPlaceCentroids,
  normaliseGridCode,
  precisionOf,
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

describe('precisionOf', () => {
  it('marks whole arc-minute coordinates coarse and others normal', () => {
    expect(precisionOf(-26.2, 28.083333)).toBe('coarse');
    expect(precisionOf(-26.166667, 27.883333)).toBe('coarse');
    expect(precisionOf(-26.2, 28.0841)).toBe('normal');
    expect(precisionOf(-26.17562, 28.083333)).toBe('normal');
    expect(precisionOf(null, null)).toBe('normal');
  });

  it('is set on every output entry without changing coordinates', () => {
    const grid = entry('/gauteng/localities/c-e-1', 'C.E. 1', 'locality');
    const { output } = buildPlaceCentroids({
      rows: [row('gauteng/vanderbijlpark/ce1', 'CE1', 'suburb', null, -26.2, 28.083333)],
      entries: [grid],
      overrides: [],
    });
    expect(output[0]).toMatchObject({ lat: -26.2, lng: 28.083333, precision: 'coarse' });
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
      rows: [cityRow, row('gauteng/melton', 'Melton', 'city', 'gauteng', -26.7, 28.05)],
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
      external: ext(-26.7, 28.0),
    });
    expect(find(output, locality.place_id)).toBeUndefined();
    expect(externalRejected[0].reason).toMatch(/km from parent/);
  });
});

describe('derived parent centres, box and sibling rule', () => {
  // A city row without coordinates and N centred child localities (tier 1 exact paths).
  const noCentreCity = row('gauteng/citytown', 'Citytown', 'city', 'gauteng');
  const kids = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      entry: entry(`/gauteng/citytown/kid${index}`, `Kid${index}`, 'locality', ctx),
      row: row(
        `gauteng/citytown/kid${index}`,
        `Kid${index}`,
        'suburb',
        'gauteng/citytown',
        -26.0 - index * 0.01,
        28.0 + index * 0.01,
      ),
    }));
  const melton = entry('/gauteng/citytown/melton', 'Melton', 'locality', ctx);
  const meltonRow = (lat: number, lng: number) =>
    row('gauteng/melton', 'Melton', 'city', 'gauteng', lat, lng);
  const build = (
    childCount: number,
    melLat: number,
    melLng: number,
    extra: ExternalFile | null = null,
  ) => {
    const children = kids(childCount);
    return buildPlaceCentroids({
      rows: [noCentreCity, ...children.map(k => k.row), meltonRow(melLat, melLng)],
      entries: [CITY, ...children.map(k => k.entry), melton],
      overrides: [],
      external: extra,
    });
  };

  it('derives the median of at least three internal children and uses it for the bridge', () => {
    const result = build(3, -26.01, 28.01);
    expect(result.derivedParentCentres).toEqual([
      { naturalKey: 'gauteng/citytown', lat: -26.01, lng: 28.01, childCount: 4 },
    ]);
    // The derived centre is metadata only: the city entry keeps no coordinates.
    expect(find(result.output, CITY.place_id)).toMatchObject({ lat: null, lng: null });
    expect(find(result.output, melton.place_id)).toMatchObject({
      matchMethod: 'tier4_level_bridge',
    });
  });

  it('needs three children: two give no derived centre', () => {
    // Melton is 40 km from the kids, so only the 15 km sibling rule could admit it: it fails.
    const result = build(2, -26.4, 28.0);
    expect(result.derivedParentCentres).toEqual([]);
    expect(find(result.output, melton.place_id)).toBeUndefined();
  });

  it('derives from internal tiers only, never from external rows', () => {
    const children = kids(2);
    const extra = entry('/gauteng/citytown/extra', 'Extra', 'locality', ctx);
    const result = buildPlaceCentroids({
      rows: [noCentreCity, ...children.map(k => k.row)],
      entries: [CITY, ...children.map(k => k.entry), extra],
      overrides: [],
      external: external([
        {
          naturalKey: 'gauteng/citytown/extra',
          lat: -26.05,
          lng: 28.05,
          qid: 'Q2',
          label: 'Extra',
        },
      ]),
    });
    expect(result.derivedParentCentres).toEqual([]);
    // Two internal children: no derived centre, but the external point is within 15 km of one.
    expect(find(result.output, extra.place_id)).toMatchObject({ matchMethod: 'external_wikidata' });
  });

  it('sibling rule: without a parent centre, a bridge must be within 15 km of a sibling', () => {
    expect(find(build(2, -26.05, 28.05).output, melton.place_id)).toMatchObject({
      matchMethod: 'tier4_level_bridge',
    });
    expect(find(build(2, -26.4, 28.0).output, melton.place_id)).toBeUndefined();
  });

  it('applies the sibling rule to external rows too', () => {
    const near = entry('/gauteng/citytown/near', 'Near', 'locality', ctx);
    const far = entry('/gauteng/citytown/far', 'Far', 'locality', ctx);
    const children = kids(2);
    const result = buildPlaceCentroids({
      rows: [noCentreCity, ...children.map(k => k.row)],
      entries: [CITY, ...children.map(k => k.entry), near, far],
      overrides: [],
      external: external([
        { naturalKey: 'gauteng/citytown/near', lat: -26.02, lng: 28.02, qid: 'Q3', label: 'Near' },
        { naturalKey: 'gauteng/citytown/far', lat: -26.4, lng: 28.4, qid: 'Q4', label: 'Far' },
      ]),
    });
    expect(find(result.output, near.place_id)).toBeDefined();
    expect(find(result.output, far.place_id)).toBeUndefined();
    expect(result.externalRejected[0].reason).toMatch(/sibling/);
  });

  it('uses a 40 km external limit when the parent centre is known', () => {
    const locality = entry('/gauteng/citytown/fillville', 'Fillville', 'locality', ctx);
    const result = buildPlaceCentroids({
      rows: [cityRow],
      entries: [CITY, locality],
      overrides: [],
      external: external([
        { naturalKey: 'gauteng/citytown/fillville', lat: -26.5, lng: 28.0, qid: 'Q5', label: 'F' },
      ]),
    });
    expect(find(result.output, locality.place_id)).toBeUndefined();
    expect(result.externalRejected[0].reason).toMatch(/km from parent city centre/);
  });

  it('rejects any centre outside the Gauteng box, internal or external, with a log line', () => {
    const locality = entry('/gauteng/citytown/fillville', 'Fillville', 'locality', ctx);
    const outside = entry('/gauteng/citytown/outside', 'Outside', 'locality', ctx);
    const result = buildPlaceCentroids({
      rows: [
        cityRow,
        row('gauteng/citytown/outside', 'Outside', 'suburb', 'gauteng/citytown', -33.9, 18.4),
      ],
      entries: [CITY, locality, outside],
      overrides: [],
      external: external([
        { naturalKey: 'gauteng/citytown/fillville', lat: -24.0, lng: 28.0, qid: 'Q6', label: 'F' },
      ]),
    });
    expect(find(result.output, outside.place_id)).toMatchObject({ lat: null, lng: null });
    expect(find(result.output, locality.place_id)).toBeUndefined();
    expect(result.boxRejected.map(item => item.naturalKey).sort()).toEqual([
      'gauteng/citytown/fillville',
      'gauteng/citytown/outside',
    ]);
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
    '/gauteng/city-of-johannesburg/rivonia',
    '/gauteng/johannesburg/melville',
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
