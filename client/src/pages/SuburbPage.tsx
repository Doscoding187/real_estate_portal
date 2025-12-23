import { useRoute, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { LocationPageLayout } from '@/components/location/LocationPageLayout';
import { MonetizedBanner } from '@/components/location/MonetizedBanner';
import { SearchStage } from '@/components/location/SearchStage';
import { LocationPropertyTypeExplorer as PropertyTypeExplorer } from '@/components/location/LocationPropertyTypeExplorer';

import { DiscoverProperties } from '@/components/DiscoverProperties';
import { ExploreCities } from '@/components/ExploreCities';
import { PropertyCategories } from '@/components/PropertyCategories';
import { Building2 } from 'lucide-react';
// import { FeaturedListings } from '@/components/location/FeaturedListings'; // Removed
import { TabbedListingSection } from '@/components/location/TabbedListingSection';
import { SuburbInsights } from '@/components/property/SuburbInsights';

// ... (existing imports)

    );
  }

  const { suburb, listings, stats, subLocalities = [], insights, reviews } = data;

  return (
    <div className="min-h-screen bg-white">
      {/* ... (existing jsx) */}
      
                <div className="mt-8 text-center md:hidden">
                   <Link href={`/property-for-sale/${provinceSlug}/${citySlug}/${suburbSlug}?view=list`}>
                    <Button variant="outline" className="w-full gap-2">
                      View all properties <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            <MarketInsights 
              stats={stats} 
              locationName={suburb.name} 
              type="suburb"
            />
            
            <div className="container py-8">
              <SuburbInsights 
                suburbId={suburb.id}
                suburbName={suburb.name}
                pros={insights?.pros}
                cons={insights?.cons}
                reviews={reviews}
                rating={4.8} // TODO: Calculate actual average rating
              />
            </div>

            {/* Interactive Map Section */}
            {suburb.latitude && suburb.longitude && (
              <div className="py-4">
                <h2 className="text-2xl font-bold mb-6">Explore {suburb.name} on the Map</h2>
                <InteractiveMap
                  center={{
                    lat: Number(suburb.latitude),
                    lng: Number(suburb.longitude),
                  }}
                  viewport={suburb.viewport_ne_lat ? {
                    ne_lat: Number(suburb.viewport_ne_lat),
                    ne_lng: Number(suburb.viewport_ne_lng),
                    sw_lat: Number(suburb.viewport_sw_lat),
                    sw_lng: Number(suburb.viewport_sw_lng),
                  } : undefined}
                  properties={listings.map((listing: any) => ({
                    id: listing.id,
                    latitude: Number(listing.latitude),
                    longitude: Number(listing.longitude),
                    title: listing.title,
                    price: listing.price,
                  }))}
                />
              </div>
            )}

            <AmenitiesSection 
              location={{
                latitude: Number(suburb.latitude),
                longitude: Number(suburb.longitude)
              }} 
            />

            {/* Similar Locations Section */}
            {suburb.id && (
                <SimilarLocationsSection locationId={suburb.id} currentLocationName={suburb.name} />
            )}
          </div>
        }



        exploreMore={
            <DiscoverProperties 
                initialCity={suburb.cityName} 
                locationName={suburb.name}
            />
        }

        finalCTA={
          <FinalCTA 
            locationName={suburb.name}
            provinceSlug={provinceSlug}
            citySlug={citySlug}
            suburbSlug={suburbSlug}
          />
        }
      />
    </div>
  );
}

function SimilarLocationsSection({ locationId, currentLocationName }: { locationId: number; currentLocationName: string }) {
  const { data: similarLocations, isLoading } = useSimilarLocations({ locationId, limit: 5 });

  return (
    <SimilarLocations
      locations={similarLocations || []}
      currentLocationName={currentLocationName}
      isLoading={isLoading}
    />
  );
}

function SuburbPageSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="h-[400px] bg-slate-200 animate-pulse" />
      <div className="container py-8 space-y-8">
        <Skeleton className="h-12 w-full max-w-2xl" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}
