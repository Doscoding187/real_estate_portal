import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { HeroLocation } from '@/components/location/HeroLocation';
import { SearchRefinementBar } from '@/components/location/SearchRefinementBar';
import { LocationGrid } from '@/components/location/LocationGrid';
import { DevelopmentsGrid } from '@/components/location/DevelopmentsGrid';
import { MarketInsights } from '@/components/location/MarketInsights';
import { SEOTextBlock } from '@/components/location/SEOTextBlock';
import { FinalCTA } from '@/components/location/FinalCTA';
import { FeaturedListings } from '@/components/location/FeaturedListings';
import { AmenitiesSection } from '@/components/location/AmenitiesSection';
import { Skeleton } from '@/components/ui/skeleton';
import { Helmet } from 'react-helmet';
import { LocationSchema } from '@/components/location/LocationSchema';

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Location Not Found</h1>
          <p className="text-slate-500">We couldn't find the city you're looking for.</p>
        </div>
      </div>
    );
  }

  // Type assertion to handle potential type mismatches from API vs Component props
  const { city, suburbs, featuredProperties, developments, stats } = data;

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
      />

      <HeroLocation
        title={city.name}
        subtitle={`Explore ${city.name}'s best real estate investment opportunities.`}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: city.provinceName || provinceSlug, href: `/${provinceSlug}` },
          { label: city.name, href: `/${provinceSlug}/${citySlug}` }
        ]}
        stats={stats}
        backgroundImage="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
      />

      <SearchRefinementBar onSearch={handleSearch} defaultLocation={city.name} />

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

      <DevelopmentsGrid 
        developments={developments as any[]} 
        locationName={city.name} 
      />

      <MarketInsights 
        stats={stats} 
        locationName={city.name} 
        type="city"
      />

      <AmenitiesSection />

      <SEOTextBlock
        title={`Living in ${city.name}`}
        locationName={city.name}
        content={`
          <p><strong>${city.name}</strong> offers a vibrant lifestyle with a mix of historic charm and modern convenience. Located in <strong>${city.provinceName}</strong>, it is a hub for business, culture, and residential living.</p>
          <p>With an average listing price of <strong>R ${stats.avgPrice.toLocaleString()}</strong>, ${city.name} presents opportunities for various budgets. Whether you are looking for a starter apartment, a family home, or a luxury estate, you'll find it here.</p>
          <h3>Highlights</h3>
          <ul>
            <li>Top-rated schools and universities nearby.</li>
            <li>Access to major shopping centers and medical facilities.</li>
            <li>Thriving rental market with good yields for investors.</li>
          </ul>
        `}
      />

      <FinalCTA 
        locationName={city.name}
        provinceSlug={provinceSlug}
        citySlug={citySlug}
      />
    </div>
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
