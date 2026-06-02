import { describe, expect, it } from 'vitest';
import { flattenCanonicalDevelopmentPayload } from './canonicalDevelopmentPayload';
import { resolveDevelopmentUpdateIntent } from './developmentUpdateIntent';

describe('resolveDevelopmentUpdateIntent', () => {
  it('treats canonical stepData unit_types as the full-sync inventory source', () => {
    expect(
      resolveDevelopmentUpdateIntent({
        unitTypes: [{ id: 'legacy-root' }],
        stepData: {
          unit_types: {
            unitTypes: [{ id: 'canonical-unit' }],
          },
        },
      }),
    ).toEqual({
      unitTypesMode: 'canonical_full_sync',
      deleteMissingUnitTypes: true,
    });
  });

  it('treats canonical partial unit_types saves as patches that preserve omitted units', () => {
    expect(
      resolveDevelopmentUpdateIntent({
        canonicalUpdateMode: 'partial_step',
        currentStepId: 'unit_types',
        unitTypes: [{ id: 'canonical-unit' }],
        stepData: {
          unit_types: {
            unitTypes: [{ id: 'canonical-unit' }],
          },
        },
      }),
    ).toEqual({
      unitTypesMode: 'canonical_patch',
      deleteMissingUnitTypes: false,
    });
  });

  it('treats root-only unitTypes as a legacy patch bridge', () => {
    expect(
      resolveDevelopmentUpdateIntent({
        unitTypes: [{ id: 'db-unit-1', configDescription: 'Patch only' }],
      }),
    ).toEqual({
      unitTypesMode: 'legacy_patch',
      deleteMissingUnitTypes: false,
    });
  });

  it('keeps root-only unitTypes as a bridge on inventory-owning keyed steps', () => {
    expect(
      resolveDevelopmentUpdateIntent({
        currentStepId: 'unit_types',
        unitTypes: [{ id: 'db-unit-1', configDescription: 'Patch only' }],
      }),
    ).toEqual({
      unitTypesMode: 'legacy_patch',
      deleteMissingUnitTypes: false,
    });

    expect(
      resolveDevelopmentUpdateIntent({
        currentStepId: 'review_publish',
        unitTypes: [],
      }),
    ).toEqual({
      unitTypesMode: 'explicit_clear',
      deleteMissingUnitTypes: true,
    });
  });

  it('ignores stale root unit mirrors on keyed non-inventory step saves', () => {
    expect(
      resolveDevelopmentUpdateIntent({
        currentStepId: 'development_media',
        stepData: {
          development_media: {
            heroImage: { url: 'https://example.com/new-hero.jpg' },
          },
        },
        unitTypes: [{ id: 'stale-root-unit', name: 'Stale Root Unit' }],
      }),
    ).toEqual({
      unitTypesMode: 'none',
      deleteMissingUnitTypes: false,
    });

    expect(
      resolveDevelopmentUpdateIntent({
        currentStepId: 'governance_finances',
        stepData: {
          governance_finances: {
            levyRange: { min: 1500, max: 2100 },
          },
        },
        unitTypes: [],
      }),
    ).toEqual({
      unitTypesMode: 'none',
      deleteMissingUnitTypes: false,
    });
  });

  it('keeps explicit empty root unitTypes as an intentional clear', () => {
    expect(resolveDevelopmentUpdateIntent({ unitTypes: [] })).toEqual({
      unitTypesMode: 'explicit_clear',
      deleteMissingUnitTypes: true,
    });
  });

  it('does not infer inventory ownership when no unitTypes payload is present', () => {
    expect(
      resolveDevelopmentUpdateIntent({
        developmentData: { name: 'Metadata only' },
      }),
    ).toEqual({
      unitTypesMode: 'none',
      deleteMissingUnitTypes: false,
    });
  });

  it('resolves malformed canonical partial updates from the scoped payload', () => {
    const scopedPayload = flattenCanonicalDevelopmentPayload(
      {
        workflowId: 'residential_sale',
        currentStepId: 'unknown_step',
        canonicalUpdateMode: 'partial_step',
        unitTypes: [{ id: 'stale-root-unit' }],
        stepData: {
          unit_types: {
            unitTypes: [{ id: 'stale-step-unit' }],
          },
        },
      },
      { mode: 'partial_update' },
    );

    expect(resolveDevelopmentUpdateIntent(scopedPayload)).toEqual({
      unitTypesMode: 'none',
      deleteMissingUnitTypes: false,
    });
  });
});
