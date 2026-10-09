import { describe, expect, it } from 'vitest';
import {
  loadCanonicalPlaceSearchProjection,
  canonicalPlaceSearchMembers,
} from '../services/canonicalPlaceSearchService';
import { executePlace } from '../services/placeDiscoveryService';
import { publicSearchService } from '../services/publicSearchService';

describe('prepared canonical Place inventory authority', () => {
  it('agrees with the established execution reader for the required admitted identities', async () => {
    const projection = await loadCanonicalPlaceSearchProjection();
    for (const id of [
      'pl-place-01-6a145c6d642ba208a2c12de7',
      'pl-place-01-f175328139bb845a4645b9d4',
      'pl-place-01-99b91be60755ea1f09bf6349',
      'pl-place-01-1a30ae4d635ef747d6c987df',
      'pl-place-01-131e3e75ad70424e0f9c869a',
    ]) {
      const established = await executePlace(id);
      if (!established.ok) throw new Error(`Required admitted Place unavailable: ${id}`);
      expect(projection.executions.get(id)).toEqual(established.execution);
      expect(projection.labels.has(id)).toBe(true);
      const requested = await loadCanonicalPlaceSearchProjection(undefined, { placeIds: [id] });
      expect(requested.executions.get(id)).toEqual(established.execution);
      expect(requested.labels.get(id)).toEqual(projection.labels.get(id));
    }
    const north = projection.labels.get('pl-place-01-6a145c6d642ba208a2c12de7')!;
    expect(north).toMatchObject({
      label: 'North Riding',
      locality: 'North Riding',
      city: '',
      province: 'Gauteng',
    });
    const gp = projection.executions.get('pl-place-01-131e3e75ad70424e0f9c869a')!;
    const members = canonicalPlaceSearchMembers(gp, projection);
    const provinceProjection = await loadCanonicalPlaceSearchProjection(undefined, {
      placeIds: [gp.placeId],
      includeProvinceMembers: true,
    });
    expect(canonicalPlaceSearchMembers(gp, provinceProjection)).toEqual(members);
    expect(members).toContain(north.canonicalPlaceId);
    expect(members.every(id => projection.executions.get(id)?.provincePlaceId === gp.placeId)).toBe(
      true,
    );
    const soweto = projection.executions.get('pl-place-01-99b91be60755ea1f09bf6349')!;
    expect(canonicalPlaceSearchMembers(soweto, projection)).toEqual([soweto.placeId]);
  });

  it('reports unsupported Place-scoped development inventory without querying broader geography', async () => {
    expect(
      await publicSearchService.searchInventory({
        canonicalPlaceId: 'pl-place-01-6a145c6d642ba208a2c12de7',
        listingType: 'sale',
        listingSource: 'development',
      }),
    ).toMatchObject({ locationState: 'unavailable', cards: [], total: 0 });
  });

  it('refuses an unknown exact identity without returning country inventory', async () => {
    const result = await publicSearchService.searchInventory({
      canonicalPlaceId: 'pl-place-01-000000000000000000000000',
      listingType: 'sale',
    });
    expect(result).toMatchObject({ locationState: 'unavailable', cards: [], total: 0 });
  });
});
