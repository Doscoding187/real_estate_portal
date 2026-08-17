import { describe, expect, it } from 'vitest';
import {
  FactualRuntimeGeographyBridge,
  FactualRuntimeProjectionAuthority,
  type FactualRuntimeMappingEntry,
  type FactualRuntimeProjectionEntry,
} from '../factualRuntimeGeographyBridge';

const CITY_FACTUAL_ID = 'pl-gp-v01-482952abc84b2eccf7d2';
const LOCALITY_FACTUAL_ID = 'pl-gp-v01-418038409a1c0a00d9bc';
const AMBIGUOUS_FACTUAL_ID = 'pl-gp-v01-455d2715587edce120f0';
const KYALAMI_FACTUAL_ID = 'pl-gp-v01-bf3bda5e9b73324fb944';

function entry(
  overrides: Partial<FactualRuntimeMappingEntry> = {},
): FactualRuntimeMappingEntry {
  return {
    factualLocationId: 'pl-gp-v01-1234567890abcdef1234',
    factualPreferredName: 'Example Place',
    factualType: 'suburb',
    runtimeCompatibilityIds: ['suburb:34'],
    runtimeScopeLevel: 'suburb',
    status: 'supported',
    evidenceReferences: ['test:evidence'],
    decisionReason: 'Explicit test mapping evidence.',
    nameOnlyMatch: false,
    ...overrides,
  };
}

function projectionEntry(
  overrides: Partial<FactualRuntimeProjectionEntry> = {},
): FactualRuntimeProjectionEntry {
  return {
    factualLocationId: 'pl-gp-v01-1234567890abcdef1234',
    factualPreferredName: 'Example Place',
    factualType: 'town',
    factualContext: ['Ekurhuleni', 'Gauteng'],
    runtimeSearchScopeKind: 'metro_city',
    runtimeNaturalKey: 'gauteng/example-place',
    runtimeParentNaturalKey: 'gauteng',
    projectionStatus: 'projection_ready',
    runtimeReferenceStatus: 'reference_data_expansion_required',
    evidenceReferences: ['test:evidence'],
    decisionReason: 'Explicit semantic projection evidence.',
    nameOnlyMatch: false,
    ...overrides,
  };
}

describe('factual-to-runtime geography bridge', () => {
  it('resolves a semantic projection without requiring an environment numeric ID', () => {
    const authority = new FactualRuntimeProjectionAuthority([
      projectionEntry({
        factualLocationId: 'pl-gp-v01-7a1604bd1ce2d85ce2c5',
        factualPreferredName: 'Benoni',
        factualType: 'town',
        runtimeSearchScopeKind: 'metro_city',
        runtimeNaturalKey: 'gauteng/benoni',
      }),
    ]);

    expect(
      authority.resolveFactualLocation('pl-gp-v01-7a1604bd1ce2d85ce2c5'),
    ).toMatchObject({
      status: 'resolved',
      projection: {
        factualType: 'town',
        runtimeSearchScopeKind: 'metro_city',
        runtimeNaturalKey: 'gauteng/benoni',
        environmentRuntimeCompatibilityIds: undefined,
      },
    });
    expect(authority.resolveNaturalKey('gauteng/benoni')).toMatchObject({
      status: 'resolved',
      projection: { factualPreferredName: 'Benoni' },
    });
  });

  it('keeps same-name factual identities distinct through scope-qualified natural keys', () => {
    const authority = new FactualRuntimeProjectionAuthority([
      projectionEntry({
        factualLocationId: 'pl-gp-v01-0d7688adb9c7af392007',
        factualPreferredName: 'Midrand',
        factualType: 'town',
        runtimeNaturalKey: 'gauteng/midrand',
      }),
      projectionEntry({
        factualLocationId: 'pl-gp-v01-455d2715587edce120f0',
        factualPreferredName: 'Midrand',
        factualType: 'locality',
        factualContext: ['Ekurhuleni', 'Gauteng'],
        runtimeSearchScopeKind: 'locality',
        runtimeNaturalKey: 'gauteng/context-ekurhuleni/midrand',
        runtimeParentNaturalKey: 'gauteng/context-ekurhuleni',
      }),
    ]);

    expect(authority.resolveNaturalKey('gauteng/midrand')).toMatchObject({
      status: 'resolved',
      projection: { factualType: 'town' },
    });
    expect(authority.resolveNaturalKey('gauteng/context-ekurhuleni/midrand')).toMatchObject({
      status: 'resolved',
      projection: { factualType: 'locality' },
    });
  });

  it('fails closed when two factual identities claim one natural key', () => {
    const authority = new FactualRuntimeProjectionAuthority([
      projectionEntry({ factualLocationId: 'pl-gp-v01-1234567890abcdef1234' }),
      projectionEntry({
        factualLocationId: 'pl-gp-v01-fedcbafedcbafedcbafe',
        factualPreferredName: 'Another Place',
      }),
    ]);

    expect(authority.resolveNaturalKey('gauteng/example-place')).toMatchObject({
      status: 'blocked',
      projectionStatus: 'ambiguous_projection',
    });
  });

  it('does not synthesize an executable locality parent from municipality context', () => {
    const authority = new FactualRuntimeProjectionAuthority([
      projectionEntry({
        factualLocationId: 'pl-gp-v01-af17bb51ea1399e1ec40',
        factualPreferredName: 'Brackenhurst',
        factualType: 'suburb',
        factualContext: ['Ekurhuleni', 'Gauteng'],
        runtimeSearchScopeKind: 'locality',
        runtimeNaturalKey: undefined,
        runtimeParentNaturalKey: undefined,
        projectionStatus: 'other_material_blocker',
        runtimeReferenceStatus: undefined,
        decisionReason:
          'No executable city parent is established; do not coerce Ekurhuleni to a city.',
      }),
    ]);

    expect(authority.resolveFactualLocation('pl-gp-v01-af17bb51ea1399e1ec40')).toMatchObject({
      status: 'blocked',
      projectionStatus: 'other_material_blocker',
    });
    expect(authority.resolveNaturalKey('gauteng/context-ekurhuleni/brackenhurst')).toMatchObject({
      status: 'blocked',
      projectionStatus: 'other_material_blocker',
    });
  });

  it('resolves exact mappings in both directions without changing runtime IDs', () => {
    const bridge = new FactualRuntimeGeographyBridge([
      entry({
        factualLocationId: CITY_FACTUAL_ID,
        factualPreferredName: 'Johannesburg',
        factualType: 'city',
        runtimeCompatibilityIds: ['city:12'],
        runtimeScopeLevel: 'city',
        status: 'exact',
      }),
    ]);

    expect(bridge.resolveFactualLocation(CITY_FACTUAL_ID)).toMatchObject({
      status: 'resolved',
      mappingStatus: 'exact',
      runtimeCompatibilityId: 'city:12',
      factualType: 'city',
    });
    expect(bridge.resolveRuntimeLocation('city-12')).toMatchObject({
      status: 'resolved',
      mappingStatus: 'exact',
      runtimeCompatibilityId: 'city:12',
      factualLocationId: CITY_FACTUAL_ID,
    });
  });

  it('keeps factual type separate from an explicitly supported runtime scope', () => {
    const bridge = new FactualRuntimeGeographyBridge([
      entry({
        factualLocationId: LOCALITY_FACTUAL_ID,
        factualPreferredName: 'Sandton',
        factualType: 'locality',
        runtimeCompatibilityIds: ['suburb:34'],
        runtimeScopeLevel: 'suburb',
      }),
    ]);

    expect(bridge.resolveFactualLocation(LOCALITY_FACTUAL_ID)).toMatchObject({
      status: 'resolved',
      mappingStatus: 'supported',
      factualType: 'locality',
      runtimeScopeLevel: 'suburb',
      runtimeCompatibilityId: 'suburb:34',
    });
  });

  it('fails closed for ambiguous, missing, conflicting and unsupported mappings', () => {
    const bridge = new FactualRuntimeGeographyBridge([
      entry({
        factualLocationId: AMBIGUOUS_FACTUAL_ID,
        factualPreferredName: 'Ambiguous Place',
        status: 'ambiguous',
        runtimeCompatibilityIds: ['suburb:34', 'suburb:35'],
      }),
      entry({
        factualLocationId: 'pl-gp-v01-abcdefabcdefabcdefab',
        factualPreferredName: 'Conflicting Place',
        status: 'conflicting',
        runtimeCompatibilityIds: [],
      }),
      entry({
        factualLocationId: KYALAMI_FACTUAL_ID,
        factualPreferredName: 'Kyalami',
        factualType: 'town',
        status: 'unsupported_type',
        runtimeCompatibilityIds: [],
        runtimeScopeLevel: undefined,
      }),
      entry({
        factualLocationId: 'pl-gp-v01-fedcbafedcbafedcbafe',
        factualPreferredName: 'Missing Place',
        status: 'unmapped',
        runtimeCompatibilityIds: [],
        runtimeScopeLevel: 'suburb',
      }),
    ]);

    expect(bridge.resolveFactualLocation(AMBIGUOUS_FACTUAL_ID)).toMatchObject({
      status: 'blocked',
      mappingStatus: 'ambiguous',
    });
    expect(bridge.resolveRuntimeLocation('suburb:34')).toMatchObject({
      status: 'blocked',
      mappingStatus: 'ambiguous',
    });
    expect(bridge.resolveFactualLocation('pl-gp-v01-00000000000000000000')).toMatchObject({
      status: 'blocked',
      mappingStatus: 'unmapped',
    });
    expect(bridge.resolveFactualLocation('pl-gp-v01-abcdefabcdefabcdefab')).toMatchObject({
      status: 'blocked',
      mappingStatus: 'conflicting',
    });
    expect(bridge.resolveFactualLocation(KYALAMI_FACTUAL_ID)).toMatchObject({
      status: 'blocked',
      mappingStatus: 'unsupported_type',
      factualPreferredName: 'Kyalami',
    });
    expect(bridge.resolveRuntimeLocation('suburb:999')).toMatchObject({
      status: 'blocked',
      mappingStatus: 'unmapped',
    });
  });

  it('rejects invalid IDs, name-only records, and duplicate factual identities', () => {
    const bridge = new FactualRuntimeGeographyBridge([entry()]);

    expect(bridge.resolveFactualLocation('Sandton')).toMatchObject({ status: 'invalid' });
    expect(bridge.resolveRuntimeLocation('suburb:not-a-number')).toMatchObject({
      status: 'invalid',
    });

    const nameOnlyEntry = {
      ...entry(),
      nameOnlyMatch: true,
    } as unknown as FactualRuntimeMappingEntry;
    expect(() => new FactualRuntimeGeographyBridge([nameOnlyEntry])).toThrow(
      'name-only mapping',
    );
    expect(() => new FactualRuntimeGeographyBridge([entry(), entry()])).toThrow(
      'Duplicate factual geography identity',
    );
  });
});
