import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { homeProvincePlaceId } from '@/lib/homeProvinceOptions';
import { Building2, ArrowRight } from 'lucide-react';
import { SectionEmptyState } from '@/components/ui/SectionEmptyState';
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
  return candidate?.data?.code === 'BAD_REQUEST' || candidate?.shape?.data?.code === 'BAD_REQUEST';
}

function EmptyDevelopers({ province }: { province?: string }) {
  return (
    <>
      <SectionEmptyState
        icon={Building2}
        message={
          province
            ? `No developers are listed in ${province} yet.`
            : 'No developers are listed yet.'
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

/** Same widths as the Trending listing cards, so the two rows line up at every breakpoint. */
const DEVELOPER_ITEM_CLASS = 'basis-[77%] pl-3.5 sm:basis-[64%] md:basis-1/2 lg:basis-1/4';
const DEVELOPER_SKELETON_WIDTH =
  'flex-[0_0_77%] sm:flex-[0_0_64%] md:flex-[0_0_50%] lg:flex-[0_0_25%]';

type DeveloperSummary = {
  id: number | string;
  slug: string;
  brandName: string;
  headOfficeLocation?: string | null;
  logoUrl?: string | null;
  developmentCount?: unknown;
};

/** Up to two letters from the brand name, for developers without a logo. */
function developerInitials(name: string): string {
  const words = name
    .replace(/^sample\s+/i, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '').slice(0, 2);
  return letters.toUpperCase();
}

/** One calm stat line, e.g. "5 active · 3 selling now · 1 launching soon". Zero or missing parts are left out. */
function developerStatLine(
  developer: DeveloperSummary,
  stats: ProvinceStats,
  provinceMode: boolean,
): string {
  if (provinceMode) {
    const active = projectCount(stats.activeDevelopments);
    const selling = projectCount(stats.sellingNow);
    const launching = projectCount(stats.launchingSoon);
    return [
      active ? `${active} active` : null,
      selling ? `${selling} selling now` : null,
      launching ? `${launching} launching soon` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }
  const count = projectCount(developer.developmentCount);
  return count !== null ? `${count} public ${count === 1 ? 'project' : 'projects'}` : '';
}

/**
 * Developer card: one link for the whole card, one stat line, an optional status chip and a quiet
 * "View developer" cue. Same width, radius and border as the Trending listing cards.
 * `projectThumbnails` is a reserved slot for a future strip of up to three project thumbnails;
 * nothing is passed or drawn for it today.
 */
function DeveloperCard({
  developer,
  stats,
  provinceMode,
  projectThumbnails,
}: {
  developer: DeveloperSummary;
  stats: ProvinceStats;
  provinceMode: boolean;
  projectThumbnails?: ReactNode;
}) {
  const selling = provinceMode ? projectCount(stats.sellingNow) : null;
  const launching = provinceMode ? projectCount(stats.launchingSoon) : null;
  const statLine = developerStatLine(developer, stats, provinceMode);
  const chip = selling ? 'Selling now' : launching ? 'Launching soon' : null;

  return (
    <Link
      href={`/developer/${developer.slug}`}
      className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2774AE] focus-visible:ring-offset-2"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white p-2">
          {developer.logoUrl ? (
            <img
              src={developer.logoUrl}
              alt={`${developer.brandName} logo`}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span
              data-testid="developer-initials"
              aria-hidden="true"
              className="flex h-full w-full items-center justify-center rounded-lg bg-blue-50 text-base font-bold text-[#2774AE]"
            >
              {developerInitials(developer.brandName)}
            </span>
          )}
        </span>
        <span className="flex min-w-0 flex-col justify-center">
          <span className="line-clamp-2 text-[15px] font-bold leading-tight text-slate-900 transition-colors group-hover:text-[#2774AE]">
            {developer.brandName}
          </span>
          <span className="mt-0.5 truncate text-xs text-slate-500">
            {developer.headOfficeLocation || 'Developer profile'}
          </span>
        </span>
      </div>

      {statLine || chip ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          {statLine ? <span className="text-xs text-slate-600">{statLine}</span> : null}
          {chip ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                selling ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              {chip}
            </span>
          ) : null}
        </div>
      ) : null}

      {projectThumbnails}

      <span className="mt-auto inline-flex min-h-[44px] items-center gap-1 pt-3 text-sm font-semibold text-[#2774AE] group-hover:underline">
        View developer <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

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

  const provinceRejected =
    provinceMode && provinceQuery.isError && isBadRequestError(provinceQuery.error);
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
            <div className="flex gap-3.5">
              {[0, 1, 2].map(index => (
                <div
                  key={index}
                  data-testid="developer-profile-skeleton"
                  className={`min-w-0 rounded-xl border border-slate-200 bg-white p-4 ${DEVELOPER_SKELETON_WIDTH}`}
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-14 w-14 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="mt-4 h-3 w-2/3" />
                  <Skeleton className="mt-5 h-3 w-1/3" />
                </div>
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
            <CarouselContent className="-ml-3.5 touch-pan-y justify-start pb-2">
              {profiles.map(developer => (
                <CarouselItem key={developer.id} className={DEVELOPER_ITEM_CLASS}>
                  <DeveloperCard
                    developer={developer}
                    stats={developer as ProvinceStats}
                    provinceMode={Boolean(provinceName)}
                  />
                </CarouselItem>
              ))}
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
