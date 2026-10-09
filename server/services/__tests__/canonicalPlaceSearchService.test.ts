import { describe, expect, it } from 'vitest';
import {
  canonicalPlaceSearchMembers,
  projectSearchPlace,
  type SearchPlaceNode,
} from '../canonicalPlaceSearchService';

const node = (placeId: string, searchScope: string | null): SearchPlaceNode => ({
  placeId,
  searchScope,
  lifecycleStatus: 'active',
  searchEligible: searchScope ? 1 : 0,
  placeType:
    searchScope === 'province' ? 'province' : searchScope === 'metro_city' ? 'city' : 'locality',
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
