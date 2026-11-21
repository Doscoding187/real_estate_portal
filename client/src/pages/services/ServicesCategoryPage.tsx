import { useEffect, useMemo, useState } from 'react';
import { Link, useRoute } from 'wouter';
import { ChevronRight } from 'lucide-react';
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

type RequestPlanningOption = {
  key: string;
  title: string;
  description: string;
  nextStep: string;
};

const GENERAL_REQUEST_PLANNING: RequestPlanningOption[] = [
  {
    key: 'prompt-attention',
    title: 'Needs prompt attention',
    description:
      'Something needs to be assessed soon, and you want to explain the immediate issue.',
    nextStep:
      'Describe what happened, when it started, what is affected, and any access constraints.',
  },
  {
    key: 'planned-work',
    title: 'Planned maintenance or repair',
    description:
      'You know what needs attention and want to arrange work around your preferred timing.',
    nextStep: 'Share the condition, property context, preferred timing, and the outcome you want.',
  },
  {
    key: 'installation',
    title: 'Installation or upgrade',
    description: 'You are replacing, adding, or improving something at the property.',
    nextStep:
      'Include the existing setup, dimensions where relevant, and any product or finish preferences.',
  },
  {
    key: 'project',
    title: 'A larger project',
    description:
      'Your request is part of a renovation, move, sale preparation, or another multi-step project.',
    nextStep: 'Outline the scope, desired outcome, access, budget context, and target timeframe.',
  },
];

const PLUMBING_REQUEST_PLANNING: RequestPlanningOption[] = [
  {
    key: 'prompt-attention',
    title: 'Needs prompt attention',
    description:
      'A leak, blockage, loss of water, or another issue needs an assessment as soon as a provider is available.',
    nextStep:
      'State where the issue is, when it started, whether water can be isolated safely, and any access constraints.',
  },
  {
    key: 'planned-work',
    title: 'Maintenance or repair',
    description: 'You want to resolve a recurring issue or arrange preventative plumbing work.',
    nextStep:
      'Describe the fixture, drain, pipework, or area involved and what has already been tried.',
  },
  {
    key: 'installation',
    title: 'Installation or replacement',
    description: 'You are replacing a fixture, upgrading pipework, or planning a new installation.',
    nextStep:
      'Share the existing setup, measurements if known, and any fixture or finish preferences.',
  },
  {
    key: 'project',
    title: 'Renovation or larger project',
    description:
      'Plumbing is one part of a bathroom, kitchen, building, or property improvement project.',
    nextStep:
      'Outline the scope, drawings or photos if available, site access, and the target project timeline.',
  },
];

function requestPlanningFor(serviceKey: string | null): RequestPlanningOption[] {
  return serviceKey === 'plumbing' ? PLUMBING_REQUEST_PLANNING : GENERAL_REQUEST_PLANNING;
}

function requestDetailsFor(serviceKey: string | null): string[] {
  if (serviceKey === 'plumbing') {
    return [
      'Where the issue or planned work is located, and what you can see or hear.',
      'The existing fixture or installation, plus photos or measurements where they are useful.',
      'Any fixture, finish, or material preference — then ask the provider to confirm compatibility before buying.',
    ];
  }

  return [
    'What needs attention, the relevant property area, and the outcome you want.',
    'Any access, timing, budget, or product constraints that could affect the work.',
    'Photos, dimensions, or existing-product details where they will help a provider assess the request.',
  ];
}

export default function ServicesCategoryPage() {
  const [, params] = useRoute('/services/:category');
  const { search, setLocation } = useServicesLocation();
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
  const relatedServices = useMemo(
    () => POPULAR_SERVICE_GROUPS.filter(service => service.category === category && service.query),
    [category],
  );
  const requestPlanning = requestPlanningFor(focusedService?.key || null);
  const requestDetails = requestDetailsFor(focusedService?.key || null);
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

  return (
    <>
      <EnhancedNavbar />
      <main className="bg-[#FDFDFD] text-[#0B1B2A]">
        <div className="mx-auto w-full max-w-7xl px-4 pt-8 md:px-6 md:pt-10">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-[12px] text-[#8A99A6]"
          >
            <Link href="/" className="transition hover:text-[#168363]">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <Link href="/services" className="transition hover:text-[#168363]">
              Services
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-medium text-[#4B5C6B]">{categoryMeta.label}</span>
          </nav>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className={`${servicesUi.heading} text-[30px] md:text-[40px]`}>
                {focusedService
                  ? `Find help with ${focusedService.label}`
                  : focusedSearchLabel
                    ? `Find providers for ${focusedSearchLabel}`
                    : `Find providers for ${categoryMeta.label}`}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4B5C6B]">
                {focusedService
                  ? `Your directory is focused on ${focusedService.label.toLowerCase()}. Compare published provider information and listed coverage, then send a request to the provider you choose.`
                  : `${categoryMeta.subtitle} Compare published services and listed coverage, then send a request to the provider you choose.`}
              </p>
            </div>
            <Link
              href="/services"
              className="text-sm font-semibold text-[#168363] transition hover:text-[#116E54]"
            >
              All service categories
            </Link>
          </div>
        </div>

        <section
          aria-labelledby="service-planning-heading"
          className="mx-auto mt-8 w-full max-w-7xl px-4 md:px-6"
        >
          <div className="overflow-hidden rounded-3xl border border-[#D7E7E1] bg-[#F4FAF8] p-6 md:p-8">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(300px,0.88fr)]">
              <div>
                <p className={servicesUi.eyebrow}>Plan your request</p>
                <h2
                  id="service-planning-heading"
                  className="mt-2 font-['Sora'] text-2xl font-bold tracking-[-0.03em] text-[#0B1B2A] md:text-3xl"
                >
                  Start with the kind of work you have in mind
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4B5C6B]">
                  A clearer request helps a provider understand the job before they respond. These
                  prompts do not confirm emergency, same-day, or project availability — confirm
                  timing directly with the provider you choose.
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

              <aside className="rounded-2xl border border-[#D7E7E1] bg-white p-5 md:p-6">
                {focusedSearchLabel && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3EBF0] pb-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B7B88]">
                        Current service focus
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#0B1B2A]">{focusedSearchLabel}</p>
                    </div>
                    <button
                      type="button"
                      onClick={clearServiceFocus}
                      className="text-xs font-semibold text-[#168363] transition hover:text-[#116E54]"
                    >
                      Clear focus
                    </button>
                  </div>
                )}

                <h3 className="mt-5 text-base font-bold text-[#0B1B2A]">
                  Helpful details to share
                </h3>
                <ul className="mt-3 space-y-3 text-[13px] leading-5 text-[#4B5C6B]">
                  {requestDetails.map(detail => (
                    <li key={detail} className="flex gap-2.5">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#168363]"
                        aria-hidden="true"
                      />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 rounded-xl bg-[#F7FAFB] p-3 text-[12px] leading-5 text-[#6B7B88]">
                  Provider profiles show the services and coverage they have published.
                  Availability, scope, materials, timing, and any compliance needs must be confirmed
                  with the provider.
                </p>
              </aside>
            </div>

            {relatedServices.length > 1 && (
              <div className="mt-8 border-t border-[#D7E7E1] pt-6">
                <p className="text-[12px] font-semibold text-[#4B5C6B]">Change service focus</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {relatedServices.map(service => {
                    const isActive = service.key === focusedService?.key;
                    return (
                      <Link
                        key={service.key}
                        href={serviceFocusHref(service.query)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
                          isActive
                            ? 'border-[#168363] bg-[#168363] text-white'
                            : 'border-[#C9DDD6] bg-white text-[#315663] hover:border-[#168363] hover:text-[#116E54]'
                        }`}
                      >
                        {service.shortLabel}
                      </Link>
                    );
                  })}
                </div>
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

        <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-10">
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
            onPlaceChange={place => setPlaceOverride(place)}
          />
        </div>

        <ServicesSiteFooter />
      </main>
    </>
  );
}
