import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { formatCurrency } from '@/lib/utils';
import { SearchFilters } from '@/lib/urlUtils';
import { SearchResults } from '@shared/types';

interface SidebarFiltersProps {
  filters: SearchFilters;
  filterCounts?: {
    byType?: Record<string, number>;
    byBedrooms?: Record<string, number>;
    byLocation?: Array<{ name: string; slug: string; count: number }>;
  };
  locationContext?: SearchResults['locationContext'];
  onFilterChange: (newFilters: SearchFilters) => void;
  onSaveSearch?: () => void;
}

const AMENITIES = [
  'Pool',
  'Gym',
  'Garden',
  'Security',
  'Parking',
  'Balcony',
  'Pet Friendly',
  'Furnished',
  'Air Conditioning',
  'Wi-Fi',
];

const LISTING_SOURCE_OPTIONS = [
  {
    value: undefined,
    label: 'All',
  },
  {
    value: 'manual',
    label: 'Resale',
  },
  {
    value: 'development',
    label: 'New Development',
  },
] as const;

const FALLBACK_PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'villa', label: 'Villa' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'plot', label: 'Plot' },
] as const;

export function SidebarFilters({
  filters,
  filterCounts,
  locationContext,
  onFilterChange,
  onSaveSearch,
}: SidebarFiltersProps) {
  // Local state for sliders to avoid excessive re-renders/fetches while dragging
  const [priceRange, setPriceRange] = useState<[number, number]>([
    filters.minPrice || 0,
    filters.maxPrice || 50000000,
  ]);

  // Sync local state with props when they change externally
  useEffect(() => {
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      setPriceRange([filters.minPrice || 0, filters.maxPrice || 50000000]);
    }
  }, [filters.minPrice, filters.maxPrice]);

  const handlePriceChange = (value: number[]) => {
    setPriceRange([value[0], value[1]]);
  };

  const handlePriceCommit = (value: number[]) => {
    onFilterChange({
      ...filters,
      minPrice: value[0],
      maxPrice: value[1],
    });
  };

  const handlePropertyTypeChange = (type: string, checked: boolean) => {
    // This is a simplification. In a real app, propertyType might be an array.
    // For now, we'll treat it as a single selection or clear it.
    if (checked) {
      onFilterChange({ ...filters, propertyType: type as any });
    } else {
      const { propertyType, ...rest } = filters;
      onFilterChange(rest);
    }
  };

  const handleBedroomChange = (beds: number) => {
    if (filters.minBedrooms === beds) {
      const { minBedrooms, ...rest } = filters;
      onFilterChange(rest);
    } else {
      onFilterChange({ ...filters, minBedrooms: beds });
    }
  };

  const handleListingSourceChange = (source: SearchFilters['listingSource'] | undefined) => {
    if (!source || filters.listingSource === source) {
      const { listingSource, ...rest } = filters;
      onFilterChange(rest);
      return;
    }

    onFilterChange({
      ...filters,
      listingSource: source,
    });
  };

  const handleAmenitiesChange = (value: string, checked: boolean) => {
    const category = 'amenities';
    const currentValues = filters[category] || [];
    let newValues: string[];

    if (checked) {
      newValues = [...currentValues, value];
    } else {
      newValues = currentValues.filter(v => v !== value);
    }

    onFilterChange({
      ...filters,
      [category]: newValues.length > 0 ? newValues : undefined,
    });
  };

  const handleLocationToggle = (slug: string) => {
    const selected = Array.isArray(filters.suburb)
      ? filters.suburb
      : filters.suburb
        ? [filters.suburb]
        : [];
    const next = selected.includes(slug)
      ? selected.filter(value => value !== slug)
      : [...selected, slug];

    onFilterChange({
      ...filters,
      suburb: next.length > 0 ? (next as any) : undefined,
    });
  };

  const formatBudgetCompact = (value: number) => {
    if (value >= 1_000_000) {
      const rounded = (value / 1_000_000).toFixed(1).replace('.0', '');
      return `R ${rounded}M`;
    }
    if (value >= 1_000) {
      return `R ${Math.round(value / 1_000)}K`;
    }
    return formatCurrency(value);
  };

  const locationOptions =
    filterCounts?.byLocation
      ?.filter(item => item && item.name && item.count > 0)
      .slice(0, 7) ?? [];

  const propertyTypeOptions = (() => {
    const fromCounts = Object.entries(filterCounts?.byType ?? {})
      .map(([value, count]) => ({
        value,
        label: value
          .split('_')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' '),
        count: Number(count) || 0,
      }))
      .sort((a, b) => b.count - a.count);

    const seeded = [...fromCounts];
    FALLBACK_PROPERTY_TYPES.forEach(type => {
      if (seeded.some(option => option.value === type.value)) return;
      seeded.push({ ...type, count: 0 });
    });

    return seeded.slice(0, 7);
  })();

  const bedroomOptions = (() => {
    const byBedrooms = filterCounts?.byBedrooms ?? {};
    if (Object.keys(byBedrooms).length === 0) return [1, 2, 3, 4, 5];
    return Object.keys(byBedrooms)
      .map(v => Number(v))
      .filter(v => Number.isFinite(v) && v > 0)
      .sort((a, b) => a - b)
      .slice(0, 5);
  })();

  return (
    <div className="w-full bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-slate-800">Filters</h3>
        <div className="flex gap-2">
          {onSaveSearch && (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onSaveSearch}>
              Save
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-800 h-auto p-0 text-xs font-medium"
            onClick={() => onFilterChange({})}
          >
            Reset all
          </Button>
        </div>
      </div>

      <Accordion
        type="multiple"
        defaultValue={['listing-source', 'budget', 'locations', 'type', 'bedrooms']}
        className="w-full"
      >
        <AccordionItem value="listing-source">
          <AccordionTrigger className="text-sm font-bold text-slate-700 hover:no-underline">
            Listing source
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-wrap gap-0.5 pt-1">
              {LISTING_SOURCE_OPTIONS.map(option => (
                <Button
                  key={option.label}
                  size="sm"
                  variant={
                    option.value === undefined
                      ? !filters.listingSource
                        ? 'default'
                        : 'outline'
                      : filters.listingSource === option.value
                        ? 'default'
                        : 'outline'
                  }
                  className={`h-8 !w-auto min-w-0 grow basis-0 rounded-full px-1 text-[9px] font-medium leading-none tracking-tight sm:text-[10px] ${
                    (option.value === undefined && !filters.listingSource) ||
                    filters.listingSource === option.value
                      ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                      : 'border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600'
                  }`}
                  onClick={() => handleListingSourceChange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Budget Filter */}
        <AccordionItem value="budget">
          <AccordionTrigger className="text-sm font-bold text-slate-700 hover:no-underline">
            Budget
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-1 pt-1 pb-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-2xl font-bold text-slate-900">{formatBudgetCompact(priceRange[0])}</p>
                <span className="rounded bg-orange-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {formatBudgetCompact(priceRange[1])}+
                </span>
              </div>
              <Slider
                defaultValue={[0, 50000000]}
                value={[priceRange[0], priceRange[1]]}
                max={50000000}
                step={5000}
                min={0}
                onValueChange={handlePriceChange}
                onValueCommit={handlePriceCommit}
                className="mb-3"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={0}
                  step={5000}
                  value={priceRange[0]}
                  onChange={e => {
                    const nextMin = Number(e.target.value || 0);
                    setPriceRange([Math.max(0, Math.min(nextMin, priceRange[1])), priceRange[1]]);
                  }}
                  onBlur={() => handlePriceCommit(priceRange)}
                  className="h-8 text-xs"
                  placeholder="Min Budget"
                />
                <Input
                  type="number"
                  min={0}
                  step={5000}
                  value={priceRange[1]}
                  onChange={e => {
                    const nextMax = Number(e.target.value || 0);
                    setPriceRange([priceRange[0], Math.max(nextMax, priceRange[0])]);
                  }}
                  onBlur={() => handlePriceCommit(priceRange)}
                  className="h-8 text-xs"
                  placeholder="Max Budget"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Locations */}
        <AccordionItem value="locations">
          <AccordionTrigger className="text-sm font-bold text-slate-700 hover:no-underline">
            Locations
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pt-1">
              {locationOptions.length > 0 && (
                <p className="text-[11px] font-medium text-slate-500">
                  {locationContext?.type === 'city'
                    ? `Nearby areas in ${locationContext.name}`
                    : locationContext?.type === 'suburb'
                      ? `Nearby areas around ${locationContext.name}`
                      : 'Nearby areas'}
                </p>
              )}
              {locationOptions.length > 0 ? (
                locationOptions.map(location => {
                  const isSelected = Array.isArray(filters.suburb)
                    ? filters.suburb.includes(location.slug)
                    : filters.suburb === location.slug;

                  return (
                    <button
                      key={location.slug}
                      type="button"
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                          : 'hover:bg-blue-50'
                      }`}
                      onClick={() => handleLocationToggle(location.slug)}
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span
                        className={`min-w-0 flex-1 truncate text-sm font-medium ${
                          isSelected ? 'text-blue-700' : 'text-slate-700'
                        }`}
                      >
                        {location.name}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="text-xs text-slate-500">
                  Nearby areas will appear when more listings are available in this search area.
                </p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Type of Property */}
        <AccordionItem value="type">
          <AccordionTrigger className="text-sm font-bold text-slate-700 hover:no-underline">
            Type of property
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {propertyTypeOptions.map(type => (
                <Button
                  key={type.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`h-8 w-full min-w-0 rounded-full px-2 text-[10px] font-medium tracking-tight ${
                    filters.propertyType === type.value
                      ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                      : 'border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600'
                  }`}
                  onClick={() =>
                    handlePropertyTypeChange(type.value, filters.propertyType !== type.value)
                  }
                  title={type.label}
                >
                  <span className="truncate">
                    {type.label}
                  </span>
                </Button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* No. of Bedrooms */}
        <AccordionItem value="bedrooms">
          <AccordionTrigger className="text-sm font-bold text-slate-700 hover:no-underline">
            No. of Bedrooms
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-wrap gap-2 pt-2">
              {bedroomOptions.map(num => (
                <Button
                  key={num}
                  variant={filters.minBedrooms === num ? 'default' : 'outline'}
                  size="sm"
                  className={`rounded-full w-10 h-10 p-0 ${
                    filters.minBedrooms === num
                      ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                      : 'text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                  }`}
                  onClick={() => handleBedroomChange(num)}
                >
                  {num}
                  {num === 5 ? '+' : ''}
                </Button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Amenities */}
        <AccordionItem value="amenities">
          <AccordionTrigger className="text-sm font-bold text-slate-700 hover:no-underline">
            Amenities
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2">
              {AMENITIES.map(amenity => (
                <div key={amenity} className="flex items-center space-x-2">
                  <Checkbox
                    id={`amenity-${amenity}`}
                    checked={filters.amenities?.includes(amenity)}
                    onCheckedChange={checked => handleAmenitiesChange(amenity, checked as boolean)}
                  />
                  <Label
                    htmlFor={`amenity-${amenity}`}
                    className="text-sm font-medium leading-none cursor-pointer text-slate-600"
                  >
                    {amenity}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
