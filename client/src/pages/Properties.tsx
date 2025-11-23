import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ListingNavbar } from '@/components/ListingNavbar';
import { SearchFilters } from '@/components/SearchBar';
import { SidebarFilters } from '@/components/SidebarFilters';
import PropertyCardList from '@/components/PropertyCardList';
import { normalizePropertyForUI } from '@/lib/normalizers';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Building2, Loader2, MapPin, LayoutGrid, List, Map as MapIcon } from 'lucide-react';
import { GooglePropertyMap } from '@/components/maps/GooglePropertyMap';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Properties() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  const [filters, setFilters] = useState<SearchFilters>({});
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const limit = 12;

  const [isSaveSearchOpen, setIsSaveSearchOpen] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');

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

  const saveSearchMutation = trpc.savedSearch.create.useMutation({
    onSuccess: () => {
      toast.success('Search saved successfully');
      setIsSaveSearchOpen(false);
      setSaveSearchName('');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });



  const handleBoundsChange = (bounds: google.maps.LatLngBounds) => {
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    setFilters(prev => ({
      ...prev,
      minLat: sw.lat(),
      maxLat: ne.lat(),
      minLng: sw.lng(),
      maxLng: ne.lng(),
    }));
  };

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


  const handleSaveSearch = () => {
    if (!isAuthenticated) {
      toast.error('Please login to save searches');
      return;
    }
    setIsSaveSearchOpen(true);
  };

  const confirmSaveSearch = () => {
    if (!saveSearchName.trim()) return;
    saveSearchMutation.mutate({
      name: saveSearchName,
      criteria: filters,
      notificationFrequency: 'weekly',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <ListingNavbar />

      <div className="container pt-24 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar Filters - Hidden on mobile, visible on large screens */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-24">
              <SidebarFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onSaveSearch={handleSaveSearch}
              />
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

                <div className="flex items-center bg-white rounded-lg border border-slate-200 p-1 mr-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 px-2 ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-500'}`}
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4 mr-2" />
                    List
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 px-2 ${viewMode === 'map' ? 'bg-slate-100 text-slate-900' : 'text-slate-500'}`}
                    onClick={() => setViewMode('map')}
                  >
                    <MapIcon className="h-4 w-4 mr-2" />
                    Map
                  </Button>
                </div>

                <select className="bg-transparent text-sm font-medium text-slate-600 focus:outline-none cursor-pointer border-none ring-0">
                  <option>Sort by: Featured</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Newest Listed</option>
                </select>
              </div>
            </div>

            {/* Properties Grid or Map */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : properties && properties.length > 0 ? (
              viewMode === 'list' ? (
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
                <GooglePropertyMap
                  properties={properties
                    .map(p => {
                      const normalized = normalizePropertyForUI(p);
                      if (!normalized) return null;
                      return {
                        id: parseInt(normalized.id),
                        title: normalized.title,
                        price: normalized.price,
                        propertyType: normalized.propertyType,
                        listingType: normalized.listingType,
                        latitude: parseFloat(p.latitude || '-26.2041'),
                        longitude: parseFloat(p.longitude || '28.0473'),
                        mainImage: normalized.images[0],
                        address: normalized.address,
                        city: normalized.city,
                        bedrooms: normalized.bedrooms,
                        bathrooms: normalized.bathrooms,
                        area: normalized.area,
                      };
                    })
                    .filter((p): p is NonNullable<typeof p> => p !== null)}
                  onPropertySelect={(id) => {
                    // Navigate to property detail or show modal
                    window.location.href = `/property/${id}`;
                  }}
                  onBoundsChange={handleBoundsChange}
                />
              )
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

      <Dialog open={isSaveSearchOpen} onOpenChange={setIsSaveSearchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>
              Save your current search criteria to get notified about new properties.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="search-name">Search Name</Label>
              <Input
                id="search-name"
                placeholder="e.g. 2 Bed Apartments in Sandton"
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveSearchOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmSaveSearch}
              disabled={saveSearchMutation.isLoading || !saveSearchName.trim()}
            >
              {saveSearchMutation.isLoading ? 'Saving...' : 'Save Search'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
