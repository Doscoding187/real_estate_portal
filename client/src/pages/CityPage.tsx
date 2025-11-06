import { useState } from 'react';
import { useParams, Link } from 'wouter';
import { Navbar } from '@/components/Navbar';
import PropertyCard from '@/components/PropertyCard';
import { normalizePropertyForUI } from '@/lib/normalizers';
import { SearchBar, SearchFilters } from '@/components/SearchBar';
import { MapPin, Building2, TrendingUp, Home, ChevronRight, ArrowRight, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

// City metadata
const cityData: Record<string, { name: string; province: string; icon: string }> = {
  johannesburg: { name: 'Johannesburg', province: 'Gauteng', icon: '🏙️' },
  'cape-town': { name: 'Cape Town', province: 'Western Cape', icon: '🏔️' },
  durban: { name: 'Durban', province: 'KwaZulu-Natal', icon: '🏖️' },
  pretoria: { name: 'Pretoria', province: 'Gauteng', icon: '🏛️' },
  'port-elizabeth': {
    name: 'Port Elizabeth',
    province: 'Eastern Cape',
    icon: '⛵',
  },
  bloemfontein: { name: 'Bloemfontein', province: 'Free State', icon: '🌻' },
  'east-london': { name: 'East London', province: 'Eastern Cape', icon: '🌊' },
  nelspruit: { name: 'Nelspruit', province: 'Mpumalanga', icon: '🦁' },
  polokwane: { name: 'Polokwane', province: 'Limpopo', icon: '🌳' },
  kimberley: { name: 'Kimberley', province: 'Northern Cape', icon: '💎' },
  rustenburg: { name: 'Rustenburg', province: 'North West', icon: '⛰️' },
  stellenbosch: { name: 'Stellenbosch', province: 'Western Cape', icon: '🍷' },
};

export default function CityPage() {
  const params = useParams();
  const citySlug = params.slug as string;
  const city = cityData[citySlug];

  const [propertyType, setPropertyType] = useState<string>('all');

  // Fetch properties for this city
  const { data: properties, isLoading: propertiesLoading } = trpc.properties.search.useQuery({
    city: city?.name,
    limit: 8,
  });

  // Fetch developments for this city
  const { data: developments } = trpc.developments.list.useQuery();
  const cityDevelopments = developments?.filter(d => d.city === city?.name).slice(0, 4) || [];

  // Fetch featured properties
  const { data: featuredProperties } = trpc.properties.featured.useQuery({
    limit: 4,
  });

  if (!city) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="container py-16 text-center">
          <MapPin className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">City Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The city you're looking for doesn't exist in our database.
          </p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const services = [
    { icon: '💰', title: 'Home Loan', url: '#' },
    { icon: '🛋️', title: 'Home Interiors', url: '#' },
    { icon: '📊', title: 'Valuation', url: '#' },
    { icon: '🏠', title: 'Property Management', url: '#' },
    { icon: '📝', title: 'Legal Services', url: '#' },
    { icon: '🔑', title: 'Rental Agreement', url: '#' },
  ];

  const localities = [
    { name: 'Sandton', properties: 1245, avgPrice: 'R 4,500,000' },
    { name: 'Rosebank', properties: 856, avgPrice: 'R 3,200,000' },
    { name: 'Midrand', properties: 1089, avgPrice: 'R 2,800,000' },
    { name: 'Fourways', properties: 967, avgPrice: 'R 3,500,000' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-[#0A2540] to-[#0F4C75] text-white py-12">
          <div className="container">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-5xl">{city.icon}</span>
              <div>
                <h1 className="text-3xl md:text-5xl font-bold">{city.name} Real Estate</h1>
                <div className="flex items-center gap-2 text-white/80 mt-2">
                  <MapPin className="h-5 w-5" />
                  <span className="text-lg">{city.province}</span>
                </div>
              </div>
            </div>
            <p className="text-lg text-white/90 max-w-3xl">
              Buy, Sale & Rent Residential & Commercial Properties in {city.name}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white border-b py-6">
          <div className="container">
            <SearchBar onSearch={filters => console.log(filters)} />
          </div>
        </div>

        {/* Quick Services */}
        <div className="bg-muted/30 py-8">
          <div className="container">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {services.map((service, idx) => (
                <a
                  key={idx}
                  href={service.url}
                  className="flex flex-col items-center text-center p-4 rounded-lg bg-white hover:shadow-md transition-all group"
                >
                  <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                    {service.icon}
                  </div>
                  <span className="text-xs font-medium">{service.title}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Hot Selling Projects */}
        <div className="py-12 bg-white">
          <div className="container">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  Hot Selling Real Estate Projects in {city.name}
                </h2>
                <p className="text-muted-foreground">
                  Explore the most in-demand properties with great value, ideal locations, and
                  trusted builders.
                </p>
              </div>
              <Link href="/properties">
                <Button variant="outline">
                  View All
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Property Type Tabs */}
            <Tabs value={propertyType} onValueChange={setPropertyType} className="mb-6">
              <TabsList>
                <TabsTrigger value="all">All Properties</TabsTrigger>
                <TabsTrigger value="apartment">Apartments</TabsTrigger>
                <TabsTrigger value="house">Houses</TabsTrigger>
                <TabsTrigger value="villa">Villas</TabsTrigger>
              </TabsList>
            </Tabs>

            {propertiesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-96" />
                ))}
              </div>
            ) : properties && properties.length > 0 ? (
              <Carousel className="w-full">
                <CarouselContent className="-ml-4">
                  {properties
                    .filter(p => propertyType === 'all' || p.propertyType === propertyType)
                    .map(property => {
                      const p = normalizePropertyForUI(property);
                      return p ? (
                        <CarouselItem key={p.id} className="pl-4 md:basis-1/2 lg:basis-1/4">
                          <PropertyCard {...p} />
                        </CarouselItem>
                      ) : null;
                    })}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex" />
                <CarouselNext className="hidden md:flex" />
              </Carousel>
            ) : (
              <div className="text-center py-12 bg-muted/30 rounded-lg">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No properties found in {city.name}</p>
              </div>
            )}

            <div className="text-center mt-6">
              <Link href={`/properties?city=${city.name}`}>
                <Button variant="link" className="text-primary font-semibold">
                  View All Projects in {city.name}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Everything You Need */}
        <div className="py-12 bg-muted/30">
          <div className="container">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              Everything you Need at One Place
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {services.map((service, idx) => (
                <Card key={idx} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <div className="text-5xl mb-3">{service.icon}</div>
                    <h3 className="text-sm font-medium">{service.title}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Discover More Options */}
        {cityDevelopments.length > 0 && (
          <div className="py-12 bg-white">
            <div className="container">
              <h2 className="text-2xl md:text-3xl font-bold mb-6">
                Discover More Real Estate Options in {city.name}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cityDevelopments.map(dev => {
                  const images = dev.images ? JSON.parse(dev.images as string) : [];
                  return (
                    <Link key={dev.id} href={`/development/${dev.id}`}>
                      <Card className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group">
                        <div className="relative h-48">
                          <img
                            src={
                              images[0] ||
                              'https://placehold.co/600x400/e2e8f0/64748b?text=Development'
                            }
                            alt={dev.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-bold mb-2 line-clamp-1">{dev.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {dev.description}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Top Localities */}
        <div className="py-12 bg-muted/30">
          <div className="container">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold">Top Localities in {city.name}</h2>
              <Link href={`/properties?city=${city.name}`}>
                <Button variant="outline">
                  View All
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Localities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {localities.map((loc, idx) => (
                <Card key={idx} className="p-4 hover:shadow-md transition-shadow">
                  <CardContent>
                    <h3 className="font-bold text-lg mb-1">{loc.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {loc.properties} listings • Avg: {loc.avgPrice}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Featured Properties */}
        <div className="py-12 bg-white">
          <div className="container">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Featured Properties</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {featuredProperties && featuredProperties.length > 0 ? (
                featuredProperties.map(p => {
                  const np = normalizePropertyForUI(p);
                  return np ? <PropertyCard key={np.id} {...np} /> : null;
                })
              ) : (
                <div className="text-muted-foreground">No featured properties available.</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
