import { describe, expect, it } from 'vitest';
import {
  buildFeaturesContextFromWizardState,
  getApplicableStep4Spaces,
  normalizeFeaturesContext,
  pruneFeaturesContextForType,
  validateFeaturesContext,
} from '../features-context';

const empty = {
  version: 1 as const,
  spaces: [],
  context: {},
  utilities: {},
  security: { status: 'unknown' as const, features: [] },
  highlights: [],
  customFeatures: [],
  customHighlights: [],
};

describe('canonical Features & Context contract', () => {
  it('keeps structured features, utilities, security and highlights separate', () => {
    const context = buildFeaturesContextFromWizardState(
      {
        featuresContext: {
          ...empty,
          spaces: ['study_office', 'garden'],
          utilities: { backupPower: 'none' },
          security: { status: 'known', features: ['cctv'] },
          highlights: ['natural_light'],
          customFeatures: ['Sunroom'],
          customHighlights: ['Quiet cul-de-sac'],
        },
      },
      {},
      'sale',
      'house',
    );

    expect(context.spaces).toEqual(['study_office', 'garden']);
    expect(context.utilities.backupPower).toBe('none');
    expect(context.security.features).toEqual(['cctv']);
    expect(context.highlights).toEqual(['natural_light']);
    expect(context.customFeatures).toEqual(['Sunroom']);
    expect(context.customHighlights).toEqual(['Quiet cul-de-sac']);
  });

  it('normalizes and deduplicates custom highlights without promoting them to facts', () => {
    const context = normalizeFeaturesContext({
      ...empty,
      customHighlights: ['  Quiet   cul-de-sac ', 'quiet cul-de-sac', 'Private outlook'],
    });

    expect(context.customHighlights).toEqual(['Quiet cul-de-sac', 'Private outlook']);
    expect(
      validateFeaturesContext(
        { ...empty, customHighlights: [''] },
        'sale',
        'house',
      ).map(issue => issue.field),
    ).toContain('customHighlights.0');
  });

  it('keeps rental pet-policy semantics out of sale payloads', () => {
    const context = buildFeaturesContextFromWizardState(
      { featuresContext: { ...empty, petPolicy: 'allowed_with_permission' } },
      {},
      'sale',
      'house',
    );

    expect(context.petPolicy).toBeUndefined();
  });

  it('does not reinterpret incompatible spaces after a type change', () => {
    const source = {
      ...empty,
      spaces: ['garden', 'laundry_room', 'scullery'],
    };

    expect(pruneFeaturesContextForType(source, 'apartment').spaces).toEqual(['laundry_room']);
    expect(
      getApplicableStep4Spaces('farm', { residenceIncluded: false }).map(item => item.value),
    ).toEqual(['staff_quarters', 'storage_room', 'garden', 'pool']);
  });

  it('reads known legacy labels without promoting subjective claims', () => {
    const context = normalizeFeaturesContext({
      propertyHighlights: ['Pet Friendly', 'Secure', 'Natural Light'],
      additionalRooms: ['Study / Office', 'Laundry Room'],
      securityFeatures: ['24hr_guard'],
      petPolicy: 'with_permission',
      powerBackup: 'inverter',
    });

    expect(context.highlights).toEqual(['natural_light']);
    expect(context.spaces).toEqual(['study_office', 'laundry_room']);
    expect(context.security.features).toEqual(['guard_24hr']);
    expect(context.petPolicy).toBe('allowed_with_permission');
    expect(context.utilities.backupPower).toBe('inverter');
  });

  it('rejects invalid values and non-applicable spaces at the server boundary', () => {
    const issues = validateFeaturesContext(
      {
        ...empty,
        spaces: ['garden'],
        petPolicy: 'allowed',
        highlights: ['secure'],
      },
      'sale',
      'apartment',
    );

    expect(issues.map(issue => issue.field)).toEqual(
      expect.arrayContaining(['spaces.0', 'petPolicy', 'highlights.0']),
    );
  });
});
