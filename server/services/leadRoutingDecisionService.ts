import { eq } from 'drizzle-orm';
import { buyerLeads, leadEvents, leadRoutingDecisions } from '../../drizzle/schema';
import { getDb } from '../db';
import {
  type CreditReportStatus,
  type LeadRoutingOutcome,
  type LeadRoutingOwnerType,
  type LeadSourceType,
} from '../../shared/leadRouting';

type LeadRoutingDecisionInsert = typeof leadRoutingDecisions.$inferInsert;

export type RoutingDecisionMatchInput = {
  selectedMatchId?: number | null;
  developmentId?: number | null;
  distributionReady?: boolean;
  submissionAllowed?: boolean;
  matchLabel?: string | null;
};

export type DecideLeadRoutingInput = {
  buyerLeadId: number;
  sessionId?: number | null;
  campaignId?: number | null;
  sourceType?: LeadSourceType | null;
  preferredContactMethod?: 'phone' | 'whatsapp' | 'email' | 'any' | null;
  creditReportStatus?: CreditReportStatus | null;
  assignedUserId?: number | null;
  ownerId?: number | null;
  match?: RoutingDecisionMatchInput | null;
  metadata?: Record<string, unknown> | null;
};

export type LeadRoutingDecision = {
  outcome: LeadRoutingOutcome;
  ownerType: LeadRoutingOwnerType;
  reason: string;
};

export function decideLeadRouting(input: DecideLeadRoutingInput): LeadRoutingDecision {
  if (input.creditReportStatus === 'needs_help') {
    return {
      outcome: 'route_to_credit_readiness',
      ownerType: 'credit_readiness',
      reason: 'Buyer asked for help checking or understanding credit readiness.',
    };
  }

  const match = input.match ?? null;
  if (!match?.developmentId) {
    return {
      outcome: 'route_to_general_review',
      ownerType: 'general_review',
      reason: 'No selected development match is available for this lead.',
    };
  }

  if (match.distributionReady && match.submissionAllowed) {
    return {
      outcome: 'route_to_distribution_program',
      ownerType: 'distribution_program',
      reason: 'Selected development is distribution-ready and currently accepts submissions.',
    };
  }

  if (match.distributionReady && !match.submissionAllowed) {
    return {
      outcome: 'route_to_internal_sales',
      ownerType: 'internal_sales',
      reason:
        'Selected development is distribution-ready but lead submission is not currently open.',
    };
  }

  if (input.preferredContactMethod === 'whatsapp') {
    return {
      outcome: 'route_to_whatsapp_followup',
      ownerType: 'whatsapp',
      reason: 'Buyer selected WhatsApp follow-up and development needs manual handling.',
    };
  }

  return {
    outcome: 'route_to_general_review',
    ownerType: 'general_review',
    reason:
      'Selected development is not ready for distribution handoff; route for internal review.',
  };
}

export function buildLeadRoutingDecisionPayload(
  input: DecideLeadRoutingInput,
): LeadRoutingDecisionInsert {
  const decision = decideLeadRouting(input);
  const match = input.match ?? null;

  return {
    buyerLeadId: input.buyerLeadId,
    sessionId: input.sessionId ?? null,
    campaignId: input.campaignId ?? null,
    selectedMatchId: match?.selectedMatchId ?? null,
    developmentId: match?.developmentId ?? null,
    sourceType: input.sourceType ?? 'direct',
    outcome: decision.outcome,
    ownerType: decision.ownerType,
    ownerId: input.ownerId ?? null,
    assignedUserId: input.assignedUserId ?? null,
    reason: decision.reason,
    metadata: input.metadata ?? null,
  };
}

export async function createLeadRoutingDecision(input: DecideLeadRoutingInput) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const payload = buildLeadRoutingDecisionPayload(input);
  const insertResult = await db.insert(leadRoutingDecisions).values(payload);
  const routingDecisionId = Number((insertResult as any)?.[0]?.insertId || 0);
  if (!routingDecisionId) throw new Error('Failed to create lead routing decision');

  await db.insert(leadEvents).values({
    buyerLeadId: input.buyerLeadId,
    sessionId: input.sessionId ?? null,
    campaignId: input.campaignId ?? null,
    sourceType: input.sourceType ?? 'direct',
    eventType: 'routing_decided',
    payload: {
      routingDecisionId,
      outcome: payload.outcome,
      ownerType: payload.ownerType,
      selectedMatchId: payload.selectedMatchId,
      developmentId: payload.developmentId,
      reason: payload.reason,
    },
  });

  if (payload.outcome === 'route_to_distribution_program') {
    await db
      .update(buyerLeads)
      .set({ status: 'qualified_light' })
      .where(eq(buyerLeads.id, input.buyerLeadId));
  }

  return {
    routingDecisionId,
    outcome: payload.outcome,
    ownerType: payload.ownerType,
    reason: payload.reason,
  };
}
