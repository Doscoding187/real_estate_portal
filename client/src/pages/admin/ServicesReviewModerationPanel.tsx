import { useState } from 'react';
import { trpc } from '@/lib/trpc';

const REVIEW_VIEWS = [
  { id: 'pending', label: 'Pending' },
  { id: 'published', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All reviews' },
] as const;

const REPORT_VIEWS = [
  { id: 'pending', label: 'Open reports' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'dismissed', label: 'Dismissed' },
  { id: 'all', label: 'All reports' },
] as const;

const REPORT_REASON_LABELS: Record<string, string> = {
  abuse: 'Abuse or harassment',
  spam: 'Spam or advertising',
  false_information: 'False information',
  privacy: 'Privacy concern',
  other: 'Other',
};

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5 stars`} className="text-amber-500">
      {'★'.repeat(rating)}
      <span className="text-slate-300">{'★'.repeat(Math.max(0, 5 - rating))}</span>
    </span>
  );
}

function Pager({
  page,
  totalPages,
  total,
  label,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  label: string;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(Math.max(1, page - 1))}
        className="rounded border bg-white px-3 py-1.5 disabled:opacity-50"
      >
        Previous
      </button>
      <span className="text-slate-600">
        Page {page} of {totalPages} · {total} {label}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className="rounded border bg-white px-3 py-1.5 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}

function ReviewQueue() {
  const utils = trpc.useUtils();
  const [view, setView] = useState<'pending' | 'published' | 'rejected' | 'all'>('pending');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState<Record<number, string>>({});

  const queue = trpc.servicesEngine.listProviderReviewModerationQueue.useQuery({
    view,
    page,
    limit: 25,
    search: search.trim() || undefined,
  });
  const invalidate = () => {
    void utils.servicesEngine.listProviderReviewModerationQueue.invalidate();
    void utils.servicesEngine.listProviderReviewReportQueue.invalidate();
    void utils.servicesEngine.getProviderReviews.invalidate();
    void utils.servicesEngine.getProviderPublicProfile.invalidate();
  };
  const moderate = trpc.servicesEngine.reviewProviderReview.useMutation({
    onSuccess: () => {
      setNotes({});
      invalidate();
    },
    onError: invalidate,
  });

  const counts = queue.data?.counts;
  const entries = queue.data?.entries ?? [];

  return (
    <div className="space-y-5">
      {counts && (
        <dl className="grid grid-cols-3 gap-3">
          {(
            [
              ['Pending', counts.pending],
              ['Approved', counts.published],
              ['Rejected', counts.rejected],
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
        {REVIEW_VIEWS.map(item => (
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
          aria-label="Search customer reviews"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Provider, reviewer, or review text"
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
          No customer reviews match this view.
        </p>
      )}

      <ul className="space-y-4">
        {entries.map(entry => {
          const note = notes[entry.id] || '';
          const busy = moderate.isPending;
          return (
            <li key={entry.id} className="rounded border bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{entry.companyName || 'Unknown provider'}</p>
                  <p className="text-xs text-slate-500">
                    Review #{entry.id} · provider #{entry.providerId} ·{' '}
                    {entry.reviewerName || entry.reviewerEmail || 'Customer'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                    {entry.moderationStatus}
                  </span>
                  {entry.openReportCount > 0 && (
                    <span className="rounded bg-amber-100 px-2 py-1 font-semibold text-amber-900">
                      {entry.openReportCount} open report
                      {entry.openReportCount === 1 ? '' : 's'}
                    </span>
                  )}
                  {entry.isVerified && (
                    <span className="rounded bg-emerald-100 px-2 py-1 font-semibold text-emerald-800">
                      Verified request
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <Stars rating={entry.rating} />
                <span className="font-semibold">{entry.title || 'Untitled review'}</span>
                <span className="text-xs text-slate-500">
                  {String(entry.createdAt || '').slice(0, 10)}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-800">
                {entry.content || 'No written comment.'}
              </p>
              {entry.moderationNote && (
                <p className="mt-3 rounded bg-slate-50 p-3 text-xs text-slate-600">
                  Reviewer note: {entry.moderationNote}
                </p>
              )}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  aria-label={`Moderation note for review ${entry.id}`}
                  value={note}
                  onChange={event =>
                    setNotes(previous => ({ ...previous, [entry.id]: event.target.value }))
                  }
                  placeholder="Optional note recorded with the decision"
                  className="min-w-0 flex-1 rounded border p-2 text-sm"
                />
                <button
                  type="button"
                  disabled={entry.moderationStatus === 'published' || busy}
                  onClick={() =>
                    moderate.mutate({
                      reviewId: entry.id,
                      decision: 'approve',
                      notes: note.trim() || undefined,
                    })
                  }
                  className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={entry.moderationStatus === 'rejected' || busy}
                  onClick={() =>
                    moderate.mutate({
                      reviewId: entry.id,
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

      {moderate.error && (
        <p
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {moderate.error.message}
        </p>
      )}

      {queue.data && (
        <Pager
          page={queue.data.pagination.page}
          totalPages={queue.data.pagination.totalPages}
          total={queue.data.pagination.total}
          label="reviews"
          onPage={setPage}
        />
      )}
    </div>
  );
}

function ReportQueue() {
  const utils = trpc.useUtils();
  const [view, setView] = useState<'pending' | 'resolved' | 'dismissed' | 'all'>('pending');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState<Record<number, string>>({});

  const queue = trpc.servicesEngine.listProviderReviewReportQueue.useQuery({
    view,
    page,
    limit: 25,
    search: search.trim() || undefined,
  });
  const invalidate = () => {
    void utils.servicesEngine.listProviderReviewReportQueue.invalidate();
    void utils.servicesEngine.listProviderReviewModerationQueue.invalidate();
    void utils.servicesEngine.getProviderReviews.invalidate();
    void utils.servicesEngine.getProviderPublicProfile.invalidate();
  };
  const resolve = trpc.servicesEngine.resolveProviderReviewReport.useMutation({
    onSuccess: () => {
      setNotes({});
      invalidate();
    },
    onError: invalidate,
  });
  const moderate = trpc.servicesEngine.reviewProviderReview.useMutation({
    onSuccess: invalidate,
    onError: invalidate,
  });

  const counts = queue.data?.counts;
  const entries = queue.data?.entries ?? [];

  return (
    <div className="space-y-5">
      {counts && (
        <dl className="grid grid-cols-3 gap-3">
          {(
            [
              ['Open', counts.pending],
              ['Resolved', counts.resolved],
              ['Dismissed', counts.dismissed],
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
        {REPORT_VIEWS.map(item => (
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
          aria-label="Search review reports"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Provider, reporter, or report text"
          className="min-w-0 flex-1 rounded border p-2 text-sm"
        />
        <button type="submit" className="rounded border bg-white px-4 py-2 text-sm font-semibold">
          Search
        </button>
      </form>

      {queue.isLoading && (
        <p className="rounded border bg-white p-4 text-sm text-slate-600">Loading reports…</p>
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
          No review reports match this view.
        </p>
      )}

      <ul className="space-y-4">
        {entries.map(entry => {
          const note = notes[entry.id] || '';
          const pending = entry.status === 'pending';
          const busy = resolve.isPending || moderate.isPending;
          return (
            <li key={entry.id} className="rounded border bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{entry.companyName || 'Unknown provider'}</p>
                  <p className="text-xs text-slate-500">
                    Report #{entry.id} · review #{entry.reviewId} ·{' '}
                    {entry.reporterName || entry.reporterEmail || 'Customer'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded bg-amber-100 px-2 py-1 font-semibold text-amber-900">
                    {REPORT_REASON_LABELS[entry.reason] ?? entry.reason}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                    {entry.status}
                  </span>
                </div>
              </div>

              <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Stars rating={entry.review.rating} />
                  <span className="font-semibold">{entry.review.title || 'Untitled review'}</span>
                  <span className="text-xs text-slate-500">
                    review status: {entry.review.moderationStatus}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-800">
                  {entry.review.content || 'No written comment.'}
                </p>
              </div>

              {entry.detail && (
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  <span className="font-semibold">Reporter detail:</span> {entry.detail}
                </p>
              )}
              {entry.resolutionNote && (
                <p className="mt-3 rounded bg-slate-50 p-3 text-xs text-slate-600">
                  Resolution note: {entry.resolutionNote}
                </p>
              )}

              {pending && (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    aria-label={`Resolution note for report ${entry.id}`}
                    value={note}
                    onChange={event =>
                      setNotes(previous => ({ ...previous, [entry.id]: event.target.value }))
                    }
                    placeholder="Optional resolution note"
                    className="min-w-0 flex-1 rounded border p-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      resolve.mutate({
                        reportId: entry.id,
                        decision: 'resolve',
                        resolutionNote: note.trim() || undefined,
                      })
                    }
                    className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Resolve
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      resolve.mutate({
                        reportId: entry.id,
                        decision: 'dismiss',
                        resolutionNote: note.trim() || undefined,
                      })
                    }
                    className="rounded border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                  {entry.review.isPublished && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        moderate.mutate({
                          reviewId: entry.reviewId,
                          decision: 'reject',
                          notes: note.trim() || `Rejected from review report #${entry.id}`,
                        })
                      }
                      className="rounded border border-red-300 px-4 py-2 text-sm font-semibold text-red-800 disabled:opacity-50"
                    >
                      Reject review
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {(resolve.error || moderate.error) && (
        <p
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {resolve.error?.message || moderate.error?.message}
        </p>
      )}

      {queue.data && (
        <Pager
          page={queue.data.pagination.page}
          totalPages={queue.data.pagination.totalPages}
          total={queue.data.pagination.total}
          label="reports"
          onPage={setPage}
        />
      )}
    </div>
  );
}

export default function ServicesReviewModerationPanel() {
  const [tab, setTab] = useState<'reviews' | 'reports'>('reviews');

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Customer review moderation</h2>
        <p className="mt-1 text-sm text-slate-600">
          New reviews stay hidden until approved. Reports flag published reviews for triage, but
          never change publication state without a recorded reviewer decision.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-3">
        <button
          type="button"
          aria-pressed={tab === 'reviews'}
          onClick={() => setTab('reviews')}
          className={
            tab === 'reviews'
              ? 'rounded bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white'
              : 'rounded border bg-white px-3 py-1.5 text-sm'
          }
        >
          Review queue
        </button>
        <button
          type="button"
          aria-pressed={tab === 'reports'}
          onClick={() => setTab('reports')}
          className={
            tab === 'reports'
              ? 'rounded bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white'
              : 'rounded border bg-white px-3 py-1.5 text-sm'
          }
        >
          Reports
        </button>
      </div>

      {tab === 'reviews' ? <ReviewQueue /> : <ReportQueue />}
    </section>
  );
}
