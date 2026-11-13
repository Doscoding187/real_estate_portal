// Why this section exists, what it shows and its rules: docs/product/homepage/market-insights.md
// Update that file with any change here.
import { useMemo, useState, type ReactNode } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'wouter';
import { ArrowRight, BarChart3, Building2, MapPin, SquareStack, TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SectionEmptyState } from '@/components/ui/SectionEmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { buildTransactionalGeographyHref } from '@/lib/geographySearchHandoff';
import { ProvincePills } from '@/components/home/ProvincePills';
import { homeProvincePlaceId } from '@/lib/homeProvinceOptions';
import { trpc } from '@/lib/trpc';
import { useSharedHomeProvince } from '@/lib/useHomeProvince';
import { formatCurrency } from '@/lib/utils';

/** What the server sends per city (server/services/homeMarketInsightsService.ts). */
type CityInsight = {
  placeId: string;
  name: string;
  provinceName: string;
  href: string | null;
  activeSaleListings: number;
  medianAskingPrice: number;
  typicalPricePerM2: number | null;
  askingPriceBands: Array<{
    key: string;
    label: string;
    minPrice: number;
    maxPrice: number | null;
    count: number;
  }>;
  leadingLocality: { name: string; listingCount: number; href: string | null } | null;
  sampleSize: number;
  computedAt: string;
};

/** Whole-province figures ("province") or one city's figures ("city"). */
type InsightScope = 'province' | 'city';

type ProvinceInsights = { province: CityInsight | null; cities: CityInsight[] };

const STALE_TIME_MS = 10 * 60 * 1000;
const ALL_KEY = 'all';
const FOOTNOTE =
  'Based on at least three qualifying published homes for sale. These are current asking inventory signals, not completed sales or a valuation.';
const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700';

function errorCode(error: unknown): string | undefined {
  const candidate = error as
    | { data?: { code?: string }; shape?: { data?: { code?: string } } }
    | null
    | undefined;
  return candidate?.data?.code ?? candidate?.shape?.data?.code;
}

/** An older API does not have the procedure yet: that is "no data", not a failure. */
export function isProcedureMissing(error: unknown): boolean {
  const code = errorCode(error);
  return code === 'NOT_FOUND' || code === 'BAD_REQUEST';
}

/** "R3.0m" from a million up, otherwise the full figure ("R850 000"). */
export function formatAskingPrice(value: number): string {
  if (value >= 1_000_000) return `R${(value / 1_000_000).toFixed(1)}m`;
  return formatCurrency(value).replace(/^R\s+/, 'R');
}

function homesLabel(count: number): string {
  return `${count.toLocaleString('en-ZA')} ${count === 1 ? 'home' : 'homes'}`;
}

/** The band with the most homes; a tie goes to the lower band. Null when no band has a home. */
export function leadingBand(bands: CityInsight['askingPriceBands']) {
  let leader: CityInsight['askingPriceBands'][number] | null = null;
  for (const band of bands) {
    if (band.count > 0 && (!leader || band.count > leader.count)) leader = band;
  }
  return leader;
}

function citySearchHref(city: CityInsight, scope: InsightScope): string | undefined {
  return buildTransactionalGeographyHref({
    journey: 'buy',
    scope: {
      kind: scope === 'province' ? 'province' : 'metro_city',
      canonicalPlaceId: city.placeId,
    },
    resultState: { sort: 'relevance', page: 0 },
  });
}

type Tone = 'blue' | 'amber' | 'green';

const TONES: Record<
  Tone,
  { card: string; header: string; icon: string; title: string; chip: string; link: string }
> = {
  blue: {
    card: 'border-blue-100',
    header: 'bg-blue-50',
    icon: 'bg-blue-600 text-white',
    title: 'text-blue-950',
    chip: 'border-blue-200 bg-white/80 text-slate-800',
    link: 'text-blue-800 hover:text-blue-900',
  },
  amber: {
    card: 'border-amber-100',
    header: 'bg-amber-50',
    icon: 'bg-amber-500 text-white',
    title: 'text-amber-950',
    chip: 'border-amber-200 bg-white/80 text-slate-800',
    link: 'text-amber-900 hover:text-amber-950',
  },
  green: {
    card: 'border-emerald-100',
    header: 'bg-emerald-50',
    icon: 'bg-emerald-600 text-white',
    title: 'text-emerald-950',
    chip: 'border-emerald-200 bg-white/80 text-slate-800',
    link: 'text-emerald-800 hover:text-emerald-900',
  },
};

function InsightCard({
  title,
  city,
  icon: Icon,
  tone,
  takeaway,
  children,
}: {
  title: string;
  city: string;
  icon: typeof MapPin;
  tone: Tone;
  takeaway?: string | null;
  children: ReactNode;
}) {
  const style = TONES[tone];
  return (
    <article
      className={`flex w-[82%] max-w-[22rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border bg-white shadow-sm sm:w-[22rem] lg:w-auto lg:max-w-none ${style.card}`}
    >
      <div className={`px-4 pb-3 pt-4 sm:px-5 ${style.header}`}>
        <div className="flex items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm ${style.icon}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h3 className={`text-sm font-bold leading-5 ${style.title}`}>{title}</h3>
            <p className="mt-0.5 truncate text-xs font-medium text-slate-600">in {city}</p>
          </div>
        </div>
        {takeaway ? (
          <p
            className={`mt-3 rounded-lg border px-3 py-2 text-xs font-medium leading-5 ${style.chip}`}
          >
            {takeaway}
          </p>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">{children}</div>
    </article>
  );
}

function CardLink({ href, tone, children }: { href: string; tone: Tone; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`group mt-auto inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-bold ${TONES[tone].link} ${FOCUS_RING}`}
    >
      {children}
      <ArrowRight
        className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}

function ActivityRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
}) {
  return (
    <li className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2">
      <span className="inline-flex min-w-0 items-center gap-2 text-xs font-medium text-slate-700">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-800">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        {label}
      </span>
      <span className="shrink-0 text-sm font-bold text-emerald-950">{value}</span>
    </li>
  );
}

function CityCards({ city, scope }: { city: CityInsight; scope: InsightScope }) {
  const bands = city.askingPriceBands;
  const maximum = Math.max(...bands.map(band => band.count), 0);
  const topBand = leadingBand(bands);
  const searchHref = citySearchHref(city, scope);
  const computedAt = new Date(city.computedAt);
  const updated = Number.isNaN(computedAt.getTime())
    ? null
    : formatDistanceToNow(computedAt, { addSuffix: true });
  const locality = city.leadingLocality;

  return (
    <div id="home-market-insights-content">
      <div
        data-testid="market-insights-cards"
        className="scrollbar-hide -mx-3.5 mt-4 flex snap-x snap-mandatory scroll-px-3.5 gap-3 overflow-x-auto px-3.5 pb-2 sm:mx-0 sm:scroll-px-0 sm:px-0 lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible lg:pb-0"
      >
        <InsightCard
          title="Local supply"
          city={city.name}
          icon={MapPin}
          tone="blue"
          takeaway={
            locality ? `Most homes for sale in ${city.name} are in ${locality.name}.` : null
          }
        >
          {locality ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-blue-100 bg-blue-50/40 px-3 py-5 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-800">
                {scope === 'province' ? 'Leading city' : 'Leading locality'}
              </p>
              {locality.href ? (
                <Link
                  href={locality.href}
                  className={`group mt-3 flex flex-col items-center ${FOCUS_RING}`}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-800 transition-transform group-hover:scale-105">
                    <MapPin className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="mt-2 text-base font-bold text-slate-900 group-hover:text-blue-800">
                    {locality.name}
                  </span>
                </Link>
              ) : (
                <div className="mt-3 flex flex-col items-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-800">
                    <MapPin className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="mt-2 text-base font-bold text-slate-900">{locality.name}</span>
                </div>
              )}
              <span className="mt-0.5 text-xs font-medium text-slate-600">
                {locality.listingCount.toLocaleString('en-ZA')}{' '}
                {locality.listingCount === 1 ? 'listing' : 'listings'}
              </span>
            </div>
          ) : (
            <div className="flex-1" />
          )}
          {city.href ? (
            <CardLink href={city.href} tone="blue">
              Explore {city.name}
            </CardLink>
          ) : null}
        </InsightCard>

        <InsightCard
          title="Asking price"
          city={city.name}
          icon={BarChart3}
          tone="amber"
          takeaway={topBand ? `Most homes are asking ${topBand.label}.` : null}
        >
          <ul
            aria-label={`Homes for sale in ${city.name} by asking price`}
            className="flex flex-1 flex-col justify-center gap-3 rounded-xl border border-amber-100 bg-amber-50/40 p-3"
          >
            {bands.map(band => (
              <li
                key={band.key}
                aria-label={`${band.label}: ${homesLabel(band.count)}`}
                className="grid grid-cols-[5.25rem_minmax(0,1fr)_1.75rem] items-center gap-2 text-xs"
              >
                <span aria-hidden="true" className="font-medium text-slate-700">
                  {band.label}
                </span>
                <span
                  aria-hidden="true"
                  className="h-2.5 overflow-hidden rounded-full bg-amber-100"
                >
                  <span
                    className="block h-full rounded-full bg-amber-500 transition-[width] duration-500"
                    style={{
                      width:
                        band.count > 0 && maximum > 0
                          ? `${Math.max(6, (band.count / maximum) * 100)}%`
                          : '0%',
                    }}
                  />
                </span>
                <span aria-hidden="true" className="text-right font-bold text-amber-950">
                  {band.count}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] font-medium text-slate-600">Number of homes by asking price</p>
        </InsightCard>

        <InsightCard title="Market activity" city={city.name} icon={TrendingUp} tone="green">
          <ul className="flex flex-1 flex-col justify-center gap-2.5">
            <ActivityRow
              icon={Building2}
              label="Active sale listings"
              value={city.activeSaleListings.toLocaleString('en-ZA')}
            />
            <ActivityRow
              icon={BarChart3}
              label="Median asking price"
              value={formatAskingPrice(city.medianAskingPrice)}
            />
            {city.typicalPricePerM2 !== null ? (
              <ActivityRow
                icon={TrendingUp}
                label="Typical asking price / m²"
                value={`${formatCurrency(city.typicalPricePerM2)}/m²`}
              />
            ) : null}
          </ul>
          {searchHref ? (
            <CardLink href={searchHref} tone="green">
              View {city.name} homes for sale
            </CardLink>
          ) : null}
        </InsightCard>
      </div>

      <p className="mt-4 flex max-w-3xl items-start gap-2 text-xs leading-5 text-slate-600">
        <SquareStack className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {FOOTNOTE}
          {updated ? ` Updated ${updated}.` : ''}
        </span>
      </p>
    </div>
  );
}

function CardSkeletons() {
  return (
    <div role="status" aria-label="Loading property price insights">
      <Skeleton className="h-11 w-full max-w-xl rounded-xl" />
      <div className="-mx-3.5 mt-4 flex gap-3 overflow-hidden px-3.5 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-3 lg:gap-4">
        {[0, 1, 2].map(index => (
          <Skeleton
            key={index}
            className="h-[24rem] w-[82%] max-w-[22rem] shrink-0 rounded-2xl lg:w-auto lg:max-w-none"
          />
        ))}
      </div>
    </div>
  );
}

export function HomeMarketInsightsSection({
  selectedProvince,
  onProvinceChange,
}: {
  /** The page's shared province. Without it the section keeps its own. */
  selectedProvince?: string;
  onProvinceChange?: (province: string) => void;
} = {}) {
  const [province, setProvince] = useSharedHomeProvince(selectedProvince, onProvinceChange);
  const provincePlaceId = homeProvincePlaceId(province);
  const { data, isLoading, isError, error, refetch } =
    trpc.homeMarketInsights.getProvinceInsights.useQuery(
      { provincePlaceId: provincePlaceId ?? '' },
      {
        enabled: Boolean(provincePlaceId),
        staleTime: STALE_TIME_MS,
        retry: (failureCount: number, failure: unknown) =>
          isProcedureMissing(failure) ? false : failureCount < 2,
      },
    );
  const insights = data as ProvinceInsights | undefined;
  const cities = useMemo(() => insights?.cities ?? [], [insights]);
  const provinceFigures = insights?.province ?? null;

  // The chip is remembered with its province, so changing province goes back to "All of ...".
  const [choice, setChoice] = useState<{ province: string; key: string } | null>(null);
  const chosenKey = choice && choice.province === province ? choice.key : null;
  const chosenCity = cities.find(city => city.placeId === chosenKey);
  const selected: { city: CityInsight; scope: InsightScope } | undefined = chosenCity
    ? { city: chosenCity, scope: 'city' }
    : provinceFigures
      ? { city: provinceFigures, scope: 'province' }
      : cities[0]
        ? { city: cities[0], scope: 'city' }
        : undefined;
  const missing = isError && isProcedureMissing(error);
  const selectedKey = selected?.scope === 'province' ? ALL_KEY : selected?.city.placeId;

  return (
    <section className="home-section bg-white" aria-labelledby="home-insights-heading">
      <div className="home-section-header max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2774AE]">
          Property price insights
        </p>
        <h2
          id="home-insights-heading"
          className="home-section-title mt-2 text-[1.125rem] font-bold text-slate-900 sm:text-xl md:text-[26px]"
        >
          Make smarter property decisions
        </h2>
        <p className="max-w-3xl text-[13px] leading-5 text-slate-600 md:text-sm md:leading-6">
          Compare what homes for sale are asking in {province}, by city, and see where the most
          homes are listed.
        </p>
      </div>

      <ProvincePills
        selectedProvince={province}
        onProvinceChange={setProvince}
        label="Province for price insights"
      />

      {isLoading ? (
        <CardSkeletons />
      ) : isError && !missing ? (
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
        <SectionEmptyState
          icon={BarChart3}
          message={`Market insights for ${province} will appear here as more homes are listed.`}
          action={{ label: 'Explore areas', href: '/south-africa' }}
        />
      ) : (
        <div>
          <div className="scrollbar-hide -mx-4 flex justify-start overflow-x-auto px-4 pb-1 pt-1 sm:mx-0 sm:px-0">
            <div role="group" aria-label="City" className="flex flex-nowrap justify-start gap-2">
              {[
                ...(provinceFigures ? [{ key: ALL_KEY, label: `All of ${province}` }] : []),
                ...cities.map(city => ({ key: city.placeId, label: city.name })),
              ].map(chip => {
                const isSelected = chip.key === selectedKey;
                return (
                  <button
                    key={chip.key}
                    type="button"
                    aria-pressed={isSelected}
                    aria-controls="home-market-insights-content"
                    onClick={() => setChoice({ province, key: chip.key })}
                    className={`min-h-11 shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors md:text-sm ${FOCUS_RING} ${
                      isSelected
                        ? 'border-[#2774AE] bg-[#EEF5FB] text-[#1d5a8e]'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-[#2774AE]'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>
          <CityCards city={selected.city} scope={selected.scope} />
        </div>
      )}
    </section>
  );
}
