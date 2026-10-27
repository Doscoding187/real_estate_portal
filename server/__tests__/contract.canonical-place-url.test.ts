import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { canonicalPlaceUrlByPath } from '../services/canonicalPlaceUrlService';
import { slugifyCanonicalPlaceUrl } from '../../shared/canonicalPlaceUrlProjection';

const ROOT = path.resolve(import.meta.dirname, '../..');
const PROJECTION_PATH = path.join(ROOT, 'data/place-url-projection-national-v0.1.json');
const CORRECTIONS_PATH = path.join(
  ROOT,
  'data/gauteng-city-scope-correction-v0.1/place_corrections.jsonl',
);

function projection() {
  return JSON.parse(readFileSync(PROJECTION_PATH, 'utf8'));
}

function correctionRows() {
  return readFileSync(CORRECTIONS_PATH, 'utf8')
    .trim()
    .split('\n')
    .map(line => JSON.parse(line));
}

describe('canonical Place URLs', () => {
  it('has one collision-free exact path for each admitted searchable Place', () => {
    const current = projection();
    const entries = current.entries as Array<{ place_id: string; path: string }>;
    const paths = entries.map(entry => entry.path);
    const placeIds = entries.map(entry => entry.place_id);

    expect(current.projection_id).toBe(
      'property-listify-national-canonical-place-url-projection-v0.1',
    );
    expect(current.path_policy.legacy_aliases).toBe('none');
    expect(entries).toHaveLength(14_808);
    expect(new Set(paths).size).toBe(paths.length);
    expect(new Set(placeIds).size).toBe(placeIds.length);
    expect(
      entries.every(entry => canonicalPlaceUrlByPath(entry.path)?.place_id === entry.place_id),
    ).toBe(true);
  });

  it('keeps the 13 retained Johannesburg city routes at their canonical paths', () => {
    const entries = projection().entries as Array<{
      preferred_public_name: string;
      search_scope: string;
      path: string;
    }>;
    const retained = [
      'Chartwell',
      'Diepsloot',
      'Ennerdale',
      'Farmall',
      'Johannesburg',
      'Kaalfontein',
      'Lawley',
      'Lenasia',
      'Midrand',
      'Randburg',
      'Roodepoort',
      'Soweto',
      'Tshepisong',
    ];

    expect(retained).toHaveLength(13);
    for (const name of retained) {
      expect(
        entries
          .filter(
            entry => entry.preferred_public_name === name && entry.search_scope === 'metro_city',
          )
          .map(entry => entry.path),
      ).toContain(`/gauteng/${slugifyCanonicalPlaceUrl(name)}`);
    }
  });

  it('applies the reviewed 48 demotions without keeping their former city URLs as aliases', () => {
    const entries = projection().entries as Array<{
      place_id: string;
      preferred_public_name: string;
      search_scope: string;
      path: string;
      path_context: { relationship_type: string } | null;
    }>;
    const byPlaceId = new Map(entries.map(entry => [entry.place_id, entry]));
    const corrections = correctionRows();

    expect(corrections).toHaveLength(48);
    for (const correction of corrections) {
      const entry = byPlaceId.get(correction.place_id);
      const formerCityPath = `/gauteng/${slugifyCanonicalPlaceUrl(correction.name)}`;
      expect(entry, correction.name).toBeDefined();
      expect(entry?.preferred_public_name).toBe(correction.name);
      expect(entry?.search_scope).toBe('locality');
      expect(entry?.path).not.toBe(formerCityPath);
      expect(canonicalPlaceUrlByPath(formerCityPath), formerCityPath).toBeNull();
    }
  });

  it('uses reviewed settlement membership only for the 351 authored locality contexts', () => {
    const entries = projection().entries as Array<{
      search_scope: string;
      path_context: { relationship_type: string } | null;
    }>;
    const settlementContexts = entries.filter(
      entry =>
        entry.search_scope === 'locality' &&
        entry.path_context?.relationship_type === 'settlement_within',
    );
    expect(settlementContexts).toHaveLength(351);
    expect(
      entries.some(
        entry =>
          entry.path_context?.relationship_type === 'settlement_within' &&
          entry.search_scope !== 'locality',
      ),
    ).toBe(false);
  });
});
