import { Link, useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, ChevronRight, ArrowRight, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { trpc } from '@/lib/trpc';

export function TopDevelopers() {
  const [, setLocation] = useLocation();

  // Fetch visible brand profiles
  const { data: developers, isLoading } = trpc.brandProfile.listBrandProfiles.useQuery({
    isVisible: true,
    limit: 12, // Increased limit for carousel
  });

  const tierBadgeColor: Record<string, string> = {
    national: 'bg-indigo-100 text-indigo-700',
    regional: 'bg-blue-100 text-blue-700',
    boutique: 'bg-emerald-100 text-emerald-700',
  };

  if (!isLoading && (!developers || developers.length === 0)) {
    return null;
  }

  return (
    <section className="py-fluid-xl bg-muted/30">
      <div className="container">
        {/* Section Header */}
        <div className="mb-8">
           <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-full px-4 py-2 mb-4">
            <Building2 className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-700">Property Developers</span>
          </div>
          <h2 className="text-fluid-h2 font-bold mb-3 bg-gradient-to-r from-slate-900 via-[#2774AE] to-slate-900 bg-clip-text text-transparent">
            Recognised Property Developers
          </h2>
          <p className="text-muted-foreground text-fluid-h4 max-w-2xl">
            Discover developments from leading property developers across South Africa.
            Proven track records, high-quality construction, and trusted delivery.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border-slate-200">
                <CardContent className="p-6">
                  <Skeleton className="w-16 h-16 rounded-xl mb-4" />
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Developers Carousel */
          <div className="relative group/carousel">
            <Carousel
              opts={{
                align: 'start',
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-6">
                {developers?.map((developer) => (
                  <CarouselItem key={developer.id} className="pl-6 md:basis-1/2 lg:basis-1/4">
                    <Card 
                      className="h-full hover:shadow-xl transition-all duration-300 border-slate-200 hover:border-indigo-300 bg-white/50 backdrop-blur-sm group cursor-pointer"
                      onClick={() => setLocation(`/developer/${developer.slug}`)}
                    >
                      <CardContent className="p-6 text-center">
                        {/* Developer Logo */}
                        <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-white flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm border border-slate-200 group-hover:scale-105 transition-transform duration-300 group-hover:border-indigo-300">
                          {developer.logoUrl ? (
                            <img
                              src={developer.logoUrl}
                              alt={developer.brandName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-indigo-600 text-white text-xl font-bold">
                              {developer.brandName.charAt(0)}
                            </div>
                          )}
                        </div>

                        {/* Developer Name */}
                        <div className="min-w-0">
                          <h3 className="font-bold text-lg mb-2 text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                            {developer.brandName}
                          </h3>
                          
                          {/* Tier Badge */}
                          {developer.brandTier && (
                             <Badge 
                               className={`${tierBadgeColor[developer.brandTier] || 'bg-slate-100 text-slate-600'} border-0 text-xs px-2 py-0.5 pointer-events-none`}
                             >
                               {developer.brandTier.charAt(0).toUpperCase() + developer.brandTier.slice(1)}
                             </Badge>
                          )}

                          {/* Location */}
                           {developer.headOfficeLocation && (
                            <p className="text-xs text-slate-500 mt-3 flex items-center justify-center gap-1 truncate">
                              <MapPin className="h-3 w-3" />
                              {developer.headOfficeLocation}
                            </p>
                          )}
                        
                        </div>
                         
                         {/* View Profile CTA (Hidden hover effect) */}
                         <div className="mt-4 pt-4 border-t border-slate-100 opacity-60 group-hover:opacity-100 transition-opacity">
                             <div className="text-xs font-medium text-indigo-600 flex items-center justify-center gap-1">
                                 View Profile <ArrowRight className="h-3 w-3" />
                             </div>
                         </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex -left-4 opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 bg-white/90 hover:bg-white text-indigo-900 border-0 shadow-lg hover:scale-110" />
              <CarouselNext className="hidden md:flex -right-4 opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 bg-white/90 hover:bg-white text-indigo-900 border-0 shadow-lg hover:scale-110" />
            </Carousel>
          </div>
        )}

        {/* View All Link */}
        <div className="mt-8 text-center md:text-left flex justify-center md:justify-start">
          <Button 
            variant="link" 
            onClick={() => setLocation('/developers')}
            className="text-lg font-semibold group text-indigo-600 hover:text-indigo-700 p-0 h-auto hover:no-underline"
          >
            View All Real Estate Developers in South Africa
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
}
