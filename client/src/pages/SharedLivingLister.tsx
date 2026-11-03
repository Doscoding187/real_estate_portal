import { useState } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { SHARED_LIVING_CANONICAL_ASSIGNMENT_BLOCKER } from '@shared/sharedLivingDomain';

const EMPTY_THREAD_TOKEN = '00000000-0000-0000-0000-000000000000';

export default function SharedLivingLister() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <header>
        <p className="text-sm font-medium text-emerald-700">Shared Living · List a space</p>
        <h1 className="mt-1 text-2xl font-semibold">List your room or small place</h1>
      </header>
      <p
        role="status"
        className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
      >
        {SHARED_LIVING_CANONICAL_ASSIGNMENT_BLOCKER}
      </p>
      <Link href="/shared-living" className="text-sm font-medium text-emerald-700">
        Browse Shared Living
      </Link>
      <ListerInbox />
    </main>
  );
}

function ListerInbox() {
  const threads = trpc.sharedLiving.myListerThreads.useQuery();
  const [token, setToken] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const thread = trpc.sharedLiving.listerThread.useQuery(
    { token: token || EMPTY_THREAD_TOKEN },
    { enabled: Boolean(token) },
  );
  const reply = trpc.sharedLiving.replyAsLister.useMutation({
    onSuccess: () => {
      setBody('');
      void thread.refetch();
    },
  });

  return (
    <section aria-label="Shared Living inbox" className="rounded border bg-white p-5">
      <h2 className="text-lg font-semibold">Shared Living inbox</h2>
      {threads.error && <p role="alert" className="mt-2 text-sm text-red-700">{threads.error.message}</p>}
      {!threads.isLoading && !threads.error && !(threads.data?.length || 0) && (
        <p className="mt-3 text-sm text-slate-600">No enquiries yet.</p>
      )}
      <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <ul className="space-y-2">
          {(threads.data ?? []).map(item => (
            <li key={item.token}>
              <button
                type="button"
                onClick={() => setToken(item.token)}
                className={`w-full rounded border p-3 text-left text-sm ${token === item.token ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}
              >
                <span className="block font-medium">{item.spaceLabelSnapshot || 'Shared Living enquiry'}</span>
                <span className="text-slate-600">{item.deliveryStatus === 'delivered' ? 'Delivered' : item.deliveryStatus}</span>
              </button>
            </li>
          ))}
        </ul>
        {token && (
          <div className="rounded border border-slate-200 p-3">
            {thread.isLoading ? (
              <p className="text-sm text-slate-600">Loading conversation…</p>
            ) : thread.data ? (
              <>
                <p className="font-medium">{thread.data.spaceLabelSnapshot}</p>
                <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                  {thread.data.messages.map(message => (
                    <p key={message.id} className="rounded bg-slate-50 p-2 text-sm">
                      <span className="font-medium">{message.authorKind === 'lister' ? 'You' : 'Enquirer'}:</span>{' '}
                      {message.body}
                    </p>
                  ))}
                </div>
                <textarea
                  aria-label="Reply to enquiry"
                  className="mt-3 w-full rounded border p-2 text-sm"
                  value={body}
                  onChange={event => setBody(event.target.value)}
                  placeholder="Reply on-platform"
                />
                <button
                  type="button"
                  disabled={body.trim().length === 0 || reply.isPending}
                  onClick={() => reply.mutate({ token, body })}
                  className="mt-2 rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Send reply
                </button>
                {reply.error && <p role="alert" className="mt-2 text-sm text-red-700">{reply.error.message}</p>}
              </>
            ) : (
              <p className="text-sm text-slate-600">This conversation is unavailable.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
