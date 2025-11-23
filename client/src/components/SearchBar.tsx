import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void;
  compact?: boolean;
}

export interface SearchFilters {
  city?: string;
  propertyType?: 'apartment' | 'house' | 'villa' | 'plot' | 'commercial';
  listingType?: 'sale' | 'rent';
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minArea?: number;
  maxArea?: number;
  amenities?: string[];
  postedBy?: string[];
  possessionStatus?: string[];
  status?: string;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
}

export function SearchBar({ onSearch, compact = false }: SearchBarProps) {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    onSearch({
      ...filters,
      city: searchQuery || undefined,
    });
  };

  if (compact) {
    return (
      <div className="flex gap-2">
        <Input
          placeholder="Search by city or location..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch} className="bg-accent hover:bg-accent/90">
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2">
          <Input
            placeholder="Search by city, locality, or project..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="h-12"
          />
        </div>

        <Select
          value={filters.listingType}
          onValueChange={value => setFilters({ ...filters, listingType: value as 'sale' | 'rent' })}
        >
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Buy or Rent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sale">Buy</SelectItem>
            <SelectItem value="rent">Rent</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.propertyType}
          onValueChange={value =>
            setFilters({
              ...filters,
              propertyType: value as 'apartment' | 'house' | 'villa' | 'plot' | 'commercial',
            })
          }
        >
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Property Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apartment">Apartment</SelectItem>
            <SelectItem value="house">House</SelectItem>
            <SelectItem value="villa">Villa</SelectItem>
            <SelectItem value="plot">Plot</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          value={filters.minBedrooms?.toString()}
          onValueChange={value => setFilters({ ...filters, minBedrooms: parseInt(value) })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Bedrooms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1+ Bedrooms</SelectItem>
            <SelectItem value="2">2+ Bedrooms</SelectItem>
            <SelectItem value="3">3+ Bedrooms</SelectItem>
            <SelectItem value="4">4+ Bedrooms</SelectItem>
            <SelectItem value="5">5+ Bedrooms</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.minPrice?.toString()}
          onValueChange={value => setFilters({ ...filters, minPrice: parseInt(value) })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Min Price" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="500000">R500K</SelectItem>
            <SelectItem value="1000000">R1M</SelectItem>
            <SelectItem value="2000000">R2M</SelectItem>
            <SelectItem value="5000000">R5M</SelectItem>
            <SelectItem value="10000000">R10M</SelectItem>
            <SelectItem value="20000000">R20M</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.maxPrice?.toString()}
          onValueChange={value => setFilters({ ...filters, maxPrice: parseInt(value) })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Max Price" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1000000">R1M</SelectItem>
            <SelectItem value="2000000">R2M</SelectItem>
            <SelectItem value="5000000">R5M</SelectItem>
            <SelectItem value="10000000">R10M</SelectItem>
            <SelectItem value="20000000">R20M</SelectItem>
            <SelectItem value="50000000">R50M</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSearch} size="lg" className="bg-accent hover:bg-accent/90 px-8">
          <Search className="h-5 w-5 mr-2" />
          Search Properties
        </Button>
      </div>
    </div>
  );
}
