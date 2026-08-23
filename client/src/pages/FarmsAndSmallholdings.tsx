import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import {
  FARM_INTENTS,
  parseFarmIntent,
  parseFarmSearchParams,
  sanitizeFarmSearchFilters,
} from '@shared/farmSearchContract';

const numberValue = (value: string) => (value.trim() ? Number(value) : undefined);

const INTENT_LABELS: Record<string, string> = {
  sale: 'For Sale',
  rent: 'To Rent',
};

/**
 * Specialist Farms & Smallholdings journey over the canonical published
 * inventory search. Geography follows the Land precedent: a typed manual edit
 * replaces, never layers over, a specialist geography handoff.
 */
export default function FarmsAndSmallholdings() {
  const initial = new URLSearchParams(window.location.search);
  const [handoffError, setHandoffError] = useState(initial.get('searchError'));
  const [listingType, setListingType] = useState(() => parseFarmIntent(initial.get('listingType')));
  const [city, setCity] = useState(initial.get('city') || '');
  const [province, setProvince] = useState(initial.get('province') || '');
  const [minPrice, setMinPrice] = useState(initial.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(initial.get('maxPrice') || '');
  const [minLandSize, setMinLandSize] = useState(initial.get('minLandSize') || '');
  const [maxLandSize, setMaxLandSize] = useState(initial.get('maxLandSize') || '');
  const [locationId, setLocationId] = useState(initial.get('locationId') || undefined);
  const [locationIds, setLocationIds] = useState(initial.getAll('locationIds'));
  const [searchAreaId, setSearchAreaId] = useState(initial.get('searchAreaId') || undefined);

  const applyManualGeography = (edit: { city: string; province: string }) => {
    setCity(edit.city);
    setProvince(edit.province);
    setLocationId(undefined);
    setLocationIds([]);
    setSearchAreaId(undefined);
    setHandoffError(null);
  };

  const queryInput = {
    ...sanitizeFarmSearchFilters({
      listingType,
      minPrice,
      maxPrice,
      minLandSize,
      maxLandSize,
    }),
    propertyType: 'farm' as const,
    city: city || undefined,
    province: province || undefined,
    locationId,
    locationIds: locationIds.length ? locationIds : undefined,
    searchAreaId,
  };
  const results = trpc.properties.searchPublicInventory.useQuery(queryInput);

  useEffect(() => {
    const next = new URLSearchParams();
    next.set('listingType', listingType);
    if (city) next.set('city', city);
    if (province) next.set('province', province);
    if (minPrice) next.set('minPrice', minPrice);
    if (maxPrice) next.set('maxPrice', maxPrice);
    if (minLandSize) next.set('minLandSize', minLandSize);
    if (maxLandSize) next.set('maxLandSize', maxLandSize);
    if (locationId) next.set('locationId', locationId);
    locationIds.forEach(id => next.append('locationIds', id));
    if (searchAreaId) next.set('searchAreaId', searchAreaId);
    if (handoffError) next.set('searchError', handoffError);
    window.history.replaceState(null, '', `${window.location.pathname}?${next.toString()}`);
  }, [
    listingType,
    city,
    province,
    minPrice,
    maxPrice,
    minLandSize,
    maxLandSize,
    handoffError,
    locationId,
    searchAreaId,
    locationIds,
  ]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-3xl font-semibold">Farms &amp; Smallholdings</h1>
        <p className="mt-2 text-slate-600">
          Space, price and place. Every result is an eligible published farm or smallholding.
        </p>
      </header>
      {handoffError === 'unsupported-location-scope' && (
        <p
          role="alert"
          className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          That location scope is not available for Farms &amp; Smallholdings yet. Choose a canonical
          province, city, suburb, sibling locations, or an approved Search Area.
        </p>
      )}
      {results.error && (
        <p
          role="alert"
          className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {results.error.message}
        </p>
      )}
      <section
        aria-label="Farm search filters"
        className="grid gap-3 rounded border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className="grid gap-1 text-sm">
          <span>Intent</span>
          <select
            className="rounded border p-2"
            value={listingType}
            onChange={event => setListingType(parseFarmIntent(event.target.value))}
          >
            {FARM_INTENTS.map(intent => (
              <option key={intent} value={intent}>
                {INTENT_LABELS[intent]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span>City</span>
          <input
            className="rounded border p-2"
            placeholder="City"
            value={city}
            onChange={event => applyManualGeography({ city: event.target.value, province })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Province</span>
          <input
            className="rounded border p-2"
            placeholder="Province"
            value={province}
            onChange={event => applyManualGeography({ city, province: event.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Minimum price (R)</span>
          <input
            className="rounded border p-2"
            type="number"
            min="0"
            value={minPrice}
            onChange={event => setMinPrice(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Maximum price (R)</span>
          <input
            className="rounded border p-2"
            type="number"
            min="0"
            value={maxPrice}
            onChange={event => setMaxPrice(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Minimum land extent (m²)</span>
          <input
            className="rounded border p-2"
            type="number"
            min="0"
            value={minLandSize}
            onChange={event => setMinLandSize(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Maximum land extent (m²)</span>
          <input
            className="rounded border p-2"
            type="number"
            min="0"
            value={maxLandSize}
            onChange={event => setMaxLandSize(event.target.value)}
          />
        </label>
      </section>
      <section aria-label="Farm results" className="space-y-3">
        {(results.data?.cards ?? []).map(card => {
          const item = card as {
            kind: string;
            id: string;
            href: string;
            title?: string;
            location?: string;
            price?: number;
            image?: string;
          };
          if (item.kind !== 'property') return null;
          return (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center justify-between gap-4 rounded border bg-white p-4 hover:border-slate-400"
            >
              <div>
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="text-sm text-slate-600">{item.location}</p>
              </div>
              {typeof item.price === 'number' && (
                <p className="whitespace-nowrap font-semibold text-slate-900">
                  R {item.price.toLocaleString('en-ZA')}
                </p>
              )}
            </Link>
          );
        })}
        {results.data && (results.data.cards ?? []).length === 0 && (
          <p className="rounded border bg-white p-4 text-sm text-slate-600">
            No farms or smallholdings match this search yet. Adjust the filters or widen the
            location.
          </p>
        )}
      </section>
    </main>
  );
}
