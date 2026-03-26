import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { SimpleDevelopmentCard } from '@/components/SimpleDevelopmentCard';
import { SimplePropertyListingCard } from '@/components/SimplePropertyListingCard';
import { getPrimaryDevelopmentImageUrl } from '@/lib/mediaUtils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import type { SimplePropertyListingCardProps } from '@/components/SimplePropertyListingCard';

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
  activeTab?: FeedTab;
  onTabChange?: (tab: FeedTab) => void;
}

type FeedItem = {
  id: string;
  kind: 'development' | 'listing' | 'placeholder';
  title: string;
  city: string;
  suburb: string;
  priceFrom: number;
  priceTo: number;
  image: string;
  href: string;
  listingType?: SimplePropertyListingCardProps['listingType'];
  bedrooms?: number | null;
  bathrooms?: number | null;
  area?: number | null;
  yardSize?: number | null;
  developmentName?: string | null;
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
    title: 'Trending Residential Properties for Sale',
    subtitle: 'Discover in-demand homes and residential opportunities in this area.',
  },
  rent: {
    title: 'Trending Residential Properties for Rent',
    subtitle: 'Browse the latest rental stock and high-demand rental properties.',
  },
  developments: {
    title: 'Trending Developments',
    subtitle: 'Explore current development activity and newly published projects.',
  },
  shared_living: {
    title: 'Trending Shared Living',
    subtitle: 'Find student accommodation and shared-living opportunities.',
  },
  plot_land: {
    title: 'Trending Plot & Land',
    subtitle: 'View popular plots and land-focused developments in this market.',
  },
  commercial: {
    title: 'Trending Commercial Listings',
    subtitle: 'See active commercial opportunities for rent and sale.',
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
}: LocationTrendingFeedSectionProps) {
  const [internalTab, setInternalTab] = useState<FeedTab>('buy');
  const activeTab = controlledActiveTab ?? internalTab;

  const { data: feedData } = trpc.developer.getHomeTrendingFeed.useQuery({
    tab: activeTab,
    province,
    city,
    suburb,
    limit: maxItems,
  });

  const items = ((feedData?.items || []) as FeedItem[]).slice(0, maxItems);

  const copy = TAB_COPY[activeTab];
  const title = `${copy.title} in ${locationName}`;

  return (
    <section className="py-10 bg-white rounded-2xl border border-slate-200/80 px-4 md:px-6">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600 mt-1">{copy.subtitle}</p>
      </div>

      <div className="flex justify-start mb-7 overflow-x-auto pb-2 scrollbar-hide">
        <div className="inline-flex flex-nowrap justify-start gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          {FEED_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => {
                if (controlledActiveTab === undefined) {
                  setInternalTab(tab.value);
                }
                onTabChange?.(tab.value);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.value
                  ? 'bg-[#2774AE] text-white shadow-sm'
                  : 'text-slate-600 hover:text-[#2774AE] hover:bg-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {items.length > 0 ? (
        <div className="group/carousel relative w-full max-w-[1240px]">
          <Carousel opts={{ align: 'start', loop: items.length > 4 }} className="w-full">
            <CarouselContent className="-ml-3 pb-2 justify-start">
              {items.map((item, index) => (
                <CarouselItem
                  key={item.id}
                  className="pl-3 basis-full md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                >
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-2 z-10 rounded-full bg-white/90 px-2 py-1 text-xs font-bold text-slate-700 shadow-sm">
                      #{index + 1}
                    </span>
                    {item.kind === 'listing' ? (
                      <SimplePropertyListingCard
                        id={item.id}
                        title={item.title}
                        city={item.city}
                        suburb={item.suburb}
                        price={item.priceFrom}
                        listingType={item.listingType}
                        image={item.image || ''}
                        href={item.href}
                        bedrooms={item.bedrooms}
                        bathrooms={item.bathrooms}
                        area={item.area}
                        yardSize={item.yardSize}
                        developmentName={item.developmentName}
                        badges={item.badges}
                      />
                    ) : (
                      <SimpleDevelopmentCard
                        id={item.id}
                        title={item.title}
                        city={item.city}
                        suburb={item.suburb}
                        priceRange={{ min: item.priceFrom, max: item.priceTo }}
                        image={
                          item.kind === 'development'
                            ? getPrimaryDevelopmentImageUrl(item.image) || ''
                            : item.image || ''
                        }
                        slug={item.kind === 'development' ? item.id : undefined}
                        href={item.href}
                        isHotSelling={item.kind !== 'placeholder'}
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
        <div className="py-12 text-center text-slate-500 bg-white rounded-lg border border-slate-100 border-dashed">
          No properties found.
        </div>
      )}
    </section>
  );
}
