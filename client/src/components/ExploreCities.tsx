import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import {
  MapPin,
  Building2,
  Mountain,
  Palmtree,
  Landmark,
  Anchor,
  Flower2,
  Waves,
  Leaf,
  Sun,
  Gem,
  Wine,
  ArrowRight,
} from 'lucide-react';

interface City {
  name: string;
  province: string;
  icon: React.ElementType;
  slug: string;
  provinceSlug: string;
  color: string;
}

interface ExploreCitiesProps {
  provinceSlug?: string;
  title?: string;
  description?: string;
  customLocations?: City[]; // Allow passing custom locations (e.g. suburbs)
}

export function ExploreCities({ provinceSlug, title, description, customLocations }: ExploreCitiesProps = {}) {
  const cities: City[] = [
    // ... (keep existing hardcoded cities)
    {
      name: 'Johannesburg',
      province: 'Gauteng',
      icon: Building2,
      slug: 'johannesburg',
      provinceSlug: 'gauteng',
      color: 'from-blue-500 to-indigo-500',
    },
    {
      name: 'Cape Town',
      province: 'Western Cape',
      icon: Mountain,
      slug: 'cape-town',
      provinceSlug: 'western-cape',
      color: 'from-teal-500 to-emerald-500',
    },
    {
      name: 'Durban',
      province: 'KwaZulu-Natal',
      icon: Palmtree,
      slug: 'durban',
      provinceSlug: 'kwazulu-natal',
      color: 'from-orange-500 to-amber-500',
    },
    {
      name: 'Pretoria',
      province: 'Gauteng',
      icon: Landmark,
      slug: 'pretoria',
      provinceSlug: 'gauteng',
      color: 'from-purple-500 to-pink-500',
    },
    {
      name: 'Port Elizabeth',
      province: 'Eastern Cape',
      icon: Anchor,
      slug: 'port-elizabeth',
      provinceSlug: 'eastern-cape',
      color: 'from-cyan-500 to-blue-500',
    },
    {
      name: 'Bloemfontein',
      province: 'Free State',
      icon: Flower2,
      slug: 'bloemfontein',
      provinceSlug: 'free-state',
      color: 'from-rose-500 to-red-500',
    },
    {
      name: 'East London',
      province: 'Eastern Cape',
      icon: Waves,
      slug: 'east-london',
      provinceSlug: 'eastern-cape',
      color: 'from-sky-500 to-blue-500',
    },
    {
      name: 'Nelspruit',
      province: 'Mpumalanga',
      icon: Leaf,
      slug: 'nelspruit',
      provinceSlug: 'mpumalanga',
      color: 'from-green-500 to-emerald-500',
    },
    {
      name: 'Polokwane',
      province: 'Limpopo',
      icon: Sun,
      slug: 'polokwane',
      provinceSlug: 'limpopo',
      color: 'from-yellow-500 to-orange-500',
    },
    {
      name: 'Kimberley',
      province: 'Northern Cape',
      icon: Gem,
      slug: 'kimberley',
      provinceSlug: 'northern-cape',
      color: 'from-indigo-500 to-violet-500',
    },
    {
      name: 'Rustenburg',
      province: 'North West',
      icon: Mountain,
      slug: 'rustenburg',
      provinceSlug: 'north-west',
      color: 'from-stone-500 to-neutral-500',
    },
    {
      name: 'Stellenbosch',
      province: 'Western Cape',
      icon: Wine,
      slug: 'stellenbosch',
      provinceSlug: 'western-cape',
      color: 'from-red-500 to-rose-600',
    },
  ];

  const filteredCities = customLocations || (provinceSlug 
    ? cities.filter(city => city.provinceSlug.toLowerCase() === provinceSlug.toLowerCase())
    : cities);

  const displayTitle = title || "Explore Real Estate in Popular South African Cities";
  const displayDescription = description || "Find high-end residences, reasonably priced apartments, and high-growth investments by exploring real estate in well-known South African cities. Use professional advice and insights to navigate opportunities across metro hubs.";

  return (
    <section className="py-16 bg-white">
      <div className="container">
        {/* Section Header */}
        <div className="mb-10 text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            {displayTitle}
          </h2>
          <p className="text-muted-foreground text-lg max-w-4xl mx-auto md:mx-0">
            {displayDescription}
          </p>
        </div>

        {/* Cities Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredCities.map(city => (
            <Link key={city.slug} href={`/${city.provinceSlug}/${city.slug}`}>
              <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group border-0 bg-muted/30 hover:bg-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    {/* City Icon */}
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${city.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}
                    >
                      <city.icon className="h-7 w-7" />
                    </div>

                    {/* City Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg mb-1 group-hover:text-blue-600 transition-colors">
                        {city.name}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate font-medium">{city.province}</span>
                      </div>
                    </div>

                    {/* Arrow Icon */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-x-2 group-hover:translate-x-0">
                      <ArrowRight className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
