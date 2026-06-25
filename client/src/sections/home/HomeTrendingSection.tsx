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
import type { HeroTab } from '@/types/hero';

type HomeTrendingSectionProps = {
  selectedProvince: string;
  onProvinceChange: (province: string) => void;
  activeHeroTab: HeroTab;
};

type TrendingItem = {
  id: string;
  kind: 'development' | 'listing' | 'unit';
  title: string;
  city: string;
  suburb: string;
  priceFrom: number;
  priceTo: number;
  image: string;
  href: string;
  listingType?: 'sale' | 'rent' | 'auction';
  bedrooms?: number | null;
  bathrooms?: number | null;
  area?: number | null;
  yardSize?: number | null;
  unitSize?: number | null;
  propertyType?: string | null;
  developmentName?: string | null;
  badges?: string[];
};

const PROVINCES = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Mpumalanga',
  'Limpopo',
  'North West',
  'Free State',
  'Northern Cape',
];

const TAB_COPY: Record<HeroTab, { titleBase: string; subtitleBase: string }> = {
  buy: {
    titleBase: 'Trending homes for sale',
    subtitleBase: 'See live sale opportunities that match the intent you selected above.',
  },
  rent: {
    titleBase: 'Trending rentals',
    subtitleBase: 'Browse in-demand rental homes and apartments by province.',
  },
  developments: {
    titleBase: 'Trending new developments',
    subtitleBase: 'Explore development stock, new launches, and project opportunities by province.',
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
    titleBase: 'Commercial property opportunities',
    subtitleBase:
      'Discover office, retail, industrial, and mixed-use opportunities in growth areas.',
  },
};

const MOBILE_FRIENDLY_SUBTITLES: Record<HeroTab, string> = {
  buy: 'Discover standout homes for sale across South Africa.',
  rent: 'Browse in-demand rental homes and apartments available now.',
  developments: 'Explore new residential and mixed-use developments across South Africa.',
  shared_living: 'Find student accommodation and shared living in prime urban hubs.',
  plot_land: 'View land opportunities suited to building or long-term investment.',
  commercial: 'Discover office, retail, and industrial projects in growth corridors.',
};

export function HomeTrendingSection({
  selectedProvince,
  onProvinceChange,
  activeHeroTab,
}: HomeTrendingSectionProps) {
  const railLimit = 10;
  const heroContent = {
    title: `${TAB_COPY[activeHeroTab].titleBase} in ${selectedProvince}`,
    subtitle: MOBILE_FRIENDLY_SUBTITLES[activeHeroTab] || TAB_COPY[activeHeroTab].subtitleBase,
  };

  const { data: trendingData } = trpc.developer.getHomeTrendingFeed.useQuery({
    tab: activeHeroTab,
    province: selectedProvince,
    limit: railLimit,
  });

  const trendingItems = ((trendingData?.items || []) as TrendingItem[]).slice(0, railLimit);

  return (
    <section className="home-section">
      <div className="home-section-header">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1">
          <span className="text-lg">🔥</span>
          <span className="text-sm font-semibold text-orange-600">Trending Now</span>
        </div>
        <h2 className="home-section-title max-w-[20.5rem] text-[1.125rem] font-bold text-slate-900 sm:max-w-none sm:text-xl md:text-[26px]">
          {heroContent.title}
        </h2>
        <p className="max-w-[21rem] text-[13px] leading-5 text-slate-600 sm:max-w-2xl sm:text-sm sm:leading-6 md:max-w-2xl md:text-sm md:leading-6">
          {heroContent.subtitle}
        </p>
      </div>

      <div className="home-section-tabs scrollbar-hide -mx-4 flex justify-start overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="inline-flex h-auto flex-nowrap justify-start gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
          {PROVINCES.map(province => (
            <button
              key={province}
              onClick={() => onProvinceChange(province)}
              className={`whitespace-nowrap rounded-lg border border-transparent px-3 py-2 text-[13px] font-semibold transition-all md:px-4 md:text-sm ${
                selectedProvince === province
                  ? 'bg-[#2774AE] text-white shadow-sm'
                  : 'bg-transparent text-slate-600 hover:text-[#2774AE] hover:bg-white'
              }`}
            >
              {province}
            </button>
          ))}
        </div>
      </div>

      {trendingItems.length > 0 ? (
        <div className="group/carousel relative w-full">
          <Carousel opts={{ align: 'start', loop: trendingItems.length > 4 }} className="w-full">
            <CarouselContent className="-ml-2 pb-2 justify-start">
              {trendingItems.map((item, index) => (
                <CarouselItem
                  key={item.id}
                  className="basis-[77%] pl-2 sm:basis-[64%] md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                >
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-2 z-10 rounded-full bg-white/90 px-2 py-1 text-xs font-bold text-slate-700 shadow-sm">
                      #{index + 1}
                    </span>
                    {item.kind === 'listing' ? (
                      <SimpleHomeListingCard
                        id={item.id}
                        title={item.title}
                        city={item.city}
                        suburb={item.suburb}
                        image={item.image || ''}
                        href={item.href}
                        price={item.priceFrom}
                        listingType={item.listingType}
                        bedrooms={item.bedrooms}
                        bathrooms={item.bathrooms}
                        area={item.area}
                        yardSize={item.yardSize}
                        propertyType={item.propertyType}
                        badgeLabel="Resale"
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
                        priceRange={{
                          min: item.priceFrom,
                          max: item.priceTo,
                        }}
                        image={getPrimaryDevelopmentImageUrl(item.image) || ''}
                        slug={item.kind === 'development' ? item.id : undefined}
                        href={item.href}
                        isHotSelling
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
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
          <h3 className="text-sm font-bold text-slate-900">
            No live matches in {selectedProvince} yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            We are not showing placeholder inventory here. Try another province or start a broader
            search while more listings are being added.
          </p>
          <a
            href={
              activeHeroTab === 'rent'
                ? '/property-to-rent'
                : activeHeroTab === 'developments'
                  ? '/developments'
                  : '/property-for-sale'
            }
            className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Browse available property
          </a>
        </div>
      )}
    </section>
  );
}
