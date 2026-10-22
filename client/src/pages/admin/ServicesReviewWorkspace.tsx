import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { formatPriceRange } from '@/features/services/catalog';
import ServicesReviewModerationPanel from './ServicesReviewModerationPanel';

/**
 * Private super-admin review surface for the Services publication authority.
 *
 * This surface only *reports* canonical provider state and forwards a
 * reviewer's decision to the reviewed transition. It never writes publication
 * state itself: `reviewProviderPublication` re-checks readiness inside its own
 * transaction and is the single writer of partner verification and directory
 * publication.
 *
 * The queue deliberately shows listed coverage as the province/city/suburb the
 * provider submitted. It never presents a radius or a distance claim.
 */

type QueueView = 'all' | 'ready' | 'awaiting_review' | 'published' | 'blocked' | 'drifted';

const VIEWS: Array<{ id: QueueView; label: string }> = [
  { id: 'all', label: 'All providers' },
  { id: 'awaiting_review', label: 'Awaiting review' },
  { id: 'ready', label: 'Ready' },
  { id: 'published', label: 'Published' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'drifted', label: 'Drifted' },
];

const BLOCKER_LABELS: Record<string, string> = {
  partner_inactive: 'Partner account is inactive',
  profile_missing: 'Provider profile is missing',
  profile_incomplete: 'Profile needs a headline, biography and a contact channel',
  no_active_service: 'No active service',
  no_valid_coverage: 'No listed coverage area',
  subscription_ineligible: 'Subscription is not trial or active',
};

function coverageLabel(area: {
  province: string | null;
  city: string | null;
  suburb: string | null;
}): string {
  return [area.suburb, area.city, area.province].filter(Boolean).join(', ') || 'Unspecified';
}

/**
 * The review worklist shows the same price authority the public provider
 * profile shows, so a reviewer sees exactly what a consumer will see.
 */
function priceLabel(service: { minPrice: number | null; maxPrice: number | null }): string {
  return service.minPrice != null && service.maxPrice != null
    ? ` · ${formatPriceRange(service.minPrice, service.maxPrice)}`
    : ' · Price on request';
}

export default function ServicesReviewWorkspace() {
  const utils = trpc.useUtils();
  const [section, setSection] = useState<'publication' | 'reviews'>('publication');
  const [view, setView] = useState<QueueView>('awaiting_review');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState<Record<number, string>>({});

  const queue = trpc.servicesEngine.listProviderPublicationQueue.useQuery({
    view,
    page,
    limit: 25,
    search: search.trim() || undefined,
  });

  const invalidateQueue = () => {
    void utils.servicesEngine.listProviderPublicationQueue.invalidate();
    void utils.servicesEngine.providerPublicationReadiness.invalidate();
  };

  const review = trpc.servicesEngine.reviewProviderPublication.useMutation({
    onSuccess: invalidateQueue,
    onError: invalidateQueue,
  });

  const counts = queue.data?.counts;
  const entries = queue.data?.entries ?? [];

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <header>
        <p className="text-sm font-medium text-emerald-700">Operations · Services</p>
        <h1 className="text-2xl font-semibold">Services review workspace</h1>
        <p className="mt-2 text-sm text-slate-600">
          Provider publication and customer reviews are reviewed transitions, not self-service
          actions. Every decision is recorded in the audit log.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 border-b pb-3">
        <button
          type="button"
          aria-pressed={section === 'publication'}
          onClick={() => setSection('publication')}
          className={
            section === 'publication'
              ? 'rounded bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white'
              : 'rounded border bg-white px-3 py-1.5 text-sm'
          }
        >
          Provider publication
        </button>
        <button
          type="button"
          aria-pressed={section === 'reviews'}
          onClick={() => setSection('reviews')}
          className={
            section === 'reviews'
              ? 'rounded bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white'
              : 'rounded border bg-white px-3 py-1.5 text-sm'
          }
        >
          Customer reviews
        </button>
      </div>

      {section === 'publication' && (<>
      {counts && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(
            [
              ['Awaiting review', counts.awaitingReview],
              ['Ready', counts.ready],
              ['Published', counts.published],
              ['Blocked', counts.blocked],
              ['Drifted', counts.drifted],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded border bg-white p-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
              <dd className="text-xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {VIEWS.map(item => (
          <button
            key={item.id}
            type="button"
            aria-pressed={view === item.id}
            onClick={() => {
              setView(item.id);
              setPage(1);
            }}
            className={
              view === item.id
                ? 'rounded bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white'
                : 'rounded border bg-white px-3 py-1.5 text-sm'
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={event => {
          event.preventDefault();
          setPage(1);
        }}
      >
        <input
          aria-label="Search service providers by company name"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Company name"
          className="min-w-0 flex-1 rounded border p-2 text-sm"
        />
        <button type="submit" className="rounded border bg-white px-4 py-2 text-sm font-semibold">
          Search
        </button>
      </form>

      {queue.isLoading && (
        <p className="rounded border bg-white p-4 text-sm text-slate-600">Loading review queue…</p>
      )}
      {queue.error && (
        <p
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {queue.error.message}
        </p>
      )}
      {!queue.isLoading && !queue.error && entries.length === 0 && (
        <p className="rounded border bg-white p-4 text-sm text-slate-600">
          No service providers match this view.
        </p>
      )}

      <ul className="space-y-4">
        {entries.map(entry => {
          const note = notes[entry.providerId] || '';
          const busy = review.isPending;
          const canPublish = entry.readyForPublication && !entry.isPublished;
          const canUnpublish = entry.isPublished;
          const canReject = entry.verificationStatus !== 'rejected';

          return (
            <li key={entry.providerId} className="rounded border bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{entry.companyName || 'Unnamed provider'}</p>
                  <p className="text-xs text-slate-500">
                    Provider #{entry.providerId} · verification {entry.verificationStatus} ·
                    subscription {entry.subscriptionStatus ?? 'none'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span
                    className={
                      entry.isPublished
                        ? 'rounded bg-emerald-100 px-2 py-1 font-semibold text-emerald-800'
                        : 'rounded bg-slate-100 px-2 py-1 text-slate-700'
                    }
                  >
                    {entry.isPublished ? 'Published' : 'Not published'}
                  </span>
                  {entry.publicationDriftDetected && (
                    <span className="rounded bg-amber-100 px-2 py-1 font-semibold text-amber-900">
                      Publication drift
                    </span>
                  )}
                </div>
              </div>

              {entry.publicationDriftDetected && (
                <p className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Directory publication is set while partner verification is not verified.
                  Publishing or unpublishing will resolve the drift.
                </p>
              )}

              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Headline</dt>
                  <dd className="text-slate-800">{entry.headline || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Contact</dt>
                  <dd className="text-slate-800">
                    {entry.contactEmail || entry.contactPhone || '—'}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Biography</dt>
                  <dd className="whitespace-pre-line text-slate-800">{entry.bio || '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Services</dt>
                  <dd className="text-slate-800">
                    {entry.services.length > 0 ? (
                      <ul className="space-y-1">
                        {entry.services.map(service => (
                          <li key={service.serviceCode}>
                            {service.displayName}
                            <span className="text-slate-500"> · {service.category}</span>
                            {priceLabel(service)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      'None active'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">
                    Listed coverage ({entry.validCoverageCount})
                  </dt>
                  <dd className="text-slate-800">
                    {entry.coverageAreas.length > 0
                      ? entry.coverageAreas.map(coverageLabel).join(' · ')
                      : 'None listed'}
                  </dd>
                </div>
              </dl>

              {entry.blockers.length > 0 && (
                <ul className="mt-3 space-y-1 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {entry.blockers.map(blocker => (
                    <li key={blocker}>{BLOCKER_LABELS[blocker] ?? blocker}</li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  aria-label={`Review note for ${entry.companyName || entry.providerId}`}
                  value={note}
                  onChange={event =>
                    setNotes(previous => ({ ...previous, [entry.providerId]: event.target.value }))
                  }
                  placeholder="Optional note recorded with the decision"
                  className="min-w-0 flex-1 rounded border p-2 text-sm"
                />
                <button
                  type="button"
                  disabled={!canPublish || busy}
                  onClick={() =>
                    review.mutate({
                      providerId: entry.providerId,
                      decision: 'publish',
                      notes: note.trim() || undefined,
                    })
                  }
                  className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Publish
                </button>
                <button
                  type="button"
                  disabled={!canUnpublish || busy}
                  onClick={() =>
                    review.mutate({
                      providerId: entry.providerId,
                      decision: 'unpublish',
                      notes: note.trim() || undefined,
                    })
                  }
                  className="rounded border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  Unpublish
                </button>
                <button
                  type="button"
                  disabled={!canReject || busy}
                  onClick={() =>
                    review.mutate({
                      providerId: entry.providerId,
                      decision: 'reject',
                      notes: note.trim() || undefined,
                    })
                  }
                  className="rounded border border-red-300 px-4 py-2 text-sm font-semibold text-red-800 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {review.error && (
        <p
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {review.error.message}
        </p>
      )}

      {queue.data && queue.data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(current => Math.max(1, current - 1))}
            className="rounded border bg-white px-3 py-1.5 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-slate-600">
            Page {queue.data.pagination.page} of {queue.data.pagination.totalPages} ·{' '}
            {queue.data.pagination.total} providers
          </span>
          <button
            type="button"
            disabled={page >= queue.data.pagination.totalPages}
            onClick={() => setPage(current => current + 1)}
            className="rounded border bg-white px-3 py-1.5 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
      </>)}

      {section === 'reviews' && <ServicesReviewModerationPanel />}
    </main>
  );
}
