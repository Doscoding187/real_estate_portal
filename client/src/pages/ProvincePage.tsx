import { useRoute, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { LocationPageLayout } from '@/components/location/LocationPageLayout';
import { MetaControl } from '@/components/seo/MetaControl';
import { generateCanonicalUrl } from '@/lib/urlUtils';
import { LocationHeroSection } from '@/components/location/LocationHeroSection';
import { SearchStage } from '@/components/location/SearchStage';
import { FeaturedPropertiesCarousel } from '@/components/location/FeaturedPropertiesCarousel';
import { LocationGrid } from '@/components/location/LocationGrid';
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
import { TopDevelopersCarousel } from '@/components/location/TopDevelopersCarousel';
import { HighDemandProjectsCarousel } from '@/components/location/HighDemandProjectsCarousel';
import { RecommendedAgenciesCarousel } from '@/components/location/RecommendedAgenciesCarousel';
import { LocationTopLocalities } from '@/components/location/LocationTopLocalities';
import { TrendingSuburbsCarousel } from '@/components/location/TrendingSuburbsCarousel';
import { LocationPropertyTypeExplorer } from '@/components/location/LocationPropertyTypeExplorer';
import { DiscoverProperties } from '@/components/DiscoverProperties';
import { ExploreCities } from '@/components/ExploreCities';
import { PropertyCategories } from '@/components/PropertyCategories';
// EnhancedHero not needed - using LocationHeroSection for location pages

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
          <h1 className="text-fluid-h3 font-bold mb-2">Location Not Found</h1>
          <p className="text-slate-500">We couldn't find the province you're looking for.</p>
        </div>
      </div>
    );
  }

  const { province, cities, featuredDevelopments, trendingSuburbs, stats, topDevelopers, investmentProjects, recommendedAgencies, topLocalities } = data;

  return (
    <div className="min-h-screen bg-white">
      <MetaControl />
      <Helmet>
        <title>Property for Sale in {province.name} | Real Estate Portal</title>
        <meta name="description" content={`Find the best properties for sale in ${province.name}. Browse ${stats.totalListings} listings, including houses, apartments, and developments.`} />
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
        locationType="province"
        heroImage="/images/province-hero.jpg"
        
        banner={
          <LocationHeroSection
            locationName={province.name}
            locationSlug={provinceSlug}
            locationType="province"
            locationId={province.id}
            backgroundImage="https://images.unsplash.com/photo-1577931767667-0c58e744d081?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
            listingCount={stats.totalListings}
            campaign={heroCampaign}
            quickLinks={cities?.slice(0, 10).map((city: any) => ({
              label: city.name,
              slug: city.slug,
            })) || []}
          />
        }

        searchStage={null}

        featuredProperties={
          <FeaturedPropertiesCarousel 
            locationId={province.id} 
            locationName={province.name} 
            locationScope="province" 
          />
        }
        // Section: Property Categories (Explore by Type)
        propertyCategories={
          <PropertyCategories 
            preselectedLocation={{
              name: province.name,
              slug: provinceSlug,
              provinceSlug: provinceSlug,
              type: 'province'
            }}
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

        // Section 6: Removed Property Type Explorer (Discovery Page)
        propertyTypeExplorer={undefined}

        topLocalitiesShowcase={
           topLocalities && topLocalities.length > 0 ? (
             <LocationTopLocalities 
               localities={topLocalities} 
               locationName={province.name} 
             />
           ) : undefined
        }

        exploreMore={
            <DiscoverProperties 
                initialCity={cities?.[0]?.name} 
                availableCities={cities?.map((c: any) => c.name)}
                locationName={province.name}
            />
        }

        developerShowcase={
          topDevelopers && topDevelopers.length > 0 ? (
            <TopDevelopersCarousel 
              developers={topDevelopers} 
              locationName={province.name} 
            />
          ) : undefined
        }

        investmentShowcase={
          investmentProjects && investmentProjects.length > 0 ? (
            <HighDemandProjectsCarousel 
              projects={investmentProjects} 
              locationName={province.name} 
            />
          ) : undefined
        }

        agencyShowcase={
          recommendedAgencies && recommendedAgencies.length > 0 ? (
            <RecommendedAgenciesCarousel 
              agencies={recommendedAgencies} 
              locationName={province.name} 
            />
          ) : undefined
        }

        buyerCTA={
          <div className="py-8 text-center bg-blue-50 rounded-lg mx-4 md:mx-0">
            <h3 className="text-fluid-h4 font-bold mb-2">Looking for property in {province.name}?</h3>
            <p className="mb-4 text-slate-600">Get alerts for new properties matching your criteria.</p>
            <button className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">
              Set Property Alert
            </button>
          </div>
        }

        popularLocations={
          <ExploreCities 
            basePath="/property-for-sale"
            queryParams="?view=list"
            title={`Explore Popular Cities in ${province.name}`}
            description={`Find high-end residences and investment opportunities in top cities across ${province.name}.`}
            customLocations={cities?.map((city: any) => ({
              name: city.name,
              province: province.name,
              slug: city.slug,
              provinceSlug: provinceSlug,
              propertyCount: city.listingCount ? `${city.listingCount.toLocaleString()}+ Properties` : undefined,
            })) || []}
          />
        }

        fullWidthSection={
          trendingSuburbs && trendingSuburbs.length > 0 ? (
            <TrendingSuburbsCarousel
              suburbs={trendingSuburbs}
              provinceName={province.name}
              provinceSlug={provinceSlug}
            />
          ) : null
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
