import { and, desc, eq, like } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { leadActivities, leads } from '../../drizzle/schema';
import {
  AGENT_LEAD_OFFER_READINESS_METADATA_KIND,
  AGENT_LEAD_OFFER_READINESS_METADATA_VERSION,
  DEFAULT_AGENT_LEAD_OFFER_READINESS,
  isAgentLeadOfferReadinessComplete,
  parseAgentLeadOfferReadiness,
  type AgentLeadOfferReadiness,
} from '../../shared/agentLeadOfferReadiness';
import type { getDb } from '../db';
import { deriveLeadReadiness } from './leadTransitionService';

const OFFER_READINESS_QUALIFICATION_BLOCKER = 'Qualification must be recorded before offer work.';
const OFFER_READINESS_METADATA_PATTERN = `%"kind":"${AGENT_LEAD_OFFER_READINESS_METADATA_KIND}","version":${AGENT_LEAD_OFFER_READINESS_METADATA_VERSION}%`;

const OFFER_READINESS_CHECKS: Array<{
  key: keyof AgentLeadOfferReadiness;
  missingMessage: string;
  completedLabel: string;
}> = [
  {
    key: 'viewingCompleted',
    missingMessage: 'Record that the viewing is complete before sending an offer.',
    completedLabel: 'Viewing completed',
  },
  {
    key: 'feedbackLogged',
    missingMessage: 'Log the buyer feedback before sending an offer.',
    completedLabel: 'Buyer feedback logged',
  },
  {
    key: 'affordabilityConfirmed',
    missingMessage: 'Confirm buyer affordability or qualification before sending an offer.',
    completedLabel: 'Affordability or qualification confirmed',
  },
];

export type AgentOfferReadinessSummary = {
  readiness: AgentLeadOfferReadiness;
  canMoveToOffer: boolean;
  blockers: string[];
};

type AgentLeadDatabase = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export function describeAgentOfferReadiness(readiness: AgentLeadOfferReadiness) {
  const completed = OFFER_READINESS_CHECKS.filter(item => readiness[item.key]).map(
    item => item.completedLabel,
  );
  return completed.length
    ? `Offer readiness updated: ${completed.join(', ')}.`
    : 'Offer readiness reset. Complete the checks before sending an offer.';
}

/** Read the single latest durable checklist snapshot used by every lead stage surface. */
export async function getAgentLeadOfferReadiness(
  db: AgentLeadDatabase,
  lead: typeof leads.$inferSelect,
): Promise<AgentOfferReadinessSummary> {
  const activities = await db
    .select({ metadata: leadActivities.metadata })
    .from(leadActivities)
    .where(
      and(
        eq(leadActivities.leadId, lead.id),
        like(leadActivities.metadata, OFFER_READINESS_METADATA_PATTERN),
      ),
    )
    .orderBy(desc(leadActivities.createdAt), desc(leadActivities.id))
    .limit(1);

  const persistedReadiness =
    activities
      .map(activity => parseAgentLeadOfferReadiness(activity.metadata))
      .find((readiness): readiness is AgentLeadOfferReadiness => readiness !== null) ||
    DEFAULT_AGENT_LEAD_OFFER_READINESS;
  const canonicalReadiness = deriveLeadReadiness(lead);
  const canonicalBlockers = canonicalReadiness.blockers.filter(
    blocker => blocker !== OFFER_READINESS_QUALIFICATION_BLOCKER,
  );
  const checklistBlockers = OFFER_READINESS_CHECKS.filter(
    item => !persistedReadiness[item.key],
  ).map(item => item.missingMessage);

  return {
    readiness: persistedReadiness,
    canMoveToOffer:
      canonicalBlockers.length === 0 && isAgentLeadOfferReadinessComplete(persistedReadiness),
    blockers: [...canonicalBlockers, ...checklistBlockers],
  };
}

/** Apply the same persisted checklist gate at every offer and deal-entry surface. */
export async function requireAgentLeadOfferReadiness(
  db: AgentLeadDatabase,
  lead: typeof leads.$inferSelect,
) {
  const readiness = await getAgentLeadOfferReadiness(db, lead);
  if (!readiness.canMoveToOffer) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: readiness.blockers.join(' ') });
  }
  return readiness;
}
