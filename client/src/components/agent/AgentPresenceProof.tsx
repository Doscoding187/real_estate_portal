import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { Compass, Eye, MessageCircle, MousePointerClick, Share2, TrendingUp } from 'lucide-react';

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
      : null;

  const secondary = [
    {
      icon: MessageCircle,
      label: 'WhatsApp clicks',
      value: summary.whatsappClicks,
      iconClassName: 'bg-emerald-50 text-emerald-600',
    },
    {
      icon: MousePointerClick,
      label: 'Listing taps',
      value: summary.listingTaps,
      iconClassName: 'bg-violet-50 text-violet-600',
    },
    {
      icon: TrendingUp,
      label: 'Contact actions',
      value: summary.contactActions,
      iconClassName: 'bg-sky-50 text-sky-600',
    },
    {
      icon: Compass,
      label: 'Area guide opens',
      value: summary.areaGuideOpens,
      iconClassName: 'bg-amber-50 text-amber-600',
    },
    {
      icon: Share2,
      label: 'Profile shares',
      value: summary.shares,
      iconClassName: 'bg-slate-100 text-slate-600',
    },
  ];

  return (
    <div
      data-testid="agent-presence-proof"
      className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Profile activity</p>
          <p className="mt-1 text-xs text-slate-500">
            How people engaged with your public profile in the last 30 days.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
          Last 30 days
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(132px,0.86fr)_minmax(0,1.55fr)]">
        <div className="flex min-h-[94px] flex-col justify-between rounded-2xl border border-[color:color-mix(in_oklab,var(--primary)_16%,white)] bg-[color:color-mix(in_oklab,var(--primary)_6%,white)] p-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--primary)] shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
              <Eye className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold leading-none tracking-[-0.04em] text-slate-900">
                  {summary.profileViews}
                </span>
                {delta !== null && delta !== 0 && (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      delta > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600',
                    )}
                  >
                    {delta > 0 ? '+' : ''}
                    {delta}%
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                Profile visits
              </p>
            </div>
          </div>
          <p className="text-[11px] leading-4 text-slate-500">
            People who opened your public agent profile.
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Engagement signals
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {secondary.map(item => (
              <div
                key={item.label}
                className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 px-2.5 py-2 last:col-span-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg',
                      item.iconClassName,
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="text-lg font-semibold leading-none tracking-[-0.03em] text-slate-900">
                    {item.value}
                  </span>
                </div>
                <p className="mt-1.5 text-[10px] leading-3 text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>
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
