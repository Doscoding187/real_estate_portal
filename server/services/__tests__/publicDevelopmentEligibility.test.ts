import { describe, expect, it } from 'vitest';
import type { CanonicalDevelopmentCatalogue } from '../developerEngineCatalogue';
import { evaluatePublicDevelopmentEligibility } from '../publicDevelopmentEligibility';

function catalogue(
  overrides: {
    development?: Partial<CanonicalDevelopmentCatalogue['development']>;
    brand?: Partial<NonNullable<CanonicalDevelopmentCatalogue['brand']>>;
    developer?: CanonicalDevelopmentCatalogue['developer'];
    unitTypes?: CanonicalDevelopmentCatalogue['unitTypes'];
    activeUnitTypeCount?: number;
    activeSupersessionSource?: boolean;
  } = {},
): CanonicalDevelopmentCatalogue {
  const defaultDevelopment: CanonicalDevelopmentCatalogue['development'] = {
    id: 101,
    developerId: null,
    developerBrandProfileId: 21,
    devOwnerType: 'platform',
    developmentType: 'residential',
    transactionType: 'for_sale',
    isPublished: 1,
    approvalStatus: 'approved',
  };
  const defaultBrand: NonNullable<CanonicalDevelopmentCatalogue['brand']> = {
    id: 21,
    ownerType: 'platform',
    linkedDeveloperAccountId: null,
    isVisible: 1,
    sourceAttribution: 'verified-source',
  };

  return {
    development: { ...defaultDevelopment, ...overrides.development },
    brand: { ...defaultBrand, ...overrides.brand },
    developer: overrides.developer ?? null,
    unitTypes: overrides.unitTypes ?? [{ id: 'unit-101', developmentId: 101, isActive: 1 }],
    ...(overrides.activeUnitTypeCount === undefined
      ? {}
      : { activeUnitTypeCount: overrides.activeUnitTypeCount }),
    ...(overrides.activeSupersessionSource === undefined
      ? {}
      : { activeSupersessionSource: overrides.activeSupersessionSource }),
  };
}

describe('public development eligibility authority', () => {
  it('accepts a live platform-curated development with canonical active inventory', () => {
    expect(evaluatePublicDevelopmentEligibility(catalogue())).toMatchObject({
      eligible: true,
      operatingMode: 'platform_curator',
      reasons: [],
    });
  });

  it('accepts a live developer-managed development only with matching approved custody', () => {
    expect(
      evaluatePublicDevelopmentEligibility(
        catalogue({
          development: {
            developerId: 7,
            devOwnerType: 'developer',
          },
          brand: {
            ownerType: 'developer',
            linkedDeveloperAccountId: 7,
          },
          developer: { id: 7, status: 'approved' },
        }),
      ),
    ).toMatchObject({ eligible: true, operatingMode: 'developer', reasons: [] });
  });

  it('accepts developer-scoped public inventory before a brand profile is linked', () => {
    expect(
      evaluatePublicDevelopmentEligibility(
        catalogue({
          development: {
            developerId: 7,
            developerBrandProfileId: null,
            devOwnerType: 'developer',
          },
          brand: null,
          developer: { id: 7, status: 'approved' },
        }),
      ),
    ).toMatchObject({ eligible: true, operatingMode: 'developer', reasons: [] });
  });

  it.each([
    ['draft', { isPublished: 0, approvalStatus: 'draft' }, 'not_published'],
    ['rejected', { isPublished: 1, approvalStatus: 'rejected' }, 'not_approved'],
    ['auction', { transactionType: 'auction' }, 'unsupported_transaction'],
    ['claimed platform identity', { developerId: null }, 'invalid_platform_custody'],
  ])('rejects %s without inventing a second public rule', (_label, development, reason) => {
    const input =
      _label === 'claimed platform identity'
        ? catalogue({ brand: { linkedDeveloperAccountId: 7 } })
        : catalogue({ development });

    expect(evaluatePublicDevelopmentEligibility(input)).toMatchObject({
      eligible: false,
      reasons: expect.arrayContaining([reason]),
    });
  });

  it('rejects an otherwise live catalogue without active canonical unit types', () => {
    const result = evaluatePublicDevelopmentEligibility(
      catalogue({ unitTypes: [{ id: 'unit-101', developmentId: 101, isActive: 0 }] }),
    );

    expect(result).toMatchObject({
      eligible: false,
      reasons: expect.arrayContaining(['missing_active_unit_types']),
    });
  });

  it('keeps source attribution as a platform-custody requirement', () => {
    const result = evaluatePublicDevelopmentEligibility(
      catalogue({ brand: { sourceAttribution: null } }),
    );

    expect(result).toMatchObject({
      eligible: false,
      reasons: expect.arrayContaining(['missing_source_attribution']),
    });
  });

  it('fails closed for an active curated-source supersession even if publication flags remain live', () => {
    const result = evaluatePublicDevelopmentEligibility(
      catalogue({ activeSupersessionSource: true }),
    );

    expect(result).toMatchObject({
      eligible: false,
      reasons: expect.arrayContaining(['active_supersession_source']),
    });
  });
});
