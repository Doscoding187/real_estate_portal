import { useRoute, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { LocationPageLayout } from '@/components/location/LocationPageLayout';
import { MonetizedBanner } from '@/components/location/MonetizedBanner';
import { SearchStage } from '@/components/location/SearchStage';
import { FeaturedPropertiesCarousel } from '@/components/location/FeaturedPropertiesCarousel';
import { LocationGrid } from '@/components/location/LocationGrid';
// import { DevelopmentsSlider } from '@/components/location/DevelopmentsSlider'; // Removed
import { TabbedListingSection } from '@/components/location/TabbedListingSection';
import { SimpleDevelopmentCard } from '@/components/SimpleDevelopmentCard';
import { MarketInsights } from '@/components/location/MarketInsights';
import { SEOTextBlock } from '@/components/location/SEOTextBlock';
import { FinalCTA } from '@/components/location/FinalCTA';
import { AmenitiesSection } from '@/components/location/AmenitiesSection';
import { InteractiveMap } from '@/components/location/InteractiveMap';
import { Skeleton } from '@/components/ui/skeleton';
import { Helmet } from 'react-helmet';
import { LocationSchema } from '@/components/location/LocationSchema';

export default function ProvincePage({ params }: { params: { province: string } }) {
  const [, navigate] = useLocation();
  const provinceSlug = params.province;

  const { data, isLoading, error } = trpc.locationPages.getProvinceData.useQuery({
    provinceSlug
  });

  // Fetch campaign for banner
  const { data: heroCampaign } = trpc.locationPages.getHeroCampaign.useQuery({ 
    locationSlug: provinceSlug,
    fallbacks: [] 
  });

  if (isLoading) {
    return <ProvincePageSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Location Not Found</h1>
          <p className="text-slate-500">We couldn't find the province you're looking for.</p>
        </div>
      </div>
    );
  }

  const { province, cities, featuredDevelopments, trendingSuburbs, stats } = data;

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Property for Sale in {province.name} | Real Estate Portal</title>
        <meta name="description" content={`Find the best properties for sale in ${province.name}. Browse ${stats.totalListings} listings, including houses, apartments, and developments.`} />
        <link rel="canonical" href={`https://propertylistify.com/${provinceSlug}`} />
      </Helmet>

      <LocationSchema 
        type="Province"
        name={province.name}
        description={`Real estate in ${province.name}`}
        url={`/${provinceSlug}`}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: province.name, url: `/${provinceSlug}` }
        ]}
        stats={stats}
        image="https://images.unsplash.com/photo-1577931767667-0c58e744d081?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
        geo={province.latitude && province.longitude ? {
          latitude: Number(province.latitude),
          longitude: Number(province.longitude)
        } : undefined}
      />

      <LocationPageLayout
        locationName={province.name}
        locationSlug={provinceSlug}
        
        banner={
          <MonetizedBanner
            locationType="province"
            locationId={province.id}
            locationName={province.name}
            defaultImage="https://images.unsplash.com/photo-1577931767667-0c58e744d081?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
            campaign={heroCampaign}
          />
        }

        searchStage={
          <SearchStage 
            locationName={province.name} 
            locationSlug={provinceSlug} 
            totalListings={stats.totalListings} 
          />
        }

        featuredProperties={
          <FeaturedPropertiesCarousel 
            locationId={province.id} 
            locationName={province.name} 
            locationScope="province" 
          />
        }

        // Section 6: Hot Selling Developments (Tabbed by City)
        highDemandDevelopments={
          featuredDevelopments && featuredDevelopments.length > 0 ? (
            <TabbedListingSection
              title={`Hot Selling Developments in ${province.name}`}
              description={`Discover popular residential developments across top cities in ${province.name}.`}
              tabs={cities.map((city: any) => ({ label: city.name, value: city.slug }))}
              items={featuredDevelopments}
              renderItem={(dev: any) => (
                <SimpleDevelopmentCard
                  id={dev.id.toString()}
                  title={dev.title}
                  city={dev.cityName || province.name}
                  priceRange={{ 
                    min: Number(dev.priceFrom), 
                    max: Number(dev.priceTo) || Number(dev.priceFrom) 
                  }}
                  image={dev.image || dev.images?.[0] || "https://placehold.co/600x400/e2e8f0/64748b?text=Development"}
                  isHotSelling={true}
                />
              )}
              filterItem={(dev: any, citySlug: string) => dev.citySlug === citySlug}
              viewAllLink={(citySlug) => `/${provinceSlug}/${citySlug}`}
              viewAllText="Explore Developments in"
              emptyMessage="No featured developments in this city right now."
            />
          ) : undefined
        }

        buyerCTA={
          <div className="py-8 text-center bg-blue-50 rounded-lg mx-4 md:mx-0">
            <h3 className="text-xl font-bold mb-2">Looking for property in {province.name}?</h3>
            <p className="mb-4 text-slate-600">Get alerts for new properties matching your criteria.</p>
            <button className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">
              Set Property Alert
            </button>
          </div>
        }

        listingsFeed={
          <div className="space-y-12">
            {/* Cities Grid */}
            <LocationGrid 
              title={`Popular Cities in ${province.name}`} 
              items={cities} 
              parentSlug={provinceSlug}
              type="city"
            />

            {/* Trending Suburbs */}
            {trendingSuburbs && trendingSuburbs.length > 0 && (
              <div className="bg-slate-50 -mx-4 md:-mx-8 px-4 md:px-8 py-12">
                <h2 className="text-2xl font-bold mb-8">Trending Suburbs in {province.name}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {trendingSuburbs.map((suburb: any) => (
                    <a 
                      key={suburb.id} 
                      href={`/${provinceSlug}/${suburb.citySlug}/${suburb.slug}`}
                      className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow cursor-pointer border-slate-200 group p-4"
                    >
                      <h3 className="font-semibold text-slate-800 mb-1 group-hover:text-primary transition-colors">
                        {suburb.name}
                      </h3>
                      <p className="text-xs text-slate-500 mb-2">{suburb.cityName}</p>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Listings</span>
                        <span className="font-medium text-slate-700">{suburb.listingCount || 0}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive Map */}
            {province.latitude && province.longitude && (
              <div className="py-4">
                <h2 className="text-2xl font-bold mb-6">Explore {province.name} on the Map</h2>
                <InteractiveMap
                  center={{
                    lat: Number(province.latitude),
                    lng: Number(province.longitude),
                  }}
                  viewport={province.viewport_ne_lat ? {
                    ne_lat: Number(province.viewport_ne_lat),
                    ne_lng: Number(province.viewport_ne_lng),
                    sw_lat: Number(province.viewport_sw_lat),
                    sw_lng: Number(province.viewport_sw_lng),
                  } : undefined}
                />
              </div>
            )}

            {/* Amenities Section */}
            <AmenitiesSection 
              location={{
                latitude: Number(province.latitude),
                longitude: Number(province.longitude)
              }} 
            />
          </div>
        }

        sidebarContent={
          <SEOTextBlock
            title={`About Real Estate in ${province.name}`}
            locationName={province.name}
            locationType="province"
            stats={stats}
            content={province.description || undefined}
          />
        }

        finalCTA={
          <FinalCTA 
            locationName={province.name}
            provinceSlug={provinceSlug}
          />
        }
      />
    </div>
  );
}

function ProvincePageSkeleton() {
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
