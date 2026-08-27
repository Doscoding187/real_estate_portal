import { Link } from 'wouter';
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  COMMERCIAL_AVAILABILITY_OPTIONS,
  parseCommercialSearchParams,
  sanitizeCommercialSearchFilters,
  serializeCommercialSearchParams,
  type CommercialAvailabilityFilter,
} from '@shared/commercialSearchContract';

const money = (minor?: number | null) =>
  minor == null
    ? 'To confirm'
    : `R ${(minor / 100).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;

const PAGE_SIZE = 24;

const stringNumber = (value?: number) => (value == null ? '' : String(value));

export default function CommercialOffice() {
  const handoffParams = new URLSearchParams(window.location.search);
  const initialFilters = parseCommercialSearchParams(handoffParams);
  const unsupportedLocationScope =
    handoffParams.get('searchError') === 'unsupported-location-scope';

  const [location, setLocation] = useState(handoffParams.get('location') || '');
  const [minAreaM2, setMinAreaM2] = useState(stringNumber(initialFilters.minAreaM2));
  const [maxAreaM2, setMaxAreaM2] = useState(stringNumber(initialFilters.maxAreaM2));
  const [budget, setBudget] = useState(stringNumber(initialFilters.maxMonthlyBudget));
  const [availability, setAvailability] = useState<CommercialAvailabilityFilter | ''>(
    initialFilters.availability || '',
  );
  const [fitOutCondition, setFitOutCondition] = useState(initialFilters.fitOutCondition || '');
  const [minParkingBays, setMinParkingBays] = useState(stringNumber(initialFilters.minParkingBays));
  const [backupPower, setBackupPower] = useState(initialFilters.backupPower === true);
  const [backupWater, setBackupWater] = useState(initialFilters.backupWater === true);
  const [fibreConnectivity, setFibreConnectivity] = useState(
    initialFilters.fibreConnectivity === true,
  );
  const [page, setPage] = useState(Number(handoffParams.get('page')) || 0);

  const filters = sanitizeCommercialSearchFilters({
    minAreaM2,
    maxAreaM2,
    maxMonthlyBudget: budget,
    availability,
    fitOutCondition,
    minParkingBays,
    backupPower,
    backupWater,
    fibreConnectivity,
  });
  const results = trpc.commercialOffice.search.useQuery(
    {
      location: location.trim() || undefined,
      minAreaM2: filters.minAreaM2,
      maxAreaM2: filters.maxAreaM2,
      maxMonthlyBudgetMinor:
        filters.maxMonthlyBudget == null ? undefined : Math.round(filters.maxMonthlyBudget * 100),
      availability: filters.availability,
      fitOutCondition: filters.fitOutCondition,
      backupPower: filters.backupPower,
      backupWater: filters.backupWater,
      fibreConnectivity: filters.fibreConnectivity,
      minParkingBays: filters.minParkingBays,
    },
    { enabled: !unsupportedLocationScope },
  );

  const allOffices = results.data || [];
  const totalResults = allOffices.length;
  const pageCount = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visibleOffices = allOffices.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const hasActiveFilters = Boolean(
    location.trim() || Object.keys(filters).length > 0 || safePage > 0,
  );

  useEffect(() => {
    const next = new URLSearchParams();
    if (location.trim()) next.set('location', location.trim());
    serializeCommercialSearchParams(filters).forEach((value, key) => next.set(key, value));
    if (safePage > 0) next.set('page', String(safePage));
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${next.toString() ? `?${next}` : ''}`,
    );
  }, [filters, location, safePage]);

  const changePage = (nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 0), pageCount - 1));
    window.scrollTo({ top: 0 });
  };

  const resetFilters = () => {
    setLocation('');
    setMinAreaM2('');
    setMaxAreaM2('');
    setBudget('');
    setAvailability('');
    setFitOutCondition('');
    setMinParkingBays('');
    setBackupPower(false);
    setBackupWater(false);
    setFibreConnectivity(false);
    setPage(0);
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <header>
        <p className="text-sm font-medium text-sky-700">
          Property Listify Commercial · Office leasing
        </p>
        <h1 className="text-3xl font-semibold">Find office space that works for your business</h1>
        <p className="mt-2 text-slate-600">
          Availability, commercial terms and known monthly occupancy costs—shown separately from
          what still needs confirmation.
        </p>
      </header>

      {unsupportedLocationScope && (
        <p
          role="alert"
          className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          Choose one location to continue into the current Commercial search. Multi-location and
          Search Area handoff are not available yet.
        </p>
      )}

      <section
        aria-label="Commercial search filters"
        className="rounded border bg-white p-4 shadow-sm"
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Filter by business need</h2>
            <p className="mt-1 text-sm text-slate-600">
              Start with the space, occupancy cost and timing your business can work with.
            </p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              className="text-sm font-medium text-sky-700 hover:text-sky-900"
              onClick={resetFilters}
            >
              Reset filters
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1 text-sm">
            <span>Location</span>
            <Input
              aria-label="Location"
              className="rounded border p-2"
              value={location}
              onChange={event => {
                setLocation(event.target.value);
                setPage(0);
              }}
              placeholder="City or suburb"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Minimum space (m²)</span>
            <Input
              aria-label="Minimum square metres"
              className="rounded border p-2"
              type="number"
              min="1"
              value={minAreaM2}
              onChange={event => {
                setMinAreaM2(event.target.value);
                setPage(0);
              }}
              placeholder="e.g. 100"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Maximum space (m²)</span>
            <Input
              aria-label="Maximum square metres"
              className="rounded border p-2"
              type="number"
              min="1"
              value={maxAreaM2}
              onChange={event => {
                setMaxAreaM2(event.target.value);
                setPage(0);
              }}
              placeholder="e.g. 500"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Maximum monthly occupancy (R)</span>
            <Input
              aria-label="Monthly occupancy budget"
              className="rounded border p-2"
              type="number"
              min="0"
              value={budget}
              onChange={event => {
                setBudget(event.target.value);
                setPage(0);
              }}
              placeholder="Known total only"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Availability</span>
            <select
              aria-label="Availability"
              className="rounded border p-2"
              value={availability}
              onChange={event => {
                setAvailability(event.target.value as CommercialAvailabilityFilter | '');
                setPage(0);
              }}
            >
              <option value="">Any timing</option>
              {COMMERCIAL_AVAILABILITY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span>Fit-out condition</span>
            <Input
              aria-label="Fit-out condition"
              className="rounded border p-2"
              value={fitOutCondition}
              onChange={event => {
                setFitOutCondition(event.target.value);
                setPage(0);
              }}
              placeholder="Supplier label, e.g. fitted"
            />
            <span className="text-xs text-slate-500">Matches the supplier&apos;s exact label.</span>
          </label>
          <label className="grid gap-1 text-sm">
            <span>Minimum parking bays</span>
            <Input
              aria-label="Minimum parking bays"
              className="rounded border p-2"
              type="number"
              min="0"
              step="1"
              value={minParkingBays}
              onChange={event => {
                setMinParkingBays(event.target.value);
                setPage(0);
              }}
              placeholder="Any parking"
            />
          </label>
        </div>

        <fieldset className="mt-4 border-t pt-4">
          <legend className="text-sm font-semibold text-slate-700">Building essentials</legend>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-700">
            <label className="flex items-center gap-2" htmlFor="commercial-backup-power">
              <Checkbox
                id="commercial-backup-power"
                aria-label="Backup power"
                checked={backupPower}
                onCheckedChange={checked => {
                  setBackupPower(checked === true);
                  setPage(0);
                }}
              />
              <span>Backup power</span>
            </label>
            <label className="flex items-center gap-2" htmlFor="commercial-backup-water">
              <Checkbox
                id="commercial-backup-water"
                aria-label="Backup water"
                checked={backupWater}
                onCheckedChange={checked => {
                  setBackupWater(checked === true);
                  setPage(0);
                }}
              />
              <span>Backup water</span>
            </label>
            <label className="flex items-center gap-2" htmlFor="commercial-fibre">
              <Checkbox
                id="commercial-fibre"
                aria-label="Fibre"
                checked={fibreConnectivity}
                onCheckedChange={checked => {
                  setFibreConnectivity(checked === true);
                  setPage(0);
                }}
              />
              <span>Fibre</span>
            </label>
          </div>
        </fieldset>
      </section>

      <p className="text-sm text-slate-600">
        A monthly-occupancy filter includes only spaces whose recurring Cost Passport is complete;
        unknown charges are never treated as R0.
      </p>

      <section
        aria-label="Commercial Office results"
        aria-live="polite"
        className="grid gap-4 md:grid-cols-2"
      >
        {visibleOffices.map((office: any) => (
          <Link
            key={office.availability.id}
            href={office.href}
            className="rounded border p-5 hover:border-sky-500"
          >
            <p className="font-semibold">
              {office.asset.name} — {office.asset.suburb || office.asset.city}
            </p>
            <p>
              {office.space.identifier} · {Number(office.space.rentableAreaM2).toLocaleString()} m²
              Office
            </p>
            <p className="mt-2">
              {office.pricing.quotedRent
                ? `${money(office.pricing.quotedRent.amountMinor)} / ${office.pricing.quotedRent.chargeBasis === 'per_m2_month' ? 'm²' : 'month'} quoted`
                : 'Quoted rent to confirm'}
            </p>
            <p className="font-medium">
              Estimated occupancy: {money(office.costPassport.monthlyMinimumMinor)}–
              {money(office.costPassport.monthlyMaximumMinor)} / month
            </p>
            {office.costPassport.unknownComponentCodes.length ? (
              <p className="text-sm text-amber-700">
                Still unresolved:{' '}
                {office.costPassport.unknownComponentCodes.join(', ').replaceAll('_', ' ')}
              </p>
            ) : null}
            <p className="mt-2 text-sm text-slate-700">
              {office.availability.label}
              {office.availability.confirmedAt
                ? ` · confirmed ${String(office.availability.confirmedAt).slice(0, 10)}`
                : ''}
              {office.availability.source ? ` by ${office.availability.source}` : ''}
            </p>
          </Link>
        ))}
      </section>

      {!unsupportedLocationScope && !results.isLoading && totalResults === 0 ? (
        <p className="rounded border border-dashed p-6 text-slate-600">
          No published Office spaces match these requirements. Try widening the area or clearing a
          filter.
        </p>
      ) : null}

      {totalResults > PAGE_SIZE && (
        <nav
          aria-label="Result pages"
          className="flex items-center justify-between rounded border bg-white p-4"
        >
          <Button
            type="button"
            variant="outline"
            disabled={safePage === 0}
            onClick={() => changePage(safePage - 1)}
          >
            Previous
          </Button>
          <p className="text-sm text-slate-600">
            Page {safePage + 1} of {pageCount} · {totalResults} spaces
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={safePage >= pageCount - 1}
            onClick={() => changePage(safePage + 1)}
          >
            Next
          </Button>
        </nav>
      )}
    </main>
  );
}
