import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, ArrowRight, Building2, TrendingUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CityItem {
  id: number;
  name: string;
  listingCount: number;
  avgPrice?: number;
  slug?: string;
  suburbCount?: number; // Number of suburbs in this city
  developmentCount?: number; // Number of developments
  popularity?: number; // Search popularity score
}

interface CityListProps {
  title: string;
  cities: CityItem[];
  parentSlug: string; // e.g., 'gauteng'
  showFilters?: boolean;
}

type SortOption = 'name' | 'price-asc' | 'price-desc' | 'listings' | 'popularity';

export function CityList({ title, cities, parentSlug, showFilters = true }: CityListProps) {
  const [sortBy, setSortBy] = useState<SortOption>('popularity');
  const [minListings, setMinListings] = useState<number>(0);

  const sortedAndFilteredCities = useMemo(() => {
    let filtered = cities.filter(city => city.listingCount >= minListings);

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price-asc':
          return (a.avgPrice || 0) - (b.avgPrice || 0);
        case 'price-desc':
          return (b.avgPrice || 0) - (a.avgPrice || 0);
        case 'listings':
          return b.listingCount - a.listingCount;
        case 'popularity':
          return (b.popularity || 0) - (a.popularity || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [cities, sortBy, minListings]);

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    if (price >= 1000000) return `R${(price / 1000000).toFixed(1)}M`;
    return `R${(price / 1000).toFixed(0)}k`;
  };

  const getUrl = (city: CityItem) => {
    const slug = city.slug || city.name.toLowerCase().replace(/\s+/g, '-');
    return `/${parentSlug}/${slug}`;
  };

  return (
    <div className="py-12 bg-slate-50/50">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>

          {showFilters && (
            <div className="flex flex-wrap gap-3">
              <Select value={sortBy} onValueChange={value => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popularity">Most Popular</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="price-desc">Price (High to Low)</SelectItem>
                  <SelectItem value="price-asc">Price (Low to High)</SelectItem>
                  <SelectItem value="listings">Most Listings</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={minListings.toString()}
                onValueChange={value => setMinListings(parseInt(value))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Min listings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All Cities</SelectItem>
                  <SelectItem value="10">10+ Listings</SelectItem>
                  <SelectItem value="50">50+ Listings</SelectItem>
                  <SelectItem value="100">100+ Listings</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedAndFilteredCities.map(city => (
            <Link key={city.id} href={getUrl(city)}>
              <Card className="hover:shadow-lg transition-all cursor-pointer border-slate-200 group h-full hover:border-primary/50">
                <CardContent className="p-6 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-lg text-slate-800 group-hover:text-primary transition-colors flex-1">
                        {city.name}
                      </h3>
                      <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-primary flex-shrink-0 ml-2" />
                    </div>

                    <div className="flex items-center gap-1 text-sm text-slate-500 mb-4">
                      <MapPin className="h-4 w-4" />
                      <span>City</span>
                    </div>

                    {city.suburbCount && city.suburbCount > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs">
                          {city.suburbCount} Suburbs
                        </Badge>
                        {city.developmentCount && city.developmentCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Building2 className="h-3 w-3 mr-1" />
                            {city.developmentCount} Developments
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Total Listings</span>
                      <span className="font-bold text-slate-700">{city.listingCount}</span>
                    </div>
                    {city.avgPrice && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">Avg Price</span>
                        <span className="font-bold text-primary">{formatPrice(city.avgPrice)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {sortedAndFilteredCities.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">
              No cities match your filters. Try adjusting your criteria.
            </p>
          </div>
        )}

        {sortedAndFilteredCities.length > 0 && (
          <div className="mt-6 text-center text-sm text-slate-500">
            Showing {sortedAndFilteredCities.length} of {cities.length} cities
          </div>
        )}
      </div>
    </div>
  );
}
