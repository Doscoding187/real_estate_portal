const CLOSED_STATUSES = ['sold', 'rented', 'archived'];
const PUBLIC_PROPERTY_STATUSES = ['published', 'available'];

/**
 * Whether a services request may link to a property or listing.
 *
 * - A sold, let or unpublished (archived) home is never a valid link target.
 * - The owner may link their own not-yet-public listing (private preparation).
 * - Anyone else may link only a home that is publicly eligible right now.
 */
export function isServiceLeadLinkAllowed(input: {
  record: { status?: unknown; ownerId?: unknown } | null | undefined;
  requesterUserId: number;
  kind: 'property' | 'listing';
  /** Result of the public-eligibility gate; only consulted for non-owners. */
  publiclyEligible: boolean;
}): boolean {
  const { record } = input;
  if (!record) return false;
  const status = String(record.status || '');
  if (CLOSED_STATUSES.includes(status)) return false;
  if (Number(record.ownerId || 0) === input.requesterUserId) return true;
  const publicStatuses = input.kind === 'listing' ? ['published'] : PUBLIC_PROPERTY_STATUSES;
  return publicStatuses.includes(status) && input.publiclyEligible;
}
