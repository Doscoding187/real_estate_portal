import { useState, useCallback } from 'react';
import { Link } from 'wouter';
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

  const cityProvinceMap: Record<string, string> = {
    Johannesburg: 'gauteng',
    'Cape Town': 'western-cape',
    Pretoria: 'gauteng',
    Durban: 'kwazulu-natal',
  };

  const getCitySlug = (cityName: string) => cityName.toLowerCase().replace(/\s+/g, '-');
  const getProvinceSlug = (cityName: string) => cityProvinceMap[cityName] || 'properties';

  return (
    <div className="py-16 bg-muted/30">
      <div className="container">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Top Localities in South Africa</h2>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Discover South Africa's best localities known for liveability, infrastructure, and
            connectivity. Explore top neighbourhoods in major cities, offering insights on new
            construction, rental trends, and average prices.
          </p>
        </div>

        {/* City Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {cities.map(city => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`
                px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 border
                ${
                  selectedCity === city
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-md scale-105'
                    : 'bg-white text-muted-foreground border-gray-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600'
                }
              `}
            >
              {city}
            </button>
          ))}
        </div>

        {/* Localities Carousel */}
        <div className="relative group/carousel">
          <div className="overflow-hidden rounded-xl" ref={emblaRef}>
            <div className="flex gap-6">
              {localities.map((locality, idx) => {
                const provinceSlug = getProvinceSlug(locality.city);
                const citySlug = getCitySlug(locality.city);
                const suburbSlug = locality.name.toLowerCase().replace(/\s+/g, '-');
                // Construct URL correctly
                const localityUrl = `/${provinceSlug}/${citySlug}/${suburbSlug}`;
                
                return (
                <div
                  key={idx}
                  className="flex-[0_0_100%] min-w-0 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]"
                >
                  <Card className="hover:shadow-xl transition-all duration-300 border-0 bg-white/50 backdrop-blur-sm group h-full">
                    <CardContent className="p-6">
                      {/* Header with map and locality name */}
                      <Link href={localityUrl}>
                      <div className="flex items-start gap-4 mb-6 cursor-pointer">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-teal-500/20 group-hover:scale-110 transition-transform duration-300">
                          <MapPin className="h-8 w-8 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-xl mb-2 text-gray-900 group-hover:text-blue-600 transition-colors">
                            {locality.name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-md border border-yellow-100">
                              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                              <span className="font-bold text-yellow-700">{locality.rating}</span>
                            </div>
                            <span className="text-muted-foreground text-xs">
                              ({locality.reviews} Reviews)
                            </span>
                          </div>
                        </div>
                      </div>
                      </Link>

                      {/* Pricing Info */}
                      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Avg. Sale Price</p>
                          <p className="font-bold text-gray-900">
                            R {locality.avgSalePrice.toLocaleString()}<span className="text-xs text-muted-foreground font-normal">/m²</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Avg. Rental</p>
                          <p className="font-bold text-gray-900">
                            R {locality.avgRental}<span className="text-xs text-muted-foreground font-normal">/m²</span>
                          </p>
                        </div>
                      </div>

                      {/* Property Links */}
                      <div className="space-y-3">
                        <Link
                          href={`${localityUrl}?listingType=sale`}
                          className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group/link"
                        >
                          <div>
                            <p className="font-semibold text-sm text-gray-900 group-hover/link:text-blue-600 transition-colors">
                              {locality.propertiesForSale.toLocaleString()} Properties for Sale
                            </p>
                            <p className="text-xs text-muted-foreground">
                              in {locality.name}
                            </p>
                          </div>
                          <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center group-hover/link:bg-blue-50 transition-colors">
                            <ArrowRight className="h-4 w-4 text-gray-400 group-hover/link:text-blue-600 group-hover/link:translate-x-0.5 transition-all" />
                          </div>
                        </Link>
                        <Link
                          href={`${localityUrl}?listingType=rent`}
                          className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group/link"
                        >
                          <div>
                            <p className="font-semibold text-sm text-gray-900 group-hover/link:text-blue-600 transition-colors">
                              {locality.propertiesForRent.toLocaleString()} Properties for Rent
                            </p>
                            <p className="text-xs text-muted-foreground">
                              in {locality.name}
                            </p>
                          </div>
                          <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center group-hover/link:bg-blue-50 transition-colors">
                            <ArrowRight className="h-4 w-4 text-gray-400 group-hover/link:text-blue-600 group-hover/link:translate-x-0.5 transition-all" />
                          </div>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                );
              })}
            </div>
          </div>

          {/* Navigation Buttons */}
          <Button
            variant="secondary"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 rounded-full shadow-lg z-10 opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:scale-110 bg-white/90 hover:bg-white text-blue-900"
            onClick={scrollPrev}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 rounded-full shadow-lg z-10 opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:scale-110 bg-white/90 hover:bg-white text-blue-900"
            onClick={scrollNext}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* View All Link */}
        <div className="mt-8 text-center md:text-left">
          <Link
            href={`/${getProvinceSlug(selectedCity)}/${getCitySlug(selectedCity)}`}
            className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-colors"
          >
            View all localities in {selectedCity}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
