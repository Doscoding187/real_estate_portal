import { useLocation } from 'wouter';
import { MetaControl } from '@/components/seo/MetaControl';
import { trpc } from '@/lib/trpc';
import { LocationPageLayout } from '@/components/location/LocationPageLayout';
import { LocationHeroSection } from '@/components/location/LocationHeroSection';
import { SearchStage } from '@/components/location/SearchStage';
import { FeaturedPropertiesCarousel } from '@/components/location/FeaturedPropertiesCarousel';

import { LocationPropertyTypeExplorer } from '@/components/location/LocationPropertyTypeExplorer';
import { DiscoverProperties } from '@/components/DiscoverProperties';
import { ExploreCities } from '@/components/ExploreCities';
import { PropertyCategories } from '@/components/PropertyCategories';
// EnhancedHero not needed - using LocationHeroSection for location pages


// Legacy components to be adapted or routed
import { LocationGrid } from '@/components/location/LocationGrid';
// import { DevelopmentsSlider } from '@/components/location/DevelopmentsSlider'; // Removed
import { TabbedListingSection } from '@/components/location/TabbedListingSection';
import { SimpleDevelopmentCard } from '@/components/SimpleDevelopmentCard';
import { MarketInsights } from '@/components/location/MarketInsights';
import { SEOTextBlock } from '@/components/location/SEOTextBlock';
import { FinalCTA } from '@/components/location/FinalCTA';
import { AmenitiesSection } from '@/components/location/AmenitiesSection';
import { InteractiveMap } from '@/components/location/InteractiveMap';
import { SimilarLocations } from '@/components/location/SimilarLocations';
import { Skeleton } from '@/components/ui/skeleton';
import { LocationSchema } from '@/components/location/LocationSchema';
import { useSimilarLocations } from '@/hooks/useSimilarLocations';
import { FeaturedDevelopers } from '@/components/location/FeaturedDevelopers';
import { RecommendedAgents } from '@/components/location/RecommendedAgents';
import { TopDevelopersCarousel } from '@/components/location/TopDevelopersCarousel';
import { HighDemandProjectsCarousel } from '@/components/location/HighDemandProjectsCarousel';
import { RecommendedAgenciesCarousel } from '@/components/location/RecommendedAgenciesCarousel';
import { LocationTopLocalities } from '@/components/location/LocationTopLocalities';

import SearchResults from './SearchResults';

export default function CityPage({ params }: { params: { province: string; city: string } }) {
  const [location, navigate] = useLocation();
  const { province: provinceSlug, city: citySlug } = params;

  // 2025 Architecture: Controller Logic (Transaction Mode)
  // Derive search params from location to ensure reactivity
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const hasSearchFilters = 
    searchParams.has('propertyType') || 
    searchParams.has('minPrice') || 
    searchParams.has('maxPrice') || 
    searchParams.has('bedrooms');

  const isTransactionMode = searchParams.get('view') === 'list' || hasSearchFilters;

  // DEBUG: Log mode detection
  console.log('🏙️ [CityPage] location:', location);
  console.log('🏙️ [CityPage] hasSearchFilters:', hasSearchFilters);
  console.log('🏙️ [CityPage] isTransactionMode:', isTransactionMode);

  if (isTransactionMode) {
      console.log('🏙️ [CityPage] Rendering SearchResults');
      return <SearchResults province={provinceSlug} city={citySlug} />;
  }

  // Restore data fetching
  const { data, isLoading, error } = trpc.locationPages.getCityData.useQuery({
    provinceSlug,
    citySlug
  });

  // Fetch campaign for banner
  const { data: heroCampaign } = trpc.locationPages.getHeroCampaign.useQuery({ 
    locationSlug: `${provinceSlug}/${citySlug}`,
    fallbacks: [provinceSlug] 
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
        <div className="text-left">
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
    stats = { totalListings: 0, avgPrice: 0, minPrice: 0, maxPrice: 0, rentalCount: 0, saleCount: 0 },
    propertyTypes = [],
    topLocalities = [],
    topDevelopers = [],
    investmentProjects = [],
    recommendedAgencies = [],

  } = data || {};

  // Additional validation - city must exist
  if (!city || !city.name) {
    console.error("[CityPage] City data is incomplete:", data);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-left">
          <h1 className="text-2xl font-bold mb-2">City Data Unavailable</h1>
          <p className="text-slate-500">The city data is temporarily unavailable. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <MetaControl />
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

      <LocationPageLayout
        locationName={city.name}
        locationSlug={`${provinceSlug}/${citySlug}`}
        
        banner={
          <LocationHeroSection
            locationName={city.name}
            locationSlug={`${provinceSlug}/${citySlug}`}
            locationType="city"
            locationId={city.id}
            backgroundImage="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
            listingCount={stats.totalListings}
            campaign={heroCampaign}
            quickLinks={suburbs?.slice(0, 5).map((suburb: any) => ({
              label: suburb.name,
              path: `/${provinceSlug}/${citySlug}/${suburb.slug}`,
            })) || []}
          />
        }

        searchStage={null}

        featuredProperties={
          <FeaturedPropertiesCarousel 
            locationId={city.id} 
            locationName={city.name} 
            locationScope="city" 
          />
        }

        // Section 6: Property Type Explorer
        // Section 6: Property Type Explorer
        propertyTypeExplorer={<PropertyCategories preselectedLocation={{
            name: city.name,
            slug: citySlug,
            provinceSlug: provinceSlug,
            type: 'city'
        }} />}

        // Section 7: Top Localities / Market Insights
        topLocalities={
             <LocationTopLocalities 
                locationName={city.name} 
                localities={(topLocalities as any[]).map(l => ({...l, imageUrl: null}))}
                parentSlug={`${provinceSlug}/${citySlug}`}
             />
        }

        topLocalitiesShowcase={
           topLocalities && topLocalities.length > 0 ? (
             <LocationTopLocalities 
               localities={topLocalities} 
               locationName={city.name} 
             />
           ) : undefined
        }

        highDemandDevelopments={
          developments && developments.length > 0 && suburbs && suburbs.length > 0 ? (
            <TabbedListingSection
              title={`Hot Selling Developments in ${city.name}`}
              description={`Discover popular residential developments across top suburbs in ${city.name}.`}
              // Section 6: Removed filtering tabs to prevent discovery-layer filtering
              // Showing all developments or using a simpler carousel would be better, 
              // but for now keeping layout but strictly linking to SRPs
              tabs={suburbs.map((suburb: any) => ({ label: suburb.name, value: suburb.name }))}
              items={developments}
              renderItem={(dev: any) => (
                <SimpleDevelopmentCard
                  id={dev.id.toString()}
                  title={dev.title || dev.name}
                  city={dev.suburb || city.name}
                  priceRange={{ 
                    min: Number(dev.priceFrom), 
                    max: Number(dev.priceTo) || Number(dev.priceFrom) 
                  }}
                  image={dev.image || dev.images?.[0] || dev.mainImage || "https://placehold.co/600x400/e2e8f0/64748b?text=Development"}
                  isHotSelling={true}
                />
              )}
              filterItem={(dev: any, suburbName: string) => dev.suburb === suburbName}
              // CRITICAL: Suburb Link -> SRP (Transaction Mode)
              viewAllLink={(suburbName) => `/property-for-sale/${provinceSlug}/${citySlug}/${suburbs.find((s:any) => s.name === suburbName)?.slug || ''}?view=list`}
              viewAllText="View properties in"
              emptyMessage="No featured developments in this suburb right now."
            />
          ) : undefined
        }

        popularLocations={
            <ExploreCities 
                // CRITICAL: Suburb Link -> SRP
                // Override Base Path to point to Transaction Root
                basePath="/property-for-sale"
                queryParams="?view=list"
                customLocations={suburbs.map((suburb: any) => ({
                    name: suburb.name,
                    province: city.name,
                    icon: MapPin,
                    slug: suburb.slug,
                    provinceSlug: `${provinceSlug}/${citySlug}`, 
                    color: 'from-blue-500 to-indigo-500'
                }))}
                title={`Popular Suburbs in ${city.name}`}
                description={`Explore top-rated suburbs in ${city.name}, offering a mix of investment opportunities and dream homes.`}
            />
        }

        recommendedAgents={
            <RecommendedAgents 
                locationType="city" 
                locationId={city.id} 
            />
        }

        developerShowcase={
          topDevelopers && topDevelopers.length > 0 ? (
            <TopDevelopersCarousel 
              developers={topDevelopers} 
              locationName={city.name} 
            />
          ) : (
            <FeaturedDevelopers 
                locationType="city" 
                locationId={city.id} 
                locationName={city.name} 
            />
          )
        }

        investmentShowcase={
          investmentProjects && investmentProjects.length > 0 ? (
            <HighDemandProjectsCarousel 
              projects={investmentProjects} 
              locationName={city.name} 
            />
          ) : undefined
        }

        agencyShowcase={
          recommendedAgencies && recommendedAgencies.length > 0 ? (
            <RecommendedAgenciesCarousel 
              agencies={recommendedAgencies} 
              locationName={city.name} 
            />
          ) : undefined
        }

        exploreMore={
            <DiscoverProperties 
                initialCity={city.name} 
                availableCities={[city.name, ...suburbs.map((s: any) => s.name)]}
                locationName={city.name}
            />
        }

        buyerCTA={
            // Temporary simple CTA until Phase 3 specific component
            <div className="py-8 text-left bg-blue-50 rounded-lg mx-4 md:mx-0">
                <h3 className="text-xl font-bold mb-2">Looking for a new home in {city.name}?</h3>
                <p className="mb-4 text-slate-600">Get alerts for new properties matching your criteria.</p>
                <button className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">
                    Set Property Alert
                </button>
            </div>
        }

        listingsFeed={
          <div className="space-y-12">
            {/* Popular Suburbs Grid - Moved to popularLocations for full width */}

            {/* Similar Locations */}
            <SimilarLocationsSection locationId={city.id} currentLocationName={city.name} />
          </div>
        }



        sellerCTA={
          <FinalCTA 
            locationName={city.name}
            provinceSlug={provinceSlug}
            citySlug={citySlug}
          />
        }
      />
    </>
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
