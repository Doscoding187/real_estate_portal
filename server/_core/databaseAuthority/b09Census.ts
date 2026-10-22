import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import * as canonicalSchema from '../../../drizzle/schema';
import { buildMigrationPlan, type AppliedMigration } from '../../migrations/runSqlMigrations';
import type { ValidatedMigrationManifest } from '../../migrations/migrationManifest';
import type { AuthoritySqlConnection } from './connectionAuthority';
import {
  compareNormalizedSchemas,
  normalizedDesiredSchema,
  normalizedPhysicalSchema,
} from './schemaCongruency';
import type { ResolvedDatabaseAuthority } from './types';

export const B09_CENSUS_OPERATION = 'b09-source-census' as const;
export const B09_CENSUS_SCOPE_ID = 'b09-launch-data-aggregate-v2';
export const B09_CENSUS_SCHEMA_MAPPING_ID = 'canonical-launch-0094-v2';
export const B09_CENSUS_EXPECTED_HEAD = '0094_content_topics_primary_key.sql';
export const B09_CENSUS_MAX_EXECUTION_MS = 15_000;
export const B09_CENSUS_RESULT_ROW_LIMIT = 1;
export const B09_CENSUS_MAX_MIGRATION_ROWS = 128;
export const B09_CENSUS_MAX_METADATA_ROWS_PER_QUERY = 1_500;
export const B09_CENSUS_CONTROL_TIMEOUT_MS = 1_000;
export const B09_CENSUS_ROLLBACK_TIMEOUT_MS = 1_000;
export const B09_CENSUS_CANCELLATION_CLEANUP_MS = 3_000;
export const B09_CENSUS_TIMEOUT_PROBE_MS = 200;
export const B09_CENSUS_TIMEOUT_PROBE_QUERY = 'SELECT SLEEP(30) AS timeout_probe';
export const B09_CENSUS_ACTIVE_SESSION_QUERY =
  'SELECT COUNT(*) AS active_sessions FROM information_schema.processlist WHERE ID = ?';

/**
 * This ordered list is the complete table scope. All identifiers in the SQL
 * are fixed below; no authorization document can add a table or predicate.
 */
export const B09_CENSUS_READ_TABLES = [
  'sql_migration_history',
  'sql_migration_attempts',
  'users',
  'agencies',
  'agents',
  'developer_organisations',
  'developer_organisation_memberships',
  'catalogue_publishers',
  'developments',
  'development_units',
  'development_drafts',
  'listings',
  'properties',
  'propertyImages',
  'videos',
  'leads',
  'lead_activities',
  'prospect_identities',
  'billable_accounts',
  'subscriptions',
  'billing_invoices',
  'billing_payments',
  'billing_payment_documents',
  'billing_audit_events',
  'audit_logs',
  'managerial_audit_logs',
] as const;

export const B09_CENSUS_READ_METADATA = [
  'information_schema.tables',
  'information_schema.columns',
  'information_schema.statistics',
  'information_schema.key_column_usage',
  'information_schema.referential_constraints',
  'information_schema.table_constraints',
  'information_schema.check_constraints',
  'information_schema.processlist (own session id only; timeout verification only)',
  '@@global.lower_case_table_names',
] as const;

export const B09_CENSUS_DATA_TABLES = B09_CENSUS_READ_TABLES.filter(
  table => table !== 'sql_migration_history' && table !== 'sql_migration_attempts',
);

export const B09_MIGRATION_HISTORY_QUERY =
  'SELECT numeric_version, filename, checksum FROM sql_migration_history ORDER BY numeric_version, filename';
export const B09_INCOMPLETE_ATTEMPTS_QUERY =
  "SELECT COUNT(*) AS incomplete_attempts FROM sql_migration_attempts WHERE state IN ('running', 'failed', 'blocked')";

/** One row of fixed COUNT aggregates. No source values or record identifiers are selected. */
export const B09_CENSUS_QUERY = `SELECT
  (SELECT COUNT(*) FROM users) AS users_total,
  (SELECT COUNT(*) FROM users WHERE role = 'super_admin') AS users_super_admin,
  (SELECT COUNT(*) FROM users WHERE role = 'agent') AS users_agent,
  (SELECT COUNT(*) FROM users WHERE role = 'agency_admin') AS users_agency_admin,
  (SELECT COUNT(*) FROM users WHERE role = 'property_developer') AS users_developer,
  (SELECT COUNT(*) FROM users u LEFT JOIN agencies a ON a.id = u.agencyId WHERE u.agencyId IS NOT NULL AND a.id IS NULL) AS users_missing_agency,
  (SELECT COUNT(*) FROM agencies) AS agencies_total,
  (SELECT COUNT(*) FROM agents) AS agents_total,
  (SELECT COUNT(*) FROM agents g LEFT JOIN users u ON u.id = g.userId WHERE g.userId IS NOT NULL AND u.id IS NULL) AS agents_missing_user,
  (SELECT COUNT(*) FROM agents g LEFT JOIN agencies a ON a.id = g.agencyId WHERE g.agencyId IS NOT NULL AND a.id IS NULL) AS agents_missing_agency,
  (SELECT COUNT(*) FROM developer_organisations) AS developer_organisations_total,
  (SELECT COUNT(*) FROM developer_organisations WHERE status = 'pending') AS developer_organisations_pending,
  (SELECT COUNT(*) FROM developer_organisations WHERE status = 'approved') AS developer_organisations_approved,
  (SELECT COUNT(*) FROM developer_organisation_memberships) AS developer_memberships_total,
  (SELECT COUNT(*) FROM developer_organisation_memberships m LEFT JOIN developer_organisations o ON o.id = m.organisation_id WHERE o.id IS NULL) AS developer_memberships_missing_organisation,
  (SELECT COUNT(*) FROM developer_organisation_memberships m LEFT JOIN users u ON u.id = m.user_id WHERE u.id IS NULL) AS developer_memberships_missing_user,
  (SELECT COUNT(*) FROM developer_organisations o WHERE NOT EXISTS (SELECT 1 FROM developer_organisation_memberships m WHERE m.organisation_id = o.id AND m.role = 'owner' AND m.status = 'active')) AS developer_organisations_without_active_owner,
  (SELECT COUNT(*) FROM catalogue_publishers) AS catalogue_publishers_total,
  (SELECT COUNT(*) FROM catalogue_publishers WHERE authority_kind = 'platform_reference') AS catalogue_publishers_platform_reference,
  (SELECT COUNT(*) FROM catalogue_publishers WHERE authority_kind = 'developer_first_party') AS catalogue_publishers_developer_first_party,
  (SELECT COUNT(*) FROM catalogue_publishers p LEFT JOIN developer_organisations o ON o.id = p.developer_organisation_id WHERE (p.authority_kind = 'developer_first_party' AND (p.developer_organisation_id IS NULL OR o.id IS NULL)) OR (p.authority_kind = 'platform_reference' AND p.developer_organisation_id IS NOT NULL)) AS catalogue_publishers_authority_relationship_mismatch,
  (SELECT COUNT(*) FROM developments) AS developments_total,
  (SELECT COUNT(*) FROM developments WHERE isPublished = 1) AS developments_published,
  (SELECT COUNT(*) FROM developments d LEFT JOIN catalogue_publishers p ON p.id = d.catalogue_publisher_id WHERE d.isPublished = 1 AND (d.catalogue_publisher_id IS NULL OR p.id IS NULL)) AS developments_published_without_publisher,
  (SELECT COUNT(*) FROM development_units) AS development_units_total,
  (SELECT COUNT(*) FROM development_units u LEFT JOIN developments d ON d.id = u.development_id WHERE d.id IS NULL) AS development_units_missing_development,
  (SELECT COUNT(*) FROM development_drafts) AS development_drafts_total,
  (SELECT COUNT(*) FROM development_drafts WHERE developer_organisation_id IS NULL) AS development_drafts_without_canonical_organisation,
  (SELECT COUNT(*) FROM development_drafts d LEFT JOIN catalogue_publishers p ON p.id = d.catalogue_publisher_id WHERE d.catalogue_publisher_id IS NOT NULL AND p.id IS NULL) AS development_drafts_missing_publisher,
  (SELECT COUNT(*) FROM listings) AS listings_total,
  (SELECT COUNT(*) FROM listings WHERE status = 'published') AS listings_published,
  (SELECT COUNT(*) FROM listings l LEFT JOIN users u ON u.id = l.ownerId WHERE u.id IS NULL) AS listings_missing_owner,
  (SELECT COUNT(*) FROM listings l LEFT JOIN agents a ON a.id = l.agentId WHERE l.agentId IS NOT NULL AND a.id IS NULL) AS listings_missing_agent,
  (SELECT COUNT(*) FROM listings l LEFT JOIN agencies a ON a.id = l.agencyId WHERE l.agencyId IS NOT NULL AND a.id IS NULL) AS listings_missing_agency,
  (SELECT COUNT(*) FROM listings l JOIN users u ON u.id = l.ownerId WHERE l.agencyId IS NOT NULL AND u.agencyId IS NOT NULL AND l.agencyId <> u.agencyId) AS listings_owner_agency_mismatch,
  (SELECT COUNT(*) FROM properties) AS properties_total,
  (SELECT COUNT(*) FROM properties WHERE status = 'published') AS properties_published,
  (SELECT COUNT(*) FROM properties p LEFT JOIN users u ON u.id = p.ownerId WHERE u.id IS NULL) AS properties_missing_owner,
  (SELECT COUNT(*) FROM properties p LEFT JOIN listings l ON l.id = p.sourceListingId WHERE p.sourceListingId IS NOT NULL AND l.id IS NULL) AS properties_missing_source_listing,
  (SELECT COUNT(*) FROM properties p LEFT JOIN developments d ON d.id = p.developmentId WHERE p.developmentId IS NOT NULL AND d.id IS NULL) AS properties_missing_development,
  (SELECT COUNT(*) FROM properties p WHERE p.status = 'published' AND p.mainImage IS NULL AND NOT EXISTS (SELECT 1 FROM propertyImages i WHERE i.propertyId = p.id)) AS published_properties_without_image_pointer,
  (SELECT COUNT(*) FROM propertyImages) AS property_images_total,
  (SELECT COUNT(*) FROM propertyImages i LEFT JOIN properties p ON p.id = i.propertyId WHERE p.id IS NULL) AS property_images_missing_property,
  (SELECT COUNT(*) FROM videos) AS videos_total,
  (SELECT COUNT(*) FROM videos WHERE status = 'ready') AS videos_ready,
  (SELECT COUNT(*) FROM videos v LEFT JOIN users u ON u.id = v.userId LEFT JOIN listings l ON l.id = v.listingId LEFT JOIN developments d ON d.id = v.developmentId LEFT JOIN agencies a ON a.id = v.agencyId WHERE (v.userId IS NOT NULL AND u.id IS NULL) OR (v.listingId IS NOT NULL AND l.id IS NULL) OR (v.developmentId IS NOT NULL AND d.id IS NULL) OR (v.agencyId IS NOT NULL AND a.id IS NULL)) AS videos_missing_owner_relationship,
  (SELECT COUNT(*) FROM videos WHERE userId IS NULL AND listingId IS NULL AND developmentId IS NULL AND agencyId IS NULL) AS videos_without_owner,
  (SELECT COUNT(*) FROM leads) AS leads_total,
  (SELECT COUNT(*) FROM leads l LEFT JOIN listings p ON p.id = l.listing_id WHERE l.listing_id IS NOT NULL AND p.id IS NULL) AS leads_missing_listing,
  (SELECT COUNT(*) FROM leads l LEFT JOIN properties p ON p.id = l.propertyId WHERE l.propertyId IS NOT NULL AND p.id IS NULL) AS leads_missing_property,
  (SELECT COUNT(*) FROM leads l LEFT JOIN developments d ON d.id = l.developmentId WHERE l.developmentId IS NOT NULL AND d.id IS NULL) AS leads_missing_development,
  (SELECT COUNT(*) FROM leads l LEFT JOIN agencies a ON a.id = l.agencyId WHERE l.agencyId IS NOT NULL AND a.id IS NULL) AS leads_missing_agency,
  (SELECT COUNT(*) FROM leads l LEFT JOIN agents a ON a.id = l.agentId WHERE l.agentId IS NOT NULL AND a.id IS NULL) AS leads_missing_agent,
  (SELECT COUNT(*) FROM leads l LEFT JOIN users u ON u.id = l.assigned_to WHERE l.assigned_to IS NOT NULL AND u.id IS NULL) AS leads_missing_assignee,
  (SELECT COUNT(*) FROM leads l JOIN users u ON u.id = l.assigned_to WHERE l.agencyId IS NOT NULL AND u.agencyId IS NOT NULL AND l.agencyId <> u.agencyId) AS leads_assigned_across_agency,
  (SELECT COUNT(*) FROM lead_activities) AS lead_activities_total,
  (SELECT COUNT(*) FROM lead_activities a LEFT JOIN leads l ON l.id = a.leadId WHERE l.id IS NULL) AS lead_activities_missing_lead,
  (SELECT COUNT(*) FROM lead_activities a LEFT JOIN users u ON u.id = a.userId WHERE a.userId IS NOT NULL AND u.id IS NULL) AS lead_activities_missing_user,
  (SELECT COUNT(*) FROM prospect_identities) AS prospect_identities_total,
  (SELECT COUNT(*) FROM prospect_identities p LEFT JOIN users u ON u.id = p.user_id WHERE p.user_id IS NOT NULL AND u.id IS NULL) AS prospect_identities_missing_user,
  (SELECT COUNT(*) FROM billable_accounts) AS billable_accounts_total,
  (SELECT COUNT(*) FROM billable_accounts b LEFT JOIN users u ON u.id = b.user_id LEFT JOIN agencies a ON a.id = b.agency_id LEFT JOIN developer_organisations o ON o.id = b.developer_organisation_id WHERE (b.account_kind = 'agent' AND (b.user_id IS NULL OR u.id IS NULL OR b.agency_id IS NOT NULL OR b.developer_organisation_id IS NOT NULL)) OR (b.account_kind = 'agency' AND (b.agency_id IS NULL OR a.id IS NULL OR b.user_id IS NOT NULL OR b.developer_organisation_id IS NOT NULL)) OR (b.account_kind = 'developer' AND (b.developer_organisation_id IS NULL OR o.id IS NULL OR b.user_id IS NOT NULL OR b.agency_id IS NOT NULL))) AS billable_accounts_owner_shape_or_reference_issue,
  (SELECT COUNT(*) FROM subscriptions) AS subscriptions_total,
  (SELECT COUNT(*) FROM subscriptions s LEFT JOIN billable_accounts b ON b.id = s.billable_account_id WHERE b.id IS NULL OR s.owner_type <> b.account_kind OR (s.owner_type = 'agent' AND s.owner_id <> b.user_id) OR (s.owner_type = 'agency' AND s.owner_id <> b.agency_id) OR (s.owner_type = 'developer' AND s.owner_id <> b.developer_organisation_id)) AS subscriptions_owner_relationship_issue,
  (SELECT COUNT(*) FROM billing_invoices) AS billing_invoices_total,
  (SELECT COUNT(*) FROM billing_invoices i LEFT JOIN billable_accounts b ON b.id = i.billable_account_id LEFT JOIN subscriptions s ON s.id = i.subscription_id WHERE b.id IS NULL OR (i.subscription_id IS NOT NULL AND s.id IS NULL)) AS billing_invoices_missing_account_or_subscription,
  (SELECT COUNT(*) FROM billing_invoices i LEFT JOIN billable_accounts b ON b.id = i.billable_account_id LEFT JOIN subscriptions s ON s.id = i.subscription_id WHERE b.id IS NULL OR i.owner_type <> b.account_kind OR (i.owner_type = 'agent' AND (b.user_id IS NULL OR i.owner_id <> b.user_id)) OR (i.owner_type = 'agency' AND (b.agency_id IS NULL OR i.owner_id <> b.agency_id)) OR (i.owner_type = 'developer' AND (b.developer_organisation_id IS NULL OR i.owner_id <> b.developer_organisation_id)) OR i.owner_type NOT IN ('agent', 'agency', 'developer') OR (i.subscription_id IS NOT NULL AND (s.id IS NULL OR s.billable_account_id <> i.billable_account_id OR s.owner_type <> i.owner_type OR s.owner_id <> i.owner_id))) AS billing_invoices_owner_relationship_issue,
  (SELECT COUNT(*) FROM billing_payments) AS billing_payments_total,
  (SELECT COUNT(*) FROM billing_payments p LEFT JOIN billing_invoices i ON i.id = p.invoice_id LEFT JOIN billable_accounts b ON b.id = p.billable_account_id LEFT JOIN subscriptions s ON s.id = p.subscription_id WHERE i.id IS NULL OR b.id IS NULL OR p.billable_account_id <> i.billable_account_id OR p.owner_type <> b.account_kind OR (p.owner_type = 'agent' AND (b.user_id IS NULL OR p.owner_id <> b.user_id)) OR (p.owner_type = 'agency' AND (b.agency_id IS NULL OR p.owner_id <> b.agency_id)) OR (p.owner_type = 'developer' AND (b.developer_organisation_id IS NULL OR p.owner_id <> b.developer_organisation_id)) OR p.owner_type NOT IN ('agent', 'agency', 'developer') OR p.owner_type <> i.owner_type OR p.owner_id <> i.owner_id OR NOT (p.subscription_id <=> i.subscription_id) OR (p.subscription_id IS NOT NULL AND (s.id IS NULL OR s.billable_account_id <> p.billable_account_id OR s.owner_type <> p.owner_type OR s.owner_id <> p.owner_id))) AS billing_payments_owner_relationship_issue,
  (SELECT COUNT(*) FROM billing_payment_documents) AS billing_payment_documents_total,
  (SELECT COUNT(*) FROM billing_payment_documents d LEFT JOIN billing_payments p ON p.id = d.payment_id LEFT JOIN billing_invoices i ON i.id = d.invoice_id LEFT JOIN billable_accounts b ON b.id = d.billable_account_id WHERE p.id IS NULL OR i.id IS NULL OR b.id IS NULL OR d.owner_type <> b.account_kind OR (d.owner_type = 'agent' AND (b.user_id IS NULL OR d.owner_id <> b.user_id)) OR (d.owner_type = 'agency' AND (b.agency_id IS NULL OR d.owner_id <> b.agency_id)) OR (d.owner_type = 'developer' AND (b.developer_organisation_id IS NULL OR d.owner_id <> b.developer_organisation_id)) OR d.owner_type NOT IN ('agent', 'agency', 'developer') OR d.owner_type <> p.owner_type OR d.owner_id <> p.owner_id OR d.owner_type <> i.owner_type OR d.owner_id <> i.owner_id OR p.invoice_id <> d.invoice_id OR p.billable_account_id <> d.billable_account_id OR i.billable_account_id <> d.billable_account_id) AS billing_payment_documents_owner_relationship_issue,
  (SELECT COUNT(*) FROM billing_payment_documents WHERE visibility <> 'private') AS billing_payment_documents_not_private,
  (SELECT COUNT(*) FROM billing_audit_events) AS billing_audit_events_total,
  (SELECT COUNT(*) FROM billing_audit_events e LEFT JOIN billable_accounts b ON b.id = e.billable_account_id WHERE b.id IS NULL) AS billing_audit_events_missing_account,
  (SELECT COUNT(*) FROM billing_audit_events e LEFT JOIN billable_accounts b ON b.id = e.billable_account_id LEFT JOIN subscriptions s ON s.id = e.subscription_id LEFT JOIN billing_invoices i ON i.id = e.invoice_id LEFT JOIN billing_payments p ON p.id = e.payment_id WHERE b.id IS NULL OR e.owner_type <> b.account_kind OR (e.owner_type = 'agent' AND (b.user_id IS NULL OR e.owner_id <> b.user_id)) OR (e.owner_type = 'agency' AND (b.agency_id IS NULL OR e.owner_id <> b.agency_id)) OR (e.owner_type = 'developer' AND (b.developer_organisation_id IS NULL OR e.owner_id <> b.developer_organisation_id)) OR e.owner_type NOT IN ('agent', 'agency', 'developer') OR (e.subscription_id IS NOT NULL AND (s.id IS NULL OR s.billable_account_id <> e.billable_account_id OR s.owner_type <> e.owner_type OR s.owner_id <> e.owner_id)) OR (e.invoice_id IS NOT NULL AND (i.id IS NULL OR i.billable_account_id <> e.billable_account_id OR i.owner_type <> e.owner_type OR i.owner_id <> e.owner_id)) OR (e.payment_id IS NOT NULL AND (p.id IS NULL OR p.billable_account_id <> e.billable_account_id OR p.owner_type <> e.owner_type OR p.owner_id <> e.owner_id OR (e.invoice_id IS NOT NULL AND p.invoice_id <> e.invoice_id)))) AS billing_audit_events_owner_relationship_issue,
  (SELECT COUNT(*) FROM audit_logs) AS audit_logs_total,
  (SELECT COUNT(*) FROM audit_logs e LEFT JOIN users u ON u.id = e.userId WHERE u.id IS NULL) AS audit_logs_missing_user,
  (SELECT COUNT(*) FROM managerial_audit_logs) AS managerial_audit_logs_total,
  (SELECT COUNT(*) FROM managerial_audit_logs e LEFT JOIN users u ON u.id = e.actor_user_id WHERE u.id IS NULL) AS managerial_audit_logs_missing_actor`;

export const B09_CENSUS_METRICS = [
  'users_total',
  'users_super_admin',
  'users_agent',
  'users_agency_admin',
  'users_developer',
  'users_missing_agency',
  'agencies_total',
  'agents_total',
  'agents_missing_user',
  'agents_missing_agency',
  'developer_organisations_total',
  'developer_organisations_pending',
  'developer_organisations_approved',
  'developer_memberships_total',
  'developer_memberships_missing_organisation',
  'developer_memberships_missing_user',
  'developer_organisations_without_active_owner',
  'catalogue_publishers_total',
  'catalogue_publishers_platform_reference',
  'catalogue_publishers_developer_first_party',
  'catalogue_publishers_authority_relationship_mismatch',
  'developments_total',
  'developments_published',
  'developments_published_without_publisher',
  'development_units_total',
  'development_units_missing_development',
  'development_drafts_total',
  'development_drafts_without_canonical_organisation',
  'development_drafts_missing_publisher',
  'listings_total',
  'listings_published',
  'listings_missing_owner',
  'listings_missing_agent',
  'listings_missing_agency',
  'listings_owner_agency_mismatch',
  'properties_total',
  'properties_published',
  'properties_missing_owner',
  'properties_missing_source_listing',
  'properties_missing_development',
  'published_properties_without_image_pointer',
  'property_images_total',
  'property_images_missing_property',
  'videos_total',
  'videos_ready',
  'videos_missing_owner_relationship',
  'videos_without_owner',
  'leads_total',
  'leads_missing_listing',
  'leads_missing_property',
  'leads_missing_development',
  'leads_missing_agency',
  'leads_missing_agent',
  'leads_missing_assignee',
  'leads_assigned_across_agency',
  'lead_activities_total',
  'lead_activities_missing_lead',
  'lead_activities_missing_user',
  'prospect_identities_total',
  'prospect_identities_missing_user',
  'billable_accounts_total',
  'billable_accounts_owner_shape_or_reference_issue',
  'subscriptions_total',
  'subscriptions_owner_relationship_issue',
  'billing_invoices_total',
  'billing_invoices_missing_account_or_subscription',
  'billing_invoices_owner_relationship_issue',
  'billing_payments_total',
  'billing_payments_owner_relationship_issue',
  'billing_payment_documents_total',
  'billing_payment_documents_owner_relationship_issue',
  'billing_payment_documents_not_private',
  'billing_audit_events_total',
  'billing_audit_events_missing_account',
  'billing_audit_events_owner_relationship_issue',
  'audit_logs_total',
  'audit_logs_missing_user',
  'managerial_audit_logs_total',
  'managerial_audit_logs_missing_actor',
] as const;

export const B09_BILLING_RELATIONSHIP_METRICS = [
  'billing_invoices_owner_relationship_issue',
  'billing_payments_owner_relationship_issue',
  'billing_payment_documents_owner_relationship_issue',
  'billing_audit_events_owner_relationship_issue',
] as const satisfies readonly B09CensusMetric[];

export function assertB09BillingRelationshipAnomalyDeltas(
  before: Pick<Record<B09CensusMetric, string>, (typeof B09_BILLING_RELATIONSHIP_METRICS)[number]>,
  after: Pick<Record<B09CensusMetric, string>, (typeof B09_BILLING_RELATIONSHIP_METRICS)[number]>,
): Record<(typeof B09_BILLING_RELATIONSHIP_METRICS)[number], string> {
  const deltas = {} as Record<(typeof B09_BILLING_RELATIONSHIP_METRICS)[number], string>;
  for (const metric of B09_BILLING_RELATIONSHIP_METRICS) {
    const delta = BigInt(after[metric]) - BigInt(before[metric]);
    if (delta < BigInt(1)) {
      throw new Error(
        `B09 billing verification failed: synthetic cross-account relationship did not increase ${metric}.`,
      );
    }
    deltas[metric] = delta.toString();
  }
  return deltas;
}

export type B09CensusMetric = (typeof B09_CENSUS_METRICS)[number];
export type B09CensusAuthorization = {
  authorizationVersion: 2;
  operation: typeof B09_CENSUS_OPERATION;
  approvalReference: string;
  approvedBy: string;
  targetFingerprintHash: string;
  targetClass: string;
  credentialClass: string;
  scopeId: string;
  schemaMappingId: string;
  expectedMigrationHead: string;
  migrationManifestDigest: string;
  readTables: readonly string[];
  readMetadata: readonly string[];
  querySha256: string;
  codeSha256: string;
  issuedAt: string;
  expiresAt: string;
  maxExecutionMs: number;
  maxResultRows: number;
  maxMigrationRows: number;
  maxMetadataRowsPerQuery: number;
  maxControlCommandMs: number;
  maxCancellationCleanupMs: number;
  maxRollbackCleanupMs: number;
};

const CODE_HASH_PATHS = [
  'docs/database-authority/authority-manifest.json',
  'docs/database-authority/connection-path-inventory.json',
  'docs/database-authority/operation-policy.json',
  'package.json',
  'pnpm-lock.yaml',
  'scripts/databaseAuthorityCli.ts',
  'scripts/databaseAuthorityStatus.ts',
  'server/_core/databaseAuthority/authorization.ts',
  'server/_core/databaseAuthority/b09BillingSyntheticVerification.ts',
  'server/_core/databaseAuthority/b09Census.ts',
  'server/_core/databaseAuthority/connectionAuthority.ts',
  'server/_core/databaseAuthority/context.ts',
  'server/_core/databaseAuthority/credentialVault.ts',
  'server/_core/databaseAuthority/environment.ts',
  'server/_core/databaseAuthority/isolatedCiCredentials.ts',
  'server/_core/databaseAuthority/localServicePaths.ts',
  'server/_core/databaseAuthority/schemaCongruency.ts',
  'server/_core/databaseAuthority/types.ts',
  'server/_core/databaseAuthority/worktreeIdentity.ts',
  'server/_core/databaseAuthority/worktreeProfile.ts',
  'server/_core/databaseAuthority/tidbCheckConstraintCapability.ts',
  'server/_core/databaseTls.ts',
  'server/migrations/migrationManifest.ts',
  'server/migrations/runSqlMigrations.ts',
  'drizzle/schema/index.ts',
  'drizzle/schema/core.ts',
  'drizzle/schema/transactionalEmail.ts',
  'drizzle/schema/agencies.ts',
  'drizzle/schema/locations.ts',
  'drizzle/schema/googlePlacesMonitoring.ts',
  'drizzle/schema/billing.ts',
  'drizzle/schema/partners.ts',
  'drizzle/schema/listings.ts',
  'drizzle/schema/developments.ts',
  'drizzle/schema/developerIdentity.ts',
  'drizzle/schema/media.ts',
  'drizzle/schema/explore.ts',
  'drizzle/schema/marketplace.ts',
  'drizzle/schema/distribution.ts',
  'drizzle/schema/analytics.ts',
  'drizzle/schema/leads.ts',
  'drizzle/schema/agencyDeals.ts',
  'drizzle/schema/servicesEngine.ts',
  'drizzle/schema/demand.ts',
  'drizzle/schema/referrals.ts',
  'drizzle/schema/canvassing.ts',
  'drizzle/schema/listingPerformance.ts',
  'drizzle/schema/land.ts',
  'drizzle/schema/commercial.ts',
  'drizzle/schema/sharedLiving.ts',
];

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

export function b09CensusQuerySha256(): string {
  return sha256(
    JSON.stringify({
      scopeId: B09_CENSUS_SCOPE_ID,
      schemaMappingId: B09_CENSUS_SCHEMA_MAPPING_ID,
      expectedMigrationHead: B09_CENSUS_EXPECTED_HEAD,
      readTables: B09_CENSUS_READ_TABLES,
      readMetadata: B09_CENSUS_READ_METADATA,
      migrationHistoryQuery: B09_MIGRATION_HISTORY_QUERY,
      incompleteAttemptsQuery: B09_INCOMPLETE_ATTEMPTS_QUERY,
      query: B09_CENSUS_QUERY,
      timeoutProbeQuery: B09_CENSUS_TIMEOUT_PROBE_QUERY,
      activeSessionQuery: B09_CENSUS_ACTIVE_SESSION_QUERY,
      maxMigrationRows: B09_CENSUS_MAX_MIGRATION_ROWS,
      maxMetadataRowsPerQuery: B09_CENSUS_MAX_METADATA_ROWS_PER_QUERY,
      maxControlCommandMs: B09_CENSUS_CONTROL_TIMEOUT_MS,
      maxCancellationCleanupMs: B09_CENSUS_CANCELLATION_CLEANUP_MS,
      maxRollbackCleanupMs: B09_CENSUS_ROLLBACK_TIMEOUT_MS,
    }),
  );
}

export function b09CensusCodeSha256(root = process.cwd()): string {
  const digest = createHash('sha256');
  for (const relativePath of CODE_HASH_PATHS) {
    const content = readFileSync(resolve(root, relativePath));
    digest.update(relativePath).update('\0').update(content).update('\0');
  }
  return digest.digest('hex');
}

export type B09CensusExpectedContext = Pick<
  ResolvedDatabaseAuthority['context'],
  'operation' | 'targetFingerprintHash' | 'targetClass' | 'credentialClass'
>;

export function buildB09CensusAuthorizationTemplate(input: {
  context: B09CensusExpectedContext;
  migrationManifestDigest: string;
  root?: string;
}): B09CensusAuthorization {
  return {
    authorizationVersion: 2,
    operation: B09_CENSUS_OPERATION,
    approvalReference: '',
    approvedBy: '',
    targetFingerprintHash: input.context.targetFingerprintHash,
    targetClass: input.context.targetClass,
    credentialClass: input.context.credentialClass,
    scopeId: B09_CENSUS_SCOPE_ID,
    schemaMappingId: B09_CENSUS_SCHEMA_MAPPING_ID,
    expectedMigrationHead: B09_CENSUS_EXPECTED_HEAD,
    migrationManifestDigest: input.migrationManifestDigest,
    readTables: [...B09_CENSUS_READ_TABLES],
    readMetadata: [...B09_CENSUS_READ_METADATA],
    querySha256: b09CensusQuerySha256(),
    codeSha256: b09CensusCodeSha256(input.root),
    issuedAt: '',
    expiresAt: '',
    maxExecutionMs: B09_CENSUS_MAX_EXECUTION_MS,
    maxResultRows: B09_CENSUS_RESULT_ROW_LIMIT,
    maxMigrationRows: B09_CENSUS_MAX_MIGRATION_ROWS,
    maxMetadataRowsPerQuery: B09_CENSUS_MAX_METADATA_ROWS_PER_QUERY,
    maxControlCommandMs: B09_CENSUS_CONTROL_TIMEOUT_MS,
    maxCancellationCleanupMs: B09_CENSUS_CANCELLATION_CLEANUP_MS,
    maxRollbackCleanupMs: B09_CENSUS_ROLLBACK_TIMEOUT_MS,
  };
}

function assertExactKeys(value: Record<string, unknown>, allowed: readonly string[]): void {
  const keys = Object.keys(value).sort();
  const expected = [...allowed].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new Error('B09 authorization refused: document fields do not match the approved schema.');
  }
}

const AUTHORIZATION_KEYS = [
  'authorizationVersion',
  'operation',
  'approvalReference',
  'approvedBy',
  'targetFingerprintHash',
  'targetClass',
  'credentialClass',
  'scopeId',
  'schemaMappingId',
  'expectedMigrationHead',
  'migrationManifestDigest',
  'readTables',
  'readMetadata',
  'querySha256',
  'codeSha256',
  'issuedAt',
  'expiresAt',
  'maxExecutionMs',
  'maxResultRows',
  'maxMigrationRows',
  'maxMetadataRowsPerQuery',
  'maxControlCommandMs',
  'maxCancellationCleanupMs',
  'maxRollbackCleanupMs',
] as const;

export function validateB09CensusAuthorization(
  input: unknown,
  expected: {
    context: B09CensusExpectedContext;
    migrationManifestDigest: string;
    root?: string;
    now?: Date;
  },
): B09CensusAuthorization {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('B09 authorization refused: document must be a JSON object.');
  }
  const candidate = input as Record<string, unknown>;
  assertExactKeys(candidate, AUTHORIZATION_KEYS);
  const template = buildB09CensusAuthorizationTemplate({
    context: expected.context,
    migrationManifestDigest: expected.migrationManifestDigest,
    root: expected.root,
  });
  const exactValues: Record<string, unknown> = {
    authorizationVersion: 2,
    operation: B09_CENSUS_OPERATION,
    targetFingerprintHash: expected.context.targetFingerprintHash,
    targetClass: expected.context.targetClass,
    credentialClass: expected.context.credentialClass,
    scopeId: B09_CENSUS_SCOPE_ID,
    schemaMappingId: B09_CENSUS_SCHEMA_MAPPING_ID,
    expectedMigrationHead: B09_CENSUS_EXPECTED_HEAD,
    migrationManifestDigest: expected.migrationManifestDigest,
    readTables: [...B09_CENSUS_READ_TABLES],
    readMetadata: [...B09_CENSUS_READ_METADATA],
    querySha256: template.querySha256,
    codeSha256: template.codeSha256,
    maxExecutionMs: B09_CENSUS_MAX_EXECUTION_MS,
    maxResultRows: B09_CENSUS_RESULT_ROW_LIMIT,
    maxMigrationRows: B09_CENSUS_MAX_MIGRATION_ROWS,
    maxMetadataRowsPerQuery: B09_CENSUS_MAX_METADATA_ROWS_PER_QUERY,
    maxControlCommandMs: B09_CENSUS_CONTROL_TIMEOUT_MS,
    maxCancellationCleanupMs: B09_CENSUS_CANCELLATION_CLEANUP_MS,
    maxRollbackCleanupMs: B09_CENSUS_ROLLBACK_TIMEOUT_MS,
  };
  for (const [key, value] of Object.entries(exactValues)) {
    if (JSON.stringify(candidate[key]) !== JSON.stringify(value)) {
      throw new Error(`B09 authorization refused: ${key} does not match the current exact scope.`);
    }
  }
  if (
    expected.context.operation !== B09_CENSUS_OPERATION ||
    expected.context.targetClass !== 'disposable-worktree' ||
    !/^[a-f0-9]{64}$/.test(expected.context.targetFingerprintHash)
  ) {
    throw new Error(
      'B09 authorization refused: only an exact disposable-worktree target is supported.',
    );
  }
  for (const key of ['approvalReference', 'approvedBy'] as const) {
    const value = candidate[key];
    if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9 ._:/#-]{2,119}$/.test(value)) {
      throw new Error(
        'B09 authorization refused: an approval reference and approving actor are required.',
      );
    }
  }
  const issuedAt = typeof candidate.issuedAt === 'string' ? Date.parse(candidate.issuedAt) : NaN;
  const expiresAt = typeof candidate.expiresAt === 'string' ? Date.parse(candidate.expiresAt) : NaN;
  const now = (expected.now ?? new Date()).getTime();
  if (
    !Number.isFinite(issuedAt) ||
    !Number.isFinite(expiresAt) ||
    issuedAt > now + 60_000 ||
    now >= expiresAt ||
    expiresAt <= issuedAt ||
    expiresAt - issuedAt > 60 * 60 * 1000
  ) {
    throw new Error('B09 authorization refused: authorization time window is invalid or expired.');
  }
  return candidate as unknown as B09CensusAuthorization;
}

function resultRows(result: unknown): unknown[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0];
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: unknown[] }).rows;
  }
  throw new Error('B09 census refused: database result shape is unsupported.');
}

function countString(value: unknown): string {
  if (typeof value === 'bigint') {
    const decimal = value.toString(10);
    if (!/^(0|[1-9][0-9]*)$/.test(decimal)) {
      throw new Error('B09 census refused: aggregate count is invalid.');
    }
    return decimal;
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error('B09 census refused: aggregate count is invalid.');
    }
    return String(value);
  }
  if (typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value)) return value;
  throw new Error('B09 census refused: aggregate count is invalid.');
}

export function sanitizeB09AggregateResult(result: unknown): Record<B09CensusMetric, string> {
  const rows = resultRows(result);
  if (rows.length !== B09_CENSUS_RESULT_ROW_LIMIT) {
    throw new Error('B09 census refused: aggregate result row limit was exceeded.');
  }
  const row = rows[0];
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error('B09 census refused: aggregate result shape is unsupported.');
  }
  const record = row as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const expectedKeys = [...B09_CENSUS_METRICS].sort();
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new Error('B09 census refused: aggregate result fields are outside the approved report.');
  }
  const safe = {} as Record<B09CensusMetric, string>;
  for (const metric of B09_CENSUS_METRICS) safe[metric] = countString(record[metric]);
  return safe;
}

export function readB09AuthorizationFile(path: string): unknown {
  try {
    const info = lstatSync(path);
    if (!info.isFile() || info.isSymbolicLink() || info.size > 32 * 1024) {
      throw new Error();
    }
    return JSON.parse(readFileSync(path, 'utf8')) as unknown;
  } catch {
    throw new Error('B09 authorization refused: authorization file is missing or invalid.');
  }
}

function extractRows(result: unknown): unknown[] {
  return resultRows(result);
}

function rowField(row: Record<string, unknown>, key: string): unknown {
  return row[key] ?? row[key.toUpperCase()] ?? row[key.toLowerCase()];
}

export function assertB09MigrationLedger(
  result: unknown,
  manifest: ValidatedMigrationManifest,
  targetFingerprintHash: string,
): void {
  const rows = extractRows(result);
  if (
    rows.length === 0 ||
    rows.length > B09_CENSUS_MAX_MIGRATION_ROWS ||
    rows.length !== manifest.orderedMigrations.length ||
    manifest.document.expectedHead !== B09_CENSUS_EXPECTED_HEAD
  ) {
    throw new Error(
      'B09 schema mapping refused: migration ledger is not the exact approved prefix.',
    );
  }
  const applied: AppliedMigration[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const expected = manifest.orderedMigrations[index];
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error('B09 schema mapping refused: migration ledger row shape is unsupported.');
    }
    const numericVersion = Number(rowField(row as Record<string, unknown>, 'numeric_version'));
    const filename = rowField(row as Record<string, unknown>, 'filename');
    const checksum = rowField(row as Record<string, unknown>, 'checksum');
    if (
      numericVersion !== expected.sequence ||
      filename !== expected.filename ||
      checksum !== expected.checksum
    ) {
      throw new Error('B09 schema mapping refused: migration ledger identity or checksum differs.');
    }
    applied.push({ fileName: expected.filename, checksum: expected.checksum });
  }
  try {
    const plan = buildMigrationPlan({
      manifest,
      targetFingerprintHash,
      applied,
      incompleteAttempts: [],
      applicationTableCount: 0,
      expectedNewHead: B09_CENSUS_EXPECTED_HEAD,
    });
    if (plan.pending.length !== 0 || plan.expectedNewHead !== B09_CENSUS_EXPECTED_HEAD) {
      throw new Error();
    }
  } catch {
    throw new Error('B09 schema mapping refused: migration lineage is incomplete or invalid.');
  }
}

function metadataResultRows(result: unknown): unknown[] {
  const rows = extractRows(result);
  if (rows.length > B09_CENSUS_MAX_METADATA_ROWS_PER_QUERY) {
    throw new Error('B09 schema mapping refused: physical metadata row bound was exceeded.');
  }
  return rows;
}

async function verifyB09PhysicalMapping(input: {
  connection: AuthoritySqlConnection;
  queryBounded: NonNullable<AuthoritySqlConnection['queryBounded']>;
  remaining: () => number;
  provider: ResolvedDatabaseAuthority['context']['provider'];
}): Promise<void> {
  if (input.provider !== 'mysql') {
    throw new Error('B09 schema mapping refused: only the canonical MySQL provider is supported.');
  }
  const metadataConnection: AuthoritySqlConnection = {
    execute: async (statement, values) => {
      const result = await input.queryBounded(statement, input.remaining(), values);
      metadataResultRows(result);
      return result;
    },
    query: input.connection.query,
    end: input.connection.end,
  };
  const desired = normalizedDesiredSchema(canonicalSchema, B09_CENSUS_DATA_TABLES);
  const actual = await normalizedPhysicalSchema(
    metadataConnection,
    'mysql',
    desired,
    B09_CENSUS_DATA_TABLES,
  );
  if (!compareNormalizedSchemas(desired, actual).congruent) {
    throw new Error(
      'B09 schema mapping refused: physical tables do not match the canonical mapping.',
    );
  }
}

export async function runB09Census(input: {
  authority: ResolvedDatabaseAuthority;
  connection: AuthoritySqlConnection;
  authorization: B09CensusAuthorization;
  migrationManifest: ValidatedMigrationManifest;
  migrationManifestDigest: string;
  executedAt?: Date;
  monotonicNow?: () => number;
}): Promise<Record<string, unknown>> {
  const queryBounded = input.connection.queryBounded;
  if (!queryBounded)
    throw new Error('B09 census refused: bounded database query capability is unavailable.');
  const queryControlBounded = input.connection.queryControlBounded;
  if (!queryControlBounded)
    throw new Error('B09 census refused: bounded transaction-control capability is unavailable.');
  if (
    input.migrationManifest.manifestDigest !== input.migrationManifestDigest ||
    input.authorization.migrationManifestDigest !== input.migrationManifestDigest
  ) {
    throw new Error('B09 authorization refused: migration manifest digest changed after approval.');
  }
  const monotonicNow = input.monotonicNow ?? (() => performance.now());
  const started = monotonicNow();
  const remaining = () => {
    const timeLeft = Math.floor(input.authorization.maxExecutionMs - (monotonicNow() - started));
    if (timeLeft < 1)
      throw new Error('B09 census refused: authorized execution time limit was reached.');
    return Math.min(timeLeft, B09_CENSUS_MAX_EXECUTION_MS);
  };
  let transactionOpen = false;
  let phase = 'read-only-transaction';
  let failure: Error | null = null;
  let counts: Record<B09CensusMetric, string> | null = null;
  try {
    await queryControlBounded(
      'START TRANSACTION READ ONLY',
      Math.min(B09_CENSUS_CONTROL_TIMEOUT_MS, remaining()),
    );
    transactionOpen = true;
    phase = 'migration-ledger-integrity-check';
    assertB09MigrationLedger(
      await queryBounded(B09_MIGRATION_HISTORY_QUERY, remaining()),
      input.migrationManifest,
      input.authority.context.targetFingerprintHash,
    );
    phase = 'migration-attempt-check';
    const attemptResult = await queryBounded(B09_INCOMPLETE_ATTEMPTS_QUERY, remaining());
    const attemptRows = extractRows(attemptResult);
    if (attemptRows.length !== 1 || !attemptRows[0] || typeof attemptRows[0] !== 'object') {
      throw new Error('B09 schema mapping refused: migration-attempt result shape is unsupported.');
    }
    if (countString((attemptRows[0] as Record<string, unknown>).incomplete_attempts) !== '0') {
      throw new Error('B09 census refused: migration authority reports an incomplete attempt.');
    }
    phase = 'physical-schema-mapping-check';
    await verifyB09PhysicalMapping({
      connection: input.connection,
      queryBounded,
      remaining,
      provider: input.authority.context.provider,
    });
    phase = 'aggregate-count-query';
    const rawCensus = await queryBounded(B09_CENSUS_QUERY, remaining());
    counts = sanitizeB09AggregateResult(rawCensus);
    remaining();
    phase = 'read-only-commit';
    await queryControlBounded('COMMIT', Math.min(B09_CENSUS_CONTROL_TIMEOUT_MS, remaining()));
    transactionOpen = false;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.startsWith('B09 ') || error.message.startsWith('Database query refused:'))
    ) {
      failure = error;
    } else {
      const rawCode =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: unknown }).code ?? '')
          : '';
      const safeCode = /^[A-Z0-9_]{1,40}$/.test(rawCode) ? rawCode : 'DATABASE_ERROR';
      const rawMessage =
        error instanceof Error
          ? error.message
          : error && typeof error === 'object' && 'sqlMessage' in error
            ? String((error as { sqlMessage?: unknown }).sqlMessage ?? '')
            : '';
      const missingIdentifier = rawMessage.match(
        /Unknown column ['`]([A-Za-z0-9_.]+)['`] in /,
      )?.[1];
      const staticIdentifiers = new Set(B09_CENSUS_QUERY.match(/[A-Za-z][A-Za-z0-9_]*/g) ?? []);
      const identifierParts = missingIdentifier?.split('.') ?? [];
      const identifier = identifierParts[identifierParts.length - 1];
      const safeMappingDetail =
        identifier && staticIdentifiers.has(identifier)
          ? `; static query identifier ${missingIdentifier} is absent from the observed schema`
          : '';
      failure = new Error(
        `B09 census failed during ${phase} (${safeCode}${safeMappingDetail}); database details are suppressed; preserve the target and review authority status.`,
      );
    }
  }

  if (transactionOpen && !input.connection.isTerminated?.()) {
    try {
      await queryControlBounded('ROLLBACK', B09_CENSUS_ROLLBACK_TIMEOUT_MS);
      transactionOpen = false;
    } catch {
      input.connection.destroy?.();
      transactionOpen = false;
      failure = new Error(
        `${failure?.message ?? 'B09 census failed.'} Read-only rollback did not complete within ${B09_CENSUS_ROLLBACK_TIMEOUT_MS} ms; the connection was terminated. Preserve the disposable target and review Authority status.`,
      );
    }
  }

  if (failure) throw failure;
  if (!counts || transactionOpen) {
    input.connection.destroy?.();
    throw new Error('B09 census refused: result or transaction cleanup state is incomplete.');
  }
  return {
    reportVersion: 1,
    operation: B09_CENSUS_OPERATION,
    targetFingerprintHash: input.authority.context.targetFingerprintHash,
    targetClass: input.authority.context.targetClass,
    credentialClass: input.authority.context.credentialClass,
    scopeId: B09_CENSUS_SCOPE_ID,
    schemaMappingId: B09_CENSUS_SCHEMA_MAPPING_ID,
    migrationHead: B09_CENSUS_EXPECTED_HEAD,
    migrationManifestDigest: input.migrationManifestDigest,
    querySha256: b09CensusQuerySha256(),
    codeSha256: input.authorization.codeSha256,
    executedAt: (input.executedAt ?? new Date()).toISOString(),
    elapsedMs: Math.max(0, Math.round(monotonicNow() - started)),
    maximumExecutionMs: input.authorization.maxExecutionMs,
    rollbackCleanupLimitMs: B09_CENSUS_ROLLBACK_TIMEOUT_MS,
    maximumResultRows: B09_CENSUS_RESULT_ROW_LIMIT,
    resultRows: B09_CENSUS_RESULT_ROW_LIMIT,
    disclosure: {
      output: 'allow-listed aggregate counts only; no record identifiers or source values',
      media: 'database attachment relationships only; storage-object presence was not checked',
      providerAccess: 'not performed',
    },
    migrationLineageVerified: true,
    physicalMappingVerified: true,
    counts,
  };
}
