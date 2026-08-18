import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowRight, Building2 } from 'lucide-react';
import PropertyCard from '@/components/PropertyCard';
import { searchCardResultToPropertyCardProps } from '@/lib/normalizers';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { trpc } from '@/lib/trpc';
import { buildBuySearchUrl } from '@/lib/heroJourneySearch';
import type { LocationNode } from '@/types/location';

interface FeaturedPropertiesCarouselProps {
  location: LocationNode & { canonicalLocationId: string };
}

export function FeaturedPropertiesCarousel({ location }: FeaturedPropertiesCarouselProps) {
  const { data: listings, isLoading } = trpc.location.getFeaturedListings.useQuery({
    locationId: location.canonicalLocationId,
    limit: 10,
  });
  const viewAllHref = buildBuySearchUrl({ selectedLocations: [location] });

  if (isLoading || !listings || listings.length === 0) return null;

  return (
    <div className="py-12 bg-white">
      <div className="container">
        <div className="flex flex-col mb-8">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2 text-primary">
              <Building2 className="h-5 w-5" />
              <span className="font-semibold uppercase tracking-wider text-sm">
                Available to buy
              </span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">
              Properties for sale in {location.name}
            </h2>
            <p className="mt-2 text-slate-600 max-w-3xl">
              Explore current homes and new-development opportunities from published inventory.
            </p>
          </div>

          <div className="flex justify-start md:justify-end">
            <Link href={viewAllHref}>
              <Button
                variant="ghost"
                className="group text-primary hover:text-primary-700 hover:bg-primary-50 pl-0 md:pl-4"
              >
                View all properties for sale
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative">
          <Carousel className="w-full" opts={{ align: 'start', loop: true }}>
            <CarouselContent className="-ml-4 pb-4">
              {listings.map(card => (
                <CarouselItem
                  key={`${card.kind}:${card.id}`}
                  className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                >
                  <PropertyCard {...searchCardResultToPropertyCardProps(card)} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-5 h-12 w-12 border-slate-200 bg-white shadow-lg" />
            <CarouselNext className="hidden md:flex -right-5 h-12 w-12 border-slate-200 bg-white shadow-lg" />
          </Carousel>
        </div>
      </div>
    </div>
  );
}
