import { useState, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Star, ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Locality {
  name: string;
  city: string;
  rating: number;
  reviews: number;
  avgSalePrice: number;
  avgRental: number;
  propertiesForSale: number;
  propertiesForRent: number;
}

const localitiesData: Record<string, Locality[]> = {
  Johannesburg: [
    {
      name: 'Sandton',
      city: 'Johannesburg',
      rating: 4.6,
      reviews: 22,
      avgSalePrice: 46100,
      avgRental: 285,
      propertiesForSale: 3276,
      propertiesForRent: 4130,
    },
    {
      name: 'Rosebank',
      city: 'Johannesburg',
      rating: 4.5,
      reviews: 18,
      avgSalePrice: 34650,
      avgRental: 245,
      propertiesForSale: 2208,
      propertiesForRent: 3845,
    },
    {
      name: 'Fourways',
      city: 'Johannesburg',
      rating: 4.4,
      reviews: 15,
      avgSalePrice: 33100,
      avgRental: 220,
      propertiesForSale: 2165,
      propertiesForRent: 4311,
    },
    {
      name: 'Midrand',
      city: 'Johannesburg',
      rating: 4.3,
      reviews: 12,
      avgSalePrice: 30100,
      avgRental: 195,
      propertiesForSale: 1890,
      propertiesForRent: 3200,
    },
  ],
  'Cape Town': [
    {
      name: 'Camps Bay',
      city: 'Cape Town',
      rating: 4.8,
      reviews: 35,
      avgSalePrice: 65200,
      avgRental: 420,
      propertiesForSale: 1540,
      propertiesForRent: 2890,
    },
    {
      name: 'Sea Point',
      city: 'Cape Town',
      rating: 4.6,
      reviews: 28,
      avgSalePrice: 42300,
      avgRental: 310,
      propertiesForSale: 2650,
      propertiesForRent: 4120,
    },
    {
      name: 'Constantia',
      city: 'Cape Town',
      rating: 4.7,
      reviews: 24,
      avgSalePrice: 38900,
      avgRental: 290,
      propertiesForSale: 1980,
      propertiesForRent: 2340,
    },
    {
      name: 'Claremont',
      city: 'Cape Town',
      rating: 4.5,
      reviews: 20,
      avgSalePrice: 35400,
      avgRental: 265,
      propertiesForSale: 2340,
      propertiesForRent: 3560,
    },
  ],
  Pretoria: [
    {
      name: 'Waterkloof',
      city: 'Pretoria',
      rating: 4.7,
      reviews: 19,
      avgSalePrice: 38500,
      avgRental: 270,
      propertiesForSale: 1450,
      propertiesForRent: 1890,
    },
    {
      name: 'Menlyn',
      city: 'Pretoria',
      rating: 4.4,
      reviews: 16,
      avgSalePrice: 28900,
      avgRental: 215,
      propertiesForSale: 2890,
      propertiesForRent: 3450,
    },
    {
      name: 'Centurion',
      city: 'Pretoria',
      rating: 4.3,
      reviews: 14,
      avgSalePrice: 26400,
      avgRental: 190,
      propertiesForSale: 3120,
      propertiesForRent: 4230,
    },
    {
      name: 'Brooklyn',
      city: 'Pretoria',
      rating: 4.5,
      reviews: 17,
      avgSalePrice: 32100,
      avgRental: 240,
      propertiesForSale: 1780,
      propertiesForRent: 2560,
    },
  ],
  Durban: [
    {
      name: 'Umhlanga',
      city: 'Durban',
      rating: 4.6,
      reviews: 21,
      avgSalePrice: 35600,
      avgRental: 260,
      propertiesForSale: 2340,
      propertiesForRent: 3120,
    },
    {
      name: 'Ballito',
      city: 'Durban',
      rating: 4.5,
      reviews: 18,
      avgSalePrice: 28200,
      avgRental: 220,
      propertiesForSale: 1890,
      propertiesForRent: 2450,
    },
    {
      name: 'La Lucia',
      city: 'Durban',
      rating: 4.4,
      reviews: 15,
      avgSalePrice: 32400,
      avgRental: 245,
      propertiesForSale: 1560,
      propertiesForRent: 2120,
    },
    {
      name: 'Durban North',
      city: 'Durban',
      rating: 4.2,
      reviews: 12,
      avgSalePrice: 24800,
      avgRental: 185,
      propertiesForSale: 2670,
      propertiesForRent: 3890,
    },
  ],
};

const cities = ['Johannesburg', 'Cape Town', 'Pretoria', 'Durban'];

export function TopLocalities() {
  const [selectedCity, setSelectedCity] = useState('Johannesburg');

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    slidesToScroll: 1,
    containScroll: 'trimSnaps',
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const localities = localitiesData[selectedCity] || [];

  return (
    <div className="py-16 bg-white">
      <div className="container">
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Top Localities in South Africa</h2>
          <p className="text-muted-foreground text-lg">
            Discover South Africa's best localities known for liveability, infrastructure, and
            connectivity. Explore top neighbourhoods in major cities, offering insights on new
            construction, rental trends, and average prices.
          </p>
        </div>

        {/* City Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {cities.map(city => (
            <Button
              key={city}
              variant={selectedCity === city ? 'default' : 'outline'}
              onClick={() => setSelectedCity(city)}
              className="rounded-md"
            >
              {city}
            </Button>
          ))}
        </div>

        {/* Localities Carousel */}
        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-6">
              {localities.map((locality, idx) => (
                <div
                  key={idx}
                  className="flex-[0_0_100%] min-w-0 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]"
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      {/* Header with map and locality name */}
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-16 h-16 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <MapPin className="h-8 w-8 text-teal-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">
                            {locality.name}, {locality.city}
                          </h3>
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{locality.rating}</span>
                            <span className="text-muted-foreground">
                              • ({locality.reviews} Reviews)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Pricing Info */}
                      <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Average Sale Price</p>
                          <p className="font-semibold">
                            R {locality.avgSalePrice.toLocaleString()}/m²
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Average Rental</p>
                          <p className="font-semibold">R {locality.avgRental}/m²</p>
                        </div>
                      </div>

                      {/* Property Links */}
                      <div className="space-y-2">
                        <a
                          href="#"
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                        >
                          <div>
                            <p className="font-medium text-sm">
                              {locality.propertiesForSale.toLocaleString()} Properties for Sale
                            </p>
                            <p className="text-xs text-muted-foreground">
                              in {locality.name}, {locality.city}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                        </a>
                        <a
                          href="#"
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                        >
                          <div>
                            <p className="font-medium text-sm">
                              {locality.propertiesForRent.toLocaleString()} Properties for Rent
                            </p>
                            <p className="text-xs text-muted-foreground">
                              in {locality.name}, {locality.city}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          <Button
            variant="secondary"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 rounded-full shadow-lg z-10"
            onClick={scrollPrev}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 rounded-full shadow-lg z-10"
            onClick={scrollNext}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* View All Link */}
        <div className="mt-6">
          <a
            href="#"
            className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
          >
            Localities in {selectedCity}
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
