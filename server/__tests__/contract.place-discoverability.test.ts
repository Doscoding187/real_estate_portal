import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { canonicalPlaceUrlByPath } from '../services/canonicalPlaceUrlService';
import { resolveSeoPageData } from '../_core/seoHead';

const ROOT = path.resolve(import.meta.dirname, '../..');
const PROJECTION = JSON.parse(
  readFileSync(path.join(ROOT, 'data/place-url-projection-national-v0.1.json'), 'utf8'),
);

describe('canonical Place discoverability and publication gates', () => {
  it('routes searchable Places by their admitted identity', () => {
    const entries = PROJECTION.entries as Array<{
      place_id: string;
      search_eligible: boolean;
      path: string;
    }>;
    const searchable = entries.filter(entry => entry.search_eligible);

    expect(searchable.length).toBeGreaterThan(0);
    for (const entry of searchable) {
      expect(canonicalPlaceUrlByPath(entry.path)?.place_id).toBe(entry.place_id);
    }
  });

  it('keeps searchability separate from publication eligibility', () => {
    const gauteng = canonicalPlaceUrlByPath('/gauteng');
    expect(gauteng).toMatchObject({
      place_type: 'province',
      search_eligible: true,
      publication_eligible: false,
    });
    expect(resolveSeoPageData('/gauteng')).toMatchObject({
      canonicalUrl: 'https://www.propertylistifysa.co.za/gauteng',
      robots: 'noindex, follow',
    });
  });

  it('does not restore a reviewed demotion as a former city URL alias', () => {
    expect(canonicalPlaceUrlByPath('/gauteng/antwerp')).toBeNull();
    expect(canonicalPlaceUrlByPath('/gauteng/johannesburg/antwerp')).not.toBeNull();
  });
});
