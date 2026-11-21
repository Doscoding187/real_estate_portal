import { useEffect, useMemo, useState } from 'react';
import { Link, useRoute } from 'wouter';
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  MapPin,
  MessageSquareText,
  ShieldCheck,
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
            <h1 className="font-['Sora'] text-2xl font-bold tracking-[-0.03em] text-[#0B1B2A]">
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
        <section className="relative isolate overflow-hidden bg-[#02111E]">
          <img
            src={landingContent.heroImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            fetchPriority="high"
          />
          <div
            className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,17,30,0.96)_0%,rgba(2,17,30,0.89)_42%,rgba(2,17,30,0.52)_68%,rgba(2,17,30,0.34)_100%)]"
            aria-hidden="true"
          />
          <div className="relative mx-auto w-full max-w-7xl px-4 pb-10 pt-7 md:px-6 md:pb-14 md:pt-9">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-[12px] text-slate-300"
            >
              <Link href="/" className="transition hover:text-white">
                Home
              </Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <Link href="/services" className="transition hover:text-white">
                Services
              </Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-medium text-white">
                {focusedSearchLabel || categoryMeta.label}
              </span>
            </nav>

            <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(380px,0.6fr)] lg:items-end">
              <div className="max-w-3xl">
                <span className="inline-flex rounded-full bg-[#BDF2D9] px-3 py-1 text-[11px] font-semibold text-[#116E54]">
                  Property Listify Services
                </span>
                <h1 className="mt-4 font-['Sora'] text-[38px] font-bold leading-[1.04] tracking-[-0.045em] text-white md:text-[56px]">
                  {landingContent.title}
                </h1>
                <p className="mt-5 max-w-2xl text-[15px] leading-7 text-slate-100 md:text-lg">
                  {landingContent.description}
                </p>

                <div className="mt-8 rounded-2xl border border-white/20 bg-white p-3 shadow-[0_24px_60px_-34px_rgba(0,0,0,0.9)] md:flex md:items-end md:gap-3 md:p-4">
                  <div className="min-w-0 flex-1">
                    <CanonicalPlaceSelector
                      value={placeSelection}
                      onChange={updateHeroPlace}
                      label="Where do you need help?"
                      purpose="search"
                      placeholder="Choose an approved Place"
                      labelClassName="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4B5C6B]"
                      inputClassName="mt-2 h-12 rounded-xl border-[#E3EBF0] bg-[#FDFDFD] px-4 text-[#0B1B2A]"
                      statusClassName="text-xs leading-5 text-[#6B7B88]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={browseProviderResults}
                    className={`${servicesUi.action} mt-3 h-12 w-full shrink-0 md:mt-0 md:w-auto`}
                  >
                    Browse providers
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-3 text-[12px] leading-5 text-slate-200">
                  Choose an approved Place to focus listed coverage, or browse all published
                  providers in this category.
                </p>
              </div>
              <div className="hidden justify-end lg:flex">
                <Link
                  href="/services"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#BDF2D9] transition hover:text-white"
                >
                  All service categories
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="service-pathways-heading"
          className="bg-white px-4 py-14 md:px-6 md:py-16"
        >
          <div className="mx-auto w-full max-w-7xl">
            <div className="grid gap-6 lg:grid-cols-[minmax(220px,0.36fr)_minmax(0,1fr)] lg:items-start">
              <div>
                <p className={servicesUi.eyebrow}>Explore services</p>
                <h2 id="service-pathways-heading" className={`mt-2 ${servicesUi.heading}`}>
                  Start with the work you need
                </h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-[#4B5C6B]">
                  {landingContent.serviceIntro}
                </p>
                {focusedSearchLabel && (
                  <button
                    type="button"
                    onClick={clearServiceFocus}
                    className="mt-5 text-sm font-semibold text-[#168363] transition hover:text-[#116E54]"
                  >
                    Clear {focusedSearchLabel} focus
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {landingContent.servicePathways.map(pathway => {
                  const Icon = pathway.icon;
                  return (
                    <Link
                      key={pathway.key}
                      href={serviceFocusHref(pathway.query)}
                      onClick={() => {
                        if (pathway.planningKey) setSelectedPlanningKey(pathway.planningKey);
                      }}
                      className="group flex min-h-[132px] flex-col rounded-2xl border border-[#E3EBF0] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#168363]/50 hover:shadow-[0_16px_32px_-24px_rgba(2,17,30,0.42)]"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDF8F6] text-[#168363]">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="mt-4 text-[14px] font-bold leading-snug text-[#0B1B2A]">
                        {pathway.title}
                      </span>
                      <span className="mt-1 text-[12px] leading-5 text-[#4B5C6B]">
                        {pathway.description}
                      </span>
                      <span className="mt-auto pt-3 text-[12px] font-semibold text-[#168363]">
                        Explore this service
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#D7E7E1] bg-[#F1FBF7] px-4 py-5 md:px-6">
          <div className="mx-auto grid w-full max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: BadgeCheck,
                title: 'Reviewed publication',
                body: 'Only providers that meet current public eligibility are shown.',
              },
              {
                icon: MapPin,
                title: 'Listed coverage',
                body: 'Check the places a provider has published for its services.',
              },
              {
                icon: ShieldCheck,
                title: 'Reviews when eligible',
                body: 'Published customer feedback appears only where it is available.',
              },
              {
                icon: MessageSquareText,
                title: 'One private enquiry',
                body: 'A request goes only to the provider you select.',
              },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-3 px-1 py-2 lg:px-4">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#168363] shadow-sm">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[13px] font-bold text-[#0B1B2A]">{item.title}</p>
                    <p className="mt-0.5 text-[12px] leading-5 text-[#4B5C6B]">{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section
          aria-labelledby="service-planning-heading"
          className="bg-[#F7FAFB] px-4 py-14 md:px-6 md:py-16"
        >
          <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(300px,0.72fr)]">
            <div className="rounded-3xl border border-[#D7E7E1] bg-[#F4FAF8] p-6 md:p-8">
              <p className={servicesUi.eyebrow}>Plan your request</p>
              <h2
                id="service-planning-heading"
                className="mt-2 font-['Sora'] text-2xl font-bold tracking-[-0.03em] text-[#0B1B2A] md:text-3xl"
              >
                Help a provider understand the work
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4B5C6B]">
                A clearer request helps a provider assess whether they can help. These prompts do
                not confirm emergency, same-day, pricing, material, or project availability.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
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
                  <span className="font-semibold text-[#0B1B2A]">
                    When you contact a provider:{' '}
                  </span>
                  {selectedPlanningOption.nextStep}
                </div>
              )}
            </div>

            <aside className="rounded-3xl border border-[#D7E7E1] bg-white p-6 md:p-7">
              <h3 className="text-xl font-bold tracking-[-0.02em] text-[#0B1B2A]">
                Helpful details to share
              </h3>
              <ul className="mt-5 space-y-4 text-sm leading-6 text-[#4B5C6B]">
                {requestDetails.map(detail => (
                  <li key={detail} className="flex gap-3">
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#168363]"
                      aria-hidden="true"
                    />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 rounded-2xl bg-[#F7FAFB] p-4 text-[12px] leading-5 text-[#6B7B88]">
                Provider profiles show the services and coverage they have published. Availability,
                scope, materials, timing, and any compliance needs must be confirmed with the
                provider.
              </p>
            </aside>
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
                <h2 id="category-guides-heading" className={`mt-2 ${servicesUi.heading}`}>
                  Get ready before you enquire
                </h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-[#4B5C6B]">
                  Use these practical prompts to make your first provider conversation more useful.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {landingContent.guides.map(guide => {
                  const Icon = guide.icon;
                  return (
                    <article
                      key={guide.title}
                      className="rounded-2xl border border-[#E3EBF0] bg-white p-5"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDF8F6] text-[#168363]">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <h3 className="mt-4 text-[15px] font-bold text-[#0B1B2A]">{guide.title}</h3>
                      <p className="mt-2 text-[13px] leading-5 text-[#4B5C6B]">
                        {guide.description}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
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

        {hasNoPublishedMatches && (
          <section
            aria-labelledby="no-provider-match-heading"
            className="mx-auto w-full max-w-7xl px-4 pb-2 pt-8 md:px-6 md:pt-10"
          >
            <div className="grid gap-6 overflow-hidden rounded-3xl border border-[#BCE0D3] bg-[linear-gradient(112deg,#F1FBF7_0%,#FFFFFF_62%,#E8F7F1_100%)] p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-8">
              <div className="max-w-2xl">
                <p className={servicesUi.eyebrow}>Availability update</p>
                <h2
                  id="no-provider-match-heading"
                  className="mt-2 font-['Sora'] text-2xl font-bold tracking-[-0.03em] text-[#0B1B2A]"
                >
                  No published providers match this search yet
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#4B5C6B]">
                  We have not widened your search or sent a request to an unrelated provider. You
                  can choose another approved Place, browse the wider category, or return as
                  provider supply grows.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                <button
                  type="button"
                  onClick={resetFilters}
                  className={`${servicesUi.action} h-11 justify-center whitespace-nowrap`}
                >
                  Browse wider category
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <Link
                  href="/advertise/services"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-[#168363] px-4 text-sm font-semibold text-[#116E54] transition hover:bg-white"
                >
                  Join as a provider
                </Link>
              </div>
            </div>
          </section>
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
          <div className="mx-auto grid w-full max-w-7xl gap-8 rounded-3xl border border-[#D7E7E1] bg-white p-6 shadow-[0_20px_50px_-42px_rgba(2,17,30,0.5)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-9">
            <div className="max-w-3xl">
              <p className={servicesUi.eyebrow}>For service businesses</p>
              <h2 className="mt-2 font-['Sora'] text-2xl font-bold tracking-[-0.035em] text-[#0B1B2A] md:text-3xl">
                Establish your {categoryMeta.label.toLowerCase()} business presence
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#4B5C6B]">
                Apply to create a reviewable business profile, describe the services and Places you
                cover, and complete your private onboarding. Profiles remain private until an
                authorised reviewer approves publication.
              </p>
            </div>
            <Link
              href="/advertise/services"
              className={`${servicesUi.action} h-11 justify-center whitespace-nowrap`}
            >
              Apply as a provider
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <ServicesSiteFooter />
      </main>
    </>
  );
}
