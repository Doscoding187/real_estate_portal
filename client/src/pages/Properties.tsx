import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ListingNavbar } from '@/components/ListingNavbar';
import { SearchFilters } from '@/components/SearchBar';
import { SidebarFilters } from '@/components/SidebarFilters';
import PropertyCardList from '@/components/PropertyCardList';
import { normalizePropertyForUI } from '@/lib/normalizers';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Building2, Loader2, MapPin, LayoutGrid, List } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';

export default function Properties() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  const [filters, setFilters] = useState<SearchFilters>({});
  const [page, setPage] = useState(0);
  const limit = 12;

  // Parse URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const newFilters: SearchFilters = {};

    if (params.get('city')) newFilters.city = params.get('city')!;
    if (params.get('propertyType')) newFilters.propertyType = params.get('propertyType')! as any;
    if (params.get('listingType')) newFilters.listingType = params.get('listingType')! as any;
    if (params.get('minPrice')) newFilters.minPrice = parseInt(params.get('minPrice')!);
    if (params.get('maxPrice')) newFilters.maxPrice = parseInt(params.get('maxPrice')!);
    if (params.get('minBedrooms')) newFilters.minBedrooms = parseInt(params.get('minBedrooms')!);

    setFilters(newFilters);
  }, [location]);

  const {
    data: properties,
    isLoading,
    refetch,
  } = trpc.properties.search.useQuery({
    ...filters,
    status: 'available' as const,
    limit,
    offset: page * limit,
  });

  const addFavoriteMutation = trpc.favorites.add.useMutation({
    onSuccess: () => {
      toast.success('Added to favorites');
    },
    onError: () => {
      toast.error('Failed to add to favorites');
    },
  });

  const handleSearch = (newFilters: SearchFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(0);
  };

  const handleFilterChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  const handleFavoriteClick = (propertyId: string) => {
    if (!isAuthenticated) {
      toast.error('Please login to save favorites');
      return;
    }
    addFavoriteMutation.mutate({ propertyId: parseInt(propertyId) });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <ListingNavbar />

      <div className="container pt-24 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar Filters - Hidden on mobile, visible on large screens */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-24">
              <SidebarFilters filters={filters} onFilterChange={handleFilterChange} />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="col-span-1 lg:col-span-9">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {properties && properties.length > 0
                    ? `${properties.length} Properties Found`
                    : 'Available Properties'}
                </h2>
                {Object.keys(filters).length > 0 && (
                  <p className="text-sm text-slate-500 mt-1">
                    Results for {filters.city || 'All Cities'} 
                    {filters.propertyType && ` • ${filters.propertyType}`}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                {/* Mobile Filter Toggle */}
                <Button variant="outline" className="lg:hidden border-slate-200 text-slate-600">
                  <List className="h-4 w-4 mr-2" /> Filters
                </Button>

                <select className="bg-transparent text-sm font-medium text-slate-600 focus:outline-none cursor-pointer border-none ring-0">
                  <option>Sort by: Featured</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Newest Listed</option>
                </select>
              </div>
            </div>

            {/* Properties Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : properties && properties.length > 0 ? (
              <div className="flex flex-col gap-4">
                {properties.map((property) => {
                  const normalized = normalizePropertyForUI(property);
                  if (!normalized) return null;
                  
                  return (
                    <PropertyCardList
                      key={normalized.id}
                      {...normalized}
                      onFavoriteClick={() => handleFavoriteClick(normalized.id)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Building2 className="h-16 w-16 text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                  No properties found
                </h3>
                <p className="text-slate-500 max-w-md">
                  Try adjusting your filters or search criteria to find more properties.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
