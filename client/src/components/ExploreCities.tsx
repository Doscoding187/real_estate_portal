import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

interface City {
  name: string;
  province: string;
  icon: string;
  slug: string;
}

export function ExploreCities() {
  const cities: City[] = [
    {
      name: 'Johannesburg',
      province: 'Gauteng',
      icon: '🏙️',
      slug: 'johannesburg',
    },
    {
      name: 'Cape Town',
      province: 'Western Cape',
      icon: '🏔️',
      slug: 'cape-town',
    },
    {
      name: 'Durban',
      province: 'KwaZulu-Natal',
      icon: '🏖️',
      slug: 'durban',
    },
    {
      name: 'Pretoria',
      province: 'Gauteng',
      icon: '🏛️',
      slug: 'pretoria',
    },
    {
      name: 'Port Elizabeth',
      province: 'Eastern Cape',
      icon: '⛵',
      slug: 'port-elizabeth',
    },
    {
      name: 'Bloemfontein',
      province: 'Free State',
      icon: '🌻',
      slug: 'bloemfontein',
    },
    {
      name: 'East London',
      province: 'Eastern Cape',
      icon: '🌊',
      slug: 'east-london',
    },
    {
      name: 'Nelspruit',
      province: 'Mpumalanga',
      icon: '🦁',
      slug: 'nelspruit',
    },
    {
      name: 'Polokwane',
      province: 'Limpopo',
      icon: '🌳',
      slug: 'polokwane',
    },
    {
      name: 'Kimberley',
      province: 'Northern Cape',
      icon: '💎',
      slug: 'kimberley',
    },
    {
      name: 'Rustenburg',
      province: 'North West',
      icon: '⛰️',
      slug: 'rustenburg',
    },
    {
      name: 'Stellenbosch',
      province: 'Western Cape',
      icon: '🍷',
      slug: 'stellenbosch',
    },
  ];

  return (
    <section className="py-16 bg-background">
      <div className="container">
        {/* Section Header */}
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Explore Real Estate in Popular South African Cities
          </h2>
          <p className="text-muted-foreground text-lg max-w-4xl">
            Find high-end residences, reasonably priced apartments, and high-growth investments by
            exploring real estate in well-known South African cities. Use professional advice and
            insights to navigate opportunities across metro hubs.
          </p>
        </div>

        {/* Cities Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {cities.map(city => (
            <Link key={city.slug} href={`/city/${city.slug}`}>
              <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group border-2 hover:border-primary">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    {/* City Icon */}
                    <div className="text-5xl group-hover:scale-110 transition-transform">
                      {city.icon}
                    </div>

                    {/* City Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                        {city.name}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{city.province}</span>
                      </div>
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
