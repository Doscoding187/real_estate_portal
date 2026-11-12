import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { homeProvincePlaceId } from '@/lib/homeProvinceOptions';
import { Building2, ArrowRight, ChevronRight } from 'lucide-react';
import { SectionEmptyState } from '@/components/ui/SectionEmptyState';
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
import { isHomepageHeroJourneyEnabled } from '@/lib/publicNavigation';

const projectCount = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.trunc(number) : null;
};

const DIRECTORY_HREF = '/developers';

/** Session flag: set once an older API has rejected `provincePlaceId` (tRPC BAD_REQUEST). */
let legacyDevelopersApiDetected = false;

/** Test helper: clears the remembered national-only mode. */
export function resetDevelopersLegacyMode(): void {
  legacyDevelopersApiDetected = false;
}

function isBadRequestError(error: unknown): boolean {
  const candidate = error as {
    data?: { code?: unknown };
    shape?: { data?: { code?: unknown } };
  } | null;
  return (
    candidate?.data?.code === 'BAD_REQUEST' || candidate?.shape?.data?.code === 'BAD_REQUEST'
  );
}

function EmptyDevelopers({ province }: { province?: string }) {
  return (
    <>
      <SectionEmptyState
        icon={Building2}
        message={
          province ? `No developers are listed in ${province} yet.` : 'No developers are listed yet.'
        }
        action={{
          label: 'Talk to us about listing your development',
          href: '/contact',
        }}
      />
      <p className="mt-3">
        <Link
          href={DIRECTORY_HREF}
          className="inline-flex min-h-[44px] items-center text-sm font-semibold text-[#2774AE] hover:underline focus-visible:outline focus-visible:outline-2"
        >
          See developers across South Africa
        </Link>
      </p>
    </>
  );
}

type ProvinceStats = {
  activeDevelopments?: unknown;
  sellingNow?: unknown;
  launchingSoon?: unknown;
};

/**
 * Homepage developers section. It follows the province pills: developers with approved,
 * published projects in the selected province, with per-province counts. If the API is one
 * version behind and rejects `provincePlaceId` (tRPC BAD_REQUEST), it falls back to the national
 * list for the rest of the session. See docs/product/homepage/developers.md.
 */
export function TopDevelopers({ selectedProvince }: { selectedProvince?: string } = {}) {
  const developmentsHeld = !isHomepageHeroJourneyEnabled('developments');
  const provincePlaceId = selectedProvince ? homeProvincePlaceId(selectedProvince) : undefined;
  const [legacy, setLegacy] = useState(legacyDevelopersApiDetected);
  const provinceMode = Boolean(provincePlaceId) && !legacy;

  const provinceQuery = trpc.cataloguePublisher.listPublishers.useQuery(
    { provincePlaceId, limit: 12 },
    { enabled: !developmentsHeld && provinceMode, retry: false },
  );
  const nationalQuery = trpc.cataloguePublisher.listPublishers.useQuery(
    { limit: 12 },
    { enabled: !developmentsHeld && !provinceMode },
  );

  const provinceRejected = provinceMode && provinceQuery.isError && isBadRequestError(provinceQuery.error);
  useEffect(() => {
    if (provinceRejected) {
      legacyDevelopersApiDetected = true;
      setLegacy(true);
    }
  }, [provinceRejected]);

  const active = provinceMode ? provinceQuery : nationalQuery;
  const { data: developers, isFetching, refetch } = active;
  const isError = active.isError && !provinceRejected;
  const isLoading = active.isLoading || provinceRejected;
  const profiles = developers?.slice(0, 10) ?? [];
  const showEmptyState = developmentsHeld || (!isLoading && !isError && !profiles.length);
  const provinceName = provinceMode ? selectedProvince : undefined;

  return (
    <section className="home-section bg-white">
      <div className="home-section-content">
        <div className="home-section-header">
          <h2 className="home-section-title text-[1.125rem] font-bold text-slate-900 sm:text-xl md:text-[26px]">
            {provinceName
              ? `Developers building in ${provinceName}`
              : 'Explore real estate developers'}
          </h2>
          <p className="max-w-3xl text-xs leading-relaxed text-slate-600 md:text-sm">
            {provinceName
              ? `Explore developers with approved, published projects in ${provinceName}.`
              : 'Explore developer profiles and publicly listed projects across South Africa.'}
          </p>
        </div>
        {showEmptyState ? (
          <EmptyDevelopers province={provinceName} />
        ) : isLoading ? (
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
                  <CardContent className="p-3.5 sm:p-4">
                    <Skeleton className="mb-3 h-12 w-full rounded-lg" />
                    <Skeleton className="mb-3 h-14 w-full rounded-lg" />
                    <Skeleton className="mb-3 h-9 w-full rounded-lg" />
                    <Skeleton className="h-11 w-full rounded-lg" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <span className="sr-only">Loading developer profiles</span>
          </div>
        ) : isError ? (
          <div role="alert" className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-6">
            <p className="text-sm text-slate-700">Developer profiles could not be loaded.</p>
            <Button
              variant="outline"
              className="mt-3 min-h-[44px] bg-white"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              {isFetching ? 'Trying again…' : 'Try again'}
            </Button>
          </div>
        ) : (
          <Carousel opts={{ align: 'start', loop: false }} className="w-full">
            <CarouselContent className="-ml-2 touch-pan-y">
              {profiles.map(developer => {
                const count = projectCount(developer.developmentCount);
                const stats = developer as ProvinceStats;
                const activeIn = provinceName ? projectCount(stats.activeDevelopments) : null;
                const sellingNow = provinceName ? projectCount(stats.sellingNow) : null;
                const launchingSoon = provinceName ? projectCount(stats.launchingSoon) : null;
                const profilePath = `/developer/${developer.slug}`;
                return (
                  <CarouselItem
                    key={developer.id}
                    className="basis-[78%] pl-2 sm:basis-[56%] md:basis-1/2 lg:basis-1/4"
                  >
                    <Card className="h-full rounded-xl border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300 hover:shadow-md">
                      <CardContent className="flex h-full flex-col p-3.5 sm:p-4">
                        <Link
                          href={profilePath}
                          className="mb-3 flex items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2"
                        >
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-white p-2">
                            {developer.logoUrl ? (
                              <img
                                src={developer.logoUrl}
                                alt={`${developer.brandName} logo`}
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <Building2 className="h-5 w-5 text-slate-500" aria-hidden="true" />
                            )}
                          </span>
                          <span className="flex min-w-0 flex-col justify-center">
                            <span className="line-clamp-2 min-h-[2.5rem] text-[15px] font-bold leading-tight text-slate-900">
                              {developer.brandName}
                            </span>
                            <span className="truncate text-xs font-medium text-slate-500">
                              {developer.headOfficeLocation || 'Developer profile'}
                            </span>
                          </span>
                        </Link>
                        {provinceName ? (
                          <>
                            {(activeIn !== null || sellingNow !== null) && (
                              <div className="mb-3 grid grid-cols-2 gap-2">
                                {activeIn !== null && (
                                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                    <span className="block text-lg font-bold text-slate-900">
                                      {activeIn}
                                    </span>
                                    <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                                      Active in {provinceName}
                                    </span>
                                  </div>
                                )}
                                {sellingNow !== null && (
                                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                    <span className="block text-lg font-bold text-slate-900">
                                      {sellingNow}
                                    </span>
                                    <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                                      Selling now
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            {activeIn !== null && (
                              <div className="mb-1 flex items-center justify-between px-1 text-xs text-slate-600">
                                <span>Active developments</span>
                                <span className="font-semibold text-slate-900">{activeIn}</span>
                              </div>
                            )}
                            {launchingSoon !== null && (
                              <div className="mb-2 flex items-center justify-between px-1 text-xs text-slate-600">
                                <span>Launching soon</span>
                                <span className="font-semibold text-slate-900">{launchingSoon}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          count !== null && (
                            <div className="mb-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                              <span className="block text-lg font-bold text-slate-900">{count}</span>
                              <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                                Public {count === 1 ? 'project' : 'projects'}
                              </span>
                            </div>
                          )
                        )}
                        <Link
                          href={`${profilePath}#developments`}
                          className="flex min-h-[44px] w-full items-center justify-between rounded-lg border border-slate-100 p-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2"
                        >
                          <span className="truncate">
                            {provinceName ? 'View local projects' : 'View projects'}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                        </Link>
                        <div className="mt-auto pt-3">
                          <Link
                            href={profilePath}
                            className="flex min-h-[44px] w-full items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                          >
                            <span>View Developer</span>
                            <ChevronRight
                              className="h-3.5 w-3.5 text-white/80"
                              aria-hidden="true"
                            />
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="-left-4 hidden h-11 w-11 border-slate-200 bg-white shadow-md disabled:hidden md:flex" />
            <CarouselNext className="-right-4 hidden h-11 w-11 border-slate-200 bg-white shadow-md disabled:hidden md:flex" />
          </Carousel>
        )}
        <div className="mt-6">
          <Button
            asChild
            className="min-h-[44px] bg-gradient-to-r from-[#2774AE] to-[#2D68C4] px-6 text-white"
          >
            <Link href={DIRECTORY_HREF}>
              Explore All Developers <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
