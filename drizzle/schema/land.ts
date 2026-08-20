import {
  check,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
import { agencies, agents } from './agencies';
import { users } from './core';
import { cities, provinces, suburbs } from './locations';
import { listings } from './listings';

export const LAND_CLASSIFICATIONS = [
  'residential_stand',
  'development_land',
  'commercial_industrial_land',
  'agricultural_vacant_land',
  'smallholding',
  'farm',
  'other_land',
] as const;

export const landParcels = mysqlTable(
  'land_parcels',
  {
    id: int().autoincrement().primaryKey(),
    jurisdictionCountryCode: varchar('jurisdiction_country_code', { length: 2 }).notNull(),
    provinceId: int('province_id').references(() => provinces.id, { onDelete: 'set null' }),
    cityId: int('city_id').references(() => cities.id, { onDelete: 'set null' }),
    suburbId: int('suburb_id').references(() => suburbs.id, { onDelete: 'set null' }),
    parcelKind: mysqlEnum('parcel_kind', ['erf', 'portion', 'farm', 'remainder', 'other']).notNull(),
    privateIdentifier: varchar('private_identifier', { length: 500 }).notNull(),
    privateIdentifierHash: varchar('private_identifier_hash', { length: 64 }).notNull(),
    extentM2: decimal('extent_m2', { precision: 16, scale: 2 }),
    centroidLatitude: decimal('centroid_latitude', { precision: 10, scale: 7 }),
    centroidLongitude: decimal('centroid_longitude', { precision: 10, scale: 7 }),
    privateGeometry: json('private_geometry'),
    geometryConfidence: mysqlEnum('geometry_confidence', ['unknown', 'approximate', 'confirmed']).default('unknown').notNull(),
    identitySource: mysqlEnum('identity_source', ['seller', 'document', 'authoritative_source', 'professional', 'manual']).notNull(),
    lifecycleStatus: mysqlEnum('lifecycle_status', ['active', 'retired', 'merged']).default('active').notNull(),
    createdByUserId: int('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('uq_land_parcels_jurisdiction_identifier').on(table.jurisdictionCountryCode, table.privateIdentifierHash),
    index('idx_land_parcels_geography').on(table.provinceId, table.cityId, table.suburbId),
    index('idx_land_parcels_extent').on(table.extentM2),
  ],
);

export const landAssets = mysqlTable(
  'land_assets',
  {
    id: int().autoincrement().primaryKey(),
    classification: mysqlEnum('classification', LAND_CLASSIFICATIONS).notNull(),
    intendedUse: varchar('intended_use', { length: 120 }),
    developmentContext: text('development_context'),
    publicLocationPrecision: mysqlEnum('public_location_precision', ['approximate', 'exact']).default('approximate').notNull(),
    lifecycleStatus: mysqlEnum('lifecycle_status', ['draft', 'active', 'retired']).default('draft').notNull(),
    createdByUserId: int('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [index('idx_land_assets_classification_status').on(table.classification, table.lifecycleStatus)],
);

export const landAssetParcels = mysqlTable(
  'land_asset_parcels',
  {
    id: int().autoincrement().primaryKey(),
    landAssetId: int('land_asset_id').notNull().references(() => landAssets.id, { onDelete: 'cascade' }),
    parcelId: int('parcel_id').notNull().references(() => landParcels.id, { onDelete: 'restrict' }),
    relationshipRole: mysqlEnum('relationship_role', ['primary', 'component']).default('component').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    unique('uq_land_asset_parcels').on(table.landAssetId, table.parcelId),
    index('idx_land_asset_parcels_parcel').on(table.parcelId),
  ],
);

export const landListingLinks = mysqlTable(
  'land_listing_links',
  {
    id: int().autoincrement().primaryKey(),
    landAssetId: int('land_asset_id').notNull().references(() => landAssets.id, { onDelete: 'restrict' }),
    listingId: int('listing_id').notNull().references(() => listings.id, { onDelete: 'restrict' }),
    linkStatus: mysqlEnum('link_status', ['active', 'ended']).default('active').notNull(),
    linkedAt: timestamp('linked_at', { mode: 'string' }).defaultNow().notNull(),
    endedAt: timestamp('ended_at', { mode: 'string' }),
  },
  table => [
    unique('uq_land_listing_links_listing').on(table.listingId),
    index('idx_land_listing_links_asset_status').on(table.landAssetId, table.linkStatus),
  ],
);

export const landClaims = mysqlTable(
  'land_claims',
  {
    id: int().autoincrement().primaryKey(),
    landAssetId: int('land_asset_id').references(() => landAssets.id, { onDelete: 'cascade' }),
    parcelId: int('parcel_id').references(() => landParcels.id, { onDelete: 'cascade' }),
    claimCode: varchar('claim_code', { length: 100 }).notNull(),
    valueState: mysqlEnum('value_state', ['asserted', 'unknown', 'unavailable', 'not_applicable']).notNull(),
    claimedValue: json('claimed_value'),
    declaredByUserId: int('declared_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    declaredAt: timestamp('declared_at', { mode: 'string' }).defaultNow().notNull(),
    withdrawnAt: timestamp('withdrawn_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    check('chk_land_claims_one_subject', sql.raw('((`land_asset_id` IS NOT NULL) + (`parcel_id` IS NOT NULL)) = 1')),
    index('idx_land_claims_asset_code').on(table.landAssetId, table.claimCode),
    index('idx_land_claims_parcel_code').on(table.parcelId, table.claimCode),
  ],
);

export const landEvidenceDocuments = mysqlTable(
  'land_evidence_documents',
  {
    id: int().autoincrement().primaryKey(),
    landAssetId: int('land_asset_id').notNull().references(() => landAssets.id, { onDelete: 'cascade' }),
    parcelId: int('parcel_id').references(() => landParcels.id, { onDelete: 'set null' }),
    evidenceType: mysqlEnum('evidence_type', ['mandate', 'identity', 'title_registry', 'parcel_survey', 'professional_report', 'planning', 'other']).notNull(),
    privateStorageKey: varchar('private_storage_key', { length: 500 }).notNull(),
    originalFileName: varchar('original_file_name', { length: 255 }),
    mimeType: varchar('mime_type', { length: 120 }),
    byteSize: int('byte_size'),
    sha256: varchar('sha256', { length: 64 }),
    providerName: varchar('provider_name', { length: 255 }),
    custodyState: mysqlEnum('custody_state', ['received', 'reviewed', 'replaced', 'withdrawn', 'expired']).default('received').notNull(),
    expiresAt: timestamp('expires_at', { mode: 'string' }),
    retentionUntil: timestamp('retention_until', { mode: 'string' }),
    uploadedByUserId: int('uploaded_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('uq_land_evidence_storage_key').on(table.privateStorageKey),
    index('idx_land_evidence_asset_state').on(table.landAssetId, table.custodyState),
    index('idx_land_evidence_parcel').on(table.parcelId),
  ],
);

export const landMarketingAuthorities = mysqlTable(
  'land_marketing_authorities',
  {
    id: int().autoincrement().primaryKey(),
    landAssetId: int('land_asset_id').notNull().references(() => landAssets.id, { onDelete: 'cascade' }),
    actorType: mysqlEnum('actor_type', ['owner_direct', 'agent', 'agency', 'developer', 'other']).notNull(),
    agencyId: int('agency_id').references(() => agencies.id, { onDelete: 'set null' }),
    agentId: int('agent_id').references(() => agents.id, { onDelete: 'set null' }),
    authorityType: mysqlEnum('authority_type', ['sole_mandate', 'open_mandate', 'joint_mandate', 'owner_direct', 'other']).notNull(),
    authorityStatus: mysqlEnum('authority_status', ['pending', 'active', 'rejected', 'expired', 'withdrawn']).default('pending').notNull(),
    effectiveAt: timestamp('effective_at', { mode: 'string' }),
    expiresAt: timestamp('expires_at', { mode: 'string' }),
    reviewDueAt: timestamp('review_due_at', { mode: 'string' }),
    reviewerUserId: int('reviewer_user_id').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { mode: 'string' }),
    reviewerOutcome: varchar('reviewer_outcome', { length: 120 }),
    supportingEvidenceId: int('supporting_evidence_id').references(() => landEvidenceDocuments.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [index('idx_land_marketing_authority_asset_status').on(table.landAssetId, table.authorityStatus)],
);

export const landVerificationAssertions = mysqlTable(
  'land_verification_assertions',
  {
    id: int().autoincrement().primaryKey(),
    claimId: int('claim_id').notNull().references(() => landClaims.id, { onDelete: 'cascade' }),
    status: mysqlEnum('status', ['unverified', 'asserted', 'verified', 'contradicted', 'expired', 'unavailable', 'withdrawn']).notNull(),
    publicConclusion: text('public_conclusion'),
    limitations: text('limitations'),
    sourceProvider: varchar('source_provider', { length: 255 }),
    verifierType: mysqlEnum('verifier_type', ['platform_operations', 'authoritative_source', 'conveyancer', 'planner', 'surveyor', 'professional_partner', 'approved_automation', 'other']).notNull(),
    verifierName: varchar('verifier_name', { length: 255 }),
    processReference: varchar('process_reference', { length: 255 }),
    checkedAt: timestamp('checked_at', { mode: 'string' }),
    recheckDueAt: timestamp('recheck_due_at', { mode: 'string' }),
    expiresAt: timestamp('expires_at', { mode: 'string' }),
    supersedesAssertionId: int('supersedes_assertion_id'),
    reviewedByUserId: int('reviewed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('idx_land_verification_claim_status').on(table.claimId, table.status),
    index('idx_land_verification_recheck').on(table.recheckDueAt),
  ],
);

export const landAssertionEvidence = mysqlTable(
  'land_assertion_evidence',
  {
    id: int().autoincrement().primaryKey(),
    assertionId: int('assertion_id').notNull().references(() => landVerificationAssertions.id, { onDelete: 'cascade' }),
    evidenceDocumentId: int('evidence_document_id').notNull().references(() => landEvidenceDocuments.id, { onDelete: 'restrict' }),
    relationship: mysqlEnum('relationship', ['supports', 'contradicts', 'context']).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [unique('uq_land_assertion_evidence').on(table.assertionId, table.evidenceDocumentId)],
);

export const landVerificationEvents = mysqlTable(
  'land_verification_events',
  {
    id: int().autoincrement().primaryKey(),
    assertionId: int('assertion_id').notNull().references(() => landVerificationAssertions.id, { onDelete: 'cascade' }),
    eventType: mysqlEnum('event_type', ['created', 'reviewed', 'superseded', 'contradicted', 'expired', 'withdrawn', 'recheck_scheduled']).notNull(),
    actorUserId: int('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    eventData: json('event_data'),
    occurredAt: timestamp('occurred_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [index('idx_land_verification_events_assertion_time').on(table.assertionId, table.occurredAt)],
);

export const landConflictCases = mysqlTable(
  'land_conflict_cases',
  {
    id: int().autoincrement().primaryKey(),
    landAssetId: int('land_asset_id').notNull().references(() => landAssets.id, { onDelete: 'cascade' }),
    conflictingLandAssetId: int('conflicting_land_asset_id').references(() => landAssets.id, { onDelete: 'set null' }),
    conflictingListingId: int('conflicting_listing_id').references(() => listings.id, { onDelete: 'set null' }),
    matchingBasis: json('matching_basis').notNull(),
    severity: mysqlEnum('severity', ['low', 'medium', 'high']).notNull(),
    reviewStatus: mysqlEnum('review_status', ['open', 'reviewing', 'resolved_no_conflict', 'resolved_conflict', 'dismissed']).default('open').notNull(),
    reviewerUserId: int('reviewer_user_id').references(() => users.id, { onDelete: 'set null' }),
    reviewerOutcome: text('reviewer_outcome'),
    resolvedAt: timestamp('resolved_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    check('chk_land_conflict_case_candidate', sql.raw('(`conflicting_land_asset_id` IS NOT NULL OR `conflicting_listing_id` IS NOT NULL)')),
    index('idx_land_conflict_cases_asset_status').on(table.landAssetId, table.reviewStatus),
  ],
);
