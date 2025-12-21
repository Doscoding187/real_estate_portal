import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { DevelopmentCard } from '@/components/DevelopmentCard';
import { ListingNavbar } from '@/components/ListingNavbar';
import { SidebarFilters } from '@/components/SidebarFilters';
import { SearchFilters } from '@/components/SearchBar';
import { Button } from '@/components/ui/button';
import { List, Building2, Loader2 } from 'lucide-react';
import { MetaControl } from '@/components/seo/MetaControl';
import { generateCanonicalUrl } from '@/lib/urlUtils';

export default function DevelopmentsDemo() {
  const [filters, setFilters] = useState<SearchFilters>({});
  
  // Fetch real developments
  const { data: developments, isLoading } = trpc.developer.listPublicDevelopments.useQuery({ limit: 20 });

  const handleFilterChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    // In a real app, this would trigger a refetch or filter the list
    console.log('Filters updated:', newFilters);
  };

  // Safe JSON parse helper
  const parseImages = (imagesVal: any): string[] => {
      if (!imagesVal) return [];
      if (Array.isArray(imagesVal)) return imagesVal;
      try {
          const parsed = JSON.parse(imagesVal);
          return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
          return [];
      }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <MetaControl />
      <ListingNavbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Sidebar Filters - Hidden on mobile, visible on large screens */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-24">
              <SidebarFilters filters={filters} onFilterChange={handleFilterChange} />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="col-span-1 lg:col-span-9">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {developments ? developments.length : 0} New Developments Found
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Discover the latest residential developments and off-plan properties
                </p>
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

            {/* Developments Grid */}
            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : developments && developments.length > 0 ? (
              <div className="flex flex-col gap-6">
                {developments.map((dev) => {
                    const images = parseImages(dev.images);
                    return (
                      <DevelopmentCard 
                        key={dev.id} 
                        id={dev.slug || String(dev.id)}
                        title={dev.name}
                        rating={Number(dev.rating) || 0}
                        location={`${dev.suburb ? dev.suburb + ', ' : ''}${dev.city}`}
                        description={dev.description || ''}
                        image={images[0] || ''}
                        unitTypes={dev.unitTypes}
                        highlights={(dev.highlights as string[]) || []}
                        developer={{
                            name: dev.developerName || 'Unknown Developer',
                            isFeatured: !!dev.developerIsFeatured
                        }}
                        imageCount={images.length}
                        isFeatured={!!dev.isFeatured}
                        isNewBooking={false} // Default for now
                      />
                    );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Building2 className="h-16 w-16 text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                  No developments found
                </h3>
                <p className="text-slate-500 max-w-md">
                  Try adjusting your filters or search criteria to find more developments.
                </p>
              </div>
            )}
            

          </div>
        </div>
      </div>
    </div>
  );
}
