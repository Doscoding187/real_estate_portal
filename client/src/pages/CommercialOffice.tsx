import { Link } from 'wouter';
import { useEffect, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CanonicalPlaceSelector, type CanonicalPlaceSelection } from '@/components/location/CanonicalPlaceSelector';
import { COMMERCIAL_CANONICAL_ASSIGNMENT_BLOCKER } from '@shared/commercial-domain';
import { isCanonicalPlaceId } from '@shared/placeAuthority';

const PAGE_SIZE = 24;

const COMMERCIAL_USE_TYPES = [
  { value: 'office', label: 'Office' },
  { value: 'industrial_logistics', label: 'Industrial & logistics' },
  { value: 'retail', label: 'Retail' },
] as const;

type CommercialUseType = (typeof COMMERCIAL_USE_TYPES)[number]['value'];

const money = (minor?: number | null) =>
  minor == null
    ? 'To confirm'
    : `R ${(minor / 100).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;


function parseUseTypes(value: string | null): CommercialUseType[] {
  const known = new Set(COMMERCIAL_USE_TYPES.map(type => type.value));
  return (value || '')
    .split(',')
    .map(item => item.trim())
    .filter((item): item is CommercialUseType => known.has(item as CommercialUseType));
}

function commercialUseTypeLabel(value: string) {
  return COMMERCIAL_USE_TYPES.find(type => type.value === value)?.label || value.replace(/_/g, ' ');
}

function primaryCommercialImage(space: any): string | null {
  const images = (Array.isArray(space?.media) ? space.media : []).filter(
    (item: any) =>
      item?.mediaType === 'image' && typeof item.url === 'string' && item.url.trim().length > 0,
  );
  const primary = images.find((item: any) => Number(item.isPrimary) === 1) || images[0];
  return primary?.url || null;
}

export default function CommercialOffice() {
  const handoffParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const retiredGeographyKeys = ['location', 'locationIds', 'city', 'province', 'suburb'];
  const hasRetiredGeography = retiredGeographyKeys.some(key => handoffParams.has(key));
  const initialPlaceId = handoffParams.get('canonicalPlaceId') || undefined;
  const initialUnsupportedLocationScope =
    hasRetiredGeography || Boolean(initialPlaceId && !isCanonicalPlaceId(initialPlaceId));
  const [unsupportedLocationScope, setUnsupportedLocationScope] = useState(
    initialUnsupportedLocationScope,
  );
  const [canonicalPlaceId, setCanonicalPlaceId] = useState(
    initialUnsupportedLocationScope ? undefined : initialPlaceId,
  );
  const [selection, setSelection] = useState<CanonicalPlaceSelection | null>(null);
  const selectedPlace = trpc.placeAuthority.resolveSearchPlace.useQuery(
    { placeId: canonicalPlaceId || '' },
    { enabled: Boolean(canonicalPlaceId), retry: false, staleTime: 300_000 },
  );
  useEffect(() => {
    const place = selectedPlace.data;
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
  }, [selectedPlace.data]);
  const [useTypes, setUseTypes] = useState<CommercialUseType[]>(() =>
    parseUseTypes(handoffParams.get('useTypes')),
  );
  const [minAreaM2, setMinAreaM2] = useState(handoffParams.get('minAreaM2') || '');
  const [maxAreaM2, setMaxAreaM2] = useState(handoffParams.get('maxAreaM2') || '');
  const [budget, setBudget] = useState(handoffParams.get('maxMonthlyBudget') || '');
  const [availability, setAvailability] = useState<'now' | 'future' | ''>(
    handoffParams.get('availability') === 'now'
      ? 'now'
      : handoffParams.get('availability') === 'future'
        ? 'future'
        : '',
  );
  const [pricingMode, setPricingMode] = useState<'componentised' | 'gross_quote' | ''>(
    handoffParams.get('pricingMode') === 'componentised'
      ? 'componentised'
      : handoffParams.get('pricingMode') === 'gross_quote'
        ? 'gross_quote'
        : '',
  );
  const [minParkingBays, setMinParkingBays] = useState(handoffParams.get('minParkingBays') || '');
  const [minEavesHeightM, setMinEavesHeightM] = useState(
    handoffParams.get('minEavesHeightM') || '',
  );
  const [minPowerCapacityKva, setMinPowerCapacityKva] = useState(
    handoffParams.get('minPowerCapacityKva') || '',
  );
  const [minLoadingDocks, setMinLoadingDocks] = useState(
    handoffParams.get('minLoadingDocks') || '',
  );
  const [yardHardstand, setYardHardstand] = useState(handoffParams.get('yardHardstand') === '1');
  const [extractionCapability, setExtractionCapability] = useState(
    handoffParams.get('extractionCapability') === '1',
  );
  const [fitOutCondition, setFitOutCondition] = useState(
    handoffParams.get('fitOutCondition') || '',
  );
  const [backupPower, setBackupPower] = useState(handoffParams.get('backupPower') === '1');
  const [backupWater, setBackupWater] = useState(handoffParams.get('backupWater') === '1');
  const [fibreConnectivity, setFibreConnectivity] = useState(
    handoffParams.get('fibreConnectivity') === '1',
  );
  const [page, setPage] = useState(Number(handoffParams.get('page')) || 0);

  const allSpaces: any[] = [];
  const totalResults = allSpaces.length;
  const pageCount = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visibleSpaces = allSpaces.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    const next = new URLSearchParams();
    if (canonicalPlaceId) next.set('canonicalPlaceId', canonicalPlaceId);
    if (useTypes.length) next.set('useTypes', useTypes.join(','));
    if (minAreaM2) next.set('minAreaM2', minAreaM2);
    if (maxAreaM2) next.set('maxAreaM2', maxAreaM2);
    if (budget) next.set('maxMonthlyBudget', budget);
    if (availability) next.set('availability', availability);
    if (pricingMode) next.set('pricingMode', pricingMode);
    if (fitOutCondition) next.set('fitOutCondition', fitOutCondition);
    if (minParkingBays) next.set('minParkingBays', minParkingBays);
    if (minEavesHeightM) next.set('minEavesHeightM', minEavesHeightM);
    if (minPowerCapacityKva) next.set('minPowerCapacityKva', minPowerCapacityKva);
    if (minLoadingDocks) next.set('minLoadingDocks', minLoadingDocks);
    if (yardHardstand) next.set('yardHardstand', '1');
    if (extractionCapability) next.set('extractionCapability', '1');
    if (backupPower) next.set('backupPower', '1');
    if (backupWater) next.set('backupWater', '1');
    if (fibreConnectivity) next.set('fibreConnectivity', '1');
    if (safePage > 0) next.set('page', String(safePage));
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${next.toString() ? `?${next}` : ''}`,
    );
  }, [
    availability,
    backupPower,
    backupWater,
    budget,
    extractionCapability,
    fibreConnectivity,
    fitOutCondition,
    canonicalPlaceId,
    maxAreaM2,
    minAreaM2,
    minEavesHeightM,
    minLoadingDocks,
    minParkingBays,
    minPowerCapacityKva,
    pricingMode,
    safePage,
    useTypes,
    yardHardstand,
  ]);

  const toggleUseType = (type: CommercialUseType) => {
    setUseTypes(current =>
      current.includes(type) ? current.filter(value => value !== type) : [...current, type],
    );
    setPage(0);
  };
  const changePage = (nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 0), pageCount - 1));
    window.scrollTo({ top: 0 });
  };
  const showIndustrialFilters = useTypes.length === 0 || useTypes.includes('industrial_logistics');
  const showRetailFilters = useTypes.length === 0 || useTypes.includes('retail');

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <section>
        <p className="text-sm font-medium text-sky-700">Property Listify Commercial · Leasing</p>
        <h1 className="text-3xl font-semibold">
          Find a commercial space that works for your business
        </h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Compare Office, Industrial &amp; Logistics, and Retail opportunities by rentable area,
          current availability and the commercial costs that are actually known.
        </p>
      </section>

      {unsupportedLocationScope ? (
        <p
          role="alert"
          className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          This link used retired text or numeric geography. Choose an admitted canonical Place to continue.
        </p>
      ) : null}

      <p role="status" className="rounded border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
        {COMMERCIAL_CANONICAL_ASSIGNMENT_BLOCKER}
      </p>

      <section className="space-y-4 rounded border bg-slate-50 p-4" aria-label="Commercial filters">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <CanonicalPlaceSelector
              value={selection}
              onChange={value => {
                setSelection(value);
                setCanonicalPlaceId(value?.canonicalPlaceId);
                setUnsupportedLocationScope(false);
                setPage(0);
              }}
              purpose="search"
              label="Canonical Place"
              placeholder="Search admitted Places"
            />
          </div>
          <label className="grid gap-1 text-sm">
            <span>Minimum square metres</span>
            <input
              aria-label="Minimum square metres"
              className="rounded border p-2"
              type="number"
              min="0"
              value={minAreaM2}
              onChange={event => {
                setMinAreaM2(event.target.value);
                setPage(0);
              }}
              placeholder="Min m²"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Maximum square metres</span>
            <input
              aria-label="Maximum square metres"
              className="rounded border p-2"
              type="number"
              min="0"
              value={maxAreaM2}
              onChange={event => {
                setMaxAreaM2(event.target.value);
                setPage(0);
              }}
              placeholder="Max m²"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Maximum monthly occupancy budget</span>
            <input
              aria-label="Monthly occupancy budget"
              className="rounded border p-2"
              type="number"
              min="0"
              value={budget}
              onChange={event => {
                setBudget(event.target.value);
                setPage(0);
              }}
              placeholder="Monthly budget (R)"
            />
          </label>
        </div>

        <fieldset>
          <legend className="text-sm font-medium">Use type</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {COMMERCIAL_USE_TYPES.map(type => (
              <label key={type.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  aria-label={type.label}
                  checked={useTypes.includes(type.value)}
                  onChange={() => toggleUseType(type.value)}
                />
                {type.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-sm">
            <span>Availability</span>
            <select
              aria-label="Availability"
              className="rounded border p-2"
              value={availability}
              onChange={event => {
                setAvailability(event.target.value as 'now' | 'future' | '');
                setPage(0);
              }}
            >
              <option value="">Available now or upcoming</option>
              <option value="now">Available now</option>
              <option value="future">Available from a future date</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span>Rental basis</span>
            <select
              aria-label="Rental basis"
              className="rounded border p-2"
              value={pricingMode}
              onChange={event => {
                setPricingMode(event.target.value as 'componentised' | 'gross_quote' | '');
                setPage(0);
              }}
            >
              <option value="">Gross or componentised</option>
              <option value="gross_quote">Gross quote</option>
              <option value="componentised">Componentised quote</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span>Minimum parking bays</span>
            <input
              aria-label="Minimum parking bays"
              className="rounded border p-2"
              type="number"
              min="0"
              value={minParkingBays}
              onChange={event => {
                setMinParkingBays(event.target.value);
                setPage(0);
              }}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Fit-out condition</span>
            <input
              aria-label="Fit-out condition"
              className="rounded border p-2"
              value={fitOutCondition}
              onChange={event => {
                setFitOutCondition(event.target.value);
                setPage(0);
              }}
              placeholder="e.g. fitted"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              aria-label="Backup power"
              type="checkbox"
              checked={backupPower}
              onChange={event => {
                setBackupPower(event.target.checked);
                setPage(0);
              }}
            />
            Backup power
          </label>
          <label className="flex items-center gap-2">
            <input
              aria-label="Backup water"
              type="checkbox"
              checked={backupWater}
              onChange={event => {
                setBackupWater(event.target.checked);
                setPage(0);
              }}
            />
            Backup water
          </label>
          <label className="flex items-center gap-2">
            <input
              aria-label="Fibre"
              type="checkbox"
              checked={fibreConnectivity}
              onChange={event => {
                setFibreConnectivity(event.target.checked);
                setPage(0);
              }}
            />
            Fibre connectivity
          </label>
        </div>

        {showIndustrialFilters ? (
          <fieldset className="border-t pt-4">
            <legend className="text-sm font-medium">Industrial &amp; logistics requirements</legend>
            <div className="mt-2 grid gap-3 md:grid-cols-4">
              <label className="grid gap-1 text-sm">
                <span>Minimum eaves height (m)</span>
                <input
                  aria-label="Minimum eaves height"
                  className="rounded border p-2"
                  type="number"
                  min="0"
                  value={minEavesHeightM}
                  onChange={event => {
                    setMinEavesHeightM(event.target.value);
                    setPage(0);
                  }}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Minimum power capacity (kVA)</span>
                <input
                  aria-label="Minimum power capacity"
                  className="rounded border p-2"
                  type="number"
                  min="0"
                  value={minPowerCapacityKva}
                  onChange={event => {
                    setMinPowerCapacityKva(event.target.value);
                    setPage(0);
                  }}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Minimum loading docks</span>
                <input
                  aria-label="Minimum loading docks"
                  className="rounded border p-2"
                  type="number"
                  min="0"
                  value={minLoadingDocks}
                  onChange={event => {
                    setMinLoadingDocks(event.target.value);
                    setPage(0);
                  }}
                />
              </label>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input
                  aria-label="Yard or hardstand"
                  type="checkbox"
                  checked={yardHardstand}
                  onChange={event => {
                    setYardHardstand(event.target.checked);
                    setPage(0);
                  }}
                />
                Yard / hardstand
              </label>
            </div>
          </fieldset>
        ) : null}

        {showRetailFilters ? (
          <fieldset className="border-t pt-4">
            <legend className="text-sm font-medium">Retail requirements</legend>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                aria-label="Extraction capability"
                type="checkbox"
                checked={extractionCapability}
                onChange={event => {
                  setExtractionCapability(event.target.checked);
                  setPage(0);
                }}
              />
              Extraction capability
            </label>
          </fieldset>
        ) : null}
      </section>

      <p className="text-sm text-slate-600">
        A monthly-budget filter includes only spaces whose recurring Cost Passport is complete;
        unknown charges are never treated as R0.
      </p>

      <section className="grid gap-4 md:grid-cols-2" aria-live="polite">
        {visibleSpaces.map((space: any) => {
          const image = primaryCommercialImage(space);
          return (
            <Link
              key={space.availability.id}
              href={space.href}
              className="overflow-hidden rounded border hover:border-sky-500"
            >
              {image ? (
                <img
                  src={image}
                  alt={`${space.asset.name} — ${space.space.identifier}`}
                  className="aspect-[16/7] w-full object-cover"
                  loading="lazy"
                />
              ) : null}
              <div className="p-5">
                <p className="font-semibold">
                  {space.asset.name} — {space.canonicalPlace?.label || 'Location not assigned to an admitted Place'}
                </p>
                <p>
                  {space.space.identifier} · {Number(space.space.rentableAreaM2).toLocaleString()}{' '}
                  m² · {commercialUseTypeLabel(space.space.useType)}
                </p>
                <p className="mt-2">
                  {space.pricing.quotedRent
                    ? `${money(space.pricing.quotedRent.amountMinor)} / ${
                        space.pricing.quotedRent.chargeBasis === 'per_m2_month' ? 'm²' : 'month'
                      } quoted`
                    : 'Quoted rent to confirm'}
                </p>
                <p className="font-medium">
                  Estimated occupancy: {money(space.costPassport.monthlyMinimumMinor)}–
                  {money(space.costPassport.monthlyMaximumMinor)} / month
                </p>
                {space.costPassport.unknownComponentCodes.length ? (
                  <p className="text-sm text-amber-700">
                    Still unresolved:{' '}
                    {space.costPassport.unknownComponentCodes.join(', ').replace(/_/g, ' ')}
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-slate-700">
                  {space.availability.label}
                  {space.availability.confirmedAt
                    ? ` · confirmed ${String(space.availability.confirmedAt).slice(0, 10)}`
                    : ''}
                  {space.availability.source ? ` by ${space.availability.source}` : ''}
                </p>
              </div>
            </Link>
          );
        })}
      </section>

      {totalResults > PAGE_SIZE ? (
        <nav
          aria-label="Result pages"
          className="flex items-center justify-between rounded border bg-white p-4"
        >
          <button
            className="rounded border px-3 py-2 disabled:opacity-40"
            disabled={safePage === 0}
            onClick={() => changePage(safePage - 1)}
          >
            Previous
          </button>
          <p className="text-sm text-slate-600">
            Page {safePage + 1} of {pageCount} · {totalResults} spaces
          </p>
          <button
            className="rounded border px-3 py-2 disabled:opacity-40"
            disabled={safePage >= pageCount - 1}
            onClick={() => changePage(safePage + 1)}
          >
            Next
          </button>
        </nav>
      ) : null}
    </main>
  );
}
