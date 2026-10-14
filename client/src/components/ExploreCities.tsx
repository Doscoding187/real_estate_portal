import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, MapPin, ChevronDown, Building } from 'lucide-react';
import { getCityGuideImage, getProvinceGuideImage } from '@/lib/cityGuideImages';
import { HOME_PROVINCE_OPTIONS } from '@/lib/homeProvinceOptions';

export interface CityGuideLocation {
  name: string;
  province: string;
  slug: string;
  provinceSlug: string;
  image?: string;
  propertyCount?: string;
  featured?: boolean;
}
export interface CityGuideRequestState {
  isLoading: boolean;
  isError: boolean;
  isFetching?: boolean;
  onRetry: () => void;
}
export interface CityGuideProvinceSelection {
  name: string;
  slug: string;
  onChange: (province: string) => void;
}
interface ExploreCitiesProps {
  provinceSlug?: string;
  title?: string;
  description?: string;
  customLocations?: CityGuideLocation[];
  basePath?: string;
  queryParams?: string;
  initialLimit?: number;
  withinContentRail?: boolean;
  guideCards?: boolean;
  requestState?: CityGuideRequestState;
  selectedGuideProvince?: string;
  onGuideProvinceChange?: (province: string) => void;
}

function CityScene({ city }: { city: CityGuideLocation }) {
  const candidates = [
    getCityGuideImage(city.provinceSlug, city.slug),
    getProvinceGuideImage(city.provinceSlug),
    {
      thumbnail:
        '/placeholders/urban-illustration-with-large-buildings-with-cars-and-trees-city-activities-vector.jpg',
      srcSet: undefined,
      scope: 'general',
      alt: 'City guide illustration',
    },
  ].filter(
    (image, index, images) =>
      image && images.findIndex(other => other?.thumbnail === image.thumbnail) === index,
  );
  const [failedCount, setFailedCount] = useState(0);
  useEffect(() => setFailedCount(0), [city.provinceSlug, city.slug]);
  const artwork = candidates[failedCount];
  return (
    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
      {artwork ? (
        <img
          src={artwork.thumbnail}
          srcSet={artwork.srcSet}
          sizes="64px"
          alt={artwork.alt || `AI-generated city scene of ${city.name}`}
          data-image-scope={artwork.scope}
          width={480}
          height={270}
          loading="lazy"
          decoding="async"
          onError={() => setFailedCount(count => count + 1)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
          <Building className="h-10 w-10 text-blue-600" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

export function ExploreCities({
  provinceSlug,
  title,
  description,
  customLocations,
  basePath = '/property-for-sale',
  queryParams = '',
  initialLimit = 12,
  withinContentRail = false,
  guideCards = false,
  requestState,
  selectedGuideProvince,
  onGuideProvinceChange,
}: ExploreCitiesProps = {}) {
  const [visibleCount, setVisibleCount] = useState(initialLimit);
  useEffect(() => setVisibleCount(initialLimit), [provinceSlug, initialLimit]);
  const allCities = (customLocations ?? []).filter(
    city => !provinceSlug || city.provinceSlug === provinceSlug,
  );
  const displayedCities = allCities.slice(0, visibleCount);
  const remainingCount = Math.max(0, allCities.length - visibleCount);
  const displayTitle = title || 'Explore property by city';
  const displayDescription =
    description ||
    (guideCards
      ? 'Get to know the neighbourhoods, local insights and property opportunities in our city guides.'
      : 'Use local guides to explore areas, listings and neighbourhood insights.');
  const mobileRows = ['grid-rows-1', 'grid-rows-2', 'grid-rows-3'][
    Math.min(3, displayedCities.length || initialLimit) - 1
  ];
  const gridClassName = guideCards
    ? `home-card-grid scrollbar-hide -mx-4 grid grid-flow-col ${mobileRows} auto-cols-[78vw] snap-x overflow-x-auto px-4 pb-2 sm:mx-0 sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-2 sm:grid-rows-none sm:overflow-visible sm:px-0 lg:grid-cols-4`
    : 'home-card-grid scrollbar-hide -mx-4 flex snap-x overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4';
  const cityHref = (city: CityGuideLocation) => {
    if (basePath === '/property-for-sale' || basePath === '/property-to-rent') {
      const params = new URLSearchParams(queryParams.replace(/^[?&]/, ''));
      params.set('province', city.provinceSlug);
      params.set('city', city.slug);
      return `${basePath}?${params.toString()}`;
    }
    return `${basePath}/${city.provinceSlug}/${city.slug}${queryParams}`.replace(/\/\//g, '/');
  };
  return (
    <section className="home-section bg-white">
      <div className={withinContentRail ? 'home-section-content' : 'container'}>
        <div className="home-section-header flex flex-wrap items-end justify-between gap-4 text-left">
          <div className="max-w-3xl">
            <h2 className="home-section-title text-[1.125rem] font-bold text-slate-900 sm:text-xl md:text-[26px]">
              {displayTitle}
            </h2>
            <p className="max-w-3xl text-[13px] leading-5 text-slate-600 md:text-sm md:leading-6">
              {displayDescription}
            </p>
          </div>
        </div>
        {guideCards && selectedGuideProvince && onGuideProvinceChange && (
          <div className="home-section-tabs scrollbar-hide -mx-4 flex justify-start overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            <div
              role="group"
              aria-label="City guide province"
              className="inline-flex h-auto flex-nowrap justify-start gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5"
            >
              {HOME_PROVINCE_OPTIONS.map(province => (
                <button
                  key={province}
                  type="button"
                  aria-pressed={selectedGuideProvince === province}
                  onClick={() => onGuideProvinceChange(province)}
                  className={`min-h-[44px] whitespace-nowrap rounded-lg border border-transparent px-3 py-2 text-[13px] font-semibold transition-all md:px-4 md:text-sm ${selectedGuideProvince === province ? 'bg-[#2774AE] text-white shadow-sm' : 'bg-transparent text-slate-600 hover:text-[#2774AE] hover:bg-white'}`}
                >
                  {province}
                </button>
              ))}
            </div>
          </div>
        )}
        {requestState?.isLoading ? (
          <div role="status" aria-label="Loading city guides" className={gridClassName}>
            {Array.from({ length: initialLimit }, (_, index) => (
              <Skeleton key={index} className="h-[104px] rounded-xl" />
            ))}
          </div>
        ) : requestState?.isError ? (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center"
          >
            <h3 className="font-semibold text-slate-900">City guides could not be loaded</h3>
            <p className="mt-2 text-sm text-slate-600">
              {selectedGuideProvince
                ? 'Choose another province or try again.'
                : 'Please try again.'}
            </p>
            <Button
              variant="outline"
              className="mt-4 min-h-[44px] bg-white"
              disabled={requestState.isFetching}
              onClick={requestState.onRetry}
            >
              {requestState.isFetching ? 'Trying again…' : 'Try again'}
            </Button>
          </div>
        ) : displayedCities.length ? (
          <>
            <div className={gridClassName}>
              {displayedCities.map(city => (
                <Link
                  key={`${city.provinceSlug}/${city.slug}`}
                  href={cityHref(city)}
                  className={`group flex-none snap-start rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2774AE] ${guideCards ? 'min-w-0 transition-colors hover:bg-slate-50' : 'w-[75vw] max-w-[236px] sm:w-auto'}`}
                >
                  <div
                    className={
                      guideCards
                        ? 'flex h-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:gap-4 sm:border-transparent sm:bg-transparent'
                        : 'flex h-full items-start gap-3 rounded-xl border border-slate-200 p-3 sm:gap-4 sm:border-transparent sm:hover:bg-slate-50'
                    }
                  >
                    {guideCards && <CityScene city={city} />}
                    {!guideCards && (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600 sm:h-16 sm:w-16">
                        <Building className="h-6 w-6 sm:h-8 sm:w-8" aria-hidden="true" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-slate-900 group-hover:text-[#2774AE] sm:text-base">
                        {city.name}
                      </h3>
                      {!guideCards && city.propertyCount && (
                        <p className="mt-1 text-sm text-slate-600">{city.propertyCount}</p>
                      )}
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                        {city.province}
                      </p>
                      {guideCards && (
                        <span className="mt-1.5 inline-flex min-h-[24px] items-center gap-1.5 text-xs font-semibold text-[#2774AE]">
                          Explore guide{' '}
                          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {guideCards && (
              <p className="mt-3 text-xs text-slate-500">
                AI illustrations. Cities without their own cover use a province scene.
              </p>
            )}
            {remainingCount > 0 && (
              <div className="mt-5 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount(count => count + initialLimit)}
                  className="min-h-[44px] rounded-full border-slate-200 bg-white text-slate-700"
                >
                  {guideCards ? 'Show more city guides' : 'Show more locations'}{' '}
                  <ChevronDown className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <Building className="mx-auto h-8 w-8 text-slate-500" aria-hidden="true" />
            <h3 className="mt-3 font-semibold text-slate-900">
              {guideCards
                ? selectedGuideProvince
                  ? `No city guides in ${selectedGuideProvince} yet`
                  : 'No city guides to show yet'
                : 'No locations to explore here yet'}
            </h3>
            {guideCards && (
              <p className="mt-2 text-sm text-slate-600">
                Choose another province to explore its city guides.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
