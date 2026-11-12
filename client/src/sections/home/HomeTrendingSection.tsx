// Why this section exists, its content and ranking rules, and its history:
// docs/product/homepage/trending-properties.md — update that file with any change here.
import { useState } from 'react';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { SavePropertyPrompt } from '@/components/SavePropertyPrompt';
import { SimpleHomeListingCard } from '@/components/SimpleHomeListingCard';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { SectionEmptyState } from '@/components/ui/SectionEmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { HOME_PROVINCE_OPTIONS as PROVINCES, homeProvincePlaceId } from '@/lib/homeProvinceOptions';
import { buildTransactionalGeographyHref } from '@/lib/geographySearchHandoff';
import { trpc } from '@/lib/trpc';
import type { HeroTab } from '@/types/hero';
import { TRENDING_RAIL_LIMIT, useTrendingRailQuery } from './useTrendingRailQuery';

type HomeTrendingSectionProps = {
  selectedProvince: string;
  onProvinceChange: (province: string) => void;
  activeHeroTab: HeroTab;
};

const TAB_COPY: Record<HeroTab, { titleBase: string; subtitleBase: string }> = {
  buy: {
    titleBase: 'Homes for sale',
    subtitleBase: 'Explore published sale properties for the province you selected.',
  },
  rent: {
    titleBase: 'Rental properties',
    subtitleBase: 'Browse published rental homes and apartments by province.',
  },
  developments: {
    titleBase: 'New developments',
    subtitleBase: 'Browse the types of home available in new developments.',
  },
  shared_living: {
    titleBase: 'Shared living opportunities',
    subtitleBase: 'Find student accommodation and shared living options in active urban hubs.',
  },
  plot_land: {
    titleBase: 'Land and plots to explore',
    subtitleBase:
      'View land opportunities suited to building, development, or long-term investment.',
  },
  commercial: {
    titleBase: 'Commercial space to lease',
    subtitleBase:
      'Compare Office, Industrial & Logistics, and Retail space with verified occupancy costs.',
  },
};

const MOBILE_FRIENDLY_SUBTITLES: Record<HeroTab, string> = {
  buy: 'Discover standout homes for sale across South Africa.',
  rent: 'Browse published rental homes and apartments across South Africa.',
  developments: 'Browse the types of home available in new developments.',
  shared_living: 'Find student accommodation and shared living in prime urban hubs.',
  plot_land: 'View land opportunities suited to building or long-term investment.',
  commercial: 'Commercial leasing with verified occupancy costs and commercial terms.',
};

/** Journeys that hand the visitor to their own page instead of showing a rail here. */
const HANDOFF: Partial<Record<HeroTab, { href: string; label: string }>> = {
  commercial: { href: '/commercial', label: 'Browse commercial space to lease' },
  shared_living: { href: '/shared-living', label: 'Browse Shared Living' },
  plot_land: { href: '/plots-and-land', label: 'Browse plots and land' },
};

const HEADING_CLASS =
  'home-section-title max-w-[20.5rem] text-[1.125rem] font-bold text-slate-900 sm:max-w-none sm:text-xl md:text-[26px]';
const SUBTITLE_CLASS =
  'max-w-[21rem] text-[13px] leading-5 text-slate-600 sm:max-w-2xl sm:text-sm sm:leading-6 md:max-w-2xl md:text-sm md:leading-6';
const RAIL_LIMIT = TRENDING_RAIL_LIMIT;

export function HomeTrendingSection({
  selectedProvince,
  onProvinceChange,
  activeHeroTab,
}: HomeTrendingSectionProps) {
  const { isAuthenticated } = useAuth();
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const [saveTrigger, setSaveTrigger] = useState<HTMLElement | null>(null);
  const utils = trpc.useUtils();
  const { data: favorites = [] } = trpc.properties.getFavorites.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const setFavoriteMutation = trpc.properties.setFavorite.useMutation({
    onSuccess: result => {
      void utils.properties.getFavorites.invalidate();
      toast.success(
        result.saved ? 'Property saved to your homes.' : 'Property removed from saved homes.',
      );
    },
    onError: () => toast.error('Unable to update saved homes. Please try again.'),
  });
  const savedPropertyIds = new Set(
    (Array.isArray(favorites) ? favorites : []).map(favorite => Number(favorite.propertyId)),
  );

  const isListingTab = activeHeroTab === 'buy' || activeHeroTab === 'rent';
  const heroContent = {
    title: isListingTab
      ? `${TAB_COPY[activeHeroTab].titleBase} in ${selectedProvince}`
      : TAB_COPY[activeHeroTab].titleBase,
    subtitle: MOBILE_FRIENDLY_SUBTITLES[activeHeroTab] || TAB_COPY[activeHeroTab].subtitleBase,
  };

  // Only Buy and Rent run a query. Every other journey is a handoff or an empty state.
  const {
    cards: railCards,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useTrendingRailQuery({
    listingType: activeHeroTab === 'rent' ? 'rent' : 'sale',
    canonicalPlaceId: homeProvincePlaceId(selectedProvince),
    enabled: isListingTab,
  });

  const handoff = HANDOFF[activeHeroTab];
  if (activeHeroTab === 'developments') {
    // No public procedure returns unit-type level data yet, so show the honest empty state.
    return (
      <section className="home-section">
        <div className="home-section-header">
          <h2 className={HEADING_CLASS}>{heroContent.title}</h2>
          <p className={SUBTITLE_CLASS}>{heroContent.subtitle}</p>
        </div>
        <SectionEmptyState
          icon={Building2}
          message="New developments are launching soon."
          action={{
            label: 'Talk to us about listing your development',
            href: '/contact',
          }}
        />
      </section>
    );
  }

  if (handoff) {
    return (
      <section className="home-section">
        <div className="home-section-header">
          <h2 className={HEADING_CLASS}>{heroContent.title}</h2>
          <p className={SUBTITLE_CLASS}>{heroContent.subtitle}</p>
        </div>
        <a
          href={handoff.href}
          className="inline-flex min-h-11 items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          {handoff.label}
        </a>
      </section>
    );
  }

  // The server already orders, photo-filters and mixes unit types; only images that fail to load
  // in this browser are dropped here.
  const trendingItems = railCards
    .filter(item => !failedImages.has(item.image as string))
    .slice(0, RAIL_LIMIT);
  const listingType = activeHeroTab === 'rent' ? 'rent' : 'sale';
  const provincePlaceId = homeProvincePlaceId(selectedProvince);
  const viewAllHref = provincePlaceId
    ? buildTransactionalGeographyHref({
        journey: listingType === 'rent' ? 'rent' : 'buy',
        scope: { kind: 'province', canonicalPlaceId: provincePlaceId },
        resultState: { sort: 'relevance', page: 0 },
      })
    : undefined;
  const handleFavorite = (propertyId: number) => {
    if (!isAuthenticated) {
      setSaveTrigger(document.activeElement instanceof HTMLElement ? document.activeElement : null);
      setSavePromptOpen(true);
      return;
    }
    if (setFavoriteMutation.isPending) return;
    setFavoriteMutation.mutate({ propertyId, saved: !savedPropertyIds.has(propertyId) });
  };

  return (
    <section className="home-section">
      <div className="home-section-header">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1">
          <span className="text-sm font-semibold text-orange-600">Explore property</span>
        </div>
        <h2 className={HEADING_CLASS}>{heroContent.title}</h2>
        <p className={SUBTITLE_CLASS}>{heroContent.subtitle}</p>
      </div>

      <div className="home-section-tabs scrollbar-hide -mx-4 flex justify-start overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div
          role="group"
          aria-label="Province"
          className="inline-flex h-auto flex-nowrap justify-start gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5"
        >
          {PROVINCES.map(province => (
            <button
              key={province}
              type="button"
              aria-pressed={selectedProvince === province}
              onClick={() => onProvinceChange(province)}
              className={`min-h-11 shrink-0 whitespace-nowrap rounded-lg border border-transparent px-3 py-2 text-[13px] font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 md:px-4 md:text-sm ${
                selectedProvince === province
                  ? 'bg-[#2774AE] text-white shadow-sm'
                  : 'bg-transparent text-slate-600 hover:bg-white hover:text-[#2774AE]'
              }`}
            >
              {province}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div
          className="-mx-4 overflow-hidden px-4 sm:mx-0 sm:px-0"
          data-testid="home-property-feed-loading"
          role="status"
          aria-label="Loading published property"
        >
          <div className="flex gap-3.5">
            {[0, 1, 2, 3].map(index => (
              <div
                key={index}
                className="min-w-0 flex-[0_0_77%] rounded-xl border border-slate-200 bg-white p-3 sm:flex-[0_0_48%] lg:flex-1"
                data-testid="home-property-skeleton"
              >
                <Skeleton className="h-32 w-full rounded-lg sm:h-44" />
                <Skeleton className="mt-3 h-4 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            ))}
          </div>
          <span className="sr-only">Loading published property</span>
        </div>
      ) : isError ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-8 text-center"
          role="alert"
        >
          <h3 className="text-sm font-bold text-slate-900">Property could not be loaded</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
            We could not check the published property available in {selectedProvince}. Try again, or
            continue with the full search.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 border-amber-300 bg-white"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              {isFetching ? 'Trying again…' : 'Try again'}
            </Button>
            <Button asChild className="min-h-11">
              <a href={activeHeroTab === 'rent' ? '/property-to-rent' : '/property-for-sale'}>
                Open property search
              </a>
            </Button>
          </div>
        </div>
      ) : trendingItems.length > 0 ? (
        <div className="group/rail relative w-full" data-testid="home-property-carousel">
          <Carousel
            opts={{ align: 'start', loop: trendingItems.length > 4 }}
            className="w-full"
            aria-label="Explore property carousel"
          >
            <CarouselContent className="-ml-3.5 justify-start pb-2">
              {trendingItems.map(item => (
                <CarouselItem
                  key={item.id}
                  className="basis-[77%] pl-3.5 sm:basis-[64%] md:basis-1/2 lg:basis-1/4"
                >
                  <div className="relative h-full">
                    {item.unitType ? (
                      // Development unit type: same card frame as a listing. There is no saved-homes
                      // call for a unit type (setFavorite takes a property id), so no heart.
                      <SimpleHomeListingCard
                        id={String(item.id)}
                        title={item.title}
                        city=""
                        locationLabel={[item.unitType.developmentName, item.locationLabels?.[0]]
                          .filter(Boolean)
                          .join(' · ')}
                        image={item.image || ''}
                        href={item.href}
                        price={item.unitType.priceFrom ?? item.price ?? null}
                        pricePrefix="From"
                        bedrooms={item.unitType.bedrooms}
                        bathrooms={item.unitType.bathrooms}
                        area={item.unitType.unitSizeM2}
                        // The server's propertyType on a unit card is a development-level guess, not the
                        // unit's own type, so it is not shown (never display a type the data does not state).
                        propertyType={undefined}
                        listingType={listingType}
                        badgeLabel="New development"
                        secondaryBadgeLabel={listingType === 'rent' ? 'To rent' : 'For sale'}
                        onImageUnavailable={() =>
                          setFailedImages(previous => new Set(previous).add(item.image as string))
                        }
                      />
                    ) : (
                      <SimpleHomeListingCard
                        id={String(item.id)}
                        title={item.title}
                        city={item.city || ''}
                        suburb={item.suburb || ''}
                        locationLabel={item.locationLabels?.[0]}
                        image={item.image || ''}
                        href={item.href}
                        price={item.price ?? null}
                        bedrooms={item.bedrooms}
                        bathrooms={item.bathrooms}
                        area={item.area}
                        yardSize={item.yardSize}
                        parkingCount={Number(item.parking?.compactValue || 0) || null}
                        propertyType={item.propertyType}
                        listingType={listingType}
                        badgeLabel={listingType === 'rent' ? 'To rent' : 'For sale'}
                        isSaved={savedPropertyIds.has(Number(item.id))}
                        favoritePending={
                          setFavoriteMutation.isPending &&
                          Number(setFavoriteMutation.variables?.propertyId) === Number(item.id)
                        }
                        onFavoriteClick={() => handleFavorite(Number(item.id))}
                        onImageUnavailable={() =>
                          setFailedImages(previous => new Set(previous).add(item.image as string))
                        }
                      />
                    )}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden size-10 border-slate-200 bg-white opacity-0 shadow-md transition-opacity duration-200 focus-visible:opacity-100 group-focus-within/rail:opacity-100 group-hover/rail:opacity-100 disabled:invisible lg:-left-12 lg:inline-flex" />
            <CarouselNext className="hidden size-10 border-slate-200 bg-white opacity-0 shadow-md transition-opacity duration-200 focus-visible:opacity-100 group-focus-within/rail:opacity-100 group-hover/rail:opacity-100 disabled:invisible lg:-right-12 lg:inline-flex" />
          </Carousel>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
          <h3 className="text-sm font-bold text-slate-900">
            No published matches in {selectedProvince} yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Try another province or start a broader search while more listings are being added.
          </p>
          <a
            href={activeHeroTab === 'rent' ? '/property-to-rent' : '/property-for-sale'}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Browse available property
          </a>
        </div>
      )}
      {viewAllHref && !isLoading && !isError ? (
        <a
          href={viewAllHref}
          className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-blue-700 hover:text-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          {`View all homes ${listingType === 'rent' ? 'to rent' : 'for sale'} in ${selectedProvince}`}
        </a>
      ) : null}
      <SavePropertyPrompt
        open={savePromptOpen}
        onOpenChange={setSavePromptOpen}
        returnPath={window.location.pathname + window.location.search}
        returnFocusTo={saveTrigger}
      />
    </section>
  );
}
