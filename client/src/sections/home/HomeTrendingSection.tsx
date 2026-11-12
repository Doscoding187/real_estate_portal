import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Building2, Home, Landmark, MapPin, Trees, Users, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import { HomeAreaPicker } from '@/components/HomeAreaPicker';
import { SavePropertyPrompt } from '@/components/SavePropertyPrompt';
import { SimpleHomeListingCard } from '@/components/SimpleHomeListingCard';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { SectionEmptyState } from '@/components/ui/SectionEmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useHomeSearch } from '@/contexts/HomeSearchContext';
import { needsHomeAreaClarification } from '@/lib/homeAreaSelection';
import { trpc } from '@/lib/trpc';
import { hasHomePropertyPhoto } from '@shared/homePropertyPhoto';

export type TrendingTabKey =
  | 'buy'
  | 'rent'
  | 'developments'
  | 'shared_living'
  | 'commercial'
  | 'plot_land';

const TABS: ReadonlyArray<{ key: TrendingTabKey; label: string }> = [
  { key: 'buy', label: 'Buy' },
  { key: 'rent', label: 'Rent' },
  { key: 'developments', label: 'New Developments' },
  { key: 'shared_living', label: 'Shared Living' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'plot_land', label: 'Plots & Land' },
];

type HeldTabCopy = {
  message: string;
  actionLabel: string;
  href: string;
  icon: LucideIcon;
};

/** These tabs run no query. Each one tells the visitor the truth and offers one next step. */
const HELD_TAB_COPY: Record<Exclude<TrendingTabKey, 'buy' | 'rent'>, HeldTabCopy> = {
  developments: {
    message: 'New developments are launching soon.',
    actionLabel: 'Are you a developer? List your development',
    href: '/advertise/sell/developers',
    icon: Building2,
  },
  shared_living: {
    message: 'Shared living rooms are coming soon.',
    actionLabel: 'List with us',
    href: '/advertise',
    icon: Users,
  },
  commercial: {
    message: 'Commercial space is coming soon.',
    actionLabel: 'List with us',
    href: '/advertise',
    icon: Landmark,
  },
  plot_land: {
    message: 'Plots and land are coming soon.',
    actionLabel: 'List with us',
    href: '/advertise',
    icon: Trees,
  },
};

function tabFromJourney(journey: string | undefined): TrendingTabKey {
  return TABS.some(tab => tab.key === journey) ? (journey as TrendingTabKey) : 'buy';
}

const RAIL_LIMIT = 10;

function ListingRail({ listingType }: { listingType: 'sale' | 'rent' }) {
  const homeSearch = useHomeSearch();
  const { isAuthenticated } = useAuth();
  const [pickerKey, setPickerKey] = useState<number | null>(null);
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [saveTrigger, setSaveTrigger] = useState<HTMLElement | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
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

  const chosenArea = homeSearch?.locations[0];
  const query = trpc.properties.searchPublicInventory.useQuery(
    {
      listingType,
      sortOption: 'date_desc',
      page: 0,
      pageSize: RAIL_LIMIT,
      ...(chosenArea ? { canonicalPlaceId: chosenArea.canonicalPlaceId } : {}),
    },
    { retry: false },
  );

  const cards = (
    (query.data?.cards ?? []) as Array<{
      kind?: string;
      id: string | number;
      title: string;
      city?: string;
      suburb?: string;
      locationLabels?: string[];
      image?: string;
      href: string;
      price: number | null;
      bedrooms?: number;
      bathrooms?: number;
      area?: number;
      yardSize?: number;
      parking?: { compactValue?: string | number };
      propertyType?: string;
    }>
  )
    .filter(
      card =>
        card.kind !== 'development' &&
        hasHomePropertyPhoto(card.image) &&
        !failedImages.has(card.image as string),
    )
    .slice(0, RAIL_LIMIT);

  const handleFavorite = (propertyId: number) => {
    if (!isAuthenticated) {
      setSaveTrigger(document.activeElement instanceof HTMLElement ? document.activeElement : null);
      setSavePromptOpen(true);
      return;
    }
    if (setFavoriteMutation.isPending) return;
    setFavoriteMutation.mutate({ propertyId, saved: !savedPropertyIds.has(propertyId) });
  };

  const openPicker = homeSearch ? () => setPickerKey(Date.now()) : undefined;
  const areaControl =
    homeSearch && openPicker ? (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="flex min-w-0 items-center gap-2 font-semibold text-slate-900">
          <MapPin className="size-4 shrink-0 text-[#2774AE]" aria-hidden="true" />
          {chosenArea ? `Homes in ${chosenArea.name}` : 'Homes across South Africa'}
        </p>
        <button
          type="button"
          onClick={openPicker}
          className="inline-flex min-h-11 items-center rounded-lg border border-blue-200 bg-white px-4 font-semibold text-[#2774AE] hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          {chosenArea ? 'Choose another area' : 'Choose an area'}
        </button>
      </div>
    ) : null;

  let body;
  if (query.isLoading) {
    body = (
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
    );
  } else if (query.isError) {
    body = (
      <div
        className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center sm:p-8"
        role="alert"
      >
        <p className="text-sm leading-6 text-slate-700">
          We could not load homes just now. Please try again.
        </p>
        <button
          type="button"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
          className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-amber-300 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-amber-100 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          {query.isFetching ? 'Trying again…' : 'Try again'}
        </button>
      </div>
    );
  } else if (cards.length === 0) {
    body =
      chosenArea && openPicker ? (
        <SectionEmptyState
          icon={Home}
          message="No homes listed here yet."
          action={{ label: 'Choose another area', onClick: openPicker }}
        />
      ) : (
        <SectionEmptyState
          icon={Home}
          message="No homes listed here yet."
          action={{ label: 'List with us', href: '/advertise' }}
        />
      );
  } else {
    body = (
      <div className="group/rail relative w-full" data-testid="home-property-carousel">
        <Carousel
          opts={{ align: 'start', loop: cards.length > 4 }}
          className="w-full"
          aria-label="Trending properties"
        >
          <CarouselContent className="-ml-3.5 justify-start pb-2">
            {cards.map(card => {
              const parkingCount = Number(card.parking?.compactValue || 0) || null;
              return (
                <CarouselItem
                  key={card.id}
                  className="basis-[77%] pl-3.5 sm:basis-[64%] md:basis-1/2 lg:basis-1/4"
                >
                  <div className="relative h-full">
                    <SimpleHomeListingCard
                      id={String(card.id)}
                      title={card.title}
                      city={card.city || ''}
                      suburb={card.suburb || ''}
                      locationLabel={card.locationLabels?.[0]}
                      image={card.image || ''}
                      href={card.href}
                      price={card.price ?? null}
                      bedrooms={card.bedrooms}
                      bathrooms={card.bathrooms}
                      area={card.area}
                      yardSize={card.yardSize}
                      parkingCount={parkingCount}
                      propertyType={card.propertyType}
                      listingType={listingType}
                      badgeLabel={listingType === 'rent' ? 'To rent' : 'For sale'}
                      isSaved={savedPropertyIds.has(Number(card.id))}
                      favoritePending={
                        setFavoriteMutation.isPending &&
                        Number(setFavoriteMutation.variables?.propertyId) === Number(card.id)
                      }
                      onFavoriteClick={() => handleFavorite(Number(card.id))}
                      onImageUnavailable={() =>
                        setFailedImages(previous => new Set(previous).add(card.image as string))
                      }
                    />
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="hidden size-10 border-slate-200 bg-white opacity-0 shadow-md transition-opacity duration-200 focus-visible:opacity-100 group-focus-within/rail:opacity-100 group-hover/rail:opacity-100 disabled:invisible lg:-left-12 lg:inline-flex" />
          <CarouselNext className="hidden size-10 border-slate-200 bg-white opacity-0 shadow-md transition-opacity duration-200 focus-visible:opacity-100 group-focus-within/rail:opacity-100 group-hover/rail:opacity-100 disabled:invisible lg:-right-12 lg:inline-flex" />
        </Carousel>
      </div>
    );
  }

  return (
    <>
      {areaControl}
      {body}
      <SavePropertyPrompt
        open={savePromptOpen}
        onOpenChange={setSavePromptOpen}
        returnPath={window.location.pathname + window.location.search}
        returnFocusTo={saveTrigger}
      />
      {homeSearch && pickerKey !== null ? (
        <HomeAreaPicker
          key={pickerKey}
          open
          onOpenChange={open => {
            if (!open) setPickerKey(null);
          }}
          journey={listingType === 'rent' ? 'rent' : 'buy'}
          initialSelection={{ locations: homeSearch.locations }}
          onConfirm={next => {
            homeSearch.setLocations(next.locations);
            homeSearch.setConfirmedBroadPlaceId(
              needsHomeAreaClarification(next)
                ? (next.locations[0]?.canonicalPlaceId ?? null)
                : null,
            );
            setPickerKey(null);
          }}
        />
      ) : null}
    </>
  );
}

/** Tabbed "Trending properties" rail under the hero. */
export function HomeTrendingSection() {
  const homeSearch = useHomeSearch();
  const heroJourney = homeSearch?.journey;
  const [activeTab, setActiveTab] = useState<TrendingTabKey>(() => tabFromJourney(heroJourney));
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Follow the hero when the visitor picks a different journey there.
  useEffect(() => {
    if (heroJourney) setActiveTab(tabFromJourney(heroJourney));
  }, [heroJourney]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    else return;
    event.preventDefault();
    const target = TABS[next];
    setActiveTab(target.key);
    tabRefs.current[target.key]?.focus();
  };

  const held = activeTab === 'buy' || activeTab === 'rent' ? null : HELD_TAB_COPY[activeTab];

  return (
    <section className="home-section" aria-labelledby="home-trending-heading">
      <div className="home-section-header">
        <h2
          id="home-trending-heading"
          className="home-section-title text-[1.125rem] font-bold text-slate-900 sm:text-xl md:text-[26px]"
        >
          Trending properties
        </h2>
        <p className="max-w-2xl text-[13px] leading-5 text-slate-600 sm:text-sm sm:leading-6">
          See what is new on Property Listify, from homes for sale and rent to what is coming next.
        </p>
      </div>

      <div className="home-section-tabs scrollbar-hide -mx-4 flex justify-start overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div
          role="tablist"
          aria-label="Trending property categories"
          className="inline-flex h-auto flex-nowrap justify-start gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5"
        >
          {TABS.map((tab, index) => {
            const selected = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                ref={node => {
                  tabRefs.current[tab.key] = node;
                }}
                type="button"
                role="tab"
                id={`home-trending-tab-${tab.key}`}
                aria-selected={selected}
                aria-controls="home-trending-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab.key)}
                onKeyDown={event => onKeyDown(event, index)}
                className={`min-h-11 shrink-0 whitespace-nowrap rounded-lg border border-transparent px-3 py-2 text-[13px] font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 md:px-4 md:text-sm ${
                  selected
                    ? 'bg-[#2774AE] text-white shadow-sm'
                    : 'bg-transparent text-slate-600 hover:bg-white hover:text-[#2774AE]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id="home-trending-panel"
        aria-labelledby={`home-trending-tab-${activeTab}`}
      >
        {held ? (
          <SectionEmptyState
            icon={held.icon}
            message={held.message}
            action={{ label: held.actionLabel, href: held.href }}
          />
        ) : (
          <ListingRail key={activeTab} listingType={activeTab === 'rent' ? 'rent' : 'sale'} />
        )}
      </div>
    </section>
  );
}
