import { useEffect, useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SearchFilters } from '@/lib/urlUtils';
import { BUY_FILTER_PRICE_CEILING } from '@shared/buySearchContract';
import { RENT_FILTER_PRICE_CEILING, RENT_FILTER_PRICE_STEP } from '@shared/rentSearchContract';
import type { SearchResults } from '@shared/types';

interface SidebarFiltersProps {
  filters: SearchFilters;
  filterCounts?: {
    byType?: Record<string, number>;
    byBedrooms?: Record<string, number>;
    byBathrooms?: Record<string, number>;
    byLocation?: Array<{ name: string; slug: string; count: number }>;
  };
  locationContext?: SearchResults['locationContext'];
  onFilterChange: (newFilters: SearchFilters) => void;
  onSaveSearch?: () => void;
  allowedPropertyTypes?: readonly string[];
  listingType?: 'sale' | 'rent';
  showAmenities?: boolean;
  showLocationRefinement?: boolean;
  showHeader?: boolean;
}
export const FALLBACK_PROPERTY_TYPES = [
  { value: 'house', label: 'Houses' },
  { value: 'apartment', label: 'Apartments / Flats' },
  { value: 'villa', label: 'Villas' },
  { value: 'townhouse', label: 'Townhouses' },
  { value: 'cluster_home', label: 'Cluster Homes' },
  { value: 'farm', label: 'Farms' },
  { value: 'commercial', label: 'Commercial Property' },
  { value: 'plot', label: 'Land / Plots' },
] as const;

export const PROPERTY_TYPE_CATEGORIES = {
  residential: ['house', 'apartment', 'villa', 'townhouse', 'cluster_home', 'farm'],
  commercial: ['commercial'],
  land: ['plot'],
} as const;

export const PROPERTY_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  FALLBACK_PROPERTY_TYPES.map(item => [item.value, item.label]),
);

const PRICE_STEP = 50_000;
const AREA_LIMIT = 2_000;

function compactCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `R ${(value / 1_000_000).toFixed(1).replace('.0', '')}M`;
  }
  if (value >= 1_000) return `R ${Math.round(value / 1_000)}K`;
  return `R ${value.toLocaleString()}`;
}

function optionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function SidebarFilters({
  filters,
  filterCounts,
  onFilterChange,
  onSaveSearch,
  allowedPropertyTypes,
  listingType,
  showHeader = true,
}: SidebarFiltersProps) {
  const priceCeiling = listingType === 'rent' ? RENT_FILTER_PRICE_CEILING : BUY_FILTER_PRICE_CEILING;
  const priceStep = listingType === 'rent' ? RENT_FILTER_PRICE_STEP : PRICE_STEP;
  const [priceRange, setPriceRange] = useState<[number, number]>([
    filters.minPrice ?? 0,
    filters.maxPrice ?? priceCeiling,
  ]);
  const [areaRange, setAreaRange] = useState<[number, number]>([
    filters.minArea ?? 0,
    filters.maxArea ?? AREA_LIMIT,
  ]);

  useEffect(() => {
    setPriceRange([filters.minPrice ?? 0, filters.maxPrice ?? priceCeiling]);
  }, [filters.maxPrice, filters.minPrice, priceCeiling]);

  useEffect(() => {
    setAreaRange([filters.minArea ?? 0, filters.maxArea ?? AREA_LIMIT]);
  }, [filters.maxArea, filters.minArea]);

  const propertyTypeOptions = useMemo(() => {
    const allowed = new Set(
      allowedPropertyTypes ?? FALLBACK_PROPERTY_TYPES.map(item => item.value),
    );
    return FALLBACK_PROPERTY_TYPES.filter(item => allowed.has(item.value)).map(item => ({
      ...item,
      count: filterCounts?.byType?.[item.value],
    }));
  }, [allowedPropertyTypes, filterCounts?.byType]);

  const commitPrice = (next = priceRange) => {
    const { minPrice: _min, maxPrice: _max, ...rest } = filters;
    onFilterChange({
      ...rest,
      ...(next[0] > 0 ? { minPrice: next[0] } : {}),
      ...(next[1] < priceCeiling ? { maxPrice: next[1] } : {}),
    });
  };

  const commitArea = (next = areaRange) => {
    const { minArea: _min, maxArea: _max, ...rest } = filters;
    onFilterChange({
      ...rest,
      ...(next[0] > 0 ? { minArea: next[0] } : {}),
      ...(next[1] < AREA_LIMIT ? { maxArea: next[1] } : {}),
    });
  };

  const selectPropertyType = (propertyType?: string) => {
    const { propertyType: _current, ...rest } = filters;
    onFilterChange(propertyType ? { ...rest, propertyType } : rest);
  };

  const selectMinimum = (key: 'minBedrooms' | 'minBathrooms', value: number) => {
    if (filters[key] === value) {
      const { [key]: _current, ...rest } = filters;
      onFilterChange(rest);
      return;
    }
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <aside className="w-full rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.45)]">
      {showHeader ? (
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Filters</h2>
            <p className="mt-0.5 text-xs text-slate-500">Refine this search</p>
          </div>
          <button
            type="button"
            onClick={() => onFilterChange({})}
            className="rounded-md px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
          >
            Reset all
          </button>
        </div>
      ) : null}

      <FilterSection title="Property type">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => selectPropertyType()}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <SelectionMark selected={!filters.propertyType} />
            Any property type
          </button>
          {propertyTypeOptions.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => selectPropertyType(option.value)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <SelectionMark selected={filters.propertyType === option.value} />
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {typeof option.count === 'number' ? (
                <span className="text-xs tabular-nums text-slate-400">
                  {option.count.toLocaleString()}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title={listingType === 'rent' ? 'Monthly rent' : 'Price'}>
        <div className="mb-4 flex items-center justify-between text-xs font-semibold text-slate-700">
          <span aria-label={`Minimum budget ${compactCurrency(priceRange[0])}`}>
            {compactCurrency(priceRange[0])}
          </span>
          <span aria-label={`Maximum budget ${compactCurrency(priceRange[1])}`}>
            {priceRange[1] >= priceCeiling
              ? `${compactCurrency(priceCeiling)}+`
              : compactCurrency(priceRange[1])}
          </span>
        </div>
        <Slider
          value={priceRange}
          min={0}
          max={priceCeiling}
          step={priceStep}
          onValueChange={value => setPriceRange([value[0], value[1]])}
          onValueCommit={value => commitPrice([value[0], value[1]])}
        />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <LabeledNumberInput
            label="Minimum price"
            value={priceRange[0]}
            step={priceStep}
            onChange={value => setPriceRange([Math.min(value ?? 0, priceRange[1]), priceRange[1]])}
            onBlur={() => commitPrice()}
          />
          <LabeledNumberInput
            label="Maximum price"
            value={priceRange[1]}
            step={priceStep}
            onChange={value =>
              setPriceRange([priceRange[0], Math.max(value ?? priceCeiling, priceRange[0])])
            }
            onBlur={() => commitPrice()}
          />
        </div>
      </FilterSection>

      <FilterSection title="Bedrooms">
        <MinimumChoiceRow
          values={[1, 2, 3, 4, 5]}
          selected={filters.minBedrooms}
          onSelect={value => selectMinimum('minBedrooms', value)}
        />
      </FilterSection>

      <FilterSection title="Bathrooms">
        <MinimumChoiceRow
          values={[1, 2, 3, 4]}
          selected={filters.minBathrooms}
          onSelect={value => selectMinimum('minBathrooms', value)}
        />
      </FilterSection>

      <FilterSection title="Home size">
        <div className="grid grid-cols-2 gap-2">
          <LabeledNumberInput
            label="Minimum m²"
            value={areaRange[0]}
            step={10}
            onChange={value => setAreaRange([Math.min(value ?? 0, areaRange[1]), areaRange[1]])}
            onBlur={() => commitArea()}
          />
          <LabeledNumberInput
            label="Maximum m²"
            value={areaRange[1]}
            step={10}
            onChange={value =>
              setAreaRange([areaRange[0], Math.max(value ?? AREA_LIMIT, areaRange[0])])
            }
            onBlur={() => commitArea()}
          />
        </div>
      </FilterSection>

      {onSaveSearch ? (
        <Button
          type="button"
          variant="outline"
          className="mt-5 h-11 w-full rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50"
          onClick={onSaveSearch}
        >
          <Search className="mr-2 h-4 w-4" />
          Save this search
        </Button>
      ) : null}
    </aside>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-slate-100 py-5 last:border-b-0 last:pb-0">
      <h3 className="mb-3 text-sm font-bold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

function SelectionMark({ selected }: { selected: boolean }) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
        selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
      }`}
      aria-hidden="true"
    >
      {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
    </span>
  );
}

function MinimumChoiceRow({
  values,
  selected,
  onSelect,
}: {
  values: number[];
  selected?: number;
  onSelect: (value: number) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {values.map(value => (
        <button
          key={value}
          type="button"
          aria-pressed={selected === value}
          onClick={() => onSelect(value)}
          className={`h-9 rounded-lg border text-xs font-semibold transition-colors ${
            selected === value
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700'
          }`}
        >
          {value}
          {value === values[values.length - 1] ? '+' : ''}
        </button>
      ))}
    </div>
  );
}

function LabeledNumberInput({
  label,
  value,
  step,
  onChange,
  onBlur,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (value?: number) => void;
  onBlur: () => void;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <Input
        aria-label={label}
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={event => onChange(optionalNumber(event.target.value))}
        onBlur={onBlur}
        className="h-10 rounded-lg border-slate-200 pr-8 text-xs tabular-nums"
      />
      {value > 0 ? (
        <button
          type="button"
          aria-label={`Clear ${label.toLowerCase()}`}
          onClick={() => onChange(undefined)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </label>
  );
}
