import { Link } from 'wouter';
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { LocationAutosuggest } from '@/components/LocationAutosuggest';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { hasCanonicalLocationIdentity } from '@/lib/locationDiscovery';
import type { LocationNode } from '@/types/location';
import {
  SHARED_LIVING_ACCOMMODATION_LABELS,
  SHARED_LIVING_ACCOMMODATION_TYPES,
} from '@shared/sharedLivingDomain';
import {
  appendSharedLivingSearchReturn,
  resolveSharedLivingSearchGeography,
} from '@shared/sharedLivingSearchContract';
import { parseCanonicalLocationId } from '@shared/locationAuthority';

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
type AccommodationType = 'all' | (typeof SHARED_LIVING_ACCOMMODATION_TYPES)[number];
type SearchInput = Parameters<typeof trpc.sharedLiving.search.useQuery>[0];

function locationNodeForCanonicalId(locationId: string): LocationNode | null {
  const parsed = parseCanonicalLocationId(locationId);
  if (!parsed) return null;
  return {
    id: locationId,
    canonicalLocationId: locationId,
    name: `Selected ${parsed.level}`,
    slug: locationId,
    type: parsed.level,
  } as LocationNode;
}

function initialLocationSelection(search: URLSearchParams) {
  const geography = resolveSharedLivingSearchGeography({
    locationId: search.get('locationId'),
    locationIds: search.getAll('locationIds'),
    searchAreaId: search.get('searchAreaId'),
  });
  if (geography.status !== 'canonical') {
    return {
      locations: [] as LocationNode[],
      issue: geography.status === 'none' ? null : geography.message,
    };
  }
  return {
    locations: geography.locationIds
      .map(locationNodeForCanonicalId)
      .filter((location): location is LocationNode => Boolean(location)),
    issue: null,
  };
}

function buildSharedLivingSearchPath(input: {
  marketTag: MarketTag;
  geography: ReturnType<typeof resolveSharedLivingSearchGeography>;
  accommodationType: AccommodationType;
  minPrice: string;
  maxPrice: string;
  billsElectricity: boolean;
  bathroom: Bathroom;
  furnished: Furnishing;
  page: number;
}) {
  const next = new URLSearchParams();
  if (input.marketTag !== 'all') next.set('market', input.marketTag);
  if (input.geography.status === 'canonical') {
    if (input.geography.locationIds.length === 1) {
      next.set('locationId', input.geography.locationIds[0]);
    } else {
      input.geography.locationIds.forEach(locationId => next.append('locationIds', locationId));
    }
  }
  if (input.accommodationType !== 'all') next.set('type', input.accommodationType);
  if (input.minPrice) next.set('minPrice', input.minPrice);
  if (input.maxPrice) next.set('maxPrice', input.maxPrice);
  if (input.billsElectricity) next.set('billsElectricity', '1');
  if (input.bathroom !== 'any') next.set('bathroom', input.bathroom);
  if (input.furnished !== 'any') next.set('furnished', input.furnished);
  if (input.page > 0) next.set('page', String(input.page));
  return `/shared-living${next.toString() ? `?${next.toString()}` : ''}`;
}

export default function SharedLiving() {
  const handoffParams = new URLSearchParams(window.location.search);
  const initialLocation = initialLocationSelection(handoffParams);
  const marketParam = handoffParams.get('market');
  const bathroomParam = handoffParams.get('bathroom');
  const furnishedParam = handoffParams.get('furnished');
  const typeParam = handoffParams.get('type');

  const [marketTag, setMarketTag] = useState<MarketTag>(
    MARKETS.some(market => market.value === marketParam) ? (marketParam as MarketTag) : 'all',
  );
  const [selectedLocations, setSelectedLocations] = useState<LocationNode[]>(
    initialLocation.locations,
  );
  const [locationIssue, setLocationIssue] = useState<string | null>(initialLocation.issue);
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
  const [accommodationType, setAccommodationType] = useState<AccommodationType>(
    SHARED_LIVING_ACCOMMODATION_TYPES.includes(typeParam as any)
      ? (typeParam as AccommodationType)
      : 'all',
  );
  const [page, setPage] = useState(Number(handoffParams.get('page')) || 0);

  const locationIds = selectedLocations
    .map(location => String(location.canonicalLocationId || location.id || '').trim())
    .filter(Boolean);
  const geography = resolveSharedLivingSearchGeography({
    locationId: locationIds.length === 1 ? locationIds[0] : undefined,
    locationIds: locationIds.length > 1 ? locationIds : undefined,
  });
  const activeLocationIssue =
    locationIssue ||
    (geography.status === 'invalid' || geography.status === 'unsupported_search_area'
      ? geography.message
      : null);

  const searchInput: SearchInput = {
    marketTag: marketTag === 'all' ? undefined : marketTag,
    accommodationTypes: accommodationType === 'all' ? undefined : [accommodationType],
    locationId:
      geography.status === 'canonical' && geography.locationIds.length === 1
        ? geography.locationIds[0]
        : undefined,
    locationIds:
      geography.status === 'canonical' && geography.locationIds.length > 1
        ? geography.locationIds
        : undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    billsElectricity: billsElectricity || undefined,
    bathroom: bathroom !== 'any' ? bathroom : undefined,
    furnished: furnished !== 'any' ? furnished : undefined,
    page,
  };

  const results = trpc.sharedLiving.search.useQuery(searchInput, {
    enabled: !activeLocationIssue,
  });

  const searchPath = buildSharedLivingSearchPath({
    marketTag,
    geography,
    accommodationType,
    minPrice,
    maxPrice,
    billsElectricity,
    bathroom,
    furnished,
    page,
  });

  useEffect(() => {
    window.history.replaceState(null, '', searchPath);
  }, [searchPath]);

  const total = results.data?.total ?? 0;
  const pageSize = results.data?.pageSize ?? 24;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const returnTo = searchPath;

  function selectLocation(location: LocationNode) {
    if (!hasCanonicalLocationIdentity(location)) {
      setLocationIssue('Choose a location from the Property Listify location catalogue.');
      return;
    }
    const canonicalLocationId = String(location.canonicalLocationId || location.id);
    const existingParent = selectedLocations[0]?.parentCanonicalLocationId;
    const candidateParent = location.parentCanonicalLocationId;
    if (
      selectedLocations.length > 0 &&
      existingParent &&
      candidateParent &&
      existingParent !== candidateParent
    ) {
      setLocationIssue('Choose sibling Shared Living locations under the same canonical parent.');
      return;
    }
    const next = [
      ...selectedLocations,
      { ...location, id: canonicalLocationId, canonicalLocationId },
    ];
    const nextGeography = resolveSharedLivingSearchGeography({
      locationId: next.length === 1 ? canonicalLocationId : undefined,
      locationIds:
        next.length > 1 ? next.map(item => String(item.canonicalLocationId || item.id)) : undefined,
    });
    if (nextGeography.status !== 'canonical') {
      setLocationIssue(
        nextGeography.status === 'none'
          ? 'Choose a canonical Shared Living location.'
          : nextGeography.message,
      );
      return;
    }
    setLocationIssue(null);
    setSelectedLocations(next);
    setPage(0);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-medium text-emerald-700">Property Listify · Shared Living</p>
          <h1 className="text-3xl font-semibold">Find a room or a small place to rent</h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Rooms in homes, cottages, granny flats, backyard places and student living — with the
            arrangement shown honestly: what is included, what is shared, and what still needs
            confirming.
          </p>
        </div>
        <Link
          className="whitespace-nowrap rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          href="/shared-living/list"
        >
          List a space
        </Link>
      </header>

      {activeLocationIssue && (
        <p
          role="alert"
          className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {activeLocationIssue}
        </p>
      )}
      {results.error && (
        <p
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900"
        >
          {results.error.message}
        </p>
      )}

      <section
        aria-label="Shared Living filters"
        className="grid gap-3 rounded border bg-white p-4 md:grid-cols-3 lg:grid-cols-4"
      >
        <label className="grid gap-1 text-sm md:col-span-2">
          <span>Area</span>
          <LocationAutosuggest
            inputId="shared-living-location"
            placeholder="Choose a city, suburb, or province"
            selectedLocations={selectedLocations}
            maxLocations={5}
            onSelect={selectLocation}
            onRemove={index => {
              setSelectedLocations(locations =>
                locations.filter((_, itemIndex) => itemIndex !== index),
              );
              setLocationIssue(null);
              setPage(0);
            }}
          />
          <span className="text-xs text-slate-500">
            Select one canonical location, or sibling locations at the same level. Search Areas are
            not available yet.
          </span>
        </label>
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
          <span>Accommodation type</span>
          <Select
            value={accommodationType}
            onValueChange={value => {
              setAccommodationType(value as AccommodationType);
              setPage(0);
            }}
          >
            <SelectTrigger aria-label="Accommodation type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any type</SelectItem>
              {SHARED_LIVING_ACCOMMODATION_TYPES.map(type => (
                <SelectItem key={type} value={type}>
                  {SHARED_LIVING_ACCOMMODATION_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              setBathroom(value as Bathroom);
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
              setFurnished(value as Furnishing);
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

      {!activeLocationIssue && !results.isLoading && total === 0 ? (
        <p className="rounded border bg-white p-4 text-sm text-slate-600">
          No rooms or small places match this search yet. Try another canonical area or clear a
          filter.
        </p>
      ) : null}

      <section aria-label="Shared Living results" className="grid gap-4 md:grid-cols-2">
        {(results.data?.items ?? []).map(space => (
          <Link
            key={space.slug}
            href={appendSharedLivingSearchReturn(space.href, returnTo)}
            className="rounded border bg-white p-5 hover:border-emerald-500"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{space.label}</p>
                <p className="text-sm text-slate-600">
                  {SHARED_LIVING_ACCOMMODATION_LABELS[
                    space.accommodationType as keyof typeof SHARED_LIVING_ACCOMMODATION_LABELS
                  ] ?? space.accommodationType}{' '}
                  · {space.locationDisplay}
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
            Page {page + 1} of {pageCount} · {total} spaces
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
