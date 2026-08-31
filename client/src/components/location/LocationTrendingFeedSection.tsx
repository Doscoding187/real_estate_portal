import { useState } from 'react';
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

export type FeedTab =
  | 'buy'
  | 'rent'
  | 'developments'
  | 'shared_living'
  | 'plot_land'
  | 'commercial';

interface LocationTrendingFeedSectionProps {
  locationName: string;
  province?: string;
  city?: string;
  suburb?: string;
  maxItems?: number;
  activeTab?: FeedTab | null;
  onTabChange?: (tab: FeedTab) => void;
  neutralMode?: boolean;
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
  locationName,
  province,
  city,
  suburb,
  maxItems = 5,
  activeTab: controlledActiveTab,
  onTabChange,
  neutralMode = false,
}: LocationTrendingFeedSectionProps) {
  const [internalTab, setInternalTab] = useState<FeedTab | null>(neutralMode ? null : 'buy');
  const rentJourneyEnabled = isHomepageHeroJourneyEnabled('rent');
  const developmentsJourneyEnabled = isHomepageHeroJourneyEnabled('developments');
  const requestedActiveTab = controlledActiveTab !== undefined ? controlledActiveTab : internalTab;
  const activeTab =
    requestedActiveTab === 'rent' && !rentJourneyEnabled
      ? null
      : requestedActiveTab === 'developments' && !developmentsJourneyEnabled
        ? null
        : requestedActiveTab;
  const visibleFeedTabs = FEED_TABS.filter(
    tab =>
      (tab.value !== 'rent' || rentJourneyEnabled) &&
      (tab.value !== 'developments' || developmentsJourneyEnabled),
  );
  const sharedLivingHandsOff = activeTab === 'shared_living';

  const { data: feedData } = trpc.developer.getHomeTrendingFeed.useQuery(
    {
      tab: activeTab || 'buy',
      province,
      city,
      suburb,
      limit: maxItems,
    },
    { enabled: Boolean(activeTab) && !sharedLivingHandsOff },
  );

  const items = ((feedData?.items || []) as TrendingFeedItem[]).slice(0, maxItems);

  const copy = activeTab
    ? TAB_COPY[activeTab]
    : {
        title: `Explore ${locationName}`,
        subtitle: 'Choose a supported journey to see local opportunities in this area.',
      };
  const title = activeTab ? `${copy.title} in ${locationName}` : copy.title;

  return (
    <section className="py-10 bg-white rounded-2xl border border-slate-200/80 px-4 md:px-6">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600 mt-1">{copy.subtitle}</p>
      </div>

      <div className="flex justify-start mb-7 overflow-x-auto pb-2 scrollbar-hide">
        <div className="inline-flex flex-nowrap justify-start gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
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
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.value
                  ? 'bg-[#2774AE] text-white shadow-sm'
                  : neutralMode && tab.value !== 'buy'
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'text-slate-600 hover:text-[#2774AE] hover:bg-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {!activeTab ? (
        <div className="rounded-xl border border-slate-100 border-dashed bg-white py-10 text-center text-slate-500">
          Choose a supported journey to view published opportunities in this area.
        </div>
      ) : sharedLivingHandsOff ? (
        <div className="rounded-xl border border-slate-100 border-dashed bg-white py-10 text-center text-slate-600">
          <p>
            Shared Living uses its own canonical location search rather than this display location.
          </p>
          <a
            href="/shared-living"
            className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Browse Shared Living
          </a>
        </div>
      ) : items.length > 0 ? (
        <div className="group/carousel relative w-full max-w-[1240px]">
          <Carousel opts={{ align: 'start', loop: items.length > 4 }} className="w-full">
            <CarouselContent className="-ml-3 pb-2 justify-start">
              {items.map(item => (
                <CarouselItem
                  key={item.id}
                  className="pl-3 basis-full md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                >
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
                        badgeLabel={item.listingType === 'rent' ? 'Property listing' : 'Resale'}
                      />
                    ) : item.kind === 'unit' ? (
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
                        isHotSelling
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
            <CarouselPrevious className="-left-4 lg:left-0 opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 bg-white/95 shadow-lg border-gray-100 translate-x-1/2" />
            <CarouselNext className="-right-4 lg:right-0 opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 bg-white/95 shadow-lg border-gray-100 -translate-x-1/2" />
          </Carousel>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-100 border-dashed bg-white py-10 text-center text-slate-500">
          No published inventory found for this location yet.
        </div>
      )}
    </section>
  );
}
