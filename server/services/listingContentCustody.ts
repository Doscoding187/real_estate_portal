/**
 * Private generic-Listing access is decided from the materialized ownership
 * fields on the Listing itself.  This deliberately does not infer custody
 * from display data, a historical owner join, or a different agency record.
 */

export type ListingContentCustody = {
  ownerId?: number | string | null;
  agentId?: number | string | null;
  agencyId?: number | string | null;
};

export type ListingContentActor = {
  userId: number;
  role: string | null | undefined;
  agencyId: number | string | null | undefined;
  agent: {
    id: number | string | null | undefined;
    userId: number | string | null | undefined;
    agencyId: number | string | null | undefined;
    status: string | null | undefined;
  } | null;
};

function positiveId(value: unknown): number | null {
  if (typeof value === 'string' && !value.trim()) return null;
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : null;
}

function role(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function agencyAssignmentsAreCoherent(
  listingAgencyId: number | null,
  agentAgencyId: number | null,
): boolean {
  return (
    (listingAgencyId === null && agentAgencyId === null) ||
    (listingAgencyId !== null && listingAgencyId === agentAgencyId)
  );
}

/**
 * Returns whether an actor may read or edit private generic Listing content,
 * issue/confirm its media reservation, or inspect its performance data.
 *
 * An assigned agent must still be an approved profile and must have an exact,
 * coherent agency claim with the Listing.  An agency administrator only gets
 * access through the exact materialized Listing agency.  Those constraints
 * prevent assignment or membership drift from widening across tenants.
 */
export function canManageListingContent(
  listing: ListingContentCustody,
  actor: ListingContentActor,
): boolean {
  const actorUserId = positiveId(actor.userId);
  if (actorUserId === null) return false;

  const actorRole = role(actor.role);
  if (actorRole === 'super_admin') return true;

  if (positiveId(listing.ownerId) === actorUserId) return true;

  const listingAgencyId = positiveId(listing.agencyId);
  const actorAgencyId = positiveId(actor.agencyId);
  if (
    actorRole === 'agency_admin' &&
    listingAgencyId !== null &&
    listingAgencyId === actorAgencyId
  ) {
    return true;
  }

  const agent = actor.agent;
  if (!agent || actorRole !== 'agent' || String(agent.status || '').toLowerCase() !== 'approved') {
    return false;
  }

  const agentId = positiveId(agent.id);
  if (
    agentId === null ||
    agentId !== positiveId(listing.agentId) ||
    positiveId(agent.userId) !== actorUserId
  ) {
    return false;
  }

  return agencyAssignmentsAreCoherent(listingAgencyId, positiveId(agent.agencyId));
}
