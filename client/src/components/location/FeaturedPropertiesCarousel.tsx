import React, { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowRight, Star, Building2, MapPin } from 'lucide-react';
import PropertyCard from '@/components/PropertyCard';
import { normalizePropertyForUI } from '@/lib/normalizers';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'; // Assuming standard Shadcn tabs
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface FeaturedPropertiesCarouselProps {
  locationId: number;
  locationName: string;
  locationScope: 'city' | 'suburb' | 'province';
}

export function FeaturedPropertiesCarousel({
  locationId,
  locationName,
  locationScope,
}: FeaturedPropertiesCarouselProps) {
  // 1. Fetch featured properties with aggregation for sub-locations
  // Ideally this TRPC endpoint would return groups: { all: [], subLocA: [], subLocB: [] }
  // For now, we'll simulate tabs by fetching a broad list and client-side filtering or just showing "All"
  // until the backend supports "getTopSellingBySubLocation"

  // We'll use a generic "getFeatured" query for now
  const { data: listings, isLoading } = trpc.location.getFeaturedListings.useQuery({
    locationId,
    limit: 20, // Fetch enough to potentially populate tabs
  });

  const [activeTab, setActiveTab] = useState('all');

  if (isLoading || !listings || listings.length === 0) return null;

  // derived tabs logic (simulated for now)
  // In a real implementation, we'd group these listings by their sub-suburb or fetch distinct groups
  const tabs = [
    { id: 'all', label: `All ${locationName}` },
    // Future: { id: 'morningside', label: 'Morningside' },
    // Future: { id: 'bryanston', label: 'Bryanston' },
  ];

  return (
    <div className="py-12 bg-white">
      <div className="container">
        <div className="flex flex-col mb-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2 text-yellow-600">
              <Star className="h-5 w-5 fill-yellow-600" />
              <span className="font-semibold uppercase tracking-wider text-sm">
                Top Selling Projects
              </span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">
              Top Selling Projects in {locationName}
            </h2>
            <p className="mt-2 text-slate-600 max-w-3xl">
              Discover high-demand residential developments and properties.
            </p>
          </div>

          {/* Controls Row: Tabs + View All */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList className="bg-slate-100 h-10 p-1">
                {tabs.map(tab => (
                  <TabsTrigger key={tab.id} value={tab.id} className="px-4">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <Link href={`/search?location=${locationName}&sort=popular`}>
              <Button
                variant="ghost"
                className="group text-primary hover:text-primary-700 hover:bg-primary-50 pl-0 md:pl-4"
              >
                View all {listings.length} projects
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Carousel Area */}
        <div className="relative">
          <Carousel className="w-full" opts={{ align: 'start', loop: true }}>
            <CarouselContent className="-ml-4 pb-4">
              {listings.slice(0, 10).map(item => {
                // Limit 10 slots per tab spec
                const property = normalizePropertyForUI(item);
                if (!property) return null;
                return (
                  <CarouselItem
                    key={item.id}
                    className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                  >
                    <PropertyCard {...property} />
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-5 h-12 w-12 border-slate-200 bg-white shadow-lg" />
            <CarouselNext className="hidden md:flex -right-5 h-12 w-12 border-slate-200 bg-white shadow-lg" />
          </Carousel>
        </div>
      </div>
    </div>
  );
}
