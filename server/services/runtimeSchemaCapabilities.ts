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

const CAP_CACHE_TTL_MS = 60_000;
let cachedCapabilities: { value: RuntimeSchemaCapabilities; expiresAt: number } | null = null;
const warnedKeys = new Set<string>();

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
