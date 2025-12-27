import { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import { ListingNavbar } from '@/components/ListingNavbar';
import { SidebarFilters } from '@/components/SidebarFilters';
import PropertyCardList from '@/components/PropertyCardList';
import PropertyCard from '@/components/PropertyCard';
import { GooglePropertyMap } from '@/components/maps/GooglePropertyMap';
import { normalizePropertyForUI } from '@/lib/normalizers';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

// Search components
import {
  Breadcrumbs,
  ActiveFilterChips,
  ResultsHeader,
  MobileFilterDrawer,
  MobileStickyControls,
  ViewMode,
  SortOption,
} from '@/components/search';

// URL utilities
import { MetaControl } from '@/components/seo/MetaControl';
import {
  parsePropertyUrl,
  parseLegacyQueryParams,
  generateBreadcrumbs,
  generatePageTitle,
  generateMetaDescription,
  generatePropertyUrl,
  generateCanonicalUrl,
  SearchFilters,
} from '@/lib/urlUtils';

export default function SearchResults({ province: propProvince, city: propCity }: { province?: string; city?: string } = {}) {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Get URL params from wouter
  const params = useParams<{
    listingType?: string;
    propertyType?: string;
    location?: string;
    suburb?: string;
    // Add explicit support for canonical route params
    province?: string;
    city?: string;
  }>();

  // State
  const [filters, setFilters] = useState<SearchFilters>({});
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [page, setPage] = useState(0);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isSaveSearchOpen, setIsSaveSearchOpen] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');

  const limit = 12;

  // Parse URL params on mount and when URL changes
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    
    // Check for Transaction Roots first
    if (location.startsWith('/property-for-sale')) {
        const parsedQuery = parseLegacyQueryParams(searchParams);
        
        // Extract location path params if they exist (from canonical routes)
        // Use props as fallback when params are empty (e.g., when embedded in CityPage)
        const pathFilters: Partial<SearchFilters> = {};
        pathFilters.province = params.province || propProvince;
        pathFilters.city = params.city || propCity;
        if (params.suburb) pathFilters.suburb = params.suburb;
        
        // Also handle the generic /property-for-sale/:slug case (LocationDispatcher)
        // If "listingType" is caught as the first param but it's actually a slug... wait.
        // LocationDispatcher routes to SearchResults? No, LocationDispatcher routes to Province/CityPage.
        // But if SearchResults is mounted directly via /property-for-sale, params might be empty.
        
        setFilters({ ...parsedQuery, ...pathFilters, listingType: 'sale' });
        return;
    }
    if (location.startsWith('/property-to-rent')) {
        const parsedQuery = parseLegacyQueryParams(searchParams);
        
        // Extract location path params - use props as fallback
        const pathFilters: Partial<SearchFilters> = {};
        pathFilters.province = params.province || propProvince;
        pathFilters.city = params.city || propCity;
        if (params.suburb) pathFilters.suburb = params.suburb;

        setFilters({ ...parsedQuery, ...pathFilters, listingType: 'rent' });
        return;
    }

    // Check if using new SEO-friendly URLs or legacy query params
    if (params.listingType) {
      // Legacy Route /properties/sale/...
      const parsedFilters = parsePropertyUrl(params, searchParams);
      setFilters(parsedFilters);
    } else {
      // Legacy URL structure: /properties?listingType=sale&propertyType=house
      const legacyFilters = parseLegacyQueryParams(searchParams);
      setFilters(legacyFilters);
    }
  }, [params, location, window.location.search, propProvince, propCity]);

  // Update document title for SEO
  useEffect(() => {
    document.title = generatePageTitle(filters);
    
    // Update meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', generateMetaDescription(filters));
    }
  }, [filters]);

  // Generate breadcrumbs
  const breadcrumbs = useMemo(() => generateBreadcrumbs(filters), [filters]);

  // Build query input for tRPC
  const queryInput = useMemo(() => ({
    city: filters.city,
    propertyType: filters.propertyType as any,
    listingType: filters.listingType as any,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    minBedrooms: filters.minBedrooms,
    status: 'available' as const,
    limit,
    offset: page * limit,
  }), [filters, page]);

  // Fetch properties
  const {
    data: properties,
    isLoading,
    refetch,
  } = trpc.properties.search.useQuery(queryInput);

  // Mutations
  const addFavoriteMutation = trpc.favorites.add.useMutation({
    onSuccess: () => toast.success('Added to favorites'),
    onError: () => toast.error('Failed to add to favorites'),
  });

  const saveSearchMutation = trpc.savedSearch.create.useMutation({
    onSuccess: () => {
      toast.success('Search saved successfully');
      setIsSaveSearchOpen(false);
      setSaveSearchName('');
    },
    onError: (error) => toast.error(error.message),
  });

  // Handlers
  const handleFilterChange = (newFilters: SearchFilters) => {
    // Update URL to reflect new filters
    const newUrl = generatePropertyUrl({
      ...filters,
      ...newFilters,
    });
    setLocation(newUrl);
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(0);
  };

  const handleRemoveFilter = (key: keyof SearchFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    handleFilterChange(newFilters);
  };

  const handleClearAllFilters = () => {
    // Keep only listing type and property type (in URL)
    const baseFilters: SearchFilters = {
      listingType: filters.listingType,
      propertyType: filters.propertyType,
      city: filters.city,
    };
    handleFilterChange(baseFilters);
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

  // Only show real properties - no mock data fallback
  const displayProperties = properties || [];
  
  
  // Sort properties (client-side for now)
  const sortedProperties = useMemo(() => {
    // Cast to any to handle mixed types (Real vs Mock) - temporary for visualization
    const propsToUse = displayProperties as any[];
    if (!propsToUse.length) return [];
    
    const sorted = [...propsToUse];
    switch (sortBy) {
      case 'price_asc':
        sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_desc':
        sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      default:
        // Keep original order 
        break;
    }
    return sorted;
  }, [displayProperties, sortBy]);

  const resultCount = displayProperties.length;

  const canonicalUrl = useMemo(() => generateCanonicalUrl(filters), [filters]);

  return (
    <div className="min-h-screen bg-slate-50">
      <MetaControl canonicalUrl={canonicalUrl} />
      <ListingNavbar defaultLocations={filters.locations || []} />

      <div className="container pt-24 pb-8">
        {/* Breadcrumbs */}
        <div className="mb-4">
          <Breadcrumbs items={breadcrumbs} />
        </div>

        {/* Results Header - Full Width */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <ResultsHeader
            filters={filters}
            resultCount={resultCount}
            isLoading={isLoading}
            viewMode={viewMode}
            sortBy={sortBy}
            onViewModeChange={setViewMode}
            onSortChange={setSortBy}
            onOpenFilters={() => setIsMobileFilterOpen(true)}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Main Content */}
          <div className="col-span-1 lg:col-span-9">

            {/* Active Filter Chips */}
            <div className="mt-4">
              <ActiveFilterChips
                filters={filters}
                onRemoveFilter={handleRemoveFilter}
                onClearAll={handleClearAllFilters}
              />
            </div>



            {/* Results */}
            <div className="mt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : sortedProperties.length > 0 ? (
                <>
                  {viewMode === 'list' && (
                    <div className="flex flex-col gap-4">
                      {sortedProperties.map((property) => {
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
                  )}

                  {viewMode === 'grid' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      {sortedProperties.map((property) => {
                        const normalized = normalizePropertyForUI(property);
                        if (!normalized) return null;
                        return (
                          <PropertyCard
                            key={normalized.id}
                            {...normalized}
                          />
                        );
                      })}
                    </div>
                  )}

                  {viewMode === 'map' && (
                    <GooglePropertyMap
                      properties={sortedProperties
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
                        window.location.href = `/property/${id}`;
                      }}
                      onBoundsChange={handleBoundsChange}
                    />
                  )}

                  {/* Pagination */}
                  {resultCount >= limit && (
                    <div className="flex justify-center items-center gap-4 mt-8">
                      <Button
                        variant="outline"
                        disabled={page === 0}
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {page + 1}
                      </span>
                      <Button
                        variant="outline"
                        disabled={resultCount < limit}
                        onClick={() => setPage(p => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Building2 className="h-16 w-16 text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">
                    No properties found
                  </h3>
                  <p className="text-slate-500 max-w-md mb-6">
                    Try adjusting your filters or search criteria to find more properties.
                  </p>
                  <Button variant="outline" onClick={handleClearAllFilters}>
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Filters - Desktop */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-24">
              <SidebarFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onSaveSearch={handleSaveSearch}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Controls (Persistent Bottom Bar) */}
      <MobileStickyControls 
        onOpenFilters={() => setIsMobileFilterOpen(true)}
        currentView={viewMode}
        onViewChange={setViewMode}
        onSortChange={setSortBy}
        currentSort={sortBy}
        resultCount={resultCount}
      />

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Save Search Dialog */}
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
              disabled={saveSearchMutation.isPending || !saveSearchName.trim()}
            >
              {saveSearchMutation.isPending ? 'Saving...' : 'Save Search'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
