import { useState, useMemo } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { ListingNavbar } from '@/components/ListingNavbar';
import PropertyCard from '@/components/PropertyCard';
import { normalizePropertyForUI } from '@/lib/normalizers';
import { SearchBar, SearchFilters } from '@/components/SearchBar';
import { MapPin, Building2, TrendingUp, Home, ChevronRight, ArrowRight, Star, Building, Warehouse, Tractor } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';
import { generatePropertyUrl, slugify } from '@/lib/urlUtils';
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
  const [, setLocation] = useLocation();
  const citySlug = params.slug as string;
  const city = cityData[citySlug];

  const [propertyType, setPropertyType] = useState<string>('all');

  // Fetch properties for this city
  const { data: properties, isLoading: propertiesLoading } = trpc.properties.search.useQuery({
    city: city?.name,
    limit: 20, // Fetch more to calculate counts
  });

  // Fetch developments for this city
  const { data: developments } = trpc.developments.list.useQuery();
  const cityDevelopments = developments?.filter(d => d.city === city?.name).slice(0, 4) || [];

  // Fetch featured properties
  const { data: featuredProperties } = trpc.properties.featured.useQuery({
    limit: 4,
  });

  // Calculate property type counts
  const propertyTypeCounts = useMemo(() => {
    if (!properties) return {};
    return properties.reduce((acc, p) => {
      const type = p.propertyType || 'other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [properties]);

  // Property type cards with icons
  const propertyTypeCards = [
    { type: 'apartment', label: 'Apartments', icon: Building2, gradient: 'from-blue-500 to-indigo-500' },
    { type: 'house', label: 'Houses', icon: Home, gradient: 'from-emerald-500 to-teal-500' },
    { type: 'townhouse', label: 'Townhouses', icon: Building, gradient: 'from-purple-500 to-pink-500' },
    { type: 'commercial', label: 'Commercial', icon: Warehouse, gradient: 'from-orange-500 to-amber-500' },
    { type: 'farm', label: 'Farms', icon: Tractor, gradient: 'from-green-600 to-lime-500' },
  ];

  // Enhanced suburbs data with clickable links
  const suburbs = [
    { name: 'Sandton', slug: 'sandton', properties: propertyTypeCounts['apartment'] || 45, avgPrice: 'R 4,500,000' },
    { name: 'Rosebank', slug: 'rosebank', properties: propertyTypeCounts['house'] || 32, avgPrice: 'R 3,200,000' },
    { name: 'Midrand', slug: 'midrand', properties: propertyTypeCounts['townhouse'] || 28, avgPrice: 'R 2,800,000' },
    { name: 'Fourways', slug: 'fourways', properties: 41, avgPrice: 'R 3,500,000' },
    { name: 'Bryanston', slug: 'bryanston', properties: 38, avgPrice: 'R 5,200,000' },
    { name: 'Centurion', slug: 'centurion', properties: 52, avgPrice: 'R 2,100,000' },
  ];

  // Handle search from the hero
  const handleSearch = (filters: SearchFilters) => {
    const url = generatePropertyUrl({
      listingType: filters.listingType as any,
      propertyType: filters.propertyType,
      city: city?.name,
    });
    setLocation(url);
  };

  if (!city) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <ListingNavbar />
        <div className="container py-16 text-center pt-24">
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ListingNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-[#0A2540] to-[#0F4C75] text-white py-12 pt-24">
          <div className="container">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-5xl">{city.icon}</span>
              <div>
                <h1 className="text-3xl md:text-5xl font-bold">{city.name} Real Estate</h1>
                <div className="flex items-center gap-2 text-white/80 mt-2">
                  <MapPin className="h-5 w-5" />
                  <span className="text-lg">{city.province}</span>
                  <Badge variant="secondary" className="ml-2 bg-white/20 text-white">
                    {properties?.length || 0}+ Properties
                  </Badge>
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
            <SearchBar onSearch={handleSearch} />
          </div>
        </div>

        {/* Property Type Quick Links */}
        <div className="py-8 bg-white border-b">
          <div className="container">
            <h2 className="text-lg font-semibold mb-4">Browse by Property Type</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {propertyTypeCards.map(({ type, label, icon: Icon, gradient }) => (
                <Link 
                  key={type} 
                  href={generatePropertyUrl({ listingType: 'sale', propertyType: type, city: city.name })}
                >
                  <Card className="group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg bg-gradient-to-br ${gradient} group-hover:scale-110 transition-transform`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">
                          {propertyTypeCounts[type] || 0} listings
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
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
                        <CarouselItem key={p.id} className="pl-4 md:basis-1/2 lg:basis-1/2 xl:basis-1/2">
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

        {/* Top Localities / Suburbs */}
        <div className="py-12 bg-muted/30">
          <div className="container">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">Top Suburbs in {city.name}</h2>
                <p className="text-muted-foreground mt-1">Explore popular neighborhoods and their property trends</p>
              </div>
              <Link href={generatePropertyUrl({ listingType: 'sale', city: city.name })}>
                <Button variant="outline">
                  View All
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Suburbs Grid with Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {suburbs.map((suburb) => (
                <Link 
                  key={suburb.slug} 
                  href={`/suburb/${citySlug}/${suburb.slug}`}
                >
                  <Card className="p-4 hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer group">
                    <CardContent className="p-0">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <h3 className="font-bold text-base group-hover:text-primary transition-colors">{suburb.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {suburb.properties} listings
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Avg: {suburb.avgPrice}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Featured Properties */}
        <div className="py-12 bg-white">
          <div className="container">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Featured Properties</h2>
            <div className="flex flex-col gap-6">
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
