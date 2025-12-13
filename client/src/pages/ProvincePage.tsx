import { useRoute, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { HeroLocation } from '@/components/location/HeroLocation';
import { SearchRefinementBar } from '@/components/location/SearchRefinementBar';
import { LocationGrid } from '@/components/location/LocationGrid';
import { TrendingSlider } from '@/components/location/TrendingSlider';
import { DevelopmentsSlider } from '@/components/location/DevelopmentsSlider';
import { AmenitiesSection } from '@/components/location/AmenitiesSection';
import { MarketInsights } from '@/components/location/MarketInsights';
import { SEOTextBlock } from '@/components/location/SEOTextBlock';
import { FinalCTA } from '@/components/location/FinalCTA';
import { InteractiveMap } from '@/components/location/InteractiveMap';
import { Skeleton } from '@/components/ui/skeleton';
import { Helmet } from 'react-helmet';
import { LocationSchema } from '@/components/location/LocationSchema';

export default function ProvincePage({ params }: { params: { province: string } }) {
  // Wouter hook backup if params not passed directly (though App.tsx should pass them)
  const [, navigate] = useLocation();
  const provinceSlug = params.province;

  const { data, isLoading, error } = trpc.locationPages.getProvinceData.useQuery({
    provinceSlug
  });

  // ... (previous error handling code)

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

  const handleSearch = (filters: any) => {
    // Navigate to search page with location filter
    navigate(`/properties?province=${provinceSlug}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Property for Sale in {province.name} | Real Estate Portal</title>
        <meta name="description" content={`Find the best properties for sale in ${province.name}. Browse ${stats.totalListings} listings, including houses, apartments, and developments.`} />
        <link rel="canonical" href={`https://propertylistify.com/${provinceSlug}`} />
      </Helmet>

      <LocationSchema 
        type="Province" // Will map to AdministrativeArea or Place in component
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

      <HeroLocation
        title={province.name}
        subtitle="Discover the best cities and suburbs to live in."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: province.name, href: `/${provinceSlug}` }
        ]}
        stats={stats}
        backgroundImage="https://images.unsplash.com/photo-1577931767667-0c58e744d081?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" // Placeholder or dynamic if we had province images
        placeId={province.place_id}
        coordinates={province.latitude && province.longitude ? {
          latitude: Number(province.latitude),
          longitude: Number(province.longitude)
        } : undefined}
      />

      <SearchRefinementBar 
        onSearch={handleSearch} 
        defaultLocation={province.name}
        placeId={province.place_id}
      />

      <LocationGrid 
        title={`Popular Cities in ${province.name}`} 
        items={cities} 
        parentSlug={provinceSlug}
        type="city"
      />

      <div className="bg-slate-50">
        <TrendingSlider 
          locations={trendingSuburbs} 
          provinceSlug={provinceSlug}
        />
      </div>

      <DevelopmentsSlider 
        developments={featuredDevelopments as any[]} 
        locationName={province.name} 
      />

      <MarketInsights 
        stats={stats} 
        locationName={province.name} 
        type="province"
      />

      <AmenitiesSection 
        location={{
          latitude: Number(province.latitude),
          longitude: Number(province.longitude)
        }} 
      />

      {/* Interactive Map Section */}
      {province.latitude && province.longitude && (
        <div className="container py-12">
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

      <SEOTextBlock
        title={`About Real Estate in ${province.name}`}
        locationName={province.name}
        locationType="province"
        stats={stats}
        content={province.description || undefined}
      />

      <FinalCTA 
        locationName={province.name}
        provinceSlug={provinceSlug}
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
