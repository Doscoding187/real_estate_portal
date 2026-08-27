import { describe, expect, it } from 'vitest';
import {
  GAUTENG_FACTUAL_RUNTIME_PROJECTION_ENTRIES,
  GAUTENG_RUNTIME_REFERENCE_PROJECTION,
  gautengFactualRuntimeProjectionAuthority,
} from '../governedRuntimeGeographyReference';
import { GAUTENG_SEARCH_AREA_CANDIDATE_DEFINITIONS } from '../gautengSearchAreaCandidateDefinitions';
import {
  SearchAreaAuthority,
  type ResolveSearchAreaOptions,
} from '../searchAreaAuthority';
import type { SearchAreaDefinition } from '../searchAreaDefinitions';
import {
  buildSearchAreaQueryBoundary,
  combineSearchAreaQueryBoundaries,
  getSearchAreaQueryMembers,
} from '../searchAreaQueryBoundary';
import {
  createRuntimeGeographyAuthority,
} from '../runtimeGeographyResolverService';
import type {
  RuntimeGeographyAuthority,
  RuntimeGeographyAuthorityRecord,
} from '../runtimeGeographyAuthority';
import { SEARCH_AREA_DEFINITIONS } from '../searchAreaDefinitions';

const EXPECTED_CANDIDATE_AREAS = [
  'pl-sa-gp-01da060bb6c5807438a654e9',
  'pl-sa-gp-20f043e9ba8ece627365f5ad',
  'pl-sa-gp-35163d1b6013797932cd94c1',
  'pl-sa-gp-3aa01dbdcd93c28e0aef9119',
  'pl-sa-gp-3b36a49ecb943c88402b07fd',
  'pl-sa-gp-9314684a28ff63402832b8df',
] as const;

const EAST_RAND_ID = 'pl-sa-gp-20f043e9ba8ece627365f5ad';

function runtimeRecord(
  input: Pick<RuntimeGeographyAuthorityRecord, 'runtimeNaturalKey' | 'scopeKind' | 'factualLocationId' | 'factualPreferredName' | 'factualType'> &
    Partial<RuntimeGeographyAuthorityRecord>,
): RuntimeGeographyAuthorityRecord {
  return {
    canonicalLocationId:
      input.canonicalLocationId ?? (input.scopeKind === 'metro_city' ? 'city:201' : 'suburb:301'),
    level: input.scopeKind === 'metro_city' ? 'city' : 'suburb',
    name: input.factualPreferredName,
    slug: input.runtimeNaturalKey.split('/').slice(-1)[0]!,
    ...(input.scopeKind === 'metro_city'
      ? {
          parentCanonicalLocationId: input.parentCanonicalLocationId ?? 'province:1',
          parentName: input.parentName ?? 'Gauteng',
          parentSlug: input.parentSlug ?? 'gauteng',
        }
      : {
          parentCanonicalLocationId: input.parentCanonicalLocationId ?? 'city:201',
          parentName: input.parentName ?? 'Johannesburg',
          parentSlug: input.parentSlug ?? 'johannesburg',
        }),
    ...input,
  };
}

function authorityForDefinition(
  definition: SearchAreaDefinition,
  runtimeGeographyAuthority: RuntimeGeographyAuthority,
) {
  return new SearchAreaAuthority({
    definitions: [definition],
    runtimeGeographyAuthority,
  });
}

describe('governed Gauteng runtime geography and Search Area authority', () => {
  it('keeps the founder-corrected six-area / 61-membership boundary without activation', () => {
    expect(GAUTENG_SEARCH_AREA_CANDIDATE_DEFINITIONS.map(area => area.searchAreaId)).toEqual(
      EXPECTED_CANDIDATE_AREAS,
    );

    const memberships = GAUTENG_SEARCH_AREA_CANDIDATE_DEFINITIONS.flatMap(area =>
      area.members ?? [],
    );
    expect(memberships).toHaveLength(61);
    expect(memberships.filter(member => member.resolutionState === 'projection_ready')).toHaveLength(
      61,
    );
    expect(memberships.filter(member => member.resolutionState === 'unresolved')).toHaveLength(0);
    expect(
      memberships.some(member => member.factualLocationId === 'pl-gp-v01-455d2715587edce120f0'),
    ).toBe(false);
    expect(
      memberships.some(member => member.factualLocationId === 'pl-gp-v01-0d7688adb9c7af392007'),
    ).toBe(true);
    expect(
      GAUTENG_SEARCH_AREA_CANDIDATE_DEFINITIONS.every(
        area =>
          area.productionActivation === false &&
          area.lifecycle === 'preview' &&
          area.candidateStatus === 'candidate',
      ),
    ).toBe(true);
    expect(SEARCH_AREA_DEFINITIONS.map(area => area.searchAreaId)).toEqual([
      'johannesburg-sandton',
      ...EXPECTED_CANDIDATE_AREAS,
    ]);
  });

  it('keeps the retired Midrand source identity in provenance without current membership', () => {
    const memberships = GAUTENG_SEARCH_AREA_CANDIDATE_DEFINITIONS.flatMap(area =>
      area.members ?? [],
    );
    const historical = GAUTENG_FACTUAL_RUNTIME_PROJECTION_ENTRIES.find(
      entry => entry.factualLocationId === 'pl-gp-v01-455d2715587edce120f0',
    );

    expect(
      memberships.some(member => member.factualLocationId === 'pl-gp-v01-455d2715587edce120f0'),
    ).toBe(false);
    expect(historical).toMatchObject({
      factualLocationId: 'pl-gp-v01-455d2715587edce120f0',
      factualPreferredName: 'Midrand',
      factualType: 'locality',
      projectionStatus: 'factual_geography_blocker',
      nameOnlyMatch: false,
    });
    expect(historical?.runtimeNaturalKey).toBeUndefined();
    expect(historical?.runtimeParentNaturalKey).toBeUndefined();
    expect(historical?.reconciliationDisposition).toEqual({
      factualDisposition: 'historical_source_identity_only',
      membershipRecommendation: 'retire_from_current_membership',
      currentPlaceStatus: 'not_current_independent_place',
      sourceIdentityInterpretation: expect.stringContaining('GeoNames 975968'),
    });
    expect(historical?.evidenceReferences).toEqual(
      expect.arrayContaining([
        expect.stringContaining('gauteng_search_area_membership_evidence_v0.1.jsonl'),
      ]),
    );
  });

  it('reconciles only evidence-backed contexts and preserves the four current projections', () => {
    const memberships = GAUTENG_SEARCH_AREA_CANDIDATE_DEFINITIONS.flatMap(
      area => area.members ?? [],
    );
    const factualById = new Map(
      GAUTENG_FACTUAL_RUNTIME_PROJECTION_ENTRIES.map(entry => [entry.factualLocationId, entry]),
    );
    const expected = [
      {
        factualLocationId: 'pl-gp-v01-af17bb51ea1399e1ec40',
        name: 'Brackenhurst',
        factualType: 'suburb',
        runtimeNaturalKey: 'gauteng/alberton/brackenhurst',
        runtimeParentNaturalKey: 'gauteng/alberton',
        runtimeParentRelationship: 'factual_parent_suburb_of_town',
        contextLocationId: 'pl-gp-v01-4c21c1f81da64c1c6728',
        contextRelationship: 'factual_parent_suburb_of_town',
      },
      {
        factualLocationId: 'pl-gp-v01-bd59322d0b3ed7431605',
        name: 'Raceview',
        factualType: 'suburb',
        runtimeNaturalKey: 'gauteng/alberton/raceview',
        runtimeParentNaturalKey: 'gauteng/alberton',
        runtimeParentRelationship: 'factual_parent_suburb_of_town',
        contextLocationId: 'pl-gp-v01-4c21c1f81da64c1c6728',
        contextRelationship: 'factual_parent_suburb_of_town',
      },
      {
        factualLocationId: 'pl-gp-v01-800cda0bcb00e0edb9f9',
        name: 'Randhart',
        factualType: 'suburb',
        runtimeNaturalKey: 'gauteng/alberton/randhart',
        runtimeParentNaturalKey: 'gauteng/alberton',
        runtimeParentRelationship: 'factual_parent_suburb_of_town',
        contextLocationId: 'pl-gp-v01-4c21c1f81da64c1c6728',
        contextRelationship: 'factual_parent_suburb_of_town',
      },
      {
        factualLocationId: 'pl-gp-v01-2fad4c8097c15027f8ec',
        name: 'Midstream Estate',
        factualType: 'suburb',
        runtimeNaturalKey: 'gauteng/centurion/midstream-estate',
        runtimeParentNaturalKey: 'gauteng/centurion',
        runtimeParentRelationship: 'runtime_market_context_not_administrative_parent',
        contextLocationId: 'pl-gp-v01-029159849439c2ea8783',
        contextRelationship: 'runtime_market_context_not_administrative_parent',
      },
    ] as const;

    for (const item of expected) {
      const entry = factualById.get(item.factualLocationId);
      expect(entry).toMatchObject({
        factualLocationId: item.factualLocationId,
        factualPreferredName: item.name,
        factualType: item.factualType,
        runtimeSearchScopeKind: 'locality',
        runtimeNaturalKey: item.runtimeNaturalKey,
        runtimeParentNaturalKey: item.runtimeParentNaturalKey,
        runtimeParentRelationship: item.runtimeParentRelationship,
        projectionStatus: 'projection_ready',
        nameOnlyMatch: false,
      });
      expect(entry?.factualContext).toEqual(expect.arrayContaining(['Ekurhuleni', 'gauteng']));
      expect(entry?.factualContextDetails).toMatchObject({
        acceptedContextLocationId: item.contextLocationId,
        acceptedContextRelationship: item.contextRelationship,
      });
      expect(entry?.evidenceProvenance?.length).toBeGreaterThan(0);
      expect(entry?.evidenceProvenance?.every(evidence => evidence.sourceUrl.startsWith('http'))).toBe(
        true,
      );
      expect(JSON.stringify(entry)).not.toMatch(/(?:province|city|suburb):[0-9]+/);
    }

    for (const factualLocationId of expected.map(item => item.factualLocationId)) {
      expect(
        memberships.filter(member => member.factualLocationId === factualLocationId),
      ).not.toHaveLength(0);
    }
  });

  it('represents all nine East Rand factual towns as metro-city runtime scopes', () => {
    const eastRand = GAUTENG_SEARCH_AREA_CANDIDATE_DEFINITIONS.find(
      area => area.searchAreaId === EAST_RAND_ID,
    );
    expect(eastRand).toBeDefined();
    const members = eastRand?.members ?? [];

    expect(members).toHaveLength(9);
    expect(new Set(members.map(member => member.factualType))).toEqual(new Set(['town']));
    expect(new Set(members.map(member => member.scopeKind))).toEqual(new Set(['metro_city']));
    expect(members.every(member => member.resolutionState === 'projection_ready')).toBe(true);
    expect(members.every(member => member.runtimeNaturalKey?.split('/').length === 2)).toBe(true);
  });

  it('keeps durable projection identities free of environment numeric handles', () => {
    const rows = GAUTENG_RUNTIME_REFERENCE_PROJECTION.rows;
    const naturalKeys = rows.map(row => row.runtimeNaturalKey);

    expect(new Set(naturalKeys).size).toBe(rows.length);
    expect(naturalKeys).toEqual([...naturalKeys].sort((left, right) => left.localeCompare(right)));
    expect(GAUTENG_RUNTIME_REFERENCE_PROJECTION.numericRuntimeIdsAreDurableAuthority).toBe(false);
    expect(rows.every(row => !('runtimeCompatibilityIds' in row))).toBe(true);
    expect(rows.every(row => !JSON.stringify(row).match(/(?:province|city|suburb):[0-9]+/))).toBe(
      true,
    );

    const projectedFactualIds = new Set(rows.flatMap(row => row.factualLocationIds));
    expect(projectedFactualIds.size).toBe(1399);
    const memberships = GAUTENG_SEARCH_AREA_CANDIDATE_DEFINITIONS.flatMap(area => area.members ?? []);
    expect(
      memberships.filter(
        member => member.runtimeReferenceStatus === 'reference_data_expansion_required',
      ),
    ).toHaveLength(60);
    expect(
      GAUTENG_FACTUAL_RUNTIME_PROJECTION_ENTRIES.filter(
        entry => entry.runtimeReferenceStatus === 'reference_data_expansion_required',
      ),
      ).toHaveLength(1398);
  });

  it('resolves a governed natural key through the existing environment resolver', async () => {
    const resolver = createRuntimeGeographyAuthority({
      projectionAuthority: gautengFactualRuntimeProjectionAuthority,
      publicLocationResolver: {
        resolvePublicLocation: async options => {
          expect(options).toEqual({ provinceSlug: 'gauteng', citySlug: 'benoni' });
          return {
            status: 'resolved' as const,
            location: {
              level: 'city' as const,
              province: { id: 77, name: 'Gauteng', slug: 'gauteng', code: 'GP' },
              city: { id: 901, name: 'Benoni', slug: 'benoni', provinceId: 77 },
              confidence: 'exact' as const,
              fallbackLevel: 'none' as const,
              originalIntent: 'Benoni, Gauteng',
            },
          };
        },
      },
    });

    expect(await resolver.resolveRuntimeNaturalKey('gauteng/benoni', 'metro_city')).toMatchObject({
      canonicalLocationId: 'city:901',
      scopeKind: 'metro_city',
      factualLocationId: 'pl-gp-v01-7a1604bd1ce2d85ce2c5',
      factualType: 'town',
    });
  });

  it('supports multi-level explicit membership without a required parent and preserves overlap', async () => {
    const records = new Map<string, RuntimeGeographyAuthorityRecord>([
      [
        'gauteng/benoni',
        runtimeRecord({
          runtimeNaturalKey: 'gauteng/benoni',
          scopeKind: 'metro_city',
          factualLocationId: 'pl-gp-v01-7a1604bd1ce2d85ce2c5',
          factualPreferredName: 'Benoni',
          factualType: 'town',
          canonicalLocationId: 'city:201',
        }),
      ],
      [
        'gauteng/johannesburg/sandton',
        runtimeRecord({
          runtimeNaturalKey: 'gauteng/johannesburg/sandton',
          scopeKind: 'locality',
          factualLocationId: 'pl-gp-v01-418038409a1c0a00d9bc',
          factualPreferredName: 'Sandton',
          factualType: 'locality',
          canonicalLocationId: 'suburb:301',
          parentCanonicalLocationId: 'city:12',
        }),
      ],
    ]);
    const runtimeGeographyAuthority: RuntimeGeographyAuthority = {
      resolveRuntimeNaturalKey: async (key, scope) => {
        const record = records.get(key);
        return record?.scopeKind === scope ? record : null;
      },
    };
    const definition: SearchAreaDefinition = {
      searchAreaId: 'cross-context-proof',
      definitionVersion: 1,
      label: 'Cross Context Proof',
      members: [
        {
          factualLocationId: 'pl-gp-v01-7a1604bd1ce2d85ce2c5',
          factualPreferredName: 'Benoni',
          factualType: 'town',
          scopeKind: 'metro_city',
          runtimeNaturalKey: 'gauteng/benoni',
          resolutionState: 'projection_ready',
        },
        {
          factualLocationId: 'pl-gp-v01-418038409a1c0a00d9bc',
          factualPreferredName: 'Sandton',
          factualType: 'locality',
          scopeKind: 'locality',
          runtimeNaturalKey: 'gauteng/johannesburg/sandton',
          resolutionState: 'projection_ready',
        },
      ],
      canonicalContext: {
        contextNames: ['Gauteng', 'Ekurhuleni'],
        isMembershipParent: false,
      },
      productionActivation: false,
      candidateStatus: 'candidate',
      supportedJourneys: ['buy', 'rent'],
      lifecycle: 'preview',
      boundary: { kind: 'canonical_members' },
    };

    const authority = authorityForDefinition(definition, runtimeGeographyAuthority);
    const injectedOptions = {
      includePreview: true,
      journey: 'buy',
      memberCanonicalLocationIds: ['suburb:999'],
    } as unknown as ResolveSearchAreaOptions;
    const resolution = await authority.resolveSearchArea('cross-context-proof', injectedOptions);
    expect(resolution.status).toBe('preview');
    if (resolution.status !== 'preview') return;

    expect(resolution.summary.parentCanonicalLocationId).toBeUndefined();
    expect(resolution.summary.canonicalContext?.isMembershipParent).toBe(false);
    const boundary = buildSearchAreaQueryBoundary(resolution);
    expect(boundary).not.toBeNull();
    if (!boundary) return;
    expect(boundary.parentCanonicalLocationId).toBeUndefined();
    expect(boundary).not.toHaveProperty('members');
    expect(boundary.memberScopeKinds).toEqual(['metro_city', 'locality']);
    expect(getSearchAreaQueryMembers(boundary).map(member => member.scopeKind)).toEqual([
      'metro_city',
      'locality',
    ]);
    expect(getSearchAreaQueryMembers(boundary).map(member => member.canonicalLocationId)).toEqual([
      'city:201',
      'suburb:301',
    ]);

    const overlapBoundary = buildSearchAreaQueryBoundary({
      ...resolution,
      definition: {
        ...resolution.definition,
        members: [resolution.definition.members[0]],
        authorityKey: 'search-area:overlap:v1',
      },
    });
    expect(overlapBoundary).not.toBeNull();
    const combined = combineSearchAreaQueryBoundaries([boundary, overlapBoundary!]);
    expect(combined).not.toBeNull();
    expect(combined?.memberCanonicalLocationIds).toEqual(['city:201', 'suburb:301']);
  });
});
