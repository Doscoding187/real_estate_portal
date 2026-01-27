import { useState } from 'react';
import { Search } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

export interface SearchFilters {
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  location?: string;
  placeId?: string;
}

interface SearchRefinementBarProps {
  onSearch?: (filters: SearchFilters) => void;
  defaultLocation?: string;
  placeId?: string; // Google Places ID for precise filtering
}

export function SearchRefinementBar({
  onSearch,
  defaultLocation,
  placeId,
}: SearchRefinementBarProps) {
  const [, navigate] = useLocation();
  const [filters, setFilters] = useState<SearchFilters>({
    location: defaultLocation,
    placeId: placeId,
  });
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000000]);

  const handlePropertyTypeChange = (value: string) => {
    setFilters(prev => ({ ...prev, propertyType: value === 'all' ? undefined : value }));
  };

  const handlePriceRangeChange = (value: string) => {
    let min = 0;
    let max = 10000000;

    switch (value) {
      case '1m':
        max = 1000000;
        break;
      case '2m':
        min = 1000000;
        max = 3000000;
        break;
      case '5m':
        min = 3000000;
        max = 5000000;
        break;
      case 'luxury':
        min = 5000000;
        break;
    }

    setPriceRange([min, max]);
    setFilters(prev => ({
      ...prev,
      minPrice: min > 0 ? min : undefined,
      maxPrice: max < 10000000 ? max : undefined,
    }));
  };

  const handleBedroomsChange = (value: string) => {
    setFilters(prev => ({ ...prev, bedrooms: value === 'any' ? undefined : parseInt(value) }));
  };

  const handleBathroomsChange = (value: string) => {
    setFilters(prev => ({ ...prev, bathrooms: value === 'any' ? undefined : parseInt(value) }));
  };

  const handleSearch = () => {
    // Build search URL with filters
    const params = new URLSearchParams();

    if (filters.location) params.append('location', filters.location);
    if (filters.placeId) params.append('placeId', filters.placeId);
    if (filters.propertyType) params.append('propertyType', filters.propertyType);
    if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    if (filters.bedrooms) params.append('bedrooms', filters.bedrooms.toString());
    if (filters.bathrooms) params.append('bathrooms', filters.bathrooms.toString());

    const searchUrl = `/properties?${params.toString()}`;

    if (onSearch) {
      onSearch(filters);
    } else {
      navigate(searchUrl);
    }
  };

  return (
    <div className="bg-white border-b sticky top-16 z-40 shadow-sm">
      <div className="container py-4">
        <div className="flex flex-col gap-4">
          {/* Main Search Row */}
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search properties in ${defaultLocation || 'this area'}...`}
                className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-primary"
                value={filters.location || ''}
                onChange={e => setFilters(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 w-full md:w-auto">
              <Select onValueChange={handlePropertyTypeChange}>
                <SelectTrigger className="w-full md:w-[140px]">
                  <SelectValue placeholder="Property Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                  <SelectItem value="villa">Villa</SelectItem>
                </SelectContent>
              </Select>

              <Select onValueChange={handlePriceRangeChange}>
                <SelectTrigger className="w-full md:w-[130px]">
                  <SelectValue placeholder="Price Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Price</SelectItem>
                  <SelectItem value="1m">Under R1m</SelectItem>
                  <SelectItem value="2m">R1m - R3m</SelectItem>
                  <SelectItem value="5m">R3m - R5m</SelectItem>
                  <SelectItem value="luxury">R5m+</SelectItem>
                </SelectContent>
              </Select>

              <Select onValueChange={handleBedroomsChange}>
                <SelectTrigger className="w-full md:w-[130px]">
                  <SelectValue placeholder="Bedrooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Beds</SelectItem>
                  <SelectItem value="1">1+ Beds</SelectItem>
                  <SelectItem value="2">2+ Beds</SelectItem>
                  <SelectItem value="3">3+ Beds</SelectItem>
                  <SelectItem value="4">4+ Beds</SelectItem>
                  <SelectItem value="5">5+ Beds</SelectItem>
                </SelectContent>
              </Select>

              <Select onValueChange={handleBathroomsChange}>
                <SelectTrigger className="w-full md:w-[130px]">
                  <SelectValue placeholder="Bathrooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Baths</SelectItem>
                  <SelectItem value="1">1+ Baths</SelectItem>
                  <SelectItem value="2">2+ Baths</SelectItem>
                  <SelectItem value="3">3+ Baths</SelectItem>
                  <SelectItem value="4">4+ Baths</SelectItem>
                </SelectContent>
              </Select>

              <Button
                className="w-full md:w-auto bg-primary hover:bg-primary/90"
                onClick={handleSearch}
              >
                Search
              </Button>
            </div>
          </div>

          {/* Price Range Slider (Optional - shown when custom range needed) */}
          {filters.minPrice !== undefined || filters.maxPrice !== undefined ? (
            <div className="flex items-center gap-4 px-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">
                Price: R{priceRange[0].toLocaleString()} - R{priceRange[1].toLocaleString()}
              </Label>
              <Slider
                value={priceRange}
                onValueChange={value => {
                  setPriceRange(value as [number, number]);
                  setFilters(prev => ({
                    ...prev,
                    minPrice: value[0] > 0 ? value[0] : undefined,
                    maxPrice: value[1] < 10000000 ? value[1] : undefined,
                  }));
                }}
                min={0}
                max={10000000}
                step={100000}
                className="flex-1"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
