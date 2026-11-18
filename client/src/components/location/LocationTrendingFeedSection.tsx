import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { SimpleDevelopmentCard } from '@/components/SimpleDevelopmentCard';
import { SimpleHomeListingCard } from '@/components/SimpleHomeListingCard';
import { getPrimaryDevelopmentImageUrl } from '@/lib/mediaUtils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

export type FeedTab = 'buy' | 'rent' | 'developments';

interface LocationTrendingFeedSectionProps {
  sectionId: string;
  locationName: string;
  canonicalPlaceId: string;
  tab: FeedTab;
  maxItems?: number;
  cardLayout?: 'carousel' | 'wide';
  requirePhotoReadyDevelopments?: boolean;
  showHeading?: boolean;
  sectionClassName?: string;
  headingTitle?: string;
  headingDescription?: string;
  viewAllHref?: string;
}

const TAB_COPY: Record<FeedTab, { title: string; subtitle: string }> = {
  buy: {
    title: 'Residential properties for sale',
    subtitle: 'Explore published homes and residential opportunities in this area.',
  },
  rent: {
    title: 'Residential properties for rent',
    subtitle: 'Browse published rental stock in this area.',
  },
  developments: {
    title: 'New developments',
    subtitle: 'Explore current development activity and newly published projects.',
  },
};

export function LocationTrendingFeedSection({
  sectionId,
  locationName,
  canonicalPlaceId,
  tab,
  maxItems = 5,
  cardLayout = 'carousel',
  requirePhotoReadyDevelopments = false,
  showHeading = true,
  sectionClassName,
  headingTitle,
  headingDescription,
  viewAllHref,
}: LocationTrendingFeedSectionProps) {
  const feedQuery = trpc.developer.getHomeTrendingFeed.useQuery(
    { tab, canonicalPlaceId, limit: Math.min(Math.max(maxItems, 1), 10) },
    { retry: false, staleTime: 60_000 },
  );

  const sourceItems = feedQuery.data?.items ?? [];
  const items = sourceItems
    .filter(
      item =>
        !requirePhotoReadyDevelopments ||
        item.kind !== 'development' ||
        Boolean(getPrimaryDevelopmentImageUrl(item.image)),
    )
    .slice(0, maxItems);

  const visibleCardCount = cardLayout === 'wide' ? 2 : 4;
  const hasCarouselOverflow = items.length > visibleCardCount;
  const carouselItemBasis =
    cardLayout === 'wide'
      ? items.length === 1
        ? 'basis-full md:basis-full lg:basis-3/4'
        : 'basis-full md:basis-1/2'
      : 'basis-full md:basis-1/2 lg:basis-1/3 xl:basis-1/4';

  const copy = TAB_COPY[tab];
  const title = headingTitle || `${copy.title} in ${locationName}`;
  const description = headingDescription || copy.subtitle;

  return (
    <section
      id={sectionId}
      className={
        sectionClassName || 'py-10 bg-white rounded-2xl border border-slate-200/80 px-4 md:px-6'
      }
      aria-labelledby={showHeading ? `${sectionId}-title` : undefined}
      aria-label={!showHeading ? title : undefined}
    >
      {showHeading ? (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id={`${sectionId}-title`} className="text-xl md:text-2xl font-bold text-slate-900">
              {title}
            </h2>
            <p className="text-sm text-slate-600 mt-1">{description}</p>
          </div>
          {viewAllHref ? (
            <Link
              href={viewAllHref}
              className="inline-flex min-h-10 items-center gap-2 self-start rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:border-[#2774AE] hover:text-[#2774AE] sm:self-auto"
            >
              View all
              <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </div>
      ) : null}

      <div id={`${sectionId}-panel`} aria-live="polite" aria-busy={feedQuery.isLoading}>
        {feedQuery.isLoading ? (
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
                          city=""
                          locationLabel={item.locationLabels?.[0]}
                          image={item.image || ''}
                          href={item.href}
                          price={item.priceFrom}
                          bedrooms={item.bedrooms}
                          bathrooms={item.bathrooms}
                          area={item.area}
                          yardSize={item.yardSize}
                          parkingCount={item.parkingCount}
                          propertyType={item.propertyType}
                          listingType={item.listingType}
                          badgeLabel={item.listingType === 'rent' ? 'For rent' : 'For sale'}
                        />
                      ) : (
                        <SimpleDevelopmentCard
                          id={item.id}
                          title={item.title}
                          locationLabel={item.locationLabels?.[0] ?? ''}
                          priceRange={{ min: item.priceFrom, max: item.priceTo }}
                          image={getPrimaryDevelopmentImageUrl(item.image) || ''}
                          slug={item.id}
                          href={item.href}
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
            {tab === 'developments' && sourceItems.length > 0
              ? `No photo-ready public developments are listed in ${locationName} right now.`
              : tab === 'buy'
                ? `No published homes for sale are listed in ${locationName} right now.`
                : tab === 'rent'
                  ? `No published rentals are listed in ${locationName} right now.`
                  : `No public residential developments are listed in ${locationName} right now.`}
          </div>
        )}
      </div>
    </section>
  );
}
