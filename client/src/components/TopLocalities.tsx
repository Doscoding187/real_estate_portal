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
  Bloemfontein: [
    {
      name: 'Westdene',
      city: 'Bloemfontein',
      rating: 4.3,
      reviews: 11,
      avgSalePrice: 18500,
      avgRental: 120,
      propertiesForSale: 890,
      propertiesForRent: 1120,
    },
    {
      name: 'Langenhovenpark',
      city: 'Bloemfontein',
      rating: 4.4,
      reviews: 9,
      avgSalePrice: 22300,
      avgRental: 145,
      propertiesForSale: 720,
      propertiesForRent: 980,
    },
    {
      name: 'Bayswater',
      city: 'Bloemfontein',
      rating: 4.2,
      reviews: 8,
      avgSalePrice: 16800,
      avgRental: 110,
      propertiesForSale: 560,
      propertiesForRent: 780,
    },
    {
      name: 'Pellissier',
      city: 'Bloemfontein',
      rating: 4.1,
      reviews: 7,
      avgSalePrice: 15200,
      avgRental: 95,
      propertiesForSale: 480,
      propertiesForRent: 650,
    },
  ],
  Gqeberha: [
    {
      name: 'Summerstrand',
      city: 'Gqeberha',
      rating: 4.5,
      reviews: 14,
      avgSalePrice: 24500,
      avgRental: 165,
      propertiesForSale: 1120,
      propertiesForRent: 1450,
    },
    {
      name: 'Walmer',
      city: 'Gqeberha',
      rating: 4.3,
      reviews: 12,
      avgSalePrice: 21800,
      avgRental: 145,
      propertiesForSale: 980,
      propertiesForRent: 1280,
    },
    {
      name: 'Mill Park',
      city: 'Gqeberha',
      rating: 4.4,
      reviews: 10,
      avgSalePrice: 26200,
      avgRental: 175,
      propertiesForSale: 720,
      propertiesForRent: 890,
    },
    {
      name: 'Newton Park',
      city: 'Gqeberha',
      rating: 4.2,
      reviews: 9,
      avgSalePrice: 18900,
      avgRental: 125,
      propertiesForSale: 1340,
      propertiesForRent: 1780,
    },
  ],
  Polokwane: [
    {
      name: 'Bendor',
      city: 'Polokwane',
      rating: 4.3,
      reviews: 8,
      avgSalePrice: 16200,
      avgRental: 95,
      propertiesForSale: 560,
      propertiesForRent: 720,
    },
    {
      name: 'Flora Park',
      city: 'Polokwane',
      rating: 4.2,
      reviews: 7,
      avgSalePrice: 14800,
      avgRental: 85,
      propertiesForSale: 480,
      propertiesForRent: 620,
    },
    {
      name: 'Ivydale',
      city: 'Polokwane',
      rating: 4.1,
      reviews: 6,
      avgSalePrice: 12500,
      avgRental: 75,
      propertiesForSale: 340,
      propertiesForRent: 450,
    },
    {
      name: 'Sterpark',
      city: 'Polokwane',
      rating: 4.0,
      reviews: 5,
      avgSalePrice: 11200,
      avgRental: 70,
      propertiesForSale: 290,
      propertiesForRent: 380,
    },
  ],
  Kimberley: [
    {
      name: 'Hadison Park',
      city: 'Kimberley',
      rating: 4.2,
      reviews: 6,
      avgSalePrice: 12800,
      avgRental: 75,
      propertiesForSale: 320,
      propertiesForRent: 420,
    },
    {
      name: 'Diamond Park',
      city: 'Kimberley',
      rating: 4.1,
      reviews: 5,
      avgSalePrice: 11500,
      avgRental: 68,
      propertiesForSale: 280,
      propertiesForRent: 360,
    },
    {
      name: 'Royldene',
      city: 'Kimberley',
      rating: 4.0,
      reviews: 4,
      avgSalePrice: 10200,
      avgRental: 62,
      propertiesForSale: 240,
      propertiesForRent: 310,
    },
    {
      name: 'Monument Heights',
      city: 'Kimberley',
      rating: 4.3,
      reviews: 7,
      avgSalePrice: 14500,
      avgRental: 85,
      propertiesForSale: 180,
      propertiesForRent: 220,
    },
  ],
  Mbombela: [
    {
      name: 'West Acres',
      city: 'Mbombela',
      rating: 4.3,
      reviews: 9,
      avgSalePrice: 18500,
      avgRental: 110,
      propertiesForSale: 620,
      propertiesForRent: 780,
    },
    {
      name: 'Sonheuwel',
      city: 'Mbombela',
      rating: 4.2,
      reviews: 8,
      avgSalePrice: 16800,
      avgRental: 98,
      propertiesForSale: 540,
      propertiesForRent: 680,
    },
    {
      name: 'White River',
      city: 'Mbombela',
      rating: 4.4,
      reviews: 10,
      avgSalePrice: 22400,
      avgRental: 135,
      propertiesForSale: 480,
      propertiesForRent: 590,
    },
    {
      name: 'Riverside Park',
      city: 'Mbombela',
      rating: 4.1,
      reviews: 7,
      avgSalePrice: 15200,
      avgRental: 88,
      propertiesForSale: 380,
      propertiesForRent: 460,
    },
  ],
  Mahikeng: [
    {
      name: 'Riviera Park',
      city: 'Mahikeng',
      rating: 4.1,
      reviews: 5,
      avgSalePrice: 11800,
      avgRental: 68,
      propertiesForSale: 280,
      propertiesForRent: 350,
    },
    {
      name: 'Imperial Reserve',
      city: 'Mahikeng',
      rating: 4.2,
      reviews: 6,
      avgSalePrice: 13500,
      avgRental: 78,
      propertiesForSale: 240,
      propertiesForRent: 310,
    },
    {
      name: 'Golf View',
      city: 'Mahikeng',
      rating: 4.0,
      reviews: 4,
      avgSalePrice: 10200,
      avgRental: 60,
      propertiesForSale: 180,
      propertiesForRent: 230,
    },
    {
      name: 'Signal Hill',
      city: 'Mahikeng',
      rating: 4.1,
      reviews: 5,
      avgSalePrice: 12200,
      avgRental: 72,
      propertiesForSale: 220,
      propertiesForRent: 280,
    },
  ],
};

// 10 Major SA Cities (one per province)
const cities = [
  'Cape Town', // Western Cape
  'Johannesburg', // Gauteng
  'Durban', // KwaZulu-Natal
  'Pretoria', // Gauteng (admin capital)
  'Bloemfontein', // Free State
  'Gqeberha', // Eastern Cape
  'Polokwane', // Limpopo
  'Kimberley', // Northern Cape
  'Mbombela', // Mpumalanga
  'Mahikeng', // North West
];

interface TopLocalitiesProps {
  title?: string;
  subtitle?: string;
  locationName?: string;
}

export function TopLocalities({
  title,
  subtitle,
  locationName = 'South Africa',
}: TopLocalitiesProps = {}) {
  const [selectedCity, setSelectedCity] = useState('Cape Town');
  // Note: 'initialCity' needs to be defined or we just keep default. The original code didn't accept props.
  // Let's assume we stick to the original state logic but update the title.
  // Actually, I need to check where 'initialCity' would come from if I added it.
  // For now, let's just keep 'Johannesburg' as default state if logic hasn't changed,
  // but if I want to support filtering by location prop I might need more changes.
  // Given the request is about TITLES, I will focus on titles.

  const defaultTitle = `Top Localities in ${locationName}`;
  const defaultSubtitle = `Discover ${locationName}${locationName.endsWith('s') ? "'" : "'s"} best localities known for liveability, infrastructure, and connectivity. Explore top neighbourhoods offering insights on new construction, rental trends, and average prices.`;

  const displayTitle = title || defaultTitle;
  const displaySubtitle = subtitle || defaultSubtitle;

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
    'Cape Town': 'western-cape',
    Johannesburg: 'gauteng',
    Durban: 'kwazulu-natal',
    Pretoria: 'gauteng',
    Bloemfontein: 'free-state',
    Gqeberha: 'eastern-cape',
    Polokwane: 'limpopo',
    Kimberley: 'northern-cape',
    Mbombela: 'mpumalanga',
    Mahikeng: 'north-west',
  };

  const getCitySlug = (cityName: string) => cityName.toLowerCase().replace(/\s+/g, '-');
  const getProvinceSlug = (cityName: string) => cityProvinceMap[cityName] || 'properties';

  return (
    <div className="py-16 bg-muted/30">
      <div className="container">
        <div className="mb-8">
          <h2 className="text-xl md:text-[26px] font-bold text-slate-900 mb-2">{displayTitle}</h2>
          <p className="text-muted-foreground text-xs md:text-sm max-w-2xl">{displaySubtitle}</p>
        </div>

        {/* City Tabs */}
        <div className="flex justify-start mb-10">
          <div className="inline-flex flex-wrap justify-start gap-2 bg-white/80 backdrop-blur-sm p-2 rounded-2xl shadow-lg border border-slate-200/60 h-auto">
            {cities.map(city => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`
                  px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300
                  ${
                    selectedCity === city
                      ? 'bg-gradient-to-r from-[#2774AE] to-[#2D68C4] text-white shadow-lg scale-105'
                      : 'text-slate-600 hover:text-[#2774AE] hover:bg-blue-50/50'
                  }
                `}
              >
                {city}
              </button>
            ))}
          </div>
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
                    className="flex-[0_0_100%] min-w-0 sm:flex-[0_0_50%] lg:flex-[0_0_25%]"
                  >
                    <Card className="hover:shadow-xl transition-all duration-300 border-0 bg-white/50 backdrop-blur-sm group h-full">
                      <CardContent className="p-4">
                        {/* Header with map and locality name */}
                        <Link href={localityUrl}>
                          <div className="flex items-center gap-3 mb-4 cursor-pointer">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-teal-500/20 group-hover:scale-110 transition-transform duration-300">
                              <MapPin className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg mb-1 text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                {locality.name}
                              </h3>
                              <div className="flex items-center gap-2 text-xs">
                                <div className="flex items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded-md border border-yellow-100">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span className="font-bold text-yellow-700">
                                    {locality.rating}
                                  </span>
                                </div>
                                <span className="text-muted-foreground text-[10px]">
                                  ({locality.reviews} Reviews)
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>

                        {/* Pricing Info */}
                        <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-0.5 font-medium uppercase tracking-wide truncate">
                              Avg. Sale Price
                            </p>
                            <p className="font-bold text-sm text-gray-900 truncate">
                              R {locality.avgSalePrice.toLocaleString()}
                              <span className="text-[10px] text-muted-foreground font-normal">
                                /m²
                              </span>
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-0.5 font-medium uppercase tracking-wide truncate">
                              Avg. Rental
                            </p>
                            <p className="font-bold text-sm text-gray-900 truncate">
                              R {locality.avgRental}
                              <span className="text-[10px] text-muted-foreground font-normal">
                                /m²
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Property Links */}
                        <div className="space-y-2">
                          <Link
                            href={`${localityUrl}?listingType=sale`}
                            className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all group/link"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-gray-900 group-hover/link:text-blue-600 transition-colors truncate">
                                {locality.propertiesForSale.toLocaleString()} Properties for Sale
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                in {locality.name}
                              </p>
                            </div>
                            <div className="h-6 w-6 rounded-full bg-gray-50 flex items-center justify-center group-hover/link:bg-blue-50 transition-colors flex-shrink-0">
                              <ArrowRight className="h-3 w-3 text-gray-400 group-hover/link:text-blue-600 group-hover/link:translate-x-0.5 transition-all" />
                            </div>
                          </Link>
                          <Link
                            href={`${localityUrl}?listingType=rent`}
                            className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all group/link"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-gray-900 group-hover/link:text-blue-600 transition-colors truncate">
                                {locality.propertiesForRent.toLocaleString()} Properties for Rent
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                in {locality.name}
                              </p>
                            </div>
                            <div className="h-6 w-6 rounded-full bg-gray-50 flex items-center justify-center group-hover/link:bg-blue-50 transition-colors flex-shrink-0">
                              <ArrowRight className="h-3 w-3 text-gray-400 group-hover/link:text-blue-600 group-hover/link:translate-x-0.5 transition-all" />
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
            className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium outline-none text-white rounded-md gap-2 h-12 px-8 bg-gradient-to-r from-[#2774AE] to-[#2D68C4] hover:from-[#2D68C4] hover:to-[#2774AE] shadow-lg hover:shadow-xl transition-all duration-300 group"
          >
            Explore All in {selectedCity}
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
