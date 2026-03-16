import { sql } from 'drizzle-orm';
import { getDb } from '../db-connection';

export type RuntimeSchemaCapabilities = {
  checkedAt: string;
  demandEngineReady: boolean;
  demandEngineDetails: {
    campaignsTable: boolean;
    leadsTable: boolean;
    assignmentsTable: boolean;
    matchesTable: boolean;
    unmatchedTable: boolean;
    campaignOwnerTypeColumn: boolean;
    campaignOwnerIdColumn: boolean;
    campaignNameColumn: boolean;
    campaignStatusColumn: boolean;
    campaignSourceChannelColumn: boolean;
    campaignDistributionModeColumn: boolean;
    campaignSharedRecipientCountColumn: boolean;
    campaignCreatedAtColumn: boolean;
    leadCampaignIdColumn: boolean;
    leadSourceChannelColumn: boolean;
    leadStatusColumn: boolean;
    leadBuyerNameColumn: boolean;
    leadBuyerEmailColumn: boolean;
    leadCriteriaColumn: boolean;
    leadMetadataColumn: boolean;
    leadCreatedAtColumn: boolean;
    assignmentLeadIdColumn: boolean;
    assignmentDemandLeadIdColumn: boolean;
    assignmentCampaignIdColumn: boolean;
    assignmentAssignedAgentIdColumn: boolean;
    matchLeadIdColumn: boolean;
    matchDemandLeadIdColumn: boolean;
    matchCampaignIdColumn: boolean;
    matchConfidenceColumn: boolean;
    assignmentAssignedAtColumn: boolean;
  };
  economicActorsReady: boolean;
  economicActorsDetails: {
    table: boolean;
    userIdColumn: boolean;
    actorTypeColumn: boolean;
    verificationStatusColumn: boolean;
    profileCompletenessColumn: boolean;
    trustScoreColumn: boolean;
    subscriptionTierColumn: boolean;
    momentumScoreColumn: boolean;
  };
  showingsReady: boolean;
  showingsDetails: {
    table: boolean;
    listingIdColumn: boolean;
    agentIdColumn: boolean;
    scheduledTimeColumn: boolean;
    statusColumn: boolean;
  };
};

export type DistributionSchemaOperation =
  | 'distribution.admin.listDevelopmentCatalog'
  | 'distribution.admin.listDevelopmentAccess'
  | 'distribution.admin.listPrograms'
  | 'distribution.admin.listTeamRegistrations'
  | 'distribution.admin.createManagerInvite'
  | 'distribution.admin.getBrandPartnership'
  | 'distribution.admin.getDevelopmentAccess'
  | 'distribution.admin.upsertBrandPartnership'
  | 'distribution.admin.upsertDevelopmentAccess';

export type DistributionSchemaRequirement = {
  tableName: string;
  columnName?: string;
};

export type DistributionSchemaOperationStatus = {
  ready: boolean;
  missingItems: string[];
  requiredItems: string[];
};

export type DistributionSchemaReadinessSnapshot = {
  checkedAt: string;
  ready: boolean;
  missingItems: string[];
  operations: Record<DistributionSchemaOperation, DistributionSchemaOperationStatus>;
};

const CAP_CACHE_TTL_MS = 60_000;
let cachedCapabilities: { value: RuntimeSchemaCapabilities; expiresAt: number } | null = null;
let cachedDistributionSchemaSnapshot: {
  value: DistributionSchemaReadinessSnapshot;
  expiresAt: number;
} | null = null;
const warnedKeys = new Set<string>();

export const DISTRIBUTION_SCHEMA_REQUIREMENTS: Record<
  DistributionSchemaOperation,
  DistributionSchemaRequirement[]
> = {
  'distribution.admin.listDevelopmentCatalog': [
    { tableName: 'developments' },
    { tableName: 'developments', columnName: 'id' },
    { tableName: 'developments', columnName: 'name' },
    { tableName: 'developments', columnName: 'developer_brand_profile_id' },
    { tableName: 'developments', columnName: 'marketing_brand_profile_id' },
    { tableName: 'developments', columnName: 'city' },
    { tableName: 'developments', columnName: 'province' },
    { tableName: 'developments', columnName: 'status' },
    { tableName: 'developments', columnName: 'approval_status' },
    { tableName: 'developments', columnName: 'isPublished' },
    { tableName: 'developments', columnName: 'images' },
    { tableName: 'developments', columnName: 'videos' },
    { tableName: 'developments', columnName: 'floorPlans' },
    { tableName: 'developments', columnName: 'brochures' },
    { tableName: 'developments', columnName: 'priceFrom' },
    { tableName: 'developments', columnName: 'priceTo' },
    { tableName: 'developments', columnName: 'updatedAt' },
    { tableName: 'developer_brand_profiles' },
    { tableName: 'developer_brand_profiles', columnName: 'id' },
    { tableName: 'developer_brand_profiles', columnName: 'brand_name' },
    { tableName: 'distribution_programs' },
    { tableName: 'distribution_programs', columnName: 'id' },
    { tableName: 'distribution_programs', columnName: 'development_id' },
    { tableName: 'distribution_programs', columnName: 'is_active' },
    { tableName: 'distribution_programs', columnName: 'is_referral_enabled' },
    { tableName: 'distribution_programs', columnName: 'commission_model' },
    { tableName: 'distribution_programs', columnName: 'default_commission_percent' },
    { tableName: 'distribution_programs', columnName: 'default_commission_amount' },
    { tableName: 'distribution_programs', columnName: 'referrer_commission_type' },
    { tableName: 'distribution_programs', columnName: 'referrer_commission_value' },
    { tableName: 'distribution_programs', columnName: 'referrer_commission_basis' },
    { tableName: 'distribution_programs', columnName: 'platform_commission_type' },
    { tableName: 'distribution_programs', columnName: 'platform_commission_value' },
    { tableName: 'distribution_programs', columnName: 'platform_commission_basis' },
    { tableName: 'distribution_programs', columnName: 'tier_access_policy' },
    { tableName: 'distribution_programs', columnName: 'updated_at' },
    { tableName: 'distribution_brand_partnerships' },
    { tableName: 'distribution_brand_partnerships', columnName: 'brand_profile_id' },
    { tableName: 'distribution_brand_partnerships', columnName: 'status' },
    { tableName: 'distribution_development_access' },
    { tableName: 'distribution_development_access', columnName: 'development_id' },
    { tableName: 'distribution_development_access', columnName: 'brand_partnership_id' },
    { tableName: 'distribution_development_access', columnName: 'status' },
    { tableName: 'distribution_development_access', columnName: 'submission_allowed' },
  ],
  'distribution.admin.listDevelopmentAccess': [
    { tableName: 'developments' },
    { tableName: 'developments', columnName: 'id' },
    { tableName: 'developments', columnName: 'name' },
    { tableName: 'developments', columnName: 'city' },
    { tableName: 'developments', columnName: 'province' },
    { tableName: 'developments', columnName: 'developer_brand_profile_id' },
    { tableName: 'developments', columnName: 'marketing_brand_profile_id' },
    { tableName: 'developments', columnName: 'isPublished' },
    { tableName: 'developments', columnName: 'approval_status' },
    { tableName: 'developments', columnName: 'status' },
    { tableName: 'developments', columnName: 'updatedAt' },
    { tableName: 'distribution_brand_partnerships' },
    { tableName: 'distribution_brand_partnerships', columnName: 'brand_profile_id' },
    { tableName: 'distribution_brand_partnerships', columnName: 'status' },
    { tableName: 'distribution_development_access' },
    { tableName: 'distribution_development_access', columnName: 'development_id' },
    { tableName: 'distribution_development_access', columnName: 'status' },
    { tableName: 'distribution_development_access', columnName: 'submission_allowed' },
    { tableName: 'distribution_programs' },
    { tableName: 'distribution_programs', columnName: 'development_id' },
    { tableName: 'distribution_programs', columnName: 'is_active' },
    { tableName: 'distribution_programs', columnName: 'is_referral_enabled' },
  ],
  'distribution.admin.listPrograms': [
    { tableName: 'distribution_programs' },
    { tableName: 'distribution_programs', columnName: 'id' },
    { tableName: 'distribution_programs', columnName: 'development_id' },
    { tableName: 'distribution_programs', columnName: 'is_active' },
    { tableName: 'distribution_programs', columnName: 'is_referral_enabled' },
    { tableName: 'distribution_programs', columnName: 'commission_model' },
    { tableName: 'distribution_programs', columnName: 'default_commission_percent' },
    { tableName: 'distribution_programs', columnName: 'default_commission_amount' },
    { tableName: 'distribution_programs', columnName: 'referrer_commission_type' },
    { tableName: 'distribution_programs', columnName: 'referrer_commission_value' },
    { tableName: 'distribution_programs', columnName: 'referrer_commission_basis' },
    { tableName: 'distribution_programs', columnName: 'platform_commission_type' },
    { tableName: 'distribution_programs', columnName: 'platform_commission_value' },
    { tableName: 'distribution_programs', columnName: 'platform_commission_basis' },
    { tableName: 'distribution_programs', columnName: 'tier_access_policy' },
    { tableName: 'distribution_programs', columnName: 'created_by' },
    { tableName: 'distribution_programs', columnName: 'created_at' },
    { tableName: 'distribution_programs', columnName: 'updated_by' },
    { tableName: 'distribution_programs', columnName: 'updated_at' },
    { tableName: 'developments' },
    { tableName: 'developments', columnName: 'id' },
    { tableName: 'developments', columnName: 'name' },
    { tableName: 'developments', columnName: 'city' },
    { tableName: 'developments', columnName: 'province' },
  ],
  'distribution.admin.listTeamRegistrations': [
    { tableName: 'platform_team_registrations' },
    { tableName: 'platform_team_registrations', columnName: 'id' },
    { tableName: 'platform_team_registrations', columnName: 'full_name' },
    { tableName: 'platform_team_registrations', columnName: 'email' },
    { tableName: 'platform_team_registrations', columnName: 'phone' },
    { tableName: 'platform_team_registrations', columnName: 'company' },
    { tableName: 'platform_team_registrations', columnName: 'current_role' },
    { tableName: 'platform_team_registrations', columnName: 'requested_area' },
    { tableName: 'platform_team_registrations', columnName: 'notes' },
    { tableName: 'platform_team_registrations', columnName: 'status' },
    { tableName: 'platform_team_registrations', columnName: 'user_id' },
    { tableName: 'platform_team_registrations', columnName: 'reviewed_by' },
    { tableName: 'platform_team_registrations', columnName: 'reviewed_at' },
    { tableName: 'platform_team_registrations', columnName: 'review_notes' },
    { tableName: 'platform_team_registrations', columnName: 'created_at' },
    { tableName: 'platform_team_registrations', columnName: 'updated_at' },
    { tableName: 'distribution_identities' },
    { tableName: 'distribution_identities', columnName: 'user_id' },
    { tableName: 'distribution_identities', columnName: 'identity_type' },
    { tableName: 'distribution_identities', columnName: 'active' },
  ],
  'distribution.admin.createManagerInvite': [
    { tableName: 'platform_team_registrations' },
    { tableName: 'platform_team_registrations', columnName: 'id' },
    { tableName: 'platform_team_registrations', columnName: 'full_name' },
    { tableName: 'platform_team_registrations', columnName: 'email' },
    { tableName: 'platform_team_registrations', columnName: 'phone' },
    { tableName: 'platform_team_registrations', columnName: 'company' },
    { tableName: 'platform_team_registrations', columnName: 'current_role' },
    { tableName: 'platform_team_registrations', columnName: 'requested_area' },
    { tableName: 'platform_team_registrations', columnName: 'notes' },
    { tableName: 'platform_team_registrations', columnName: 'status' },
  ],
  'distribution.admin.getBrandPartnership': [
    { tableName: 'developer_brand_profiles' },
    { tableName: 'developer_brand_profiles', columnName: 'id' },
    { tableName: 'developer_brand_profiles', columnName: 'brand_name' },
    { tableName: 'developer_brand_profiles', columnName: 'slug' },
    { tableName: 'developer_brand_profiles', columnName: 'is_visible' },
    { tableName: 'developer_brand_profiles', columnName: 'owner_type' },
    { tableName: 'distribution_brand_partnerships' },
    { tableName: 'distribution_brand_partnerships', columnName: 'brand_profile_id' },
    { tableName: 'distribution_brand_partnerships', columnName: 'status' },
    { tableName: 'distribution_development_access' },
    { tableName: 'distribution_development_access', columnName: 'brand_partnership_id' },
    { tableName: 'distribution_development_access', columnName: 'status' },
    { tableName: 'developments' },
    { tableName: 'developments', columnName: 'id' },
    { tableName: 'developments', columnName: 'developer_brand_profile_id' },
    { tableName: 'developments', columnName: 'marketing_brand_profile_id' },
    { tableName: 'distribution_programs' },
    { tableName: 'distribution_programs', columnName: 'development_id' },
  ],
  'distribution.admin.getDevelopmentAccess': [
    { tableName: 'developments' },
    { tableName: 'developments', columnName: 'id' },
    { tableName: 'developments', columnName: 'name' },
    { tableName: 'developments', columnName: 'city' },
    { tableName: 'developments', columnName: 'province' },
    { tableName: 'developments', columnName: 'developer_brand_profile_id' },
    { tableName: 'developments', columnName: 'marketing_brand_profile_id' },
    { tableName: 'developments', columnName: 'isPublished' },
    { tableName: 'developments', columnName: 'approval_status' },
    { tableName: 'distribution_development_access' },
    { tableName: 'distribution_development_access', columnName: 'development_id' },
    { tableName: 'distribution_development_access', columnName: 'brand_partnership_id' },
    { tableName: 'distribution_development_access', columnName: 'status' },
    { tableName: 'distribution_development_access', columnName: 'submission_allowed' },
    { tableName: 'distribution_brand_partnerships' },
    { tableName: 'distribution_brand_partnerships', columnName: 'brand_profile_id' },
    { tableName: 'distribution_brand_partnerships', columnName: 'status' },
    { tableName: 'distribution_programs' },
    { tableName: 'distribution_programs', columnName: 'development_id' },
    { tableName: 'distribution_programs', columnName: 'is_active' },
    { tableName: 'distribution_programs', columnName: 'is_referral_enabled' },
  ],
  'distribution.admin.upsertBrandPartnership': [
    { tableName: 'distribution_brand_partnerships' },
    { tableName: 'distribution_brand_partnerships', columnName: 'id' },
    { tableName: 'distribution_brand_partnerships', columnName: 'brand_profile_id' },
    { tableName: 'distribution_brand_partnerships', columnName: 'status' },
    { tableName: 'distribution_brand_partnerships', columnName: 'channel_scope' },
    { tableName: 'distribution_brand_partnerships', columnName: 'partnered_at' },
    { tableName: 'distribution_brand_partnerships', columnName: 'ended_at' },
    { tableName: 'distribution_brand_partnerships', columnName: 'reason_code' },
    { tableName: 'distribution_brand_partnerships', columnName: 'notes' },
    { tableName: 'distribution_brand_partnerships', columnName: 'created_by' },
    { tableName: 'distribution_brand_partnerships', columnName: 'updated_by' },
    { tableName: 'distribution_brand_partnerships', columnName: 'created_at' },
    { tableName: 'distribution_brand_partnerships', columnName: 'updated_at' },
    { tableName: 'developer_brand_profiles' },
    { tableName: 'developer_brand_profiles', columnName: 'id' },
  ],
  'distribution.admin.upsertDevelopmentAccess': [
    { tableName: 'distribution_development_access' },
    { tableName: 'distribution_development_access', columnName: 'id' },
    { tableName: 'distribution_development_access', columnName: 'development_id' },
    { tableName: 'distribution_development_access', columnName: 'brand_partnership_id' },
    { tableName: 'distribution_development_access', columnName: 'brand_profile_id' },
    { tableName: 'distribution_development_access', columnName: 'status' },
    { tableName: 'distribution_development_access', columnName: 'submission_allowed' },
    { tableName: 'distribution_development_access', columnName: 'excluded_by_mandate' },
    { tableName: 'distribution_development_access', columnName: 'excluded_by_exclusivity' },
    { tableName: 'distribution_development_access', columnName: 'reason_code' },
    { tableName: 'distribution_development_access', columnName: 'notes' },
    { tableName: 'distribution_development_access', columnName: 'included_at' },
    { tableName: 'distribution_development_access', columnName: 'excluded_at' },
    { tableName: 'distribution_development_access', columnName: 'paused_at' },
    { tableName: 'distribution_development_access', columnName: 'created_by' },
    { tableName: 'distribution_development_access', columnName: 'updated_by' },
    { tableName: 'distribution_development_access', columnName: 'created_at' },
    { tableName: 'distribution_development_access', columnName: 'updated_at' },
    { tableName: 'distribution_brand_partnerships' },
    { tableName: 'distribution_brand_partnerships', columnName: 'id' },
    { tableName: 'developments' },
    { tableName: 'developments', columnName: 'id' },
  ],
};

const DISTRIBUTION_SCHEMA_OPERATIONS = Object.keys(
  DISTRIBUTION_SCHEMA_REQUIREMENTS,
) as DistributionSchemaOperation[];

function normalizeRows(result: any): Array<Record<string, unknown>> {
  if (Array.isArray(result)) {
    if (result.length > 0 && Array.isArray(result[0])) {
      return result[0] as Array<Record<string, unknown>>;
    }
    if (result.length > 0 && typeof result[0] === 'object') {
      return result as Array<Record<string, unknown>>;
    }
  }
  if (result && Array.isArray(result.rows)) {
    return result.rows as Array<Record<string, unknown>>;
  }
  return [];
}

function readCount(rows: Array<Record<string, unknown>>): number {
  const row = rows[0] || {};
  const explicit =
    row.count_value ??
    row.count ??
    row.COUNT ??
    row['COUNT(*)'] ??
    row['COUNT(1)'] ??
    Object.values(row)[0];
  const parsed = Number(explicit ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function tableExists(tableName: string): Promise<boolean> {
  try {
    const db = await getDb();
    const result = await db.execute(sql`
      SELECT COUNT(*) AS count_value
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = ${tableName}
    `);
    return readCount(normalizeRows(result)) > 0;
  } catch (error) {
    warnSchemaCapabilityOnce(
      `schema-table-exists-${tableName}`,
      `[SchemaCapabilities] Failed table existence check for "${tableName}". Assuming missing.`,
      error,
    );
    return false;
  }
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const db = await getDb();
    const result = await db.execute(sql`
      SELECT COUNT(*) AS count_value
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ${tableName}
        AND column_name = ${columnName}
    `);
    return readCount(normalizeRows(result)) > 0;
  } catch (error) {
    warnSchemaCapabilityOnce(
      `schema-column-exists-${tableName}-${columnName}`,
      `[SchemaCapabilities] Failed column existence check for "${tableName}.${columnName}". Assuming missing.`,
      error,
    );
    return false;
  }
}

export async function getRuntimeSchemaCapabilities(
  options?: { forceRefresh?: boolean },
): Promise<RuntimeSchemaCapabilities> {
  const now = Date.now();
  if (!options?.forceRefresh && cachedCapabilities && cachedCapabilities.expiresAt > now) {
    return cachedCapabilities.value;
  }

  const campaignsTable = await tableExists('demand_campaigns');
  const leadsTable = await tableExists('demand_leads');
  const assignmentsTable = await tableExists('demand_lead_assignments');
  const matchesTable = await tableExists('demand_lead_matches');
  const unmatchedTable = await tableExists('demand_unmatched_leads');
  const campaignOwnerTypeColumn = campaignsTable ? await columnExists('demand_campaigns', 'owner_type') : false;
  const campaignOwnerIdColumn = campaignsTable ? await columnExists('demand_campaigns', 'owner_id') : false;
  const campaignNameColumn = campaignsTable ? await columnExists('demand_campaigns', 'name') : false;
  const campaignStatusColumn = campaignsTable ? await columnExists('demand_campaigns', 'status') : false;
  const campaignSourceChannelColumn = campaignsTable
    ? await columnExists('demand_campaigns', 'source_channel')
    : false;
  const campaignDistributionModeColumn = campaignsTable
    ? await columnExists('demand_campaigns', 'distribution_mode')
    : false;
  const campaignSharedRecipientCountColumn = campaignsTable
    ? await columnExists('demand_campaigns', 'shared_recipient_count')
    : false;
  const campaignCreatedAtColumn = campaignsTable ? await columnExists('demand_campaigns', 'created_at') : false;
  const leadCampaignIdColumn = leadsTable ? await columnExists('demand_leads', 'campaign_id') : false;
  const leadSourceChannelColumn = leadsTable ? await columnExists('demand_leads', 'source_channel') : false;
  const leadStatusColumn = leadsTable ? await columnExists('demand_leads', 'status') : false;
  const leadBuyerNameColumn = leadsTable ? await columnExists('demand_leads', 'buyer_name') : false;
  const leadBuyerEmailColumn = leadsTable ? await columnExists('demand_leads', 'buyer_email') : false;
  const leadCriteriaColumn = leadsTable ? await columnExists('demand_leads', 'criteria') : false;
  const leadMetadataColumn = leadsTable ? await columnExists('demand_leads', 'metadata') : false;
  const leadCreatedAtColumn = leadsTable ? await columnExists('demand_leads', 'created_at') : false;
  const assignmentLeadIdColumn = assignmentsTable
    ? await columnExists('demand_lead_assignments', 'lead_id')
    : false;
  const assignmentDemandLeadIdColumn = assignmentsTable
    ? await columnExists('demand_lead_assignments', 'demand_lead_id')
    : false;
  const assignmentCampaignIdColumn = assignmentsTable
    ? await columnExists('demand_lead_assignments', 'campaign_id')
    : false;
  const assignmentAssignedAgentIdColumn = assignmentsTable
    ? await columnExists('demand_lead_assignments', 'assigned_agent_id')
    : false;
  const matchLeadIdColumn = matchesTable ? await columnExists('demand_lead_matches', 'lead_id') : false;
  const matchDemandLeadIdColumn = matchesTable
    ? await columnExists('demand_lead_matches', 'demand_lead_id')
    : false;
  const matchCampaignIdColumn = matchesTable
    ? await columnExists('demand_lead_matches', 'campaign_id')
    : false;
  const matchConfidenceColumn = matchesTable ? await columnExists('demand_lead_matches', 'confidence') : false;
  const assignmentAssignedAtColumn = assignmentsTable
    ? await columnExists('demand_lead_assignments', 'assigned_at')
    : false;

  const economicActorsTable = await tableExists('economic_actors');
  const userIdColumn = economicActorsTable ? await columnExists('economic_actors', 'user_id') : false;
  const actorTypeColumn = economicActorsTable ? await columnExists('economic_actors', 'actor_type') : false;
  const verificationStatusColumn = economicActorsTable
    ? await columnExists('economic_actors', 'verification_status')
    : false;
  const profileCompletenessColumn = economicActorsTable
    ? await columnExists('economic_actors', 'profile_completeness')
    : false;
  const trustScoreColumn = economicActorsTable ? await columnExists('economic_actors', 'trust_score') : false;
  const subscriptionTierColumn = economicActorsTable
    ? await columnExists('economic_actors', 'subscription_tier')
    : false;
  const momentumScoreColumn = economicActorsTable
    ? await columnExists('economic_actors', 'momentum_score')
    : false;

  const showingsTable = await tableExists('showings');
  const listingIdColumn = showingsTable ? await columnExists('showings', 'listingId') : false;
  const agentIdColumn = showingsTable ? await columnExists('showings', 'agentId') : false;
  const scheduledTimeColumn = showingsTable ? await columnExists('showings', 'scheduledTime') : false;
  const statusColumn = showingsTable ? await columnExists('showings', 'status') : false;

  const value: RuntimeSchemaCapabilities = {
    checkedAt: new Date().toISOString(),
    demandEngineReady:
      campaignsTable &&
      leadsTable &&
      assignmentsTable &&
      matchesTable &&
      unmatchedTable &&
      campaignOwnerTypeColumn &&
      campaignOwnerIdColumn &&
      campaignNameColumn &&
      campaignStatusColumn &&
      campaignSourceChannelColumn &&
      campaignDistributionModeColumn &&
      campaignSharedRecipientCountColumn &&
      campaignCreatedAtColumn &&
      leadCampaignIdColumn &&
      leadSourceChannelColumn &&
      leadStatusColumn &&
      leadBuyerNameColumn &&
      leadBuyerEmailColumn &&
      leadCriteriaColumn &&
      leadMetadataColumn &&
      leadCreatedAtColumn &&
      assignmentLeadIdColumn &&
      assignmentDemandLeadIdColumn &&
      assignmentCampaignIdColumn &&
      assignmentAssignedAgentIdColumn &&
      matchLeadIdColumn &&
      matchDemandLeadIdColumn &&
      matchCampaignIdColumn &&
      matchConfidenceColumn &&
      assignmentAssignedAtColumn,
    demandEngineDetails: {
      campaignsTable,
      leadsTable,
      assignmentsTable,
      matchesTable,
      unmatchedTable,
      campaignOwnerTypeColumn,
      campaignOwnerIdColumn,
      campaignNameColumn,
      campaignStatusColumn,
      campaignSourceChannelColumn,
      campaignDistributionModeColumn,
      campaignSharedRecipientCountColumn,
      campaignCreatedAtColumn,
      leadCampaignIdColumn,
      leadSourceChannelColumn,
      leadStatusColumn,
      leadBuyerNameColumn,
      leadBuyerEmailColumn,
      leadCriteriaColumn,
      leadMetadataColumn,
      leadCreatedAtColumn,
      assignmentLeadIdColumn,
      assignmentDemandLeadIdColumn,
      assignmentCampaignIdColumn,
      assignmentAssignedAgentIdColumn,
      matchLeadIdColumn,
      matchDemandLeadIdColumn,
      matchCampaignIdColumn,
      matchConfidenceColumn,
      assignmentAssignedAtColumn,
    },
    economicActorsReady:
      economicActorsTable &&
      userIdColumn &&
      actorTypeColumn &&
      verificationStatusColumn &&
      profileCompletenessColumn &&
      trustScoreColumn &&
      subscriptionTierColumn &&
      momentumScoreColumn,
    economicActorsDetails: {
      table: economicActorsTable,
      userIdColumn,
      actorTypeColumn,
      verificationStatusColumn,
      profileCompletenessColumn,
      trustScoreColumn,
      subscriptionTierColumn,
      momentumScoreColumn,
    },
    showingsReady: showingsTable && listingIdColumn && agentIdColumn && scheduledTimeColumn && statusColumn,
    showingsDetails: {
      table: showingsTable,
      listingIdColumn,
      agentIdColumn,
      scheduledTimeColumn,
      statusColumn,
    },
  };

  cachedCapabilities = {
    value,
    expiresAt: now + CAP_CACHE_TTL_MS,
  };

  return value;
}

function formatSchemaRequirementLabel(requirement: DistributionSchemaRequirement) {
  return requirement.columnName
    ? `${requirement.tableName}.${requirement.columnName}`
    : requirement.tableName;
}

export function getDistributionSchemaRequirementLabels(operation: DistributionSchemaOperation) {
  return DISTRIBUTION_SCHEMA_REQUIREMENTS[operation].map(formatSchemaRequirementLabel);
}

export function evaluateDistributionSchemaOperationStatus(
  requirements: DistributionSchemaRequirement[],
  availability: Record<string, boolean>,
): DistributionSchemaOperationStatus {
  const requiredItems = requirements.map(formatSchemaRequirementLabel);
  const missingItems = requiredItems.filter(label => !availability[label]);
  return {
    ready: missingItems.length === 0,
    missingItems,
    requiredItems,
  };
}

export async function getDistributionSchemaReadinessSnapshot(options?: {
  forceRefresh?: boolean;
}): Promise<DistributionSchemaReadinessSnapshot> {
  const now = Date.now();
  if (
    !options?.forceRefresh &&
    cachedDistributionSchemaSnapshot &&
    cachedDistributionSchemaSnapshot.expiresAt > now
  ) {
    return cachedDistributionSchemaSnapshot.value;
  }

  const availability = new Map<string, boolean>();

  const readRequirement = async (requirement: DistributionSchemaRequirement) => {
    const label = formatSchemaRequirementLabel(requirement);
    if (availability.has(label)) {
      return availability.get(label) ?? false;
    }

    const exists = requirement.columnName
      ? await columnExists(requirement.tableName, requirement.columnName)
      : await tableExists(requirement.tableName);
    availability.set(label, exists);
    return exists;
  };

  const operationEntries = await Promise.all(
    DISTRIBUTION_SCHEMA_OPERATIONS.map(async operation => {
      const requirements = DISTRIBUTION_SCHEMA_REQUIREMENTS[operation];
      const resolvedAvailability: Record<string, boolean> = {};

      for (const requirement of requirements) {
        const label = formatSchemaRequirementLabel(requirement);
        resolvedAvailability[label] = await readRequirement(requirement);
      }

      return [
        operation,
        evaluateDistributionSchemaOperationStatus(requirements, resolvedAvailability),
      ] as const;
    }),
  );

  const operations = Object.fromEntries(operationEntries) as Record<
    DistributionSchemaOperation,
    DistributionSchemaOperationStatus
  >;
  const missingItems = Array.from(
    new Set(DISTRIBUTION_SCHEMA_OPERATIONS.flatMap(operation => operations[operation].missingItems)),
  );

  const value: DistributionSchemaReadinessSnapshot = {
    checkedAt: new Date().toISOString(),
    ready: missingItems.length === 0,
    missingItems,
    operations,
  };

  cachedDistributionSchemaSnapshot = {
    value,
    expiresAt: now + CAP_CACHE_TTL_MS,
  };

  return value;
}

export function warnSchemaCapabilityOnce(key: string, message: string, details?: unknown) {
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  if (details !== undefined) {
    console.warn(message, details);
    return;
  }
  console.warn(message);
}

export type RuntimeSchemaStrictTarget = 'demand_engine' | 'economic_actors' | 'showings';

export function getMissingRuntimeSchemaTargets(
  capabilities: RuntimeSchemaCapabilities,
  targets: RuntimeSchemaStrictTarget[],
): RuntimeSchemaStrictTarget[] {
  const missing: RuntimeSchemaStrictTarget[] = [];
  for (const target of targets) {
    if (target === 'demand_engine' && !capabilities.demandEngineReady) {
      missing.push(target);
    } else if (target === 'economic_actors' && !capabilities.economicActorsReady) {
      missing.push(target);
    } else if (target === 'showings' && !capabilities.showingsReady) {
      missing.push(target);
    }
  }
  return missing;
}

export async function assertRuntimeSchemaCapabilities(options?: {
  targets?: RuntimeSchemaStrictTarget[];
  forceRefresh?: boolean;
}): Promise<RuntimeSchemaCapabilities> {
  const targets = options?.targets ?? ['demand_engine', 'economic_actors', 'showings'];
  const capabilities = await getRuntimeSchemaCapabilities({ forceRefresh: options?.forceRefresh });
  const missingTargets = getMissingRuntimeSchemaTargets(capabilities, targets);
  if (missingTargets.length > 0) {
    throw new Error(
      `[SchemaCapabilities] Missing required schema capabilities: ${missingTargets.join(', ')}.`,
    );
  }
  return capabilities;
}
