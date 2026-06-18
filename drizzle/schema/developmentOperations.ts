import {
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';

import { users } from './core';
import { distributionDeals, distributionPrograms } from './distribution';
import { developments, unitTypes } from './developments';
import { leads } from './leads';

export const DEVELOPMENT_OPERATING_TRANSACTION_TYPES = [
  'for_sale',
  'for_rent',
  'auction',
] as const;

export const DEVELOPMENT_OPERATING_EVENT_TYPES = [
  'inventory_status_changed',
  'inventory_quantity_adjusted',
  'price_changed',
  'rent_changed',
  'auction_window_changed',
  'auction_outcome_recorded',
  'lead_stage_changed',
  'showing_scheduled',
  'application_status_changed',
  'registration_status_changed',
  'distribution_enabled',
  'distribution_disabled',
  'distribution_handoff_created',
  'evidence_artifact_requested',
  'evidence_artifact_submitted',
  'evidence_artifact_review_started',
  'evidence_artifact_accepted',
  'evidence_artifact_rejected',
  'evidence_artifact_expired',
  'evidence_artifact_withdrawn',
  'evidence_artifact_downloaded',
  'publish_status_changed',
  'operating_note_added',
] as const;

export const DEVELOPMENT_OPERATING_SOURCE_SURFACES = [
  'developer_dashboard',
  'developer_units_manager',
  'developer_leads_manager',
  'distribution_manager',
  'admin_review',
  'system',
] as const;

export const developmentOperatingEvents = mysqlTable(
  'development_operating_events',
  {
    id: int().autoincrement().primaryKey(),
    developmentId: int('development_id')
      .notNull()
      .references(() => developments.id, { onDelete: 'cascade' }),
    unitTypeId: varchar('unit_type_id', { length: 36 }).references(() => unitTypes.id, {
      onDelete: 'set null',
    }),
    leadId: int('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    distributionDealId: int('distribution_deal_id').references(() => distributionDeals.id, {
      onDelete: 'set null',
    }),
    transactionType: mysqlEnum(
      'transaction_type',
      DEVELOPMENT_OPERATING_TRANSACTION_TYPES as unknown as [string, ...string[]],
    ).notNull(),
    eventType: mysqlEnum(
      'event_type',
      DEVELOPMENT_OPERATING_EVENT_TYPES as unknown as [string, ...string[]],
    ).notNull(),
    fromStatus: varchar('from_status', { length: 80 }),
    toStatus: varchar('to_status', { length: 80 }),
    quantityDelta: int('quantity_delta'),
    beforeData: json('before_data'),
    afterData: json('after_data'),
    metadata: json(),
    actorUserId: int('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    sourceSurface: mysqlEnum(
      'source_surface',
      DEVELOPMENT_OPERATING_SOURCE_SURFACES as unknown as [string, ...string[]],
    )
      .default('developer_dashboard')
      .notNull(),
    eventAt: timestamp('event_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  },
  table => [
    index('idx_development_operating_events_development').on(table.developmentId),
    index('idx_development_operating_events_development_time').on(
      table.developmentId,
      table.eventAt,
    ),
    index('idx_development_operating_events_event_type').on(table.eventType),
    index('idx_development_operating_events_actor').on(table.actorUserId),
    index('idx_development_operating_events_unit').on(table.unitTypeId),
    index('idx_development_operating_events_lead').on(table.leadId),
    index('idx_development_operating_events_deal').on(table.distributionDealId),
  ],
);

export const DLE_EVIDENCE_ARTIFACT_ROLES = [
  'identity',
  'fica',
  'proof_of_funds',
  'application_form',
  'supporting',
  'buyer_intent',
  'finance_path',
  'sale_agreement',
  'deposit_proof',
  'completion_proof',
  'rental_fit',
  'proof_of_income',
  'bank_statements',
  'employment_confirmation',
  'deposit_readiness',
  'lease_pack',
  'signed_lease',
  'occupation_timing',
  'bidder_intent',
  'legal_pack_acknowledgement',
  'auction_terms_acceptance',
  'bidder_registration',
  'registration_deposit',
  'winning_bid_confirmation',
] as const;

export const DLE_EVIDENCE_ARTIFACT_TYPES = [
  'uploaded_file',
  'external_link',
  'manual_attestation',
  'system_note',
] as const;

export const DLE_EVIDENCE_ARTIFACT_STATUSES = [
  'requested',
  'submitted',
  'under_review',
  'accepted',
  'rejected',
  'expired',
  'withdrawn',
] as const;

export const DLE_EVIDENCE_REVIEW_OWNERS = [
  'developer_sales',
  'leasing_team',
  'auction_team',
  'distribution_manager',
  'admin',
  'system',
] as const;

export const DLE_EVIDENCE_ACCESS_GRANT_SOURCE_SURFACES = [
  'developer_leads_manager',
  'admin_review',
  'distribution_manager',
  'system',
] as const;

export const DLE_EVIDENCE_ACCESS_GRANT_TARGET_SURFACES = [
  'admin_review',
  'distribution_manager',
] as const;

export const DLE_EVIDENCE_ACCESS_GRANT_LEVELS = [
  'metadata',
  'download',
  'review_mutation',
] as const;

export const DLE_EVIDENCE_ACCESS_GRANT_STATUSES = [
  'active',
  'revoked',
  'expired',
] as const;

export const dleEvidenceArtifacts = mysqlTable(
  'dle_evidence_artifacts',
  {
    id: int().autoincrement().primaryKey(),
    developmentId: int('development_id')
      .notNull()
      .references(() => developments.id, { onDelete: 'cascade' }),
    transactionType: mysqlEnum(
      'transaction_type',
      DEVELOPMENT_OPERATING_TRANSACTION_TYPES as unknown as [string, ...string[]],
    ).notNull(),
    leadId: int('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    unitTypeId: varchar('unit_type_id', { length: 36 }).references(() => unitTypes.id, {
      onDelete: 'set null',
    }),
    distributionDealId: int('distribution_deal_id').references(() => distributionDeals.id, {
      onDelete: 'set null',
    }),
    artifactRole: mysqlEnum(
      'artifact_role',
      DLE_EVIDENCE_ARTIFACT_ROLES as unknown as [string, ...string[]],
    ).notNull(),
    artifactType: mysqlEnum(
      'artifact_type',
      DLE_EVIDENCE_ARTIFACT_TYPES as unknown as [string, ...string[]],
    )
      .default('manual_attestation')
      .notNull(),
    storageKey: varchar('storage_key', { length: 512 }),
    externalUrl: varchar('external_url', { length: 1024 }),
    displayName: varchar('display_name', { length: 160 }).notNull(),
    description: varchar('description', { length: 2000 }),
    status: mysqlEnum(
      'status',
      DLE_EVIDENCE_ARTIFACT_STATUSES as unknown as [string, ...string[]],
    )
      .default('submitted')
      .notNull(),
    reviewOwner: mysqlEnum(
      'review_owner',
      DLE_EVIDENCE_REVIEW_OWNERS as unknown as [string, ...string[]],
    ).notNull(),
    reviewedByUserId: int('reviewed_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    reviewedAt: timestamp('reviewed_at', { mode: 'string' }),
    reviewNote: varchar('review_note', { length: 2000 }),
    metadata: json(),
    createdByUserId: int('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    updatedByUserId: int('updated_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  },
  table => [
    index('idx_dle_evidence_artifacts_development').on(table.developmentId),
    index('idx_dle_evidence_artifacts_lead').on(table.leadId),
    index('idx_dle_evidence_artifacts_role').on(table.developmentId, table.artifactRole),
    index('idx_dle_evidence_artifacts_status').on(table.developmentId, table.status),
    index('idx_dle_evidence_artifacts_transaction').on(
      table.developmentId,
      table.transactionType,
    ),
  ],
);

export const dleEvidenceArtifactAccessGrants = mysqlTable(
  'dle_evidence_artifact_access_grants',
  {
    id: int().autoincrement().primaryKey(),
    artifactId: int('artifact_id')
      .notNull()
      .references(() => dleEvidenceArtifacts.id, { onDelete: 'cascade' }),
    developmentId: int('development_id')
      .notNull()
      .references(() => developments.id, { onDelete: 'cascade' }),
    leadId: int('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    distributionDealId: int('distribution_deal_id').references(() => distributionDeals.id, {
      onDelete: 'set null',
    }),
    distributionProgramId: int('distribution_program_id').references(() => distributionPrograms.id, {
      onDelete: 'set null',
    }),
    adminReviewItemId: int('admin_review_item_id'),
    sourceSurface: mysqlEnum(
      'source_surface',
      DLE_EVIDENCE_ACCESS_GRANT_SOURCE_SURFACES as unknown as [string, ...string[]],
    ).notNull(),
    grantedToSurface: mysqlEnum(
      'granted_to_surface',
      DLE_EVIDENCE_ACCESS_GRANT_TARGET_SURFACES as unknown as [string, ...string[]],
    ).notNull(),
    grantedToUserId: int('granted_to_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    grantedToRole: varchar('granted_to_role', { length: 80 }),
    accessLevel: mysqlEnum(
      'access_level',
      DLE_EVIDENCE_ACCESS_GRANT_LEVELS as unknown as [string, ...string[]],
    ).notNull(),
    reasonCode: varchar('reason_code', { length: 80 }).notNull(),
    reasonNote: varchar('reason_note', { length: 2000 }),
    status: mysqlEnum(
      'status',
      DLE_EVIDENCE_ACCESS_GRANT_STATUSES as unknown as [string, ...string[]],
    )
      .default('active')
      .notNull(),
    expiresAt: timestamp('expires_at', { mode: 'string' }),
    grantedByUserId: int('granted_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    revokedByUserId: int('revoked_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    metadata: json(),
    createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  },
  table => [
    index('idx_dle_evidence_access_grants_artifact_status').on(table.artifactId, table.status),
    index('idx_dle_evidence_access_grants_deal_status').on(table.distributionDealId, table.status),
    index('idx_dle_evidence_access_grants_program_status').on(
      table.distributionProgramId,
      table.status,
    ),
    index('idx_dle_evidence_access_grants_admin_status').on(
      table.adminReviewItemId,
      table.status,
    ),
    index('idx_dle_evidence_access_grants_user_status').on(table.grantedToUserId, table.status),
    index('idx_dle_evidence_access_grants_development_access').on(
      table.developmentId,
      table.accessLevel,
      table.status,
    ),
  ],
);
