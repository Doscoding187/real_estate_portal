import { TRPCError } from '@trpc/server';
import { and, desc, eq, gte, inArray, lte, or, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  developments,
  distributionAgentAccess,
  distributionIdentities,
  distributionPrograms,
  leadActivities,
  leads,
  users,
} from '../../drizzle/schema';
import {
  DEFAULT_LEAD_SLA_POLICY,
  LEAD_ALLOWED_TRANSITIONS,
  type LeadOwnerType,
  type LeadStage,
  type SlaStatus,
  isLeadTransitionAllowed,
} from '../../shared/developerFunnel';

type LeadRow = typeof leads.$inferSelect;

type FunnelListParams = {
  developerId: number;
  developmentId?: number;
  stage?: LeadStage;
  owner?: LeadOwnerType;
  source?: string;
  q?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

type TransitionParams = {
  developerId: number;
  userId: number;
  leadId: number;
  toStage: LeadStage;
  notes?: string;
  force?: boolean;
};

type AssignParams = {
  developerId: number;
  leadId: number;
  ownerType: LeadOwnerType;
  ownerId: number | null;
  assignmentMode?: 'manual' | 'round_robin' | 'rule_based';
};

type ActivityParams = {
  developerId: number;
  userId: number;
  leadId: number;
  type: 'note' | 'call' | 'email' | 'meeting' | 'status_change' | 'whatsapp';
  description?: string;
};

type NextActionParams = {
  developerId: number;
  userId: number;
  leadId: number;
  at: string;
  type: 'call' | 'email' | 'whatsapp' | 'schedule_viewing' | 'send_brochure' | 'other';
};

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function minutesBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
}

function appendNote(existing: string | null | undefined, next: string): string {
  const stamp = new Date().toISOString();
  const line = `[${stamp}] ${next}`;
  return existing ? `${existing}\n${line}` : line;
}

function parseNextActionType(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const matches = notes.match(/next_action:([a-z_]+)/gi);
  if (!matches || matches.length === 0) return null;
  const last = matches[matches.length - 1];
  return last.split(':')[1] || null;
}

function parseOwnerOverride(notes: string | null | undefined): LeadOwnerType | null {
  if (!notes) return null;
  const matches = notes.match(/owner_override:(developer_sales|agency|distribution_partner|unassigned)/gi);
  if (!matches || matches.length === 0) return null;
  const last = matches[matches.length - 1];
  const value = String(last.split(':')[1] || '').toLowerCase();
  if (
    value === 'developer_sales' ||
    value === 'agency' ||
    value === 'distribution_partner' ||
    value === 'unassigned'
  ) {
    return value;
  }
  return null;
}

function appendOwnerOverride(existing: string | null | undefined, ownerType: LeadOwnerType): string {
  return appendNote(existing, `owner_override:${ownerType}`);
}

function isDistributionSourceValue(value: string | null | undefined): boolean {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes('distribution') ||
    normalized.includes('referral') ||
    normalized.includes('referrer')
  );
}

function isDistributionLeadEligible(lead: LeadRow): boolean {
  return isDistributionSourceValue(lead.leadSource) || isDistributionSourceValue(lead.source);
}

export function getAvailableLeadOwnerTypes(distributionEnabledForDevelopment: boolean): LeadOwnerType[] {
  return distributionEnabledForDevelopment
    ? ['developer_sales', 'agency', 'distribution_partner', 'unassigned']
    : ['developer_sales', 'agency', 'unassigned'];
}

export function evaluateDistributionAssignmentGate(input: {
  ownerType: LeadOwnerType;
  distributionEnabledForDevelopment: boolean;
  partnerEligible: boolean;
  leadEligible: boolean;
}): { allowed: true } | { allowed: false; reason: 'distribution_disabled' | 'partner_ineligible' | 'lead_ineligible' } {
  if (input.ownerType !== 'distribution_partner') return { allowed: true };
  if (!input.distributionEnabledForDevelopment) {
    return { allowed: false, reason: 'distribution_disabled' };
  }
  if (!input.partnerEligible) {
    return { allowed: false, reason: 'partner_ineligible' };
  }
  if (!input.leadEligible) {
    return { allowed: false, reason: 'lead_ineligible' };
  }
  return { allowed: true };
}

async function getDistributionEnabledMapForDevelopments(
  developmentIds: number[],
): Promise<Map<number, boolean>> {
  const validIds = Array.from(new Set(developmentIds.filter(id => Number.isFinite(id) && id > 0)));
  if (!validIds.length) return new Map();

  const rows = await db
    .select({
      developmentId: distributionPrograms.developmentId,
    })
    .from(distributionPrograms)
    .where(
      and(
        inArray(distributionPrograms.developmentId, validIds),
        eq(distributionPrograms.isActive, 1),
        eq(distributionPrograms.isReferralEnabled, 1),
      ),
    );

  const map = new Map<number, boolean>();
  for (const row of rows) {
    map.set(Number(row.developmentId), true);
  }
  return map;
}

async function isDistributionPartnerEligibleForDevelopment(params: {
  developmentId: number;
  partnerUserId: number;
}): Promise<boolean> {
  const [row] = await db
    .select({ id: distributionAgentAccess.id })
    .from(distributionAgentAccess)
    .innerJoin(distributionPrograms, eq(distributionAgentAccess.programId, distributionPrograms.id))
    .innerJoin(
      distributionIdentities,
      and(
        eq(distributionIdentities.userId, distributionAgentAccess.agentId),
        eq(distributionIdentities.identityType, 'referrer'),
      ),
    )
    .where(
      and(
        eq(distributionAgentAccess.developmentId, params.developmentId),
        eq(distributionAgentAccess.agentId, params.partnerUserId),
        eq(distributionAgentAccess.accessStatus, 'active'),
        eq(distributionPrograms.isActive, 1),
        eq(distributionPrograms.isReferralEnabled, 1),
        eq(distributionIdentities.active, 1),
      ),
    )
    .limit(1);

  return !!row;
}

export function deriveCanonicalLeadStage(lead: LeadRow): LeadStage {
  if (lead.status === 'new') return 'new';
  if (lead.status === 'contacted') return 'contacted';
  if (lead.status === 'qualified') {
    if (lead.funnelStage === 'viewing') return 'viewing_completed';
    return 'qualified';
  }
  if (lead.status === 'viewing_scheduled') return 'viewing_scheduled';
  if (lead.status === 'offer_sent') return 'offer_made';
  if (lead.status === 'converted') return 'deal_in_progress';
  if (lead.status === 'closed') return 'closed_won';
  if (lead.status === 'lost') {
    const reason = (lead.lostReason || '').toLowerCase();
    if (reason === 'spam') return 'spam';
    if (reason === 'duplicate') return 'duplicate';
    if (reason === 'archived') return 'archived';
    return 'closed_lost';
  }

  if (lead.funnelStage === 'offer') return 'offer_made';
  if (lead.funnelStage === 'bond') return 'deal_in_progress';
  if (lead.funnelStage === 'sale') return 'closed_won';
  if (lead.funnelStage === 'viewing') return 'viewing_completed';
  if (lead.funnelStage === 'qualification') return 'qualified';
  if (lead.funnelStage === 'affordability') return 'contacted';

  return 'new';
}

function canonicalStageToUpdate(stage: LeadStage): Partial<typeof leads.$inferInsert> {
  switch (stage) {
    case 'new':
      return { status: 'new', funnelStage: 'interest', lostReason: null };
    case 'contacted':
      return {
        status: 'contacted',
        funnelStage: 'affordability',
        lastContactedAt: new Date().toISOString(),
        lostReason: null,
      };
    case 'qualified':
      return { status: 'qualified', funnelStage: 'qualification', lostReason: null };
    case 'viewing_scheduled':
      return { status: 'viewing_scheduled', funnelStage: 'viewing', lostReason: null };
    case 'viewing_completed':
      return { status: 'qualified', funnelStage: 'viewing', lostReason: null };
    case 'offer_made':
      return { status: 'offer_sent', funnelStage: 'offer', lostReason: null };
    case 'deal_in_progress':
      return {
        status: 'converted',
        funnelStage: 'bond',
        convertedAt: new Date().toISOString(),
        lostReason: null,
      };
    case 'closed_won':
      return {
        status: 'closed',
        funnelStage: 'sale',
        convertedAt: new Date().toISOString(),
        lostReason: null,
      };
    case 'closed_lost':
      return { status: 'lost', lostReason: 'lost' };
    case 'spam':
      return { status: 'lost', lostReason: 'spam' };
    case 'duplicate':
      return { status: 'lost', lostReason: 'duplicate' };
    case 'archived':
      return { status: 'lost', lostReason: 'archived' };
    default:
      return {};
  }
}

function deriveOwner(lead: LeadRow, ownerName: string | null) {
  const ownerOverride = parseOwnerOverride(lead.notes);

  if (ownerOverride === 'distribution_partner' && lead.ownerId) {
    return {
      ownerType: 'distribution_partner' as const,
      ownerId: String(lead.ownerId),
      ownerName: ownerName || null,
    };
  }

  if (ownerOverride === 'agency' && lead.ownerId) {
    return {
      ownerType: 'agency' as const,
      ownerId: String(lead.ownerId),
      ownerName: ownerName || null,
    };
  }

  if (ownerOverride === 'unassigned') {
    return {
      ownerType: 'unassigned' as const,
      ownerId: null,
      ownerName: null,
    };
  }

  if (lead.assignedTo) {
    return {
      ownerType: 'developer_sales' as const,
      ownerId: String(lead.assignedTo),
      ownerName: ownerName || null,
    };
  }

  if (lead.ownerType === 'agency' && lead.ownerId) {
    return {
      ownerType: 'agency' as const,
      ownerId: String(lead.ownerId),
      ownerName: ownerName || null,
    };
  }

  return {
    ownerType: 'unassigned' as const,
    ownerId: null,
    ownerName: null,
  };
}

export function computeLeadSla(
  lead: LeadRow,
  now = new Date(),
): {
  status: SlaStatus;
  timeToFirstContactMins: number | null;
  nextActionAt: string | null;
  nextActionType: string | null;
} {
  const createdAt = toDate(lead.createdAt);
  const lastContactedAt = toDate(lead.lastContactedAt);
  const nextFollowUpAt = toDate(lead.nextFollowUp);

  let status: SlaStatus = 'ok';
  let timeToFirstContactMins: number | null = null;

  if (createdAt && lastContactedAt) {
    timeToFirstContactMins = minutesBetween(createdAt, lastContactedAt);
  }

  if (createdAt && !lastContactedAt) {
    const hoursSinceCreate = minutesBetween(createdAt, now) / 60;
    if (hoursSinceCreate >= DEFAULT_LEAD_SLA_POLICY.firstContactBreachHours) status = 'breach';
    else if (hoursSinceCreate >= DEFAULT_LEAD_SLA_POLICY.firstContactWarningHours) status = 'warning';
  }

  if (lastContactedAt) {
    const hoursSinceLastContact = minutesBetween(lastContactedAt, now) / 60;
    if (hoursSinceLastContact >= DEFAULT_LEAD_SLA_POLICY.inactivityBreachHours) status = 'breach';
    else if (
      status !== 'breach' &&
      hoursSinceLastContact >= DEFAULT_LEAD_SLA_POLICY.inactivityWarningHours
    ) {
      status = 'warning';
    }
  }

  if (nextFollowUpAt) {
    const minsToAction = minutesBetween(now, nextFollowUpAt);
    if (nextFollowUpAt.getTime() < now.getTime()) {
      status = 'breach';
    } else if (status === 'ok' && minsToAction <= 60) {
      status = 'warning';
    }
  }

  return {
    status,
    timeToFirstContactMins,
    nextActionAt: lead.nextFollowUp || null,
    nextActionType: parseNextActionType(lead.notes),
  };
}

function normalizeLeadRow(
  lead: LeadRow,
  ownerName: string | null,
  distributionEnabledForDevelopment: boolean,
) {
  const stage = deriveCanonicalLeadStage(lead);
  const owner = deriveOwner(lead, ownerName);
  const sla = computeLeadSla(lead);
  const lostReason = (lead.lostReason || '').toLowerCase();
  const availableOwnerTypes = getAvailableLeadOwnerTypes(distributionEnabledForDevelopment);

  return {
    id: String(lead.id),
    developmentId: lead.developmentId ? String(lead.developmentId) : '',
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    lastActivityAt: lead.lastContactedAt || null,
    contact: {
      name: lead.name || undefined,
      phone: lead.phone || undefined,
      email: lead.email || undefined,
    },
    source: {
      channel: lead.leadSource || lead.source || 'unknown',
      utmSource: lead.utmSource || undefined,
      utmCampaign: lead.utmCampaign || undefined,
    },
    stage,
    allowedTransitions: LEAD_ALLOWED_TRANSITIONS[stage],
    availableOwnerTypes,
    owner,
    sla: {
      status: sla.status,
      timeToFirstContactMins: sla.timeToFirstContactMins,
    },
    nextAction: {
      type: sla.nextActionType,
      at: sla.nextActionAt,
    },
    flags: {
      duplicate: lostReason === 'duplicate',
      spam: lostReason === 'spam',
      priority: sla.status === 'breach' ? 'high' : sla.status === 'warning' ? 'med' : 'low',
    },
    notes: lead.notes || null,
  };
}

async function getDeveloperLeadRow(developerId: number, leadId: number) {
  const [row] = await db
    .select({
      lead: leads,
      ownerName: users.name,
    })
    .from(leads)
    .innerJoin(developments, eq(leads.developmentId, developments.id))
    .leftJoin(users, eq(leads.assignedTo, users.id))
    .where(and(eq(developments.developerId, developerId), eq(leads.id, leadId)))
    .limit(1);

  if (!row?.lead) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Lead not found for this developer context.',
    });
  }

  return row;
}

export async function listDeveloperLeads(params: FunnelListParams) {
  const conditions: any[] = [eq(developments.developerId, params.developerId)];

  if (params.developmentId) {
    conditions.push(eq(leads.developmentId, params.developmentId));
  }

  if (params.from) {
    conditions.push(gte(leads.createdAt, params.from));
  }

  if (params.to) {
    conditions.push(lte(leads.createdAt, params.to));
  }

  if (params.q) {
    const q = `%${params.q.toLowerCase()}%`;
    conditions.push(
      or(
        sql`LOWER(${leads.name}) LIKE ${q}`,
        sql`LOWER(${leads.email}) LIKE ${q}`,
        sql`LOWER(COALESCE(${leads.phone}, '')) LIKE ${q}`,
      )!,
    );
  }

  if (params.source) {
    const source = params.source.toLowerCase();
    conditions.push(
      or(
        sql`LOWER(COALESCE(${leads.leadSource}, '')) = ${source}`,
        sql`LOWER(COALESCE(${leads.source}, '')) = ${source}`,
      )!,
    );
  }

  const rows = await db
    .select({
      lead: leads,
      ownerName: users.name,
    })
    .from(leads)
    .innerJoin(developments, eq(leads.developmentId, developments.id))
    .leftJoin(users, eq(leads.assignedTo, users.id))
    .where(and(...conditions))
    .orderBy(desc(leads.createdAt));

  const developmentIds: number[] = Array.from(
    new Set(rows.map(row => Number(row.lead.developmentId || 0)).filter(id => Number.isFinite(id) && id > 0)),
  ) as number[];
  const distributionEnabledMap = await getDistributionEnabledMapForDevelopments(developmentIds);

  const normalized = rows.map(row => {
    const developmentId = Number(row.lead.developmentId || 0);
    const distributionEnabledForDevelopment =
      developmentId > 0 ? distributionEnabledMap.get(developmentId) === true : false;
    return normalizeLeadRow(row.lead, row.ownerName || null, distributionEnabledForDevelopment);
  });

  const filteredByStage = params.stage
    ? normalized.filter(lead => lead.stage === params.stage)
    : normalized;
  const filtered = params.owner
    ? filteredByStage.filter(lead => lead.owner.ownerType === params.owner)
    : filteredByStage;

  const limit = Math.max(1, params.limit ?? 50);
  const offset = Math.max(0, params.offset ?? 0);

  return {
    total: filtered.length,
    items: filtered.slice(offset, offset + limit),
  };
}

export async function assignDeveloperLead(params: AssignParams) {
  const row = await getDeveloperLeadRow(params.developerId, params.leadId);
  const leadDevelopmentId = Number(row.lead.developmentId || 0);
  if (!Number.isFinite(leadDevelopmentId) || leadDevelopmentId <= 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Lead is not attached to a development and cannot be assigned.',
    });
  }

  const distributionEnabledMap = await getDistributionEnabledMapForDevelopments([leadDevelopmentId]);
  const distributionEnabledForDevelopment = distributionEnabledMap.get(leadDevelopmentId) === true;
  const availableOwnerTypes = getAvailableLeadOwnerTypes(distributionEnabledForDevelopment);

  if (!availableOwnerTypes.includes(params.ownerType)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `ownerType ${params.ownerType} is not allowed for this development.`,
    });
  }

  if (params.ownerType === 'distribution_partner') {
    if (!params.ownerId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'ownerId is required when ownerType is distribution_partner.',
      });
    }

    const partnerEligible = await isDistributionPartnerEligibleForDevelopment({
      developmentId: leadDevelopmentId,
      partnerUserId: params.ownerId,
    });
    const gate = evaluateDistributionAssignmentGate({
      ownerType: params.ownerType,
      distributionEnabledForDevelopment,
      partnerEligible,
      leadEligible: isDistributionLeadEligible(row.lead),
    });
    if (!gate.allowed) {
      if (gate.reason === 'partner_ineligible') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Selected distribution partner is not eligible for this development.',
        });
      }
      if (gate.reason === 'lead_ineligible') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Lead is not distribution-eligible. Only distribution/referral-originated leads can be assigned to distribution partners.',
        });
      }
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Distribution is not enabled for this development.',
      });
    }
  }

  if (params.ownerType === 'developer_sales' && !params.ownerId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'ownerId is required when ownerType is developer_sales.',
    });
  }

  const now = new Date().toISOString();
  const updateSet: Partial<typeof leads.$inferInsert> = {
    updatedAt: now,
  };

  if (params.ownerType === 'developer_sales') {
    updateSet.assignedTo = params.ownerId || null;
    updateSet.assignedAt = now;
    updateSet.ownerType = 'agent';
    updateSet.ownerId = null;
    updateSet.notes = appendOwnerOverride(row.lead.notes, 'developer_sales');
  } else if (params.ownerType === 'agency') {
    updateSet.assignedTo = null;
    updateSet.assignedAt = now;
    updateSet.ownerType = 'agency';
    updateSet.ownerId = params.ownerId || null;
    updateSet.notes = appendOwnerOverride(row.lead.notes, 'agency');
  } else if (params.ownerType === 'distribution_partner') {
    updateSet.assignedTo = null;
    updateSet.assignedAt = now;
    updateSet.ownerType = 'agency';
    updateSet.ownerId = params.ownerId || null;
    updateSet.notes = appendOwnerOverride(row.lead.notes, 'distribution_partner');
  } else {
    updateSet.assignedTo = null;
    updateSet.ownerType = 'agent';
    updateSet.ownerId = null;
    updateSet.notes = appendOwnerOverride(row.lead.notes, 'unassigned');
  }

  await db.update(leads).set(updateSet).where(eq(leads.id, params.leadId));

  const updatedRow = await getDeveloperLeadRow(params.developerId, params.leadId);
  return {
    lead: normalizeLeadRow(
      updatedRow.lead,
      updatedRow.ownerName || null,
      distributionEnabledForDevelopment,
    ),
    assignmentMode: params.assignmentMode || 'manual',
  };
}

export async function transitionDeveloperLead(params: TransitionParams) {
  const row = await getDeveloperLeadRow(params.developerId, params.leadId);
  const fromStage = deriveCanonicalLeadStage(row.lead);
  const toStage = params.toStage;

  if (!params.force && !isLeadTransitionAllowed(fromStage, toStage)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Invalid stage transition from ${fromStage} to ${toStage}.`,
    });
  }

  const updateSet: any = {
    ...canonicalStageToUpdate(toStage),
    updatedAt: new Date().toISOString(),
  };

  if (params.notes) {
    updateSet.notes = appendNote(row.lead.notes, params.notes);
  }

  await db.update(leads).set(updateSet).where(eq(leads.id, params.leadId));

  await db.insert(leadActivities).values({
    leadId: params.leadId,
    userId: params.userId,
    ownerType: row.lead.ownerType || 'agent',
    ownerId: row.lead.ownerId || null,
    assignedAgentId: row.lead.assignedAgentId || null,
    visibilityScope: row.lead.visibilityScope || 'private',
    type: 'status_change',
    description: `Transitioned ${fromStage} -> ${toStage}`,
  });

  const updated = await getDeveloperLeadRow(params.developerId, params.leadId);
  const distributionEnabledMap = await getDistributionEnabledMapForDevelopments([
    Number(updated.lead.developmentId || 0),
  ]);
  return {
    fromStage,
    toStage,
    lead: normalizeLeadRow(
      updated.lead,
      updated.ownerName || null,
      distributionEnabledMap.get(Number(updated.lead.developmentId || 0)) === true,
    ),
  };
}

export async function logDeveloperLeadActivity(params: ActivityParams) {
  const row = await getDeveloperLeadRow(params.developerId, params.leadId);
  const dbType: (typeof leadActivities.type.enumValues)[number] =
    params.type === 'whatsapp' ? 'note' : params.type;
  const description =
    params.type === 'whatsapp'
      ? `[whatsapp] ${params.description || 'WhatsApp follow-up'}`
      : params.description || null;

  await db.insert(leadActivities).values({
    leadId: params.leadId,
    userId: params.userId,
    ownerType: row.lead.ownerType || 'agent',
    ownerId: row.lead.ownerId || null,
    assignedAgentId: row.lead.assignedAgentId || null,
    visibilityScope: row.lead.visibilityScope || 'private',
    type: dbType,
    description,
  });

  if (['call', 'email', 'meeting', 'whatsapp'].includes(params.type)) {
    const now = new Date().toISOString();
    await db
      .update(leads)
      .set({
        lastContactedAt: now,
        updatedAt: now,
      })
      .where(eq(leads.id, params.leadId));
  }

  const updated = await getDeveloperLeadRow(params.developerId, params.leadId);
  const distributionEnabledMap = await getDistributionEnabledMapForDevelopments([
    Number(updated.lead.developmentId || 0),
  ]);
  return {
    success: true as const,
    lead: normalizeLeadRow(
      updated.lead,
      updated.ownerName || null,
      distributionEnabledMap.get(Number(updated.lead.developmentId || 0)) === true,
    ),
  };
}

export async function setDeveloperLeadNextAction(params: NextActionParams) {
  const row = await getDeveloperLeadRow(params.developerId, params.leadId);
  const now = new Date().toISOString();
  const notes = appendNote(row.lead.notes, `next_action:${params.type} at ${params.at}`);

  await db
    .update(leads)
    .set({
      nextFollowUp: params.at,
      notes,
      updatedAt: now,
    })
    .where(eq(leads.id, params.leadId));

  await db.insert(leadActivities).values({
    leadId: params.leadId,
    userId: params.userId,
    ownerType: row.lead.ownerType || 'agent',
    ownerId: row.lead.ownerId || null,
    assignedAgentId: row.lead.assignedAgentId || null,
    visibilityScope: row.lead.visibilityScope || 'private',
    type: 'note',
    description: `Next action set: ${params.type} @ ${params.at}`,
  });

  const updated = await getDeveloperLeadRow(params.developerId, params.leadId);
  const distributionEnabledMap = await getDistributionEnabledMapForDevelopments([
    Number(updated.lead.developmentId || 0),
  ]);
  return {
    success: true as const,
    lead: normalizeLeadRow(
      updated.lead,
      updated.ownerName || null,
      distributionEnabledMap.get(Number(updated.lead.developmentId || 0)) === true,
    ),
  };
}

export async function getDeveloperDistributionSettings(params: {
  developerId: number;
  developmentId: number;
}) {
  const [development] = await db
    .select({
      id: developments.id,
    })
    .from(developments)
    .where(and(eq(developments.id, params.developmentId), eq(developments.developerId, params.developerId)))
    .limit(1);

  if (!development) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Development not found for this developer context.',
    });
  }

  const [program] = await db
    .select({
      id: distributionPrograms.id,
      isActive: distributionPrograms.isActive,
      isReferralEnabled: distributionPrograms.isReferralEnabled,
      commissionModel: distributionPrograms.commissionModel,
      tierAccessPolicy: distributionPrograms.tierAccessPolicy,
      defaultCommissionPercent: distributionPrograms.defaultCommissionPercent,
      defaultCommissionAmount: distributionPrograms.defaultCommissionAmount,
      updatedAt: distributionPrograms.updatedAt,
    })
    .from(distributionPrograms)
    .where(eq(distributionPrograms.developmentId, params.developmentId))
    .limit(1);

  const isActive = Number(program?.isActive || 0) === 1;
  const isReferralEnabled = Number(program?.isReferralEnabled || 0) === 1;
  const distributionEnabled = isActive && isReferralEnabled;
  const accessModel =
    !program
      ? ('unknown' as const)
      : program.tierAccessPolicy === 'open'
        ? ('open' as const)
        : program.tierAccessPolicy === 'invite_only'
          ? ('partner_based' as const)
          : ('tier_based' as const);

  const eligibleRows = await db
    .select({
      agentId: distributionAgentAccess.agentId,
      minTierRequired: distributionAgentAccess.minTierRequired,
    })
    .from(distributionAgentAccess)
    .innerJoin(
      distributionIdentities,
      and(
        eq(distributionIdentities.userId, distributionAgentAccess.agentId),
        eq(distributionIdentities.identityType, 'referrer'),
        eq(distributionIdentities.active, 1),
      ),
    )
    .where(
      and(
        eq(distributionAgentAccess.developmentId, params.developmentId),
        eq(distributionAgentAccess.accessStatus, 'active'),
      ),
    );

  const eligiblePartnerIds = new Set<number>();
  const eligiblePartnersByTier: Record<'tier_1' | 'tier_2' | 'tier_3' | 'tier_4', number> = {
    tier_1: 0,
    tier_2: 0,
    tier_3: 0,
    tier_4: 0,
  };

  for (const row of eligibleRows) {
    const agentId = Number(row.agentId || 0);
    if (agentId > 0) eligiblePartnerIds.add(agentId);
    const tier = row.minTierRequired as keyof typeof eligiblePartnersByTier;
    if (tier && tier in eligiblePartnersByTier) {
      eligiblePartnersByTier[tier] += 1;
    }
  }

  const allowedTiers =
    program?.tierAccessPolicy === 'open'
      ? ['tier_1', 'tier_2', 'tier_3', 'tier_4']
      : (Object.entries(eligiblePartnersByTier)
          .filter(([, count]) => count > 0)
          .map(([tier]) => tier) as Array<'tier_1' | 'tier_2' | 'tier_3' | 'tier_4'>);

  return {
    developmentId: String(params.developmentId),
    programId: program ? String(program.id) : null,
    hasProgram: !!program,
    distributionEnabled,
    isActive,
    isReferralEnabled,
    accessModel,
    tierAccessPolicy: program?.tierAccessPolicy || null,
    commissionModel: program?.commissionModel || null,
    defaultCommissionPercent:
      program?.defaultCommissionPercent != null ? Number(program.defaultCommissionPercent) : null,
    defaultCommissionAmount:
      program?.defaultCommissionAmount != null ? Number(program.defaultCommissionAmount) : null,
    eligiblePartnerCount: eligiblePartnerIds.size,
    eligiblePartnersByTier,
    allowedTiers,
    updatedAt: program?.updatedAt || null,
    availableOwnerTypes: distributionEnabled
      ? getAvailableLeadOwnerTypes(true)
      : getAvailableLeadOwnerTypes(false),
  };
}

export async function setDeveloperDistributionEnabled(params: {
  developerId: number;
  userId: number;
  developmentId: number;
  enabled: boolean;
}) {
  const [development] = await db
    .select({
      id: developments.id,
    })
    .from(developments)
    .where(and(eq(developments.id, params.developmentId), eq(developments.developerId, params.developerId)))
    .limit(1);

  if (!development) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Development not found for this developer context.',
    });
  }

  const [program] = await db
    .select({
      id: distributionPrograms.id,
    })
    .from(distributionPrograms)
    .where(eq(distributionPrograms.developmentId, params.developmentId))
    .limit(1);

  if (!program && params.enabled) {
    await db.insert(distributionPrograms).values({
      developmentId: params.developmentId,
      isActive: 1,
      isReferralEnabled: 1,
      commissionModel: 'flat_percentage',
      tierAccessPolicy: 'restricted',
      createdBy: params.userId,
      updatedBy: params.userId,
    });
  } else if (program) {
    await db
      .update(distributionPrograms)
      .set({
        isActive: 1,
        isReferralEnabled: params.enabled ? 1 : 0,
        updatedBy: params.userId,
      })
      .where(eq(distributionPrograms.id, Number(program.id)));
  }

  return await getDeveloperDistributionSettings({
    developerId: params.developerId,
    developmentId: params.developmentId,
  });
}

export async function getDeveloperFunnelKpis(params: {
  developerId: number;
  developmentId?: number;
  range: '7d' | '30d' | '90d';
}) {
  const now = new Date();
  const from = new Date(now);
  const days = params.range === '7d' ? 7 : params.range === '90d' ? 90 : 30;
  from.setDate(now.getDate() - days);

  const { items } = await listDeveloperLeads({
    developerId: params.developerId,
    developmentId: params.developmentId,
    from: from.toISOString(),
    to: now.toISOString(),
    limit: 5000,
    offset: 0,
  });

  const stageCounts: Record<LeadStage, number> = {
    new: 0,
    contacted: 0,
    qualified: 0,
    viewing_scheduled: 0,
    viewing_completed: 0,
    offer_made: 0,
    deal_in_progress: 0,
    closed_won: 0,
    closed_lost: 0,
    spam: 0,
    duplicate: 0,
    archived: 0,
  };

  const slaCounts: Record<SlaStatus, number> = { ok: 0, warning: 0, breach: 0 };
  const bySource: Record<string, number> = {};

  for (const lead of items) {
    stageCounts[lead.stage] += 1;
    slaCounts[lead.sla.status] += 1;
    const source = lead.source.channel || 'unknown';
    bySource[source] = (bySource[source] || 0) + 1;
  }

  const total = items.length;
  const openStages = new Set([
    'new',
    'contacted',
    'qualified',
    'viewing_scheduled',
    'viewing_completed',
    'offer_made',
    'deal_in_progress',
  ] as const);

  const openLeads = items.filter(lead => openStages.has(lead.stage as any));
  const qualifiedLeads = items.filter(lead => lead.stage === 'qualified');

  const avgOpenLeadAgeHours =
    openLeads.length > 0
      ? Number(
          (
            openLeads.reduce((sum, lead) => {
              const created = new Date(lead.createdAt);
              if (Number.isNaN(created.getTime())) return sum;
              return sum + (Date.now() - created.getTime()) / 3600000;
            }, 0) / openLeads.length
          ).toFixed(1),
        )
      : 0;

  const avgQualifiedLeadAgeHoursProxy =
    qualifiedLeads.length > 0
      ? Number(
          (
            qualifiedLeads.reduce((sum, lead) => {
              const created = new Date(lead.createdAt);
              if (Number.isNaN(created.getTime())) return sum;
              return sum + (Date.now() - created.getTime()) / 3600000;
            }, 0) / qualifiedLeads.length
          ).toFixed(1),
        )
      : 0;

  const firstContactSamples = items
    .map(lead => lead.sla?.timeToFirstContactMins)
    .filter((mins): mins is number => typeof mins === 'number' && mins >= 0);
  const avgTimeToFirstContactMins =
    firstContactSamples.length > 0
      ? Number(
          (
            firstContactSamples.reduce((sum, mins) => sum + mins, 0) / firstContactSamples.length
          ).toFixed(1),
        )
      : 0;

  const overallConversionRate = total > 0 ? (stageCounts.closed_won / total) * 100 : 0;
  const newToQualifiedRate =
    stageCounts.new > 0
      ? ((stageCounts.qualified +
          stageCounts.viewing_scheduled +
          stageCounts.viewing_completed +
          stageCounts.offer_made +
          stageCounts.deal_in_progress +
          stageCounts.closed_won) /
          stageCounts.new) *
        100
      : 0;
  const qualifiedToOfferRate =
    stageCounts.qualified > 0
      ? ((stageCounts.offer_made + stageCounts.deal_in_progress + stageCounts.closed_won) /
          stageCounts.qualified) *
        100
      : 0;
  const offerToWonRate =
    stageCounts.offer_made > 0
      ? ((stageCounts.deal_in_progress + stageCounts.closed_won) / stageCounts.offer_made) * 100
      : 0;

  return {
    range: params.range,
    totalLeads: total,
    stageCounts,
    slaCounts,
    bySource,
    conversion: {
      overallConversionRate: Number(overallConversionRate.toFixed(1)),
      newToQualifiedRate: Number(newToQualifiedRate.toFixed(1)),
      qualifiedToOfferRate: Number(qualifiedToOfferRate.toFixed(1)),
      offerToWonRate: Number(offerToWonRate.toFixed(1)),
    },
    velocity: {
      avgTimeToFirstContactMins,
      avgOpenLeadAgeHours,
      avgQualifiedLeadAgeHoursProxy,
    },
  };
}

export async function getDeveloperFunnelAttention(params: {
  developerId: number;
  developmentId?: number;
  sla?: SlaStatus;
  limit?: number;
  range?: '7d' | '30d' | '90d';
}) {
  const now = new Date();
  const from = new Date(now);
  const days = params.range === '7d' ? 7 : params.range === '90d' ? 90 : 30;
  from.setDate(now.getDate() - days);

  const { items } = await listDeveloperLeads({
    developerId: params.developerId,
    developmentId: params.developmentId,
    from: from.toISOString(),
    to: now.toISOString(),
    limit: 5000,
    offset: 0,
  });

  const warnings = items.filter(lead => lead.sla.status === 'warning');
  const breaches = items.filter(lead => lead.sla.status === 'breach');

  const addReason = (lead: (typeof items)[number]) => {
    let attentionReason = 'Lead requires attention.';
    if (lead.sla.status === 'breach') attentionReason = 'SLA breached, immediate follow-up needed.';
    else if (lead.sla.status === 'warning') attentionReason = 'SLA warning, follow-up due soon.';

    if (lead.nextAction?.at) {
      const next = new Date(lead.nextAction.at);
      if (!Number.isNaN(next.getTime()) && next.getTime() < Date.now()) {
        attentionReason = 'Next action is overdue.';
      }
    }

    return {
      ...lead,
      attentionReason,
    };
  };

  const filteredBase = items.filter(lead => {
    if (!params.sla) return lead.sla.status === 'warning' || lead.sla.status === 'breach';
    return lead.sla.status === params.sla;
  });
  const filtered = filteredBase.map(addReason);

  const limit = Math.max(1, params.limit ?? 50);
  return {
    breachCount: breaches.length,
    warningCount: warnings.length,
    total: filtered.length,
    items: filtered.slice(0, limit),
  };
}
