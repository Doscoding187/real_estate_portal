import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { Eye, MessageCircle, MousePointerClick, TrendingUp } from 'lucide-react';

export function AgentPresenceProof() {
  const { data: summary } = trpc.agent.getPresenceSummary.useQuery(undefined, {
    retry: false,
  });

  if (!summary) return null;

  const delta =
    summary.profileViewsPreviousWindow > 0
      ? Math.round(
          ((summary.profileViews - summary.profileViewsPreviousWindow) /
            summary.profileViewsPreviousWindow) *
            100,
        )
      : summary.profileViews > 0
        ? 100
        : 0;

  const secondary = [
    { icon: MessageCircle, label: 'WhatsApp clicks', value: summary.whatsappClicks },
    { icon: MousePointerClick, label: 'Listing taps', value: summary.listingTaps },
    { icon: TrendingUp, label: 'Contact actions', value: summary.contactActions },
  ];

  return (
    <div
      data-testid="agent-presence-proof"
      className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Your presence</p>
          <p className="mt-1 text-xs text-slate-500">
            Anonymous interactions with your public Property Listify profile, last 30 days.
          </p>
        </div>
        {delta !== 0 && (
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-semibold',
              delta > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600',
            )}
          >
            {delta > 0 ? '+' : ''}
            {delta}% views vs prior 30 days
          </span>
        )}
      </div>

      <div className="mt-4 flex items-end gap-6">
        <div>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-[var(--primary)]" aria-hidden="true" />
            <span className="text-3xl font-bold text-slate-900">{summary.profileViews}</span>
          </div>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Profile visits
          </p>
        </div>
        <div className="ml-auto grid grid-cols-3 gap-4">
          {secondary.map(item => (
            <div key={item.label} className="text-right">
              <span className="block text-lg font-semibold text-slate-900">{item.value}</span>
              <span className="text-[11px] text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {summary.totalInteractions === 0 && (
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          No public interactions yet. Sharing your presence link and publishing more inventory is
          the fastest way to start building discovery.
        </p>
      )}
    </div>
  );
}
