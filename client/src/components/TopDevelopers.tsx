import { Link } from 'wouter';
import { Building2, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { trpc } from '@/lib/trpc';
import { DEVELOPER_DISCOVERY_PROVINCES, developerDiscoveryHref } from '@shared/developerDiscovery';

type TopDevelopersProps = {
  selectedProvince: string;
  onProvinceChange?: (province: string) => void;
};
const projectCount = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.trunc(number) : null;
};

export function TopDevelopers({ selectedProvince, onProvinceChange }: TopDevelopersProps) {
  const {
    data: developers,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = trpc.cataloguePublisher.listPublishersByProvince.useQuery({
    province: selectedProvince,
    limit: 12,
  });
  const profiles = developers?.slice(0, 10) ?? [];
  const directoryHref = developerDiscoveryHref('/developers', selectedProvince);
  return (
    <section className="home-section bg-white">
      <div className="home-section-content">
        <div className="home-section-header flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="home-section-title text-[1.125rem] font-bold text-slate-900 sm:text-xl md:text-[26px]">
              Developers with projects in {selectedProvince}
            </h2>
            <p className="max-w-3xl text-xs leading-relaxed text-slate-600 md:text-sm">
              Explore developers with approved, published projects in {selectedProvince}.
            </p>
          </div>
          {onProvinceChange && (
            <div className="w-full sm:w-auto">
              <label
                htmlFor="homepage-developer-province"
                className="mb-1 block text-xs font-semibold text-slate-600"
              >
                Project province
              </label>
              <select
                id="homepage-developer-province"
                value={selectedProvince}
                onChange={event => onProvinceChange(event.target.value)}
                className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 sm:w-48"
              >
                {DEVELOPER_DISCOVERY_PROVINCES.map(province => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {isLoading ? (
          <div
            data-testid="developer-feed-loading"
            role="status"
            aria-label={`Loading developers with projects in ${selectedProvince}`}
            className="-mx-4 overflow-hidden px-4 sm:mx-0 sm:px-0"
          >
            <div className="flex gap-2">
              {[0, 1, 2].map(index => (
                <Card
                  key={index}
                  data-testid="developer-profile-skeleton"
                  className="min-w-0 flex-[0_0_78%] border-slate-200 sm:flex-[0_0_56%] md:flex-[0_0_48%] lg:flex-[0_0_24%]"
                >
                  <CardContent className="p-4">
                    <Skeleton className="mb-4 h-12 w-full rounded-lg" />
                    <Skeleton className="h-14 w-full rounded-lg" />
                    <Skeleton className="mt-4 h-11 w-full rounded-lg" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <span className="sr-only">Loading developer profiles</span>
          </div>
        ) : isError ? (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-6 text-center"
          >
            <Building2 className="mx-auto h-8 w-8 text-amber-700" aria-hidden="true" />
            <h3 className="mt-3 text-sm font-bold text-slate-900">
              Developer profiles could not be loaded
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Please try again. Your selected province is still here.
            </p>
            <Button
              variant="outline"
              className="mt-4 min-h-[44px] bg-white"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              {isFetching ? 'Trying again…' : 'Try again'}
            </Button>
          </div>
        ) : profiles.length ? (
          <Carousel opts={{ align: 'start', loop: false }} className="w-full">
            <CarouselContent className="-ml-2">
              {profiles.map(developer => {
                const count = projectCount(developer.localStats?.activeDevelopments);
                const selling = projectCount(developer.localStats?.sellingNow);
                const launching = projectCount(developer.localStats?.launchingSoon);
                const profilePath = `/developer/${developer.slug}`;
                return (
                  <CarouselItem
                    key={developer.id}
                    className="basis-[78%] pl-2 sm:basis-[56%] md:basis-1/2 lg:basis-1/4"
                  >
                    <Card className="h-full rounded-xl border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300 hover:shadow-md">
                      <CardContent className="flex h-full flex-col p-3.5 sm:p-4">
                        <div className="mb-3 flex items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-white p-2">
                            {developer.logoUrl ? (
                              <img
                                src={developer.logoUrl}
                                alt={`${developer.brandName} logo`}
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <Building2 className="h-5 w-5 text-slate-500" aria-hidden="true" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="line-clamp-2 min-h-[2.5rem] text-[15px] font-bold leading-tight text-slate-900">
                              {developer.brandName}
                            </h3>
                            {developer.headOfficeLocation && (
                              <p className="mt-1 truncate text-xs text-slate-600">
                                Head office: {developer.headOfficeLocation}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
                          <p className="text-sm font-semibold text-slate-900">
                            {count !== null
                              ? `${count} published ${count === 1 ? 'project' : 'projects'}`
                              : 'Published projects'}
                          </p>
                          <p className="mt-1 text-xs text-slate-600">In {selectedProvince}</p>
                        </div>
                        <div className="mt-3 flex min-h-5 flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                          {selling !== null && selling > 0 && <span>{selling} selling now</span>}
                          {launching !== null && launching > 0 && (
                            <span>{launching} launching soon</span>
                          )}
                          {!selling && !launching && (
                            <span>Check project details for availability</span>
                          )}
                        </div>
                        <div className="mt-auto pt-4">
                          <Button
                            asChild
                            className="min-h-[44px] w-full bg-slate-900 text-xs text-white hover:bg-slate-800"
                          >
                            <Link
                              href={developerDiscoveryHref(profilePath, selectedProvince, true)}
                            >
                              View projects <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                          </Button>
                          <Link
                            href={developerDiscoveryHref(profilePath, selectedProvince)}
                            className="mt-1 flex min-h-[44px] items-center justify-center rounded-md text-xs font-semibold text-[#2774AE] hover:underline focus-visible:outline focus-visible:outline-2"
                          >
                            Developer profile
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="-left-4 hidden border-slate-200 bg-white shadow-md disabled:hidden md:flex" />
            <CarouselNext className="-right-4 hidden border-slate-200 bg-white shadow-md disabled:hidden md:flex" />
          </Carousel>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 px-5 py-8 text-center">
            <Building2 className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
            <h3 className="mt-3 text-sm font-bold text-slate-900">
              No developers with published projects in {selectedProvince} yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Choose another province or browse the developer directory.
            </p>
          </div>
        )}
        <div className="mt-6">
          <Button
            asChild
            className="min-h-[44px] bg-gradient-to-r from-[#2774AE] to-[#2D68C4] px-6 text-white"
          >
            <Link href={directoryHref}>
              Explore developers in {selectedProvince}{' '}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
