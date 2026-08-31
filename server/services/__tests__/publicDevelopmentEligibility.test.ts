import { describe, expect, it } from 'vitest';
import type { CanonicalDevelopmentCatalogue } from '../developerEngineCatalogue';
import { evaluatePublicDevelopmentEligibility } from '../publicDevelopmentEligibility';

function catalogue(
  overrides: {
    development?: Partial<CanonicalDevelopmentCatalogue['development']>;
    publisher?: Partial<NonNullable<CanonicalDevelopmentCatalogue['publisher']>> | null;
    organisation?: CanonicalDevelopmentCatalogue['organisation'];
    unitTypes?: CanonicalDevelopmentCatalogue['unitTypes'];
    commercialAccess?: boolean;
    activeUnitTypeCount?: number;
    activeOperatorCount?: number;
    activeSupersessionSource?: boolean;
  } = {},
): CanonicalDevelopmentCatalogue {
  const defaultDevelopment: CanonicalDevelopmentCatalogue['development'] = {
    id: 101,
    cataloguePublisherId: 21,
    developmentType: 'residential',
    transactionType: 'for_sale',
    isPublished: 1,
    approvalStatus: 'approved',
  };
  const defaultPublisher: NonNullable<CanonicalDevelopmentCatalogue['publisher']> = {
    id: 21,
    authorityKind: 'platform_reference',
    developerOrganisationId: null,
    isVisible: 1,
    sourceAttribution: 'verified-source',
  };

  return {
    development: { ...defaultDevelopment, ...overrides.development },
    publisher:
      overrides.publisher === null ? null : { ...defaultPublisher, ...overrides.publisher },
    organisation: overrides.organisation ?? null,
    unitTypes: overrides.unitTypes ?? [{ id: 'unit-101', developmentId: 101, isActive: 1 }],
    commercialAccess: overrides.commercialAccess ?? true,
    activeOperatorCount: overrides.activeOperatorCount ?? 1,
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
          development: { cataloguePublisherId: 22 },
          publisher: {
            id: 22,
            authorityKind: 'developer_first_party',
            developerOrganisationId: 7,
            sourceAttribution: null,
          },
          organisation: { id: 7, status: 'approved' },
        }),
      ),
    ).toMatchObject({ eligible: true, operatingMode: 'developer', reasons: [] });
  });

  it('keeps legacy Commercial development rows out of the public catalogue', () => {
    const result = evaluatePublicDevelopmentEligibility(
      catalogue({ development: { developmentType: 'commercial' } }),
    );

    expect(result).toMatchObject({
      eligible: false,
      reasons: expect.arrayContaining(['unsupported_development_type']),
    });
  });

  it('keeps an approved developer development private without Launch Access', () => {
    const result = evaluatePublicDevelopmentEligibility(
      catalogue({
        development: { cataloguePublisherId: 22 },
        publisher: {
          id: 22,
          authorityKind: 'developer_first_party',
          developerOrganisationId: 7,
          sourceAttribution: null,
        },
        organisation: { id: 7, status: 'approved' },
        commercialAccess: false,
      }),
    );

    expect(result).toMatchObject({
      eligible: false,
      operatingMode: 'developer',
      reasons: expect.arrayContaining(['missing_launch_access']),
    });
  });

  it('keeps first-party inventory private when no active operator can receive its leads', () => {
    const result = evaluatePublicDevelopmentEligibility(
      catalogue({
        development: { cataloguePublisherId: 22 },
        publisher: {
          id: 22,
          authorityKind: 'developer_first_party',
          developerOrganisationId: 7,
          sourceAttribution: null,
        },
        organisation: { id: 7, status: 'approved' },
        activeOperatorCount: 0,
      }),
    );

    expect(result).toMatchObject({
      eligible: false,
      operatingMode: 'developer',
      reasons: expect.arrayContaining(['missing_active_operator']),
    });
  });

  it('rejects developer inventory without a first-party publisher authority', () => {
    expect(
      evaluatePublicDevelopmentEligibility(
        catalogue({
          development: { cataloguePublisherId: null },
          publisher: null,
        }),
      ),
    ).toMatchObject({
      eligible: false,
      reasons: expect.arrayContaining(['missing_publisher']),
    });
  });

  it.each([
    ['draft', { isPublished: 0, approvalStatus: 'draft' }, 'not_published'],
    ['rejected', { isPublished: 1, approvalStatus: 'rejected' }, 'not_approved'],
    ['auction', { transactionType: 'auction' }, 'unsupported_transaction'],
    ['claimed platform identity', {}, 'invalid_publisher_custody'],
  ])('rejects %s without inventing a second public rule', (_label, development, reason) => {
    const input =
      _label === 'claimed platform identity'
        ? catalogue({ publisher: { developerOrganisationId: 7 } })
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
      catalogue({ publisher: { sourceAttribution: null } }),
    );

    expect(result).toMatchObject({
      eligible: false,
      reasons: expect.arrayContaining(['missing_source_attribution']),
    });
  });

  it('rejects an invisible platform publisher and a broken developer custody chain', () => {
    expect(
      evaluatePublicDevelopmentEligibility(catalogue({ publisher: { isVisible: 0 } })),
    ).toMatchObject({
      eligible: false,
      reasons: expect.arrayContaining(['publisher_not_visible']),
    });

    expect(
      evaluatePublicDevelopmentEligibility(
        catalogue({
          development: { cataloguePublisherId: 22 },
          publisher: {
            id: 22,
            authorityKind: 'developer_first_party',
            developerOrganisationId: 99,
          },
          organisation: { id: 7, status: 'pending' },
        }),
      ),
    ).toMatchObject({
      eligible: false,
      reasons: expect.arrayContaining(['invalid_publisher_custody']),
    });
  });

  it('does not make a source public merely because supersession is no longer active', () => {
    expect(
      evaluatePublicDevelopmentEligibility(
        catalogue({
          activeSupersessionSource: false,
          development: { isPublished: 0 },
        }),
      ),
    ).toMatchObject({
      eligible: false,
      reasons: expect.arrayContaining(['not_published']),
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
