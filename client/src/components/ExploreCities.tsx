import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { MapPin, ChevronRight, ChevronDown, Building } from 'lucide-react';
import { generatePropertyUrl } from '@/lib/urlUtils';

interface City {
  name: string;
  province: string;
  slug: string;
  provinceSlug: string;
  citySlug?: string;
  image?: string;
  propertyCount?: string;
  featured?: boolean;
}

interface ExploreCitiesProps {
  provinceSlug?: string;
  title?: string;
  description?: string;
  customLocations?: City[];
  basePath?: string;
  queryParams?: string;
  initialLimit?: number;
}

export function ExploreCities({
  provinceSlug,
  title,
  description,
  customLocations,
  basePath = '/property-for-sale',
  queryParams = '',
  initialLimit = 12,
}: ExploreCitiesProps = {}) {
  const [visibleCount, setVisibleCount] = useState(initialLimit);
  const listingType = basePath.includes('to-rent')
    ? 'rent'
    : basePath.includes('auction')
      ? 'auction'
      : 'sale';
  const extraFilters = Object.fromEntries(new URLSearchParams(queryParams).entries());

  const cities: City[] = [
    // Gauteng
    {
      name: 'Johannesburg',
      province: 'Gauteng',
      slug: 'johannesburg',
      provinceSlug: 'gauteng',
      image: 'https://images.unsplash.com/photo-1577948000111-9c9707350061?w=800&q=80',
      propertyCount: '24,500+ Properties',
    },
    {
      name: 'Pretoria',
      province: 'Gauteng',
      slug: 'pretoria',
      provinceSlug: 'gauteng',
      image: 'https://images.unsplash.com/photo-1624638760980-cb05d15a5198?w=800&q=80',
      propertyCount: '9,800+ Properties',
    },
    {
      name: 'Sandton',
      province: 'Gauteng',
      slug: 'sandton',
      provinceSlug: 'gauteng',
      image: 'https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?w=800&q=80',
      propertyCount: '6,300+ Properties',
    },
    {
      name: 'Midrand',
      province: 'Gauteng',
      slug: 'midrand',
      provinceSlug: 'gauteng',
      image: 'https://images.unsplash.com/photo-1575517111478-7f60e971579f?w=800&q=80',
      propertyCount: '4,100+ Properties',
    },
    {
      name: 'Centurion',
      province: 'Gauteng',
      slug: 'centurion',
      provinceSlug: 'gauteng',
      image: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&q=80',
      propertyCount: '3,500+ Properties',
    },
    {
      name: 'Randburg',
      province: 'Gauteng',
      slug: 'randburg',
      provinceSlug: 'gauteng',
      image: 'https://images.unsplash.com/photo-1628191011993-4350f555e09f?w=800&q=80',
      propertyCount: '2,950+ Properties',
    },
    {
      name: 'Roodepoort',
      province: 'Gauteng',
      slug: 'roodepoort',
      provinceSlug: 'gauteng',
      propertyCount: '2,800+ Properties',
    },
    {
      name: 'Benoni',
      province: 'Gauteng',
      slug: 'benoni',
      provinceSlug: 'gauteng',
      propertyCount: '2,400+ Properties',
    },
    {
      name: 'Boksburg',
      province: 'Gauteng',
      slug: 'boksburg',
      provinceSlug: 'gauteng',
      propertyCount: '2,200+ Properties',
    },
    {
      name: 'Alberton',
      province: 'Gauteng',
      slug: 'alberton',
      provinceSlug: 'gauteng',
      propertyCount: '2,100+ Properties',
    },
    {
      name: 'Kempton Park',
      province: 'Gauteng',
      slug: 'kempton-park',
      provinceSlug: 'gauteng',
      propertyCount: '1,900+ Properties',
    },
    {
      name: 'Soweto',
      province: 'Gauteng',
      slug: 'soweto',
      provinceSlug: 'gauteng',
      propertyCount: '1,500+ Properties',
    },
    // Other Provinces (for Homepage)
    {
      name: 'Cape Town',
      province: 'Western Cape',
      slug: 'cape-town',
      provinceSlug: 'western-cape',
      image: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&q=80',
      propertyCount: '18,200+ Properties',
    },
    {
      name: 'Durban',
      province: 'KwaZulu-Natal',
      slug: 'durban',
      provinceSlug: 'kwazulu-natal',
      image: 'https://images.unsplash.com/photo-1549297136-1c4b7b25055b?w=800&q=80',
      propertyCount: '12,400+ Properties',
    },
    {
      name: 'Umhlanga',
      province: 'KwaZulu-Natal',
      slug: 'umhlanga',
      provinceSlug: 'kwazulu-natal',
      image: 'https://images.unsplash.com/photo-1516029272338-782f9c5220c8?w=800&q=80',
      propertyCount: '3,200+ Properties',
    },
    {
      name: 'Stellenbosch',
      province: 'Western Cape',
      slug: 'stellenbosch',
      provinceSlug: 'western-cape',
      image: 'https://images.unsplash.com/photo-1518182170546-0766cac6cf66?w=800&q=80',
      propertyCount: '2,800+ Properties',
    },
    {
      name: 'Gqeberha',
      province: 'Eastern Cape',
      slug: 'gqeberha',
      provinceSlug: 'eastern-cape',
      image: 'https://images.unsplash.com/photo-1577909384666-382559639556?w=800&q=80',
      propertyCount: '2,100+ Properties',
    },
    {
      name: 'Bloemfontein',
      province: 'Free State',
      slug: 'bloemfontein',
      provinceSlug: 'free-state',
      image: 'https://images.unsplash.com/photo-1549487950-8b0933580434?w=800&q=80',
      propertyCount: '1,800+ Properties',
    },
  ];

  // If custom locations are provided (even empty), use them. Only fall back to hardcoded cities when prop is undefined.
  const allCities =
    customLocations !== undefined
      ? customLocations
      : provinceSlug
        ? cities.filter(city => city.provinceSlug.toLowerCase() === provinceSlug.toLowerCase())
        : cities;

  const displayedCities = allCities.slice(0, visibleCount);
  const remainingCount = allCities.length - visibleCount;

  const displayTitle = title || 'Explore Real Estate in Popular Cities';
  const displayDescription =
    description || "Browse properties in South Africa's most sought-after locations.";
  const viewAllHref = generatePropertyUrl({
    listingType,
    ...(provinceSlug ? { province: provinceSlug } : {}),
    ...extraFilters,
  });

  return (
    <section className="bg-white py-8 md:py-16">
      <div className="container">
        {/* Section Header */}
        <div className="mb-5 flex flex-col gap-2.5 text-left md:mb-10 md:flex-row md:items-end md:justify-between md:gap-4">
          <div className="max-w-3xl">
            <h2 className="text-[1.125rem] sm:text-xl md:text-[26px] font-bold text-slate-900 mb-2">
              {displayTitle}
            </h2>
            <p className="max-w-3xl text-[13px] leading-5 text-slate-500 md:text-sm md:leading-6">
              {displayDescription}
            </p>
          </div>

          <Link href={viewAllHref}>
            <Button
              variant="ghost"
              className="group h-9 justify-start rounded-full border border-slate-200 px-3.5 text-[13px] font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-700 md:h-auto md:justify-center md:rounded-md md:border-0 md:px-0 md:text-sm"
            >
              View All Locations{' '}
              <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {/* Grid Layout */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white via-white/90 to-transparent sm:hidden" />
          <div className="scrollbar-hide -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {displayedCities.map(city => (
              <Link
                key={city.slug}
                href={generatePropertyUrl({
                  listingType,
                  province: city.provinceSlug,
                  ...(city.citySlug
                    ? { city: city.citySlug, suburb: city.slug }
                    : { city: city.slug }),
                  ...extraFilters,
                })}
                className="w-[75vw] max-w-[236px] flex-none snap-start sm:w-auto"
              >
                <div className="group h-full cursor-pointer">
                  <div className="flex h-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-slate-300 group-hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:gap-4 sm:rounded-xl sm:border-transparent sm:bg-transparent sm:p-3 sm:shadow-none sm:hover:border-slate-100 sm:hover:bg-slate-50">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-500 shadow-sm sm:h-16 sm:w-16 sm:rounded-lg">
                      <Building className="h-6 w-6 opacity-90 sm:h-8 sm:w-8" />
                    </div>

                    <div className="min-w-0 flex-1 py-0.5">
                      <h3 className="truncate text-[15px] font-bold text-slate-900 transition-colors group-hover:text-blue-600 sm:text-lg">
                        {city.name}
                      </h3>

                      {city.propertyCount && (
                        <p className="mb-1 truncate text-sm text-slate-500">{city.propertyCount}</p>
                      )}

                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{city.province}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Show More Button */}
        {remainingCount > 0 && (
          <div className="mt-6 flex justify-center md:mt-8">
            <Button
              variant="outline"
              onClick={() => setVisibleCount(prev => prev + 12)}
              className="min-w-[220px] rounded-full border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            >
              Show More Locations ({remainingCount})
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
