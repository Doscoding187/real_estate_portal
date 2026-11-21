import { useEffect, useMemo, useState } from 'react';
import { Link, useRoute } from 'wouter';
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  Headphones,
  MapPin,
  Search,
  Star,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import {
  formatCategoryLabel,
  getCategoryMeta,
  serviceCategoryFromSlug,
  serviceJourneyContextFromSearch,
  slugifyLocationSegment,
  toProviderSlug,
  toServiceCategorySlug,
  buildProviderProfilePath,
  buildServiceCategoryPath,
  buildServiceLocationPath,
  buildServiceRequestPath,
  type ServiceCategory,
} from '@/features/services/catalog';
import {
  CanonicalPlaceSelector,
  type CanonicalPlaceSelection,
} from '@/components/location/CanonicalPlaceSelector';
import { canonicalPlaceSelectionFromResolved } from '@/lib/canonicalPlaceSelection';
import { isCanonicalPlaceId } from '@shared/placeAuthority';
import { servicesUi } from '@/features/services/design';
import {
  ServicesResultsPanel,
  type ServicesAvailability,
  type ServicesResultFilters,
  type ServicesSort,
} from '@/components/services/ServicesResultsPanel';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { ServicesSiteFooter } from '@/components/services/ServicesSiteFooter';
import type { ProviderDirectoryItem } from '@/components/services/ProviderCard';
import { applySeo } from '@/lib/seo';
import { buildServiceBreadcrumbStructuredData } from '@/features/services/seoStructuredData';
import { useServicesLocation } from '@/features/services/useServicesLocation';
import { useApiAvailability } from '@/components/ApiAvailabilityBoundary';
import { POPULAR_SERVICE_GROUPS } from '@/features/services/media';
import {
  getServiceFocusLandingOverride,
  SERVICE_CATEGORY_LANDING_CONTENT,
  type ServiceCategoryLandingContent,
} from '@/features/services/categoryLanding';
import { getServiceTopicPage, ServiceTopicPage } from './ServiceTopicPage';

function parsePriceParam(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function withResultSearchParams(
  path: string,
  filters: Pick<ServicesResultFilters, 'minPrice' | 'maxPrice' | 'availability' | 'sort'>,
  serviceQuery?: string,
): string {
  const [base, rawQuery = ''] = path.split('?');
  const params = new URLSearchParams(rawQuery);
  const normalizedServiceQuery = serviceQuery?.trim();
  params.delete('query');
  if (normalizedServiceQuery) params.set('query', normalizedServiceQuery);
  const minPrice = Number(filters.minPrice);
  const maxPrice = Number(filters.maxPrice);
  if (Number.isFinite(minPrice) && minPrice > 0)
    params.set('minPrice', String(Math.round(minPrice)));
  if (Number.isFinite(maxPrice) && maxPrice > 0)
    params.set('maxPrice', String(Math.round(maxPrice)));
  if (filters.availability === 'accepting') params.set('availability', 'accepting');
  if (filters.sort !== 'relevance') params.set('sort', filters.sort);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export default function ServicesCategoryPage() {
  const [, params] = useRoute('/services/:category');
  const { pathname, search, setLocation } = useServicesLocation();
  const { isUnavailable } = useApiAvailability();
  const categoryParam = String(params?.category || '').trim();
  const serviceTopic = getServiceTopicPage(slugifyLocationSegment(categoryParam));
  const parsedCategory = serviceCategoryFromSlug(categoryParam);
  const category = parsedCategory || ('home_improvement' as ServiceCategory);
  const rawPlaceId = new URLSearchParams(search).get('canonicalPlaceId');
  const initialPlaceId = isCanonicalPlaceId(rawPlaceId) ? rawPlaceId : null;
  const resolvedPlaceQuery = trpc.placeAuthority.resolveSearchPlace.useQuery(
    { placeId: initialPlaceId || '' },
    { enabled: Boolean(initialPlaceId) && !isUnavailable, refetchOnWindowFocus: false },
  );
  const resolvedPlace = useMemo(
    () => canonicalPlaceSelectionFromResolved(resolvedPlaceQuery.data),
    [resolvedPlaceQuery.data],
  );
  const [placeOverride, setPlaceOverride] = useState<CanonicalPlaceSelection | null | undefined>(
    undefined,
  );
  const placeSelection = placeOverride === undefined ? resolvedPlace : placeOverride;
  const invalidPlaceAuthority = rawPlaceId !== null && !isCanonicalPlaceId(rawPlaceId);

  const initialQuery = useMemo(() => {
    const queryParams = new URLSearchParams(search);
    return {
      query: queryParams.get('query') || undefined,
      requestUnmatched: queryParams.get('request') === 'unmatched',
      propertyId: queryParams.get('propertyId') || undefined,
      listingId: queryParams.get('listingId') || undefined,
      developmentId: queryParams.get('developmentId') || undefined,
      intentStage: queryParams.get('intentStage') || undefined,
      sourceSurface: queryParams.get('sourceSurface') || undefined,
      sourceDetail: queryParams.get('sourceDetail') || undefined,
      reasonKey: queryParams.get('reasonKey') || undefined,
      minPrice: parsePriceParam(queryParams.get('minPrice')),
      maxPrice: parsePriceParam(queryParams.get('maxPrice')),
      availability: (queryParams.get('availability') === 'accepting'
        ? 'accepting'
        : 'any') as ServicesAvailability,
      sort: (['relevance', 'rating', 'name'].includes(queryParams.get('sort') || '')
        ? queryParams.get('sort')
        : 'relevance') as ServicesSort,
    };
  }, [search]);

  const journeyContext = {
    ...serviceJourneyContextFromSearch(search),
  };

  const focusedService = useMemo(() => {
    const query = initialQuery.query?.trim().toLowerCase();
    if (!query) return null;
    return (
      POPULAR_SERVICE_GROUPS.find(
        service => service.category === category && service.query.toLowerCase() === query,
      ) || null
    );
  }, [category, initialQuery.query]);
  const landingContent: ServiceCategoryLandingContent = useMemo(
    () => ({
      ...SERVICE_CATEGORY_LANDING_CONTENT[category],
      ...getServiceFocusLandingOverride(focusedService?.key),
    }),
    [category, focusedService?.key],
  );
  const requestPlanning = landingContent.planningOptions;
  const requestDetails = landingContent.requestDetails;
  const [selectedPlanningKey, setSelectedPlanningKey] = useState<string | null>(null);
  const selectedPlanningOption = requestPlanning.find(option => option.key === selectedPlanningKey);
  const focusedSearchLabel = focusedService?.label || initialQuery.query?.trim() || null;
  const selectedServiceLabel = focusedService?.label || formatCategoryLabel(category);
  const isPlumbingFocus = focusedService?.key === 'plumbing';
  const servicePathwayTitle = isPlumbingFocus ? (
    <>
      <span className="block">Explore</span>
      <span className="block">our plumbing</span>
      <span className="block">services</span>
    </>
  ) : (
    <>Explore our {formatCategoryLabel(category).toLowerCase()} services</>
  );
  const servicePathwayDescription = isPlumbingFocus
    ? 'Whatever your plumbing need, find the right professional.'
    : landingContent.serviceIntro;
  const heroTitle =
    isPlumbingFocus ? (
      <>
        <span className="block">Plumbing &amp;</span>{' '}
        <span className="block">Maintenance</span>
      </>
    ) : (
      landingContent.title
    );

  const [filters, setFilters] = useState<ServicesResultFilters>({
    category,
    canonicalPlaceId: initialPlaceId,
    minPrice: initialQuery.minPrice ? String(initialQuery.minPrice) : '',
    maxPrice: initialQuery.maxPrice ? String(initialQuery.maxPrice) : '',
    availability: initialQuery.availability,
    sort: initialQuery.sort,
  });

  const providersQuery = trpc.servicesEngine.directorySearch.useQuery(
    {
      category: filters.category,
      query: initialQuery.query,
      canonicalPlaceId: initialPlaceId || undefined,
      minPrice: initialQuery.minPrice,
      maxPrice: initialQuery.maxPrice,
      availability: initialQuery.availability,
      sort: initialQuery.sort,
      limit: 20,
    },
    { enabled: Boolean(parsedCategory) && !invalidPlaceAuthority && !isUnavailable },
  );
  const providers = (isUnavailable ? [] : providersQuery.data || []) as ProviderDirectoryItem[];
  const categoryMeta = getCategoryMeta(category);
  const hasLocation = Boolean(initialPlaceId);
  const resultFocusLabel = focusedSearchLabel || categoryMeta.label;
  const hasNoPublishedMatches =
    !isUnavailable && !providersQuery.isLoading && !providersQuery.error && providers.length === 0;

  useEffect(() => {
    if (!parsedCategory) return;
    const canonicalCategorySlug = toServiceCategorySlug(parsedCategory);
    if (categoryParam === canonicalCategorySlug) return;

    setLocation(`/services/${canonicalCategorySlug}${search}`, { replace: true });
  }, [categoryParam, parsedCategory, search, setLocation]);

  useEffect(() => {
    const categoryLabel = formatCategoryLabel(category);
    applySeo({
      title: `${categoryLabel} Services | Property Listify`,
      description: `Browse published ${categoryLabel.toLowerCase()} providers and their listed service coverage.`,
      canonicalPath: `/services/${toServiceCategorySlug(category)}`,
      structuredData: parsedCategory
        ? buildServiceBreadcrumbStructuredData([
            { label: 'Home', path: '/' },
            { label: 'Services', path: '/services' },
            { label: categoryLabel },
          ])
        : undefined,
    });
  }, [category, parsedCategory]);

  useEffect(() => {
    setFilters({
      category,
      canonicalPlaceId: initialPlaceId,
      minPrice: initialQuery.minPrice ? String(initialQuery.minPrice) : '',
      maxPrice: initialQuery.maxPrice ? String(initialQuery.maxPrice) : '',
      availability: initialQuery.availability,
      sort: initialQuery.sort,
    });
  }, [
    category,
    initialPlaceId,
    initialQuery.minPrice,
    initialQuery.maxPrice,
    initialQuery.availability,
    initialQuery.sort,
  ]);

  useEffect(() => {
    setPlaceOverride(undefined);
  }, [search]);

  useEffect(() => {
    setSelectedPlanningKey(null);
  }, [focusedService?.key, initialQuery.query]);

  useEffect(() => {
    if (window.location.hash !== '#provider-results') return;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById('provider-results')?.scrollIntoView({ block: 'start' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname, search]);

  if (serviceTopic && !parsedCategory) {
    return <ServiceTopicPage topic={serviceTopic} />;
  }

  if (!parsedCategory) {
    return (
      <>
        <EnhancedNavbar />
        <main className="min-h-screen bg-[#FDFDFD] px-4 py-12 md:px-6">
          <div className={`${servicesUi.surface} mx-auto max-w-3xl p-8`}>
            <h1 className="font-sans text-2xl font-bold tracking-[-0.03em] text-[#0B1B2A]">
              Service category unavailable
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#4B5C6B]">
              Choose a supported service category from the Property Listify directory.
            </p>
            <button
              type="button"
              onClick={() => setLocation('/services')}
              className={`${servicesUi.action} mt-6`}
            >
              Browse services
            </button>
          </div>
        </main>
      </>
    );
  }

  function applyFilters(next: ServicesResultFilters) {
    setFilters(next);
    const nextPath = buildServiceLocationPath(next.category, next.canonicalPlaceId, {
      ...journeyContext,
    });
    setLocation(
      withResultSearchParams(
        nextPath,
        next,
        next.category === category ? initialQuery.query : undefined,
      ),
    );
  }

  function resetFilters() {
    const cleared: ServicesResultFilters = {
      category,
      canonicalPlaceId: null,
      minPrice: '',
      maxPrice: '',
      availability: 'any',
      sort: 'relevance',
    };
    setFilters(cleared);
    setPlaceOverride(null);
    setLocation(
      buildServiceCategoryPath(category, { ...journeyContext, canonicalPlaceId: undefined }),
    );
  }

  function profileHref(provider: ProviderDirectoryItem) {
    return buildProviderProfilePath(
      toProviderSlug(provider.companyName, provider.providerId),
      search,
      {
        ...journeyContext,
        category,
        providerId: provider.providerId,
        serviceCode: provider.services?.find(service => service.category === category)?.code || '',
      },
    );
  }

  function startRequest(providerId: number) {
    const serviceCode =
      providers
        .find(provider => provider.providerId === providerId)
        ?.services?.find(service => service.category === category)?.code || '';
    setLocation(buildServiceRequestPath(category, providerId, serviceCode, journeyContext));
  }

  function serviceFocusHref(query: string) {
    const nextParams = new URLSearchParams(search);
    nextParams.set('query', query);
    const nextQuery = nextParams.toString();
    return `/services/${toServiceCategorySlug(category)}${nextQuery ? `?${nextQuery}` : ''}`;
  }

  function clearServiceFocus() {
    const nextParams = new URLSearchParams(search);
    nextParams.delete('query');
    const nextQuery = nextParams.toString();
    setLocation(`/services/${toServiceCategorySlug(category)}${nextQuery ? `?${nextQuery}` : ''}`);
  }

  function updateHeroPlace(place: CanonicalPlaceSelection | null) {
    setPlaceOverride(place);
    setFilters(current => ({ ...current, canonicalPlaceId: place?.canonicalPlaceId ?? null }));
  }

  function browseProviderResults() {
    const nextPath = buildServiceLocationPath(
      category,
      placeSelection?.canonicalPlaceId,
      journeyContext,
    );
    setLocation(
      `${withResultSearchParams(nextPath, filters, initialQuery.query)}#provider-results`,
    );
  }

  return (
    <>
      <EnhancedNavbar />
      <main className="bg-[#FDFDFD] text-[#0B1B2A]">
        <section className="relative isolate overflow-hidden bg-[#EAF5FB]">
          <img
            src={landingContent.heroImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[70%_15%]"
            fetchPriority="high"
          />
          <div
            className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(90deg,#F7FCFF_0%,rgba(247,252,255,0.98)_40%,rgba(247,252,255,0)_78%)] md:w-[66%] md:bg-[linear-gradient(90deg,#F7FCFF_0%,rgba(247,252,255,0.98)_48%,rgba(247,252,255,0)_100%)]"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-[54%] -left-[17%] h-[140%] w-[58%] rounded-full bg-white/35"
            aria-hidden="true"
          />
          <div className="relative mx-auto w-full max-w-7xl px-4 pb-7 pt-3 md:px-6 md:pb-8 md:pt-3">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-[12px] text-[#587082]"
            >
              <Link href="/" className="transition hover:text-[#0B1B2A]">
                Home
              </Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <Link href="/services" className="transition hover:text-[#0B1B2A]">
                Services
              </Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-medium text-[#0B1B2A]">
                {focusedSearchLabel || categoryMeta.label}
              </span>
            </nav>

            <div className="mt-5 max-w-[610px]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#BDF2D9] px-3 py-1 text-[11px] font-semibold text-[#116E54]">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Property Listify Services
              </span>
              <h1 className="mt-3 font-sans text-[38px] font-bold leading-[0.98] tracking-[-0.055em] text-[#0B1B2A] md:text-[50px]">
                {heroTitle}
              </h1>
              <p className="mt-3 max-w-[530px] text-[15px] font-semibold leading-6 text-[#183955] md:text-[17px]">
                {landingContent.description}
              </p>

              <div className="mt-4 max-w-[690px] rounded-[24px] border border-white/90 bg-white p-1.5 shadow-[0_16px_34px_-22px_rgba(2,17,30,0.55)] sm:flex sm:items-center sm:gap-0 sm:rounded-full sm:p-1">
                <div className="flex h-[52px] items-center gap-2 rounded-[18px] px-3 sm:min-w-[220px] sm:border-r sm:border-[#E3EBF0] sm:rounded-none">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAF5FF] text-[#0E78BE]">
                    <Wrench className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-medium leading-3 text-[#6B7B88]">
                      What do you need?
                    </span>
                    <span className="block truncate text-[13px] font-semibold leading-5 text-[#183955]">
                      {selectedServiceLabel}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#547083]" aria-hidden="true" />
                </div>

                <div className="flex h-[52px] min-w-0 flex-1 items-center gap-2 rounded-[18px] bg-[#F8FBFC] px-3 sm:rounded-none sm:bg-transparent">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAF5FF] text-[#0E78BE]">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium leading-3 text-[#6B7B88]">Your area</p>
                    <div className="relative min-w-0">
                      <CanonicalPlaceSelector
                        value={placeSelection}
                        onChange={updateHeroPlace}
                        compact
                        label="Location"
                        purpose="search"
                        placeholder="Choose your area"
                        labelClassName="sr-only"
                        inputClassName="h-5 border-0 bg-transparent p-0 pr-7 text-[13px] font-semibold text-[#183955] shadow-none outline-none focus-visible:ring-0"
                        statusClassName="sr-only"
                      />
                      <ChevronDown
                        className="pointer-events-none absolute right-1 top-1/2 h-4 w-4 -translate-y-1/2 text-[#547083]"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={browseProviderResults}
                  className="mt-1 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#168363] px-5 text-[13px] font-semibold text-white transition hover:bg-[#116E54] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168363] sm:mt-0 sm:w-auto sm:shrink-0"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Find Professionals
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-medium text-[#315663]">
                {[
                  'Verified Professionals',
                  'Local Coverage',
                  'Trusted Reviews',
                ].map(item => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <BadgeCheck className="h-3.5 w-3.5 text-[#21A66C]" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="service-pathways-heading"
          className="bg-white px-4 py-12 md:px-6 md:py-14"
        >
          <div className="mx-auto w-full max-w-7xl">
            <div className="grid gap-7 lg:grid-cols-[minmax(160px,0.24fr)_minmax(0,1fr)] lg:items-start">
              <div>
                <h2
                  id="service-pathways-heading"
                  className="font-sans text-[25px] font-bold leading-[0.98] tracking-[-0.045em] text-[#0B1B2A] md:text-[29px]"
                >
                  {servicePathwayTitle}
                </h2>
                <p className="mt-3 max-w-[180px] text-[12px] font-medium leading-[1.45] text-[#24435A]">
                  {servicePathwayDescription}
                </p>
                {focusedSearchLabel && (
                  <button
                    type="button"
                    onClick={clearServiceFocus}
                    className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-[#168363] transition hover:text-[#116E54]"
                  >
                    View all services
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {landingContent.servicePathways.map(pathway => {
                  const Icon = pathway.icon;
                  return (
                    <Link
                      key={pathway.key}
                      href={serviceFocusHref(pathway.query)}
                      onClick={() => {
                        if (pathway.planningKey) setSelectedPlanningKey(pathway.planningKey);
                      }}
                      className="group flex min-h-[84px] items-center gap-3.5 rounded-xl border border-[#E1EAF0] bg-white px-3.5 py-3 shadow-[0_7px_16px_-14px_rgba(2,17,30,0.45)] transition hover:-translate-y-0.5 hover:border-[#168363]/45 hover:shadow-[0_12px_22px_-16px_rgba(2,17,30,0.55)]"
                    >
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#EAF4FF] text-[#0874C9]">
                        <Icon className="h-8 w-8" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1 whitespace-pre-line text-[13px] font-bold leading-[1.12] text-[#0B1B2A]">
                        {pathway.title}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-[#154969] transition group-hover:translate-x-0.5 group-hover:text-[#0874C9]" aria-hidden="true" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 pb-12 md:px-6 md:pb-14">
          <div className="mx-auto grid w-full max-w-7xl overflow-hidden rounded-xl bg-[#EAFBF4] sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: ShieldCheck,
                title: 'Verified Professionals',
                body: 'for your peace of mind',
              },
              {
                icon: MapPin,
                title: 'Local Experts',
                body: 'in your area',
              },
              {
                icon: Star,
                title: 'Real Customer Reviews',
                body: 'from homeowners',
              },
              {
                icon: Headphones,
                title: 'Dedicated Support',
                body: 'when you need help',
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className={`flex items-center gap-3 px-5 py-4 ${
                    index > 0 ? 'lg:border-l lg:border-[#BCE5D7]' : ''
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[#078664]">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[12px] font-bold leading-4 text-[#0B1B2A]">{item.title}</p>
                    <p className="text-[11px] leading-4 text-[#315663]">{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section
          aria-labelledby="category-introduction-heading"
          className="bg-[#F8FBFA] px-4 py-12 md:px-6 md:py-16"
        >
          <div className="mx-auto w-full max-w-7xl">
            <div className="grid gap-5 lg:grid-cols-[minmax(220px,0.82fr)_minmax(260px,0.96fr)_minmax(230px,0.68fr)] lg:items-stretch">
              <div className="relative min-h-[270px] overflow-hidden rounded-3xl bg-[#DDEFE9] sm:min-h-[340px]">
                <img
                  src={landingContent.featureImage}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
                <div
                  className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#02111E]/55 to-transparent"
                  aria-hidden="true"
                />
                <p className="absolute bottom-5 left-5 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#116E54] shadow-sm">
                  Property Listify Services
                </p>
              </div>

              <div className="flex flex-col justify-center py-2 lg:px-2">
                <p className={servicesUi.eyebrow}>Find the right fit</p>
                <h2
                  id="category-introduction-heading"
                  className="mt-2 font-sans text-3xl font-bold leading-tight tracking-[-0.04em] text-[#0B1B2A] md:text-[38px]"
                >
                  {landingContent.featureTitle}
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-6 text-[#4B5C6B] md:text-[15px]">
                  {landingContent.featureDescription}
                </p>
                <ul className="mt-5 space-y-2.5 text-sm leading-5 text-[#315663]">
                  {requestDetails.map(detail => (
                    <li key={detail} className="flex gap-2.5">
                      <BadgeCheck
                        className="mt-0.5 h-4 w-4 shrink-0 text-[#168363]"
                        aria-hidden="true"
                      />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={browseProviderResults}
                  className={`${servicesUi.action} mt-6 w-fit`}
                >
                  Browse published providers
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <aside className="flex flex-col rounded-3xl border border-[#BCE0D3] bg-[linear-gradient(145deg,#F1FBF7_0%,#FFFFFF_58%,#E0F5ED_100%)] p-6 shadow-[0_20px_46px_-38px_rgba(2,17,30,0.55)]">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#168363] shadow-sm">
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#168363]">
                  Marketplace availability
                </p>
                <h3 className="mt-2 text-xl font-bold tracking-[-0.025em] text-[#0B1B2A]">
                  {isUnavailable
                    ? 'Provider availability is temporarily unavailable'
                    : hasNoPublishedMatches
                      ? 'No published providers match this search yet'
                      : `Explore published ${resultFocusLabel} providers`}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#4B5C6B]">
                  {isUnavailable
                    ? 'You can keep exploring this category while live provider and coverage information reconnects.'
                    : hasNoPublishedMatches
                      ? 'We have not widened your search or sent a request to an unrelated provider. Try another approved Place or return as supply grows.'
                      : 'Review each provider’s listed services and coverage before selecting who to contact.'}
                </p>
                <div className="mt-auto space-y-3 pt-6">
                  <button
                    type="button"
                    onClick={hasNoPublishedMatches ? resetFilters : browseProviderResults}
                    className={`${servicesUi.action} h-11 w-full justify-center`}
                  >
                    {hasNoPublishedMatches ? 'Browse wider category' : 'Browse providers'}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <Link
                    href="/advertise/services"
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#168363] px-4 text-sm font-semibold text-[#116E54] transition hover:bg-white"
                  >
                    Join as a provider
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="category-guides-heading"
          className="bg-white px-4 py-14 md:px-6 md:py-16"
        >
          <div className="mx-auto w-full max-w-7xl">
            <div className="grid gap-6 lg:grid-cols-[minmax(220px,0.36fr)_minmax(0,1fr)] lg:items-start">
              <div>
                <p className={servicesUi.eyebrow}>Helpful guides</p>
                <h2
                  id="category-guides-heading"
                  className="mt-2 font-sans text-3xl font-bold tracking-[-0.035em] text-[#0B1B2A] md:text-[38px] md:leading-[1.08]"
                >
                  Get ready before you enquire
                </h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-[#4B5C6B]">
                  Use these practical prompts to make your first provider conversation more useful.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {landingContent.guides.map((guide, index) => {
                  const Icon = guide.icon;
                  return (
                    <article
                      key={guide.title}
                      className="group overflow-hidden rounded-2xl border border-[#E3EBF0] bg-white transition hover:-translate-y-0.5 hover:border-[#168363]/40 hover:shadow-[0_18px_36px_-28px_rgba(2,17,30,0.55)]"
                    >
                      <div className="relative aspect-[16/8] overflow-hidden bg-[#EDF8F6]">
                        <img
                          src={landingContent.guideImages[index] || landingContent.featureImage}
                          alt=""
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                          loading="lazy"
                        />
                        <span className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#168363] shadow-sm">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                      </div>
                      <div className="p-5">
                        <h3 className="text-[15px] font-bold text-[#0B1B2A]">{guide.title}</h3>
                        <p className="mt-2 text-[13px] leading-5 text-[#4B5C6B]">
                          {guide.description}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="service-planning-heading"
          className="bg-[#F7FAFB] px-4 py-12 md:px-6 md:py-14"
        >
          <div className="mx-auto w-full max-w-7xl">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <p className={servicesUi.eyebrow}>Plan your request</p>
                <h2
                  id="service-planning-heading"
                  className="mt-2 font-sans text-2xl font-bold tracking-[-0.03em] text-[#0B1B2A] md:text-3xl"
                >
                  Tell a provider what kind of work you are planning
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-[#4B5C6B]">
                These prompts help you frame the request. They do not promise emergency,
                same-day, material, price, or project availability.
              </p>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {requestPlanning.map((option, index) => {
                const isSelected = option.key === selectedPlanningKey;
                return (
                  <button
                    key={option.key}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() =>
                      setSelectedPlanningKey(current =>
                        current === option.key ? null : option.key,
                      )
                    }
                    className={`rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? 'border-[#168363] bg-white shadow-[0_12px_24px_-20px_rgba(2,17,30,0.7)]'
                        : 'border-[#D7E7E1] bg-white/70 hover:border-[#168363]/60 hover:bg-white'
                    }`}
                  >
                    <span className="text-[11px] font-semibold tracking-[0.14em] text-[#168363]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="mt-2 block text-sm font-bold text-[#0B1B2A]">
                      {option.title}
                    </span>
                    <span className="mt-1.5 block text-[13px] leading-5 text-[#4B5C6B]">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedPlanningOption && (
              <div className="mt-4 rounded-2xl border border-[#BCE0D3] bg-white px-4 py-3 text-sm leading-6 text-[#315663]">
                <span className="font-semibold text-[#0B1B2A]">When you contact a provider: </span>
                {selectedPlanningOption.nextStep}
              </div>
            )}
          </div>
        </section>

        {initialQuery.requestUnmatched && (
          <div className="mx-auto mt-6 w-full max-w-7xl px-4 md:px-6">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
              No published provider currently covers this request. It was not sent to an unrelated
              provider; browse the available options or try a wider area.
            </div>
          </div>
        )}

        {invalidPlaceAuthority && (
          <div className="mx-auto mt-6 w-full max-w-7xl px-4 md:px-6">
            <div
              role="alert"
              className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"
            >
              This Place selection is invalid. Choose an approved Place to search within a location.
            </div>
          </div>
        )}

        {isUnavailable && (
          <div className="mx-auto mt-6 w-full max-w-7xl px-4 md:px-6">
            <div
              role="status"
              className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900"
            >
              Live provider availability is temporarily unavailable while the application service
              reconnects. You can continue exploring this category, but no provider or coverage
              information is being shown.
            </div>
          </div>
        )}

        <section
          id="provider-results"
          aria-label="Published providers"
          className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-8 md:px-6 md:py-10"
        >
          <ServicesResultsPanel
            filters={filters}
            onApply={applyFilters}
            onReset={resetFilters}
            providers={providers}
            isLoading={!isUnavailable && providersQuery.isLoading}
            error={isUnavailable || Boolean(providersQuery.error)}
            summary={
              isUnavailable
                ? 'Live provider availability is temporarily unavailable'
                : hasLocation
                  ? `Showing ${providers.length} provider${providers.length === 1 ? '' : 's'} in ${placeSelection?.label || 'the selected Place'} for ${resultFocusLabel}`
                  : `Showing ${providers.length} published ${resultFocusLabel} provider${providers.length === 1 ? '' : 's'}`
            }
            emptyMessage="No published providers match this service and location yet. Try another area or browse the wider category directory."
            profileHref={profileHref}
            onContact={startRequest}
            placeSelection={placeSelection}
            onPlaceChange={updateHeroPlace}
          />
        </section>

        <section className="bg-[#F2F8F7] px-4 py-14 md:px-6 md:py-16">
          <div className="mx-auto grid w-full max-w-7xl overflow-hidden rounded-3xl border border-[#D7E7E1] bg-white shadow-[0_20px_50px_-42px_rgba(2,17,30,0.5)] lg:grid-cols-[minmax(220px,0.62fr)_minmax(0,1fr)_minmax(240px,0.62fr)]">
            <div className="relative min-h-[230px] bg-[#DDEFE9] lg:min-h-full">
              <img
                src={landingContent.providerImage}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
              <div
                className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#02111E]/45 to-transparent"
                aria-hidden="true"
              />
            </div>
            <div className="p-6 md:p-8 lg:py-9">
              <p className={servicesUi.eyebrow}>For service businesses</p>
              <h2 className="mt-2 font-sans text-2xl font-bold tracking-[-0.035em] text-[#0B1B2A] md:text-3xl">
                Grow your {resultFocusLabel.toLowerCase()} business presence
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#4B5C6B]">
                Apply to create a reviewable business profile, show the services and Places you
                cover, and complete your private onboarding. Profiles stay private until an
                authorised reviewer approves publication.
              </p>
              <Link
                href="/advertise/services"
                className={`${servicesUi.action} mt-6 h-11 justify-center`}
              >
                Apply as a provider
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="border-t border-[#D7E7E1] bg-[#F7FCFA] p-6 lg:border-l lg:border-t-0 lg:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#168363]">
                Your business presence
              </p>
              <ul className="mt-5 space-y-3 text-sm leading-5 text-[#315663]">
                {[
                  'Create a professional business profile.',
                  'Present your published services and coverage.',
                  'Maintain service descriptions in your workspace.',
                  'Complete private onboarding before review.',
                ].map(item => (
                  <li key={item} className="flex gap-2.5">
                    <BadgeCheck
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#168363]"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <ServicesSiteFooter />
      </main>
    </>
  );
}
