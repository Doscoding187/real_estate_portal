import { ArrowUpRight, BarChart3, Building2, Home, Ruler } from 'lucide-react';
import { Link } from 'wouter';
import { formatZARCompact } from '@/lib/utils';
import type { RouterOutputs } from '@/lib/trpc';

export type MarketInsightsGuide = NonNullable<RouterOutputs['placeAuthority']['getPlaceGuide']>;

export const NOT_ENOUGH_DATA = 'Not enough data yet';

function Metric({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof Home;
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white/80 px-3 py-3 shadow-sm sm:px-3.5">
      <div className="flex items-center gap-1.5 text-blue-700">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <p className="truncate text-[10px] font-semibold leading-tight text-slate-600">{label}</p>
      </div>
      <p
        className="mt-2 truncate text-base font-extrabold leading-tight text-slate-950 sm:text-lg"
        title={value}
      >
        {value}
      </p>
      {note && <p className="mt-1 text-[10px] leading-tight text-slate-500">{note}</p>}
    </div>
  );
}

/**
 * Real asking-price statistics for the listing's own place, from the place guide.
 * Medians arrive as null until the server's sample minimum is met; this panel
 * applies no threshold of its own and invents no trend.
 */
export function MarketInsightsPanel({
  placeName,
  guide,
  loading,
}: {
  placeName: string;
  guide?: MarketInsightsGuide | null;
  loading: boolean;
}) {
  const stats = guide?.stats;
  const median = stats?.saleMedian ?? null;
  const perM2 = stats?.salePricePerM2Median ?? null;
  const minimum = stats?.minimumSample;
  const sparseNote =
    minimum != null ? `Shown once ${minimum}+ priced listings are available` : undefined;

  return (
    <section
      aria-labelledby="property-market-insights-heading"
      className="rounded-2xl border border-blue-100 bg-gradient-to-r from-white via-blue-50 to-indigo-50 p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" aria-hidden="true" />
          <div className="min-w-0">
            <h2
              id="property-market-insights-heading"
              className="text-sm font-extrabold text-slate-950"
            >
              Market insights — {placeName}
            </h2>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-600">
              Current asking prices and listings in this area.
            </p>
          </div>
        </div>
        {guide && (
          <Link
            href={guide.place.canonicalPath}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span className="hidden sm:inline">View full area guide</span>
            <span className="sm:hidden">Area guide</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <Metric
          icon={Home}
          label="Median asking price"
          value={loading ? 'Loading…' : median != null ? formatZARCompact(median) : NOT_ENOUGH_DATA}
          note={median != null ? 'Current sale listings' : sparseNote}
        />
        <Metric
          icon={Building2}
          label="Properties for sale"
          value={
            loading
              ? 'Loading…'
              : stats
                ? stats.saleCount.toLocaleString('en-ZA')
                : NOT_ENOUGH_DATA
          }
          note="Currently listed in this area"
        />
        <Metric
          icon={Ruler}
          label="Median price per m²"
          value={loading ? 'Loading…' : perM2 != null ? formatZARCompact(perM2) : NOT_ENOUGH_DATA}
          note={perM2 != null ? 'Listings with a stated floor size' : sparseNote}
        />
      </div>
    </section>
  );
}
