import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { HeroBillboard } from '@/components/location/HeroBillboard';
import { HeroBillboardAd } from '@/components/location/HeroBillboardAd';
import { SearchRefinementBar } from '@/components/location/SearchRefinementBar';
import { LocationGrid } from '@/components/location/LocationGrid';
import { DevelopmentsSlider } from '@/components/location/DevelopmentsSlider';
import { MarketInsights } from '@/components/location/MarketInsights';
import { SEOTextBlock } from '@/components/location/SEOTextBlock';
import { FinalCTA } from '@/components/location/FinalCTA';
import { FeaturedListings } from '@/components/location/FeaturedListings';
import { AmenitiesSection } from '@/components/location/AmenitiesSection';
import { InteractiveMap } from '@/components/location/InteractiveMap';
import { SimilarLocations } from '@/components/location/SimilarLocations';
import { Skeleton } from '@/components/ui/skeleton';
import { Helmet } from 'react-helmet';
import { LocationSchema } from '@/components/location/LocationSchema';
import { useSimilarLocations } from '@/hooks/useSimilarLocations';
import { FeaturedDevelopers } from '@/components/location/FeaturedDevelopers';
import { RecommendedAgents } from '@/components/location/RecommendedAgents';

export default function CityPage({ params }: { params: { province: string; city: string } }) {
  const [, navigate] = useLocation();
  const { province: provinceSlug, city: citySlug } = params;

  const { data, isLoading, error } = trpc.locationPages.getCityData.useQuery({
    provinceSlug,
    citySlug
  });

  if (isLoading) {
    return <CityPageSkeleton />;
  }

  if (error || !data) {
    if (error) {
      console.error("[CityPage] Error loading data:", error);
    } else {
      console.warn("[CityPage] No data returned for:", { provinceSlug, citySlug });
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Location Not Found</h1>
          <p className="text-slate-500">We couldn't find the city you're looking for.</p>
          {error && <p className="text-red-500 text-sm mt-2">{error.message}</p>}
        </div>
      </div>
    );
  }

  // Defensively destructure with fallbacks
  const { 
    city, 
    suburbs = [], 
    featuredProperties = [], 
    developments = [], 
    stats = { totalListings: 0, avgPrice: 0, minPrice: 0, maxPrice: 0, rentalCount: 0, saleCount: 0 }
  } = data || {};

  // Additional validation - city must exist
  if (!city || !city.name) {
    console.error("[CityPage] City data is incomplete:", data);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">City Data Unavailable</h1>
          <p className="text-slate-500">The city data is temporarily unavailable. Please try again later.</p>
        </div>
      </div>
    );
  }

  const handleSearch = (filters: any) => {
    navigate(`/properties?province=${provinceSlug}&city=${city.name}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Property for Sale in {city.name}, {city.provinceName} | Real Estate Portal</title>
        <meta name="description" content={`Find properties in ${city.name}, ${city.provinceName}. Search ${stats.totalListings} listings including houses, flats, and new developments.`} />
        <link rel="canonical" href={`https://propertylistify.com/${provinceSlug}/${citySlug}`} />
      </Helmet>

      <LocationSchema 
        type="City"
        name={city.name}
        description={`Properties for sale in ${city.name}`}
        url={`/${provinceSlug}/${citySlug}`}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: city.provinceName || provinceSlug, url: `/${provinceSlug}` },
          { name: city.name, url: `/${provinceSlug}/${citySlug}` }
        ]}
        geo={{
          latitude: Number(city.latitude),
          longitude: Number(city.longitude)
        }}
        stats={stats}
        image="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
      />

      {/* CMS-Driven Hero Campaign Banner */}
      <HeroBillboardAd 
        locationSlug={`${provinceSlug}/${citySlug}`} 
        fallbacks={[provinceSlug]} 
      />

      <HeroBillboard
        locationType="city"
        locationId={city.id}
        defaultTitle={city.name}
        defaultSubtitle={`Explore ${city.name}'s best real estate investment opportunities.`}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: city.provinceName || provinceSlug, href: `/${provinceSlug}` },
          { label: city.name, href: `/${provinceSlug}/${citySlug}` }
        ]}
        stats={stats}
        defaultImage="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
        placeId={city.place_id}
      />

      <SearchRefinementBar 
        onSearch={handleSearch} 
        defaultLocation={city.name}
        placeId={city.place_id}
      />

      {/* Empty State - Show when city exists but has no properties */}
      {stats.totalListings === 0 ? (
        <div className="container py-20">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-6">
              <svg
                className="mx-auto h-24 w-24 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              No Properties Yet in {city.name}
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Be the first to list a property in this vibrant city! Properties added here will automatically appear on this page.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate('/list-property')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                List Your Property
              </button>
              <button
                onClick={() => navigate('/properties')}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Browse All Properties
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <LocationGrid 
            title={`Popular Suburbs in ${city.name}`} 
            items={suburbs} 
            parentSlug={`${provinceSlug}/${citySlug}`}
            type="suburb"
          />

          <FeaturedListings 
            listings={featuredProperties} 
            title={`Featured Properties in ${city.name}`}
            subtitle="Handpicked properties just for you"
            viewAllLink={`/properties?city=${city.name}`}
          />

          <DevelopmentsSlider 
            developments={developments as any[]} 
            locationName={city.name} 
          />

          <FeaturedDevelopers 
            locationType="city" 
            locationId={city.id} 
            locationName={city.name} 
          />

          <RecommendedAgents 
            locationType="city" 
            locationId={city.id} 
          />

          <MarketInsights 
            stats={stats} 
            locationName={city.name} 
            type="city"
          />
        </>
      )}

      {/* Interactive Map Section */}
      {city.latitude && city.longitude && (
        <div className="container py-12">
          <h2 className="text-2xl font-bold mb-6">Explore {city.name} on the Map</h2>
          <InteractiveMap
            center={{
              lat: Number(city.latitude),
              lng: Number(city.longitude),
            }}
            viewport={city.viewport_ne_lat ? {
              ne_lat: Number(city.viewport_ne_lat),
              ne_lng: Number(city.viewport_ne_lng),
              sw_lat: Number(city.viewport_sw_lat),
              sw_lng: Number(city.viewport_sw_lng),
            } : undefined}
            properties={featuredProperties
              .filter((listing: any) => listing && listing.latitude && listing.longitude)
              .map((listing: any) => ({
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
          latitude: Number(city.latitude),
          longitude: Number(city.longitude)
        }} 
      />

      <SEOTextBlock
        title={`Living in ${city.name}`}
        locationName={city.name}
        locationType="city"
        parentName={city.provinceName || provinceSlug}
        stats={stats}
        content={city.description || undefined}
      />

      {/* Similar Locations Section */}
      {city.id && (
        <div className="container py-12">
          <SimilarLocationsSection locationId={city.id} currentLocationName={city.name} />
        </div>
      )}

      <FinalCTA 
        locationName={city.name}
        provinceSlug={provinceSlug}
        citySlug={citySlug}
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

function CityPageSkeleton() {
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
