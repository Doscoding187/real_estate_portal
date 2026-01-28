import React, { useCallback } from 'react';
import { Link } from 'wouter';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Star, ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export interface Locality {
  name: string;
  rating: number;
  reviews: number;
  avgSalePrice: number;
  avgRental: number;
  propertiesForSale: number;
  propertiesForRent: number;
}

interface LocationTopLocalitiesProps {
  localities: Locality[];
  locationName: string;
}

export function LocationTopLocalities({ localities, locationName }: LocationTopLocalitiesProps) {
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

  if (!localities || localities.length === 0) return null;

  return (
    <section className="py-16 bg-muted/30" aria-label={`Top localities in ${locationName}`}>
      <div className="container">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Top Localities in {locationName}</h2>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Discover the best neighbourhoods in {locationName} known for liveability,
            infrastructure, and connectivity.
          </p>
        </div>

        {/* Localities Carousel */}
        <div className="relative group/carousel">
          <div className="overflow-hidden rounded-xl" ref={emblaRef}>
            <div className="flex gap-6">
              {localities.map((locality, idx) => {
                // Basic slug generation (should ideally come from backend or be more robust)
                const localitySlug = locality.name.toLowerCase().replace(/\s+/g, '-');
                // Construct generic URL - assuming simple structure or passed in prop
                const localityUrl = `/${locationName.toLowerCase().replace(/\s+/g, '-')}/${localitySlug}`;

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
                                  <span className="font-bold text-yellow-700">
                                    {locality.rating}
                                  </span>
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
                            <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">
                              Avg. Sale Price
                            </p>
                            <p className="font-bold text-gray-900">
                              R {locality.avgSalePrice.toLocaleString()}
                              <span className="text-xs text-muted-foreground font-normal">/m²</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">
                              Avg. Rental
                            </p>
                            <p className="font-bold text-gray-900">
                              R {locality.avgRental}
                              <span className="text-xs text-muted-foreground font-normal">/m²</span>
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
                              <p className="text-xs text-muted-foreground">in {locality.name}</p>
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
                              <p className="text-xs text-muted-foreground">in {locality.name}</p>
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
          <div className="hidden md:block">
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
        </div>

        {/* View All */}
        <div className="mt-8 text-center md:text-left">
          <Link
            href={`/properties/for-sale/property/${locationName.toLowerCase().replace(/\s+/g, '-')}`}
            className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-colors"
          >
            View all localities in {locationName}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
