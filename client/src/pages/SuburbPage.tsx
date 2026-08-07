import { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { LocationPageLayout } from '@/components/location/LocationPageLayout';
import { LocationHeroSection } from '@/components/location/LocationHeroSection';
import { SearchStage } from '@/components/location/SearchStage';
import { LocationPropertyTypeExplorer as PropertyTypeExplorer } from '@/components/location/LocationPropertyTypeExplorer';

import { DiscoverProperties } from '@/components/DiscoverProperties';
import { PropertyCategories } from '@/components/PropertyCategories';
import { Building2 } from 'lucide-react';
// import { FeaturedListings } from '@/components/location/FeaturedListings'; // Removed
import { TabbedListingSection } from '@/components/location/TabbedListingSection';
import { SuburbInsights } from '@/components/property/SuburbInsights';

import PropertyCard from '@/components/PropertyCard';
import { normalizePropertyForUI } from '@/lib/normalizers';
import { MarketInsights } from '@/components/location/MarketInsights';
import { SEOTextBlock } from '@/components/location/SEOTextBlock';
import { AmenitiesSection } from '@/components/location/AmenitiesSection';
import { InteractiveMap } from '@/components/location/InteractiveMap';
import { SimilarLocations } from '@/components/location/SimilarLocations';
import { Skeleton } from '@/components/ui/skeleton';
import { LocationSchema } from '@/components/location/LocationSchema';
import { useSimilarLocations } from '@/hooks/useSimilarLocations';
import { LocationTrendingFeedSection } from '@/components/location/LocationTrendingFeedSection';
import type { FeedTab } from '@/components/location/LocationTrendingFeedSection';

import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { buildCampaignSlugHierarchy } from '@shared/locationCampaigns';
import { buildPropertySearchUrl } from '@/lib/heroJourneySearch';

export default function SuburbPage({
  params,
}: {
  params: { province: string; city: string; suburb: string; action?: string; locationId?: string };
}) {
  const [location, navigate] = useLocation();
  const { province: provinceSlug, city: citySlug, suburb: suburbSlug, action, locationId } = params;
  const isLocationDiscovery =
    !location.startsWith('/property-for-sale') && !location.startsWith('/property-to-rent');
  const locationPathPrefix = isLocationDiscovery
    ? ''
    : location.startsWith('/property-to-rent')
      ? '/property-to-rent'
      : '/property-for-sale';
  const cityCanonicalPath = isLocationDiscovery
    ? `/${provinceSlug}/${citySlug}`
    : `${locationPathPrefix}/${provinceSlug}/${citySlug}`;
  const suburbCanonicalPath = isLocationDiscovery
    ? `/${provinceSlug}/${citySlug}/${suburbSlug}`
    : `${cityCanonicalPath}/${suburbSlug}`;
  const [heroTab, setHeroTab] = useState<string | null>(
    isLocationDiscovery ? null : locationPathPrefix === '/property-to-rent' ? 'rental' : 'buy',
  );
  const campaignHierarchy = buildCampaignSlugHierarchy(`${provinceSlug}/${citySlug}/${suburbSlug}`);

  const mapHeroTabToFeedTab = (tabId?: string | null): FeedTab => {
    const t = String(tabId || 'buy').toLowerCase();
    if (t === 'rental') return 'rent';
    if (t === 'buy') return 'buy';
    if (t === 'developments') return 'developments';
    if (t === 'shared_living') return 'shared_living';
    if (t === 'plot_land') return 'plot_land';
    if (t === 'commercial') return 'commercial';
    return 'buy';
  };

  const mapFeedTabToHeroTab = (tab: FeedTab): string => (tab === 'rent' ? 'rental' : tab);

  // Bare geography routes are always neutral discovery pages. Transactional search
  // state belongs to the explicit /property-for-sale or /property-to-rent roots.
  const { data, isLoading, error } = trpc.locationPages.getSuburbData.useQuery(
    { provinceSlug, citySlug, suburbSlug, includeInventoryPreview: !isLocationDiscovery },
    { enabled: true },
  );

  const { data: heroCampaign } = trpc.locationPages.getHeroCampaign.useQuery(
    {
      locationSlug: `${provinceSlug}/${citySlug}/${suburbSlug}`,
      fallbacks: campaignHierarchy.slice(1),
    },
    { enabled: true },
  );

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

  const suburb = (data as any)?.suburb;
  const listings = (data as any)?.listings ?? [];
  const stats = (data as any)?.stats ?? {
    totalListings: 0,
    avgPrice: 0,
    minPrice: 0,
    maxPrice: 0,
    rentalCount: 0,
    saleCount: 0,
  };
  const subLocalities = (data as any)?.subLocalities ?? [];
  const insights = (data as any)?.insights ?? null;
  const reviews = (data as any)?.reviews ?? [];
  const buildResultsPath = buildPropertySearchUrl({
    transactionType: locationPathPrefix === '/property-to-rent' ? 'to-rent' : 'for-sale',
    selectedLocations: [
      {
        id: `suburb:${suburb.id}`,
        canonicalLocationId: `suburb:${suburb.id}`,
        name: suburb.name,
        slug: suburbSlug,
        type: 'suburb',
        provinceSlug,
        citySlug,
      },
    ],
  });

  return (
    <div className="min-h-screen bg-white">
      <LocationSchema
        type="Suburb"
        name={suburb.name}
        description={
          isLocationDiscovery
            ? `Explore property opportunities, developments, local insights, and agents in ${suburb.name}, ${suburb.cityName}.`
            : `Property ${locationPathPrefix === '/property-to-rent' ? 'to rent' : 'for sale'} in ${suburb.name}, ${suburb.cityName}`
        }
        url={suburbCanonicalPath}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          ...(isLocationDiscovery ? [{ name: 'Explore', url: '/' }] : []),
          {
            name: suburb.provinceName || provinceSlug,
            url: `${locationPathPrefix}/${provinceSlug}`,
          },
          { name: suburb.cityName || citySlug, url: cityCanonicalPath },
          { name: suburb.name, url: suburbCanonicalPath },
        ]}
        geo={{
          latitude: Number(suburb.latitude),
          longitude: Number(suburb.longitude),
        }}
        stats={stats}
        neutralMode={isLocationDiscovery}
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
            activeTab={heroTab}
            onActiveTabChange={setHeroTab}
            neutralMode={isLocationDiscovery}
            quickLinks={
              subLocalities?.slice(0, 10).map((loc: any) => ({
                label: loc.name,
                slug: loc.slug,
              })) || []
            }
          />
        }
        searchStage={null}
        discoveryMode={isLocationDiscovery}
        // Suburb Page Specific: Property Type Explorer
        propertyTypeExplorer={
          isLocationDiscovery ? undefined : (
            <PropertyCategories
              preselectedLocation={{
                name: suburb.name,
                slug: suburbSlug,
                provinceSlug: `${provinceSlug}/${citySlug}`,
                type: 'suburb',
              }}
            />
          )
        }
        highDemandDevelopments={
          <LocationTrendingFeedSection
            locationName={suburb.name}
            province={suburb.provinceName || provinceSlug}
            city={suburb.cityName || citySlug}
            suburb={suburb.name}
            activeTab={isLocationDiscovery ? null : mapHeroTabToFeedTab(heroTab)}
            onTabChange={tab => setHeroTab(mapFeedTabToHeroTab(tab))}
            neutralMode={isLocationDiscovery}
          />
        }
        buyerCTA={
          isLocationDiscovery ? undefined : (
            <div className="py-8 text-center bg-blue-50 rounded-lg mx-4 md:mx-0">
              <h3 className="text-fluid-h4 font-bold mb-2">Looking for a home in {suburb.name}?</h3>
              <p className="mb-4 text-slate-600">Get alerts when new properties are listed.</p>
              <button className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">
                Set Property Alert
              </button>
            </div>
          )
        }
        // The core content for Suburb page is LISTINGS
        listingsFeed={
          <div className="space-y-12">
            {/* Sub-Localities Grid - moved to popularLocations for full width */}

            {/* Properties Preview Section (Transaction Intent Launcher) */}
            {!isLocationDiscovery && (
              <div className="py-fluid-xl bg-white">
                <div className="container">
                  <div className="flex justify-between items-end mb-8">
                    <div>
                      <h2 className="text-fluid-h2 font-bold mb-3">
                        {isLocationDiscovery ? `Explore ${suburb.name}` : `Homes in ${suburb.name}`}
                      </h2>
                      <p className="text-muted-foreground text-base max-w-2xl">
                        {isLocationDiscovery
                          ? `Discover a selection of property opportunities in ${suburb.name}.`
                          : `Browse a selection of properties for sale in ${suburb.name}.`}
                      </p>
                    </div>
                    <Link href={buildResultsPath}>
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
                    <Link href={buildResultsPath}>
                      <Button variant="outline" className="w-full gap-2">
                        View all properties <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <MarketInsights stats={stats} locationName={suburb.name} type="suburb" />

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
                  viewport={
                    suburb.viewport_ne_lat
                      ? {
                          ne_lat: Number(suburb.viewport_ne_lat),
                          ne_lng: Number(suburb.viewport_ne_lng),
                          sw_lat: Number(suburb.viewport_sw_lat),
                          sw_lng: Number(suburb.viewport_sw_lng),
                        }
                      : undefined
                  }
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
                longitude: Number(suburb.longitude),
              }}
            />

            {/* Similar Locations Section */}
            {suburb.id && (
              <SimilarLocationsSection locationId={suburb.id} currentLocationName={suburb.name} />
            )}
          </div>
        }
        exploreMore={
          <DiscoverProperties initialCity={suburb.cityName} locationName={suburb.name} />
        }
      />
    </div>
  );
}

function SimilarLocationsSection({
  locationId,
  currentLocationName,
}: {
  locationId: number;
  currentLocationName: string;
}) {
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
