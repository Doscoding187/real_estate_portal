import { describe, expect, it } from 'vitest';
import { getTableName, type SQL } from 'drizzle-orm';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
import {
  canonicalPlaceSearchMembers,
  loadCanonicalPlaceSearchProjection,
  projectSearchPlace,
  type SearchPlaceNode,
} from '../canonicalPlaceSearchService';
import type { PlaceReadDatabase } from '../placeDiscoveryService';

const node = (placeId: string, searchScope: string | null): SearchPlaceNode => ({
  placeId,
  searchScope,
  lifecycleStatus: 'active',
  searchEligible: searchScope ? 1 : 0,
  placeType:
    searchScope === 'province' ? 'province' : searchScope === 'metro_city' ? 'city' : 'locality',
});

describe('fresh request-scoped Place reads', () => {
  function fixtureReader() {
    const nodes = graph();
    const edges = [
      { from: 'north', to: 'municipality' },
      { from: 'municipality', to: 'gp' },
      { from: 'city', to: 'gp' },
      { from: 'other', to: 'wc' },
    ];
    const names = [...nodes.keys()].map(placeId => ({ placeId, name: placeId }));
    const readIds: string[] = [];
    const dialect = new MySqlDialect();
    // Evaluate the real parameterized query boundary against a small factual graph.
    const database = {
      select() {
        let table = '';
        const query = {
          from(value: Parameters<typeof getTableName>[0]) {
            table = getTableName(value);
            return query;
          },
          leftJoin() {
            return query;
          },
          async where(condition: SQL) {
            const params = dialect.sqlToQuery(condition).params;
            const ids = params.filter(
              (id): id is string =>
                typeof id === 'string' &&
                !['administratively_contains', 'preferred_public', 'active'].includes(id),
            );
            if (table === 'place_name') return names.filter(row => ids.includes(row.placeId));
            if (table === 'place_relationship') {
              return edges
                .filter(edge => ids.includes(edge.to))
                .map(edge => ({ placeId: edge.from }));
            }
            readIds.push(...ids);
            return ids.flatMap(id => {
              const selected = nodes.get(id);
              if (!selected) return [];
              const parents = edges.filter(edge => edge.from === id);
              return parents.length
                ? parents.map(edge => ({ ...selected, parentId: edge.to }))
                : [{ ...selected, parentId: null }];
            });
          },
        };
        return query;
      },
    } as unknown as PlaceReadDatabase;
    return { database, nodes, edges, names, readIds };
  }

  it('reads complete context ancestry without loading unrelated identities or city descendants', async () => {
    const fixture = fixtureReader();
    const projection = await loadCanonicalPlaceSearchProjection(fixture.database, {
      placeIds: ['north', 'north'],
      includeProvinceMembers: true,
    });
    expect(projection.labels.get('north')).toMatchObject({
      locality: 'north',
      province: 'gp',
      city: '',
    });
    expect(fixture.readIds).toEqual(['north', 'municipality', 'gp']);
    const exactCity = await loadCanonicalPlaceSearchProjection(fixture.database, {
      placeIds: ['city'],
      includeProvinceMembers: true,
    });
    expect([...exactCity.executions.keys()].sort()).toEqual(['city', 'gp']);
    expect(canonicalPlaceSearchMembers(exactCity.executions.get('city')!, exactCity)).toEqual([
      'city',
    ]);
  });

  it('traverses province context nodes but rejects a competing parent outside the selected subtree', async () => {
    const fixture = fixtureReader();
    fixture.edges.push({ from: 'north', to: 'wc' });
    const projection = await loadCanonicalPlaceSearchProjection(fixture.database, {
      placeIds: ['gp'],
      includeProvinceMembers: true,
    });
    expect(projection.labels.has('north')).toBe(false);
    expect(canonicalPlaceSearchMembers(projection.executions.get('gp')!, projection)).toEqual([
      'city',
      'gp',
    ]);
    expect(fixture.readIds).toContain('wc');
    expect(fixture.readIds).not.toContain('other');
  });

  it('does not admit or traverse descendants beneath a locality-scoped ancestor', async () => {
    const fixture = fixtureReader();
    fixture.nodes.set('invalid-descendant', node('invalid-descendant', 'locality'));
    fixture.edges.push({ from: 'invalid-descendant', to: 'north' });
    fixture.names.push({ placeId: 'invalid-descendant', name: 'Invalid descendant' });
    const projection = await loadCanonicalPlaceSearchProjection(fixture.database, {
      placeIds: ['gp'],
      includeProvinceMembers: true,
    });
    expect(canonicalPlaceSearchMembers(projection.executions.get('gp')!, projection)).toEqual([
      'city',
      'gp',
      'north',
    ]);
    expect(fixture.readIds).not.toContain('invalid-descendant');
  });

  it('observes changed names and parent lifecycle on the next request and rejects duplicate preferred names', async () => {
    const fixture = fixtureReader();
    const options = { placeIds: ['north'] };
    expect(
      (await loadCanonicalPlaceSearchProjection(fixture.database, options)).labels.get('north')
        ?.label,
    ).toBe('north');
    fixture.names.find(name => name.placeId === 'north')!.name = 'Renamed locality';
    expect(
      (await loadCanonicalPlaceSearchProjection(fixture.database, options)).labels.get('north')
        ?.label,
    ).toBe('Renamed locality');
    fixture.names.push({ placeId: 'gp', name: 'Competing province name' });
    expect(
      (await loadCanonicalPlaceSearchProjection(fixture.database, options)).labels.has('north'),
    ).toBe(false);
    fixture.nodes.get('municipality')!.lifecycleStatus = 'retired';
    expect(
      (await loadCanonicalPlaceSearchProjection(fixture.database, options)).executions.has('north'),
    ).toBe(false);
  });

  it('does not query the national graph for empty or unknown requested identities', async () => {
    const fixture = fixtureReader();
    const empty = await loadCanonicalPlaceSearchProjection(fixture.database, { placeIds: [] });
    expect(empty.labels.size).toBe(0);
    expect(fixture.readIds).toEqual([]);
    const unknown = await loadCanonicalPlaceSearchProjection(fixture.database, {
      placeIds: ['unknown'],
    });
    expect(unknown.executions.size).toBe(0);
    expect(fixture.readIds).toEqual(['unknown']);
  });
});
const graph = () =>
  new Map([
    ['gp', node('gp', 'province')],
    ['wc', node('wc', 'province')],
    ['city', node('city', 'metro_city')],
    ['municipality', node('municipality', null)],
    ['north', node('north', 'locality')],
    ['other', node('other', 'locality')],
  ]);

describe('approved Place inventory scope policy', () => {
  it('includes provincial members through context without inventing a city', () => {
    const nodes = graph();
    const parents = new Map([
      ['municipality', ['gp']],
      ['north', ['municipality']],
      ['other', ['wc']],
      ['city', ['gp']],
    ]);
    const executions = new Map(
      Array.from(nodes.keys()).flatMap(id => {
        const result = projectSearchPlace(id, nodes, parents);
        return result.ok ? [[id, result.execution] as const] : [];
      }),
    );
    expect(executions.get('north')?.cityPlaceId).toBeNull();
    const labels = new Map(Array.from(executions.keys()).map(id => [id, {} as any]));
    expect(canonicalPlaceSearchMembers(executions.get('gp')!, { executions, labels })).toEqual([
      'city',
      'gp',
      'north',
    ]);
    expect(canonicalPlaceSearchMembers(executions.get('north')!, { executions, labels })).toEqual([
      'north',
    ]);
  });

  it('keeps city assignment exact despite a factual descendant and market membership', () => {
    const nodes = graph();
    const parents = new Map([
      ['city', ['gp']],
      ['north', ['city']],
    ]);
    const selected = projectSearchPlace('city', nodes, parents);
    const descendant = projectSearchPlace('north', nodes, parents);
    expect(selected.ok && descendant.ok).toBe(true);
    if (!selected.ok || !descendant.ok) throw new Error('Test graph must execute');
    const executions = new Map([
      ['city', selected.execution],
      ['north', descendant.execution],
    ]);
    const labels = new Map([
      ['city', {} as any],
      ['north', {} as any],
    ]);
    expect(canonicalPlaceSearchMembers(selected.execution, { executions, labels })).toEqual([
      'city',
    ]);
  });

  it.each(['multiple', 'missing', 'retired', 'cycle', 'inverted', 'malformed', 'unbounded'])(
    'refuses a %s authoritative chain',
    fault => {
      const nodes = graph();
      const parents = new Map([
        ['north', ['municipality']],
        ['municipality', ['gp']],
      ]);
      if (fault === 'multiple') parents.set('municipality', ['gp', 'wc']);
      if (fault === 'missing') nodes.delete('municipality');
      if (fault === 'retired') nodes.get('municipality')!.lifecycleStatus = 'retired';
      if (fault === 'cycle') parents.set('gp', ['north']);
      if (fault === 'inverted') nodes.get('municipality')!.searchScope = 'locality';
      if (fault === 'malformed') nodes.get('municipality')!.searchScope = 'invalid';
      if (fault === 'unbounded') parents.delete('municipality');
      expect(projectSearchPlace('north', nodes, parents).ok).toBe(false);
    },
  );

  it('refuses an exhausted chain and a retired or non-searchable selected identity', () => {
    const nodes = graph();
    const parents = new Map<string, string[]>();
    let child = 'north';
    for (let index = 0; index < 9; index++) {
      const id = `context-${index}`;
      nodes.set(id, node(id, null));
      parents.set(child, [id]);
      child = id;
    }
    parents.set(child, ['gp']);
    expect(projectSearchPlace('north', nodes, parents).ok).toBe(false);
    nodes.get('north')!.searchEligible = 0;
    expect(projectSearchPlace('north', nodes, new Map([['north', ['gp']]])).ok).toBe(false);
    nodes.get('north')!.lifecycleStatus = 'retired';
    expect(projectSearchPlace('north', nodes, new Map()).ok).toBe(false);
  });
});
