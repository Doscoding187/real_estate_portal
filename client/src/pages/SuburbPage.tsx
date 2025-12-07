import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { HeroLocation } from '@/components/location/HeroLocation';
import { SearchRefinementBar } from '@/components/location/SearchRefinementBar';
import { FeaturedListings } from '@/components/location/FeaturedListings';
import { MarketInsights } from '@/components/location/MarketInsights';
import { SEOTextBlock } from '@/components/location/SEOTextBlock';
import { FinalCTA } from '@/components/location/FinalCTA';
import { AmenitiesSection } from '@/components/location/AmenitiesSection';
import { Skeleton } from '@/components/ui/skeleton';
import { Helmet } from 'react-helmet';
import { LocationSchema } from '@/components/location/LocationSchema';

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
      />

      <SearchRefinementBar onSearch={handleSearch} defaultLocation={suburb.name} />

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

      <AmenitiesSection />

      <SEOTextBlock
        title={`Life in ${suburb.name}`}
        locationName={suburb.name}
        content={`
          <p><strong>${suburb.name}</strong> offers residents a unique blend of community living and convenience. Nestled in the heart of <strong>${suburb.cityName}</strong>, this suburb is known for its family-friendly atmosphere and proximity to key amenities.</p>
          <p>With <strong>${stats.totalListings} properties</strong> currently on the market, ranging from cozy apartments to spacious family homes, ${suburb.name} caters to a variety of lifestyles. The area boasts excellent schools, parks, and shopping centers, making it a top choice for homebuyers.</p>
        `}
      />

      <FinalCTA 
        locationName={suburb.name}
        provinceSlug={provinceSlug}
        citySlug={citySlug}
        suburbSlug={suburbSlug}
      />
    </div>
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
