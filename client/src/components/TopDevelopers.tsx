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
          <h2 className="text-fluid-h2 font-bold mb-3 bg-gradient-to-r from-slate-900 via-[#2774AE] to-slate-900 bg-clip-text text-transparent">
            Top Developers in South Africa
          </h2>
          <p className="text-slate-600 text-lg max-w-3xl leading-relaxed">
            In real estate, the builder you choose makes a genuine difference. Our list of top
            developers features names that are industry leaders in customer satisfaction, design,
            and timely delivery. These brands have shaped the skyline with thoughtful living spaces.
            Know who's building your future before you invest.
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
                  <CarouselItem key={developer.id} className="pl-6 md:basis-1/2 lg:basis-1/4">
                    <Card className="h-full border border-slate-200 hover:border-slate-300 transition-colors bg-white rounded-xl shadow-sm hover:shadow-md">
                      <CardContent className="p-4">
                        {/* Header: Logo & Identity */}
                        <div className="flex gap-4 mb-4">
                          <div className="w-14 h-14 flex-shrink-0 bg-white border border-slate-100 rounded-lg p-2 flex items-center justify-center">
                            {developer.logoUrl ? (
                              <img
                                src={developer.logoUrl}
                                alt={developer.brandName}
                                className="max-w-full max-h-full object-contain"
                              />
                            ) : (
                              <Building2 className="h-6 w-6 text-slate-300" />
                            )}
                          </div>
                          <div className="flex flex-col justify-center min-w-0">
                            <h3 className="text-lg font-bold text-slate-900 leading-tight mb-0.5 truncate">
                              {developer.brandName}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium truncate">
                              {developer.headOfficeLocation || 'South Africa'}
                            </p>
                          </div>
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center justify-between mb-4 px-1">
                          <div className="flex flex-col">
                            <span className="text-xl font-bold text-slate-900">
                              {developer.stats?.totalProjects || 0}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                              Projects
                            </span>
                          </div>

                          <div className="flex flex-col text-right">
                            <span className="text-xl font-bold text-slate-900">
                              {developer.stats?.experience || 0}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                              Experience
                            </span>
                          </div>
                        </div>

                        {/* Status Links (Interactive Rows) */}
                        <div className="space-y-2">
                          <button
                            className="w-full flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50 group transition-colors"
                            onClick={() =>
                              setLocation(`/developer/${developer.slug}?status=ready-to-move`)
                            }
                          >
                            <span className="text-xs text-slate-700 font-medium truncate">
                              Ready to Move ({developer.stats?.readyToMove || 0})
                            </span>
                            <ChevronRight className="h-3 w-3 text-slate-400 group-hover:text-slate-600 flex-shrink-0" />
                          </button>

                          <button
                            className="w-full flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50 group transition-colors"
                            onClick={() =>
                              setLocation(`/developer/${developer.slug}?status=under-construction`)
                            }
                          >
                            <span className="text-xs text-slate-700 font-medium truncate">
                              Under Const. ({developer.stats?.underConstruction || 0})
                            </span>
                            <ChevronRight className="h-3 w-3 text-slate-400 group-hover:text-slate-600 flex-shrink-0" />
                          </button>

                          <button
                            className="w-full flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50 group transition-colors"
                            onClick={() =>
                              setLocation(`/developer/${developer.slug}?status=new-launch`)
                            }
                          >
                            <span className="text-xs text-slate-700 font-medium truncate">
                              New Launch ({developer.stats?.newLaunch || 0})
                            </span>
                            <ChevronRight className="h-3 w-3 text-slate-400 group-hover:text-slate-600 flex-shrink-0" />
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
            onClick={() => setLocation('/developers')}
            className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium outline-none text-white rounded-md gap-2 h-12 px-8 bg-gradient-to-r from-[#2774AE] to-[#2D68C4] hover:from-[#2D68C4] hover:to-[#2774AE] shadow-lg hover:shadow-xl transition-all duration-300 group"
          >
            Explore All Developers
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
}
