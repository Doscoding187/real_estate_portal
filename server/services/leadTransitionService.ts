import { sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { leads } from '../../drizzle/schema';

export const FIRST_RESPONSE_SLA_MINUTES = 15;

/**
 * Single source of truth for lead lifecycle rules. Both the Agency workspace
 * and the Agent pipeline enforce these transitions, timestamps and readiness
 * gates so first-response measurement cannot be corrupted by whichever
 * surface performed the update.
 */

export type LeadTransitionStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'converted'
  | 'closed'
  | 'viewing_scheduled'
  | 'offer_sent'
  | 'lost';

export const LEAD_TRANSITIONS: Record<LeadTransitionStatus, LeadTransitionStatus[]> = {
  new: ['contacted', 'qualified', 'viewing_scheduled', 'lost'],
  contacted: ['qualified', 'viewing_scheduled', 'lost'],
  qualified: ['viewing_scheduled', 'offer_sent', 'converted', 'lost'],
  viewing_scheduled: ['offer_sent', 'converted', 'lost'],
  offer_sent: ['converted', 'closed', 'lost'],
  converted: ['closed'],
  closed: [],
  lost: [],
};

export function firstResponseOverdueSql() {
  return sql<number>`CASE
    WHEN ${leads.status} IN ('new', 'contacted', 'qualified', 'viewing_scheduled', 'offer_sent')
      AND ${leads.firstRespondedAt} IS NULL
      AND ${leads.createdAt} <= DATE_SUB(NOW(), INTERVAL ${FIRST_RESPONSE_SLA_MINUTES} MINUTE)
    THEN 1
    ELSE 0
  END`;
}

type LeadRow = typeof leads.$inferSelect;

export function deriveLeadReadiness(lead: LeadRow) {
  const blockers: string[] = [];
  const hasAssignee = Boolean(lead.agentId || lead.assignedTo);
  const hasContact = Boolean(lead.lastContactedAt);
  const qualificationScore = Number(lead.qualificationScore || 0);
  const qualificationStatus = String(lead.qualificationStatus || 'pending');

  if (!hasAssignee) blockers.push('Lead must be assigned before offer work.');
  if (!hasContact) blockers.push('Lead must be contacted before offer work.');
  if (qualificationScore < 60 && qualificationStatus !== 'qualified') {
    blockers.push('Qualification must be recorded before offer work.');
  }

  return {
    canMoveToOffer: blockers.length === 0,
    blockers,
    source: 'server-derived' as const,
  };
}

export function mapStatusToFunnelStage(status: LeadTransitionStatus, fallback: string | null | undefined) {
  if (status === 'qualified') return 'qualification';
  if (status === 'viewing_scheduled') return 'viewing';
  if (status === 'offer_sent' || status === 'converted' || status === 'closed') {
    return fallback || 'conversion';
  }
  if (status === 'lost') return fallback || 'conversion';
  return fallback || 'discovery';
}

/**
 * Enforce the canonical transition map, the lost-reason rule and the
 * offer-readiness gate for every surface that moves a lead.
 */
export function validateLeadTransition(
  lead: LeadRow,
  targetStatus: LeadTransitionStatus,
  options: { lostReason?: string | null } = {},
): void {
  const currentStatus = (lead.status || 'new') as LeadTransitionStatus;
  if (currentStatus === targetStatus) return;

  const allowed = LEAD_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Cannot move lead from ${currentStatus} to ${targetStatus}.`,
    });
  }

  if (targetStatus === 'lost' && !String(options.lostReason || '').trim()) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'A lost reason is required before closing a lead as lost.',
    });
  }

  if (targetStatus === 'offer_sent') {
    const readiness = deriveLeadReadiness(lead);
    if (!readiness.canMoveToOffer) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: readiness.blockers.join(' '),
      });
    }
  }
}

/**
 * Timestamp block shared by every lead-status mutation: first response on
 * the first contact-grade touch, last contact, conversion and lost reason.
 */
export function leadStatusTimestamps(
  lead: LeadRow,
  targetStatus: LeadTransitionStatus,
  now: string,
  input: { lostReason?: string | null } = {},
) {
  return {
    lastContactedAt:
      targetStatus === 'contacted' || targetStatus === 'qualified' ? now : lead.lastContactedAt,
    firstRespondedAt:
      (targetStatus === 'contacted' || targetStatus === 'qualified') && !lead.firstRespondedAt
        ? now
        : lead.firstRespondedAt,
    convertedAt: targetStatus === 'converted' || targetStatus === 'closed' ? now : lead.convertedAt,
    lostReason: targetStatus === 'lost' ? input.lostReason || lead.lostReason : lead.lostReason,
    funnelStage: mapStatusToFunnelStage(targetStatus, lead.funnelStage) as any,
  };
}
