import { useRoute, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { LocationPageLayout } from '@/components/location/LocationPageLayout';
import { LocationHeroSection } from '@/components/location/LocationHeroSection';
import { SearchStage } from '@/components/location/SearchStage';
import { LocationPropertyTypeExplorer as PropertyTypeExplorer } from '@/components/location/LocationPropertyTypeExplorer';

import { DiscoverProperties } from '@/components/DiscoverProperties';
import { ExploreCities } from '@/components/ExploreCities';
import { PropertyCategories } from '@/components/PropertyCategories';
import { Building2 } from 'lucide-react';
// import { FeaturedListings } from '@/components/location/FeaturedListings'; // Removed
import { TabbedListingSection } from '@/components/location/TabbedListingSection';
import { SuburbInsights } from '@/components/property/SuburbInsights';

import PropertyCard from '@/components/PropertyCard';
import { normalizePropertyForUI } from '@/lib/normalizers';
import { MarketInsights } from '@/components/location/MarketInsights';
import { SEOTextBlock } from '@/components/location/SEOTextBlock';
import { FinalCTA } from '@/components/location/FinalCTA';
import { AmenitiesSection } from '@/components/location/AmenitiesSection';
import { InteractiveMap } from '@/components/location/InteractiveMap';
import { SimilarLocations } from '@/components/location/SimilarLocations';
import { Skeleton } from '@/components/ui/skeleton';
import { Helmet } from 'react-helmet';
import { LocationSchema } from '@/components/location/LocationSchema';
import { useSimilarLocations } from '@/hooks/useSimilarLocations';

import { MetaControl } from '@/components/seo/MetaControl';

import SearchResults from './SearchResults';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function SuburbPage({ params }: { params: { province: string; city: string; suburb: string; action?: string; locationId?: string } }) {
  const [location, navigate] = useLocation();
  const { province: provinceSlug, city: citySlug, suburb: suburbSlug, action, locationId } = params;

  // 2025 Architecture: Controller Logic
  // Render Transaction Page (SearchResults) if 'view=list' OR any search filters are present
  // Derive search params from location to ensure reactivity
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const hasSearchFilters = 
    searchParams.has('propertyType') || 
    searchParams.has('minPrice') || 
    searchParams.has('maxPrice') || 
    searchParams.has('bedrooms');
    
  const isTransactionMode = searchParams.get('view') === 'list' || hasSearchFilters;

  if (isTransactionMode) {
      return <SearchResults locationId={locationId} />;
  }

  // Restore data fetching
  const { data, isLoading, error } = trpc.locationPages.getSuburbData.useQuery({
    provinceSlug,
    citySlug,
    suburbSlug
  });

  // Fetch campaign for banner
  const { data: heroCampaign } = trpc.locationPages.getHeroCampaign.useQuery({ 
    locationSlug: `${provinceSlug}/${citySlug}/${suburbSlug}`,
    fallbacks: [`${provinceSlug}/${citySlug}`, provinceSlug] 
  });

  if (isLoading) {
    return <SuburbPageSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-fluid-h3 font-bold mb-2">Location Not Found</h1>
          <p className="text-slate-500">We couldn't find the suburb you're looking for.</p>
        </div>
      </div>
    );
  }

  const { suburb, listings, stats, subLocalities = [], insights, reviews } = data;

  return (
    <div className="min-h-screen bg-white">
      <MetaControl />
      <Helmet>
        <title>Properties for Sale in {suburb.name}, {suburb.cityName} | Real Estate Portal</title>
        <meta name="description" content={`Find the best homes in ${suburb.name}, ${suburb.cityName}. Search ${stats.totalListings} properties for sale and rent.`} />
        {/* Canonical handled by MetaControl */}
      </Helmet>

      <LocationSchema 
        type="Suburb"
        name={suburb.name}
        description={`Real estate in ${suburb.name}, ${suburb.cityName}`}
        url={`/${provinceSlug}/${citySlug}/${suburbSlug}`}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: suburb.provinceName || provinceSlug, url: `/${provinceSlug}` },
          { name: suburb.cityName || citySlug, url: `/${provinceSlug}/${citySlug}` },
          { name: suburb.name, url: `/${provinceSlug}/${citySlug}/${suburbSlug}` }
        ]}
        geo={{
          latitude: Number(suburb.latitude),
          longitude: Number(suburb.longitude)
        }}
        stats={stats}
        image="https://images.unsplash.com/photo-1574362848149-11496d93a7c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1984&q=80"
      />

      <LocationPageLayout
        locationName={suburb.name}
        locationSlug={`${provinceSlug}/${citySlug}/${suburbSlug}`}
        
        banner={
          <LocationHeroSection
            locationName={suburb.name}
            locationSlug={`${provinceSlug}/${citySlug}/${suburbSlug}`}
            locationType="suburb"
            locationId={suburb.id}
            backgroundImage="https://images.unsplash.com/photo-1574362848149-11496d93a7c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1984&q=80"
            listingCount={stats.totalListings}
            campaign={heroCampaign}
            quickLinks={subLocalities?.slice(0, 5).map((loc: any) => ({
              label: loc.name,
              path: `/${provinceSlug}/${citySlug}/${suburbSlug}/${loc.slug}`,
            })) || []}
          />
        }

        searchStage={null}

        // Suburb Page Specific: Property Type Explorer
        propertyTypeExplorer={<PropertyCategories preselectedLocation={{
            name: suburb.name,
            slug: suburbSlug,
            provinceSlug: `${provinceSlug}/${citySlug}`,
            type: 'suburb'
        }} />}

        popularLocations={
            subLocalities && subLocalities.length > 0 ? (
                <ExploreCities
                    title={`Neighborhoods in ${suburb.name}`}
                    description={`Explore popular residential areas and neighborhoods within ${suburb.name}.`}
                    customLocations={subLocalities.map((loc: any) => ({
                        name: loc.name,
                        province: `${loc.listingCount} Listings`,
                        icon: Building2,
                        slug: loc.slug,
                        provinceSlug: `${provinceSlug}/${citySlug}`,
                        color: 'from-blue-500 to-indigo-500',
                        featured: false
                    }))}
                />
            ) : undefined
        }

        buyerCTA={
            <div className="py-8 text-center bg-blue-50 rounded-lg mx-4 md:mx-0">
                <h3 className="text-fluid-h4 font-bold mb-2">Looking for a home in {suburb.name}?</h3>
                <p className="mb-4 text-slate-600">Get alerts when new properties are listed.</p>
                <button className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">
                    Set Property Alert
                </button>
            </div>
        }

        // The core content for Suburb page is LISTINGS
        listingsFeed={
          <div className="space-y-12">
            {/* Sub-Localities Grid - moved to popularLocations for full width */}

            {/* Properties Preview Section (Transaction Intent Launcher) */}
            <div className="py-fluid-xl bg-white">
              <div className="container">
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h2 className="text-fluid-h2 font-bold mb-3">Homes in {suburb.name}</h2>
                    <p className="text-muted-foreground text-base max-w-2xl">
                      Browse a selection of properties for sale in {suburb.name}. 
                    </p>
                  </div>
                  <Link href={`/property-for-sale/${provinceSlug}/${citySlug}/${suburbSlug}?view=list`}>
                    <Button variant="outline" className="hidden md:flex gap-2">
                      View all properties <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {listings.slice(0, 8).map((item: any, index: number) => {
                      const property = normalizePropertyForUI(item);
                      if (!property) return null;
                      return <PropertyCard key={index} {...property} />;
                  })}
                </div>

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
                <h2 className="text-fluid-h2 font-bold mb-6">Explore {suburb.name} on the Map</h2>
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
