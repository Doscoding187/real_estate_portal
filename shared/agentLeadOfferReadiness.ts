/**
 * Transport-safe contract for an agent's manually recorded offer checks.
 *
 * The immutable activity timeline stores each snapshot in `lead_activities`
 * metadata. The latest valid snapshot is combined with the canonical lead
 * transition rules by the server before an offer stage can be entered.
 */
export const AGENT_LEAD_OFFER_READINESS_METADATA_KIND = 'agent_lead_offer_readiness';
export const AGENT_LEAD_OFFER_READINESS_METADATA_VERSION = 1;

export type AgentLeadOfferReadiness = {
  viewingCompleted: boolean;
  feedbackLogged: boolean;
  affordabilityConfirmed: boolean;
};

export const DEFAULT_AGENT_LEAD_OFFER_READINESS: AgentLeadOfferReadiness = {
  viewingCompleted: false,
  feedbackLogged: false,
  affordabilityConfirmed: false,
};

export type AgentLeadOfferReadinessMetadata = {
  kind: typeof AGENT_LEAD_OFFER_READINESS_METADATA_KIND;
  version: typeof AGENT_LEAD_OFFER_READINESS_METADATA_VERSION;
  readiness: AgentLeadOfferReadiness;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeAgentLeadOfferReadiness(
  value: Partial<AgentLeadOfferReadiness> | null | undefined,
): AgentLeadOfferReadiness {
  return {
    viewingCompleted: Boolean(value?.viewingCompleted),
    feedbackLogged: Boolean(value?.feedbackLogged),
    affordabilityConfirmed: Boolean(value?.affordabilityConfirmed),
  };
}

export function isAgentLeadOfferReadinessComplete(value: AgentLeadOfferReadiness): boolean {
  return value.viewingCompleted && value.feedbackLogged && value.affordabilityConfirmed;
}

export function serializeAgentLeadOfferReadiness(
  value: AgentLeadOfferReadiness,
): AgentLeadOfferReadinessMetadata {
  return {
    kind: AGENT_LEAD_OFFER_READINESS_METADATA_KIND,
    version: AGENT_LEAD_OFFER_READINESS_METADATA_VERSION,
    readiness: normalizeAgentLeadOfferReadiness(value),
  };
}

/**
 * Parses a snapshot defensively so unrelated historical activity metadata is
 * never treated as offer-readiness evidence.
 */
export function parseAgentLeadOfferReadiness(value: unknown): AgentLeadOfferReadiness | null {
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!isRecord(parsed)) return null;
  if (parsed.kind !== AGENT_LEAD_OFFER_READINESS_METADATA_KIND) return null;
  if (parsed.version !== AGENT_LEAD_OFFER_READINESS_METADATA_VERSION) return null;
  if (!isRecord(parsed.readiness)) return null;

  return normalizeAgentLeadOfferReadiness(parsed.readiness);
}
