import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

interface TrendingLocation {
  id: number;
  name: string;
  cityName?: string;
  listingCount: number;
  growth?: number;
}

interface TrendingSliderProps {
  locations: TrendingLocation[];
  provinceSlug: string;
}

export function TrendingSlider({ locations, provinceSlug }: TrendingSliderProps) {
  const getUrl = (loc: TrendingLocation) => {
    // Assuming structure /province/city/suburb
    // We need city slug. If not provided, we might have issues constructing full URL
    // For now, doing best effort if city name is present
    if (!loc.cityName) return '#';
    const citySlug = loc.cityName.toLowerCase().replace(/\s+/g, '-');
    const suburbSlug = loc.name.toLowerCase().replace(/\s+/g, '-');
    return `/${provinceSlug}/${citySlug}/${suburbSlug}`;
  };

  return (
    <div className="py-12 bg-white border-y border-slate-100">
      <div className="container">
        <div className="flex justify-between items-end mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2 text-primary">
              <TrendingUp className="h-5 w-5" />
              <span className="font-semibold uppercase tracking-wider text-sm">
                Market Hotspots
              </span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">Trending Suburbs</h2>
          </div>
          <div className="hidden md:flex gap-2">
            {/* Carousel controls custom navigation hooks could be placed here if context available */}
          </div>
        </div>

        <Carousel className="w-full">
          <CarouselContent className="-ml-4">
            {locations.map(loc => (
              <CarouselItem key={loc.id} className="pl-4 md:basis-1/3 lg:basis-1/4">
                <Link href={getUrl(loc)}>
                  <Card className="h-full hover:shadow-lg transition-all cursor-pointer border-slate-200 group">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {loc.name.charAt(0)}
                        </div>
                        {loc.growth && (
                          <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold flex items-center">
                            <TrendingUp className="h-3 w-3 mr-1" />+{loc.growth}%
                          </div>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-primary transition-colors">
                        {loc.name}
                      </h3>
                      <p className="text-sm text-slate-500 mb-4">{loc.cityName}</p>

                      <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-sm">
                        <span className="text-slate-600">{loc.listingCount} Properties</span>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-12" />
          <CarouselNext className="hidden md:flex -right-12" />
        </Carousel>
      </div>
    </div>
  );
}
