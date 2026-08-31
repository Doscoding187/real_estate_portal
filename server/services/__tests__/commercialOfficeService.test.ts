import { describe, expect, it } from 'vitest';
import {
  assertCommercialAvailabilityFreshness,
  assertCommercialPricingContract,
  assertCommercialSpecificationInput,
  assertCommercialSpaceIdentity,
  deriveCommercialMonthlyOccupancyCost,
} from '../../../shared/commercial-domain';
import {
  commercialMarketingMediaSummary,
  commercialMarketingMediaPlacement,
  canManageCommercialMarketingMedia,
  canManageCommercialMarketingListing,
  isCommercialRecipientAssociationCoherent,
  deriveCommercialListingSupplierCustody,
  effectiveCommercialAvailabilityState,
  availabilityPresentation,
  isPublicCommercialAvailabilityDiscoverable,
  normalizeCommercialAvailabilityReconfirmation,
  normalizeCommercialAvailabilityStatusUpdate,
  projectPublicCommercialMedia,
  projectPublicCommercialRecord,
} from '../commercialOfficeService';
import { toMySqlDateTime } from '../leadDeliveryService';

describe('Commercial public truth', () => {
  it('keeps gross and componentised pricing mutually exclusive', () => {
    expect(() =>
      assertCommercialPricingContract({
        pricingMode: 'gross_quote',
        economics: [
          {
            componentCode: 'gross_rent',
            valueState: 'supplied',
            chargeBasis: 'per_m2_month',
            amountMinor: 21500,
            rangeMaximumMinor: null,
          },
          {
            componentCode: 'rates_recoveries',
            valueState: 'supplied',
            chargeBasis: 'per_m2_month',
            amountMinor: 4130,
            rangeMaximumMinor: null,
          },
        ],
      }),
    ).toThrow(/double-count/i);
    expect(() =>
      assertCommercialPricingContract({
        pricingMode: 'gross_quote',
        economics: [
          {
            componentCode: 'gross_rent',
            valueState: 'supplied',
            chargeBasis: 'per_m2_month',
            amountMinor: 21500,
            rangeMaximumMinor: null,
          },
          {
            componentCode: 'parking',
            valueState: 'supplied',
            chargeBasis: 'per_bay_month',
            amountMinor: 850000,
            rangeMaximumMinor: null,
          },
        ],
      }),
    ).not.toThrow();
    expect(() =>
      assertCommercialPricingContract({
        pricingMode: 'componentised',
        economics: [
          {
            componentCode: 'base_rent',
            valueState: 'unknown',
            chargeBasis: null,
            amountMinor: null,
            rangeMaximumMinor: null,
          },
        ],
      }),
    ).toThrow(/supplied or estimated base rental/i);
    expect(() =>
      assertCommercialPricingContract({
        pricingMode: 'componentised',
        economics: [
          {
            componentCode: 'base_rent',
            valueState: 'supplied',
            chargeBasis: 'per_m2_month',
            amountMinor: 0,
            rangeMaximumMinor: null,
          },
        ],
      }),
    ).toThrow(/greater than zero/i);
    expect(() =>
      assertCommercialPricingContract({
        pricingMode: 'gross_quote',
        economics: [
          {
            componentCode: 'gross_rent',
            valueState: 'supplied',
            chargeBasis: 'per_bay_month',
            amountMinor: 20_000,
            rangeMaximumMinor: null,
          },
        ],
      }),
    ).toThrow(/per-m² monthly or fixed-monthly/i);
    expect(() =>
      assertCommercialPricingContract({
        pricingMode: 'componentised',
        economics: [
          {
            componentCode: 'base_rent',
            valueState: 'supplied',
            chargeBasis: 'per_m2_month',
            amountMinor: 20_000,
            rangeMaximumMinor: null,
          },
          {
            componentCode: 'base_rent',
            valueState: 'supplied',
            chargeBasis: 'per_m2_month',
            amountMinor: 21_000,
            rangeMaximumMinor: null,
          },
        ],
      }),
    ).toThrow(/more than once/i);
  });

  it('does not present expired confirmation as confirmed availability', () => {
    expect(
      effectiveCommercialAvailabilityState(
        { availabilityState: 'available_confirmed', reconfirmationDueAt: '2026-01-01T00:00:00Z' },
        new Date('2026-08-21T00:00:00Z'),
      ),
    ).toBe('needs_reconfirmation');
    expect(
      effectiveCommercialAvailabilityState(
        { availabilityState: 'available_upcoming', reconfirmationDueAt: '2026-12-01T00:00:00Z' },
        new Date('2026-08-21T00:00:00Z'),
      ),
    ).toBe('available_upcoming');
  });

  it('normalizes a supplier reconfirmation only with governed, ordered availability provenance', () => {
    expect(() =>
      normalizeCommercialAvailabilityReconfirmation({
        availabilityState: 'available_confirmed',
        occupationDate: null,
        confirmationSource: 'other',
        confirmationSourceLabel: ' ',
        lastConfirmedAt: '2026-08-29T10:00:00.000Z',
        reconfirmationDueAt: '2026-09-28T10:00:00.000Z',
      }),
    ).toThrow(/describe the source/i);
    expect(() =>
      normalizeCommercialAvailabilityReconfirmation({
        availabilityState: 'available_confirmed',
        occupationDate: null,
        confirmationSource: 'broker',
        confirmationSourceLabel: null,
        lastConfirmedAt: '2026-09-29T10:00:00.000Z',
        reconfirmationDueAt: '2026-09-28T10:00:00.000Z',
      }),
    ).toThrow(/on or after/i);
    expect(
      normalizeCommercialAvailabilityReconfirmation({
        availabilityState: 'available_upcoming',
        occupationDate: '2026-10-01',
        confirmationSource: 'other',
        confirmationSourceLabel: 'Property manager on site',
        lastConfirmedAt: '2026-08-29T10:00:00.000Z',
        reconfirmationDueAt: '2026-09-28T10:00:00.000Z',
      }),
    ).toMatchObject({
      availabilityState: 'available_upcoming',
      occupationDate: '2026-10-01',
      confirmationSource: 'other',
      confirmationSourceLabel: 'Property manager on site',
      lastConfirmedAt: '2026-08-29 10:00:00',
      reconfirmationDueAt: '2026-09-28 10:00:00',
    });
  });

  it('requires a concrete description when a draft uses the Other confirmation source', () => {
    expect(() =>
      assertCommercialAvailabilityFreshness({
        availabilityState: 'available_confirmed',
        confirmationSource: 'other',
        confirmationSourceLabel: ' ',
        lastConfirmedAt: '2026-08-29T10:00:00.000Z',
        reconfirmationDueAt: '2026-09-28T10:00:00.000Z',
      }),
    ).toThrow(/describe the source/i);

    expect(() =>
      assertCommercialAvailabilityFreshness({
        availabilityState: 'available_confirmed',
        confirmationSource: 'other',
        confirmationSourceLabel: 'Asset manager confirmation',
        lastConfirmedAt: '2026-08-29T10:00:00.000Z',
        reconfirmationDueAt: '2026-09-28T10:00:00.000Z',
      }),
    ).not.toThrow();
  });

  it('keeps stale and under-offer inventory out of public discovery', () => {
    expect(isPublicCommercialAvailabilityDiscoverable({ state: 'available_confirmed' })).toBe(true);
    expect(isPublicCommercialAvailabilityDiscoverable({ state: 'available_upcoming' })).toBe(true);
    expect(
      isPublicCommercialAvailabilityDiscoverable({
        state: 'available_confirmed',
        reconfirmationDueAt: null,
      }),
    ).toBe(false);
    expect(
      isPublicCommercialAvailabilityDiscoverable({
        state: 'available_upcoming',
        reconfirmationDueAt: 'not-a-date',
      }),
    ).toBe(false);
    expect(
      isPublicCommercialAvailabilityDiscoverable(
        { state: 'available_upcoming', reconfirmationDueAt: '2999-01-01T00:00:00Z' },
        new Date('2026-08-30T00:00:00Z'),
      ),
    ).toBe(false);
    expect(
      isPublicCommercialAvailabilityDiscoverable(
        { state: 'available_confirmed', reconfirmationDueAt: '2026-08-29T00:00:00Z' },
        new Date('2026-08-30T00:00:00Z'),
      ),
    ).toBe(false);
    expect(
      isPublicCommercialAvailabilityDiscoverable(
        { state: 'available_confirmed', reconfirmationDueAt: '2026-08-30T00:00:00Z' },
        new Date('2026-08-30T00:00:00Z'),
      ),
    ).toBe(true);
    expect(
      isPublicCommercialAvailabilityDiscoverable(
        {
          state: 'available_confirmed',
          confirmationSource: null,
          confirmedAt: '2026-08-29T00:00:00Z',
          reconfirmationDueAt: '2026-09-30T00:00:00Z',
        },
        new Date('2026-08-30T00:00:00Z'),
      ),
    ).toBe(false);
    expect(
      isPublicCommercialAvailabilityDiscoverable(
        {
          state: 'available_upcoming',
          confirmationSource: 'landlord',
          confirmedAt: '2026-08-29T00:00:00Z',
          reconfirmationDueAt: '2026-09-30T00:00:00Z',
          occupationDate: null,
        },
        new Date('2026-08-30T00:00:00Z'),
      ),
    ).toBe(false);
    expect(isPublicCommercialAvailabilityDiscoverable({ state: 'needs_reconfirmation' })).toBe(
      false,
    );
    expect(isPublicCommercialAvailabilityDiscoverable({ state: 'under_offer' })).toBe(false);
    expect(
      isPublicCommercialAvailabilityDiscoverable(
        {
          state: 'available_confirmed',
          confirmationSource: 'landlord',
          confirmedAt: '2026-08-31T00:00:00Z',
          reconfirmationDueAt: '2026-09-30T00:00:00Z',
        },
        new Date('2026-08-30T00:00:00Z'),
      ),
    ).toBe(false);
    expect(
      isPublicCommercialAvailabilityDiscoverable(
        {
          state: 'available_upcoming',
          confirmationSource: 'landlord',
          confirmedAt: '2026-08-29T00:00:00Z',
          reconfirmationDueAt: '2026-09-30T00:00:00Z',
          occupationDate: '2026-08-29',
        },
        new Date('2026-08-30T00:00:00Z'),
      ),
    ).toBe(false);
  });

  it('does not leak an invalid confirmation source into public provenance', () => {
    expect(
      availabilityPresentation({
        availabilityState: 'available_confirmed',
        occupationDate: null,
        confirmationSource: 'invented-source',
        confirmationSourceLabel: null,
        lastConfirmedAt: '2026-08-29T00:00:00Z',
        reconfirmationDueAt: '2026-09-30T00:00:00Z',
      }),
    ).toMatchObject({ source: null, confirmationSource: null });
    expect(
      availabilityPresentation({
        availabilityState: 'available_confirmed',
        occupationDate: null,
        confirmationSource: 'invented-source',
        confirmationSourceLabel: 'Unverified label',
        lastConfirmedAt: '2026-08-29T00:00:00Z',
        reconfirmationDueAt: '2026-09-30T00:00:00Z',
      }),
    ).toMatchObject({ source: null, confirmationSource: null });
    expect(
      availabilityPresentation({
        availabilityState: 'available_confirmed',
        occupationDate: null,
        confirmationSource: 'broker',
        confirmationSourceLabel: '  ',
        lastConfirmedAt: '2026-08-29T00:00:00Z',
        reconfirmationDueAt: '2026-09-30T00:00:00Z',
      }),
    ).toMatchObject({ source: 'Broker / agent', confirmationSource: 'broker' });
  });

  it('moves a vacancy out of public discovery without retaining a future occupation claim', () => {
    expect(
      normalizeCommercialAvailabilityStatusUpdate({ availabilityState: 'under_offer' }),
    ).toEqual({ availabilityState: 'under_offer', occupationDate: null });
    expect(normalizeCommercialAvailabilityStatusUpdate({ availabilityState: 'withdrawn' })).toEqual(
      { availabilityState: 'withdrawn', occupationDate: null },
    );
    expect(() =>
      normalizeCommercialAvailabilityStatusUpdate({
        availabilityState: 'available_confirmed' as any,
      }),
    ).toThrow(/non-public Commercial availability state/i);
  });

  it('enforces governed use-type, asset and space combinations', () => {
    expect(() =>
      assertCommercialSpaceIdentity({
        spaceClass: 'industrial_logistics',
        assetKind: 'industrial_park',
        spaceKind: 'warehouse',
      }),
    ).not.toThrow();
    expect(() =>
      assertCommercialSpaceIdentity({
        spaceClass: 'retail',
        assetKind: 'industrial_park',
        spaceKind: 'warehouse',
      }),
    ).toThrow(/retail spaces cannot/i);
  });

  it('rejects malformed typed specifications before they can become public facts', () => {
    expect(() =>
      assertCommercialSpecificationInput({
        specificationCode: 'parking_bays',
        valueState: 'known',
        numericValue: -1,
        textValue: null,
        booleanValue: null,
      }),
    ).toThrow(/cannot be negative/i);
    expect(() =>
      assertCommercialSpecificationInput({
        specificationCode: 'backup_power',
        valueState: 'known',
        numericValue: null,
        textValue: null,
        booleanValue: 2 as any,
      }),
    ).toThrow(/true or false/i);
  });

  it('fails closed for a malformed public Commercial record', () => {
    const row = {
      listing: {
        id: 1,
        slug: 'suite-1',
        title: 'Suite 1',
        description: 'Office suite',
        city: 'Johannesburg',
        suburb: 'Sandton',
        province: 'Gauteng',
      },
      asset: {
        id: 2,
        assetKind: 'office_building',
        name: 'Building',
        address: '1 Main Street',
      },
      space: {
        id: 3,
        spaceClass: 'office',
        spaceKind: 'office_suite',
        identifier: 'Suite 1',
        rentableAreaM2: '100',
        usableAreaM2: '90',
      },
      availability: {
        id: 4,
        availabilityState: 'available_confirmed',
        transactionType: 'lease',
        pricingMode: 'componentised',
        vatTreatment: 'excluded',
        occupationDate: null,
        confirmationSource: 'landlord',
        confirmationSourceLabel: null,
        lastConfirmedAt: '2026-08-29T00:00:00.000Z',
        reconfirmationDueAt: '2999-08-29T00:00:00.000Z',
      },
    };
    const related = {
      specifications: [
        {
          specificationCode: 'parking_bays',
          valueState: 'known',
          numericValue: '4',
          textValue: null,
          booleanValue: null,
        },
      ],
      economics: [
        {
          componentCode: 'base_rent',
          valueState: 'supplied',
          chargeBasis: 'per_m2_month',
          amountMinor: 12500,
          rangeMaximumMinor: null,
          vatTreatment: 'excluded',
        },
      ],
      leaseTerms: [],
      media: [],
    };
    expect(projectPublicCommercialRecord(row, related)).toMatchObject({
      listingId: 1,
      pricing: { mode: 'componentised' },
      space: { rentableAreaM2: '100' },
    });
    expect(
      projectPublicCommercialRecord(
        { ...row, space: { ...row.space, spaceClass: 'other' } },
        related,
      ),
    ).toBeNull();
    expect(
      projectPublicCommercialRecord(
        {
          ...row,
          listing: { ...row.listing, status: 'draft', propertyType: 'commercial', action: 'rent' },
        },
        related,
      ),
    ).toBeNull();
    expect(
      projectPublicCommercialRecord(row, {
        ...related,
        specifications: [
          {
            ...related.specifications[0],
            numericValue: ' ',
          },
        ],
      }),
    ).toBeNull();
    expect(
      projectPublicCommercialRecord(row, {
        ...related,
        leaseTerms: [
          {
            commercialAvailabilityId: 999,
            minimumLeaseMonths: 12,
          },
        ],
      }),
    ).toBeNull();
  });

  it('retains unresolved Cost Passport components instead of calculating them as zero', () => {
    const cost = deriveCommercialMonthlyOccupancyCost({
      rentableAreaM2: null,
      economics: [
        {
          componentCode: 'gross_rent',
          valueState: 'supplied',
          chargeBasis: 'per_m2_month',
          amountMinor: 21500,
          rangeMaximumMinor: null,
        },
        {
          componentCode: 'utilities',
          valueState: 'unknown',
          chargeBasis: null,
          amountMinor: null,
          rangeMaximumMinor: null,
        },
      ],
    });
    expect(cost.components).toEqual([]);
    expect(cost.unknownComponentCodes).toEqual(['gross_rent', 'utilities']);
  });

  it('normalizes ISO API timestamps to strict-MySQL UTC without a timezone shift', () => {
    expect(toMySqlDateTime('2026-08-20T08:00:00.000Z')).toBe('2026-08-20 08:00:00');
    expect(toMySqlDateTime('2026-08-20T10:00:00+02:00')).toBe('2026-08-20 08:00:00');
  });

  it('materializes agency-principal custody without creating an Agent profile', () => {
    expect(
      deriveCommercialListingSupplierCustody({
        user: { role: 'agency_admin', agencyId: 44 },
        agent: null,
        agencyExists: true,
      }),
    ).toEqual({ agentId: null, agencyId: 44 });
  });

  it('preserves approved Agent custody and fails closed without a durable recipient', () => {
    expect(
      deriveCommercialListingSupplierCustody({
        user: { role: 'agent', agencyId: 44 },
        agent: { id: 9, agencyId: 44, status: 'approved' },
        agencyExists: true,
      }),
    ).toEqual({ agentId: 9, agencyId: 44 });
    expect(() =>
      deriveCommercialListingSupplierCustody({
        user: { role: 'property_developer', agencyId: null },
        agent: null,
        agencyExists: true,
      }),
    ).toThrow(/canonical Agent or agency-principal/i);
    expect(() =>
      deriveCommercialListingSupplierCustody({
        user: { role: 'agency_admin', agencyId: 44 },
        agent: null,
        agencyExists: false,
      }),
    ).toThrow(/agency is not an active canonical authority/i);
  });

  it('does not hand a Commercial enquiry across conflicting agency claims', () => {
    expect(
      isCommercialRecipientAssociationCoherent({ listingAgencyId: 44, agentAgencyId: 44 }),
    ).toBe(true);
    expect(
      isCommercialRecipientAssociationCoherent({ listingAgencyId: 44, agentAgencyId: 45 }),
    ).toBe(false);
    expect(
      isCommercialRecipientAssociationCoherent({ listingAgencyId: 44, agentAgencyId: null }),
    ).toBe(true);
    expect(
      isCommercialRecipientAssociationCoherent({
        listingAgencyId: 'not-an-id' as any,
        agentAgencyId: null,
      }),
    ).toBe(false);
    expect(
      isCommercialRecipientAssociationCoherent({ listingAgencyId: 44, agentAgencyId: true as any }),
    ).toBe(false);
  });

  it('allows an agency principal to manage only marketing carried by that agency', () => {
    const agencyScope = { kind: 'agency_principal' as const, userId: 41, agencyId: 44 };
    expect(canManageCommercialMarketingListing(agencyScope, { ownerId: 9, agencyId: 44 })).toBe(
      true,
    );
    expect(canManageCommercialMarketingListing(agencyScope, { ownerId: 9, agencyId: 45 })).toBe(
      false,
    );
    expect(
      canManageCommercialMarketingListing(
        { kind: 'supplier', userId: 41 },
        { ownerId: 9, agencyId: 44 },
      ),
    ).toBe(false);
  });

  it('keeps Commercial media reservation bound to an active canonical link', () => {
    const agencyScope = { kind: 'agency_principal' as const, userId: 41, agencyId: 44 };
    expect(
      canManageCommercialMarketingMedia(
        agencyScope,
        { ownerId: 9, agencyId: 44, propertyType: 'commercial' },
        true,
      ),
    ).toBe(true);
    expect(
      canManageCommercialMarketingMedia(
        agencyScope,
        { ownerId: 9, agencyId: 44, propertyType: 'commercial' },
        false,
      ),
    ).toBe(false);
    expect(
      canManageCommercialMarketingMedia(
        agencyScope,
        { ownerId: 9, agencyId: 44, propertyType: 'house' },
        true,
      ),
    ).toBe(false);
  });

  it('assigns Commercial marketing media a stable gallery order and primary image', () => {
    expect(
      commercialMarketingMediaPlacement(
        [
          {
            mediaType: 'pdf',
            processingStatus: 'completed',
            originalUrl: 'properties/1/brochure.pdf',
            displayOrder: 0,
          },
        ],
        'image',
      ),
    ).toEqual({ displayOrder: 1, isPrimary: 1 });
    expect(
      commercialMarketingMediaPlacement(
        [
          {
            mediaType: 'image',
            processingStatus: 'completed',
            processedUrl: 'properties/1/existing.jpg',
            displayOrder: 3,
          },
        ],
        'image',
      ),
    ).toEqual({ displayOrder: 4, isPrimary: 0 });
  });

  it('counts only confirmed, deliverable marketing media for resumed-draft review', () => {
    expect(
      commercialMarketingMediaSummary([
        {
          mediaType: 'image',
          processingStatus: 'completed',
          processedUrl: 'properties/9/hero.jpg',
        },
        {
          mediaType: 'video',
          processingStatus: 'processing',
          processedUrl: 'properties/9/tour.mp4',
        },
        {
          mediaType: 'pdf',
          processingStatus: 'completed',
          originalUrl: '',
        },
      ]),
    ).toEqual({ completedMediaCount: 1, completedImageCount: 1 });
  });

  it('exposes only completed Commercial media through a public delivery projection', () => {
    const projected = projectPublicCommercialMedia(
      [
        {
          id: 12,
          mediaType: 'image',
          processedUrl: 'properties/12/late.jpg',
          thumbnailUrl: 'properties/12/late-thumb.jpg',
          processingStatus: 'completed',
          displayOrder: 4,
          isPrimary: 0,
        },
        {
          id: 11,
          mediaType: 'image',
          processedUrl: 'properties/12/first.jpg',
          processingStatus: 'completed',
          displayOrder: 0,
          isPrimary: 1,
        },
        {
          id: 13,
          mediaType: 'video',
          processedUrl: 'properties/12/pending.mp4',
          processingStatus: 'processing',
          displayOrder: 1,
        },
        {
          id: 14,
          mediaType: 'pdf',
          processedUrl: 'private/land/12/evidence.pdf',
          processingStatus: 'completed',
          displayOrder: 2,
        },
      ],
      rawUrl => {
        if (rawUrl?.startsWith('private/')) throw new Error('private evidence');
        return rawUrl ? `/public/${rawUrl}` : null;
      },
    );

    expect(projected).toEqual([
      expect.objectContaining({
        id: 11,
        url: '/public/properties/12/first.jpg',
        isPrimary: 1,
        displayOrder: 0,
      }),
      expect.objectContaining({
        id: 12,
        url: '/public/properties/12/late.jpg',
        thumbnailUrl: '/public/properties/12/late-thumb.jpg',
        isPrimary: 0,
        displayOrder: 4,
      }),
    ]);
  });
});
