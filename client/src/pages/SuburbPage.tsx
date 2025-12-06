import { useMemo } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { ListingNavbar } from '@/components/ListingNavbar';
import PropertyCard from '@/components/PropertyCard';
import { normalizePropertyForUI } from '@/lib/normalizers';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Building2, 
  Home, 
  ChevronRight, 
  ArrowLeft, 
  TrendingUp, 
  Users,
  DollarSign,
  Ruler
} from 'lucide-react';
import { 
  Breadcrumbs, 
  ActiveFilterChips, 
  ResultsHeader, 
  ViewMode, 
  SortOption 
} from '@/components/search';
import { 
  generatePropertyUrl, 
  generateBreadcrumbs, 
  unslugify, 
  SearchFilters 
} from '@/lib/urlUtils';
import { useState } from 'react';

// Suburb metadata (would ideally come from backend)
const suburbData: Record<string, Record<string, { 
  name: string; 
  description: string;
  avgPrice: number;
  priceChange: number;
  totalProperties: number;
}>> = {
  johannesburg: {
    sandton: { 
      name: 'Sandton', 
      description: 'The financial hub of Africa, known for luxury properties and modern apartments',
      avgPrice: 4500000,
      priceChange: 5.2,
      totalProperties: 245
    },
    rosebank: { 
      name: 'Rosebank', 
      description: 'Trendy neighborhood with a mix of commercial and residential properties',
      avgPrice: 3200000,
      priceChange: 3.8,
      totalProperties: 189
    },
    midrand: { 
      name: 'Midrand', 
      description: 'Growing tech hub between Johannesburg and Pretoria',
      avgPrice: 2100000,
      priceChange: 6.1,
      totalProperties: 312
    },
    fourways: { 
      name: 'Fourways', 
      description: 'Family-friendly suburb with excellent schools and shopping centers',
      avgPrice: 3500000,
      priceChange: 4.5,
      totalProperties: 276
    },
    bryanston: { 
      name: 'Bryanston', 
      description: 'Upmarket residential area with large properties and leafy streets',
      avgPrice: 5200000,
      priceChange: 2.9,
      totalProperties: 156
    },
    centurion: { 
      name: 'Centurion', 
      description: 'Modern suburb with excellent access to highways and amenities',
      avgPrice: 2100000,
      priceChange: 7.3,
      totalProperties: 298
    },
  },
  'cape-town': {
    'sea-point': { 
      name: 'Sea Point', 
      description: 'Beachfront living with stunning Atlantic Ocean views',
      avgPrice: 6500000,
      priceChange: 4.2,
      totalProperties: 178
    },
    constantia: { 
      name: 'Constantia', 
      description: 'Historic wine estate area with luxury homes',
      avgPrice: 12000000,
      priceChange: 3.1,
      totalProperties: 89
    },
  },
};

// City name lookup
const cityNames: Record<string, string> = {
  johannesburg: 'Johannesburg',
  'cape-town': 'Cape Town',
  durban: 'Durban',
  pretoria: 'Pretoria',
};

export default function SuburbPage() {
  const params = useParams<{ city: string; suburb: string }>();
  const [, setLocation] = useLocation();
  
  const citySlug = params.city;
  const suburbSlug = params.suburb;
  
  const cityName = cityNames[citySlug] || unslugify(citySlug);
  const suburbInfo = suburbData[citySlug]?.[suburbSlug];
  const suburbName = suburbInfo?.name || unslugify(suburbSlug);

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [filters, setFilters] = useState<SearchFilters>({
    city: cityName,
    suburb: suburbName,
  });

  // Fetch properties for this suburb
  const { data: properties, isLoading } = trpc.properties.search.useQuery({
    city: cityName,
    // Note: Backend would need to support suburb filtering
    limit: 12,
  });

  // Filter properties by suburb (client-side for now)
  const suburbProperties = useMemo(() => {
    if (!properties) return [];
    // In a real implementation, backend would filter by suburb
    return properties;
  }, [properties]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!suburbProperties.length) return null;
    const prices = suburbProperties.map(p => p.price || 0).filter(p => p > 0);
    const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    return { avgPrice, minPrice, maxPrice, count: suburbProperties.length };
  }, [suburbProperties]);

  // Generate breadcrumbs
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: cityName, href: `/city/${citySlug}` },
    { label: suburbName, href: `/suburb/${citySlug}/${suburbSlug}` },
  ];

  // Sort properties
  const sortedProperties = useMemo(() => {
    const sorted = [...suburbProperties];
    switch (sortBy) {
      case 'price_asc':
        sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_desc':
        sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'date_desc':
        sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
      case 'date_asc':
        sorted.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
        break;
    }
    return sorted;
  }, [suburbProperties, sortBy]);

  // Format price for display
  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `R${(price / 1000000).toFixed(1)}M`;
    }
    return `R${(price / 1000).toFixed(0)}K`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <ListingNavbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white pt-24 pb-12">
        <div className="container">
          {/* Back link */}
          <Link href={`/city/${citySlug}`}>
            <Button variant="ghost" size="sm" className="text-white/80 hover:text-white mb-4 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {cityName}
            </Button>
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <MapPin className="h-6 w-6 text-blue-400" />
                <h1 className="text-3xl md:text-4xl font-bold">{suburbName}</h1>
              </div>
              <p className="text-white/80 text-lg">{cityName}</p>
              {suburbInfo && (
                <p className="text-white/60 mt-2 max-w-2xl">{suburbInfo.description}</p>
              )}
            </div>

            {/* Stats Cards */}
            <div className="flex flex-wrap gap-4">
              <Card className="bg-white/10 border-white/20 text-white">
                <CardContent className="p-4 flex items-center gap-3">
                  <DollarSign className="h-8 w-8 text-green-400" />
                  <div>
                    <p className="text-sm text-white/60">Avg Price</p>
                    <p className="text-xl font-bold">
                      {formatPrice(suburbInfo?.avgPrice || stats?.avgPrice || 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/10 border-white/20 text-white">
                <CardContent className="p-4 flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-blue-400" />
                  <div>
                    <p className="text-sm text-white/60">YoY Change</p>
                    <p className="text-xl font-bold text-green-400">
                      +{suburbInfo?.priceChange || 4.5}%
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 border-white/20 text-white">
                <CardContent className="p-4 flex items-center gap-3">
                  <Building2 className="h-8 w-8 text-purple-400" />
                  <div>
                    <p className="text-sm text-white/60">Properties</p>
                    <p className="text-xl font-bold">
                      {suburbInfo?.totalProperties || stats?.count || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        {/* Breadcrumbs */}
        <div className="mb-6">
          <Breadcrumbs items={breadcrumbs} />
        </div>

        {/* Quick Filter Links */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Link href={generatePropertyUrl({ listingType: 'sale', city: cityName, suburb: suburbName })}>
            <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-white transition-colors px-4 py-2">
              <Home className="h-3.5 w-3.5 mr-1.5" />
              For Sale
            </Badge>
          </Link>
          <Link href={generatePropertyUrl({ listingType: 'rent', city: cityName, suburb: suburbName })}>
            <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-white transition-colors px-4 py-2">
              <Users className="h-3.5 w-3.5 mr-1.5" />
              To Rent
            </Badge>
          </Link>
          <Link href={generatePropertyUrl({ listingType: 'sale', propertyType: 'apartment', city: cityName })}>
            <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-white transition-colors px-4 py-2">
              Apartments
            </Badge>
          </Link>
          <Link href={generatePropertyUrl({ listingType: 'sale', propertyType: 'house', city: cityName })}>
            <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-white transition-colors px-4 py-2">
              Houses
            </Badge>
          </Link>
        </div>

        {/* Results Header */}
        <ResultsHeader
          filters={{ city: cityName, suburb: suburbName }}
          resultCount={sortedProperties.length}
          isLoading={isLoading}
          viewMode={viewMode}
          sortBy={sortBy}
          onViewModeChange={setViewMode}
          onSortChange={setSortBy}
          showMobileFilterButton={false}
        />

        {/* Property Grid */}
        <div className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-lg" />
              ))}
            </div>
          ) : sortedProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedProperties.map(property => {
                const normalized = normalizePropertyForUI(property);
                if (!normalized) return null;
                return (
                  <PropertyCard key={normalized.id} {...normalized} />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-lg border">
              <Building2 className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                No properties found in {suburbName}
              </h3>
              <p className="text-slate-500 mb-6">
                Try searching in nearby suburbs or adjusting your filters.
              </p>
              <Link href={`/city/${citySlug}`}>
                <Button variant="outline">
                  View all {cityName} properties
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
