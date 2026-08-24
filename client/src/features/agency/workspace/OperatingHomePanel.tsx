import { useLocation } from 'wouter';
import { AlertTriangle, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { trpc } from '@/lib/trpc';

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'border-rose-200 bg-rose-50 text-rose-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  clear: 'border-emerald-200 bg-emerald-50 text-emerald-900',
};

/**
 * Server-computed daily brief for the agency principal: canonical signals
 * (lead SLA, publication readiness, inventory pipeline) ranked into one
 * next-action queue instead of client-side heuristics.
 */
export function AgencyOperatingHomePanel() {
  const query = trpc.agency.getOperatingHome.useQuery(undefined, { retry: false });
  const [, setLocation] = useLocation();

  if (query.isLoading) {
    return (
      <div
        data-testid="operating-home-loading"
        className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500"
      >
        Preparing today's brief…
      </div>
    );
  }

  if (query.isError || !query.data) {
    return null;
  }

  const home = query.data;

  return (
    <section
      data-testid="agency-operating-home"
      aria-label="Agency operating home"
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-blue-700" aria-hidden="true" />
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
          Today's operating brief
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BriefStat label="Leads past response promise" value={home.brief.leads.firstResponseOverdueCount} />
        <BriefStat label="Fresh enquiries" value={home.brief.leads.newToday} />
        <BriefStat label="Listings awaiting review" value={home.brief.listings.pendingReviewCount} />
        <BriefStat
          label="Launch Access days left"
          value={home.brief.publication.daysRemaining ?? '—'}
        />
      </div>

      {home.brief.performance ? (
        <div
          data-testid="value-scorecard"
          className="rounded-xl border border-blue-200 bg-blue-50 p-4"
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
            What Property Listify delivered
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ScoreStat label="Portfolio views" value={home.brief.performance.engagement.portfolioViews} />
            <ScoreStat label="Enquiries delivered" value={home.brief.performance.engagement.portfolioEnquiries} />
            <ScoreStat
              label="Viewing rate"
              value={
                home.brief.performance.pipeline.viewingConversionPct !== null
                  ? `${home.brief.performance.pipeline.viewingConversionPct}%`
                  : '—'
              }
            />
            <ScoreStat
              label="Avg first response"
              value={
                home.brief.performance.response.avgFirstResponseMinutes !== null
                  ? `${home.brief.performance.response.avgFirstResponseMinutes} min`
                  : '—'
              }
              detail={
                home.brief.performance.response.platformAvgFirstResponseMinutes !== null
                  ? `platform avg ${home.brief.performance.response.platformAvgFirstResponseMinutes} min`
                  : undefined
              }
            />
          </div>
          <p className="mt-3 text-xs text-blue-800">
            Live inventory: {home.brief.performance.inventory.liveListings}
            {home.brief.performance.inventory.avgDaysLive !== null
              ? ` · averaging ${home.brief.performance.inventory.avgDaysLive} days live`
              : ''}
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        {home.actions.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Queue is clear — every lead, listing and account signal is healthy.
          </div>
        ) : (
          home.actions.map(action => {
            const critical = action.severity === 'critical';
            return (
              <button
                key={`${action.code}-${action.rank}`}
                type="button"
                onClick={() => setLocation(action.href)}
                className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border p-4 text-left text-sm transition hover:brightness-[0.98] ${
                  SEVERITY_STYLES[action.severity] ?? 'border-slate-200 bg-white'
                }`}
              >
                <span className="flex items-center gap-2 font-semibold">
                  {!critical ? null : (
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  )}
                  {action.title}
                </span>
                <span className="flex items-center gap-3">
                  {action.valueLabel ? (
                    <span className="text-xs font-medium opacity-80">{action.valueLabel}</span>
                  ) : null}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}

function BriefStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

export default AgencyOperatingHomePanel;

function ScoreStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | string;
  detail?: string;
}) {
  return (
    <div className="rounded-lg bg-white p-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-950">{value}</p>
      {detail ? <p className="text-[11px] text-slate-500">{detail}</p> : null}
    </div>
  );
}
