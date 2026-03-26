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

export function HomeTrendingSection({
  selectedProvince,
  onProvinceChange,
  activeHeroTab,
}: HomeTrendingSectionProps) {
  const railLimit = 10;
  const heroContent = {
    title: `${TAB_COPY[activeHeroTab].titleBase} in ${selectedProvince}`,
    subtitle: TAB_COPY[activeHeroTab].subtitleBase,
  };

  const { data: trendingData } = trpc.developer.getHomeTrendingFeed.useQuery({
    tab: activeHeroTab,
    province: selectedProvince,
    limit: railLimit,
  });
  const trendingItems = (trendingData?.items || []).slice(0, railLimit);

  return (
    <section className="py-16">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-full px-3 py-1 mb-4">
          <span className="text-lg">🔥</span>
          <span className="text-sm font-semibold text-orange-600">Trending Now</span>
        </div>
        <h2 className="text-xl md:text-[26px] font-bold text-slate-900 mb-2">{heroContent.title}</h2>
        <p className="text-slate-600 max-w-2xl text-xs md:text-sm">{heroContent.subtitle}</p>
      </div>

      <div className="flex justify-start mb-10 overflow-x-auto pb-4 scrollbar-hide">
        <div className="inline-flex flex-nowrap justify-start gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 h-auto">
          {PROVINCES.map(province => (
            <button
              key={province}
              onClick={() => onProvinceChange(province)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold border border-transparent transition-all whitespace-nowrap ${
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
                  className="pl-3 basis-full md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
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
                        image={item.image}
                        href={item.href}
                        price={item.priceFrom}
                        bedrooms={item.bedrooms ?? null}
                        bathrooms={item.bathrooms ?? null}
                        area={item.area ?? null}
                        propertyType={item.propertyType ?? null}
                        badgeLabel="Resale"
                      />
                    ) : item.kind === 'unit' ? (
                      (() => {
                        const unitItem = item as typeof item & {
                          bedrooms?: number | null;
                          bathrooms?: number | null;
                          unitSize?: number | null;
                        };

                        return (
                          <SimpleDevelopmentUnitCard
                            id={unitItem.id}
                            title={unitItem.title}
                            developmentName={unitItem.developmentName || 'Featured Development'}
                            city={unitItem.city}
                            suburb={unitItem.suburb}
                            image={unitItem.image}
                            href={unitItem.href}
                            priceFrom={unitItem.priceFrom}
                            priceTo={unitItem.priceTo}
                            bedrooms={unitItem.bedrooms ?? null}
                            bathrooms={unitItem.bathrooms ?? null}
                            unitSize={unitItem.unitSize ?? null}
                            badgeLabel="New Development"
                          />
                        );
                      })()
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
                        image={
                          item.kind === 'development'
                            ? getPrimaryDevelopmentImageUrl(item.image) || ''
                            : item.image || ''
                        }
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
        <div className="py-12 text-center text-slate-500 bg-white rounded-lg border border-slate-100 border-dashed">
          No live inventory found for this province yet.
        </div>
      )}
    </section>
  );
}
