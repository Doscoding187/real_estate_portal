import { Link, useRoute } from 'wouter';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';

/**
 * Guest-safe on-platform conversation. The capability token is the secret
 * capture request id issued to the enquirer; contact details stay shielded —
 * the conversation IS the communication channel.
 */
export default function SharedLivingThread() {
  const [, params] = useRoute('/shared-living/thread/:token');
  const token = params?.token || '';
  const thread = trpc.sharedLiving.thread.useQuery({ token }, { enabled: Boolean(token) });
  const reply = trpc.sharedLiving.replyByToken.useMutation({
    onSuccess: () => {
      setBody('');
      void thread.refetch();
    },
  });
  const [body, setBody] = useState('');

  if (!token)
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p className="rounded border bg-white p-4 text-sm text-slate-600">
          Open your enquiry confirmation link to view this conversation.
        </p>
      </main>
    );

  if (thread.isLoading) return <main className="mx-auto max-w-2xl p-8">Loading conversation…</main>;
  if (thread.error || !thread.data)
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p
          role="alert"
          className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          This conversation link is not valid or has expired.
        </p>
        <Link href="/shared-living" className="mt-3 inline-block text-sm text-emerald-700">
          Browse Shared Living
        </Link>
      </main>
    );

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <header>
        <h1 className="text-xl font-semibold">Your Shared Living conversation</h1>
        <p className="text-sm text-slate-600">{thread.data.spaceLabelSnapshot}</p>
        <p className="text-xs text-slate-500">
          Status: {thread.data.leadStatus} · keep communication on-platform for safety.
        </p>
      </header>

      <section aria-label="Messages" className="space-y-3 rounded border bg-white p-4">
        {thread.data.messages.map(message => (
          <article key={message.id} className="rounded border border-slate-100 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {message.authorKind === 'consumer'
                ? 'You'
                : message.authorKind === 'lister'
                  ? 'Lister'
                  : 'Property Listify'}{' '}
              · {String(message.createdAt).slice(0, 16).replace('T', ' ')}
            </p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-800">{message.body}</p>
          </article>
        ))}
        {thread.data.messages.length === 0 && (
          <p className="text-sm text-slate-600">No messages yet.</p>
        )}
      </section>

      <form
        className="space-y-2"
        onSubmit={event => {
          event.preventDefault();
          if (body.trim()) reply.mutate({ token, body });
        }}
      >
        <textarea
          aria-label="Reply"
          className="w-full rounded border p-2 text-sm"
          rows={3}
          value={body}
          onChange={event => setBody(event.target.value)}
          placeholder="Write a reply…"
        />
        <button
          className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={reply.isPending || !body.trim()}
        >
          Send reply
        </button>
        {reply.error && (
          <p role="alert" className="text-sm text-red-700">
            {reply.error.message}
          </p>
        )}
      </form>
    </main>
  );
}
