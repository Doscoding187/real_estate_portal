import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Navbar } from '@/components/Navbar';
import { SearchBar, SearchFilters } from '@/components/SearchBar';
import PropertyCard from '@/components/PropertyCard';
import { normalizePropertyForUI } from '@/lib/normalizers';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Building2, Loader2 } from 'lucide-react';
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

  const removeFavoriteMutation = trpc.favorites.remove.useMutation({
    onSuccess: () => {
      toast.success('Removed from favorites');
    },
    onError: () => {
      toast.error('Failed to remove from favorites');
    },
  });

  const handleSearch = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  const handleFavoriteClick = (propertyId: string) => {
    if (!isAuthenticated) {
      toast.error('Please login to save favorites');
      return;
    }
    // For now, just add to favorites (in real app, check if already favorited)
    addFavoriteMutation.mutate({ propertyId: parseInt(propertyId) });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="bg-primary/5 py-8">
        <div className="container">
          <h1 className="text-3xl font-bold mb-6">Search Properties</h1>
          <SearchBar onSearch={handleSearch} />
        </div>
      </div>

      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold">
              {properties && properties.length > 0
                ? `${properties.length} Properties Found`
                : 'Available Properties'}
            </h2>
            {Object.keys(filters).length > 0 && (
              <p className="text-muted-foreground mt-1">Showing results for your search</p>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : properties && properties.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map(property => {
                const p = normalizePropertyForUI(property);
                return p ? (
                  <PropertyCard
                    key={p.id}
                    {...p}
                    onFavoriteClick={() => handleFavoriteClick(p.id)}
                  />
                ) : null;
              })}
            </div>

            {properties.length === limit && (
              <div className="flex justify-center mt-12">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button variant="outline" onClick={() => setPage(page + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 bg-muted/30 rounded-lg">
            <Building2 className="h-20 w-20 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Properties Found</h3>
            <p className="text-muted-foreground mb-6">
              Try adjusting your search filters to find more results
            </p>
            <Button
              onClick={() => {
                setFilters({});
                setPage(0);
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      <footer className="bg-muted/30 py-8 mt-12">
        <div className="container text-center text-muted-foreground">
          <p>&copy; 2025 Real Estate Portal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
