import { useState } from 'react';
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
import { developerDiscoveryHref } from '@shared/developerDiscovery';
import {
  CanonicalPlaceSelector,
  type CanonicalPlaceSelection,
} from '@/components/location/CanonicalPlaceSelector';
const projectCount = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.trunc(number) : null;
};

export function TopDevelopers() {
  const [placeSelection, setPlaceSelection] = useState<CanonicalPlaceSelection | null>(null);
  const query = trpc.cataloguePublisher.listPublishers.useQuery({
    canonicalPlaceId: placeSelection?.canonicalPlaceId,
    limit: 12,
  });
  const {
    data: developers,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = query;
  const profiles = developers?.slice(0, 10) ?? [];
  const selectedPlaceId = placeSelection?.canonicalPlaceId;
  const selectedPlaceLabel = placeSelection?.label;
  const directoryHref = developerDiscoveryHref('/developers', selectedPlaceId);
  const scopeLabel = selectedPlaceLabel ? ` in ${selectedPlaceLabel}` : ' across South Africa';
  return (
    <section className="home-section bg-white">
      <div className="home-section-content">
        <div className="home-section-header flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="home-section-title text-[1.125rem] font-bold text-slate-900 sm:text-xl md:text-[26px]">
              {selectedPlaceLabel
                ? `Developers with projects in ${selectedPlaceLabel}`
                : 'Explore real estate developers'}
            </h2>
            <p className="max-w-3xl text-xs leading-relaxed text-slate-600 md:text-sm">
              {selectedPlaceLabel
                ? `Explore developers with publicly listed projects assigned to ${selectedPlaceLabel}.`
                : 'Explore developer profiles and publicly listed projects across South Africa.'}
            </p>
          </div>
        </div>
        <div className="mb-5 max-w-xl">
          <CanonicalPlaceSelector
            value={placeSelection}
            onChange={setPlaceSelection}
            purpose="search"
            label="Filter projects by canonical Place"
            placeholder="Search approved Places"
            hint="Only projects with this exact reviewed Place assignment match."
          />
        </div>
        {isLoading ? (
          <div
            data-testid="developer-feed-loading"
            role="status"
            aria-label="Loading developer profiles"
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
              Please try again. Your selected Place is still here.
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
                const count = projectCount(developer.developmentCount);
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
                              ? `${count} public ${count === 1 ? 'project' : 'projects'}`
                              : 'Developer profile'}
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            {selectedPlaceLabel ? `Assigned to ${selectedPlaceLabel}` : 'On Property Listify'}
                          </p>
                        </div>
                        <p className="mt-3 min-h-5 text-xs text-slate-600">
                          Check project details for current availability.
                        </p>
                        <div className="mt-auto pt-4">
                          <Button
                            asChild
                            className="min-h-[44px] w-full bg-slate-900 text-xs text-white hover:bg-slate-800"
                          >
                            <Link
                              href={developerDiscoveryHref(profilePath, selectedPlaceId, true)}
                            >
                              View projects <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                          </Button>
                          <Link
                            href={developerDiscoveryHref(profilePath, selectedPlaceId)}
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
              {selectedPlaceLabel
                ? `No developers with publicly listed projects assigned to ${selectedPlaceLabel} yet`
                : 'No developer profiles are available yet'}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Choose another Place or browse the developer directory.
            </p>
          </div>
        )}
        <div className="mt-6">
          <Button
            asChild
            className="min-h-[44px] bg-gradient-to-r from-[#2774AE] to-[#2D68C4] px-6 text-white"
          >
            <Link href={directoryHref}>
              Explore developers{scopeLabel}{' '}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
