import { describe, expect, it } from 'vitest';

import type {
  RuntimeGeographyAuthority,
  RuntimeGeographyAuthorityRecord,
} from '../runtimeGeographyAuthority';
import { SEARCH_AREA_DEFINITIONS, type SearchAreaDefinition } from '../searchAreaDefinitions';
import { SearchAreaAuthority } from '../searchAreaAuthority';
import { buildSearchAreaQueryBoundary } from '../searchAreaQueryBoundary';
import { GAUTENG_SEARCH_AREA_CANDIDATE_DEFINITIONS } from '../gautengSearchAreaCandidateDefinitions';
import { SearchDiscoveryService } from '../searchDiscoveryService';
import { selectionFromDiscoveryResult } from '../../../shared/searchDiscovery';

const ACCEPTED_SEARCH_AREA_IDS = [
  'pl-sa-gp-3b36a49ecb943c88402b07fd',
  'pl-sa-gp-9314684a28ff63402832b8df',
  'pl-sa-gp-20f043e9ba8ece627365f5ad',
  'pl-sa-gp-3aa01dbdcd93c28e0aef9119',
  'pl-sa-gp-01da060bb6c5807438a654e9',
  'pl-sa-gp-35163d1b6013797932cd94c1',
] as const;

const COLLISIONS = [
  {
    label: 'Midrand',
    factualLocationId: 'pl-gp-v01-0d7688adb9c7af392007',
    searchAreaId: 'pl-sa-gp-01da060bb6c5807438a654e9',
  },
  {
    label: 'Centurion',
    factualLocationId: 'pl-gp-v01-029159849439c2ea8783',
    searchAreaId: 'pl-sa-gp-35163d1b6013797932cd94c1',
  },
  {
    label: 'Johannesburg North',
    factualLocationId: 'pl-gp-v01-c1d935cbc90ea639eb87',
    searchAreaId: 'pl-sa-gp-3b36a49ecb943c88402b07fd',
  },
] as const;

const activeDefinitions = SEARCH_AREA_DEFINITIONS.filter(definition =>
  ACCEPTED_SEARCH_AREA_IDS.includes(
    definition.searchAreaId as (typeof ACCEPTED_SEARCH_AREA_IDS)[number],
  ),
);

function createRuntimeAuthority(
  definitions: readonly SearchAreaDefinition[] = activeDefinitions,
): RuntimeGeographyAuthority {
  const members = definitions.flatMap(definition => definition.members ?? []);
  const cityKeys = Array.from(
    new Set(
      members
        .map(member => member.runtimeNaturalKey)
        .filter((key): key is string => Boolean(key))
        .map(key => key.split('/').slice(0, 2).join('/')),
    ),
  ).sort();
  const cityIds = new Map(cityKeys.map((key, index) => [key, 100 + index]));
  const localityIds = new Map(
    members
      .map(member => member.runtimeNaturalKey)
      .filter((key): key is string => Boolean(key) && key.split('/').length === 3)
      .sort()
      .map((key, index) => [key, 1000 + index]),
  );
  const records = new Map<string, RuntimeGeographyAuthorityRecord>();

  for (const member of members) {
    if (!member.runtimeNaturalKey || !member.factualPreferredName || !member.factualType) continue;
    const parts = member.runtimeNaturalKey.split('/');
    const isCity = member.scopeKind === 'metro_city';
    const canonicalLocationId = isCity
      ? `city:${cityIds.get(member.runtimeNaturalKey)}`
      : `suburb:${localityIds.get(member.runtimeNaturalKey)}`;
    const parentKey = isCity ? parts[0] : parts.slice(0, -1).join('/');

    records.set(member.runtimeNaturalKey, {
      canonicalLocationId,
      level: isCity ? 'city' : 'suburb',
      name: member.factualPreferredName,
      slug: parts.at(-1)!,
      parentCanonicalLocationId: isCity ? 'province:1' : `city:${cityIds.get(parentKey)}`,
      parentName: parentKey.split('/').at(-1),
      parentSlug: parentKey.split('/').at(-1),
      runtimeNaturalKey: member.runtimeNaturalKey,
      scopeKind: member.scopeKind,
      factualLocationId: member.factualLocationId,
      factualPreferredName: member.factualPreferredName,
      factualType: member.factualType,
    });
  }

  return {
    resolveRuntimeNaturalKey: async (runtimeNaturalKey, scopeKind) => {
      const record = records.get(runtimeNaturalKey);
      return record?.scopeKind === scopeKind ? record : null;
    },
  };
}

function createActiveAuthority(publicActivationEnabled = true) {
  return new SearchAreaAuthority({
    definitions: activeDefinitions,
    runtimeGeographyAuthority: createRuntimeAuthority(),
    publicActivationEnabled,
  });
}

function createDiscoveryService(publicActivationEnabled = true) {
  return new SearchDiscoveryService({
    mode: 'public',
    searchAreaAuthority: createActiveAuthority(publicActivationEnabled),
    runtimeGeographyAuthority: createRuntimeAuthority(),
    canonicalLocationSearch: async () => [],
  });
}

describe('Gauteng public Search Area activation', () => {
  it('activates exactly the accepted six without changing the 61-member source boundary', async () => {
    expect(activeDefinitions.map(definition => definition.searchAreaId).sort()).toEqual(
      [...ACCEPTED_SEARCH_AREA_IDS].sort(),
    );
    expect(activeDefinitions.every(definition => definition.lifecycle === 'active')).toBe(true);
    expect(activeDefinitions.every(definition => definition.productionActivation === true)).toBe(
      true,
    );
    expect(activeDefinitions.every(definition => definition.candidateStatus === 'active')).toBe(
      true,
    );

    const sourceMembers = GAUTENG_SEARCH_AREA_CANDIDATE_DEFINITIONS.flatMap(
      definition => definition.members ?? [],
    );
    const activeMembers = activeDefinitions.flatMap(definition => definition.members ?? []);
    expect(sourceMembers).toHaveLength(61);
    expect(activeMembers).toHaveLength(61);
    expect(activeMembers.map(member => member.factualLocationId)).toEqual(
      sourceMembers.map(member => member.factualLocationId),
    );
    expect(
      activeMembers.some(member => member.factualLocationId === 'pl-gp-v01-455d2715587edce120f0'),
    ).toBe(false);

    const authority = createActiveAuthority();
    const summaries = await authority.listSearchAreaSummaries();
    expect(summaries.map(summary => summary.searchAreaId).sort()).toEqual(
      [...ACCEPTED_SEARCH_AREA_IDS].sort(),
    );
    expect(summaries.every(summary => summary.lifecycle === 'active')).toBe(true);
    expect(summaries.every(summary => summary.availability === 'available')).toBe(true);

    for (const searchAreaId of ACCEPTED_SEARCH_AREA_IDS) {
      const resolution = await authority.resolveSearchArea(searchAreaId, { journey: 'buy' });
      expect(resolution.status).toBe('available');
      if (resolution.status !== 'available') continue;
      const boundary = buildSearchAreaQueryBoundary(resolution);
      expect(boundary).toMatchObject({
        kind: 'canonical_members',
        authorityKey: `search-area:${searchAreaId}:v1`,
      });
      expect(boundary?.memberFactualLocationIds).toHaveLength(
        activeDefinitions.find(definition => definition.searchAreaId === searchAreaId)!.members!
          .length,
      );
    }
  });

  it('contains public discovery and direct execution without changing factual discovery', async () => {
    const containedAuthority = createActiveAuthority(false);
    expect(await containedAuthority.listSearchAreaSummaries()).toEqual([]);
    await expect(
      containedAuthority.resolveSearchArea(ACCEPTED_SEARCH_AREA_IDS[0], { journey: 'buy' }),
    ).resolves.toMatchObject({ status: 'unavailable', reason: 'disabled' });

    const discovery = createDiscoveryService(false);
    const factualOnly = await discovery.search('Midrand', 20);
    expect(factualOnly.some(result => result.kind === 'canonical_location')).toBe(true);
    expect(
      factualOnly.some(
        result =>
          result.kind === 'search_area' &&
          result.searchAreaId === 'pl-sa-gp-01da060bb6c5807438a654e9',
      ),
    ).toBe(false);
  });

  it('only returns the activated areas for their supported Buy/Rent journeys', async () => {
    const discovery = createDiscoveryService();
    const buyResults = await discovery.search('Midrand', 20, 'buy');
    const rentResults = await discovery.search('Midrand', 20, 'rent');
    const unsupportedResults = await discovery.search('Midrand', 20, 'developments');

    expect(
      buyResults.some(
        result =>
          result.kind === 'search_area' &&
          result.searchAreaId === 'pl-sa-gp-01da060bb6c5807438a654e9',
      ),
    ).toBe(true);
    expect(
      rentResults.some(
        result =>
          result.kind === 'search_area' &&
          result.searchAreaId === 'pl-sa-gp-01da060bb6c5807438a654e9',
      ),
    ).toBe(true);
    expect(unsupportedResults.some(result => result.kind === 'search_area')).toBe(false);
  });

  it('returns each activated Search Area as a typed public discovery result', async () => {
    const discovery = createDiscoveryService();

    for (const definition of activeDefinitions) {
      const results = await discovery.search(definition.label, 20, 'buy');
      const area = results.find(
        result => result.kind === 'search_area' && result.searchAreaId === definition.searchAreaId,
      );
      expect(area).toMatchObject({
        kind: 'search_area',
        searchAreaId: definition.searchAreaId,
        label: definition.label,
        lifecycle: 'active',
        availability: 'available',
        publicEligible: true,
        display: { typeLabel: 'Property market area' },
      });
    }
  });

  it.each(COLLISIONS)(
    '$label preserves factual and Search Area identities in public discovery',
    async collision => {
      const discovery = createDiscoveryService();
      const results = await discovery.search(collision.label, 20);
      const factual = results.find(
        result =>
          result.kind === 'canonical_location' &&
          result.factualLocationId === collision.factualLocationId,
      );
      const area = results.find(
        result => result.kind === 'search_area' && result.searchAreaId === collision.searchAreaId,
      );

      expect(factual).toBeDefined();
      expect(area).toBeDefined();
      expect(factual!.label).toBe(area!.label);
      expect(factual!.kind).toBe('canonical_location');
      expect(area!.kind).toBe('search_area');
      expect(selectionFromDiscoveryResult(factual!)).toMatchObject({
        kind: 'canonical_location',
        factualLocationId: collision.factualLocationId,
      });
      expect(selectionFromDiscoveryResult(area!)).toEqual({
        kind: 'search_area',
        searchAreaId: collision.searchAreaId,
      });

      const factualIntent = await discovery.resolveSelection(
        selectionFromDiscoveryResult(factual!),
        { journey: 'buy' },
      );
      const areaIntent = await discovery.resolveSelection(selectionFromDiscoveryResult(area!), {
        journey: 'buy',
      });
      expect(factualIntent).toMatchObject({
        status: 'resolved',
        selection: { kind: 'canonical_location' },
      });
      expect(areaIntent).toMatchObject({
        status: 'resolved',
        scope: { kind: 'search_area', searchAreaId: collision.searchAreaId },
      });
      expect(factualIntent).not.toEqual(areaIntent);
    },
  );
});
