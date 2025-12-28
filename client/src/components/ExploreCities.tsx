import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  MapPin,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Building,
} from 'lucide-react';

interface City {
  name: string;
  province: string;
  slug: string;
  provinceSlug: string;
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
  initialLimit = 12 
}: ExploreCitiesProps = {}) {
  const [visibleCount, setVisibleCount] = useState(initialLimit);

  const cities: City[] = [
    {
      name: 'Johannesburg',
      province: 'Gauteng',
      slug: 'johannesburg',
      provinceSlug: 'gauteng',
      image: 'https://images.unsplash.com/photo-1577948000111-9c9707350061?w=800&q=80',
      propertyCount: '24,500+ Properties'
    },
    {
      name: 'Cape Town',
      province: 'Western Cape',
      slug: 'cape-town',
      provinceSlug: 'western-cape',
      image: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&q=80',
      propertyCount: '18,200+ Properties'
    },
    {
      name: 'Durban',
      province: 'KwaZulu-Natal',
      slug: 'durban',
      provinceSlug: 'kwazulu-natal',
      image: 'https://images.unsplash.com/photo-1549297136-1c4b7b25055b?w=800&q=80',
      propertyCount: '12,400+ Properties'
    },
    {
      name: 'Pretoria',
      province: 'Gauteng',
      slug: 'pretoria',
      provinceSlug: 'gauteng',
      image: 'https://images.unsplash.com/photo-1624638760980-cb05d15a5198?w=800&q=80',
      propertyCount: '9,800+ Properties'
    },
    {
      name: 'Sandton',
      province: 'Gauteng',
      slug: 'sandton',
      provinceSlug: 'gauteng',
      image: 'https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?w=800&q=80',
      propertyCount: '6,300+ Properties'
    },
    {
      name: 'Midrand',
      province: 'Gauteng',
      slug: 'midrand',
      provinceSlug: 'gauteng',
      image: 'https://images.unsplash.com/photo-1575517111478-7f60e971579f?w=800&q=80',
      propertyCount: '4,100+ Properties'
    },
    {
      name: 'Umhlanga',
      province: 'KwaZulu-Natal',
      slug: 'umhlanga',
      provinceSlug: 'kwazulu-natal',
      image: 'https://images.unsplash.com/photo-1516029272338-782f9c5220c8?w=800&q=80',
      propertyCount: '3,200+ Properties'
    },
    {
      name: 'Stellenbosch',
      province: 'Western Cape',
      slug: 'stellenbosch',
      provinceSlug: 'western-cape',
      image: 'https://images.unsplash.com/photo-1518182170546-0766cac6cf66?w=800&q=80',
      propertyCount: '2,800+ Properties'
    },
    {
      name: 'Randburg',
      province: 'Gauteng',
      slug: 'randburg',
      provinceSlug: 'gauteng',
      image: 'https://images.unsplash.com/photo-1628191011993-4350f555e09f?w=800&q=80',
      propertyCount: '2,950+ Properties'
    },
    {
      name: 'Centurion',
      province: 'Gauteng',
      slug: 'centurion',
      provinceSlug: 'gauteng',
      image: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&q=80',
      propertyCount: '3,500+ Properties'
    },
     {
      name: 'Port Elizabeth',
      province: 'Eastern Cape',
      slug: 'port-elizabeth',
      provinceSlug: 'eastern-cape',
      image: 'https://images.unsplash.com/photo-1577909384666-382559639556?w=800&q=80',
      propertyCount: '2,100+ Properties'
    },
    {
      name: 'Bloemfontein',
      province: 'Free State',
      slug: 'bloemfontein',
      provinceSlug: 'free-state',
      image: 'https://images.unsplash.com/photo-1549487950-8b0933580434?w=800&q=80',
      propertyCount: '1,800+ Properties'
    }
  ];

  // If custom locations are provided, use them. Otherwise, filter by province or show defaults.
  const allCities = customLocations || (provinceSlug 
    ? cities.filter(city => city.provinceSlug.toLowerCase() === provinceSlug.toLowerCase())
    : cities);

  const displayedCities = allCities.slice(0, visibleCount);
  const remainingCount = allCities.length - visibleCount;

  const displayTitle = title || "Explore Real Estate in Popular Cities";
  const displayDescription = description || "Browse properties in South Africa's most sought-after locations.";

  return (
    <section className="py-12 bg-white">
      <div className="container">
        {/* Section Header */}
        <div className="mb-10 text-center md:text-left flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-3 text-slate-900">
                {displayTitle}
              </h2>
              <p className="text-slate-500 text-lg max-w-3xl">
                {displayDescription}
              </p>
          </div>
          
           <Link href="/property-for-sale">
            <Button variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium group">
              View All Locations <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayedCities.map(city => (
             <Link key={city.slug} href={`${basePath}/${city.provinceSlug}/${city.slug}${queryParams}`.replace(/\/\//g, '/')}>
              <div className="group cursor-pointer">
                <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  {/* Image */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 shadow-sm relative bg-slate-100">
                    {city.image ? (
                        <img 
                            src={city.image} 
                            alt={city.name} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Building className="h-8 w-8" />
                        </div>
                    )}
                     <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 py-1">
                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {city.name}
                    </h3>
                    
                    {city.propertyCount && (
                        <p className="text-slate-500 text-sm mb-1 truncate">
                            {city.propertyCount}
                        </p>
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

        {/* Show More Button */}
        {remainingCount > 0 && (
          <div className="mt-8 flex justify-center">
            <Button
              variant="outline"
              onClick={() => setVisibleCount(prev => prev + 12)}
              className="bg-white border-slate-200 hover:bg-slate-50 text-slate-600 min-w-[200px]"
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
