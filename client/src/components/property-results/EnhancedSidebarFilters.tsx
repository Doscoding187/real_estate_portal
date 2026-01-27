/**
 * Enhanced Sidebar Filters Component
 *
 * SA-specific property filters including:
 * - Title type (Freehold/Sectional Title)
 * - Levy range slider
 * - Security estate checkbox
 * - Pet-friendly checkbox
 * - Fibre-ready checkbox
 * - Load-shedding solutions checkboxes
 * - Erf size range slider
 *
 * Requirements: 2.1, 8.1, 16.5
 */

import { useState, useEffect, useCallback } from 'react';
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
import type { PropertyFilters } from '../../../../shared/types';
import {
  Home,
  Building2,
  Shield,
  Heart,
  Wifi,
  Sun,
  Zap,
  Battery,
  Ruler,
  DollarSign,
  Filter,
  X,
} from 'lucide-react';

export interface EnhancedSidebarFiltersProps {
  filters: PropertyFilters;
  onFilterChange: (newFilters: PropertyFilters) => void;
  onSaveSearch?: () => void;
  resultCount?: number;
  className?: string;
}

// Property types for SA market
const PROPERTY_TYPES = [
  { value: 'house', label: 'House' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'plot', label: 'Plot/Land' },
  { value: 'commercial', label: 'Commercial' },
];

// Title types for SA market
const TITLE_TYPES = [
  {
    value: 'freehold',
    label: 'Freehold',
    icon: Home,
    description: 'Full ownership of property and land',
  },
  {
    value: 'sectional',
    label: 'Sectional Title',
    icon: Building2,
    description: 'Shared ownership in complex',
  },
];

// Load-shedding solutions
const LOAD_SHEDDING_SOLUTIONS = [
  { value: 'solar', label: 'Solar Panels', icon: Sun },
  { value: 'generator', label: 'Generator', icon: Zap },
  { value: 'inverter', label: 'Inverter/UPS', icon: Battery },
];

// Default ranges
const DEFAULT_PRICE_RANGE: [number, number] = [0, 50000000];
const DEFAULT_LEVY_RANGE: [number, number] = [0, 10000];
const DEFAULT_ERF_SIZE_RANGE: [number, number] = [0, 5000];
const DEFAULT_FLOOR_SIZE_RANGE: [number, number] = [0, 1000];

/**
 * EnhancedSidebarFilters Component
 *
 * Provides comprehensive filtering options for SA property market including
 * title type, levy, security estate, pet-friendly, fibre-ready, and
 * load-shedding solutions.
 */
export function EnhancedSidebarFilters({
  filters,
  onFilterChange,
  onSaveSearch,
  resultCount,
  className,
}: EnhancedSidebarFiltersProps) {
  // Local state for sliders to avoid excessive re-renders while dragging
  const [priceRange, setPriceRange] = useState<[number, number]>([
    filters.minPrice ?? DEFAULT_PRICE_RANGE[0],
    filters.maxPrice ?? DEFAULT_PRICE_RANGE[1],
  ]);

  const [levyRange, setLevyRange] = useState<[number, number]>([
    0,
    filters.maxLevy ?? DEFAULT_LEVY_RANGE[1],
  ]);

  const [erfSizeRange, setErfSizeRange] = useState<[number, number]>([
    filters.minErfSize ?? DEFAULT_ERF_SIZE_RANGE[0],
    filters.maxErfSize ?? DEFAULT_ERF_SIZE_RANGE[1],
  ]);

  const [floorSizeRange, setFloorSizeRange] = useState<[number, number]>([
    filters.minFloorSize ?? DEFAULT_FLOOR_SIZE_RANGE[0],
    filters.maxFloorSize ?? DEFAULT_FLOOR_SIZE_RANGE[1],
  ]);

  // Sync local state with props when they change externally
  useEffect(() => {
    setPriceRange([
      filters.minPrice ?? DEFAULT_PRICE_RANGE[0],
      filters.maxPrice ?? DEFAULT_PRICE_RANGE[1],
    ]);
  }, [filters.minPrice, filters.maxPrice]);

  useEffect(() => {
    setLevyRange([0, filters.maxLevy ?? DEFAULT_LEVY_RANGE[1]]);
  }, [filters.maxLevy]);

  useEffect(() => {
    setErfSizeRange([
      filters.minErfSize ?? DEFAULT_ERF_SIZE_RANGE[0],
      filters.maxErfSize ?? DEFAULT_ERF_SIZE_RANGE[1],
    ]);
  }, [filters.minErfSize, filters.maxErfSize]);

  useEffect(() => {
    setFloorSizeRange([
      filters.minFloorSize ?? DEFAULT_FLOOR_SIZE_RANGE[0],
      filters.maxFloorSize ?? DEFAULT_FLOOR_SIZE_RANGE[1],
    ]);
  }, [filters.minFloorSize, filters.maxFloorSize]);

  // Handler for price range changes
  const handlePriceChange = useCallback((value: number[]) => {
    setPriceRange([value[0], value[1]]);
  }, []);

  const handlePriceCommit = useCallback(
    (value: number[]) => {
      onFilterChange({
        ...filters,
        minPrice: value[0] > 0 ? value[0] : undefined,
        maxPrice: value[1] < DEFAULT_PRICE_RANGE[1] ? value[1] : undefined,
      });
    },
    [filters, onFilterChange],
  );

  // Handler for levy range changes
  const handleLevyChange = useCallback((value: number[]) => {
    setLevyRange([0, value[1]]);
  }, []);

  const handleLevyCommit = useCallback(
    (value: number[]) => {
      onFilterChange({
        ...filters,
        maxLevy: value[1] < DEFAULT_LEVY_RANGE[1] ? value[1] : undefined,
      });
    },
    [filters, onFilterChange],
  );

  // Handler for erf size range changes
  const handleErfSizeChange = useCallback((value: number[]) => {
    setErfSizeRange([value[0], value[1]]);
  }, []);

  const handleErfSizeCommit = useCallback(
    (value: number[]) => {
      onFilterChange({
        ...filters,
        minErfSize: value[0] > 0 ? value[0] : undefined,
        maxErfSize: value[1] < DEFAULT_ERF_SIZE_RANGE[1] ? value[1] : undefined,
      });
    },
    [filters, onFilterChange],
  );

  // Handler for floor size range changes
  const handleFloorSizeChange = useCallback((value: number[]) => {
    setFloorSizeRange([value[0], value[1]]);
  }, []);

  const handleFloorSizeCommit = useCallback(
    (value: number[]) => {
      onFilterChange({
        ...filters,
        minFloorSize: value[0] > 0 ? value[0] : undefined,
        maxFloorSize: value[1] < DEFAULT_FLOOR_SIZE_RANGE[1] ? value[1] : undefined,
      });
    },
    [filters, onFilterChange],
  );

  // Handler for property type changes
  const handlePropertyTypeChange = useCallback(
    (type: string, checked: boolean) => {
      const currentTypes = filters.propertyType || [];
      let newTypes: string[];

      if (checked) {
        newTypes = [...currentTypes, type];
      } else {
        newTypes = currentTypes.filter(t => t !== type);
      }

      onFilterChange({
        ...filters,
        propertyType: newTypes.length > 0 ? (newTypes as any) : undefined,
      });
    },
    [filters, onFilterChange],
  );

  // Handler for title type changes
  const handleTitleTypeChange = useCallback(
    (type: 'freehold' | 'sectional', checked: boolean) => {
      const currentTypes = filters.titleType || [];
      let newTypes: ('freehold' | 'sectional')[];

      if (checked) {
        newTypes = [...currentTypes, type];
      } else {
        newTypes = currentTypes.filter(t => t !== type);
      }

      onFilterChange({
        ...filters,
        titleType: newTypes.length > 0 ? newTypes : undefined,
      });
    },
    [filters, onFilterChange],
  );

  // Handler for bedroom changes
  const handleBedroomChange = useCallback(
    (beds: number) => {
      if (filters.minBedrooms === beds) {
        const { minBedrooms, ...rest } = filters;
        onFilterChange(rest);
      } else {
        onFilterChange({ ...filters, minBedrooms: beds });
      }
    },
    [filters, onFilterChange],
  );

  // Handler for boolean filter changes
  const handleBooleanFilterChange = useCallback(
    (key: 'securityEstate' | 'petFriendly' | 'fibreReady', checked: boolean) => {
      if (checked) {
        onFilterChange({ ...filters, [key]: true });
      } else {
        const newFilters = { ...filters };
        delete newFilters[key];
        onFilterChange(newFilters);
      }
    },
    [filters, onFilterChange],
  );

  // Handler for load-shedding solutions changes
  const handleLoadSheddingChange = useCallback(
    (solution: 'solar' | 'generator' | 'inverter', checked: boolean) => {
      const currentSolutions = filters.loadSheddingSolutions || [];
      let newSolutions: ('solar' | 'generator' | 'inverter' | 'none')[];

      if (checked) {
        newSolutions = [...currentSolutions.filter(s => s !== 'none'), solution];
      } else {
        newSolutions = currentSolutions.filter(s => s !== solution);
      }

      onFilterChange({
        ...filters,
        loadSheddingSolutions: newSolutions.length > 0 ? newSolutions : undefined,
      });
    },
    [filters, onFilterChange],
  );

  // Reset all filters
  const handleResetFilters = useCallback(() => {
    onFilterChange({});
    setPriceRange(DEFAULT_PRICE_RANGE);
    setLevyRange(DEFAULT_LEVY_RANGE);
    setErfSizeRange(DEFAULT_ERF_SIZE_RANGE);
    setFloorSizeRange(DEFAULT_FLOOR_SIZE_RANGE);
  }, [onFilterChange]);

  // Count active filters
  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (filters.propertyType?.length) count++;
    if (filters.titleType?.length) count++;
    if (filters.minPrice || filters.maxPrice) count++;
    if (filters.maxLevy) count++;
    if (filters.minBedrooms) count++;
    if (filters.minErfSize || filters.maxErfSize) count++;
    if (filters.minFloorSize || filters.maxFloorSize) count++;
    if (filters.securityEstate) count++;
    if (filters.petFriendly) count++;
    if (filters.fibreReady) count++;
    if (filters.loadSheddingSolutions?.length) count++;
    return count;
  }, [filters]);

  const activeFilterCount = getActiveFilterCount();

  return (
    <div
      className={`w-full bg-white rounded-lg border border-slate-200 shadow-sm p-4 ${className || ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-slate-600" />
          <h3 className="font-bold text-lg text-slate-800">Filters</h3>
          {activeFilterCount > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
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
            onClick={handleResetFilters}
          >
            Reset all
          </Button>
        </div>
      </div>

      {/* Result count */}
      {resultCount !== undefined && (
        <div className="mb-4 text-sm text-slate-600">
          {resultCount.toLocaleString()} properties found
        </div>
      )}

      <Accordion
        type="multiple"
        defaultValue={['budget', 'type', 'titleType', 'bedrooms', 'saFeatures']}
        className="w-full"
      >
        {/* Budget Filter */}
        <AccordionItem value="budget">
          <AccordionTrigger className="text-sm font-bold text-slate-700 hover:no-underline">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Budget
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-2 pt-2 pb-6">
              <Slider
                value={[priceRange[0], priceRange[1]]}
                max={DEFAULT_PRICE_RANGE[1]}
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

        {/* Property Type */}
        <AccordionItem value="type">
          <AccordionTrigger className="text-sm font-bold text-slate-700 hover:no-underline">
            Type of Property
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2">
              {PROPERTY_TYPES.map(type => (
                <div key={type.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type.value}`}
                    checked={filters.propertyType?.includes(type.value as any) || false}
                    onCheckedChange={checked =>
                      handlePropertyTypeChange(type.value, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`type-${type.value}`}
                    className="text-sm font-medium leading-none cursor-pointer text-slate-600"
                  >
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Title Type (SA-specific) */}
        <AccordionItem value="titleType">
          <AccordionTrigger className="text-sm font-bold text-slate-700 hover:no-underline">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Title Type
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2">
              {TITLE_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <div key={type.value} className="flex items-start space-x-2">
                    <Checkbox
                      id={`title-${type.value}`}
                      checked={filters.titleType?.includes(type.value as any) || false}
                      onCheckedChange={checked =>
                        handleTitleTypeChange(
                          type.value as 'freehold' | 'sectional',
                          checked as boolean,
                        )
                      }
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`title-${type.value}`}
                        className="text-sm font-medium leading-none cursor-pointer text-slate-600 flex items-center gap-2"
                      >
                        <Icon className="h-4 w-4 text-slate-400" />
                        {type.label}
                      </Label>
                      <p className="text-xs text-slate-400 mt-1">{type.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Levy Range (for Sectional Title) */}
        <AccordionItem value="levy">
          <AccordionTrigger className="text-sm font-bold text-slate-700 hover:no-underline">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Max Monthly Levy
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-2 pt-2 pb-6">
              <p className="text-xs text-slate-500 mb-3">For sectional title properties</p>
              <Slider
                value={[levyRange[1]]}
                max={DEFAULT_LEVY_RANGE[1]}
                step={500}
                min={0}
                onValueChange={value => handleLevyChange([0, value[0]])}
                onValueCommit={value => handleLevyCommit([0, value[0]])}
                className="mb-4"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>R0</span>
                <span className="font-medium text-slate-700">
                  {levyRange[1] >= DEFAULT_LEVY_RANGE[1]
                    ? 'No limit'
                    : `R${levyRange[1].toLocaleString()}/month`}
                </span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Bedrooms */}
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

        {/* SA-Specific Features */}
        <AccordionItem value="saFeatures">
          <AccordionTrigger className="text-sm font-bold text-slate-700 hover:no-underline">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              SA Features
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              {/* Security Estate */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="security-estate"
                  checked={filters.securityEstate || false}
                  onCheckedChange={checked =>
                    handleBooleanFilterChange('securityEstate', checked as boolean)
                  }
                />
                <Label
                  htmlFor="security-estate"
                  className="text-sm font-medium leading-none cursor-pointer text-slate-600 flex items-center gap-2"
                >
                  <Shield className="h-4 w-4 text-green-600" />
                  Security Estate
                </Label>
              </div>

              {/* Pet-Friendly */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pet-friendly"
                  checked={filters.petFriendly || false}
                  onCheckedChange={checked =>
                    handleBooleanFilterChange('petFriendly', checked as boolean)
                  }
                />
                <Label
                  htmlFor="pet-friendly"
                  className="text-sm font-medium leading-none cursor-pointer text-slate-600 flex items-center gap-2"
                >
                  <Heart className="h-4 w-4 text-red-500" />
                  Pet-Friendly
                </Label>
              </div>

              {/* Fibre-Ready */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fibre-ready"
                  checked={filters.fibreReady || false}
                  onCheckedChange={checked =>
                    handleBooleanFilterChange('fibreReady', checked as boolean)
                  }
                />
                <Label
                  htmlFor="fibre-ready"
                  className="text-sm font-medium leading-none cursor-pointer text-slate-600 flex items-center gap-2"
                >
                  <Wifi className="h-4 w-4 text-blue-500" />
                  Fibre-Ready
                </Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Load-Shedding Solutions */}
        <AccordionItem value="loadShedding">
          <AccordionTrigger className="text-sm font-bold text-slate-700 hover:no-underline">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Load-Shedding Solutions
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2">
              {LOAD_SHEDDING_SOLUTIONS.map(solution => {
                const Icon = solution.icon;
                return (
                  <div key={solution.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`loadshedding-${solution.value}`}
                      checked={
                        filters.loadSheddingSolutions?.includes(solution.value as any) || false
                      }
                      onCheckedChange={checked =>
                        handleLoadSheddingChange(
                          solution.value as 'solar' | 'generator' | 'inverter',
                          checked as boolean,
                        )
                      }
                    />
                    <Label
                      htmlFor={`loadshedding-${solution.value}`}
                      className="text-sm font-medium leading-none cursor-pointer text-slate-600 flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4 text-amber-500" />
                      {solution.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Erf Size */}
        <AccordionItem value="erfSize">
          <AccordionTrigger className="text-sm font-bold text-slate-700 hover:no-underline">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              Erf Size (m²)
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-2 pt-2 pb-6">
              <Slider
                value={[erfSizeRange[0], erfSizeRange[1]]}
                max={DEFAULT_ERF_SIZE_RANGE[1]}
                step={100}
                min={0}
                onValueChange={handleErfSizeChange}
                onValueCommit={handleErfSizeCommit}
                className="mb-4"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{erfSizeRange[0].toLocaleString()} m²</span>
                <span>
                  {erfSizeRange[1] >= DEFAULT_ERF_SIZE_RANGE[1]
                    ? '5,000+ m²'
                    : `${erfSizeRange[1].toLocaleString()} m²`}
                </span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Floor Size */}
        <AccordionItem value="floorSize">
          <AccordionTrigger className="text-sm font-bold text-slate-700 hover:no-underline">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              Floor Size (m²)
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-2 pt-2 pb-6">
              <Slider
                value={[floorSizeRange[0], floorSizeRange[1]]}
                max={DEFAULT_FLOOR_SIZE_RANGE[1]}
                step={25}
                min={0}
                onValueChange={handleFloorSizeChange}
                onValueCommit={handleFloorSizeCommit}
                className="mb-4"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{floorSizeRange[0].toLocaleString()} m²</span>
                <span>
                  {floorSizeRange[1] >= DEFAULT_FLOOR_SIZE_RANGE[1]
                    ? '1,000+ m²'
                    : `${floorSizeRange[1].toLocaleString()} m²`}
                </span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
