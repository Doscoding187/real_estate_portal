import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import {
  agents,
  demandCampaigns,
  demandLeads,
  demandLeadAssignments,
  demandLeadMatches,
  demandUnmatchedLeads,
  leads,
  notifications,
  properties,
} from '../../drizzle/schema';
import { getDb } from '../db';
import { getPlanAccessProjectionForUserId, type EntitlementMap } from './planAccessService';
import { getRuntimeSchemaCapabilities, warnSchemaCapabilityOnce } from './runtimeSchemaCapabilities';

type DemandOwnerType = 'agent' | 'agency' | 'developer' | 'private';
type DemandDistributionMode = 'shared' | 'exclusive' | 'mixed';

type DemandCriteria = {
  city?: string | null;
  suburb?: string | null;
  province?: string | null;
  propertyType?:
    | 'apartment'
    | 'house'
    | 'villa'
    | 'plot'
    | 'commercial'
    | 'townhouse'
    | 'cluster_home'
    | 'farm'
    | 'shared_living'
    | null;
  minBedrooms?: number | null;
  maxPrice?: number | null;
  minPrice?: number | null;
};

export type CreateDemandCampaignInput = {
  ownerType: DemandOwnerType;
  ownerId: number;
  createdBy?: number | null;
  name: string;
  status?: 'draft' | 'active' | 'paused' | 'archived';
  sourceChannel?: 'google' | 'meta' | 'tiktok' | 'internal' | 'manual';
  distributionMode?: DemandDistributionMode;
  sharedRecipientCount?: number;
  criteria?: DemandCriteria | null;
  metadata?: Record<string, unknown> | null;
};

export type CaptureDemandLeadInput = {
  campaignId: number;
  name: string;
  email: string;
  phone?: string | null;
  message?: string | null;
  criteria?: DemandCriteria | null;
  budgetMax?: number | null;
  timeline?: string | null;
  preApproved?: boolean | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
};

export type CaptureDemandLeadResult = {
  campaignId: number;
  demandLeadId: number | null;
  leadIds: number[];
  assignedAgentIds: number[];
  assignmentType: 'shared' | 'exclusive' | null;
  unmatched: boolean;
};

function normalizeText(value: string | null | undefined): string | null {
  if (!value) return null;
  const next = value.trim();
  return next.length > 0 ? next : null;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function tierWeightFromPlanNameFallback(planName: string | null | undefined): number {
  const normalized = String(planName || '').toLowerCase();
  if (normalized.includes('elite')) return 6;
  if (normalized.includes('pro')) return 3;
  if (normalized.includes('growth')) return 3;
  return 1;
}

function recipientsFromTierWeightFallback(tierWeight: number): number {
  if (tierWeight >= 6) return 1;
  if (tierWeight >= 3) return 2;
  return 3;
}

function clampRecipientCount(value: number): number {
  if (!Number.isFinite(value)) return 3;
  return Math.max(1, Math.min(3, Math.round(value)));
}

function computeQualityMultiplier(profileCompletionScore: number): number {
  return profileCompletionScore >= 80 ? 1.2 : 1.0;
}

function computeFairnessMultiplier(assignmentsLast24h: number): number {
  if (assignmentsLast24h >= 8) return 0.45;
  if (assignmentsLast24h >= 5) return 0.6;
  if (assignmentsLast24h >= 3) return 0.8;
  return 1.0;
}

function parseEntitlementNumber(entitlements: EntitlementMap | null | undefined, key: string): number | null {
  const raw = entitlements?.[key];
  if (raw === null || raw === undefined) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveTierWeight(entitlements: EntitlementMap | null | undefined, planName: string | null): number {
  const entitlementWeight = parseEntitlementNumber(entitlements, 'tier_weight');
  if (entitlementWeight !== null && entitlementWeight > 0) return entitlementWeight;
  return tierWeightFromPlanNameFallback(planName);
}

function resolveMaxRecipientsPerLead(
  entitlements: EntitlementMap | null | undefined,
  tierWeight: number,
): number {
  const explicit = parseEntitlementNumber(entitlements, 'max_recipients_per_lead');
  if (explicit !== null && explicit > 0) return clampRecipientCount(explicit);

  const mode = String(entitlements?.lead_distribution_mode || '').toLowerCase();
  if (mode === 'exclusive') return 1;
  if (mode === 'semi' || mode === 'semi-exclusive') return 2;
  if (mode === 'shared') return 3;

  return recipientsFromTierWeightFallback(tierWeight);
}

function confidenceFromScore(score: number): 'low' | 'medium' | 'high' {
  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

function serializeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return '{}';
  }
}

function toDemandCriteria(
  campaign: typeof demandCampaigns.$inferSelect,
  inputCriteria?: DemandCriteria | null,
  budgetMax?: number | null,
): DemandCriteria {
  const merged: DemandCriteria = {
    city: normalizeText(inputCriteria?.city) || normalizeText(campaign.city),
    suburb: normalizeText(inputCriteria?.suburb) || normalizeText(campaign.suburb),
    province: normalizeText(inputCriteria?.province) || normalizeText(campaign.province),
    propertyType: (inputCriteria?.propertyType || campaign.propertyType || null) as DemandCriteria['propertyType'],
    minBedrooms: toNumber(inputCriteria?.minBedrooms) ?? toNumber(campaign.minBedrooms),
    maxPrice: toNumber(inputCriteria?.maxPrice) ?? toNumber(budgetMax) ?? toNumber(campaign.maxPrice),
    minPrice: toNumber(inputCriteria?.minPrice) ?? toNumber(campaign.minPrice),
  };
  return merged;
}

async function ensureDemandEngineReady(operation: string): Promise<void> {
  const capabilities = await getRuntimeSchemaCapabilities();
  if (capabilities.demandEngineReady) {
    return;
  }

  warnSchemaCapabilityOnce(
    `demand-engine-service-${operation}-schema-not-ready`,
    `[demandEngineService.${operation}] Demand schema not ready.`,
    capabilities.demandEngineDetails,
  );
  throw new Error('Demand routing schema not ready');
}

export async function createDemandCampaign(input: CreateDemandCampaignInput) {
  await ensureDemandEngineReady('createDemandCampaign');
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const criteria = input.criteria || null;
  const insertResult = await db.insert(demandCampaigns).values({
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    createdBy: input.createdBy || null,
    name: input.name,
    status: input.status || 'draft',
    sourceChannel: input.sourceChannel || 'manual',
    distributionMode: input.distributionMode || 'shared',
    sharedRecipientCount: clampRecipientCount(input.sharedRecipientCount ?? 3),
    city: normalizeText(criteria?.city),
    suburb: normalizeText(criteria?.suburb),
    province: normalizeText(criteria?.province),
    propertyType: criteria?.propertyType || null,
    minBedrooms: toNumber(criteria?.minBedrooms),
    maxPrice: toNumber(criteria?.maxPrice),
    minPrice: toNumber(criteria?.minPrice),
    criteria,
    metadata: input.metadata || null,
  });

  const campaignId = Number((insertResult as any)?.[0]?.insertId || 0);
  if (!campaignId) {
    throw new Error('Failed to create campaign');
  }

  const [campaign] = await db.select().from(demandCampaigns).where(eq(demandCampaigns.id, campaignId)).limit(1);
  return campaign || null;
}

export async function listDemandCampaignsForOwner(ownerType: DemandOwnerType, ownerId: number) {
  await ensureDemandEngineReady('listDemandCampaignsForOwner');
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return db
    .select()
    .from(demandCampaigns)
    .where(and(eq(demandCampaigns.ownerType, ownerType), eq(demandCampaigns.ownerId, ownerId)))
    .orderBy(desc(demandCampaigns.createdAt));
}

export async function captureDemandLeadFromCampaign(
  input: CaptureDemandLeadInput,
): Promise<CaptureDemandLeadResult> {
  await ensureDemandEngineReady('captureDemandLeadFromCampaign');
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [campaign] = await db
    .select()
    .from(demandCampaigns)
    .where(eq(demandCampaigns.id, input.campaignId))
    .limit(1);

  if (!campaign) {
    throw new Error('Campaign not found');
  }
  if (campaign.status !== 'active') {
    throw new Error('Campaign is not active');
  }

  const effectiveCriteria = toDemandCriteria(campaign, input.criteria, input.budgetMax);
  const demandLeadInsert = await db.insert(demandLeads).values({
    campaignId: campaign.id,
    sourceChannel: `campaign_${campaign.sourceChannel}`,
    status: 'captured',
    buyerName: input.name,
    buyerEmail: input.email,
    buyerPhone: input.phone || null,
    message: input.message || null,
    criteria: effectiveCriteria,
    metadata: {
      timeline: input.timeline || null,
      preApproved: Boolean(input.preApproved),
      utm: {
        source: input.utmSource || null,
        medium: input.utmMedium || null,
        campaign: input.utmCampaign || null,
      },
    },
  });
  const demandLeadId = Number((demandLeadInsert as any)?.[0]?.insertId || 0) || null;

  const propertyConditions = [inArray(properties.status, ['available', 'published']), sql`${properties.agentId} IS NOT NULL`];
  if (effectiveCriteria.city) {
    propertyConditions.push(eq(properties.city, effectiveCriteria.city));
  }
  if (effectiveCriteria.province) {
    propertyConditions.push(eq(properties.province, effectiveCriteria.province));
  }
  if (effectiveCriteria.propertyType) {
    propertyConditions.push(eq(properties.propertyType, effectiveCriteria.propertyType));
  }
  if (effectiveCriteria.minBedrooms !== null && effectiveCriteria.minBedrooms !== undefined) {
    propertyConditions.push(gte(properties.bedrooms, effectiveCriteria.minBedrooms));
  }
  if (effectiveCriteria.maxPrice !== null && effectiveCriteria.maxPrice !== undefined) {
    propertyConditions.push(lte(properties.price, effectiveCriteria.maxPrice));
  }
  if (effectiveCriteria.minPrice !== null && effectiveCriteria.minPrice !== undefined) {
    propertyConditions.push(gte(properties.price, effectiveCriteria.minPrice));
  }

  const candidateProperties = await db
    .select()
    .from(properties)
    .where(and(...propertyConditions))
    .orderBy(desc(properties.updatedAt))
    .limit(250);

  if (candidateProperties.length === 0) {
    if (demandLeadId) {
      await db.update(demandLeads).set({ status: 'unmatched' }).where(eq(demandLeads.id, demandLeadId));
    }
    await db.insert(demandUnmatchedLeads).values({
      campaignId: campaign.id,
      sourceChannel: `campaign_${campaign.sourceChannel}`,
      buyerName: input.name,
      buyerEmail: input.email,
      buyerPhone: input.phone || null,
      criteria: effectiveCriteria,
      payload: {
        message: input.message || null,
        timeline: input.timeline || null,
        preApproved: Boolean(input.preApproved),
        utm: {
          source: input.utmSource || null,
          medium: input.utmMedium || null,
          campaign: input.utmCampaign || null,
        },
      },
      status: 'open',
    });

    return {
      campaignId: campaign.id,
      demandLeadId,
      leadIds: [],
      assignedAgentIds: [],
      assignmentType: null,
      unmatched: true,
    };
  }

  const agentIds = Array.from<number>(
    new Set<number>(candidateProperties.map(row => Number(row.agentId))),
  ).filter(id => Number.isFinite(id) && id > 0);

  if (agentIds.length === 0) {
    if (demandLeadId) {
      await db.update(demandLeads).set({ status: 'unmatched' }).where(eq(demandLeads.id, demandLeadId));
    }
    return {
      campaignId: campaign.id,
      demandLeadId,
      leadIds: [],
      assignedAgentIds: [],
      assignmentType: null,
      unmatched: true,
    };
  }

  const agentRowsRaw = await db
    .select({
      id: agents.id,
      userId: agents.userId,
      agencyId: agents.agencyId,
      profileCompletionScore: agents.profileCompletionScore,
      displayName: agents.displayName,
      firstName: agents.firstName,
      lastName: agents.lastName,
    })
    .from(agents)
    .where(inArray(agents.id, agentIds));
  const agentRows = agentRowsRaw.map(row => ({
    id: Number(row.id),
    userId: row.userId ? Number(row.userId) : null,
    agencyId: row.agencyId ? Number(row.agencyId) : null,
    profileCompletionScore: Number(row.profileCompletionScore || 0),
    displayName: row.displayName || null,
    firstName: row.firstName || null,
    lastName: row.lastName || null,
  }));
  const agentById = new Map<number, (typeof agentRows)[number]>(
    agentRows.map(row => [row.id, row]),
  );

  const assignmentWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentAssignments = await db
    .select({
      agentId: demandLeadAssignments.assignedAgentId,
      assignmentCount: sql<number>`COUNT(*)`,
    })
    .from(demandLeadAssignments)
    .where(
      and(
        // Column is nullable; cast keeps TS happy while SQL stays parameterized.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inArray(demandLeadAssignments.assignedAgentId as any, agentIds),
        gte(demandLeadAssignments.assignedAt, assignmentWindowStart),
      ),
    )
    .groupBy(demandLeadAssignments.assignedAgentId);
  const assignmentCountByAgentId = new Map<number, number>();
  for (const row of recentAssignments) {
    assignmentCountByAgentId.set(Number(row.agentId), Number(row.assignmentCount || 0));
  }

  const routingConfigByAgentId = new Map<
    number,
    { tierWeight: number; maxRecipientsPerLead: number }
  >();
  await Promise.all(
    agentRows.map(async row => {
      let tierWeight = 1;
      let maxRecipientsPerLead = 3;
      try {
        if (row.userId) {
          const planAccess = await getPlanAccessProjectionForUserId(Number(row.userId));
          tierWeight = resolveTierWeight(planAccess?.entitlements, planAccess?.currentPlan?.name || null);
          maxRecipientsPerLead = resolveMaxRecipientsPerLead(planAccess?.entitlements, tierWeight);
        }
      } catch {
        tierWeight = 1;
        maxRecipientsPerLead = 3;
      }

      routingConfigByAgentId.set(Number(row.id), {
        tierWeight,
        maxRecipientsPerLead,
      });
    }),
  );

  type RankedAgent = {
    agentId: number;
    userId: number | null;
    ownerType: 'agent' | 'agency';
    ownerId: number;
    property: typeof properties.$inferSelect;
    score: number;
    confidence: 'low' | 'medium' | 'high';
    tierWeight: number;
    qualityMultiplier: number;
    fairnessMultiplier: number;
    maxRecipientsPerLead: number;
  };

  const rankedAgents: RankedAgent[] = [];
  for (const property of candidateProperties) {
    const agentId = Number(property.agentId || 0);
    if (!agentId) continue;
    const agent = agentById.get(agentId);
    if (!agent) continue;

    const routing = routingConfigByAgentId.get(agentId) || { tierWeight: 1, maxRecipientsPerLead: 3 };
    const tierWeight = routing.tierWeight;
    const maxRecipientsPerLead = clampRecipientCount(routing.maxRecipientsPerLead);
    const qualityMultiplier = computeQualityMultiplier(agent.profileCompletionScore || 0);
    const fairnessMultiplier = computeFairnessMultiplier(assignmentCountByAgentId.get(agentId) || 0);
    const score = tierWeight * fairnessMultiplier * qualityMultiplier;
    const confidence = confidenceFromScore(score);
    const ownerType: 'agent' | 'agency' = agent.agencyId ? 'agency' : 'agent';
    const ownerId = agent.agencyId ? Number(agent.agencyId) : agentId;

    rankedAgents.push({
      agentId,
      userId: agent.userId ? Number(agent.userId) : null,
      ownerType,
      ownerId,
      property,
      score,
      confidence,
      tierWeight,
      qualityMultiplier,
      fairnessMultiplier,
      maxRecipientsPerLead,
    });
  }

  // Keep only the best listing candidate per agent.
  const bestRankByAgentId = new Map<number, RankedAgent>();
  for (const row of rankedAgents) {
    const prev = bestRankByAgentId.get(row.agentId);
    if (!prev || row.score > prev.score) {
      bestRankByAgentId.set(row.agentId, row);
    }
  }
  const uniqueRankedAgents = Array.from(bestRankByAgentId.values()).sort((a, b) => b.score - a.score);

  if (uniqueRankedAgents.length === 0) {
    if (demandLeadId) {
      await db.update(demandLeads).set({ status: 'unmatched' }).where(eq(demandLeads.id, demandLeadId));
    }
    return {
      campaignId: campaign.id,
      demandLeadId,
      leadIds: [],
      assignedAgentIds: [],
      assignmentType: null,
      unmatched: true,
    };
  }

  const primaryRecipient = uniqueRankedAgents[0];
  const recipientCount = clampRecipientCount(primaryRecipient?.maxRecipientsPerLead || 3);
  const assignmentType: 'shared' | 'exclusive' = recipientCount === 1 ? 'exclusive' : 'shared';
  const selectedRecipients = uniqueRankedAgents.slice(0, recipientCount);
  const assignmentGroupId = `${campaign.id}-${Date.now()}`;

  const leadIds: number[] = [];
  const assignedAgentIds: number[] = [];

  for (let idx = 0; idx < selectedRecipients.length; idx++) {
    const recipient = selectedRecipients[idx];
    const leadInsertResult = await db.insert(leads).values({
      propertyId: recipient.property.id,
      agentId: recipient.agentId,
      ownerType: recipient.ownerType,
      ownerId: recipient.ownerId,
      assignedAgentId: recipient.agentId,
      visibilityScope: recipient.ownerType === 'agency' ? 'team' : 'private',
      governanceMode: recipient.ownerType === 'agency' ? 'affiliated' : 'solo',
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      message: input.message || null,
      leadType: 'inquiry',
      status: 'new',
      source: 'demand',
      notes: `Demand lead matched from campaign ${campaign.name}`,
      leadSource: 'demand_engine',
      utmSource: input.utmSource || null,
      utmMedium: input.utmMedium || null,
      utmCampaign: input.utmCampaign || null,
    });

    const leadId = Number((leadInsertResult as any)?.[0]?.insertId || 0);
    if (!leadId) {
      continue;
    }

    leadIds.push(leadId);
    assignedAgentIds.push(recipient.agentId);

    await db.insert(demandLeadAssignments).values({
      demandLeadId,
      campaignId: campaign.id,
      leadId,
      assignmentGroupId,
      assignmentType,
      assignedAgentId: recipient.agentId,
      ownerType: recipient.ownerType,
      ownerId: recipient.ownerId,
      rankPosition: idx + 1,
      deliveryChannels: ['in_app'],
      status: 'assigned',
      reason: `Matched via demand criteria for ${campaign.name}`,
    });

    await db.insert(demandLeadMatches).values({
      demandLeadId,
      campaignId: campaign.id,
      leadId,
      propertyId: recipient.property.id,
      agentId: recipient.agentId,
      ownerType: recipient.ownerType,
      ownerId: recipient.ownerId,
      matchScore: recipient.score.toFixed(4),
      confidence: recipient.confidence,
      tierWeight: recipient.tierWeight.toFixed(4),
      performanceMultiplier: '1.0000',
      listingQualityMultiplier: recipient.qualityMultiplier.toFixed(4),
      fairnessMultiplier: recipient.fairnessMultiplier.toFixed(4),
      scoringInputs: {
        criteria: effectiveCriteria,
        propertyId: recipient.property.id,
        formula: 'tierWeight * fairnessMultiplier * qualityMultiplier',
      },
    });

    if (recipient.userId) {
      await db.insert(notifications).values({
        userId: recipient.userId,
        type: 'lead_assigned',
        title: 'New Marketing Lead',
        content: `New buyer lead matched to ${recipient.property.title}`,
        data: serializeJson({
          leadId,
          demandLeadId,
          campaignId: campaign.id,
          source: 'demand',
          assignmentType,
        }),
        isRead: 0,
      });
    }
  }

  if (leadIds.length === 0) {
    if (demandLeadId) {
      await db.update(demandLeads).set({ status: 'unmatched' }).where(eq(demandLeads.id, demandLeadId));
    }
    return {
      campaignId: campaign.id,
      demandLeadId,
      leadIds: [],
      assignedAgentIds: [],
      assignmentType: null,
      unmatched: true,
    };
  }

  if (demandLeadId) {
    await db.update(demandLeads).set({ status: 'assigned' }).where(eq(demandLeads.id, demandLeadId));
  }

  return {
    campaignId: campaign.id,
    demandLeadId,
    leadIds,
    assignedAgentIds,
    assignmentType,
    unmatched: false,
  };
}

export async function getAgentCampaignLeadSummary(userId: number) {
  await ensureDemandEngineReady('getAgentCampaignLeadSummary');
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [agent] = await db.select().from(agents).where(eq(agents.userId, userId)).limit(1);
  if (!agent) {
    return {
      assignedThisWeek: 0,
      activeCampaigns: 0,
      campaignLeadsBySource: [] as Array<{ source: string; count: number }>,
    };
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [weeklyAssigned] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(demandLeadAssignments)
    .where(
      and(
        eq(demandLeadAssignments.assignedAgentId, agent.id),
        gte(demandLeadAssignments.assignedAt, weekAgo),
      ),
    );

  const campaignRows = await db
    .select({
      campaignId: demandLeadAssignments.campaignId,
    })
    .from(demandLeadAssignments)
    .where(eq(demandLeadAssignments.assignedAgentId, agent.id))
    .groupBy(demandLeadAssignments.campaignId);

  const campaignLeadsBySource = await db
    .select({
      source: leads.source,
      count: sql<number>`COUNT(*)`,
    })
    .from(leads)
    .where(and(eq(leads.agentId, agent.id), eq(leads.source, 'demand')))
    .groupBy(leads.source);

  return {
    assignedThisWeek: Number(weeklyAssigned?.count || 0),
    activeCampaigns: campaignRows.filter(row => row.campaignId !== null).length,
    campaignLeadsBySource: campaignLeadsBySource.map(row => ({
      source: String(row.source || 'demand'),
      count: Number(row.count || 0),
    })),
  };
}
