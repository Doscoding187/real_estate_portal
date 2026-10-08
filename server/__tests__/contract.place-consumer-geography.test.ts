import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizePlaceQuery, projectPlaceScope } from '../../shared/placeAuthority';
import { loadPlaceAdmissionTerritoryRegistry } from '../../shared/placeAdmissionTerritories';
import { loadCanonicalPlacePackage } from '../_core/databaseAuthority/dataAdapters/canonicalPlaces';

const { select } = vi.hoisted(() => ({ select: vi.fn() }));
vi.mock('../db', () => ({ getDb: async () => ({ select }) }));
import {
  discoverPlaces,
  executePlace,
  loadDiscoveryContainmentAncestries,
} from '../services/placeDiscoveryService';

const selected = {
  placeId: 'pl-place-01-000000000000000000000001',
  lifecycleStatus: 'active',
  searchEligible: 1,
  searchScope: 'locality',
};
const provinceId = 'pl-place-01-000000000000000000000002';
const contextId = 'pl-place-01-000000000000000000000003';

// Only the SQL transport is substituted. The production reader and scope
// projector decide whether a graph is executable; there is no database setup.
function queryRows(rows: unknown[]) {
  const query: any = {};
  for (const method of ['from', 'innerJoin', 'leftJoin', 'where']) query[method] = () => query;
  query.limit = () => Promise.resolve(rows);
  query.then = (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve);
  select.mockReturnValueOnce(query);
}

beforeEach(() => select.mockReset());

describe('Place consumers refuse malformed containment', () => {
  it('does not select the first of two administrative parents', async () => {
    queryRows([selected]);
    queryRows([{ toPlaceId: provinceId }, { toPlaceId: contextId }]);
    expect(await executePlace(selected.placeId)).toEqual({
      ok: false,
      reason: 'unresolved_parent',
    });
  });

  it('refuses a cycle even after finding a valid province', async () => {
    queryRows([selected]);
    queryRows([{ toPlaceId: provinceId }]);
    queryRows([{ scope: 'province', lifecycleStatus: 'active' }]);
    queryRows([{ toPlaceId: selected.placeId }]);
    expect(await executePlace(selected.placeId)).toEqual({
      ok: false,
      reason: 'containment_cycle',
    });
  });

  it.each([
    { rows: [] },
    { rows: [{ scope: 'province', lifecycleStatus: 'retired' }] },
    { rows: [{ scope: 'unsupported', lifecycleStatus: 'active' }] },
  ])('refuses a missing, retired or invalid parent: $rows', async ({ rows }) => {
    queryRows([selected]);
    queryRows([{ toPlaceId: provinceId }]);
    queryRows(rows);
    expect(await executePlace(selected.placeId)).toEqual({
      ok: false,
      reason: 'unresolved_parent',
    });
  });

  it('refuses an exhausted traversal instead of returning its province prefix', async () => {
    queryRows([selected]);
    for (let index = 0; index < 8; index++) {
      queryRows([{ toPlaceId: `ancestor-${index}` }]);
      queryRows([{ scope: index === 7 ? 'province' : null, lifecycleStatus: 'active' }]);
    }
    expect(await executePlace(selected.placeId)).toEqual({
      ok: false,
      reason: 'unresolved_parent',
    });
  });

  it('keeps a locality executable without inventing a city above its municipality', async () => {
    queryRows([selected]);
    queryRows([{ toPlaceId: contextId }]);
    queryRows([{ scope: null, lifecycleStatus: 'active' }]);
    queryRows([{ toPlaceId: provinceId }]);
    queryRows([{ scope: 'province', lifecycleStatus: 'active' }]);
    queryRows([]);
    expect(await executePlace(selected.placeId)).toEqual({
      ok: true,
      execution: {
        placeId: selected.placeId,
        scope: 'locality',
        provincePlaceId: provinceId,
        cityPlaceId: null,
        localityPlaceId: selected.placeId,
        contextAncestorPlaceIds: [contextId],
      },
    });
  });

  it('propagates transport failure rather than presenting a geography refusal', async () => {
    queryRows([selected]);
    select.mockImplementationOnce(() => {
      throw new Error('transport unavailable');
    });
    await expect(executePlace(selected.placeId)).rejects.toThrow('transport unavailable');
  });
});

describe('National Place disambiguation', () => {
  it.each([
    ['Noord-Kaap', 'noord kaap'],
    ['  Noord   Kaap  ', 'noord kaap'],
    ['Északnyugati Tartomány', 'eszaknyugati tartomany'],
    ['Северозападна провинция', 'северозападна провинция'],
    ['북부 케이프', '북부 케이프'],
  ])('normalizes the recorded name and typed query identically: %s', (name, expected) => {
    expect(normalizePlaceQuery(name)).toBe(expected);
    expect(normalizePlaceQuery(expected)).toBe(expected);
  });
  it('retains provincial and municipality context without coercing a missing city', async () => {
    queryRows([
      {
        ...selected,
        placeType: 'locality',
        placeClassification: 'statutory',
        verificationStatus: 'verified',
        publicationEligible: 1,
        name: 'Shared Name',
        normalizedName: 'shared name',
        nameRole: 'preferred_public',
      },
    ]);
    queryRows([
      {
        fromPlaceId: selected.placeId,
        toPlaceId: contextId,
        scope: null,
        lifecycleStatus: 'active',
      },
    ]);
    queryRows([
      {
        fromPlaceId: contextId,
        toPlaceId: provinceId,
        scope: 'province',
        lifecycleStatus: 'active',
      },
    ]);
    queryRows([]);
    queryRows([
      { placeId: provinceId, name: 'Province A' },
      { placeId: contextId, name: 'Municipality A' },
    ]);
    queryRows([{ placeId: selected.placeId, name: 'Shared Name', nameRole: 'preferred_public' }]);
    const result = await discoverPlaces('Shared Name', { recordCoverage: false });
    expect(result.results[0].context).toEqual({
      provincePlaceId: provinceId,
      cityPlaceId: null,
      localityPlaceId: null,
      administrativeContext: 'Province A / Municipality A',
    });
  });
});

describe('Scope projection cannot conceal malformed ancestry', () => {
  const place = { ...selected, searchEligible: true, searchScope: 'locality' as const };
  it('refuses repeated province tiers', () => {
    expect(
      projectPlaceScope(place, [
        { placeId: contextId, scope: 'province' },
        { placeId: provinceId, scope: 'province' },
      ]),
    ).toEqual({ ok: false, reason: 'unresolved_parent' });
  });
  it('refuses a self-reference', () => {
    expect(
      projectPlaceScope(place, [
        { placeId: selected.placeId, scope: null },
        { placeId: provinceId, scope: 'province' },
      ]),
    ).toEqual({ ok: false, reason: 'containment_cycle' });
  });
  it('refuses a province above another province', () => {
    expect(
      projectPlaceScope({ ...place, searchScope: 'province' }, [
        { placeId: provinceId, scope: 'province' },
      ]),
    ).toEqual({ ok: false, reason: 'unresolved_parent' });
  });
});

describe('All admitted provinces support exact consumer scope projection', () => {
  const root = process.cwd();
  const registry = loadPlaceAdmissionTerritoryRegistry(root).registry;
  it.each(registry.territories)('$displayName preserves every executable identity', territory => {
    const { rows } = loadCanonicalPlacePackage(root, { territoryId: territory.territoryId });
    const places = new Map(rows.places.map(row => [String(row.place_id), row]));
    for (const name of rows.names) {
      expect(name.normalized_name, `inconsistent name index for ${name.name}`).toBe(
        normalizePlaceQuery(name.name),
      );
      if (name.is_searchable === 1) expect(name.normalized_name).not.toBe('');
    }
    const parents = new Map<string, string[]>();
    for (const row of rows.relationships) {
      if (row.relationship_type !== 'administratively_contains') continue;
      const id = String(row.from_place_id);
      parents.set(id, [...(parents.get(id) ?? []), String(row.to_place_id)]);
    }
    const province = rows.places.find(row => row.place_type === 'province');
    expect(province).toBeDefined();
    for (const row of rows.places.filter(row => row.search_eligible === 1)) {
      const ancestry: Parameters<typeof projectPlaceScope>[1] = [];
      const seen = new Set<string>([String(row.place_id)]);
      let cursor = String(row.place_id);
      for (;;) {
        const edges = parents.get(cursor) ?? [];
        if (!edges.length) break;
        expect(edges, `ambiguous parents for ${cursor}`).toHaveLength(1);
        cursor = edges[0];
        expect(seen.has(cursor), `cycle for ${row.place_id}`).toBe(false);
        seen.add(cursor);
        const parent = places.get(cursor);
        expect(parent, `missing parent for ${row.place_id}`).toBeDefined();
        ancestry.push({
          placeId: cursor,
          scope: parent!.search_scope as Parameters<typeof projectPlaceScope>[0]['searchScope'],
        });
      }
      const resolution = projectPlaceScope(
        {
          placeId: String(row.place_id),
          lifecycleStatus: String(row.lifecycle_status),
          searchEligible: true,
          searchScope: row.search_scope as Parameters<typeof projectPlaceScope>[0]['searchScope'],
        },
        ancestry,
      );
      expect(resolution, `non-executable approved Place ${row.place_id}`).toMatchObject({
        ok: true,
        execution: { placeId: row.place_id, provincePlaceId: province!.place_id },
      });
      if (resolution.ok && row.search_scope === 'locality') {
        expect(resolution.execution.localityPlaceId).toBe(row.place_id);
        const city = ancestry.find(node => node.scope === 'metro_city');
        expect(resolution.execution.cityPlaceId).toBe(city?.placeId ?? null);
      }
    }
  });
});

describe('batched discovery ancestry preserves containment authority', () => {
  const edge = (
    fromPlaceId: string,
    toPlaceId: string,
    scope: string | null = null,
    lifecycleStatus: string | null = 'active',
  ) => ({ fromPlaceId, toPlaceId, scope, lifecycleStatus });
  const read = (ids: string[]) => loadDiscoveryContainmentAncestries(ids, { select } as any);

  it('reads shared parents once and preserves input order including duplicate identities', async () => {
    queryRows([edge('a', 'municipality'), edge('b', 'municipality')]);
    queryRows([edge('municipality', 'province', 'province')]);
    queryRows([]);
    const chain = [
      { placeId: 'municipality', scope: null },
      { placeId: 'province', scope: 'province' },
    ];
    expect(await read(['b', 'a', 'b'])).toEqual([chain, chain, chain]);
    expect(select).toHaveBeenCalledTimes(3);
  });

  it('rejects competing parents', async () => {
    queryRows([edge('a', 'p1', 'province'), edge('a', 'p2', 'province')]);
    queryRows([]);
    await expect(read(['a'])).rejects.toThrow('unresolved_parent');
  });

  it.each([
    ['province', null],
    ['province', 'retired'],
    ['unsupported', 'active'],
  ])('rejects invalid parent scope/status %s/%s', async (scope, status) => {
    queryRows([edge('a', 'p', scope, status)]);
    queryRows([]);
    await expect(read(['a'])).rejects.toThrow('unresolved_parent');
  });

  it('rejects a cycle after an apparently valid province', async () => {
    queryRows([edge('a', 'p', 'province')]);
    queryRows([edge('p', 'a', 'locality')]);
    await expect(read(['a'])).rejects.toThrow('containment_cycle');
  });

  it('rejects exhausted ancestry without returning partial authority', async () => {
    for (let i = 0; i < 8; i++) queryRows([edge(String(i), String(i + 1))]);
    await expect(read(['0'])).rejects.toThrow('unresolved_parent');
  });

  it('propagates a database failure', async () => {
    select.mockImplementationOnce(() => {
      throw new Error('transport unavailable');
    });
    await expect(read(['a'])).rejects.toThrow('transport unavailable');
  });
});
