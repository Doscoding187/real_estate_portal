import { useEffect, useMemo, useState } from 'react';
import { Link, useRoute } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import {
  formatCategoryLabel,
  getCategoryMeta,
  parseServiceLocationInput,
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
import { useServicesLocation } from '@/features/services/useServicesLocation';
import { getServiceTopicPage, ServiceTopicPage } from './ServiceTopicPage';

function parsePriceParam(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function withResultSearchParams(
  path: string,
  filters: Pick<ServicesResultFilters, 'minPrice' | 'maxPrice' | 'availability' | 'sort'>,
): string {
  const [base, rawQuery = ''] = path.split('?');
  const params = new URLSearchParams(rawQuery);
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
  const { search, setLocation } = useServicesLocation();
  const categoryParam = String(params?.category || '').trim();
  const serviceTopic = getServiceTopicPage(slugifyLocationSegment(categoryParam));
  const parsedCategory = serviceCategoryFromSlug(categoryParam);
  const category = parsedCategory || ('home_improvement' as ServiceCategory);

  const initialQuery = useMemo(() => {
    const queryParams = new URLSearchParams(search);
    return {
      query: queryParams.get('query') || undefined,
      requestUnmatched: queryParams.get('request') === 'unmatched',
      city: queryParams.get('city') || undefined,
      suburb: queryParams.get('suburb') || undefined,
      province: queryParams.get('province') || undefined,
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
    city: initialQuery.city,
    suburb: initialQuery.suburb,
    province: initialQuery.province,
  };

  const [filters, setFilters] = useState<ServicesResultFilters>({
    category,
    location: [initialQuery.suburb, initialQuery.city, initialQuery.province]
      .filter(Boolean)
      .join(', '),
    minPrice: initialQuery.minPrice ? String(initialQuery.minPrice) : '',
    maxPrice: initialQuery.maxPrice ? String(initialQuery.maxPrice) : '',
    availability: initialQuery.availability,
    sort: initialQuery.sort,
  });

  const providersQuery = trpc.servicesEngine.directorySearch.useQuery(
    {
      category: filters.category,
      query: initialQuery.query,
      city: initialQuery.city,
      suburb: initialQuery.suburb,
      province: initialQuery.province,
      minPrice: initialQuery.minPrice,
      maxPrice: initialQuery.maxPrice,
      availability: initialQuery.availability,
      sort: initialQuery.sort,
      limit: 20,
    },
    { enabled: Boolean(parsedCategory) },
  );
  const providers = (providersQuery.data || []) as ProviderDirectoryItem[];
  const categoryMeta = getCategoryMeta(category);
  const hasLocation = Boolean(initialQuery.city || initialQuery.suburb || initialQuery.province);

  useEffect(() => {
    const categoryLabel = formatCategoryLabel(category);
    applySeo({
      title: `${categoryLabel} Services | Property Listify`,
      description: `Browse published ${categoryLabel.toLowerCase()} providers and their listed service coverage.`,
      canonicalPath: `/services/${toServiceCategorySlug(category)}`,
    });
  }, [category]);

  useEffect(() => {
    setFilters({
      category,
      location: [initialQuery.suburb, initialQuery.city, initialQuery.province]
        .filter(Boolean)
        .join(', '),
      minPrice: initialQuery.minPrice ? String(initialQuery.minPrice) : '',
      maxPrice: initialQuery.maxPrice ? String(initialQuery.maxPrice) : '',
      availability: initialQuery.availability,
      sort: initialQuery.sort,
    });
  }, [
    category,
    initialQuery.suburb,
    initialQuery.city,
    initialQuery.province,
    initialQuery.minPrice,
    initialQuery.maxPrice,
    initialQuery.availability,
    initialQuery.sort,
  ]);

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
    const location = parseServiceLocationInput(next.location);
    const nextPath = buildServiceLocationPath(next.category, location, {
      ...journeyContext,
      suburb: undefined,
      city: undefined,
      province: undefined,
    });
    setLocation(withResultSearchParams(nextPath, next));
  }

  function resetFilters() {
    const cleared: ServicesResultFilters = {
      category,
      location: '',
      minPrice: '',
      maxPrice: '',
      availability: 'any',
      sort: 'relevance',
    };
    setFilters(cleared);
    setLocation(buildServiceCategoryPath(category, journeyContext));
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
                Services providers
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4B5C6B]">
                {categoryMeta.subtitle} Compare published services and listed coverage, then send a
                request to the provider you choose.
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

        {initialQuery.requestUnmatched && (
          <div className="mx-auto mt-6 w-full max-w-7xl px-4 md:px-6">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
              No published provider currently covers this request. It was not sent to an unrelated
              provider; browse the available options or try a wider area.
            </div>
          </div>
        )}

        <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-10">
          <ServicesResultsPanel
            filters={filters}
            onApply={applyFilters}
            onReset={resetFilters}
            providers={providers}
            isLoading={providersQuery.isLoading}
            error={Boolean(providersQuery.error)}
            summary={
              hasLocation
                ? `Showing ${providers.length} provider${providers.length === 1 ? '' : 's'} in ${[initialQuery.suburb, initialQuery.city, initialQuery.province].filter(Boolean).join(', ')} for ${categoryMeta.label}`
                : `Showing ${providers.length} published ${categoryMeta.label} provider${providers.length === 1 ? '' : 's'}`
            }
            emptyMessage="No published providers match this service and location yet. Try another area or browse the wider category directory."
            profileHref={profileHref}
            onContact={startRequest}
          />
        </div>

        <ServicesSiteFooter />
      </main>
    </>
  );
}
