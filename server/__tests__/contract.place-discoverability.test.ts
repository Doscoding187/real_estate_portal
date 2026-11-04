import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  canonicalPlaceUrlByPath,
  canonicalPlaceUrlRedirectByPath,
} from '../services/canonicalPlaceUrlService';
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

  it('publishes safe area pages independently of provisional review status', () => {
    const gauteng = canonicalPlaceUrlByPath('/gauteng');
    expect(gauteng).toMatchObject({
      place_type: 'province',
      search_eligible: true,
      publication_eligible: true,
      verification_status: 'provisional',
    });
    expect(resolveSeoPageData('/gauteng')).toMatchObject({
      canonicalUrl: 'https://www.propertylistifysa.co.za/gauteng',
      robots: 'index, follow',
    });

    const kyalami = canonicalPlaceUrlByPath('/gauteng/city-of-johannesburg/kyalami');
    expect(kyalami).toMatchObject({
      preferred_public_name: 'Kyalami',
      place_type: 'suburb',
      search_eligible: true,
      publication_eligible: true,
      verification_status: 'verified',
    });
    expect(kyalami?.source_attributions).toContainEqual(
      expect.objectContaining({
        provider: 'geonames',
        label: 'GeoNames geographic database',
      }),
    );
    expect(resolveSeoPageData('/gauteng/city-of-johannesburg/kyalami').robots).toBe('index, follow');
  });

  it('uses Centurion as the canonical label and permanently redirects the former path', () => {
    const centurion = canonicalPlaceUrlByPath('/gauteng/centurion');
    expect(centurion).toMatchObject({
      place_id: 'pl-place-01-1a30ae4d635ef747d6c987df',
      preferred_public_name: 'Centurion',
      search_scope: 'metro_city',
      publication_eligible: true,
    });
    expect(canonicalPlaceUrlRedirectByPath('/gauteng/lyttelton')).toMatchObject({
      target_path: '/gauteng/centurion',
      target_place_id: 'pl-place-01-1a30ae4d635ef747d6c987df',
      status_code: 308,
    });
  });

  it('does not restore a reviewed demotion as a former city URL alias', () => {
    expect(canonicalPlaceUrlByPath('/gauteng/antwerp')).toBeNull();
    expect(canonicalPlaceUrlByPath('/gauteng/johannesburg/antwerp')).not.toBeNull();
  });
});
