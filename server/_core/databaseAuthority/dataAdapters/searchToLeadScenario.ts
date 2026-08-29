import type { AuthorizedDatabaseOperation } from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import { databaseAuthorityChildEnvironment } from '../context';
import type { ResolvedDatabaseAuthority } from '../types';
import {
  assertOperation,
  queryRows,
  requireAcceptedMigrationHead,
  requireReferenceAdapterTarget,
  rowValue,
  stableDigest,
  withTransaction,
  type AdapterEvidence,
} from './common';
import {
  verifyCanonicalGeographyReferenceData,
  type GeographyReferenceEvidence,
} from './canonicalGeography';
import {
  CANONICAL_AGENT_LAUNCH_ACCESS,
  CANONICAL_DEVELOPER_LAUNCH_ACCESS,
} from './canonicalCommercial';
import type { MoneyFact, RecurringCosts } from '../../../../shared/pricing-contract';
import type { RentalTerms } from '../../../../shared/rental-terms-contract';

export const SEARCH_TO_LEAD_SCENARIO_VERSION = 'search-to-lead-v3' as const;
export const SEARCH_TO_LEAD_SCENARIO_CAPTURE_REQUEST_ID = 'dba-search-to-lead-v3-property-enquiry';

function truthfulDirectAcknowledgement(lead: {
  duplicate?: boolean;
  message?: string | null;
}): boolean {
  return lead.duplicate
    ? lead.message === 'This enquiry has already been received by the responsible team.'
    : lead.message === 'Your enquiry has been recorded and sent to the responsible team.';
}

function truthfulPlatformAcknowledgement(lead: {
  duplicate?: boolean;
  message?: string | null;
}): boolean {
  return lead.duplicate
    ? lead.message === 'This enquiry has already been received by Property Listify operations.'
    : lead.message === 'Your enquiry has been recorded. Property Listify will review the request.';
}

const SCENARIO_IDS = Object.freeze({
  developerUser: 990001,
  agentUser: 990002,
  agencyOnlyUser: 990003,
  platformOperationsUser: 990004,
  unrelatedAgencyAdminUser: 990005,
  unrelatedAgentUser: 990006,
  unrelatedDeveloperUser: 990007,
  agency: 990001,
  agencyOnly: 990002,
  unrelatedAgency: 990003,
  agent: 990001,
  unrelatedAgent: 990002,
  developerOrganisation: 990001,
  developerMembership: 990001,
  unrelatedDeveloperOrganisation: 990002,
  unrelatedDeveloperMembership: 990002,
  cataloguePublisher: 990001,
  unrelatedDeveloperPublisher: 990002,
  platformPublisher: 990003,
  agentMembership: 995001,
  development: 990001,
  property: 990001,
  agentProperty: 990001,
  agencyProperty: 990002,
  platformProperty: 990003,
  orphanProperty: 990004,
  unpublishedProperty: 990005,
  archivedProperty: 990006,
  pendingProperty: 990007,
  incoherentProperty: 990008,
  rentalProperty: 990009,
  agentListing: 991001,
  agencyListing: 991002,
  platformListing: 991003,
  unpublishedListing: 991005,
  archivedListing: 991006,
  pendingListing: 991007,
  incoherentListing: 991008,
  rentalListing: 991009,
  agentMedia: 992001,
  agentGalleryArrivalMedia: 992010,
  agentGalleryLivingMedia: 992011,
  agentGallerySuiteMedia: 992012,
  agentGalleryPoolMedia: 992013,
  agentGalleryStudyMedia: 992014,
  agencyMedia: 992002,
  platformMedia: 992003,
  incoherentMedia: 992008,
  rentalMedia: 992009,
  agentPropertyImage: 993001,
  agentGalleryArrivalPropertyImage: 993010,
  agentGalleryLivingPropertyImage: 993011,
  agentGallerySuitePropertyImage: 993012,
  agentGalleryPoolPropertyImage: 993013,
  agentGalleryStudyPropertyImage: 993014,
  agencyPropertyImage: 993002,
  platformPropertyImage: 993003,
  incoherentPropertyImage: 993008,
  rentalPropertyImage: 993009,
  unit: '00000000-0000-4000-8000-000000000001',
});

export const SEARCH_TO_LEAD_DETERMINISTIC_USER_IDS = Object.freeze([
  SCENARIO_IDS.developerUser,
  SCENARIO_IDS.agentUser,
  SCENARIO_IDS.agencyOnlyUser,
  SCENARIO_IDS.platformOperationsUser,
  SCENARIO_IDS.unrelatedAgencyAdminUser,
  SCENARIO_IDS.unrelatedAgentUser,
  SCENARIO_IDS.unrelatedDeveloperUser,
] as const);

const SCENARIO_PAYLOAD = Object.freeze({
  version: SEARCH_TO_LEAD_SCENARIO_VERSION,
  ids: SCENARIO_IDS,
  location: { province: 'gauteng', city: 'johannesburg', suburb: 'sandton' },
  presentation: {
    fixtureSet: 'launch-discovery-v2-property-detail-preview-clean-media',
    mediaAuthority: 'localhost-3009-public-properties',
    publicAgentAuthority: 'paid-access-and-current-membership',
  },
  captureRequestId: SEARCH_TO_LEAD_SCENARIO_CAPTURE_REQUEST_ID,
  contact: { email: 'dba-prospect@invalid.example', phone: '+27000000000' },
});

export const SEARCH_TO_LEAD_SCENARIO_DIGEST = stableDigest(SCENARIO_PAYLOAD);

export type SearchToLeadScenarioEvidence = AdapterEvidence & {
  expected: {
    eligibleProperties: number;
    eligibleDevelopments: number;
    canonicalLocation: string;
  };
  verified: {
    eligibleProperties: number;
    eligibleDevelopments: number;
    canonicalLocation: string;
    propertyIds: number[];
    excludedPropertyIds: number[];
    propertyId: number;
    developmentId: number;
    unitId: string;
  };
  migrationHead: string;
  acceptance?: {
    locationState: 'resolved';
    locationContext: { provinceId: number; cityId: number; suburbId: number };
    propertyCardHref: string;
    developmentCardHref: string;
    propertyPage: string;
    developmentPage: string;
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
    leadId: number;
    replayedLeadId: number;
    duplicateReplay: true;
    leadCustody: string;
    deliveryStatus: string;
    deliveryMethod: string;
    sourceCounts: { manual: number; development: number };
    development: {
      leadId: number;
      replayedLeadId: number;
      duplicateReplay: true;
      conflictingReplay: 'conflict';
      durableLeadCount: number;
      acknowledgement: string;
    };
    scenarios: Record<
      string,
      {
        propertyId: number;
        cardHref: string;
        detailIdentity: { role: string; provenance: string; name: string };
        leadId: number;
        replayedLeadId: number;
        duplicateReplay: true;
        conflictingReplay: 'conflict';
        durableLeadCount: number;
        custody: {
          leadCustody: string;
          recipientType: string;
          recipientId: number | null;
          deliveryStatus: string;
          deliveryMethod: string;
        };
        acknowledgement: string;
      }
    >;
    discovery: {
      mapRentalExcluded: true;
      comparisonRentalExcluded: true;
      featuredRentalExcluded: true;
      trendingRentalExcluded: true;
      relatedRentalExcluded: true;
    };
    rental: {
      propertyId: number;
      saleSearchExcluded: true;
      rentSearch: { included: true; propertyCardHref: string; total: number };
      detail: {
        id: number;
        listingType: 'rent';
        transactionType: 'rent';
        price: number;
        pricingIntent: 'rent';
        monthlyRent: number;
        tenantTerms: {
          availability: 'Available now';
          lease: '12-month minimum';
          utilities: 'Partly included';
          furnishing: 'Furnished';
        };
        publicIdentity: { role: string; provenance: string; name: string };
      };
      enquiry: {
        leadId: number;
        replayedLeadId: number;
        duplicateReplay: true;
        conflictingReplay: 'conflict';
        durableLeadCount: number;
        custody: {
          leadCustody: string;
          recipientType: string;
          recipientId: number | null;
          deliveryStatus: string;
          deliveryMethod: string;
        };
        acknowledgement: string;
      };
    };
    negative: Record<
      string,
      { propertyId: number; searchIncluded: false; detail: null; enquiry: 'rejected' }
    >;
    authorization: {
      agent: { ownerVisible: true; unrelatedDenied: true };
      agency: { ownerVisible: true; unrelatedDenied: true };
      developer: { ownerVisible: true; unrelatedDenied: true };
      platform: { operationsVisible: true; nonOperationsDenied: true };
    };
  };
};

function asId(row: Record<string, unknown>, label: string): number {
  const id = Number(rowValue(row, 'id'));
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new Error(`Search-to-Lead scenario ${label} has an invalid ID.`);
  return id;
}

function comparable(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

export function buildScenarioInsertStatement(
  table: string,
  columns: readonly string[],
  values: readonly unknown[],
): string {
  if (
    !/^[A-Za-z_][A-Za-z0-9_]*$/.test(table) ||
    columns.some(column => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(column))
  ) {
    throw new Error('Search-to-Lead scenario insert contract contains an invalid identifier.');
  }
  if (columns.length !== values.length) {
    throw new Error(
      `Search-to-Lead scenario insert contract for ${table} has ${columns.length} columns but ${values.length} values.`,
    );
  }
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
}

async function ensureDeterministicRow(input: {
  connection: AuthoritySqlConnection;
  table: string;
  id: number | string;
  columns: readonly string[];
  expected: Record<string, string | number | null>;
  insertColumns: readonly string[];
  insertValues: readonly unknown[];
}): Promise<void> {
  const insertStatement = buildScenarioInsertStatement(
    input.table,
    input.insertColumns,
    input.insertValues,
  );
  const rows = await queryRows(
    input.connection,
    `SELECT ${input.columns.join(', ')} FROM ${input.table} WHERE id = ?`,
    [input.id],
  );
  if (rows.length > 1)
    throw new Error(
      `Search-to-Lead scenario has duplicate deterministic ID ${input.table}:${input.id}.`,
    );
  if (rows.length === 1) {
    for (const [column, expected] of Object.entries(input.expected)) {
      if (comparable(rowValue(rows[0], column)) !== comparable(expected)) {
        throw new Error(
          `Search-to-Lead scenario row ${input.table}:${input.id} conflicts at ${column}.`,
        );
      }
    }
    return;
  }
  await input.connection.execute(insertStatement, input.insertValues);
}

const FIXTURE_TIMESTAMP = '2026-01-01 00:00:00';

type FixtureGalleryImage = {
  mediaId: number;
  propertyImageId: number;
  imageUrl: string;
  displayOrder: number;
};

type ManualFixtureDefinition = {
  propertyId: number;
  listingId: number;
  mediaId: number;
  propertyImageId: number;
  title: string;
  description: string;
  propertyType: 'house' | 'apartment';
  action: 'sell' | 'rent';
  propertyStatus: 'available' | 'archived' | 'pending';
  listingStatus: 'published' | 'draft' | 'archived' | 'pending_review';
  approvalStatus: 'approved' | 'pending';
  ownerId: number;
  agentId: number | null;
  agencyId: number | null;
  cataloguePublisherId: number | null;
  price: number;
  imageUrl: string;
  bedrooms?: number;
  bathrooms?: number;
  internalAreaM2?: number;
  erfAreaM2?: number;
  garages?: number;
  parkingBays?: number;
  saleRecurringCosts?: RecurringCosts;
  rentalDeposit?: MoneyFact;
  rentalTerms?: RentalTerms;
  featuresContext?: Record<string, unknown>;
  propertyHighlights?: string[];
  galleryImages?: readonly FixtureGalleryImage[];
  incoherentProjection?: boolean;
};

const MANUAL_FIXTURES: readonly ManualFixtureDefinition[] = [
  {
    propertyId: SCENARIO_IDS.agentProperty,
    listingId: SCENARIO_IDS.agentListing,
    mediaId: SCENARIO_IDS.agentMedia,
    propertyImageId: SCENARIO_IDS.agentPropertyImage,
    title: 'Light-filled family home with garden and solar',
    description:
      'A light-filled family home designed for easy living and entertaining, with open-plan spaces flowing to a covered patio, pool and landscaped garden. Practical details include a dedicated study, solar backup, borehole water and secure parking for a calmer everyday rhythm.',
    propertyType: 'house',
    action: 'sell',
    propertyStatus: 'available',
    listingStatus: 'published',
    approvalStatus: 'approved',
    ownerId: SCENARIO_IDS.agentUser,
    agentId: SCENARIO_IDS.agent,
    agencyId: SCENARIO_IDS.agency,
    cataloguePublisherId: null,
    price: 3850000,
    imageUrl: 'http://localhost:3009/properties/property-detail-preview-v1/hero-exterior.webp',
    bedrooms: 4,
    bathrooms: 3,
    internalAreaM2: 238,
    erfAreaM2: 520,
    garages: 2,
    parkingBays: 2,
    saleRecurringCosts: {
      ratesAndTaxes: { status: 'known', amount: 2180, cadence: 'monthly' },
      hoaEstateLevy: { status: 'known', amount: 1850, cadence: 'monthly' },
    },
    featuresContext: {
      version: 1,
      spaces: [
        'study_office',
        'entertainment_area',
        'scullery',
        'pantry',
        'balcony_patio',
        'garden',
        'pool',
        'staff_quarters',
      ],
      context: {
        setting: 'estate',
        controlledAccess: 'controlled',
        securityProfile: 'security_estate',
      },
      utilities: {
        electricitySupply: 'municipal',
        backupPower: 'solar',
        waterSupply: 'borehole',
        wastewaterSystem: 'municipal',
        waterHeating: 'solar_geyser',
        internetAccess: 'fibre',
      },
      security: {
        status: 'known',
        features: ['guard_24hr', 'access_control', 'cctv', 'electric_fence'],
      },
      petPolicy: 'allowed',
      highlights: ['high_ceilings', 'modern_finishes', 'natural_light', 'open_plan'],
      customFeatures: [],
      customHighlights: [],
    },
    propertyHighlights: ['Solar backup', 'Borehole water', 'Study / office', 'Landscaped garden'],
    galleryImages: [
      {
        mediaId: SCENARIO_IDS.agentGalleryArrivalMedia,
        propertyImageId: SCENARIO_IDS.agentGalleryArrivalPropertyImage,
        imageUrl:
          'http://localhost:3009/properties/property-detail-preview-v1/arrival-exterior.webp',
        displayOrder: 1,
      },
      {
        mediaId: SCENARIO_IDS.agentGalleryLivingMedia,
        propertyImageId: SCENARIO_IDS.agentGalleryLivingPropertyImage,
        imageUrl: 'http://localhost:3009/properties/property-detail-preview-v1/living-kitchen.webp',
        displayOrder: 2,
      },
      {
        mediaId: SCENARIO_IDS.agentGallerySuiteMedia,
        propertyImageId: SCENARIO_IDS.agentGallerySuitePropertyImage,
        imageUrl:
          'http://localhost:3009/properties/property-detail-preview-v1/principal-suite.webp',
        displayOrder: 3,
      },
      {
        mediaId: SCENARIO_IDS.agentGalleryPoolMedia,
        propertyImageId: SCENARIO_IDS.agentGalleryPoolPropertyImage,
        imageUrl: 'http://localhost:3009/properties/property-detail-preview-v1/pool-garden.webp',
        displayOrder: 4,
      },
      {
        mediaId: SCENARIO_IDS.agentGalleryStudyMedia,
        propertyImageId: SCENARIO_IDS.agentGalleryStudyPropertyImage,
        imageUrl: 'http://localhost:3009/properties/property-detail-preview-v1/study.webp',
        displayOrder: 5,
      },
    ],
  },
  {
    propertyId: SCENARIO_IDS.agencyProperty,
    listingId: SCENARIO_IDS.agencyListing,
    mediaId: SCENARIO_IDS.agencyMedia,
    propertyImageId: SCENARIO_IDS.agencyPropertyImage,
    title: 'Contemporary Sandton home with a private study',
    description:
      'A contemporary lock-up-and-go home with considered finishes, controlled access and outdoor living.',
    propertyType: 'house',
    action: 'sell',
    propertyStatus: 'available',
    listingStatus: 'published',
    approvalStatus: 'approved',
    ownerId: SCENARIO_IDS.agencyOnlyUser,
    agentId: null,
    agencyId: SCENARIO_IDS.agencyOnly,
    cataloguePublisherId: null,
    price: 2950000,
    imageUrl: 'http://localhost:3009/properties/ZcWGSahwTdDK.jpg',
    bedrooms: 3,
    bathrooms: 2,
    internalAreaM2: 168,
    erfAreaM2: 310,
    featuresContext: {
      version: 1,
      spaces: ['study_office', 'balcony_patio'],
      context: { setting: 'estate', controlledAccess: 'controlled' },
      utilities: { backupPower: 'inverter', internetAccess: 'fibre' },
      security: { status: 'known', features: ['guard_24hr', 'access_control'] },
      petPolicy: 'allowed_with_permission',
      highlights: ['modern_finishes'],
      customFeatures: [],
      customHighlights: [],
    },
    propertyHighlights: ['Private study', '24-hour security', 'Pet friendly'],
  },
  {
    propertyId: SCENARIO_IDS.platformProperty,
    listingId: SCENARIO_IDS.platformListing,
    mediaId: SCENARIO_IDS.platformMedia,
    propertyImageId: SCENARIO_IDS.platformPropertyImage,
    title: 'Modern apartment with balcony and city views',
    description:
      'A bright, modern apartment with a generous balcony, fibre connectivity and effortless city access.',
    propertyType: 'apartment',
    action: 'sell',
    propertyStatus: 'available',
    listingStatus: 'published',
    approvalStatus: 'approved',
    ownerId: SCENARIO_IDS.platformOperationsUser,
    agentId: null,
    agencyId: null,
    cataloguePublisherId: SCENARIO_IDS.platformPublisher,
    price: 1850000,
    imageUrl: 'http://localhost:3009/properties/35t5znQJ1v9V.jpg',
    bedrooms: 2,
    bathrooms: 2,
    internalAreaM2: 96,
    featuresContext: {
      version: 1,
      spaces: ['balcony_patio'],
      context: { setting: 'complex', controlledAccess: 'controlled' },
      utilities: { backupPower: 'generator', internetAccess: 'fibre' },
      security: { status: 'known', features: ['cctv', 'access_control'] },
      petPolicy: 'allowed_with_permission',
      highlights: ['natural_light', 'scenic_outlook'],
      customFeatures: [],
      customHighlights: [],
    },
    propertyHighlights: ['Private balcony', 'Fibre ready', 'Natural light'],
  },
  {
    propertyId: SCENARIO_IDS.unpublishedProperty,
    listingId: SCENARIO_IDS.unpublishedListing,
    mediaId: SCENARIO_IDS.unpublishedListing,
    propertyImageId: SCENARIO_IDS.unpublishedListing,
    title: 'DBA Unpublished Sale Property',
    description: 'A source listing that has not reached the public publication state.',
    propertyType: 'house',
    action: 'sell',
    propertyStatus: 'available',
    listingStatus: 'draft',
    approvalStatus: 'pending',
    ownerId: SCENARIO_IDS.agentUser,
    agentId: SCENARIO_IDS.agent,
    agencyId: SCENARIO_IDS.agency,
    cataloguePublisherId: null,
    price: 1990000,
    imageUrl: 'https://cdn.invalid.example/dba-unpublished-v1.jpg',
  },
  {
    propertyId: SCENARIO_IDS.archivedProperty,
    listingId: SCENARIO_IDS.archivedListing,
    mediaId: SCENARIO_IDS.archivedListing,
    propertyImageId: SCENARIO_IDS.archivedListing,
    title: 'DBA Archived Sale Property',
    description: 'A source listing removed from the public publication lifecycle.',
    propertyType: 'house',
    action: 'sell',
    propertyStatus: 'archived',
    listingStatus: 'archived',
    approvalStatus: 'approved',
    ownerId: SCENARIO_IDS.agentUser,
    agentId: SCENARIO_IDS.agent,
    agencyId: SCENARIO_IDS.agency,
    cataloguePublisherId: null,
    price: 1990000,
    imageUrl: 'https://cdn.invalid.example/dba-archived-v1.jpg',
  },
  {
    propertyId: SCENARIO_IDS.pendingProperty,
    listingId: SCENARIO_IDS.pendingListing,
    mediaId: SCENARIO_IDS.pendingListing,
    propertyImageId: SCENARIO_IDS.pendingListing,
    title: 'DBA Pending Sale Property',
    description: 'A source listing awaiting approval and publication.',
    propertyType: 'house',
    action: 'sell',
    propertyStatus: 'pending',
    listingStatus: 'pending_review',
    approvalStatus: 'pending',
    ownerId: SCENARIO_IDS.agentUser,
    agentId: SCENARIO_IDS.agent,
    agencyId: SCENARIO_IDS.agency,
    cataloguePublisherId: null,
    price: 1990000,
    imageUrl: 'https://cdn.invalid.example/dba-pending-v1.jpg',
  },
  {
    propertyId: SCENARIO_IDS.incoherentProperty,
    listingId: SCENARIO_IDS.incoherentListing,
    mediaId: SCENARIO_IDS.incoherentMedia,
    propertyImageId: SCENARIO_IDS.incoherentPropertyImage,
    title: 'DBA Incoherent Sale Property',
    description: 'A source listing whose public projection intentionally has stale facts.',
    propertyType: 'house',
    action: 'sell',
    propertyStatus: 'available',
    listingStatus: 'published',
    approvalStatus: 'approved',
    ownerId: SCENARIO_IDS.agentUser,
    agentId: SCENARIO_IDS.agent,
    agencyId: SCENARIO_IDS.agency,
    cataloguePublisherId: null,
    price: 1990000,
    imageUrl: 'https://cdn.invalid.example/dba-incoherent-v1.jpg',
    incoherentProjection: true,
  },
  {
    propertyId: SCENARIO_IDS.rentalProperty,
    listingId: SCENARIO_IDS.rentalListing,
    mediaId: SCENARIO_IDS.rentalMedia,
    propertyImageId: SCENARIO_IDS.rentalPropertyImage,
    title: 'Furnished Sandton apartment with backup power',
    description: 'A legitimate published rental home with a balcony, fibre and resilient power.',
    propertyType: 'apartment',
    action: 'rent',
    propertyStatus: 'available',
    listingStatus: 'published',
    approvalStatus: 'approved',
    ownerId: SCENARIO_IDS.agentUser,
    agentId: SCENARIO_IDS.agent,
    agencyId: SCENARIO_IDS.agency,
    cataloguePublisherId: null,
    price: 25000,
    rentalDeposit: { status: 'known', amount: 25000, provenance: 'advertiser' },
    rentalTerms: {
      version: 1,
      availability: { status: 'available_now' },
      lease: { status: 'fixed_term', minimumMonths: 12 },
      utilities: 'partially_included',
      furnishing: 'furnished',
    },
    imageUrl: 'http://localhost:3009/properties/40O7UI0lbxUn.jpg',
    bedrooms: 2,
    bathrooms: 2,
    internalAreaM2: 88,
    featuresContext: {
      version: 1,
      spaces: ['balcony_patio'],
      context: { setting: 'complex', controlledAccess: 'controlled' },
      utilities: { backupPower: 'inverter', internetAccess: 'fibre' },
      security: { status: 'known', features: ['access_control'] },
      petPolicy: 'allowed_with_permission',
      highlights: ['modern_finishes', 'natural_light'],
      customFeatures: [],
      customHighlights: [],
    },
    propertyHighlights: ['Inverter backup', 'Private balcony', 'Fibre ready'],
  },
];

function sourceDetailsForFixture(fixture: ManualFixtureDefinition): Record<string, unknown> {
  const bedrooms = fixture.bedrooms ?? (fixture.propertyType === 'apartment' ? 2 : 3);
  const bathrooms = fixture.bathrooms ?? 2;
  const internalAreaM2 =
    fixture.internalAreaM2 ?? (fixture.propertyType === 'apartment' ? 90 : 150);
  const erfAreaM2 = fixture.erfAreaM2 ?? (fixture.propertyType === 'apartment' ? undefined : 300);
  const common = {
    bedrooms,
    bathrooms,
    internalAreaM2,
    erfAreaM2,
    ...(fixture.garages !== undefined ? { garages: fixture.garages } : {}),
    ...(fixture.parkingBays !== undefined ? { parkingBays: fixture.parkingBays } : {}),
    ...(fixture.rentalTerms ? { rentalTerms: fixture.rentalTerms } : {}),
    featuresContext: fixture.featuresContext,
    propertyHighlights: fixture.propertyHighlights ?? [
      'Canonical source-backed fixture',
      'Published public facts',
    ],
  };
  return {
    ...common,
    pricingContract:
      fixture.action === 'sell'
        ? {
            version: 1,
            intent: 'sale',
            askingPrice: fixture.price,
            negotiability: 'not_negotiable',
            recurringCosts: fixture.saleRecurringCosts || {},
          }
        : {
            version: 1,
            intent: 'rent',
            monthlyRent: fixture.price,
            deposit: fixture.rentalDeposit || { status: 'unknown' },
          },
  };
}

/**
 * This adapter owns its deterministic source and public-projection fixture
 * snapshots. Keeping those two JSON documents equal is deliberate scenario
 * maintenance, not a runtime fallback or a schema-compatibility write.
 */
async function synchronizeOwnedFixtureSourceSnapshot(
  connection: AuthoritySqlConnection,
  fixture: ManualFixtureDefinition,
  sourceJson: string,
): Promise<void> {
  const listingRows = await queryRows(
    connection,
    'SELECT propertyDetails, description FROM listings WHERE id = ?',
    [fixture.listingId],
  );
  if (listingRows.length !== 1) {
    throw new Error(
      `Search-to-Lead scenario listing ${fixture.listingId} is missing its source snapshot.`,
    );
  }
  if (
    comparable(rowValue(listingRows[0], 'propertyDetails')) !== sourceJson ||
    comparable(rowValue(listingRows[0], 'description')) !== fixture.description
  ) {
    await connection.execute(
      'UPDATE listings SET propertyDetails = ?, description = ?, updatedAt = ? WHERE id = ?',
      [sourceJson, fixture.description, FIXTURE_TIMESTAMP, fixture.listingId],
    );
  }

  const propertyRows = await queryRows(
    connection,
    'SELECT propertySettings, description FROM properties WHERE id = ?',
    [fixture.propertyId],
  );
  if (propertyRows.length !== 1) {
    throw new Error(
      `Search-to-Lead scenario property ${fixture.propertyId} is missing its public snapshot.`,
    );
  }
  if (
    comparable(rowValue(propertyRows[0], 'propertySettings')) !== sourceJson ||
    comparable(rowValue(propertyRows[0], 'description')) !== fixture.description
  ) {
    await connection.execute(
      'UPDATE properties SET propertySettings = ?, description = ?, updatedAt = ? WHERE id = ?',
      [sourceJson, fixture.description, FIXTURE_TIMESTAMP, fixture.propertyId],
    );
  }
}

/** The public WhatsApp action is rendered only for this owned local fixture. */
async function synchronizeOwnedPreviewAgentContact(
  connection: AuthoritySqlConnection,
): Promise<void> {
  const rows = await queryRows(connection, 'SELECT phone, whatsapp FROM agents WHERE id = ?', [
    SCENARIO_IDS.agent,
  ]);
  if (rows.length !== 1)
    throw new Error('Search-to-Lead scenario agent is missing its public contact fixture.');

  const phone = '+27000000000';
  if (
    comparable(rowValue(rows[0], 'phone')) !== phone ||
    comparable(rowValue(rows[0], 'whatsapp')) !== phone
  ) {
    await connection.execute('UPDATE agents SET phone = ?, whatsapp = ? WHERE id = ?', [
      phone,
      phone,
      SCENARIO_IDS.agent,
    ]);
  }
}

type OwnedFixtureMediaSnapshot = {
  mediaId: number;
  propertyImageId: number;
  imageUrl: string;
  displayOrder: number;
  isPrimary: 0 | 1;
};

const ownedFixtureMediaSnapshots = (
  fixture: ManualFixtureDefinition,
): OwnedFixtureMediaSnapshot[] => [
  {
    mediaId: fixture.mediaId,
    propertyImageId: fixture.propertyImageId,
    imageUrl: fixture.imageUrl,
    displayOrder: 0,
    isPrimary: 1,
  },
  ...(fixture.galleryImages || []).map(image => ({
    mediaId: image.mediaId,
    propertyImageId: image.propertyImageId,
    imageUrl: image.imageUrl,
    displayOrder: image.displayOrder,
    isPrimary: 0 as const,
  })),
];

/**
 * The scenario owns these exact media IDs, their source listing and their
 * public projection. This is a bounded fixture refresh for local acceptance
 * data, never a runtime alternate-media fallback.
 */
async function synchronizeOwnedFixtureMediaSnapshot(
  connection: AuthoritySqlConnection,
  fixture: ManualFixtureDefinition,
): Promise<void> {
  for (const snapshot of ownedFixtureMediaSnapshots(fixture)) {
    const mediaRows = await queryRows(
      connection,
      `SELECT listingId, originalUrl, processedUrl, thumbnailUrl, previewUrl,
              width, height, mimeType, displayOrder, isPrimary, processingStatus
         FROM listing_media
        WHERE id = ?`,
      [snapshot.mediaId],
    );
    if (mediaRows.length > 1) {
      throw new Error(`Search-to-Lead scenario has duplicate media ID ${snapshot.mediaId}.`);
    }
    if (mediaRows.length === 1) {
      const row = mediaRows[0];
      if (Number(rowValue(row, 'listingId')) !== fixture.listingId) {
        throw new Error(
          `Search-to-Lead scenario media ${snapshot.mediaId} is not owned by listing ${fixture.listingId}.`,
        );
      }
      const hasDrift =
        comparable(rowValue(row, 'originalUrl')) !== snapshot.imageUrl ||
        comparable(rowValue(row, 'processedUrl')) !== snapshot.imageUrl ||
        comparable(rowValue(row, 'thumbnailUrl')) !== snapshot.imageUrl ||
        comparable(rowValue(row, 'previewUrl')) !== snapshot.imageUrl ||
        Number(rowValue(row, 'width')) !== 1440 ||
        Number(rowValue(row, 'height')) !== 960 ||
        rowValue(row, 'mimeType') !== 'image/webp' ||
        Number(rowValue(row, 'displayOrder')) !== snapshot.displayOrder ||
        Number(rowValue(row, 'isPrimary')) !== snapshot.isPrimary ||
        rowValue(row, 'processingStatus') !== 'completed';
      if (hasDrift) {
        await connection.execute(
          `UPDATE listing_media
              SET originalUrl = ?, processedUrl = ?, thumbnailUrl = ?, previewUrl = ?,
                  width = ?, height = ?, mimeType = ?, displayOrder = ?, isPrimary = ?, processingStatus = ?
            WHERE id = ? AND listingId = ?`,
          [
            snapshot.imageUrl,
            snapshot.imageUrl,
            snapshot.imageUrl,
            snapshot.imageUrl,
            1440,
            960,
            'image/webp',
            snapshot.displayOrder,
            snapshot.isPrimary,
            'completed',
            snapshot.mediaId,
            fixture.listingId,
          ],
        );
      }
    }

    const imageRows = await queryRows(
      connection,
      'SELECT propertyId, imageUrl, isPrimary, displayOrder FROM propertyImages WHERE id = ?',
      [snapshot.propertyImageId],
    );
    if (imageRows.length > 1) {
      throw new Error(
        `Search-to-Lead scenario has duplicate property image ID ${snapshot.propertyImageId}.`,
      );
    }
    if (imageRows.length === 1) {
      const row = imageRows[0];
      if (Number(rowValue(row, 'propertyId')) !== fixture.propertyId) {
        throw new Error(
          `Search-to-Lead scenario property image ${snapshot.propertyImageId} is not owned by property ${fixture.propertyId}.`,
        );
      }
      if (
        rowValue(row, 'imageUrl') !== snapshot.imageUrl ||
        Number(rowValue(row, 'isPrimary')) !== snapshot.isPrimary ||
        Number(rowValue(row, 'displayOrder')) !== snapshot.displayOrder
      ) {
        await connection.execute(
          'UPDATE propertyImages SET imageUrl = ?, isPrimary = ?, displayOrder = ? WHERE id = ? AND propertyId = ?',
          [
            snapshot.imageUrl,
            snapshot.isPrimary,
            snapshot.displayOrder,
            snapshot.propertyImageId,
            fixture.propertyId,
          ],
        );
      }
    }
  }

  const propertyRows = await queryRows(
    connection,
    'SELECT mainImage FROM properties WHERE id = ?',
    [fixture.propertyId],
  );
  if (propertyRows.length > 1) {
    throw new Error(`Search-to-Lead scenario has duplicate property ID ${fixture.propertyId}.`);
  }
  if (propertyRows.length === 1 && rowValue(propertyRows[0], 'mainImage') !== fixture.imageUrl) {
    await connection.execute('UPDATE properties SET mainImage = ?, updatedAt = ? WHERE id = ?', [
      fixture.imageUrl,
      FIXTURE_TIMESTAMP,
      fixture.propertyId,
    ]);
  }
}

async function ensureCanonicalManualFixture(
  connection: AuthoritySqlConnection,
  fixture: ManualFixtureDefinition,
  provinceId: number,
  cityId: number,
  suburbId: number,
): Promise<void> {
  const sourceDetails = sourceDetailsForFixture(fixture);
  const sourceJson = JSON.stringify(sourceDetails);
  await synchronizeOwnedFixtureMediaSnapshot(connection, fixture);
  const projectionTitle = fixture.incoherentProjection
    ? `${fixture.title} (stale projection)`
    : fixture.title;
  const projectionDescription = fixture.incoherentProjection
    ? `${fixture.description} (stale)`
    : fixture.description;
  const publishedAt = fixture.listingStatus === 'published' ? FIXTURE_TIMESTAMP : null;
  const archivedAt = fixture.listingStatus === 'archived' ? FIXTURE_TIMESTAMP : null;

  await ensureDeterministicRow({
    connection,
    table: 'listings',
    id: fixture.listingId,
    columns: [
      'id',
      'ownerId',
      'agentId',
      'agencyId',
      'action',
      'propertyType',
      'title',
      'status',
      'approvalStatus',
      'slug',
      'revision_of_listing_id',
      'province_id',
      'city_id',
      'suburb_id',
    ],
    expected: {
      ownerId: fixture.ownerId,
      agentId: fixture.agentId,
      agencyId: fixture.agencyId,
      action: fixture.action,
      propertyType: fixture.propertyType,
      title: fixture.title,
      status: fixture.listingStatus,
      approvalStatus: fixture.approvalStatus,
      slug: `dba-${fixture.propertyId}-source-v1`,
      revision_of_listing_id: null,
      province_id: provinceId,
      city_id: cityId,
      suburb_id: suburbId,
    },
    insertColumns: [
      'id',
      'ownerId',
      'agentId',
      'agencyId',
      'action',
      'propertyType',
      'title',
      'description',
      'askingPrice',
      'propertyDetails',
      'address',
      'latitude',
      'longitude',
      'city',
      'suburb',
      'province',
      'mainMediaId',
      'mainMediaType',
      'status',
      'approvalStatus',
      'autoPublished',
      'slug',
      'readiness_score',
      'quality_score',
      'featured',
      'createdAt',
      'updatedAt',
      'publishedAt',
      'archivedAt',
      'province_id',
      'city_id',
      'suburb_id',
      'location_confirmation_state',
      'public_location_precision',
    ],
    insertValues: [
      fixture.listingId,
      fixture.ownerId,
      fixture.agentId,
      fixture.agencyId,
      fixture.action,
      fixture.propertyType,
      fixture.title,
      fixture.description,
      fixture.action === 'sell' ? fixture.price : null,
      sourceJson,
      'DBA Verification Street',
      '-26.1076',
      '28.0567',
      'Johannesburg',
      'Sandton',
      'Gauteng',
      fixture.mediaId,
      'image',
      fixture.listingStatus,
      fixture.approvalStatus,
      fixture.listingStatus === 'published' ? 1 : 0,
      `dba-${fixture.propertyId}-source-v1`,
      100,
      100,
      0,
      FIXTURE_TIMESTAMP,
      FIXTURE_TIMESTAMP,
      publishedAt,
      archivedAt,
      provinceId,
      cityId,
      suburbId,
      'confirmed',
      'exact',
    ],
  });

  await ensureDeterministicRow({
    connection,
    table: 'listing_media',
    id: fixture.mediaId,
    columns: [
      'id',
      'listingId',
      'mediaType',
      'originalUrl',
      'processedUrl',
      'thumbnailUrl',
      'previewUrl',
      'displayOrder',
      'isPrimary',
      'processingStatus',
      'createdAt',
      'uploadedAt',
      'processedAt',
    ],
    expected: {
      listingId: fixture.listingId,
      mediaType: 'image',
      originalUrl: fixture.imageUrl,
      processedUrl: fixture.imageUrl,
      displayOrder: 0,
      isPrimary: 1,
      processingStatus: 'completed',
    },
    insertColumns: [
      'id',
      'listingId',
      'mediaType',
      'originalUrl',
      'processedUrl',
      'thumbnailUrl',
      'previewUrl',
      'width',
      'height',
      'mimeType',
      'displayOrder',
      'isPrimary',
      'processingStatus',
      'createdAt',
      'uploadedAt',
      'processedAt',
    ],
    insertValues: [
      fixture.mediaId,
      fixture.listingId,
      'image',
      fixture.imageUrl,
      fixture.imageUrl,
      fixture.imageUrl,
      fixture.imageUrl,
      1440,
      960,
      'image/webp',
      0,
      1,
      'completed',
      FIXTURE_TIMESTAMP,
      FIXTURE_TIMESTAMP,
      FIXTURE_TIMESTAMP,
    ],
  });

  await ensureDeterministicRow({
    connection,
    table: 'properties',
    id: fixture.propertyId,
    columns: [
      'id',
      'title',
      'status',
      'listingType',
      'provinceId',
      'cityId',
      'suburbId',
      'agentId',
      'ownerId',
      'sourceListingId',
      'catalogue_publisher_id',
    ],
    expected: {
      title: projectionTitle,
      status: fixture.propertyStatus,
      listingType: fixture.action === 'sell' ? 'sale' : 'rent',
      provinceId,
      cityId,
      suburbId,
      agentId: fixture.agentId,
      ownerId: fixture.ownerId,
      sourceListingId: fixture.listingId,
      catalogue_publisher_id: fixture.cataloguePublisherId,
    },
    insertColumns: [
      'id',
      'title',
      'description',
      'propertyType',
      'listingType',
      'transactionType',
      'price',
      'bedrooms',
      'bathrooms',
      'area',
      'address',
      'city',
      'province',
      'provinceId',
      'cityId',
      'suburbId',
      'status',
      'featured',
      'views',
      'enquiries',
      'agentId',
      'ownerId',
      'sourceListingId',
      'propertySettings',
      'mainImage',
      'createdAt',
      'updatedAt',
      'internal_area_m2',
      'erf_size_m2',
      'public_address',
      'public_latitude',
      'public_longitude',
      'public_location_precision',
      'catalogue_publisher_id',
    ],
    insertValues: [
      fixture.propertyId,
      projectionTitle,
      projectionDescription,
      fixture.propertyType,
      fixture.action === 'sell' ? 'sale' : 'rent',
      fixture.action === 'sell' ? 'sale' : 'rent',
      fixture.price,
      fixture.bedrooms ?? (fixture.propertyType === 'apartment' ? 2 : 3),
      fixture.bathrooms ?? 2,
      fixture.internalAreaM2 ?? (fixture.propertyType === 'apartment' ? 90 : 150),
      '1 DBA Verification Street',
      'Johannesburg',
      'Gauteng',
      provinceId,
      cityId,
      suburbId,
      fixture.propertyStatus,
      0,
      0,
      0,
      fixture.agentId,
      fixture.ownerId,
      fixture.listingId,
      sourceJson,
      fixture.imageUrl,
      FIXTURE_TIMESTAMP,
      FIXTURE_TIMESTAMP,
      String(fixture.internalAreaM2 ?? (fixture.propertyType === 'apartment' ? 90 : 150)),
      fixture.erfAreaM2 !== undefined
        ? String(fixture.erfAreaM2)
        : fixture.propertyType === 'apartment'
          ? null
          : '300',
      'Sandton, Johannesburg',
      '-26.1076',
      '28.0567',
      'exact',
      fixture.cataloguePublisherId,
    ],
  });

  await ensureDeterministicRow({
    connection,
    table: 'propertyImages',
    id: fixture.propertyImageId,
    columns: ['id', 'propertyId', 'imageUrl', 'isPrimary', 'displayOrder'],
    expected: {
      propertyId: fixture.propertyId,
      imageUrl: fixture.imageUrl,
      isPrimary: 1,
      displayOrder: 0,
    },
    insertColumns: ['id', 'propertyId', 'imageUrl', 'isPrimary', 'displayOrder', 'createdAt'],
    insertValues: [
      fixture.propertyImageId,
      fixture.propertyId,
      fixture.imageUrl,
      1,
      0,
      FIXTURE_TIMESTAMP,
    ],
  });

  await synchronizeOwnedFixtureSourceSnapshot(connection, fixture, sourceJson);

  for (const galleryImage of fixture.galleryImages || []) {
    await ensureDeterministicRow({
      connection,
      table: 'listing_media',
      id: galleryImage.mediaId,
      columns: [
        'id',
        'listingId',
        'mediaType',
        'originalUrl',
        'processedUrl',
        'thumbnailUrl',
        'previewUrl',
        'displayOrder',
        'isPrimary',
        'processingStatus',
      ],
      expected: {
        listingId: fixture.listingId,
        mediaType: 'image',
        originalUrl: galleryImage.imageUrl,
        processedUrl: galleryImage.imageUrl,
        displayOrder: galleryImage.displayOrder,
        isPrimary: 0,
        processingStatus: 'completed',
      },
      insertColumns: [
        'id',
        'listingId',
        'mediaType',
        'originalUrl',
        'processedUrl',
        'thumbnailUrl',
        'previewUrl',
        'width',
        'height',
        'mimeType',
        'displayOrder',
        'isPrimary',
        'processingStatus',
        'createdAt',
        'uploadedAt',
        'processedAt',
      ],
      insertValues: [
        galleryImage.mediaId,
        fixture.listingId,
        'image',
        galleryImage.imageUrl,
        galleryImage.imageUrl,
        galleryImage.imageUrl,
        galleryImage.imageUrl,
        1440,
        960,
        'image/webp',
        galleryImage.displayOrder,
        0,
        'completed',
        FIXTURE_TIMESTAMP,
        FIXTURE_TIMESTAMP,
        FIXTURE_TIMESTAMP,
      ],
    });

    await ensureDeterministicRow({
      connection,
      table: 'propertyImages',
      id: galleryImage.propertyImageId,
      columns: ['id', 'propertyId', 'imageUrl', 'isPrimary', 'displayOrder'],
      expected: {
        propertyId: fixture.propertyId,
        imageUrl: galleryImage.imageUrl,
        isPrimary: 0,
        displayOrder: galleryImage.displayOrder,
      },
      insertColumns: ['id', 'propertyId', 'imageUrl', 'isPrimary', 'displayOrder', 'createdAt'],
      insertValues: [
        galleryImage.propertyImageId,
        fixture.propertyId,
        galleryImage.imageUrl,
        0,
        galleryImage.displayOrder,
        FIXTURE_TIMESTAMP,
      ],
    });
  }
}

async function ensureOrphanProjection(
  connection: AuthoritySqlConnection,
  provinceId: number,
  cityId: number,
  suburbId: number,
): Promise<void> {
  await ensureDeterministicRow({
    connection,
    table: 'properties',
    id: SCENARIO_IDS.orphanProperty,
    columns: [
      'id',
      'title',
      'status',
      'listingType',
      'provinceId',
      'cityId',
      'suburbId',
      'agentId',
      'ownerId',
      'sourceListingId',
      'catalogue_publisher_id',
    ],
    expected: {
      title: 'DBA Orphan Legacy Projection',
      status: 'available',
      listingType: 'sale',
      provinceId,
      cityId,
      suburbId,
      agentId: null,
      ownerId: SCENARIO_IDS.platformOperationsUser,
      sourceListingId: null,
      catalogue_publisher_id: null,
    },
    insertColumns: [
      'id',
      'title',
      'description',
      'propertyType',
      'listingType',
      'transactionType',
      'price',
      'bedrooms',
      'bathrooms',
      'area',
      'address',
      'city',
      'province',
      'provinceId',
      'cityId',
      'suburbId',
      'status',
      'featured',
      'views',
      'enquiries',
      'agentId',
      'ownerId',
    ],
    insertValues: [
      SCENARIO_IDS.orphanProperty,
      'DBA Orphan Legacy Projection',
      'Historical projection intentionally lacking source provenance.',
      'house',
      'sale',
      'sale',
      1500000,
      3,
      2,
      150,
      'Legacy DBA Street',
      'Johannesburg',
      'Gauteng',
      provinceId,
      cityId,
      suburbId,
      'available',
      0,
      0,
      0,
      null,
      SCENARIO_IDS.platformOperationsUser,
    ],
  });
}

async function ensureManualPublicFixtures(
  connection: AuthoritySqlConnection,
  provinceId: number,
  cityId: number,
  suburbId: number,
): Promise<void> {
  for (const fixture of MANUAL_FIXTURES) {
    await ensureCanonicalManualFixture(connection, fixture, provinceId, cityId, suburbId);
  }
  await ensureOrphanProjection(connection, provinceId, cityId, suburbId);
}

async function ensureUserAgency(
  connection: AuthoritySqlConnection,
  userId: number,
  agencyId: number,
): Promise<void> {
  const rows = await queryRows(connection, 'SELECT agencyId AS agency_id FROM users WHERE id = ?', [
    userId,
  ]);
  if (rows.length !== 1) throw new Error(`Search-to-Lead scenario user ${userId} is missing.`);
  const currentAgencyId = rowValue(rows[0], 'agency_id');
  if (currentAgencyId != null && Number(currentAgencyId) !== agencyId) {
    throw new Error(`Search-to-Lead scenario user ${userId} has conflicting agency custody.`);
  }
  if (currentAgencyId == null) {
    await connection.execute('UPDATE users SET agencyId = ? WHERE id = ?', [agencyId, userId]);
  }
}

async function prepareScenarioRows(
  connection: AuthoritySqlConnection,
  geography: GeographyReferenceEvidence['verified'],
): Promise<void> {
  const locationRows = await queryRows(
    connection,
    `SELECT p.id AS province_id, c.id AS city_id, s.id AS suburb_id
       FROM provinces p
       INNER JOIN cities c ON c.provinceId = p.id
       INNER JOIN suburbs s ON s.cityId = c.id
      WHERE p.slug = ? AND c.slug = ? AND s.slug = ?`,
    ['gauteng', 'johannesburg', 'sandton'],
  );
  if (locationRows.length !== 1)
    throw new Error('Search-to-Lead scenario requires one canonical Sandton hierarchy.');
  const provinceId = asId({ id: rowValue(locationRows[0], 'province_id') }, 'province');
  const cityId = asId({ id: rowValue(locationRows[0], 'city_id') }, 'city');
  const suburbId = asId({ id: rowValue(locationRows[0], 'suburb_id') }, 'suburb');
  if (geography.provinces < 3 || geography.cities < 4 || geography.suburbs < 1) {
    throw new Error('Search-to-Lead scenario refused: canonical geography evidence is incomplete.');
  }

  await ensureDeterministicRow({
    connection,
    table: 'users',
    id: SCENARIO_IDS.developerUser,
    columns: ['id', 'email', 'role', 'emailVerified'],
    expected: {
      email: 'dba-developer@invalid.example',
      role: 'property_developer',
      emailVerified: 1,
    },
    insertColumns: ['id', 'email', 'name', 'firstName', 'lastName', 'role', 'emailVerified'],
    insertValues: [
      SCENARIO_IDS.developerUser,
      'dba-developer@invalid.example',
      'DBA Scenario Developer',
      'DBA',
      'Developer',
      'property_developer',
      1,
    ],
  });
  await ensureDeterministicRow({
    connection,
    table: 'users',
    id: SCENARIO_IDS.agentUser,
    columns: ['id', 'email', 'role', 'emailVerified', 'agencyId'],
    expected: {
      email: 'dba-agent@invalid.example',
      role: 'agent',
      emailVerified: 1,
      // ensureUserAgency assigns the canonical agency below; asserting the
      // settled state keeps repeated prepare runs idempotent.
      agencyId: SCENARIO_IDS.agency,
    },
    insertColumns: ['id', 'email', 'name', 'firstName', 'lastName', 'role', 'emailVerified'],
    insertValues: [
      SCENARIO_IDS.agentUser,
      'dba-agent@invalid.example',
      'DBA Scenario Agent',
      'DBA',
      'Agent',
      'agent',
      1,
    ],
  });
  await ensureDeterministicRow({
    connection,
    table: 'agencies',
    id: SCENARIO_IDS.agency,
    columns: ['id', 'slug', 'name', 'isVerified'],
    expected: {
      slug: 'dba-verification-agency-v1',
      name: 'Northpoint Realty',
      isVerified: 1,
    },
    insertColumns: ['id', 'name', 'slug', 'email', 'isVerified'],
    insertValues: [
      SCENARIO_IDS.agency,
      'Northpoint Realty',
      'dba-verification-agency-v1',
      'dba-agency@invalid.example',
      1,
    ],
  });
  for (const agency of [
    {
      id: SCENARIO_IDS.agencyOnly,
      name: 'Urban Nest Properties',
      slug: 'dba-verification-agency-only-v1',
      email: 'dba-agency-only@invalid.example',
    },
    {
      id: SCENARIO_IDS.unrelatedAgency,
      name: 'DBA Unrelated Agency',
      slug: 'dba-verification-unrelated-agency-v1',
      email: 'dba-unrelated-agency@invalid.example',
    },
  ]) {
    await ensureDeterministicRow({
      connection,
      table: 'agencies',
      id: agency.id,
      columns: ['id', 'slug', 'name', 'isVerified'],
      expected: { slug: agency.slug, name: agency.name, isVerified: 1 },
      insertColumns: ['id', 'name', 'slug', 'email', 'isVerified'],
      insertValues: [agency.id, agency.name, agency.slug, agency.email, 1],
    });
  }
  await ensureUserAgency(connection, SCENARIO_IDS.agentUser, SCENARIO_IDS.agency);
  for (const user of [
    {
      id: SCENARIO_IDS.agencyOnlyUser,
      email: 'dba-agency-admin@invalid.example',
      name: 'DBA Agency Admin',
      firstName: 'DBA',
      lastName: 'Agency Admin',
      role: 'agency_admin',
      agencyId: SCENARIO_IDS.agencyOnly,
    },
    {
      id: SCENARIO_IDS.platformOperationsUser,
      email: 'dba-platform-operations@invalid.example',
      name: 'DBA Platform Operations',
      firstName: 'DBA',
      lastName: 'Platform Operations',
      role: 'super_admin',
      agencyId: null,
    },
    {
      id: SCENARIO_IDS.unrelatedAgencyAdminUser,
      email: 'dba-unrelated-agency-admin@invalid.example',
      name: 'DBA Unrelated Agency Admin',
      firstName: 'DBA',
      lastName: 'Unrelated Agency Admin',
      role: 'agency_admin',
      agencyId: SCENARIO_IDS.unrelatedAgency,
    },
    {
      id: SCENARIO_IDS.unrelatedAgentUser,
      email: 'dba-unrelated-agent@invalid.example',
      name: 'DBA Unrelated Agent',
      firstName: 'DBA',
      lastName: 'Unrelated Agent',
      role: 'agent',
      agencyId: SCENARIO_IDS.unrelatedAgency,
    },
  ] as const) {
    await ensureDeterministicRow({
      connection,
      table: 'users',
      id: user.id,
      columns: ['id', 'email', 'role', 'emailVerified', 'agencyId'],
      expected: {
        email: user.email,
        role: user.role,
        emailVerified: 1,
        agencyId: user.agencyId,
      },
      insertColumns: [
        'id',
        'email',
        'name',
        'firstName',
        'lastName',
        'role',
        'emailVerified',
        'agencyId',
      ],
      insertValues: [
        user.id,
        user.email,
        user.name,
        user.firstName,
        user.lastName,
        user.role,
        1,
        user.agencyId,
      ],
    });
  }
  await ensureDeterministicRow({
    connection,
    table: 'agents',
    id: SCENARIO_IDS.agent,
    columns: ['id', 'userId', 'agencyId', 'slug', 'status', 'isVerified', 'isFeatured'],
    expected: {
      userId: SCENARIO_IDS.agentUser,
      agencyId: SCENARIO_IDS.agency,
      slug: 'dba-verification-agent-v1',
      status: 'approved',
      isVerified: 1,
      isFeatured: 1,
    },
    insertColumns: [
      'id',
      'userId',
      'agencyId',
      'firstName',
      'lastName',
      'displayName',
      'slug',
      'email',
      'role',
      'isVerified',
      'isFeatured',
      'status',
    ],
    insertValues: [
      SCENARIO_IDS.agent,
      SCENARIO_IDS.agentUser,
      SCENARIO_IDS.agency,
      'Lerato',
      'Mokoena',
      'Lerato Mokoena',
      'dba-verification-agent-v1',
      'dba-agent@invalid.example',
      'agent',
      1,
      1,
      'approved',
    ],
  });
  await synchronizeOwnedPreviewAgentContact(connection);

  // Canonical membership currency: public enquiry custody only treats an
  // agency-affiliated agent as an eligible active recipient while a current
  // agency_agent_memberships row exists. The acceptance fixture therefore
  // carries the same membership its runtime custody rule requires.
  await ensureDeterministicRow({
    connection,
    table: 'agency_agent_memberships',
    id: SCENARIO_IDS.agentMembership,
    // effective_from is a TIMESTAMP column whose literal round-trip is
    // timezone-dependent; membership currency is proven functionally by
    // scenario verification through public enquiry custody instead.
    columns: ['agency_id', 'agent_id', 'status', 'governance_mode', 'role'],
    expected: {
      agency_id: SCENARIO_IDS.agency,
      agent_id: SCENARIO_IDS.agent,
      status: 'active',
      governance_mode: 'affiliated',
      role: 'agent',
    },
    insertColumns: [
      'id',
      'agency_id',
      'agent_id',
      'status',
      'governance_mode',
      'role',
      'effective_from',
      'created_by',
      'updated_by',
    ],
    insertValues: [
      SCENARIO_IDS.agentMembership,
      SCENARIO_IDS.agency,
      SCENARIO_IDS.agent,
      'active',
      'affiliated',
      'agent',
      FIXTURE_TIMESTAMP,
      SCENARIO_IDS.agencyOnlyUser,
      SCENARIO_IDS.agencyOnlyUser,
    ],
  });
  await ensureDeterministicRow({
    connection,
    table: 'users',
    id: SCENARIO_IDS.unrelatedDeveloperUser,
    columns: ['id', 'email', 'role', 'emailVerified', 'agencyId'],
    expected: {
      email: 'dba-unrelated-developer@invalid.example',
      role: 'property_developer',
      emailVerified: 1,
      agencyId: null,
    },
    insertColumns: ['id', 'email', 'name', 'firstName', 'lastName', 'role', 'emailVerified'],
    insertValues: [
      SCENARIO_IDS.unrelatedDeveloperUser,
      'dba-unrelated-developer@invalid.example',
      'DBA Unrelated Developer',
      'DBA',
      'Unrelated Developer',
      'property_developer',
      1,
    ],
  });
  await ensureDeterministicRow({
    connection,
    table: 'agents',
    id: SCENARIO_IDS.unrelatedAgent,
    columns: ['id', 'userId', 'agencyId', 'slug', 'status', 'isVerified', 'isFeatured'],
    expected: {
      userId: SCENARIO_IDS.unrelatedAgentUser,
      agencyId: SCENARIO_IDS.unrelatedAgency,
      slug: 'dba-verification-unrelated-agent-v1',
      status: 'approved',
      isVerified: 1,
      isFeatured: 0,
    },
    insertColumns: [
      'id',
      'userId',
      'agencyId',
      'firstName',
      'lastName',
      'displayName',
      'slug',
      'email',
      'role',
      'isVerified',
      'isFeatured',
      'status',
    ],
    insertValues: [
      SCENARIO_IDS.unrelatedAgent,
      SCENARIO_IDS.unrelatedAgentUser,
      SCENARIO_IDS.unrelatedAgency,
      'DBA',
      'Unrelated Agent',
      'DBA Unrelated Agent',
      'dba-verification-unrelated-agent-v1',
      'dba-unrelated-agent@invalid.example',
      'agent',
      1,
      0,
      'approved',
    ],
  });
  await ensureDeterministicRow({
    connection,
    table: 'developer_organisations',
    id: SCENARIO_IDS.developerOrganisation,
    columns: ['id', 'slug', 'name', 'status', 'is_verified'],
    expected: {
      slug: 'dba-verification-developer-v1',
      name: 'DBA Verification Developer',
      status: 'approved',
      is_verified: 1,
    },
    insertColumns: ['id', 'slug', 'name', 'status', 'is_verified'],
    insertValues: [
      SCENARIO_IDS.developerOrganisation,
      'dba-verification-developer-v1',
      'DBA Verification Developer',
      'approved',
      1,
    ],
  });
  await ensureDeterministicRow({
    connection,
    table: 'developer_organisation_memberships',
    id: SCENARIO_IDS.developerMembership,
    columns: ['id', 'organisation_id', 'user_id', 'role', 'status'],
    expected: {
      organisation_id: SCENARIO_IDS.developerOrganisation,
      user_id: SCENARIO_IDS.developerUser,
      role: 'owner',
      status: 'active',
    },
    insertColumns: ['id', 'organisation_id', 'user_id', 'role', 'status'],
    insertValues: [
      SCENARIO_IDS.developerMembership,
      SCENARIO_IDS.developerOrganisation,
      SCENARIO_IDS.developerUser,
      'owner',
      'active',
    ],
  });
  await ensureDeterministicRow({
    connection,
    table: 'catalogue_publishers',
    id: SCENARIO_IDS.cataloguePublisher,
    columns: ['id', 'authority_kind', 'developer_organisation_id', 'slug', 'name', 'is_visible'],
    expected: {
      authority_kind: 'developer_first_party',
      developer_organisation_id: SCENARIO_IDS.developerOrganisation,
      slug: 'dba-verification-developer-v1',
      name: 'DBA Verification Developer',
      is_visible: 1,
    },
    insertColumns: [
      'id',
      'authority_kind',
      'publisher_type',
      'developer_organisation_id',
      'slug',
      'name',
      'is_visible',
    ],
    insertValues: [
      SCENARIO_IDS.cataloguePublisher,
      'developer_first_party',
      'developer',
      SCENARIO_IDS.developerOrganisation,
      'dba-verification-developer-v1',
      'DBA Verification Developer',
      1,
    ],
  });
  await ensureDeterministicRow({
    connection,
    table: 'developer_organisations',
    id: SCENARIO_IDS.unrelatedDeveloperOrganisation,
    columns: ['id', 'slug', 'name', 'status', 'is_verified'],
    expected: {
      slug: 'dba-verification-unrelated-developer-v1',
      name: 'DBA Unrelated Developer',
      status: 'approved',
      is_verified: 1,
    },
    insertColumns: ['id', 'slug', 'name', 'status', 'is_verified'],
    insertValues: [
      SCENARIO_IDS.unrelatedDeveloperOrganisation,
      'dba-verification-unrelated-developer-v1',
      'DBA Unrelated Developer',
      'approved',
      1,
    ],
  });
  await ensureDeterministicRow({
    connection,
    table: 'developer_organisation_memberships',
    id: SCENARIO_IDS.unrelatedDeveloperMembership,
    columns: ['id', 'organisation_id', 'user_id', 'role', 'status'],
    expected: {
      organisation_id: SCENARIO_IDS.unrelatedDeveloperOrganisation,
      user_id: SCENARIO_IDS.unrelatedDeveloperUser,
      role: 'owner',
      status: 'active',
    },
    insertColumns: ['id', 'organisation_id', 'user_id', 'role', 'status'],
    insertValues: [
      SCENARIO_IDS.unrelatedDeveloperMembership,
      SCENARIO_IDS.unrelatedDeveloperOrganisation,
      SCENARIO_IDS.unrelatedDeveloperUser,
      'owner',
      'active',
    ],
  });
  await ensureDeterministicRow({
    connection,
    table: 'catalogue_publishers',
    id: SCENARIO_IDS.unrelatedDeveloperPublisher,
    columns: ['id', 'authority_kind', 'developer_organisation_id', 'slug', 'name', 'is_visible'],
    expected: {
      authority_kind: 'developer_first_party',
      developer_organisation_id: SCENARIO_IDS.unrelatedDeveloperOrganisation,
      slug: 'dba-verification-unrelated-developer-v1',
      name: 'DBA Unrelated Developer',
      is_visible: 1,
    },
    insertColumns: [
      'id',
      'authority_kind',
      'publisher_type',
      'developer_organisation_id',
      'slug',
      'name',
      'is_visible',
    ],
    insertValues: [
      SCENARIO_IDS.unrelatedDeveloperPublisher,
      'developer_first_party',
      'developer',
      SCENARIO_IDS.unrelatedDeveloperOrganisation,
      'dba-verification-unrelated-developer-v1',
      'DBA Unrelated Developer',
      1,
    ],
  });
  await ensureDeterministicRow({
    connection,
    table: 'catalogue_publishers',
    id: SCENARIO_IDS.platformPublisher,
    columns: ['id', 'authority_kind', 'developer_organisation_id', 'slug', 'name', 'is_visible'],
    expected: {
      authority_kind: 'platform_reference',
      developer_organisation_id: null,
      slug: 'dba-verification-property-listify-v1',
      name: 'Property Listify',
      is_visible: 1,
    },
    insertColumns: [
      'id',
      'authority_kind',
      'publisher_type',
      'developer_organisation_id',
      'slug',
      'name',
      'source_attribution',
      'is_visible',
      'is_contact_verified',
    ],
    insertValues: [
      SCENARIO_IDS.platformPublisher,
      'platform_reference',
      'hybrid',
      null,
      'dba-verification-property-listify-v1',
      'Property Listify',
      'DBA controlled platform-managed acceptance fixture',
      1,
      1,
    ],
  });
  await ensureAgentLaunchAccess(connection);
  await ensureDeveloperLaunchAccess(connection);
  await ensureDeterministicRow({
    connection,
    table: 'developments',
    id: SCENARIO_IDS.development,
    columns: [
      'id',
      'catalogue_publisher_id',
      'name',
      'slug',
      'city',
      'province',
      'suburb',
      'isPublished',
      'approval_status',
      'transaction_type',
    ],
    expected: {
      catalogue_publisher_id: SCENARIO_IDS.cataloguePublisher,
      name: 'DBA Verification Development',
      slug: 'dba-verification-development-v1',
      city: 'Johannesburg',
      province: 'Gauteng',
      suburb: 'Sandton',
      isPublished: 1,
      approval_status: 'approved',
      transaction_type: 'for_sale',
    },
    insertColumns: [
      'id',
      'catalogue_publisher_id',
      'name',
      'developmentType',
      'city',
      'province',
      'suburb',
      'slug',
      'isPublished',
      'approval_status',
      'dev_owner_type',
      'status',
      'transaction_type',
      'totalUnits',
      'availableUnits',
      'priceFrom',
    ],
    insertValues: [
      SCENARIO_IDS.development,
      SCENARIO_IDS.cataloguePublisher,
      'DBA Verification Development',
      'residential',
      'Johannesburg',
      'Gauteng',
      'Sandton',
      'dba-verification-development-v1',
      1,
      'approved',
      'developer',
      'selling',
      'for_sale',
      20,
      20,
      1800000,
    ],
  });
  await ensureDeterministicRow({
    connection,
    table: 'unit_types',
    id: SCENARIO_IDS.unit,
    columns: [
      'id',
      'development_id',
      'name',
      'bedrooms',
      'bathrooms',
      'base_price_from',
      'is_active',
      'available_units',
      'total_units',
    ],
    expected: {
      development_id: SCENARIO_IDS.development,
      name: 'DBA Verification Unit',
      bedrooms: 2,
      bathrooms: '1.0',
      base_price_from: '1800000.00',
      is_active: 1,
      available_units: 10,
      total_units: 10,
    },
    insertColumns: [
      'id',
      'development_id',
      'name',
      'bedrooms',
      'bathrooms',
      'base_price_from',
      'is_active',
      'total_units',
      'available_units',
      'structural_type',
      'display_order',
    ],
    insertValues: [
      SCENARIO_IDS.unit,
      SCENARIO_IDS.development,
      'DBA Verification Unit',
      2,
      '1.0',
      '1800000.00',
      1,
      10,
      10,
      'apartment',
      1,
    ],
  });
  await ensureManualPublicFixtures(connection, provinceId, cityId, suburbId);
}

async function ensureAgentLaunchAccess(connection: AuthoritySqlConnection): Promise<void> {
  const planRows = await queryRows(
    connection,
    'SELECT id FROM plans WHERE name = ? AND segment = ?',
    [CANONICAL_AGENT_LAUNCH_ACCESS.name, CANONICAL_AGENT_LAUNCH_ACCESS.segment],
  );
  if (planRows.length !== 1) {
    throw new Error('Search-to-Lead scenario requires the canonical agent Launch Access plan.');
  }
  const planId = asId({ id: rowValue(planRows[0], 'id') }, 'agent Launch Access plan');
  const subscriptionRows = await queryRows(
    connection,
    `SELECT id, plan_id, status, current_period_end
       FROM subscriptions
      WHERE owner_type = 'agent' AND owner_id = ?
      ORDER BY id`,
    [SCENARIO_IDS.agentUser],
  );
  if (subscriptionRows.length > 1) {
    throw new Error('Search-to-Lead scenario found duplicate agent Launch Access subscriptions.');
  }
  if (subscriptionRows.length === 1) {
    const row = subscriptionRows[0];
    const expiresAt = new Date(String(rowValue(row, 'current_period_end') || '')).getTime();
    if (
      Number(rowValue(row, 'plan_id')) !== planId ||
      rowValue(row, 'status') !== 'active' ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      throw new Error('Search-to-Lead scenario agent Launch Access is not currently eligible.');
    }
    return;
  }
  await connection.execute(
    `INSERT INTO subscriptions
      (owner_type, owner_id, plan_id, status, trial_ends_at,
       current_period_start, current_period_end, grace_ends_at,
       cancel_at_period_end, billing_cycle_anchor, metadata, created_by, updated_by)
     VALUES ('agent', ?, ?, 'active', NULL, CURRENT_TIMESTAMP,
             DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 90 DAY), NULL, 0,
             DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 90 DAY), CAST(? AS JSON), ?, ?)`,
    [
      SCENARIO_IDS.agentUser,
      planId,
      JSON.stringify({
        fixture: SEARCH_TO_LEAD_SCENARIO_VERSION,
        commercial_product_key: CANONICAL_AGENT_LAUNCH_ACCESS.name,
        commercial_term_kind: 'paid_launch_access',
        commercial_access_activated: true,
        commercial_requires_verified_payment: true,
        commercial_auto_renews: false,
        billing_provider: 'manual_eft',
        verified_invoice_id: SCENARIO_IDS.agentProperty,
        verified_payment_id: SCENARIO_IDS.agentProperty,
        verified_payment_amount_minor: CANONICAL_AGENT_LAUNCH_ACCESS.price,
      }),
      SCENARIO_IDS.agentUser,
      SCENARIO_IDS.agentUser,
    ],
  );
}

async function ensureDeveloperLaunchAccess(connection: AuthoritySqlConnection): Promise<void> {
  const planRows = await queryRows(
    connection,
    'SELECT id FROM plans WHERE name = ? AND segment = ?',
    [CANONICAL_DEVELOPER_LAUNCH_ACCESS.name, CANONICAL_DEVELOPER_LAUNCH_ACCESS.segment],
  );
  if (planRows.length !== 1) {
    throw new Error('Search-to-Lead scenario requires the canonical developer Launch Access plan.');
  }
  const planId = asId({ id: rowValue(planRows[0], 'id') }, 'developer Launch Access plan');
  const subscriptionRows = await queryRows(
    connection,
    `SELECT id, plan_id, status, current_period_end
       FROM subscriptions
      WHERE owner_type = 'developer' AND owner_id = ?
      ORDER BY id`,
    [SCENARIO_IDS.developerOrganisation],
  );
  if (subscriptionRows.length > 1) {
    throw new Error(
      'Search-to-Lead scenario found duplicate developer Launch Access subscriptions.',
    );
  }
  if (subscriptionRows.length === 1) {
    const row = subscriptionRows[0];
    const expiresAt = new Date(String(rowValue(row, 'current_period_end') || '')).getTime();
    if (
      Number(rowValue(row, 'plan_id')) !== planId ||
      rowValue(row, 'status') !== 'active' ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      throw new Error('Search-to-Lead scenario developer Launch Access is not currently eligible.');
    }
    return;
  }
  await connection.execute(
    `INSERT INTO subscriptions
      (owner_type, owner_id, plan_id, status, trial_ends_at,
       current_period_start, current_period_end, grace_ends_at,
       cancel_at_period_end, billing_cycle_anchor, metadata, created_by, updated_by)
     VALUES ('developer', ?, ?, 'active', NULL, CURRENT_TIMESTAMP,
             DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 90 DAY), NULL, 0,
             DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 90 DAY), CAST(? AS JSON), ?, ?)`,
    [
      SCENARIO_IDS.developerOrganisation,
      planId,
      JSON.stringify({
        fixture: SEARCH_TO_LEAD_SCENARIO_VERSION,
        commercial_product_key: CANONICAL_DEVELOPER_LAUNCH_ACCESS.name,
        commercial_term_kind: 'paid_launch_access',
        commercial_access_activated: true,
        commercial_requires_verified_payment: true,
        commercial_auto_renews: false,
        billing_provider: 'manual_eft',
        verified_invoice_id: SCENARIO_IDS.development,
        verified_payment_id: SCENARIO_IDS.development,
        verified_payment_amount_minor: CANONICAL_DEVELOPER_LAUNCH_ACCESS.price,
      }),
      SCENARIO_IDS.developerUser,
      SCENARIO_IDS.developerUser,
    ],
  );
}

export async function verifySearchToLeadScenarioData(
  connection: AuthoritySqlConnection,
): Promise<SearchToLeadScenarioEvidence['verified']> {
  const eligiblePropertyIds = [
    SCENARIO_IDS.agentProperty,
    SCENARIO_IDS.agencyProperty,
    SCENARIO_IDS.platformProperty,
  ];
  const excludedPropertyIds = [
    SCENARIO_IDS.orphanProperty,
    SCENARIO_IDS.unpublishedProperty,
    SCENARIO_IDS.archivedProperty,
    SCENARIO_IDS.pendingProperty,
    SCENARIO_IDS.incoherentProperty,
    SCENARIO_IDS.rentalProperty,
  ];
  const propertyRows = await queryRows(
    connection,
    `SELECT p.id, p.provinceId AS province_id, p.cityId AS city_id, p.suburbId AS suburb_id,
            p.sourceListingId AS source_listing_id, p.agentId AS property_agent_id,
            p.ownerId AS property_owner_id, p.catalogue_publisher_id AS catalogue_publisher_id,
            l.ownerId AS source_owner_id, l.agentId AS source_agent_id, l.agencyId AS source_agency_id,
            l.status AS source_status, l.approvalStatus AS source_approval_status,
            a.status AS agent_status, a.isVerified AS agent_verified,
            ag.id AS agent_agency_id, ag.isVerified AS agency_verified
       FROM properties p
       INNER JOIN listings l ON l.id = p.sourceListingId
       LEFT JOIN agents a ON a.id = p.agentId
       LEFT JOIN agencies ag ON ag.id = a.agencyId
      WHERE p.id IN (${eligiblePropertyIds.map(() => '?').join(', ')})
        AND p.status IN ('available', 'published') AND p.listingType = 'sale'
        AND l.status = 'published' AND l.approvalStatus = 'approved'
        AND l.revision_of_listing_id IS NULL`,
    eligiblePropertyIds,
  );
  if (propertyRows.length !== eligiblePropertyIds.length) {
    throw new Error(
      `Search-to-Lead scenario expected ${eligiblePropertyIds.length} source-backed sale properties but found ${propertyRows.length}.`,
    );
  }
  const expectedPropertySet = new Set<number>(eligiblePropertyIds);
  for (const row of propertyRows) {
    const propertyId = Number(rowValue(row, 'id'));
    if (!expectedPropertySet.has(propertyId)) {
      throw new Error('Search-to-Lead scenario returned an unexpected eligible property identity.');
    }
    if (
      Number(rowValue(row, 'source_listing_id')) <= 0 ||
      Number(rowValue(row, 'source_listing_id')) !==
        Number(
          propertyId === SCENARIO_IDS.agentProperty
            ? SCENARIO_IDS.agentListing
            : propertyId === SCENARIO_IDS.agencyProperty
              ? SCENARIO_IDS.agencyListing
              : SCENARIO_IDS.platformListing,
        )
    ) {
      throw new Error(
        'Search-to-Lead scenario property is not linked to its canonical source listing.',
      );
    }
    if (
      Number(rowValue(row, 'province_id')) <= 0 ||
      Number(rowValue(row, 'city_id')) <= 0 ||
      Number(rowValue(row, 'suburb_id')) <= 0
    ) {
      throw new Error('Search-to-Lead scenario property is not linked to canonical geography IDs.');
    }
    if (
      propertyId === SCENARIO_IDS.agentProperty &&
      (Number(rowValue(row, 'property_agent_id')) !== SCENARIO_IDS.agent ||
        Number(rowValue(row, 'source_agent_id')) !== SCENARIO_IDS.agent ||
        Number(rowValue(row, 'source_agency_id')) !== SCENARIO_IDS.agency ||
        Number(rowValue(row, 'agent_agency_id')) !== SCENARIO_IDS.agency ||
        Number(rowValue(row, 'agent_verified')) !== 1 ||
        rowValue(row, 'agent_status') !== 'approved' ||
        Number(rowValue(row, 'agency_verified')) !== 1)
    ) {
      throw new Error('Search-to-Lead scenario agent fixture lacks verified agent/agency custody.');
    }
    if (
      propertyId === SCENARIO_IDS.agencyProperty &&
      (rowValue(row, 'property_agent_id') != null ||
        rowValue(row, 'source_agent_id') != null ||
        Number(rowValue(row, 'source_agency_id')) !== SCENARIO_IDS.agencyOnly)
    ) {
      throw new Error('Search-to-Lead scenario agency-only fixture has an individual-agent claim.');
    }
    if (
      propertyId === SCENARIO_IDS.platformProperty &&
      (rowValue(row, 'property_agent_id') != null ||
        rowValue(row, 'source_agent_id') != null ||
        rowValue(row, 'source_agency_id') != null ||
        Number(rowValue(row, 'catalogue_publisher_id')) !== SCENARIO_IDS.platformPublisher)
    ) {
      throw new Error(
        'Search-to-Lead scenario platform fixture has non-platform ownership claims.',
      );
    }
  }
  const excludedRows = await queryRows(
    connection,
    `SELECT p.id, p.listingType AS listing_type, p.status, p.sourceListingId AS source_listing_id,
            l.status AS source_status, l.approvalStatus AS source_approval_status,
            l.action AS source_action
       FROM properties p
       LEFT JOIN listings l ON l.id = p.sourceListingId
      WHERE p.id IN (${excludedPropertyIds.map(() => '?').join(', ')})`,
    excludedPropertyIds,
  );
  if (excludedRows.length !== excludedPropertyIds.length) {
    throw new Error(
      'Search-to-Lead scenario is missing one or more fail-closed inventory fixtures.',
    );
  }
  const rentalRow = excludedRows.find(
    row => Number(rowValue(row, 'id')) === SCENARIO_IDS.rentalProperty,
  );
  if (
    !rentalRow ||
    rowValue(rentalRow, 'listing_type') !== 'rent' ||
    rowValue(rentalRow, 'source_action') !== 'rent'
  ) {
    throw new Error(
      'Search-to-Lead scenario rental exclusion is not a rental-only source fixture.',
    );
  }
  const developmentRows = await queryRows(
    connection,
    `SELECT d.id AS development_id, d.slug AS development_slug, u.id AS unit_id
       FROM developments d
       INNER JOIN unit_types u ON u.development_id = d.id
       INNER JOIN catalogue_publishers cp
               ON cp.id = d.catalogue_publisher_id
              AND cp.authority_kind = 'developer_first_party'
              AND cp.developer_organisation_id = ?
       INNER JOIN developer_organisations o
               ON o.id = cp.developer_organisation_id
              AND o.status = 'approved'
      WHERE d.id = ? AND d.catalogue_publisher_id = ?
        AND d.isPublished = 1 AND d.approval_status = 'approved'
        AND d.transaction_type = 'for_sale' AND u.is_active = 1 AND u.available_units > 0`,
    [SCENARIO_IDS.developerOrganisation, SCENARIO_IDS.development, SCENARIO_IDS.cataloguePublisher],
  );
  if (developmentRows.length !== 1)
    throw new Error('Search-to-Lead scenario is missing one eligible public development unit.');
  const property = propertyRows.find(
    row => Number(rowValue(row, 'id')) === SCENARIO_IDS.agentProperty,
  );
  if (!property) throw new Error('Search-to-Lead scenario is missing its agent-owned property.');

  const agentFixture = MANUAL_FIXTURES.find(
    fixture => fixture.propertyId === SCENARIO_IDS.agentProperty,
  );
  if (!agentFixture)
    throw new Error('Search-to-Lead scenario is missing its property-detail fixture.');
  const expectedGallery = [
    {
      id: agentFixture.propertyImageId,
      imageUrl: agentFixture.imageUrl,
      isPrimary: 1,
      displayOrder: 0,
    },
    ...(agentFixture.galleryImages || []).map(image => ({
      id: image.propertyImageId,
      imageUrl: image.imageUrl,
      isPrimary: 0,
      displayOrder: image.displayOrder,
    })),
  ];
  const galleryRows = await queryRows(
    connection,
    `SELECT id, imageUrl AS image_url, isPrimary AS is_primary, displayOrder AS display_order
       FROM propertyImages
      WHERE propertyId = ?
      ORDER BY displayOrder ASC, id ASC`,
    [SCENARIO_IDS.agentProperty],
  );
  if (galleryRows.length !== expectedGallery.length) {
    throw new Error(
      'Search-to-Lead scenario property-detail gallery has an unexpected image count.',
    );
  }
  for (let index = 0; index < expectedGallery.length; index += 1) {
    const row = galleryRows[index];
    const expected = expectedGallery[index];
    if (
      Number(rowValue(row, 'id')) !== expected.id ||
      rowValue(row, 'image_url') !== expected.imageUrl ||
      Number(rowValue(row, 'is_primary')) !== expected.isPrimary ||
      Number(rowValue(row, 'display_order')) !== expected.displayOrder
    ) {
      throw new Error(
        'Search-to-Lead scenario property-detail gallery drifted from its approved fixture.',
      );
    }
  }

  const contactRows = await queryRows(
    connection,
    'SELECT phone, whatsapp FROM agents WHERE id = ?',
    [SCENARIO_IDS.agent],
  );
  if (
    contactRows.length !== 1 ||
    rowValue(contactRows[0], 'phone') !== '+27000000000' ||
    rowValue(contactRows[0], 'whatsapp') !== '+27000000000'
  ) {
    throw new Error('Search-to-Lead scenario property-detail contact fixture is incomplete.');
  }

  if (
    Number(rowValue(property, 'province_id')) <= 0 ||
    Number(rowValue(property, 'city_id')) <= 0 ||
    Number(rowValue(property, 'suburb_id')) <= 0
  ) {
    throw new Error('Search-to-Lead scenario property is not linked to canonical geography IDs.');
  }
  const locationRows = await queryRows(
    connection,
    `SELECT p.slug AS province_slug, c.slug AS city_slug, s.slug AS suburb_slug,
            p.id AS province_id, c.id AS city_id, s.id AS suburb_id
       FROM provinces p
       INNER JOIN cities c ON c.provinceId = p.id
       INNER JOIN suburbs s ON s.cityId = c.id
      WHERE p.id = ? AND c.id = ? AND s.id = ?`,
    [property.province_id, property.city_id, property.suburb_id],
  );
  if (
    locationRows.length !== 1 ||
    rowValue(locationRows[0], 'province_slug') !== 'gauteng' ||
    rowValue(locationRows[0], 'city_slug') !== 'johannesburg' ||
    rowValue(locationRows[0], 'suburb_slug') !== 'sandton'
  ) {
    throw new Error(
      'Search-to-Lead scenario property is not linked to Gauteng/Johannesburg/Sandton.',
    );
  }
  return {
    eligibleProperties: propertyRows.length,
    eligibleDevelopments: developmentRows.length,
    canonicalLocation: 'gauteng/johannesburg/sandton',
    propertyIds: eligiblePropertyIds,
    excludedPropertyIds,
    propertyId: SCENARIO_IDS.property,
    developmentId: SCENARIO_IDS.development,
    unitId: String(rowValue(developmentRows[0], 'unit_id')),
  };
}

export async function prepareSearchToLeadScenario(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
  profileRoot?: string;
}): Promise<SearchToLeadScenarioEvidence> {
  assertOperation(input.decision, ['scenario-seed']);
  const ownership = requireReferenceAdapterTarget(input.authority, input.profileRoot);
  const manifest = await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
    profileRoot: input.profileRoot,
  });
  const geography = await verifyCanonicalGeographyReferenceData(input.connection);
  await withTransaction(input.connection, () => prepareScenarioRows(input.connection, geography));
  const verified = await verifySearchToLeadScenarioData(input.connection);
  return {
    ...ownership,
    adapter: 'search-to-lead-scenario',
    version: SEARCH_TO_LEAD_SCENARIO_VERSION,
    digest: SEARCH_TO_LEAD_SCENARIO_DIGEST,
    expected: {
      eligibleProperties: 3,
      eligibleDevelopments: 1,
      canonicalLocation: 'gauteng/johannesburg/sandton',
    },
    verified,
    migrationHead: manifest.document.expectedHead,
  };
}

async function runContainedApplicationVerification(
  authority: ResolvedDatabaseAuthority,
  expected: SearchToLeadScenarioEvidence['verified'],
): Promise<NonNullable<SearchToLeadScenarioEvidence['acceptance']>> {
  if (
    expected.propertyId !== SCENARIO_IDS.property ||
    expected.developmentId !== SCENARIO_IDS.development ||
    expected.propertyIds.join(',') !==
      [SCENARIO_IDS.agentProperty, SCENARIO_IDS.agencyProperty, SCENARIO_IDS.platformProperty].join(
        ',',
      )
  ) {
    throw new Error('Search-to-Lead scenario has unexpected deterministic target identities.');
  }
  const previous = new Map<string, string | undefined>();
  const containedKeys = [
    'DATABASE_URL',
    'DATABASE_AUTHORITY_PARENT_FINGERPRINT',
    'DATABASE_CREDENTIAL_CLASS',
    'NODE_ENV',
    'APP_ENV',
    'REDIS_URL',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'EMAIL_FROM',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
  ];
  for (const key of containedKeys) previous.set(key, process.env[key]);
  Object.assign(process.env, {
    ...databaseAuthorityChildEnvironment(authority),
    REDIS_URL: '',
    RESEND_API_KEY: '',
    RESEND_FROM_EMAIL: '',
    EMAIL_FROM: '',
    TWILIO_ACCOUNT_SID: '',
    TWILIO_AUTH_TOKEN: '',
    WHATSAPP_ACCESS_TOKEN: '',
    WHATSAPP_PHONE_NUMBER_ID: '',
  });
  try {
    const { resetDb } = await import('../../../db-connection');
    resetDb();
    const { publicSearchService } = await import('../../../services/publicSearchService');
    const { capturePublicLead } = await import('../../../services/publicLeadCaptureService');
    const { getDb } = await import('../../../db');
    const { leads } = await import('../../../../drizzle/schema');
    const { eq } = await import('drizzle-orm');
    const { appRouter } = await import('../../../routers');

    const callerFor = (user: Record<string, unknown> | null) =>
      appRouter.createCaller({
        req: { headers: {}, ip: '127.0.0.1' },
        res: {},
        user,
        requestId: 'dba-search-to-lead-v3',
      } as any);

    const search = await publicSearchService.searchInventory({
      province: 'gauteng',
      city: 'johannesburg',
      suburb: ['sandton'],
      listingType: 'sale',
      page: 0,
      pageSize: 10,
    });
    if (search.locationState !== 'resolved' || !search.locationContext)
      throw new Error('Search-to-Lead scenario search did not resolve the canonical location.');
    if (
      Number(search.locationContext.ids.provinceId) <= 0 ||
      Number(search.locationContext.ids.cityId) <= 0 ||
      Number(search.locationContext.ids.suburbId) <= 0
    ) {
      throw new Error('Search-to-Lead scenario returned invalid canonical location identity.');
    }
    if (search.sourceCounts.manual !== 3 || search.sourceCounts.development !== 1) {
      throw new Error(
        'Search-to-Lead scenario did not prove the three canonical manual and one development sale sources.',
      );
    }
    if (search.total !== 4 || search.hasMore) {
      throw new Error(
        'Search-to-Lead scenario total/pagination disagrees with eligible inventory.',
      );
    }
    const propertyCards = new Map(
      search.cards.filter(card => card.kind === 'property').map(card => [card.href, card]),
    );
    for (const propertyId of expected.propertyIds) {
      if (!propertyCards.has(`/property/${propertyId}`)) {
        throw new Error(`Search-to-Lead scenario omitted eligible property ${propertyId}.`);
      }
    }
    const developmentCard = search.cards.find(
      card =>
        card.kind === 'development' &&
        card.href === `/development/dba-verification-development-v1/unit/${SCENARIO_IDS.unit}`,
    );
    if (!developmentCard)
      throw new Error('Search-to-Lead scenario did not blend both eligible public result sources.');

    const propertyCaller = callerFor(null);
    const scenarios: NonNullable<SearchToLeadScenarioEvidence['acceptance']>['scenarios'] = {};
    const acceptedPropertyIds = [
      SCENARIO_IDS.agentProperty,
      SCENARIO_IDS.agencyProperty,
      SCENARIO_IDS.platformProperty,
    ];
    const scenarioNames = ['agent', 'agency_only', 'platform'] as const;
    const expectedIdentity = {
      agent: { role: 'agent', provenance: 'agent', name: 'Lerato Mokoena' },
      agency_only: {
        role: 'agency',
        provenance: 'agency',
        name: 'Urban Nest Properties',
      },
      platform: { role: 'platform', provenance: 'platform_curated', name: 'Property Listify' },
    } as const;

    let agentLeadId = 0;
    let agencyLeadId = 0;
    let platformLeadId = 0;
    for (let index = 0; index < acceptedPropertyIds.length; index += 1) {
      const propertyId = acceptedPropertyIds[index];
      const scenarioName = scenarioNames[index];
      const detail = await propertyCaller.properties.getById({ id: propertyId });
      if (!detail.property || Number(detail.property.id) !== propertyId) {
        throw new Error(`Search-to-Lead scenario detail rejected eligible property ${propertyId}.`);
      }
      const identity = detail.property.publicIdentity;
      const expectedIdentityForScenario = expectedIdentity[scenarioName];
      if (
        identity.role !== expectedIdentityForScenario.role ||
        identity.provenance !== expectedIdentityForScenario.provenance ||
        identity.name !== expectedIdentityForScenario.name
      ) {
        throw new Error(`Search-to-Lead scenario public identity drifted for ${scenarioName}.`);
      }

      const captureRequestId =
        scenarioName === 'agent'
          ? SEARCH_TO_LEAD_SCENARIO_CAPTURE_REQUEST_ID
          : `dba-search-to-lead-v3-${scenarioName}-enquiry`;
      const baseInput = {
        propertyId,
        name: `Database Authority ${scenarioName} Prospect`,
        email: `dba-${scenarioName}@invalid.example`,
        phone: '+27000000000',
        message: `Contained local Search-to-Lead ${scenarioName} acceptance scenario.`,
        source: 'property_detail',
        sourceSurface: 'property_detail',
        leadSource: 'property_detail',
        captureRequestId,
        consent: {
          accepted: true as const,
          version: 'dba-search-to-lead-v3',
          source: 'local-test',
        },
      };
      const lead = await capturePublicLead(baseInput);
      const replay = await capturePublicLead(baseInput);
      if (!replay.duplicate || replay.leadId !== lead.leadId) {
        throw new Error(`Search-to-Lead scenario replay was not idempotent for ${scenarioName}.`);
      }
      let conflictingReplay: 'conflict' | undefined;
      try {
        await capturePublicLead({
          ...baseInput,
          message: `${baseInput.message} conflicting replay`,
        });
      } catch (error) {
        if ((error as { code?: unknown })?.code === 'CONFLICT') conflictingReplay = 'conflict';
      }
      if (conflictingReplay !== 'conflict') {
        throw new Error(
          `Search-to-Lead scenario accepted a conflicting replay for ${scenarioName}.`,
        );
      }
      const database = await getDb();
      if (!database)
        throw new Error('Search-to-Lead scenario database disappeared during acceptance.');
      const durableRows = await database
        .select({
          id: leads.id,
          propertyId: leads.propertyId,
          captureRequestId: leads.captureRequestId,
          agentId: leads.agentId,
          agencyId: leads.agencyId,
          cataloguePublisherId: leads.cataloguePublisherId,
          deliveryStatus: leads.deliveryStatus,
          leadDeliveryMethod: leads.leadDeliveryMethod,
        })
        .from(leads)
        .where(eq(leads.captureRequestId, captureRequestId));
      if (durableRows.length !== 1 || Number(durableRows[0]?.id) !== lead.leadId) {
        throw new Error(
          `Search-to-Lead scenario did not prove one durable lead for ${scenarioName}.`,
        );
      }
      if (scenarioName === 'agent') agentLeadId = lead.leadId;
      if (scenarioName === 'agency_only') agencyLeadId = lead.leadId;
      if (scenarioName === 'platform') platformLeadId = lead.leadId;
      scenarios[scenarioName] = {
        propertyId,
        cardHref: `/property/${propertyId}`,
        detailIdentity: {
          role: identity.role,
          provenance: identity.provenance,
          name: identity.name,
        },
        leadId: lead.leadId,
        replayedLeadId: replay.leadId,
        duplicateReplay: true,
        conflictingReplay,
        durableLeadCount: durableRows.length,
        custody: {
          leadCustody: lead.leadCustody,
          recipientType: lead.recipientType,
          recipientId: lead.recipientId,
          deliveryStatus: lead.deliveryStatus,
          deliveryMethod: lead.deliveryMethod,
        },
        acknowledgement: lead.message || '',
      };
      if (scenarioName === 'platform') {
        if (
          lead.leadCustody !== 'platform_managed' ||
          lead.deliveryStatus !== 'attention_required' ||
          lead.deliveryMethod !== 'manual' ||
          !truthfulPlatformAcknowledgement(lead)
        ) {
          throw new Error('Search-to-Lead scenario platform acknowledgement is not truthful.');
        }
      } else if (
        lead.leadCustody !== 'verified_customer_recipient' ||
        lead.deliveryStatus !== 'delivered' ||
        lead.deliveryMethod !== 'crm_export' ||
        !truthfulDirectAcknowledgement(lead)
      ) {
        throw new Error(
          `Search-to-Lead scenario direct acknowledgement is not truthful for ${scenarioName}.`,
        );
      }
    }

    const developmentDetail = await propertyCaller.developer.getPublicDevelopmentBySlug({
      slugOrId: 'dba-verification-development-v1',
    });
    if (!developmentDetail) {
      throw new Error('Search-to-Lead scenario developer detail did not resolve.');
    }
    const developmentLeadInput = {
      developmentId: SCENARIO_IDS.development,
      unitId: SCENARIO_IDS.unit,
      unitName: 'DBA Verification Unit',
      unitPriceFrom: 1800000,
      unitBedrooms: 2,
      unitBathrooms: 1,
      name: 'Database Authority Developer Prospect',
      email: SCENARIO_PAYLOAD.contact.email,
      phone: SCENARIO_PAYLOAD.contact.phone,
      message: 'Contained local Search-to-Lead developer acceptance scenario.',
      source: 'development_detail',
      sourceSurface: 'development_detail',
      leadSource: 'development_detail',
      captureRequestId: 'dba-search-to-lead-v3-development-enquiry',
      consent: { accepted: true as const, version: 'dba-search-to-lead-v3', source: 'local-test' },
    };
    const developmentLead = await capturePublicLead(developmentLeadInput);
    const developmentReplay = await capturePublicLead(developmentLeadInput);
    if (!developmentReplay.duplicate || developmentReplay.leadId !== developmentLead.leadId) {
      throw new Error('Search-to-Lead scenario developer replay was not idempotent.');
    }
    let developmentConflictingReplay: 'conflict' | undefined;
    try {
      await capturePublicLead({
        ...developmentLeadInput,
        message: `${developmentLeadInput.message} conflicting replay`,
      });
    } catch (error) {
      if ((error as { code?: unknown })?.code === 'CONFLICT') {
        developmentConflictingReplay = 'conflict';
      }
    }
    if (developmentConflictingReplay !== 'conflict') {
      throw new Error('Search-to-Lead scenario accepted a conflicting developer replay.');
    }
    const database = await getDb();
    if (!database)
      throw new Error('Search-to-Lead scenario database disappeared during developer acceptance.');
    const developmentDurableRows = await database
      .select({ id: leads.id })
      .from(leads)
      .where(eq(leads.captureRequestId, developmentLeadInput.captureRequestId));
    if (developmentDurableRows.length !== 1) {
      throw new Error('Search-to-Lead scenario did not prove one durable developer lead.');
    }
    if (
      developmentLead.leadCustody !== 'verified_customer_recipient' ||
      developmentLead.recipientType !== 'developer' ||
      developmentLead.recipientId !== SCENARIO_IDS.developerOrganisation ||
      developmentLead.deliveryStatus !== 'delivered' ||
      developmentLead.deliveryMethod !== 'crm_export' ||
      !truthfulDirectAcknowledgement(developmentLead)
    ) {
      throw new Error('Search-to-Lead scenario developer custody/acknowledgement is not truthful.');
    }

    const hasPropertyInItems = (items: unknown[], propertyId: number): boolean =>
      items.some(item => {
        if (!item || typeof item !== 'object') return false;
        const candidate = item as Record<string, unknown>;
        return (
          candidate.href === `/property/${propertyId}` ||
          Number(candidate.propertyId ?? candidate.id) === propertyId
        );
      });

    const comparison = await propertyCaller.properties.getPublicByIds({
      ids: [SCENARIO_IDS.agentProperty, SCENARIO_IDS.rentalProperty],
    });
    const comparisonIds = comparison.map(result => {
      const record = result as unknown as Record<string, unknown>;
      const property = record.property as Record<string, unknown> | undefined;
      return Number(property?.id ?? record.propertyId ?? record.id);
    });
    if (
      !comparisonIds.includes(SCENARIO_IDS.agentProperty) ||
      comparisonIds.includes(SCENARIO_IDS.rentalProperty)
    ) {
      throw new Error('Search-to-Lead scenario Buy comparison admitted rental inventory.');
    }

    const relatedSaleInventory = await propertyCaller.properties.getRelatedPublicInventory({
      propertyId: SCENARIO_IDS.agentProperty,
    });
    if (hasPropertyInItems(relatedSaleInventory, SCENARIO_IDS.rentalProperty)) {
      throw new Error('Search-to-Lead scenario Buy-related inventory admitted rental inventory.');
    }

    const featuredInventory = await propertyCaller.location.getFeaturedListings({
      locationId: `suburb:${String(search.locationContext.ids.suburbId)}`,
      limit: 10,
    });
    if (hasPropertyInItems(featuredInventory, SCENARIO_IDS.rentalProperty)) {
      throw new Error('Search-to-Lead scenario Buy featured inventory admitted rental inventory.');
    }

    const buyTrending = await propertyCaller.developer.getHomeTrendingFeed({
      tab: 'buy',
      province: 'gauteng',
      city: 'johannesburg',
      suburb: 'sandton',
      limit: 10,
    });
    const buyTrendingItems = Array.isArray(buyTrending?.items) ? buyTrending.items : [];
    if (
      hasPropertyInItems(buyTrendingItems, SCENARIO_IDS.rentalProperty) ||
      buyTrendingItems.some(
        item =>
          item &&
          typeof item === 'object' &&
          String((item as Record<string, unknown>).listingType || '').toLowerCase() === 'rent',
      )
    ) {
      throw new Error('Search-to-Lead scenario Buy trending inventory admitted rental inventory.');
    }

    // SearchResults derives its map markers from the same canonical Buy result
    // cards, so this proves the map result set has the same sale-only boundary.
    const mapRentalExcluded = !propertyCards.has(`/property/${SCENARIO_IDS.rentalProperty}`);
    if (!mapRentalExcluded) {
      throw new Error('Search-to-Lead scenario Buy map results admitted rental inventory.');
    }

    const rentalSearch = await publicSearchService.searchInventory({
      province: 'gauteng',
      city: 'johannesburg',
      suburb: ['sandton'],
      listingType: 'rent',
      page: 0,
      pageSize: 10,
    });
    const rentalCard = rentalSearch.cards.find(
      card => card.kind === 'property' && card.href === `/property/${SCENARIO_IDS.rentalProperty}`,
    );
    if (
      rentalSearch.locationState !== 'resolved' ||
      !rentalCard ||
      rentalCard.listingType !== 'rent'
    ) {
      throw new Error(
        'Search-to-Lead scenario Rent search did not return the canonical published rental card.',
      );
    }

    const rentalDetail = await propertyCaller.properties.getById({
      id: SCENARIO_IDS.rentalProperty,
    });
    if (
      !rentalDetail.property ||
      Number(rentalDetail.property.id) !== SCENARIO_IDS.rentalProperty
    ) {
      throw new Error('Search-to-Lead scenario rejected legitimate shared rental detail.');
    }
    const rentalPropertyDto = rentalDetail.property as Record<string, unknown>;
    const rentalPricing = (rentalPropertyDto.pricingContract || {}) as Record<string, unknown>;
    const rentalIdentity = (rentalPropertyDto.publicIdentity || {}) as Record<string, unknown>;
    const rentalPresentation = (rentalPropertyDto.detailPresentation || {}) as Record<string, unknown>;
    const rentalEssentialFacts = Array.isArray(rentalPresentation.rentalEssentials)
      ? rentalPresentation.rentalEssentials
      : [];
    const rentalEssentialValue = (key: string) => {
      const fact = rentalEssentialFacts.find(
        candidate =>
          candidate &&
          typeof candidate === 'object' &&
          (candidate as Record<string, unknown>).key === key,
      ) as Record<string, unknown> | undefined;
      return String(fact?.value || '');
    };
    const rentalTenantTerms = {
      availability: rentalEssentialValue('availability'),
      lease: rentalEssentialValue('lease'),
      utilities: rentalEssentialValue('utilities'),
      furnishing: rentalEssentialValue('furnishing'),
    };
    if (
      rentalPropertyDto.listingType !== 'rent' ||
      rentalPropertyDto.transactionType !== 'rent' ||
      Number(rentalPropertyDto.price) !== 25000 ||
      rentalPricing.intent !== 'rent' ||
      Number(rentalPricing.monthlyRent) !== 25000 ||
      rentalPresentation.listingIntent !== 'rent' ||
      rentalTenantTerms.availability !== 'Available now' ||
      rentalTenantTerms.lease !== '12-month minimum' ||
      rentalTenantTerms.utilities !== 'Partly included' ||
      rentalTenantTerms.furnishing !== 'Furnished' ||
      rentalIdentity.role !== 'agent' ||
      rentalIdentity.provenance !== 'agent'
    ) {
      throw new Error(
        'Search-to-Lead scenario rental detail did not preserve truthful rental semantics.',
      );
    }

    const rentalLeadInput = {
      propertyId: SCENARIO_IDS.rentalProperty,
      name: 'Database Authority Rental Prospect',
      email: 'dba-rental@invalid.example',
      phone: '+27000000000',
      message: 'Contained local Search-to-Lead shared rental acceptance scenario.',
      source: 'property_detail',
      sourceSurface: 'property_detail',
      leadSource: 'property_detail',
      captureRequestId: 'dba-search-to-lead-v3-rental-enquiry',
      consent: { accepted: true as const, version: 'dba-search-to-lead-v3', source: 'local-test' },
    };
    const rentalLead = await capturePublicLead(rentalLeadInput);
    const rentalReplay = await capturePublicLead(rentalLeadInput);
    if (!rentalReplay.duplicate || rentalReplay.leadId !== rentalLead.leadId) {
      throw new Error('Search-to-Lead scenario rental replay was not idempotent.');
    }
    let rentalConflictingReplay: 'conflict' | undefined;
    try {
      await capturePublicLead({
        ...rentalLeadInput,
        message: `${rentalLeadInput.message} conflicting replay`,
      });
    } catch (error) {
      if ((error as { code?: unknown })?.code === 'CONFLICT') rentalConflictingReplay = 'conflict';
    }
    if (rentalConflictingReplay !== 'conflict') {
      throw new Error('Search-to-Lead scenario accepted a conflicting rental replay.');
    }
    const rentalDatabase = await getDb();
    if (!rentalDatabase)
      throw new Error('Search-to-Lead scenario database disappeared during rental acceptance.');
    const rentalDurableRows = await rentalDatabase
      .select({ id: leads.id })
      .from(leads)
      .where(eq(leads.captureRequestId, rentalLeadInput.captureRequestId));
    if (rentalDurableRows.length !== 1 || Number(rentalDurableRows[0]?.id) !== rentalLead.leadId) {
      throw new Error('Search-to-Lead scenario did not prove one durable rental lead.');
    }
    if (
      rentalLead.leadCustody !== 'verified_customer_recipient' ||
      rentalLead.recipientType !== 'agent' ||
      rentalLead.recipientId !== SCENARIO_IDS.agent ||
      rentalLead.deliveryStatus !== 'delivered' ||
      rentalLead.deliveryMethod !== 'crm_export' ||
      !truthfulDirectAcknowledgement(rentalLead)
    ) {
      throw new Error('Search-to-Lead scenario rental custody/acknowledgement is not truthful.');
    }

    const rentalAcceptance: NonNullable<SearchToLeadScenarioEvidence['acceptance']>['rental'] = {
      propertyId: SCENARIO_IDS.rentalProperty,
      saleSearchExcluded: true,
      rentSearch: {
        included: true,
        propertyCardHref: rentalCard.href,
        total: rentalSearch.total,
      },
      detail: {
        id: Number(rentalDetail.property.id),
        listingType: 'rent',
        transactionType: 'rent',
        price: Number(rentalPropertyDto.price),
        pricingIntent: 'rent',
        monthlyRent: Number(rentalPricing.monthlyRent),
        tenantTerms: {
          availability: 'Available now',
          lease: '12-month minimum',
          utilities: 'Partly included',
          furnishing: 'Furnished',
        },
        publicIdentity: {
          role: String(rentalIdentity.role),
          provenance: String(rentalIdentity.provenance),
          name: String(rentalIdentity.name),
        },
      },
      enquiry: {
        leadId: rentalLead.leadId,
        replayedLeadId: rentalReplay.leadId,
        duplicateReplay: true,
        conflictingReplay: 'conflict',
        durableLeadCount: rentalDurableRows.length,
        custody: {
          leadCustody: rentalLead.leadCustody,
          recipientType: rentalLead.recipientType,
          recipientId: rentalLead.recipientId,
          deliveryStatus: rentalLead.deliveryStatus,
          deliveryMethod: rentalLead.deliveryMethod,
        },
        acknowledgement: rentalLead.message || '',
      },
    };

    const negative: NonNullable<SearchToLeadScenarioEvidence['acceptance']>['negative'] = {};
    const negativeNames = [
      ['orphan', SCENARIO_IDS.orphanProperty],
      ['unpublished', SCENARIO_IDS.unpublishedProperty],
      ['archived', SCENARIO_IDS.archivedProperty],
      ['pending', SCENARIO_IDS.pendingProperty],
      ['incoherent', SCENARIO_IDS.incoherentProperty],
    ] as const;
    for (const [name, propertyId] of negativeNames) {
      if (propertyCards.has(`/property/${propertyId}`)) {
        throw new Error(`Search-to-Lead scenario leaked ${name} property into Buy search.`);
      }
      const detail = await propertyCaller.properties.getById({ id: propertyId });
      if (detail.property !== null) {
        throw new Error(`Search-to-Lead scenario detail bypassed fail-closed ${name} eligibility.`);
      }
      let rejected = false;
      try {
        await capturePublicLead({
          propertyId,
          name: `Database Authority ${name} Negative`,
          email: `dba-negative-${name}@invalid.example`,
          phone: '+27000000000',
          message: `Negative ${name} acceptance probe.`,
          source: 'property_detail',
          sourceSurface: 'property_detail',
          leadSource: 'property_detail',
          captureRequestId: `dba-search-to-lead-v3-negative-${name}`,
          consent: { accepted: true, version: 'dba-search-to-lead-v3', source: 'local-test' },
        });
      } catch (error) {
        rejected = String((error as { code?: unknown })?.code || '') === 'NOT_FOUND';
      }
      if (!rejected) {
        throw new Error(
          `Search-to-Lead scenario enquiry bypassed fail-closed ${name} eligibility.`,
        );
      }
      negative[name] = { propertyId, searchIncluded: false, detail: null, enquiry: 'rejected' };
    }

    const user = (id: number, role: string, agencyId: number | null = null) => ({
      id,
      role,
      agencyId,
      email: `dba-user-${id}@invalid.example`,
      name: `DBA User ${id}`,
    });
    const agentCaller = callerFor(user(SCENARIO_IDS.agentUser, 'agent', SCENARIO_IDS.agency));
    const unrelatedAgentCaller = callerFor(
      user(SCENARIO_IDS.unrelatedAgentUser, 'agent', SCENARIO_IDS.unrelatedAgency),
    );
    const agencyCaller = callerFor(
      user(SCENARIO_IDS.agencyOnlyUser, 'agency_admin', SCENARIO_IDS.agencyOnly),
    );
    const agentAgencyCaller = callerFor(user(SCENARIO_IDS.agentUser, 'agent', SCENARIO_IDS.agency));
    const unrelatedAgencyCaller = callerFor(
      user(SCENARIO_IDS.unrelatedAgencyAdminUser, 'agency_admin', SCENARIO_IDS.unrelatedAgency),
    );
    const developerCaller = callerFor(user(SCENARIO_IDS.developerUser, 'property_developer'));
    const unrelatedDeveloperCaller = callerFor(
      user(SCENARIO_IDS.unrelatedDeveloperUser, 'property_developer'),
    );
    const platformCaller = callerFor(user(SCENARIO_IDS.platformOperationsUser, 'super_admin'));
    const nonOperationsCaller = callerFor(
      user(SCENARIO_IDS.agentUser, 'agent', SCENARIO_IDS.agency),
    );

    const agentLeads = await agentCaller.agent.getMyLeads({ status: 'all', limit: 100 });
    const unrelatedAgentLeads = await unrelatedAgentCaller.agent.getMyLeads({
      status: 'all',
      limit: 100,
    });
    const agencyLeads = await agencyCaller.agency.getLeads({ status: 'all', limit: 100 });
    const agentAgencyLeads = await agentAgencyCaller.agency.getLeads({ status: 'all', limit: 100 });
    const unrelatedAgencyDenied = await unrelatedAgencyCaller.agency
      .getLeadDetail({ leadId: agentLeadId })
      .then(() => false)
      .catch(() => true);
    const developerLeads = await developerCaller.developer.getLeads({ limit: 100 });
    const unrelatedDeveloperLeads = await unrelatedDeveloperCaller.developer.getLeads({
      limit: 100,
    });
    const platformAudit = await platformCaller.system.leadRoutingAudit({
      days: 365,
      attentionLimit: 50,
    });
    const nonOperationsDenied = await nonOperationsCaller.system
      .leadRoutingAudit({ days: 365, attentionLimit: 50 })
      .then(() => false)
      .catch(() => true);
    if (
      !agentLeads.some(lead => Number(lead.id) === agentLeadId) ||
      unrelatedAgentLeads.some(lead => Number(lead.id) === agentLeadId) ||
      !agencyLeads.some(lead => Number(lead.id) === agencyLeadId) ||
      !agentAgencyLeads.some(lead => Number(lead.id) === agentLeadId) ||
      !unrelatedAgencyDenied ||
      !developerLeads.items.some((lead: any) => Number(lead.id) === developmentLead.leadId) ||
      unrelatedDeveloperLeads.items.some(
        (lead: any) => Number(lead.id) === developmentLead.leadId,
      ) ||
      Number(platformAudit.summary.platformCustody) < 1 ||
      !platformAudit.attentionLeads.some((lead: any) => Number(lead.id) === platformLeadId) ||
      !nonOperationsDenied
    ) {
      throw new Error('Search-to-Lead scenario failed tenant-scoped custody authorization checks.');
    }

    const primaryAgentCard = propertyCards.get(`/property/${SCENARIO_IDS.agentProperty}`);
    if (!primaryAgentCard)
      throw new Error('Search-to-Lead scenario lost its primary property card.');
    return {
      locationState: 'resolved',
      locationContext: {
        provinceId: Number(search.locationContext.ids.provinceId),
        cityId: Number(search.locationContext.ids.cityId),
        suburbId: Number(search.locationContext.ids.suburbId),
      },
      propertyCardHref: primaryAgentCard.href,
      developmentCardHref: developmentCard.href,
      propertyPage: primaryAgentCard.href,
      developmentPage: developmentCard.href,
      total: search.total,
      page: search.page,
      pageSize: search.pageSize,
      hasMore: search.hasMore,
      leadId: agentLeadId,
      replayedLeadId: scenarios.agent.replayedLeadId,
      duplicateReplay: true,
      leadCustody: scenarios.agent.custody.leadCustody,
      deliveryStatus: scenarios.agent.custody.deliveryStatus,
      deliveryMethod: scenarios.agent.custody.deliveryMethod,
      sourceCounts: {
        manual: search.sourceCounts.manual,
        development: search.sourceCounts.development,
      },
      development: {
        leadId: developmentLead.leadId,
        replayedLeadId: developmentReplay.leadId,
        duplicateReplay: true,
        conflictingReplay: 'conflict',
        durableLeadCount: developmentDurableRows.length,
        acknowledgement: developmentLead.message || '',
      },
      scenarios,
      discovery: {
        mapRentalExcluded: true,
        comparisonRentalExcluded: true,
        featuredRentalExcluded: true,
        trendingRentalExcluded: true,
        relatedRentalExcluded: true,
      },
      rental: rentalAcceptance,
      negative,
      authorization: {
        agent: { ownerVisible: true, unrelatedDenied: true },
        agency: { ownerVisible: true, unrelatedDenied: true },
        developer: { ownerVisible: true, unrelatedDenied: true },
        platform: { operationsVisible: true, nonOperationsDenied: true },
      },
    };
  } finally {
    const { resetDb } = await import('../../../db-connection');
    resetDb();
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

export async function verifySearchToLeadScenario(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
  profileRoot?: string;
}): Promise<SearchToLeadScenarioEvidence> {
  assertOperation(input.decision, ['verification', 'browser-verification', 'readiness']);
  const ownership = requireReferenceAdapterTarget(input.authority, input.profileRoot);
  const manifest = await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
    profileRoot: input.profileRoot,
  });
  await verifyCanonicalGeographyReferenceData(input.connection);
  const verified = await verifySearchToLeadScenarioData(input.connection);
  const acceptance =
    input.decision.operation === 'readiness'
      ? undefined
      : await runContainedApplicationVerification(input.authority, verified);
  return {
    ...ownership,
    adapter: 'search-to-lead-scenario',
    version: SEARCH_TO_LEAD_SCENARIO_VERSION,
    digest: SEARCH_TO_LEAD_SCENARIO_DIGEST,
    expected: {
      eligibleProperties: 3,
      eligibleDevelopments: 1,
      canonicalLocation: 'gauteng/johannesburg/sandton',
    },
    verified,
    migrationHead: manifest.document.expectedHead,
    acceptance,
  };
}
