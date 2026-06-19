import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, Building2, ArrowRight } from 'lucide-react';
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
  const displayMetric = (value: unknown, fallback = 'Info soon') => {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? String(num) : fallback;
  };
  const displayCount = (value: unknown, fallback = 'Soon') => {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? String(num) : fallback;
  };
  const hasNumericValue = (value: unknown) => {
    const num = Number(value);
    return Number.isFinite(num) && num > 0;
  };

  // Fetch visible brand profiles (now enriched with stats)
  const { data: developers, isLoading } = trpc.brandProfile.listBrandProfiles.useQuery({
    isVisible: true,
    limit: 12,
  });
  const hasDevelopers = Boolean(developers && developers.length > 0);
  const compactDevelopers = developers?.slice(0, 10) ?? [];

  return (
    <section className="home-section bg-white">
      <div className="container">
        {/* Section Header */}
        <div className="home-section-header">
          <h2 className="home-section-title text-[1.125rem] sm:text-xl md:text-[26px] font-bold text-slate-900">
            Connect with trusted property developers
          </h2>
          <p className="text-slate-600 max-w-3xl leading-relaxed text-xs md:text-sm">
            Explore developer profiles, active project pipelines, and new development opportunities
            across South Africa.
          </p>
        </div>

        {isLoading ? (
          <div className="home-card-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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
        ) : hasDevelopers ? (
          /* Developers Carousel */
          <div className="relative group/carousel">
            <Carousel
              opts={{
                align: 'start',
                loop: false,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2">
                {compactDevelopers.map((developer: any) => (
                  <CarouselItem
                    key={developer.id}
                    className="pl-2 basis-[78%] sm:basis-[56%] md:basis-1/2 lg:basis-1/4"
                  >
                    <Card className="h-full border border-slate-200 hover:border-slate-300 transition-colors bg-white rounded-xl shadow-sm hover:shadow-md">
                      <CardContent className="p-3.5 sm:p-4">
                        {/* Header: Logo & Identity */}
                        <div className="flex gap-3 mb-3">
                          <div className="w-12 h-12 flex-shrink-0 bg-white border border-slate-100 rounded-lg p-2 flex items-center justify-center">
                            {developer.logoUrl ? (
                              <img
                                src={developer.logoUrl}
                                alt={developer.brandName}
                                className="max-w-full max-h-full object-contain"
                              />
                            ) : (
                              <Building2 className="h-5 w-5 text-slate-300" />
                            )}
                          </div>
                          <div className="flex flex-col justify-center min-w-0">
                            <h3 className="mb-0.5 line-clamp-2 min-h-[2.5rem] text-[15px] font-bold leading-tight text-slate-900">
                              {developer.brandName}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium truncate">
                              {developer.headOfficeLocation || 'South Africa'}
                            </p>
                          </div>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                            <span
                              className={`block font-bold text-slate-900 ${
                                hasNumericValue(developer.stats?.totalProjects)
                                  ? 'text-lg'
                                  : 'text-sm'
                              }`}
                            >
                              {displayMetric(developer.stats?.totalProjects, 'New')}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                              Projects
                            </span>
                          </div>

                          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-right">
                            <span
                              className={`block font-bold text-slate-900 ${
                                hasNumericValue(developer.stats?.experience) ? 'text-lg' : 'text-sm'
                              }`}
                            >
                              {displayMetric(developer.stats?.experience, 'Info soon')}
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
                              Ready to Move
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              {displayCount(developer.stats?.readyToMove)}
                            </span>
                          </button>

                          <button
                            className="w-full flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50 group transition-colors"
                            onClick={() =>
                              setLocation(`/developer/${developer.slug}?status=under-construction`)
                            }
                          >
                            <span className="text-xs text-slate-700 font-medium truncate">
                              Under Const.
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              {displayCount(developer.stats?.underConstruction)}
                            </span>
                          </button>

                          <button
                            className="hidden sm:flex w-full items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50 group transition-colors"
                            onClick={() =>
                              setLocation(`/developer/${developer.slug}?status=new-launch`)
                            }
                          >
                            <span className="text-xs text-slate-700 font-medium truncate">
                              New Launch
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              {displayCount(developer.stats?.newLaunch)}
                            </span>
                          </button>
                        </div>

                        <button
                          className="mt-3 flex w-full items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
                          onClick={() => setLocation(`/developer/${developer.slug}`)}
                        >
                          <span>View Developer</span>
                          <ChevronRight className="h-3.5 w-3.5 text-white/80" />
                        </button>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex -left-4 bg-white shadow-md border-slate-200 text-slate-600 hover:text-slate-900" />
              <CarouselNext className="hidden md:flex -right-4 bg-white shadow-md border-slate-200 text-slate-600 hover:text-slate-900" />
            </Carousel>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
            <Building2 className="mx-auto h-9 w-9 text-slate-300" />
            <h3 className="mt-3 text-sm font-bold text-slate-900">
              Developer profiles are being prepared
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              We will show developer profiles here as soon as live brand data is available.
            </p>
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
