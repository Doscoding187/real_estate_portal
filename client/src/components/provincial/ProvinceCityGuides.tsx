import { useId, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { CityGuideEntry } from '@/components/CityGuideEntry';

interface GuideCity {
  name: string;
  slug: string;
  canonicalLocationId?: string | null;
}
interface GuideMarket {
  slug: string;
  name: string;
  city?: GuideCity | null;
}

export function ProvinceCityGuides({
  markets,
  cities = [],
  provinceSlug,
  provinceName,
  guidesLoading = false,
  search,
}: {
  markets: readonly GuideMarket[];
  cities?: readonly GuideCity[];
  provinceSlug: string;
  provinceName: string;
  guidesLoading?: boolean;
  search?: {
    query: string;
    onChange: (value: string) => void;
    results: readonly GuideCity[];
    isLoading: boolean;
    isError: boolean;
    onRetry: () => void;
  };
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const searching = Boolean(search?.query.trim());
  const entries = markets.map(market => ({
    name: market.name,
    slug: market.slug,
    city: market.city?.canonicalLocationId ? market.city : undefined,
  }));
  const seen = new Set(entries.map(entry => entry.slug));
  for (const city of cities) {
    if (!city.canonicalLocationId || seen.has(city.slug)) continue;
    entries.push({ name: city.name, slug: city.slug, city });
    seen.add(city.slug);
  }
  const displayedEntries = (
    searching
      ? (search?.results || [])
          .filter(city => city.canonicalLocationId)
          .map(city => ({ name: city.name, slug: city.slug, city }))
      : entries
  ).slice(0, 12);
  const gridClass = `home-card-grid scrollbar-hide grid grid-flow-col ${['grid-rows-1', 'grid-rows-2', 'grid-rows-3'][Math.min(3, displayedEntries.length || 1) - 1]} auto-cols-[78vw] snap-x overflow-x-auto pb-2 sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-2 sm:grid-rows-none sm:overflow-visible lg:grid-cols-4`;
  const awaitingQuery = searching && (search?.query.trim().length || 0) < 2;
  return (
    <>
      {awaitingQuery ? (
        <p role="status" className="py-6 text-sm text-slate-600">
          Enter at least two letters to search city guides.
        </p>
      ) : searching && search?.isLoading ? (
        <div
          role="status"
          aria-label="Searching city guides"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-[104px] rounded-xl" />
          ))}
        </div>
      ) : searching && search?.isError ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-800"
        >
          City guides could not be loaded.
          <Button variant="outline" className="ml-3 min-h-[44px] bg-white" onClick={search.onRetry}>
            Try again
          </Button>
        </div>
      ) : searching && !displayedEntries.length ? (
        <div
          role="status"
          className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600"
        >
          No city guides found for “{search?.query.trim()}” in {provinceName}. Try another city
          name.
        </div>
      ) : (
        <div className={gridClass} role="list" aria-label="City guides">
          {displayedEntries.map(entry => (
            <div role="listitem" key={entry.slug} className="min-w-0 snap-start">
              <CityGuideEntry
                city={{
                  name: entry.name,
                  slug: entry.city?.slug || entry.slug,
                  province: provinceName,
                  provinceSlug,
                }}
                href={entry.city ? `/${provinceSlug}/${entry.city.slug}` : undefined}
                ariaLabel={`Explore ${entry.name}`}
                className="block"
                unavailableLabel={guidesLoading ? 'Loading guide…' : 'Guide unavailable'}
              />
            </div>
          ))}
        </div>
      )}
      {search && (
        <div className="mt-5 max-w-sm">
          <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-slate-900">
            Search cities in {provinceName}
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <Input
              id={inputId}
              ref={inputRef}
              type="search"
              value={search.query}
              maxLength={100}
              placeholder="Enter a city name"
              className="min-h-[44px] rounded-full border-slate-200 pl-10 pr-12 [&::-webkit-search-cancel-button]:hidden"
              onChange={event => search.onChange(event.target.value)}
            />
            {searching && (
              <button
                type="button"
                className="absolute right-1 top-0 flex h-full min-w-[44px] items-center justify-center rounded-full text-slate-500 hover:text-[#2774AE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2774AE]"
                aria-label="Clear city search"
                onClick={() => {
                  search.onChange('');
                  inputRef.current?.focus();
                }}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
