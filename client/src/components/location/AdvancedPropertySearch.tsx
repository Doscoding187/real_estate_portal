import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, MapPin, Sliders, Filter, X, Plus } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import LocationAutocomplete from './LocationAutocomplete';
import { useToast } from '@/components/ui/use-toast';

interface SearchFilters {
  // Location
  location: {
    type: 'province' | 'city' | 'suburb' | 'coordinates';
    value: string;
    radius: number;
  } | null;

  // Property filters
  propertyType: string[];
  listingType: string[];
  priceRange: [number, number];
  bedrooms: { min: number; max: number } | null;
  bathrooms: { min: number; max: number } | null;
  areaRange: [number, number];

  // Amenities
  amenities: {
    schools: { enabled: boolean; maxDistance: number };
    hospitals: { enabled: boolean; maxDistance: number };
    transport: { enabled: boolean; maxDistance: number };
    shopping: { enabled: boolean; maxDistance: number };
  };
}

interface AdvancedPropertySearchProps {
  onResults?: (results: any[]) => void;
  onFiltersChange?: (filters: SearchFilters) => void;
  className?: string;
}

export function AdvancedPropertySearch({
  onResults,
  onFiltersChange,
  className,
}: AdvancedPropertySearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    location: null,
    propertyType: [],
    listingType: [],
    priceRange: [0, 10000000],
    bedrooms: null,
    bathrooms: null,
    areaRange: [0, 10000],
    amenities: {
      schools: { enabled: false, maxDistance: 2 },
      hospitals: { enabled: false, maxDistance: 5 },
      transport: { enabled: false, maxDistance: 1 },
      shopping: { enabled: false, maxDistance: 2 },
    },
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const searchProperties = trpc.location.advancedPropertySearch.useMutation({
    onSuccess: data => {
      setSearchResults(data.properties);
      onResults?.(data.properties);
      setIsSearching(false);
      toast({
        title: 'Search Complete',
        description: `Found ${data.properties.length} properties`,
      });
    },
    onError: error => {
      setIsSearching(false);
      toast({
        title: 'Search Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateFilter = useCallback(
    (key: keyof SearchFilters, value: any) => {
      const newFilters = { ...filters, [key]: value };
      setFilters(newFilters);
      onFiltersChange?.(newFilters);
    },
    [filters, onFiltersChange],
  );

  const handleLocationSelect = useCallback(
    (location: any) => {
      updateFilter('location', {
        type: location.type,
        value: location.name || location.value,
        radius: 10, // Default 10km radius
      });
    },
    [updateFilter],
  );

  const addPropertyType = (type: string) => {
    if (!filters.propertyType.includes(type)) {
      updateFilter('propertyType', [...filters.propertyType, type]);
    }
  };

  const removePropertyType = (type: string) => {
    updateFilter(
      'propertyType',
      filters.propertyType.filter(t => t !== type),
    );
  };

  const addListingType = (type: string) => {
    if (!filters.listingType.includes(type)) {
      updateFilter('listingType', [...filters.listingType, type]);
    }
  };

  const removeListingType = (type: string) => {
    updateFilter(
      'listingType',
      filters.listingType.filter(t => t !== type),
    );
  };

  const toggleAmenity = (amenity: keyof SearchFilters['amenities']) => {
    const current = filters.amenities[amenity];
    updateFilter('amenities', {
      ...filters.amenities,
      [amenity]: {
        ...current,
        enabled: !current.enabled,
      },
    });
  };

  const updateAmenityDistance = (amenity: keyof SearchFilters['amenities'], distance: number) => {
    updateFilter('amenities', {
      ...filters.amenities,
      [amenity]: {
        ...filters.amenities[amenity],
        maxDistance: distance,
      },
    });
  };

  const handleSearch = useCallback(() => {
    setIsSearching(true);

    const searchParams = {
      location: filters.location,
      filters: {
        propertyType: filters.propertyType,
        listingType: filters.listingType,
        minPrice: filters.priceRange[0] > 0 ? filters.priceRange[0] : undefined,
        maxPrice: filters.priceRange[1] < 10000000 ? filters.priceRange[1] : undefined,
        bedrooms: filters.bedrooms,
        bathrooms: filters.bathrooms,
        minArea: filters.areaRange[0] > 0 ? filters.areaRange[0] : undefined,
        maxArea: filters.areaRange[1] < 10000 ? filters.areaRange[1] : undefined,
      },
      amenities: filters.amenities,
      limit: 50,
      offset: 0,
      sortBy: 'newest',
      sortOrder: 'desc' as const,
    };

    searchProperties.mutate(searchParams);
  }, [filters, searchProperties]);

  const clearAllFilters = useCallback(() => {
    const resetFilters: SearchFilters = {
      location: null,
      propertyType: [],
      listingType: [],
      priceRange: [0, 10000000],
      bedrooms: null,
      bathrooms: null,
      areaRange: [0, 10000],
      amenities: {
        schools: { enabled: false, maxDistance: 2 },
        hospitals: { enabled: false, maxDistance: 5 },
        transport: { enabled: false, maxDistance: 1 },
        shopping: { enabled: false, maxDistance: 2 },
      },
    };
    setFilters(resetFilters);
    onFiltersChange?.(resetFilters);
    setSearchResults([]);
  }, [onFiltersChange]);

  const propertyTypes = [
    'apartment',
    'house',
    'villa',
    'plot',
    'commercial',
    'townhouse',
    'cluster_home',
    'farm',
    'shared_living',
  ];

  const listingTypes = ['sale', 'rent', 'rent_to_buy', 'auction', 'shared_living'];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Advanced Property Search
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Location Selection */}
        <div className="space-y-3">
          <Label>Location</Label>
          <LocationAutocomplete
            onSelect={handleLocationSelect}
            placeholder="Search by province, city, or suburb..."
            className="w-full"
          />
          {filters.location && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                <MapPin className="h-3 w-3 mr-1" />
                {filters.location.value}
              </Badge>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Radius:</Label>
                <Slider
                  value={[filters.location.radius]}
                  onValueChange={([value]) =>
                    updateFilter('location', { ...filters.location!, radius: value })
                  }
                  max={50}
                  min={1}
                  step={1}
                  className="w-24"
                />
                <span className="text-sm">{filters.location.radius}km</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => updateFilter('location', null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Basic Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Property Types */}
          <div className="space-y-2">
            <Label>Property Type</Label>
            <div className="flex flex-wrap gap-2">
              {propertyTypes.map(type => (
                <Badge
                  key={type}
                  variant={filters.propertyType.includes(type) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() =>
                    filters.propertyType.includes(type)
                      ? removePropertyType(type)
                      : addPropertyType(type)
                  }
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Badge>
              ))}
            </div>
          </div>

          {/* Listing Types */}
          <div className="space-y-2">
            <Label>Listing Type</Label>
            <div className="flex flex-wrap gap-2">
              {listingTypes.map(type => (
                <Badge
                  key={type}
                  variant={filters.listingType.includes(type) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() =>
                    filters.listingType.includes(type)
                      ? removeListingType(type)
                      : addListingType(type)
                  }
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Price Range */}
        <div className="space-y-2">
          <Label>Price Range</Label>
          <div className="px-3">
            <Slider
              value={filters.priceRange}
              onValueChange={([min, max]) => updateFilter('priceRange', [min, max])}
              max={10000000}
              min={0}
              step={50000}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground mt-1">
              <span>R{filters.priceRange[0].toLocaleString()}</span>
              <span>R{filters.priceRange[1].toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        <Button variant="outline" onClick={() => setShowAdvanced(!showAdvanced)} className="w-full">
          <Sliders className="h-4 w-4 mr-2" />
          {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
        </Button>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            {/* Bedrooms & Bathrooms */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bedrooms</Label>
                <Select
                  value={filters.bedrooms ? `${filters.bedrooms.min}-${filters.bedrooms.max}` : ''}
                  onValueChange={value => {
                    if (!value) {
                      updateFilter('bedrooms', null);
                    } else {
                      const [min, max] = value.split('-').map(Number);
                      updateFilter('bedrooms', { min, max });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    <SelectItem value="1-1">1 bedroom</SelectItem>
                    <SelectItem value="2-2">2 bedrooms</SelectItem>
                    <SelectItem value="3-3">3 bedrooms</SelectItem>
                    <SelectItem value="4-4">4+ bedrooms</SelectItem>
                    <SelectItem value="1-5">1-5 bedrooms</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Bathrooms</Label>
                <Select
                  value={
                    filters.bathrooms ? `${filters.bathrooms.min}-${filters.bathrooms.max}` : ''
                  }
                  onValueChange={value => {
                    if (!value) {
                      updateFilter('bathrooms', null);
                    } else {
                      const [min, max] = value.split('-').map(Number);
                      updateFilter('bathrooms', { min, max });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    <SelectItem value="1-1">1 bathroom</SelectItem>
                    <SelectItem value="2-2">2 bathrooms</SelectItem>
                    <SelectItem value="3-3">3+ bathrooms</SelectItem>
                    <SelectItem value="1-5">1-5 bathrooms</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Area Range */}
            <div className="space-y-2">
              <Label>Area (sq ft)</Label>
              <div className="px-3">
                <Slider
                  value={filters.areaRange}
                  onValueChange={([min, max]) => updateFilter('areaRange', [min, max])}
                  max={10000}
                  min={0}
                  step={100}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-1">
                  <span>{filters.areaRange[0].toLocaleString()} sq ft</span>
                  <span>{filters.areaRange[1].toLocaleString()} sq ft</span>
                </div>
              </div>
            </div>

            {/* Nearby Amenities */}
            <div className="space-y-3">
              <Label>Nearby Amenities</Label>
              {Object.entries(filters.amenities).map(([key, amenity]) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={amenity.enabled}
                      onChange={() => toggleAmenity(key as keyof SearchFilters['amenities'])}
                      className="rounded"
                    />
                    <Label className="capitalize">{key}</Label>
                  </div>
                  {amenity.enabled && (
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[amenity.maxDistance]}
                        onValueChange={([value]) =>
                          updateAmenityDistance(key as keyof SearchFilters['amenities'], value)
                        }
                        max={10}
                        min={0.5}
                        step={0.5}
                        className="w-20"
                      />
                      <span className="text-sm w-8">{amenity.maxDistance}km</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={handleSearch} disabled={isSearching} className="flex-1">
            {isSearching ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Search Properties
          </Button>

          <Button variant="outline" onClick={clearAllFilters}>
            Clear All
          </Button>
        </div>

        {/* Results Summary */}
        {searchResults.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            Found {searchResults.length} properties
          </div>
        )}
      </CardContent>
    </Card>
  );
}
