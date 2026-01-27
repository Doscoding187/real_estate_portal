import { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { formatCurrency } from '@/lib/utils';
import { SearchFilters } from '@/lib/urlUtils';
import { LocationRefinement } from '@/components/search/LocationRefinement';
import { SearchResults } from '@shared/types';

interface SidebarFiltersProps {
  filters: SearchFilters;
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

export function SidebarFilters({
  filters,
  locationContext,
  onFilterChange,
  onSaveSearch,
}: SidebarFiltersProps) {
  // Local state for sliders to avoid excessive re-renders/fetches while dragging
  const [priceRange, setPriceRange] = useState<[number, number]>([
    filters.minPrice || 0,
    filters.maxPrice || 50000000,
  ]);
  const [areaRange, setAreaRange] = useState<[number, number]>([0, 5000]);

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

  const handleAreaChange = (value: number[]) => {
    setAreaRange([value[0], value[1]]);
  };

  const handleAreaCommit = (value: number[]) => {
    onFilterChange({
      ...filters,
      minArea: value[0],
      maxArea: value[1],
    });
  };

  const handleCheckboxFilterChange = (
    category: 'amenities' | 'postedBy' | 'possessionStatus',
    value: string,
    checked: boolean,
  ) => {
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

  return (
    <div className="w-full bg-white rounded-lg border border-slate-200 shadow-sm p-4">
      {/* Location Refinement Section */}
      <LocationRefinement context={locationContext} />

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

      <Accordion type="multiple" defaultValue={['budget', 'type', 'bedrooms']} className="w-full">
        {/* Budget Filter */}
        <AccordionItem value="budget">
          <AccordionTrigger className="text-sm font-bold text-slate-700 hover:no-underline">
            Budget
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-2 pt-2 pb-6">
              <Slider
                defaultValue={[0, 50000000]}
                value={[priceRange[0], priceRange[1]]}
                max={50000000}
                step={100000}
                min={0}
                onValueChange={handlePriceChange}
                onValueCommit={handlePriceCommit}
                className="mb-4"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{formatCurrency(priceRange[0])}</span>
                <span>{formatCurrency(priceRange[1])}</span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Type of Property */}
        <AccordionItem value="type">
          <AccordionTrigger className="text-sm font-bold text-slate-700 hover:no-underline">
            Type of property
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2">
              {['Apartment', 'House', 'Villa', 'Office', 'Plot'].map(type => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type}`}
                    checked={filters.propertyType === type.toLowerCase()}
                    onCheckedChange={checked =>
                      handlePropertyTypeChange(type.toLowerCase(), checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`type-${type}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-slate-600"
                  >
                    {type}
                  </Label>
                </div>
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
              {[1, 2, 3, 4, 5].map(num => (
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

        {/* Possession Status */}
        <AccordionItem value="possession">
          <AccordionTrigger className="text-sm font-bold text-slate-700 hover:no-underline">
            Possession Status
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2">
              {['Ready to move', 'Under construction'].map(status => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={filters.possessionStatus?.includes(status)}
                    onCheckedChange={checked =>
                      handleCheckboxFilterChange('possessionStatus', status, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`status-${status}`}
                    className="text-sm font-medium leading-none cursor-pointer text-slate-600"
                  >
                    {status}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Posted By */}
        <AccordionItem value="postedBy">
          <AccordionTrigger className="text-sm font-bold text-slate-700 hover:no-underline">
            Posted by
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2">
              {['Owner', 'Dealer', 'Builder'].map(poster => (
                <div key={poster} className="flex items-center space-x-2">
                  <Checkbox
                    id={`poster-${poster}`}
                    checked={filters.postedBy?.includes(poster)}
                    onCheckedChange={checked =>
                      handleCheckboxFilterChange('postedBy', poster, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`poster-${poster}`}
                    className="text-sm font-medium leading-none cursor-pointer text-slate-600"
                  >
                    {poster}
                  </Label>
                </div>
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
                    onCheckedChange={checked =>
                      handleCheckboxFilterChange('amenities', amenity, checked as boolean)
                    }
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

        {/* Area Size */}
        <AccordionItem value="area">
          <AccordionTrigger className="text-sm font-bold text-slate-700 hover:no-underline">
            Area Size (sq ft)
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-2 pt-2 pb-6">
              <Slider
                defaultValue={[0, 5000]}
                value={[areaRange[0], areaRange[1]]}
                max={5000}
                step={100}
                onValueChange={handleAreaChange}
                onValueCommit={handleAreaCommit}
                className="mb-4"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{areaRange[0]} sq ft</span>
                <span>{areaRange[1]}+ sq ft</span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
