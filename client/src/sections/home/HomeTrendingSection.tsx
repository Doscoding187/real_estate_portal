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
import type { HeroTab } from '@/types/hero';

type HomeTrendingSectionProps = {
  selectedProvince: string;
  onProvinceChange: (province: string) => void;
  activeHeroTab: HeroTab;
};

type TrendingItem = {
  id: string;
  kind: 'development' | 'listing';
  title: string;
  city: string;
  suburb: string;
  priceFrom: number;
  priceTo: number;
  image: string;
  href: string;
  listingType?: 'sale' | 'rent';
  bedrooms?: number | null;
  bathrooms?: number | null;
  area?: number | null;
  yardSize?: number | null;
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
    titleBase: 'Trending Residential Properties for Sale',
    subtitleBase:
      'Discover the latest and most popular homes for sale across South Africa’s top locations.',
  },
  rent: {
    titleBase: 'Trending Residential Properties for Rent',
    subtitleBase:
      'Browse the newest and most in-demand rental homes and apartments available right now.',
  },
  developments: {
    titleBase: 'Trending Developments',
    subtitleBase:
      'Explore the newest residential, commercial, and mixed-use developments across South Africa.',
  },
  shared_living: {
    titleBase: 'Trending Student & Shared Living',
    subtitleBase:
      'Find modern student accommodation and shared living spaces in prime urban and campus locations.',
  },
  plot_land: {
    titleBase: 'Trending Plot & Land',
    subtitleBase:
      'View the latest plots and land opportunities ideal for building or investment projects.',
  },
  commercial: {
    titleBase: 'Trending Commercial Developments',
    subtitleBase:
      'Discover newly listed office, retail, and industrial developments in high-growth business areas.',
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
  const heroContent = {
    title: `${TAB_COPY[activeHeroTab].titleBase} in ${selectedProvince}`,
    subtitle: MOBILE_FRIENDLY_SUBTITLES[activeHeroTab] || TAB_COPY[activeHeroTab].subtitleBase,
  };

  const { data: trendingData } = trpc.developer.getHomeTrendingFeed.useQuery({
    tab: activeHeroTab,
    province: selectedProvince,
    limit: 5,
  });

  const trendingItems = ((trendingData?.items || []) as TrendingItem[])
    .filter(item => {
      if (item.kind === 'listing') {
        return Boolean(item.image?.trim());
      }

      return Boolean(getPrimaryDevelopmentImageUrl(item.image));
    })
    .slice(0, 5);

  return (
    <section className="py-9 md:py-16">
      <div className="mb-5 md:mb-10">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1">
          <span className="text-lg">🔥</span>
          <span className="text-sm font-semibold text-orange-600">Trending Now</span>
        </div>
        <h2 className="mb-2 max-w-[20.5rem] text-[1.125rem] font-bold text-slate-900 sm:max-w-none sm:text-xl md:text-[26px]">
          {heroContent.title}
        </h2>
        <p className="max-w-[21rem] text-[13px] leading-5 text-slate-600 sm:max-w-2xl sm:text-sm sm:leading-6 md:max-w-2xl md:text-sm md:leading-6">
          {heroContent.subtitle}
        </p>
      </div>

      <div className="scrollbar-hide -mx-4 mb-5 flex justify-start overflow-x-auto px-4 pb-2 md:mb-10 md:pb-4 sm:mx-0 sm:px-0">
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
            <CarouselContent className="-ml-3 pb-2 justify-start">
              {trendingItems.map((item, index) => (
                <CarouselItem
                  key={item.id}
                  className="basis-[77%] pl-3 sm:basis-[64%] md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
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
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white via-white/90 to-transparent md:hidden" />
        </div>
      ) : (
        <div className="py-12 text-center text-slate-500 bg-white rounded-lg border border-slate-100 border-dashed">
          No trending properties found for this selection yet.
        </div>
      )}
    </section>
  );
}
