import { describe, expect, it } from 'vitest';
import {
  combineSearchAreaQueryBoundaries,
  buildSearchAreaQueryBoundary,
  getSearchAreaQueryMembers,
  type SearchAreaQueryBoundary,
} from '../searchAreaQueryBoundary';
import { SearchAreaAuthority, type SearchAreaDefinition } from '../searchAreaAuthority';
import type {
  RuntimeGeographyAuthority,
  RuntimeGeographyAuthorityRecord,
} from '../runtimeGeographyAuthority';
import { GAUTENG_SEARCH_AREA_CANDIDATE_DEFINITIONS } from '../gautengSearchAreaCandidateDefinitions';
import { SEARCH_AREA_DEFINITIONS } from '../searchAreaDefinitions';

const ACCEPTED_SEARCH_AREA_IDS = [
  'pl-sa-gp-3b36a49ecb943c88402b07fd',
  'pl-sa-gp-9314684a28ff63402832b8df',
  'pl-sa-gp-20f043e9ba8ece627365f5ad',
  'pl-sa-gp-3aa01dbdcd93c28e0aef9119',
  'pl-sa-gp-01da060bb6c5807438a654e9',
  'pl-sa-gp-35163d1b6013797932cd94c1',
] as const;

const EXPECTED_MEMBER_COUNTS: Record<(typeof ACCEPTED_SEARCH_AREA_IDS)[number], number> = {
  'pl-sa-gp-3b36a49ecb943c88402b07fd': 12,
  'pl-sa-gp-9314684a28ff63402832b8df': 12,
  'pl-sa-gp-20f043e9ba8ece627365f5ad': 9,
  'pl-sa-gp-3aa01dbdcd93c28e0aef9119': 11,
  'pl-sa-gp-01da060bb6c5807438a654e9': 8,
  'pl-sa-gp-35163d1b6013797932cd94c1': 9,
};

const RETIRED_MIDRAND_ID = 'pl-gp-v01-455d2715587edce120f0';
const CURRENT_MIDRAND_ID = 'pl-gp-v01-0d7688adb9c7af392007';
const JOHANNESBURG_NORTH_ID = 'pl-gp-v01-c1d935cbc90ea639eb87';
const ALBERTON_ID = 'pl-gp-v01-4c21c1f81da64c1c6728';

function candidateDefinitions(): SearchAreaDefinition[] {
  return ACCEPTED_SEARCH_AREA_IDS.map(searchAreaId => {
    const definition = GAUTENG_SEARCH_AREA_CANDIDATE_DEFINITIONS.find(
      candidate => candidate.searchAreaId === searchAreaId,
    );
    if (!definition) throw new Error(`Missing accepted Search Area ${searchAreaId}`);
    return definition;
  });
}

function createAcceptanceRuntimeAuthority(
  definitions: readonly SearchAreaDefinition[],
): RuntimeGeographyAuthority {
  const memberByNaturalKey = new Map<
    string,
    NonNullable<SearchAreaDefinition['members']>[number]
  >();
  for (const definition of definitions) {
    for (const member of definition.members ?? []) {
      if (!member.runtimeNaturalKey || !member.factualType || !member.factualPreferredName) {
        throw new Error(`Acceptance fixture contains a non-executable member.`);
      }
      memberByNaturalKey.set(member.runtimeNaturalKey, member);
    }
  }

  const cityNaturalKeys = new Set<string>(['gauteng']);
  for (const naturalKey of memberByNaturalKey.keys()) {
    const segments = naturalKey.split('/');
    if (segments.length === 2) cityNaturalKeys.add(naturalKey);
    if (segments.length === 3) cityNaturalKeys.add(segments.slice(0, 2).join('/'));
  }

  const cityIds = new Map(
    [...cityNaturalKeys]
      .filter(key => key !== 'gauteng')
      .sort()
      .map((key, index) => [key, 100 + index]),
  );
  const localityIds = new Map(
    [...memberByNaturalKey.keys()]
      .filter(key => key.split('/').length === 3)
      .sort()
      .map((key, index) => [key, 1000 + index]),
  );

  const records = new Map<string, RuntimeGeographyAuthorityRecord>();
  for (const [naturalKey, member] of memberByNaturalKey) {
    const segments = naturalKey.split('/');
    const isMetroCity = member.scopeKind === 'metro_city';
    const canonicalLocationId = isMetroCity
      ? `city:${cityIds.get(naturalKey)}`
      : `suburb:${localityIds.get(naturalKey)}`;
    const parentNaturalKey = isMetroCity ? 'gauteng' : segments.slice(0, -1).join('/');
    const parentCanonicalLocationId = isMetroCity
      ? 'province:1'
      : `city:${cityIds.get(parentNaturalKey)}`;

    records.set(naturalKey, {
      canonicalLocationId,
      level: isMetroCity ? 'city' : 'suburb',
      name: member.factualPreferredName,
      slug: segments.at(-1)!,
      parentCanonicalLocationId,
      parentName: isMetroCity ? 'Gauteng' : parentNaturalKey.split('/').at(-1),
      parentSlug: isMetroCity ? 'gauteng' : parentNaturalKey.split('/').at(-1),
      runtimeNaturalKey: naturalKey,
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

function resolveAcceptanceArea(
  authority: SearchAreaAuthority,
  searchAreaId: string,
  journey: 'buy' | 'rent' = 'buy',
) {
  return authority.resolveSearchArea(searchAreaId, {
    journey,
    includePreview: true,
  });
}

function executableBoundary(
  authority: SearchAreaAuthority,
  searchAreaId: string,
): Promise<SearchAreaQueryBoundary> {
  return resolveAcceptanceArea(authority, searchAreaId).then(resolution => {
    expect(resolution.status).toBe('preview');
    if (resolution.status !== 'preview')
      throw new Error('Search Area did not resolve for acceptance.');
    const boundary = buildSearchAreaQueryBoundary(resolution);
    expect(boundary).not.toBeNull();
    if (!boundary) throw new Error('Search Area boundary did not compile.');
    return boundary;
  });
}

describe('Gauteng Search Area activation acceptance', () => {
  const definitions = candidateDefinitions();
  const authority = new SearchAreaAuthority({
    definitions,
    runtimeGeographyAuthority: createAcceptanceRuntimeAuthority(definitions),
  });

  it('registers exactly the accepted six areas without changing public lifecycle', () => {
    expect(SEARCH_AREA_DEFINITIONS.map(definition => definition.searchAreaId)).toEqual([
      'johannesburg-sandton',
      ...ACCEPTED_SEARCH_AREA_IDS.slice().sort(),
    ]);

    expect(definitions).toHaveLength(6);
    expect(definitions.every(definition => definition.lifecycle === 'preview')).toBe(true);
    expect(definitions.every(definition => definition.candidateStatus === 'candidate')).toBe(true);
    expect(definitions.every(definition => definition.productionActivation === false)).toBe(true);
    expect(
      definitions.every(definition => definition.supportedJourneys.join(',') === 'buy,rent'),
    ).toBe(true);

    const slugs = definitions.map(definition => definition.publicSlug);
    expect(new Set(slugs).size).toBe(6);
    expect(definitions.every(definition => definition.aliases === undefined)).toBe(true);
  });

  it('gates discovery by lifecycle while allowing a controlled typed preview list', async () => {
    const publicSummaries = await authority.listSearchAreaSummaries();
    const controlledSummaries = await authority.listSearchAreaSummaries({ includePreview: true });

    expect(publicSummaries).toEqual([]);
    expect(controlledSummaries.map(summary => summary.searchAreaId).sort()).toEqual(
      ACCEPTED_SEARCH_AREA_IDS.slice().sort(),
    );
    expect(controlledSummaries.every(summary => summary.availability === 'preview')).toBe(true);
  });

  it('resolves all 61 governed memberships for Buy and Rent and compiles deterministic OR boundaries', async () => {
    const allMembers = definitions.flatMap(definition => definition.members ?? []);
    expect(allMembers).toHaveLength(61);
    expect(allMembers.filter(member => member.resolutionState === 'projection_ready')).toHaveLength(
      61,
    );
    expect(allMembers.filter(member => member.resolutionState === 'unresolved')).toHaveLength(0);
    expect(allMembers.some(member => member.factualLocationId === RETIRED_MIDRAND_ID)).toBe(false);
    expect(allMembers.some(member => member.factualLocationId === CURRENT_MIDRAND_ID)).toBe(true);

    for (const definition of definitions) {
      expect(definition.members).toHaveLength(
        EXPECTED_MEMBER_COUNTS[definition.searchAreaId as keyof typeof EXPECTED_MEMBER_COUNTS],
      );

      const buy = await resolveAcceptanceArea(authority, definition.searchAreaId, 'buy');
      const rent = await resolveAcceptanceArea(authority, definition.searchAreaId, 'rent');
      expect(buy.status).toBe('preview');
      expect(rent.status).toBe('preview');
      if (buy.status !== 'preview' || rent.status !== 'preview') continue;

      expect(buy.definition.members).toEqual(rent.definition.members);
      const buyBoundary = buildSearchAreaQueryBoundary(buy);
      const rentBoundary = buildSearchAreaQueryBoundary(rent);
      expect(buyBoundary).not.toBeNull();
      expect(rentBoundary).toEqual(buyBoundary);
      if (!buyBoundary || !rentBoundary) continue;

      const members = getSearchAreaQueryMembers(buyBoundary);
      expect(members).toHaveLength(definition.members!.length);
      expect(
        new Set(members.map(member => `${member.scopeKind}:${member.canonicalLocationId}`)).size,
      ).toBe(members.length);
      expect(buyBoundary.memberRuntimeNaturalKeys).toEqual(
        definition.members!.map(member => member.runtimeNaturalKey),
      );
      expect(buyBoundary.memberFactualLocationIds).toEqual(
        definition.members!.map(member => member.factualLocationId),
      );
      expect(buyBoundary.parentCanonicalLocationId).toBeUndefined();
      expect(JSON.stringify(buyBoundary)).not.toContain('contextNames');
      expect(JSON.stringify(buyBoundary)).not.toContain('Ekurhuleni');
      expect(JSON.stringify(buyBoundary)).not.toContain('City of Johannesburg');
    }
  });

  it('preserves mixed executable levels and the Alberton overlap', async () => {
    const eastRand = definitions.find(
      definition => definition.searchAreaId === 'pl-sa-gp-20f043e9ba8ece627365f5ad',
    )!;
    const johannesburgSouth = definitions.find(
      definition => definition.searchAreaId === 'pl-sa-gp-9314684a28ff63402832b8df',
    )!;

    expect(new Set(eastRand.members!.map(member => member.scopeKind))).toEqual(
      new Set(['metro_city']),
    );
    expect(new Set(johannesburgSouth.members!.map(member => member.scopeKind))).toEqual(
      new Set(['metro_city', 'locality']),
    );

    const eastRandAlberton = eastRand.members!.find(
      member => member.factualLocationId === ALBERTON_ID,
    );
    const southAlberton = johannesburgSouth.members!.find(
      member => member.factualLocationId === ALBERTON_ID,
    );
    expect(eastRandAlberton).toMatchObject({
      factualPreferredName: 'Alberton',
      factualType: 'town',
      scopeKind: 'metro_city',
      runtimeNaturalKey: 'gauteng/alberton',
    });
    expect(southAlberton).toEqual(eastRandAlberton);

    const southBoundary = await executableBoundary(authority, johannesburgSouth.searchAreaId);
    const eastBoundary = await executableBoundary(authority, eastRand.searchAreaId);
    const southMembers = getSearchAreaQueryMembers(southBoundary);
    const eastMembers = getSearchAreaQueryMembers(eastBoundary);
    expect(southMembers.some(member => member.runtimeNaturalKey === 'gauteng/alberton')).toBe(true);
    expect(eastMembers.some(member => member.runtimeNaturalKey === 'gauteng/alberton')).toBe(true);

    const union = combineSearchAreaQueryBoundaries([southBoundary, eastBoundary]);
    expect(union).not.toBeNull();
    expect(
      new Set(
        getSearchAreaQueryMembers(union!).map(
          member => `${member.scopeKind}:${member.canonicalLocationId}`,
        ),
      ).size,
    ).toBe(getSearchAreaQueryMembers(union!).length);
  });

  it('keeps same-name factual identities distinct from Search Area identities', async () => {
    for (const [searchAreaId, factualLocationId, runtimeNaturalKey, label, scopeKind] of [
      [
        'pl-sa-gp-3b36a49ecb943c88402b07fd',
        JOHANNESBURG_NORTH_ID,
        'gauteng/johannesburg/johannesburg-north',
        'Johannesburg North',
        'locality',
      ],
      [
        'pl-sa-gp-01da060bb6c5807438a654e9',
        CURRENT_MIDRAND_ID,
        'gauteng/midrand',
        'Midrand',
        'metro_city',
      ],
      [
        'pl-sa-gp-35163d1b6013797932cd94c1',
        'pl-gp-v01-029159849439c2ea8783',
        'gauteng/centurion',
        'Centurion',
        'metro_city',
      ],
    ] as const) {
      const definition = definitions.find(area => area.searchAreaId === searchAreaId)!;
      expect(definition.label).toBe(label);
      expect(definition.publicSlug).toBe(label.toLowerCase().replace(/\s+/g, '-'));
      const member = definition.members!.find(item => item.factualLocationId === factualLocationId);
      expect(member).toMatchObject({
        factualPreferredName: label,
        runtimeNaturalKey,
        scopeKind,
      });

      const boundary = await executableBoundary(authority, searchAreaId);
      expect(getSearchAreaQueryMembers(boundary)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            runtimeNaturalKey,
            name: label,
            scopeKind,
          }),
        ]),
      );
    }
  });

  it('models a single-row hierarchical overlap as one result under an OR boundary', async () => {
    const boundary = await executableBoundary(authority, 'pl-sa-gp-9314684a28ff63402832b8df');
    const members = getSearchAreaQueryMembers(boundary);
    const alberton = members.find(member => member.runtimeNaturalKey === 'gauteng/alberton')!;
    const brackenhurst = members.find(
      member => member.runtimeNaturalKey === 'gauteng/alberton/brackenhurst',
    )!;

    const fixture = {
      id: 701,
      cityId: alberton.cityId,
      suburbId: brackenhurst.suburbId,
      listingType: 'sale' as const,
      status: 'available' as const,
    };
    const matchingMemberPredicates = members.filter(member =>
      member.scopeKind === 'metro_city'
        ? member.cityId === fixture.cityId
        : member.suburbId === fixture.suburbId && member.cityId === fixture.cityId,
    );

    expect(matchingMemberPredicates.map(member => member.runtimeNaturalKey)).toEqual([
      'gauteng/alberton',
      'gauteng/alberton/brackenhurst',
    ]);
    const matchedListingIds = [fixture]
      .filter(listing => matchingMemberPredicates.length > 0 && listing.status === 'available')
      .map(listing => listing.id);
    expect(new Set(matchedListingIds).size).toBe(1);
  });
});
