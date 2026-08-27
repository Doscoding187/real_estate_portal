import { Link } from 'wouter';
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const money = (minor: number) =>
  `R ${(minor / 100).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;

const MARKETS = [
  { value: 'all', label: 'All Shared Living' },
  { value: 'room_share', label: 'Rooms' },
  { value: 'independent_micro', label: 'Cottages & Small Places' },
  { value: 'student', label: 'Student Living' },
] as const;

type MarketTag = (typeof MARKETS)[number]['value'];
type Bathroom = 'any' | 'own' | 'shared';
type Furnishing = 'any' | 'furnished' | 'partial';

const TYPE_LABELS: Record<string, string> = {
  private_room: 'Private room',
  shared_room: 'Shared room',
  en_suite_room: 'En-suite room',
  garden_cottage: 'Garden cottage',
  granny_flat: 'Granny flat',
  bachelor_studio: 'Bachelor / studio',
  backyard_room: 'Backyard room',
  backyard_unit: 'Backyard flat',
  room_shared_house: 'Room in shared house',
  room_shared_apartment: 'Room in shared apartment',
};

type SearchInput = Parameters<typeof trpc.sharedLiving.search.useQuery>[0];

export default function SharedLiving() {
  const handoffParams = new URLSearchParams(window.location.search);
  const unsupportedLocationScope =
    handoffParams.get('searchError') === 'unsupported-location-scope';
  const marketParam = handoffParams.get('market');
  const bathroomParam = handoffParams.get('bathroom');
  const furnishedParam = handoffParams.get('furnished');

  const [marketTag, setMarketTag] = useState<MarketTag>(
    MARKETS.some(market => market.value === marketParam) ? (marketParam as MarketTag) : 'all',
  );
  const [location, setLocation] = useState(handoffParams.get('location') || '');
  const [minPrice, setMinPrice] = useState(handoffParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(handoffParams.get('maxPrice') || '');
  const [billsElectricity, setBillsElectricity] = useState(
    handoffParams.get('billsElectricity') === '1',
  );
  const [bathroom, setBathroom] = useState<Bathroom>(
    bathroomParam === 'own' || bathroomParam === 'shared' ? bathroomParam : 'any',
  );
  const [furnished, setFurnished] = useState<Furnishing>(
    furnishedParam === 'furnished' || furnishedParam === 'partial' ? furnishedParam : 'any',
  );
  const [page, setPage] = useState(Number(handoffParams.get('page')) || 0);

  const searchInput: SearchInput = {
    marketTag: marketTag === 'all' ? undefined : marketTag,
    location: location || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    billsElectricity: billsElectricity || undefined,
    bathroom: bathroom !== 'any' ? bathroom : undefined,
    furnished: furnished !== 'any' ? furnished : undefined,
    page,
  };

  const results = trpc.sharedLiving.search.useQuery(searchInput, {
    enabled: !unsupportedLocationScope,
  });

  useEffect(() => {
    const next = new URLSearchParams();
    if (marketTag) next.set('market', marketTag);
    if (location) next.set('location', location);
    if (minPrice) next.set('minPrice', minPrice);
    if (maxPrice) next.set('maxPrice', maxPrice);
    if (billsElectricity) next.set('billsElectricity', '1');
    if (bathroom !== 'any') next.set('bathroom', bathroom);
    if (furnished !== 'any') next.set('furnished', furnished);
    if (page > 0) next.set('page', String(page));
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${next.toString() ? `?${next}` : ''}`,
    );
  }, [marketTag, location, minPrice, maxPrice, billsElectricity, bathroom, furnished, page]);

  const total = results.data?.total ?? 0;
  const pageSize = results.data?.pageSize ?? 24;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <header>
        <p className="text-sm font-medium text-emerald-700">Property Listify · Shared Living</p>
        <h1 className="text-3xl font-semibold">Find a room or a small place to rent</h1>
        <p className="mt-2 text-slate-600">
          Rooms in homes, cottages, granny flats, backyard places and student living — with the real
          arrangement shown honestly: what is included, what is shared, and what still needs
          confirming.
        </p>
      </header>

      {unsupportedLocationScope && (
        <p
          role="alert"
          className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          Multi-location and Search Area handoffs are not available for Shared Living yet. Pick one
          place to continue.
        </p>
      )}

      <section
        aria-label="Shared Living filters"
        className="grid gap-3 rounded border bg-white p-4 md:grid-cols-3 lg:grid-cols-4"
      >
        <label className="grid gap-1 text-sm">
          <span>Market</span>
          <Select
            value={marketTag}
            onValueChange={value => {
              setMarketTag(value as MarketTag);
              setPage(0);
            }}
          >
            <SelectTrigger aria-label="Market" className="w-full">
              <SelectValue placeholder="All markets" />
            </SelectTrigger>
            <SelectContent>
              {MARKETS.map(market => (
                <SelectItem key={market.value} value={market.value}>
                  {market.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="grid gap-1 text-sm">
          <span>Area</span>
          <Input
            aria-label="Area"
            placeholder="Suburb or city"
            value={location}
            onChange={event => {
              setLocation(event.target.value);
              setPage(0);
            }}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Minimum rent (R/month)</span>
          <Input
            aria-label="Minimum rent"
            type="number"
            min="0"
            value={minPrice}
            onChange={event => {
              setMinPrice(event.target.value);
              setPage(0);
            }}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Maximum rent (R/month)</span>
          <Input
            aria-label="Maximum rent"
            type="number"
            min="0"
            value={maxPrice}
            onChange={event => {
              setMaxPrice(event.target.value);
              setPage(0);
            }}
          />
        </label>
        <label
          className="flex items-center gap-2 text-sm"
          htmlFor="shared-living-bills-electricity"
        >
          <Checkbox
            id="shared-living-bills-electricity"
            aria-label="Electricity included"
            checked={billsElectricity}
            onCheckedChange={checked => setBillsElectricity(checked === true)}
          />
          <span>Electricity included</span>
        </label>
        <label className="grid gap-1 text-sm">
          <span>Bathroom</span>
          <Select
            value={bathroom}
            onValueChange={value => {
              setBathroom(value as typeof bathroom);
              setPage(0);
            }}
          >
            <SelectTrigger aria-label="Bathroom" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="own">Own bathroom</SelectItem>
              <SelectItem value="shared">Shared</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="grid gap-1 text-sm">
          <span>Furnishing</span>
          <Select
            value={furnished}
            onValueChange={value => {
              setFurnished(value as typeof furnished);
              setPage(0);
            }}
          >
            <SelectTrigger aria-label="Furnishing" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="furnished">Furnished</SelectItem>
              <SelectItem value="partial">Partly furnished</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </section>

      {!unsupportedLocationScope && !results.isLoading && total === 0 ? (
        <p className="rounded border bg-white p-4 text-sm text-slate-600">
          No rooms or small places match this search yet. Try widening the area or clearing a
          filter.
        </p>
      ) : null}

      <section aria-label="Shared Living results" className="grid gap-4 md:grid-cols-2">
        {(results.data?.items ?? []).map(space => (
          <Link
            key={space.slug}
            href={space.href}
            className="rounded border bg-white p-5 hover:border-emerald-500"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{space.label}</p>
                <p className="text-sm text-slate-600">
                  {TYPE_LABELS[space.accommodationType] ?? space.accommodationType} ·{' '}
                  {space.locationDisplay}
                </p>
              </div>
              {space.rentUnknown ? (
                <p className="whitespace-nowrap text-sm font-semibold text-slate-700">
                  Rent to confirm
                </p>
              ) : (
                <p className="whitespace-nowrap font-semibold text-slate-900">
                  {money(space.rentAmountMinor)}
                  <span className="text-xs font-normal text-slate-500"> /month</span>
                </p>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-700">
              {[
                space.rentableAreaM2 != null
                  ? `${Number(space.rentableAreaM2).toLocaleString()} m²`
                  : null,
                space.bathroomAccess === 'own'
                  ? 'Own bathroom'
                  : space.bathroomAccess === 'shared'
                    ? 'Shared bathroom'
                    : null,
                billsIncludedLabel(space.billsIncluded),
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </Link>
        ))}
      </section>

      {total > pageSize && (
        <nav
          aria-label="Result pages"
          className="flex items-center justify-between rounded border bg-white p-4"
        >
          <Button
            type="button"
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <p className="text-sm text-slate-600">
            Page {page + 1} of {Math.max(1, pageCount)} · {total} spaces
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={(page + 1) * pageSize >= total}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </nav>
      )}
    </main>
  );
}

function billsIncludedLabel(bills: { electricity: boolean; water: boolean; wifi: boolean }) {
  const parts: string[] = [];
  if (bills.electricity) parts.push('Electricity incl.');
  if (bills.water) parts.push('Water incl.');
  if (bills.wifi) parts.push('Wi-Fi incl.');
  return parts.length ? parts.join(', ') : 'Bills separate';
}
