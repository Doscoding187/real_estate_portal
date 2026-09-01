import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowRight, BarChart3, Building2, MapPin, SquareStack, TrendingUp } from 'lucide-react';

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

type InsightCardTone = 'blue' | 'orange' | 'green';

const PRICE_BAND_ORDER: Record<string, number> = {
  'Under R1m': 0,
  'R1m – R2m': 1,
  'R2m – R5m': 2,
  'R5m – R10m': 3,
  'R10m+': 4,
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

function formatListingCount(value: number) {
  return `${value.toLocaleString('en-ZA')} ${value === 1 ? 'listing' : 'listings'}`;
}

function InsightCard({
  title,
  subtitle,
  icon: Icon,
  tone,
  children,
}: {
  title: string;
  subtitle: string;
  icon: typeof MapPin;
  tone: InsightCardTone;
  children: ReactNode;
}) {
  const styles: Record<InsightCardTone, { card: string; icon: string; title: string }> = {
    blue: {
      card: 'border-blue-100 bg-blue-50/70',
      icon: 'bg-blue-600 text-white',
      title: 'text-blue-950',
    },
    orange: {
      card: 'border-orange-100 bg-orange-50/70',
      icon: 'bg-orange-500 text-white',
      title: 'text-orange-950',
    },
    green: {
      card: 'border-emerald-100 bg-emerald-50/70',
      icon: 'bg-emerald-500 text-white',
      title: 'text-emerald-950',
    },
  };
  const style = styles[tone];

  return (
    <article
      className={`flex min-h-[21rem] w-[82vw] max-w-[22rem] shrink-0 snap-start flex-col rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md sm:w-auto sm:max-w-none sm:p-5 ${style.card}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm ${style.icon}`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 pt-0.5">
          <h3 className={`text-sm font-bold leading-5 ${style.title}`}>{title}</h3>
          <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-1 flex-col">{children}</div>
    </article>
  );
}

export function HomeMarketInsightsSection() {
  const { data, isError, isLoading, refetch } =
    trpc.homeMarketInsights.getHomepageCityInsights.useQuery({
      limit: 6,
    });
  const insights = useMemo(() => (data || []) as Insight[], [data]);
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
  const priceDistribution = useMemo(
    () =>
      [...(selected?.priceDistribution || [])].sort(
        (left, right) =>
          (PRICE_BAND_ORDER[left.label] ?? Number.MAX_SAFE_INTEGER) -
          (PRICE_BAND_ORDER[right.label] ?? Number.MAX_SAFE_INTEGER),
      ),
    [selected],
  );
  const distributionMaximum = Math.max(...priceDistribution.map(item => item.count), 1);

  return (
    <section className="home-section" aria-labelledby="home-market-insights-title">
      <div className="home-section-header max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2774AE]">
          Property price insights
        </p>
        <h2
          id="home-market-insights-title"
          className="home-section-title mt-2 text-[1.125rem] font-bold text-slate-900 sm:text-xl md:text-[26px]"
        >
          Make smarter property decisions
        </h2>
        <p className="max-w-3xl text-[13px] leading-5 text-slate-600 md:text-sm md:leading-6">
          Compare current asking-price activity, available homes and local supply in cities with
          enough published sale inventory.
        </p>
      </div>

      {isLoading ? (
        <div role="status" aria-label="Loading property price insights">
          <Skeleton className="h-11 w-full max-w-xl rounded-xl" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-[21rem] rounded-2xl" />
            <Skeleton className="h-[21rem] rounded-2xl" />
            <Skeleton className="h-[21rem] rounded-2xl" />
          </div>
        </div>
      ) : isError ? (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-7 text-center"
          role="alert"
        >
          <p className="font-semibold text-slate-900">
            Property price insights could not be loaded.
          </p>
          <Button className="mt-3" variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : !selected ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm leading-6 text-slate-600">
          Property price insights will appear once a city has enough qualifying published sale
          inventory.
        </div>
      ) : (
        <div>
          <div className="home-section-tabs scrollbar-hide -mx-4 flex justify-start overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            <div className="inline-flex h-auto flex-nowrap justify-start gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
              {insights.map(insight => {
                const isSelected = selected.city.id === insight.city.id;

                return (
                  <button
                    key={insight.city.id}
                    type="button"
                    onClick={() => setSelectedCityId(insight.city.id)}
                    aria-pressed={isSelected}
                    aria-controls="home-market-insights-content"
                    className={`whitespace-nowrap rounded-lg border border-transparent px-3 py-2 text-[13px] font-semibold transition-all md:px-4 md:text-sm ${
                      isSelected
                        ? 'bg-[#2774AE] text-white shadow-sm'
                        : 'bg-transparent text-slate-600 hover:bg-white hover:text-[#2774AE]'
                    }`}
                  >
                    {insight.city.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            id="home-market-insights-content"
            className="home-card-grid scrollbar-hide -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:mt-4 lg:grid-cols-3"
          >
            <InsightCard
              title="Explore local supply"
              subtitle={`in ${selected.city.name}`}
              icon={MapPin}
              tone="blue"
            >
              <p className="text-xs leading-5 text-slate-600">
                See where today&apos;s published homes are concentrated before you narrow your
                search.
              </p>

              <div className="relative mt-4 flex flex-1 flex-col overflow-hidden rounded-xl border border-blue-100 bg-white/90 p-3 shadow-sm">
                <div
                  className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_18%_18%,rgba(37,99,235,0.16),transparent_30%),radial-gradient(circle_at_82%_70%,rgba(14,165,233,0.13),transparent_25%)]"
                  aria-hidden="true"
                />
                {selected.leadingLocalities.length ? (
                  <>
                    <p className="relative text-[11px] font-bold uppercase tracking-[0.12em] text-blue-700">
                      Leading locality by supply
                    </p>
                    <Link
                      href={`/${selected.city.provinceSlug}/${selected.city.slug}/${selected.leadingLocalities[0].slug}`}
                      className="group relative mt-3 flex flex-1 flex-col items-center justify-center rounded-lg border border-blue-100 bg-white/75 px-3 py-4 text-center transition-colors hover:bg-white"
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-700 transition-transform group-hover:scale-105">
                        <MapPin className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="mt-2 text-base font-bold text-slate-800 group-hover:text-blue-700">
                        {selected.leadingLocalities[0].name}
                      </span>
                      <span className="mt-0.5 text-xs font-medium text-slate-500">
                        {formatListingCount(selected.leadingLocalities[0].listingCount)}
                      </span>
                    </Link>
                    {selected.leadingLocalities.length > 1 && (
                      <div className="relative mt-2 flex flex-wrap gap-1.5">
                        {selected.leadingLocalities.slice(1).map(locality => (
                          <Link
                            key={locality.slug}
                            href={`/${selected.city.provinceSlug}/${selected.city.slug}/${locality.slug}`}
                            className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-700"
                          >
                            {locality.name}
                            <span className="text-slate-400">{locality.listingCount}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="relative flex h-full min-h-24 items-center justify-center text-center text-xs leading-5 text-slate-500">
                    Locality detail is not available for this current inventory.
                  </div>
                )}
              </div>

              <Link
                href={`/${selected.city.provinceSlug}/${selected.city.slug}`}
                className="group mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-800"
              >
                Explore {selected.city.name}
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </InsightCard>

            <InsightCard
              title="Asking price"
              subtitle={`in ${selected.city.name}`}
              icon={BarChart3}
              tone="orange"
            >
              <p className="text-xs leading-5 text-slate-600">
                Current published homes by asking-price band.
              </p>

              <div className="mt-4 flex-1 space-y-3 rounded-xl border border-orange-100 bg-white/90 p-3 shadow-sm">
                {priceDistribution.length ? (
                  priceDistribution.map(item => (
                    <div
                      key={item.label}
                      className="grid grid-cols-[4.75rem_minmax(0,1fr)_1.5rem] items-center gap-2 text-xs"
                    >
                      <span className="font-medium text-slate-600">{item.label}</span>
                      <div className="h-2 overflow-hidden rounded-full bg-orange-100">
                        <div
                          className="h-full rounded-full bg-orange-500 transition-[width] duration-500"
                          style={{
                            width: `${Math.max(8, (item.count / distributionMaximum) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-right font-bold text-orange-800">{item.count}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex h-full min-h-24 items-center justify-center text-center text-xs leading-5 text-slate-500">
                    Not enough published asking-price data is available yet.
                  </div>
                )}
              </div>

              <p className="mt-4 text-[11px] font-medium text-slate-500">Asking price per home</p>
            </InsightCard>

            <InsightCard
              title="Market activity"
              subtitle={`in ${selected.city.name}`}
              icon={TrendingUp}
              tone="green"
            >
              <p className="text-xs leading-5 text-slate-600">
                A concise view of current published supply and asking-price benchmarks.
              </p>

              <div className="mt-4 flex-1 space-y-2.5">
                <ActivityMetric
                  icon={Building2}
                  label="Active sale listings"
                  value={selected.activeListingCount.toLocaleString('en-ZA')}
                />
                <ActivityMetric
                  icon={BarChart3}
                  label="Median asking price"
                  value={formatCurrency(selected.medianAskingPrice, true)}
                />
                <ActivityMetric
                  icon={TrendingUp}
                  label="Typical asking price / m²"
                  value={
                    selected.typicalAskingPricePerM2 === null
                      ? 'Not enough data'
                      : `${formatCurrency(selected.typicalAskingPricePerM2)}/m²`
                  }
                />
              </div>

              <Link
                href={`/${selected.city.provinceSlug}/${selected.city.slug}`}
                className="group mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 hover:text-emerald-800"
              >
                View {selected.city.name} market
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </InsightCard>
          </div>

          <p className="mt-4 inline-flex max-w-3xl items-start gap-2 text-xs leading-5 text-slate-500">
            <SquareStack className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Based on at least three qualifying published homes for sale. These are current asking
            inventory signals, not completed sales or a valuation.
          </p>
        </div>
      )}
    </section>
  );
}

function ActivityMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[3.75rem] items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-white/90 px-3 py-2.5 shadow-sm">
      <span className="inline-flex min-w-0 items-center gap-2 text-xs font-medium text-slate-600">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span>{label}</span>
      </span>
      <span className="shrink-0 text-sm font-bold text-emerald-950">{value}</span>
    </div>
  );
}
