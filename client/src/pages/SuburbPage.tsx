import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { HeroLocation } from '@/components/location/HeroLocation';
import { SearchRefinementBar } from '@/components/location/SearchRefinementBar';
import { LocationPropertyTypeExplorer as PropertyTypeExplorer } from '@/components/location/LocationPropertyTypeExplorer';
import { FeaturedListings } from '@/components/location/FeaturedListings';
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

export default function SuburbPage({ params }: { params: { province: string; city: string; suburb: string } }) {
  const [, navigate] = useLocation();
  const { province: provinceSlug, city: citySlug, suburb: suburbSlug } = params;

  const { data, isLoading, error } = trpc.locationPages.getSuburbData.useQuery({
    provinceSlug,
    citySlug,
    suburbSlug
  });

  if (isLoading) {
    return <SuburbPageSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Location Not Found</h1>
          <p className="text-slate-500">We couldn't find the suburb you're looking for.</p>
        </div>
      </div>
    );
  }

  const { suburb, listings, stats } = data;

  const handleSearch = (filters: any) => {
    navigate(`/properties?suburb=${suburb.name}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Properties for Sale in {suburb.name}, {suburb.cityName} | Real Estate Portal</title>
        <meta name="description" content={`Find the best homes in ${suburb.name}, ${suburb.cityName}. Search ${stats.totalListings} properties for sale and rent.`} />
        <link rel="canonical" href={`https://propertylistify.com/${provinceSlug}/${citySlug}/${suburbSlug}`} />
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

      <HeroLocation
        title={suburb.name}
        subtitle={`${suburb.name} is a sought-after neighborhood in ${suburb.cityName}, ${suburb.provinceName}.`}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: suburb.provinceName || provinceSlug, href: `/${provinceSlug}` },
          { label: suburb.cityName || citySlug, href: `/${provinceSlug}/${citySlug}` },
          { label: suburb.name, href: `/${provinceSlug}/${citySlug}/${suburbSlug}` }
        ]}
        stats={stats}
        backgroundImage="https://images.unsplash.com/photo-1574362848149-11496d93a7c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1984&q=80"
        placeId={suburb.place_id}
        coordinates={{
          latitude: Number(suburb.latitude),
          longitude: Number(suburb.longitude)
        }}
      />

      <SearchRefinementBar 
        onSearch={handleSearch} 
        defaultLocation={suburb.name}
        placeId={suburb.place_id}
      />

      {/* Property Type Explorer */}
      {/* TODO: Add propertyTypeBreakdown to backend stats */}
      <PropertyTypeExplorer
        propertyTypes={[
          { type: 'house', count: Math.floor(stats.totalListings * 0.4), avgPrice: stats.avgPrice * 1.2 },
          { type: 'apartment', count: Math.floor(stats.totalListings * 0.35), avgPrice: stats.avgPrice * 0.8 },
          { type: 'townhouse', count: Math.floor(stats.totalListings * 0.15), avgPrice: stats.avgPrice * 0.9 },
          { type: 'villa', count: Math.floor(stats.totalListings * 0.1), avgPrice: stats.avgPrice * 1.5 },
        ]}
        locationName={suburb.name}
        locationSlug={suburbSlug}
        placeId={suburb.place_id}
      />

      <FeaturedListings 
        listings={listings} 
        title={`Homes in ${suburb.name}`}
        subtitle="Recently listed properties"
        viewAllLink={`/properties?suburb=${suburb.name}`}
      />

      <MarketInsights 
        stats={stats} 
        locationName={suburb.name} 
        type="suburb"
      />

      {/* Interactive Map Section */}
      {suburb.latitude && suburb.longitude && (
        <div className="container py-12">
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

      <AmenitiesSection />

      <SEOTextBlock
        title={`Life in ${suburb.name}`}
        locationName={suburb.name}
        locationType="suburb"
        parentName={suburb.cityName || citySlug}
        stats={stats}
        content={suburb.description || undefined} 
      />

      {/* Similar Locations Section */}
      {suburb.id && (
        <div className="container py-12">
          <SimilarLocationsSection locationId={suburb.id} currentLocationName={suburb.name} />
        </div>
      )}

      <FinalCTA 
        locationName={suburb.name}
        provinceSlug={provinceSlug}
        citySlug={citySlug}
        suburbSlug={suburbSlug}
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
