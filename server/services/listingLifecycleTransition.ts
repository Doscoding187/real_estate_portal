/** A real calendar date (YYYY-MM-DD) that is not after today (UTC). */
export function isValidPastOrTodayDate(value: string, now: Date = new Date()): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return false;
  }
  return value <= now.toISOString().slice(0, 10);
}

export type ListingLifecycleChange = 'sold' | 'let' | 'unpublish' | 'republish';

export class ListingLifecycleError extends Error {
  constructor(
    message: string,
    readonly kind: 'not_found' | 'invalid_transition',
  ) {
    super(message);
    this.name = 'ListingLifecycleError';
  }
}

/**
 * Pure transition rule for the lister-driven lifecycle. Sold and Let are the
 * only statuses that retire a published home as "no longer available"; both
 * use existing enum values (listings.status sold/rented, properties.status
 * sold/rented). Unpublish reuses the existing archive state. Republish returns
 * the listing to a private draft so it is resubmitted through the ordinary
 * submission and approval rule.
 */
export function resolveListingLifecycleTransition(
  change: ListingLifecycleChange,
  listing: {
    status?: unknown;
    action?: unknown;
    revisionOfListingId?: unknown;
    publishedAt?: unknown;
  },
): { noop: boolean; nextStatus: 'sold' | 'rented' | 'archived' | 'draft' } {
  const status = String(listing.status || '');
  const action = String(listing.action || '');
  if (listing.revisionOfListingId != null) {
    throw new ListingLifecycleError(
      'A private revision cannot be marked sold, let or unpublished. Use the original listing.',
      'invalid_transition',
    );
  }
  switch (change) {
    case 'sold':
      if (action !== 'sell' && action !== 'auction') {
        throw new ListingLifecycleError(
          'Only sale listings can be marked as sold. Mark a rental as let instead.',
          'invalid_transition',
        );
      }
      if (status === 'sold') return { noop: true, nextStatus: 'sold' };
      if (status !== 'published') {
        throw new ListingLifecycleError(
          `Only a published listing can be marked as sold (current status: ${status}).`,
          'invalid_transition',
        );
      }
      return { noop: false, nextStatus: 'sold' };
    case 'let':
      if (action !== 'rent') {
        throw new ListingLifecycleError(
          'Only rental listings can be marked as let. Mark a sale as sold instead.',
          'invalid_transition',
        );
      }
      if (status === 'rented') return { noop: true, nextStatus: 'rented' };
      if (status !== 'published') {
        throw new ListingLifecycleError(
          `Only a published listing can be marked as let (current status: ${status}).`,
          'invalid_transition',
        );
      }
      return { noop: false, nextStatus: 'rented' };
    case 'unpublish':
      if (status === 'archived') return { noop: true, nextStatus: 'archived' };
      if (!['published', 'sold', 'rented'].includes(status)) {
        throw new ListingLifecycleError(
          `Only a published, sold or let listing can be unpublished (current status: ${status}).`,
          'invalid_transition',
        );
      }
      return { noop: false, nextStatus: 'archived' };
    case 'republish':
      if (status !== 'archived' || !listing.publishedAt) {
        throw new ListingLifecycleError(
          `Only an unpublished listing can be republished (current status: ${status}).`,
          'invalid_transition',
        );
      }
      return { noop: false, nextStatus: 'draft' };
  }
}
