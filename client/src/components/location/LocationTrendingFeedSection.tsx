import { useState } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { SimpleDevelopmentCard } from '@/components/SimpleDevelopmentCard';
import { SimpleDevelopmentUnitCard } from '@/components/SimpleDevelopmentUnitCard';
import { SimpleHomeListingCard } from '@/components/SimpleHomeListingCard';
import { getPrimaryDevelopmentImageUrl } from '@/lib/mediaUtils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { isHomepageHeroJourneyEnabled } from '@/lib/publicNavigation';
import { isLandVerticalAvailable } from '@shared/landLaunchPolicy';

export type FeedTab =
  | 'buy'
  | 'rent'
  | 'developments'
  | 'shared_living'
  | 'plot_land'
  | 'commercial';

interface LocationTrendingFeedSectionProps {
  sectionId?: string;
  locationName: string;
  province?: string;
  city?: string;
  suburb?: string;
  maxItems?: number;
  activeTab?: FeedTab | null;
  onTabChange?: (tab: FeedTab) => void;
  neutralMode?: boolean;
  visibleTabs?: readonly FeedTab[];
  viewAllHref?: Partial<Record<FeedTab, string>>;
  standardizeDevelopmentUnitCards?: boolean;
  cardLayout?: 'carousel' | 'wide';
  requirePhotoReadyDevelopments?: boolean;
  showTabs?: boolean;
  sectionClassName?: string;
  headingEyebrow?: string;
  headingTitle?: string;
  headingDescription?: string;
}

type TrendingFeedItem = {
  id: string;
  kind: 'development' | 'listing' | 'unit';
  title: string;
  city: string;
  suburb: string;
  priceFrom: number | null;
  priceTo: number | null;
  image: string;
  href: string;
  listingType?: 'sale' | 'rent';
  bedrooms?: number | null;
  bedroomRange?: { min: number | null; max: number | null };
  bathrooms?: number | null;
  area?: number | null;
  yardSize?: number | null;
  unitSize?: number | null;
  propertyType?: string | null;
  developmentName?: string | null;
  status?: 'launching-soon' | 'selling' | 'sold-out';
  availabilityState?: 'available' | 'sold_out' | 'not_stated';
  publisherName?: string | null;
  badges?: string[];
};

const FEED_TABS: Array<{ label: string; value: FeedTab }> = [
  { label: 'Buy', value: 'buy' },
  { label: 'Rentals', value: 'rent' },
  { label: 'Developments', value: 'developments' },
  { label: 'Shared Living', value: 'shared_living' },
  { label: 'Plot & Land', value: 'plot_land' },
  { label: 'Commercial', value: 'commercial' },
];

const TAB_COPY: Record<FeedTab, { title: string; subtitle: string }> = {
  buy: {
    title: 'Residential Properties for Sale',
    subtitle: 'Explore published homes and residential opportunities in this area.',
  },
  rent: {
    title: 'Residential Properties for Rent',
    subtitle: 'Browse published rental stock in this area.',
  },
  developments: {
    title: 'New Developments',
    subtitle: 'Explore current development activity and newly published projects.',
  },
  shared_living: {
    title: 'Shared Living',
    subtitle: 'Find student accommodation and shared-living opportunities.',
  },
  plot_land: {
    title: 'Plot & Land',
    subtitle: 'View published plots and land-focused developments in this market.',
  },
  commercial: {
    title: 'Commercial Listings',
    subtitle: 'See published commercial opportunities for rent and sale.',
  },
};

export function LocationTrendingFeedSection({
  sectionId,
  locationName,
  province,
  city,
  suburb,
  maxItems = 5,
  activeTab: controlledActiveTab,
  onTabChange,
  neutralMode = false,
  visibleTabs,
  viewAllHref,
  standardizeDevelopmentUnitCards = false,
  cardLayout = 'carousel',
  requirePhotoReadyDevelopments = false,
  showTabs = true,
  sectionClassName,
  headingEyebrow,
  headingTitle,
  headingDescription,
}: LocationTrendingFeedSectionProps) {
  const [internalTab, setInternalTab] = useState<FeedTab | null>(neutralMode ? null : 'buy');
  const rentJourneyEnabled = isHomepageHeroJourneyEnabled('rent');
  const developmentsJourneyEnabled = isHomepageHeroJourneyEnabled('developments');
  // Public search entry does not release generic development inventory.
  const landJourneyEnabled = isHomepageHeroJourneyEnabled('plot_land') && isLandVerticalAvailable();
  const requestedActiveTab = controlledActiveTab !== undefined ? controlledActiveTab : internalTab;
  const activeTab =
    requestedActiveTab === 'rent' && !rentJourneyEnabled
      ? null
      : requestedActiveTab === 'developments' && !developmentsJourneyEnabled
        ? null
        : requestedActiveTab === 'plot_land' && !landJourneyEnabled
          ? null
          : requestedActiveTab;
  const visibleFeedTabs = FEED_TABS.filter(
    tab =>
      (!visibleTabs || visibleTabs.includes(tab.value)) &&
      (tab.value !== 'rent' || rentJourneyEnabled) &&
      (tab.value !== 'developments' || developmentsJourneyEnabled) &&
      (tab.value !== 'plot_land' || landJourneyEnabled),
  );
  const sharedLivingHandsOff = activeTab === 'shared_living';

  const feedQuery = trpc.developer.getHomeTrendingFeed.useQuery(
    {
      tab: activeTab || 'buy',
      province,
      city,
      suburb,
      limit: maxItems,
    },
    { enabled: Boolean(activeTab) && !sharedLivingHandsOff },
  );

  const sourceItems = (feedQuery.data?.items || []) as TrendingFeedItem[];
  const eligibleItems = sourceItems.filter(
    item =>
      !requirePhotoReadyDevelopments ||
      item.kind !== 'development' ||
      Boolean(getPrimaryDevelopmentImageUrl(item.image)),
  );
  const items = eligibleItems.slice(0, maxItems);
  const visibleCardCount = cardLayout === 'wide' ? 2 : 4;
  const hasCarouselOverflow = items.length > visibleCardCount;
  const carouselItemBasis =
    cardLayout === 'wide'
      ? items.length === 1
        ? 'basis-full md:basis-full lg:basis-3/4'
        : 'basis-full md:basis-1/2'
      : 'basis-full md:basis-1/2 lg:basis-1/3 xl:basis-1/4';

  const copy = activeTab
    ? TAB_COPY[activeTab]
    : {
        title: `Explore ${locationName}`,
        subtitle: 'Choose a supported journey to see local opportunities in this area.',
      };
  const title = headingTitle || (activeTab ? `${copy.title} in ${locationName}` : copy.title);
  const description = headingDescription || copy.subtitle;

  return (
    <section
      id={sectionId}
      className={
        sectionClassName || 'py-10 bg-white rounded-2xl border border-slate-200/80 px-4 md:px-6'
      }
      aria-labelledby={sectionId ? `${sectionId}-title` : undefined}
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {headingEyebrow ? (
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.13em] text-[#2774AE]">
              {headingEyebrow}
            </p>
          ) : null}
          <h2
            id={sectionId ? `${sectionId}-title` : undefined}
            className="text-xl md:text-2xl font-bold text-slate-900"
          >
            {title}
          </h2>
          <p className="text-sm text-slate-600 mt-1">{description}</p>
        </div>
        {activeTab && viewAllHref?.[activeTab] ? (
          <Link
            href={viewAllHref[activeTab]}
            className="inline-flex min-h-10 items-center gap-2 self-start rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:border-[#2774AE] hover:text-[#2774AE] sm:self-auto"
          >
            {activeTab === 'buy'
              ? 'View all homes'
              : activeTab === 'rent'
                ? 'View all rentals'
                : activeTab === 'developments'
                  ? 'View all developments'
                  : 'View all'}
            <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </div>

      {showTabs ? (
        <div className="mb-7 flex justify-start overflow-x-auto pb-2 scrollbar-hide">
          <div
            className="inline-flex flex-nowrap justify-start gap-2"
            role="group"
            aria-label={`${locationName} property type`}
          >
            {visibleFeedTabs.map(tab => (
              <button
                key={tab.value}
                type="button"
                disabled={neutralMode && tab.value !== 'buy'}
                aria-disabled={neutralMode && tab.value !== 'buy'}
                aria-pressed={activeTab === tab.value}
                onClick={() => {
                  if (neutralMode && tab.value !== 'buy') return;
                  if (controlledActiveTab === undefined) {
                    setInternalTab(tab.value);
                  }
                  onTabChange?.(tab.value);
                }}
                className={`rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.value
                    ? 'border-[#2774AE] bg-[#2774AE] text-white shadow-sm'
                    : neutralMode && tab.value !== 'buy'
                      ? 'cursor-not-allowed border-slate-200 text-slate-400'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-[#2774AE] hover:text-[#2774AE]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div
        id={sectionId ? `${sectionId}-panel` : 'location-trending-feed-panel'}
        aria-live="polite"
        aria-busy={feedQuery.isLoading}
      >
        {!activeTab ? (
          <div className="rounded-xl border border-slate-100 border-dashed bg-white py-10 text-center text-slate-500">
            Choose a supported journey to view published opportunities in this area.
          </div>
        ) : sharedLivingHandsOff ? (
          <div className="rounded-xl border border-slate-100 border-dashed bg-white py-10 text-center text-slate-600">
            <p>
              Shared Living uses its own canonical location search rather than this display
              location.
            </p>
            <a
              href="/shared-living"
              className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Browse Shared Living
            </a>
          </div>
        ) : feedQuery.isLoading ? (
          <div
            className={`grid grid-cols-1 gap-4 ${cardLayout === 'wide' ? 'md:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-4'}`}
            role="status"
            aria-label={`Loading ${copy.title.toLowerCase()}`}
          >
            {Array.from({ length: Math.min(maxItems, visibleCardCount) }, (_, index) => (
              <div key={index} className="h-[300px] animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : feedQuery.isError ? (
          <div
            className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-8 text-center text-slate-700"
            role="alert"
          >
            <p>We couldn’t load this area’s published opportunities.</p>
            <button
              type="button"
              className="mt-3 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100"
              onClick={() => void feedQuery.refetch()}
            >
              Try again
            </button>
          </div>
        ) : items.length > 0 ? (
          <div className="group/carousel relative w-full max-w-[1240px]">
            <Carousel opts={{ align: 'start', loop: hasCarouselOverflow }} className="w-full">
              <CarouselContent className="-ml-3 pb-2 justify-start">
                {items.map(item => (
                  <CarouselItem key={item.id} className={`pl-3 ${carouselItemBasis}`}>
                    <div className="relative">
                      {item.kind === 'listing' ? (
                        <SimpleHomeListingCard
                          id={item.id}
                          title={item.title}
                          city={item.city}
                          suburb={item.suburb}
                          image={item.image || ''}
                          href={item.href}
                          price={item.priceFrom}
                          bedrooms={item.bedrooms}
                          bathrooms={item.bathrooms}
                          area={item.area}
                          yardSize={item.yardSize}
                          propertyType={item.propertyType}
                          listingType={item.listingType}
                          badgeLabel={
                            standardizeDevelopmentUnitCards
                              ? item.listingType === 'rent'
                                ? 'For rent'
                                : 'For sale'
                              : item.listingType === 'rent'
                                ? 'Property listing'
                                : 'Resale'
                          }
                        />
                      ) : item.kind === 'unit' ? (
                        standardizeDevelopmentUnitCards ? (
                          <SimpleHomeListingCard
                            id={item.id}
                            title={item.title}
                            city={item.city}
                            suburb={item.suburb}
                            image={item.image || ''}
                            href={item.href}
                            price={item.priceFrom}
                            bedrooms={item.bedrooms}
                            bathrooms={item.bathrooms}
                            area={item.unitSize}
                            yardSize={item.yardSize}
                            listingType={item.listingType}
                            propertyType={item.propertyType}
                            badgeLabel={
                              item.listingType === 'rent' ? 'For rent' : 'For sale · Off-plan'
                            }
                          />
                        ) : (
                          <SimpleDevelopmentUnitCard
                            id={item.id}
                            title={item.title}
                            developmentName={item.developmentName || 'Featured Development'}
                            city={item.city}
                            suburb={item.suburb}
                            image={item.image || ''}
                            href={item.href}
                            priceFrom={item.priceFrom}
                            priceTo={item.priceTo}
                            listingType={item.listingType}
                            bedrooms={item.bedrooms}
                            bathrooms={item.bathrooms}
                            unitSize={item.unitSize}
                            yardSize={item.yardSize}
                            badgeLabel="New development"
                          />
                        )
                      ) : (
                        <SimpleDevelopmentCard
                          id={item.id}
                          title={item.title}
                          city={item.city}
                          suburb={item.suburb}
                          priceRange={{ min: item.priceFrom, max: item.priceTo }}
                          image={getPrimaryDevelopmentImageUrl(item.image) || ''}
                          slug={item.kind === 'development' ? item.id : undefined}
                          href={item.href}
                          bedrooms={item.bedrooms}
                          bedroomRange={item.bedroomRange}
                          listingType={item.listingType}
                          status={item.status}
                          availabilityState={item.availabilityState}
                          publisherName={item.publisherName}
                        />
                      )}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {hasCarouselOverflow ? (
                <>
                  <CarouselPrevious className="-left-4 lg:left-0 opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 bg-white/95 shadow-lg border-gray-100 translate-x-1/2" />
                  <CarouselNext className="-right-4 lg:right-0 opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 bg-white/95 shadow-lg border-gray-100 -translate-x-1/2" />
                </>
              ) : null}
            </Carousel>
          </div>
        ) : (
          <div
            className="rounded-xl border border-slate-100 border-dashed bg-white py-10 text-center text-slate-500"
            role="status"
          >
            {activeTab === 'developments' && sourceItems.length > 0 && items.length === 0
              ? `No photo-ready public developments are listed in ${locationName} right now.`
              : activeTab === 'buy'
                ? `No photo-ready homes or available development units for sale are listed in ${locationName} right now.`
                : activeTab === 'rent'
                  ? `No photo-ready homes or available development units for rent are listed in ${locationName} right now.`
                  : activeTab === 'developments'
                    ? `No public residential developments are listed in ${locationName} right now.`
                    : 'No published inventory found for this location yet.'}
          </div>
        )}
      </div>
    </section>
  );
}
