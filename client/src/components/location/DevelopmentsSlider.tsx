import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowRight, Building2 } from 'lucide-react';
import { SimpleDevelopmentCard } from '@/components/SimpleDevelopmentCard';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

interface DevelopmentsSliderProps {
  developments: any[]; // Using any to be flexible with backend return type
  locationName: string;
}

export function DevelopmentsSlider({ developments, locationName }: DevelopmentsSliderProps) {
  if (!developments || developments.length === 0) return null;

  return (
    <div className="py-16 bg-white overflow-hidden">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-orange-600">
              <Building2 className="h-5 w-5" />
              <span className="font-semibold uppercase tracking-wider text-sm">Trending Projects</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">High-Demand Developments in {locationName}</h2>
            <p className="text-slate-500 mt-2 max-w-2xl">
              Projects buyers are actively viewing in this area
            </p>
          </div>
          <Link href="/developments">
            <Button variant="outline" className="group hidden md:flex">
              View All Developments
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        <div className="relative">
          <Carousel className="w-full">
            <CarouselContent className="-ml-4">
              {developments.map((dev) => {
                 // Handle image parsing safely
                 let mainImage = '';
                 if (Array.isArray(dev.images) && dev.images.length > 0) {
                   mainImage = dev.images[0];
                 } else if (typeof dev.images === 'string') {
                    try {
                       // Sometimes comes as JSON string
                       const parsed = JSON.parse(dev.images);
                       mainImage = Array.isArray(parsed) ? parsed[0] : parsed;
                    } catch {
                       mainImage = dev.images;
                    }
                 }

                 return (
                  <CarouselItem key={dev.id} className="pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                    <Link href={`/development/${dev.id}`}>
                      <div className="cursor-pointer group h-full">
                        <SimpleDevelopmentCard 
                          id={dev.id.toString()}
                          title={dev.name}
                          city={dev.city}
                          priceRange={{
                            min: dev.minPrice || (dev.price || 0), // Handle both potential field names
                            max: 0
                          }}
                          image={mainImage || 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image'}
                          isHotSelling={!!dev.isHotSelling}
                          isHighDemand={!!dev.isHighDemand}
                        />
                      </div>
                    </Link>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <div className="hidden lg:block">
              <CarouselPrevious className="-left-12" />
              <CarouselNext className="-right-12" />
            </div>
          </Carousel>
        </div>

        <div className="mt-8 md:hidden text-center">
          <Link href="/developments">
            <Button variant="outline" className="group w-full">
              View All Developments
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
