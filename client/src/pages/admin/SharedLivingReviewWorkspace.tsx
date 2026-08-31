import { useState } from 'react';
import { trpc } from '@/lib/trpc';

/**
 * Small, deliberately private review surface. Public publication remains a
 * moderator action; the queue DTO contains no street address or coordinates.
 */
export default function SharedLivingReviewWorkspace() {
  const utils = trpc.useUtils();
  const queue = trpc.sharedLiving.moderationQueue.useQuery();
  const approve = trpc.sharedLiving.moderateApprove.useMutation({
    onSuccess: () => void utils.sharedLiving.moderationQueue.invalidate(),
  });
  const reject = trpc.sharedLiving.moderateReject.useMutation({
    onSuccess: () => void utils.sharedLiving.moderationQueue.invalidate(),
  });
  const [reasons, setReasons] = useState<Record<number, string>>({});

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <header>
        <p className="text-sm font-medium text-emerald-700">Operations · Shared Living</p>
        <h1 className="text-2xl font-semibold">Listing review queue</h1>
        <p className="mt-2 text-sm text-slate-600">
          Approve only complete, phone-verified listings. Approval is the public publication
          boundary.
        </p>
      </header>

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
      {!queue.isLoading && !queue.error && queue.data?.length === 0 && (
        <p className="rounded border bg-white p-4 text-sm text-slate-600">
          No Shared Living listings are waiting for review.
        </p>
      )}
      <ul className="space-y-3">
        {(queue.data ?? []).map(item => {
          const reason = reasons[item.id] || '';
          const mutationError = approve.error || reject.error;
          return (
            <li key={item.id} className="rounded border bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.slug}</p>
                  <p className="text-sm text-slate-600">
                    {item.locationDisplay} · {humanize(item.placeKind)} · submitted{' '}
                    {String(item.createdAt).slice(0, 10)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={approve.isPending || reject.isPending}
                  onClick={() => approve.mutate({ placeId: item.id })}
                  className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Approve &amp; publish
                </button>
              </div>
              {item.description && (
                <p className="mt-3 whitespace-pre-line text-sm text-slate-700">
                  {item.description}
                </p>
              )}
              <ul className="mt-3 space-y-2 rounded border border-slate-100 bg-slate-50 p-3 text-sm">
                {item.spaces.map(space => (
                  <li key={space.id}>
                    <p className="font-medium">
                      {space.label} · {humanize(space.accommodationType)} ·{' '}
                      {humanize(space.marketTag)}
                    </p>
                    <p className="text-slate-600">
                      {space.rentUnknown
                        ? 'Rent to confirm'
                        : `${money(space.rentAmountMinor)} / month`}
                      {' · '}
                      {space.availableFrom ? `Available ${space.availableFrom}` : 'Date to confirm'}
                      {' · '}
                      {billsLabel(space.billsIncluded)}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  aria-label={`Rejection reason for ${item.slug}`}
                  value={reason}
                  onChange={event =>
                    setReasons(previous => ({ ...previous, [item.id]: event.target.value }))
                  }
                  placeholder="Reason required to return this listing to draft"
                  className="min-w-0 flex-1 rounded border p-2 text-sm"
                />
                <button
                  type="button"
                  disabled={reason.trim().length < 3 || approve.isPending || reject.isPending}
                  onClick={() => reject.mutate({ placeId: item.id, reason })}
                  className="rounded border border-red-300 px-4 py-2 text-sm font-semibold text-red-800 disabled:opacity-50"
                >
                  Return to draft
                </button>
              </div>
              {mutationError && (
                <p role="alert" className="mt-2 text-sm text-red-700">
                  {mutationError.message}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function money(minor: number) {
  return `R ${(minor / 100).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;
}

function humanize(value: string) {
  return value.replace(/_/g, ' ').replace(/^./, character => character.toUpperCase());
}

function billsLabel(bills: { electricity: boolean; water: boolean; wifi: boolean }) {
  const included = [
    bills.electricity ? 'electricity' : null,
    bills.water ? 'water' : null,
    bills.wifi ? 'Wi-Fi' : null,
  ].filter(Boolean);
  return included.length ? `${included.join(', ')} included` : 'Bills to confirm';
}
