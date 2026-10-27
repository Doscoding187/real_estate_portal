import { useEffect, useState } from 'react';
import { CanonicalPlaceSelector, type CanonicalPlaceSelection } from '@/components/location/CanonicalPlaceSelector';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import {
  LAND_CLASSIFICATION_LABELS,
  LAND_PUBLIC_CLASSIFICATIONS,
  type LandPublicClassification,
} from '@shared/land-domain';
import { isCanonicalPlaceId } from '@shared/placeAuthority';
import { validateLandSearchGeography } from '@shared/landSearchGeography';

const LAND_CANONICAL_ASSIGNMENT_BLOCKER =
  'Land search is waiting for the canonical land_parcels.canonical_place_id field and reviewed Place assignments. Existing parcel labels will not be mapped automatically.';
const numberValue = (value: string) => (value.trim() ? Number(value) : undefined);

export default function PlotsAndLand() {
  const initial = new URLSearchParams(window.location.search);
  const hasRetiredGeography = [
    'city', 'province', 'locationId', 'locationIds', 'locations', 'searchAreaId', 'searchAreaIds',
  ].some(key => initial.has(key));
  const initialPlaceId = initial.get('canonicalPlaceId') || undefined;
  const [canonicalPlaceId, setCanonicalPlaceId] = useState(
    hasRetiredGeography || (initialPlaceId && !isCanonicalPlaceId(initialPlaceId))
      ? undefined
      : initialPlaceId,
  );
  const [selection, setSelection] = useState<CanonicalPlaceSelection | null>(null);
  const [canonicalPlaceIds, setCanonicalPlaceIds] = useState(initial.getAll('canonicalPlaceIds'));
  const [handoffError, setHandoffError] = useState<string | null>(
    hasRetiredGeography
      ? 'This link used retired city, province, or numeric geography. Select an admitted Place to continue.'
      : initial.get('searchError'),
  );
  const initialPlaceQuery = trpc.placeAuthority.resolveSearchPlace.useQuery(
    { placeId: canonicalPlaceId || '' },
    { enabled: Boolean(canonicalPlaceId), retry: false, staleTime: 300_000 },
  );
  const multiPlaceQuery = trpc.placeAuthority.resolveSearchPlaces.useQuery(
    { placeIds: canonicalPlaceIds },
    { enabled: canonicalPlaceIds.length > 0, retry: false, staleTime: 300_000 },
  );
  useEffect(() => {
    const place = initialPlaceQuery.data;
    setSelection(
      place
        ? {
            canonicalPlaceId: place.placeId,
            label: place.label,
            placeType: place.placeType,
            scope: place.searchScope,
            administrativeContext: place.administrativeContext,
            canonicalPath: place.canonicalPath,
          }
        : null,
    );
  }, [initialPlaceQuery.data]);

  const [classification, setClassification] = useState<LandPublicClassification | ''>(() => {
    const value = initial.get('classification') as LandPublicClassification | null;
    return value && LAND_PUBLIC_CLASSIFICATIONS.includes(value) ? value : '';
  });
  const [minPrice, setMinPrice] = useState(initial.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(initial.get('maxPrice') || '');
  const [minSize, setMinSize] = useState(initial.get('minSize') || '');
  const [maxSize, setMaxSize] = useState(initial.get('maxSize') || '');

  const geographyIssue = validateLandSearchGeography({
    canonicalPlaceId,
    canonicalPlaceIds,
  });

  useEffect(() => {
    const next = new URLSearchParams();
    if (canonicalPlaceId) next.set('canonicalPlaceId', canonicalPlaceId);
    canonicalPlaceIds.forEach(id => next.append('canonicalPlaceIds', id));
    if (classification) next.set('classification', classification);
    if (minPrice) next.set('minPrice', minPrice);
    if (maxPrice) next.set('maxPrice', maxPrice);
    if (minSize) next.set('minSize', minSize);
    if (maxSize) next.set('maxSize', maxSize);
    if (handoffError) next.set('searchError', 'retired-geography');
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${next.toString() ? `?${next}` : ''}`,
    );
  }, [
    canonicalPlaceId,
    canonicalPlaceIds,
    classification,
    minPrice,
    maxPrice,
    minSize,
    maxSize,
    handoffError,
  ]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-3xl font-semibold">Plots &amp; Land</h1>
        <p className="mt-2 text-slate-600">Find land. Understand the land. Verify what matters.</p>
      </header>

      {handoffError && (
        <p role="alert" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {handoffError}
        </p>
      )}

      <p role="status" className="rounded border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
        {LAND_CANONICAL_ASSIGNMENT_BLOCKER}
      </p>

      <section
        aria-label="Land search filters"
        className="grid gap-3 rounded border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="sm:col-span-2">
          <CanonicalPlaceSelector
            value={selection}
            onChange={value => {
              setSelection(value);
              setCanonicalPlaceId(value?.canonicalPlaceId);
              setCanonicalPlaceIds([]);
              setHandoffError(null);
            }}
            purpose="search"
            label="Canonical Place"
            placeholder="Choose an admitted city, town, suburb or locality"
            hint="Land geography is selected from the admitted Place Authority."
          />
          {canonicalPlaceIds.length > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              {multiPlaceQuery.data?.results
                .map(place => place?.label)
                .filter(Boolean)
                .join(' · ') || 'The selected Places will be checked against canonical assignments.'}
            </p>
          )}
        </div>
        <label className="grid gap-1 text-sm">
          <span>Land type</span>
          <Select
            value={classification || 'any'}
            onValueChange={value =>
              setClassification(value === 'any' ? '' : (value as LandPublicClassification))
            }
          >
            <SelectTrigger aria-label="Land type" className="w-full">
              <SelectValue placeholder="Any land type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any land type</SelectItem>
              {LAND_PUBLIC_CLASSIFICATIONS.map(value => (
                <SelectItem key={value} value={value}>
                  {LAND_CLASSIFICATION_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="grid gap-1 text-sm">
          <span>Minimum price (R)</span>
          <Input aria-label="Minimum price (R)" type="number" min="1" value={minPrice} onChange={event => setMinPrice(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Maximum price (R)</span>
          <Input aria-label="Maximum price (R)" type="number" min="1" value={maxPrice} onChange={event => setMaxPrice(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Minimum extent (m²)</span>
          <Input aria-label="Minimum extent (m²)" type="number" min="1" value={minSize} onChange={event => setMinSize(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Maximum extent (m²)</span>
          <Input aria-label="Maximum extent (m²)" type="number" min="1" value={maxSize} onChange={event => setMaxSize(event.target.value)} />
        </label>
        <button
          type="button"
          disabled
          title={geographyIssue?.message || LAND_CANONICAL_ASSIGNMENT_BLOCKER}
          className="rounded bg-slate-300 px-4 py-2 font-medium text-slate-600"
        >
          Land search unavailable
        </button>
      </section>
    </main>
  );
}
