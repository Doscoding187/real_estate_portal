import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SuburbItem {
  id: number;
  name: string;
  listingCount: number;
  avgPrice?: number;
  slug?: string;
  priceChange?: number; // Percentage change
  popularity?: number; // Search popularity score
}

interface SuburbListProps {
  title: string;
  suburbs: SuburbItem[];
  parentSlug: string; // e.g., 'gauteng/johannesburg'
  showFilters?: boolean;
}

type SortOption = 'name' | 'price-asc' | 'price-desc' | 'listings' | 'popularity';

export function SuburbList({ 
  title, 
  suburbs, 
  parentSlug,
  showFilters = true 
}: SuburbListProps) {
  const [sortBy, setSortBy] = useState<SortOption>('popularity');
  const [minListings, setMinListings] = useState<number>(0);

  const sortedAndFilteredSuburbs = useMemo(() => {
    let filtered = suburbs.filter(suburb => suburb.listingCount >= minListings);

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
  }, [suburbs, sortBy, minListings]);

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    if (price >= 1000000) return `R${(price / 1000000).toFixed(1)}M`;
    return `R${(price / 1000).toFixed(0)}k`;
  };

  const getUrl = (suburb: SuburbItem) => {
    const slug = suburb.slug || suburb.name.toLowerCase().replace(/\s+/g, '-');
    return `/${parentSlug}/${slug}`;
  };

  return (
    <div className="py-12 bg-white">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          
          {showFilters && (
            <div className="flex flex-wrap gap-3">
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
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
                onValueChange={(value) => setMinListings(parseInt(value))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Min listings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All Suburbs</SelectItem>
                  <SelectItem value="5">5+ Listings</SelectItem>
                  <SelectItem value="10">10+ Listings</SelectItem>
                  <SelectItem value="20">20+ Listings</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedAndFilteredSuburbs.map((suburb) => (
            <Link key={suburb.id} href={getUrl(suburb)}>
              <Card className="hover:shadow-lg transition-all cursor-pointer border-slate-200 group h-full hover:border-primary/50">
                <CardContent className="p-5 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-slate-800 group-hover:text-primary transition-colors flex-1">
                        {suburb.name}
                      </h3>
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary flex-shrink-0 ml-2" />
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                      <MapPin className="h-3 w-3" />
                      <span>Suburb</span>
                    </div>

                    {suburb.priceChange !== undefined && suburb.priceChange !== 0 && (
                      <Badge 
                        variant={suburb.priceChange > 0 ? "default" : "secondary"}
                        className="mb-3"
                      >
                        {suburb.priceChange > 0 ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {Math.abs(suburb.priceChange).toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                  
                  <div className="mt-auto space-y-2 pt-3 border-t border-slate-100">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Listings</span>
                      <span className="font-semibold text-slate-700">{suburb.listingCount}</span>
                    </div>
                    {suburb.avgPrice && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Avg Price</span>
                        <span className="font-semibold text-slate-700">{formatPrice(suburb.avgPrice)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {sortedAndFilteredSuburbs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">No suburbs match your filters. Try adjusting your criteria.</p>
          </div>
        )}

        {sortedAndFilteredSuburbs.length > 0 && (
          <div className="mt-6 text-center text-sm text-slate-500">
            Showing {sortedAndFilteredSuburbs.length} of {suburbs.length} suburbs
          </div>
        )}
      </div>
    </div>
  );
}
