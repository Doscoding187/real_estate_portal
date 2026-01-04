import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, Building2, MapPin, ArrowRight } from 'lucide-react';
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

  // Fetch visible brand profiles (now enriched with stats)
  const { data: developers, isLoading } = trpc.brandProfile.listBrandProfiles.useQuery({
    isVisible: true,
    limit: 12,
  });

  if (!isLoading && (!developers || developers.length === 0)) {
    return null;
  }

  return (
    <section className="py-fluid-xl bg-white">
      <div className="container">
        {/* Section Header */}
        <div className="mb-8">
           <h2 className="text-fluid-h2 font-bold mb-3 text-slate-900">
            Top Developers in South Africa
          </h2>
          <p className="text-slate-600 text-fluid-h4 max-w-4xl">
            In real estate, the builder you choose makes a genuine difference. Our list of top developers 
            features names that are industry leaders in customer satisfaction, design, and timely delivery. 
            These brands have shaped the skyline with thoughtful living spaces. Know who's building your future before you invest.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="border-slate-200">
                <CardContent className="p-6">
                  <div className="flex gap-4 mb-4">
                    <Skeleton className="w-20 h-20 rounded-xl" />
                    <div className="flex-1 space-y-2">
                       <Skeleton className="h-5 w-3/4" />
                       <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-20 w-full mb-4" />
                  <div className="space-y-2">
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-full" />
                  </div>
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
                loop: false, 
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-6">
                {developers?.map((developer: any) => (
                  <CarouselItem key={developer.id} className="pl-6 md:basis-1/2 lg:basis-1/3">
                    <Card 
                      className="h-full border border-slate-200 hover:border-slate-300 transition-colors bg-white rounded-xl shadow-sm hover:shadow-md"
                    >
                      <CardContent className="p-6">
                        {/* Header: Logo & Identity */}
                        <div className="flex gap-4 mb-6">
                          <div className="w-20 h-20 flex-shrink-0 bg-white border border-slate-100 rounded-lg p-2 flex items-center justify-center">
                            {developer.logoUrl ? (
                              <img
                                src={developer.logoUrl}
                                alt={developer.brandName}
                                className="max-w-full max-h-full object-contain"
                              />
                            ) : (
                               <Building2 className="h-8 w-8 text-slate-300" />
                            )}
                          </div>
                          <div className="flex flex-col justify-center">
                            <h3 className="text-xl font-bold text-slate-900 leading-tight mb-1">
                              {developer.brandName}
                            </h3>
                            <p className="text-sm text-slate-500 font-medium">
                              {developer.headOfficeLocation || 'South Africa'}
                            </p>
                           {/*  Optional: Add "Add Prestige to your life" tagline if available in future schemas */}
                          </div>
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center justify-between mb-6 px-2">
                             <div className="flex flex-col">
                                 <span className="text-2xl font-bold text-slate-900">
                                     {developer.stats?.totalProjects || 0}
                                 </span>
                                 <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                                     Total Projects
                                 </span>
                             </div>
                             
                             {/* Vertical Divider could go here if needed */}
                             
                             <div className="flex flex-col text-right">
                                 <span className="text-2xl font-bold text-slate-900">
                                     {developer.stats?.experience || 0}
                                 </span>
                                 <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                                     Experience
                                 </span>
                             </div>
                        </div>

                        {/* Status Links (Interactive Rows) */}
                        <div className="space-y-3">
                            <button 
                                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 group transition-colors"
                                onClick={() => setLocation(`/developer/${developer.slug}?status=ready-to-move`)}
                            >
                                <span className="text-slate-700 font-medium">Ready to Move ({developer.stats?.readyToMove || 0})</span>
                                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                            </button>

                            <button 
                                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 group transition-colors"
                                onClick={() => setLocation(`/developer/${developer.slug}?status=under-construction`)}
                            >
                                <span className="text-slate-700 font-medium">Under Construction ({developer.stats?.underConstruction || 0})</span>
                                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                            </button>

                             <button 
                                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 group transition-colors"
                                onClick={() => setLocation(`/developer/${developer.slug}?status=new-launch`)}
                            >
                                <span className="text-slate-700 font-medium">New Launch ({developer.stats?.newLaunch || 0})</span>
                                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                            </button>
                        </div>

                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex -left-4 bg-white shadow-md border-slate-200 text-slate-600 hover:text-slate-900" />
              <CarouselNext className="hidden md:flex -right-4 bg-white shadow-md border-slate-200 text-slate-600 hover:text-slate-900" />
            </Carousel>
          </div>
        )}

        {/* View All Footer */}
        <div className="mt-8">
          <Button 
            variant="link" 
            onClick={() => setLocation('/developers')}
            className="text-slate-900 font-bold hover:no-underline p-0 flex items-center gap-2 text-base"
          >
            View All Developers in South Africa
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
