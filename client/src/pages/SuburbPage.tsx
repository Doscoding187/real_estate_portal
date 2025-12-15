import { useRoute, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { LocationPageLayout } from '@/components/location/LocationPageLayout';
import { MonetizedBanner } from '@/components/location/MonetizedBanner';
import { SearchStage } from '@/components/location/SearchStage';
import { LocationPropertyTypeExplorer as PropertyTypeExplorer } from '@/components/location/LocationPropertyTypeExplorer';
// import { FeaturedListings } from '@/components/location/FeaturedListings'; // Removed
import { TabbedListingSection } from '@/components/location/TabbedListingSection';
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

export default function SuburbPage({ params }: { params: { province: string; city: string; suburb: string } }) {
  const [, navigate] = useLocation();
  const { province: provinceSlug, city: citySlug, suburb: suburbSlug } = params;

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
          <h1 className="text-2xl font-bold mb-2">Location Not Found</h1>
          <p className="text-slate-500">We couldn't find the suburb you're looking for.</p>
        </div>
      </div>
    );
  }

  const { suburb, listings, stats, subLocalities = [] } = data;

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

      <LocationPageLayout
        locationName={suburb.name}
        locationSlug={`${provinceSlug}/${citySlug}/${suburbSlug}`}
        
        banner={
          <MonetizedBanner
            locationType="suburb"
            locationId={suburb.id}
            locationName={suburb.name}
            defaultImage="https://images.unsplash.com/photo-1574362848149-11496d93a7c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1984&q=80"
            campaign={heroCampaign}
          />
        }

        searchStage={
          <SearchStage 
            locationName={suburb.name} 
            locationSlug={`${provinceSlug}/${citySlug}/${suburbSlug}`} 
            totalListings={stats.totalListings} 
          />
        }

        // Suburb Page Specific: Property Type Explorer is key for discovery
        propertyTypeExplorer={
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
        }

        buyerCTA={
            <div className="py-8 text-center bg-blue-50 rounded-lg mx-4 md:mx-0">
                <h3 className="text-xl font-bold mb-2">Looking for a home in {suburb.name}?</h3>
                <p className="mb-4 text-slate-600">Get alerts when new properties are listed.</p>
                <button className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">
                    Set Property Alert
                </button>
            </div>
        }

        // The core content for Suburb page is LISTINGS
        listingsFeed={
          <div className="space-y-12">
            {/* Sub-Localities Grid for region-type suburbs */}
            {subLocalities && subLocalities.length > 0 && (
              <div className="py-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-slate-900">Neighborhoods in {suburb.name}</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {subLocalities.map((loc: any) => (
                    <a
                      key={loc.slug}
                      href={`/${provinceSlug}/${citySlug}/${loc.slug}`}
                      className="rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group p-4"
                    >
                      <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {loc.name}
                      </h3>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 text-xs uppercase tracking-wide font-medium">Listings</span>
                        <span className="font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                          {loc.listingCount}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <TabbedListingSection
        title={`Homes in ${suburb.name}`}
        description={`Explore a variety of properties for sale in ${suburb.name}, from houses to apartments.`}
        tabs={[
          { label: 'All', value: 'all' },
          { label: 'Houses', value: 'house' },
          { label: 'Apartments', value: 'apartment' },
          { label: 'Townhouses', value: 'townhouse' },
          { label: 'Vacant Land', value: 'vacant_land' }, 
        ]}
        items={listings}
        renderItem={(item: any) => {
            const property = normalizePropertyForUI(item);
            if (!property) return null;
            return <PropertyCard {...property} />;
        }}
        filterItem={(item: any, tabValue: string) => {
            if (tabValue === 'all') return true;
            return item.propertyType === tabValue;
        }}
        viewAllLink={(tabValue) => `/properties?suburb=${suburb.name}${tabValue !== 'all' ? `&type=${tabValue}` : ''}`}
        viewAllText="View All"
        emptyMessage="No properties of this type currently listed."
      />

            <MarketInsights 
              stats={stats} 
              locationName={suburb.name} 
              type="suburb"
            />

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

        sidebarContent={
          <SEOTextBlock
            title={`Life in ${suburb.name}`}
            locationName={suburb.name}
            locationType="suburb"
            parentName={suburb.cityName || citySlug}
            stats={stats}
            content={suburb.description || undefined} 
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
