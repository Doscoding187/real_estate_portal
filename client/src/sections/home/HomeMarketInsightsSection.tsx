import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, BarChart3, MapPin, SquareStack } from 'lucide-react';

import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type Insight = {
  city: { id: number; name: string; slug: string; provinceName: string; provinceSlug: string };
  activeListingCount: number;
  medianAskingPrice: number | null;
  typicalAskingPricePerM2: number | null;
  priceDistribution: Array<{ label: string; count: number }>;
  leadingLocalities: Array<{ name: string; slug: string; listingCount: number }>;
};

function formatCurrency(value: number | null, compact = false) {
  if (value === null) return 'Not enough data';
  if (compact && value >= 1_000_000) return `R${(value / 1_000_000).toFixed(1)}m`;
  if (compact && value >= 1_000) return `R${Math.round(value / 1_000)}k`;
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function HomeMarketInsightsSection() {
  const { data, isError, isLoading, refetch } =
    trpc.homeMarketInsights.getHomepageCityInsights.useQuery({
      limit: 6,
    });
  const insights = (data || []) as Insight[];
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);

  useEffect(() => {
    if (!insights.length) return;
    setSelectedCityId(current =>
      current && insights.some(insight => insight.city.id === current)
        ? current
        : insights[0].city.id,
    );
  }, [insights]);

  const selected = useMemo(
    () => insights.find(insight => insight.city.id === selectedCityId) || insights[0],
    [insights, selectedCityId],
  );
  const distributionMaximum = Math.max(
    ...(selected?.priceDistribution.map(item => item.count) || [1]),
  );

  return (
    <section className="home-section" aria-labelledby="home-market-insights-title">
      <div className="home-section-header">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
          Market intelligence
        </div>
        <h2
          id="home-market-insights-title"
          className="home-section-title text-[1.125rem] font-bold text-slate-900 sm:text-xl md:text-[26px]"
        >
          Property market insights
        </h2>
        <p className="max-w-3xl text-[13px] leading-5 text-slate-600 md:text-sm md:leading-6">
          A live snapshot of qualifying published homes for sale. Asking inventory is not a record
          of completed sales or a valuation.
        </p>
      </div>

      {isLoading ? (
        <div
          className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
          role="status"
          aria-label="Loading market insights"
        >
          <Skeleton className="h-9 w-full max-w-xl rounded-lg" />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        </div>
      ) : isError ? (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-7 text-center"
          role="alert"
        >
          <p className="font-semibold text-slate-900">Market insights could not be loaded.</p>
          <Button className="mt-3" variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : !selected ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm leading-6 text-slate-600">
          Market insights will appear once a city has enough qualifying published sale inventory.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-3">
            {insights.map(insight => (
              <button
                key={insight.city.id}
                type="button"
                onClick={() => setSelectedCityId(insight.city.id)}
                className={`whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${selected.city.id === insight.city.id ? 'bg-[#2774AE] text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700'}`}
              >
                {insight.city.name}
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <InsightMetric
              label="Active sale listings"
              value={selected.activeListingCount.toLocaleString('en-ZA')}
            />
            <InsightMetric
              label="Median asking price"
              value={formatCurrency(selected.medianAskingPrice, true)}
            />
            <InsightMetric
              label="Typical asking price / m²"
              value={
                selected.typicalAskingPricePerM2 === null
                  ? 'Not enough data'
                  : `${formatCurrency(selected.typicalAskingPricePerM2)}/m²`
              }
            />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(15rem,0.8fr)]">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-900">Asking-price distribution</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Published sale listings by current asking-price band.
              </p>
              <div className="mt-4 space-y-3">
                {selected.priceDistribution.map(item => (
                  <div
                    key={item.label}
                    className="grid grid-cols-[5.75rem_minmax(0,1fr)_2rem] items-center gap-2 text-xs"
                  >
                    <span className="font-medium text-slate-600">{item.label}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-[#2774AE]"
                        style={{
                          width: `${Math.max(8, (item.count / distributionMaximum) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-right font-semibold text-slate-700">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 p-4">
              <h3 className="font-semibold text-slate-900">Leading localities by supply</h3>
              <div className="mt-3 space-y-3">
                {selected.leadingLocalities.length ? (
                  selected.leadingLocalities.map(locality => (
                    <Link
                      key={locality.slug}
                      href={`/${selected.city.provinceSlug}/${selected.city.slug}/${locality.slug}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                    >
                      <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-slate-700">
                        <MapPin className="h-4 w-4 shrink-0 text-blue-600" />
                        {locality.name}
                      </span>
                      <span className="shrink-0 text-xs text-slate-500">
                        {locality.listingCount} listings
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-slate-500">
                    Locality detail is not available for this current inventory.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="inline-flex items-center gap-2 text-xs leading-5 text-slate-500">
              <SquareStack className="h-4 w-4" />
              Metrics require at least three qualifying listings.
            </p>
            <Link
              href={`/${selected.city.provinceSlug}/${selected.city.slug}`}
              className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
            >
              Explore {selected.city.name} market <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

function InsightMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">{value}</p>
    </div>
  );
}
