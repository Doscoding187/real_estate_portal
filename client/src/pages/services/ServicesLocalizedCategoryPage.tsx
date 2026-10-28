import { useEffect, useMemo, useState } from 'react';
import { Link, useRoute } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import {
  formatCategoryLabel,
  formatArea,
  getCategoryMeta,
  parseServiceLocationInput,
  SA_PROVINCES,
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
import { useServicesLocation } from '@/features/services/useServicesLocation';
import { buildServiceBreadcrumbStructuredData } from '@/features/services/seoStructuredData';
import { applySeo } from '@/lib/seo';

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}

function provinceLabelFromSlug(value: string) {
  return (
    SA_PROVINCES.find(province => slugifyLocationSegment(province) === value) ||
    value.replace(/-/g, ' ')
  );
}

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

export default function ServicesLocalizedCategoryPage() {
  const [, params] = useRoute('/services/:category/:city/:province');
  const { search, setLocation } = useServicesLocation();
  const categoryParam = safeDecode(String(params?.category || '').trim());
  const cityParam = safeDecode(String(params?.city || '').trim());
  const provinceParam = safeDecode(String(params?.province || '').trim());
  const parsedCategory = serviceCategoryFromSlug(categoryParam);
  const category = parsedCategory || ('home_improvement' as ServiceCategory);
  const canonicalCategorySlug = toServiceCategorySlug(category);
  const canonicalCitySlug = slugifyLocationSegment(cityParam);
  const canonicalProvinceSlug = slugifyLocationSegment(provinceParam);
  const canonicalRoutePath = `/services/${canonicalCategorySlug}/${canonicalCitySlug}/${canonicalProvinceSlug}`;
  const canonicalPath = canonicalRoutePath;
  const searchContext = serviceJourneyContextFromSearch(search);
  const initialResultFilters = useMemo(() => {
    const params = new URLSearchParams(search);
    return {
      minPrice: parsePriceParam(params.get('minPrice')),
      maxPrice: parsePriceParam(params.get('maxPrice')),
      availability: (params.get('availability') === 'accepting'
        ? 'accepting'
        : 'any') as ServicesAvailability,
      sort: (['relevance', 'rating', 'name'].includes(params.get('sort') || '')
        ? params.get('sort')
        : 'relevance') as ServicesSort,
    };
  }, [search]);
  const hasConflictingGeography = Boolean(
    (searchContext.city && slugifyLocationSegment(searchContext.city) !== canonicalCitySlug) ||
    (searchContext.province &&
      slugifyLocationSegment(searchContext.province) !== canonicalProvinceSlug),
  );
  const city = searchContext.city || canonicalCitySlug.replace(/-/g, ' ');
  const province = searchContext.province || provinceLabelFromSlug(canonicalProvinceSlug);
  const journeyContext = {
    ...searchContext,
    city,
    province,
  };
  const widerCategoryContext = {
    ...journeyContext,
    suburb: undefined,
    city: undefined,
    province: undefined,
  };

  useEffect(() => {
    if (!parsedCategory || !canonicalCitySlug || !canonicalProvinceSlug || hasConflictingGeography)
      return;

    if (window.location.pathname !== canonicalRoutePath) {
      setLocation(`${canonicalRoutePath}${search}`, { replace: true });
    }
  }, [
    canonicalCitySlug,
    canonicalRoutePath,
    canonicalProvinceSlug,
    hasConflictingGeography,
    parsedCategory,
    search,
    setLocation,
  ]);

  const providersQuery = trpc.servicesEngine.directorySearch.useQuery(
    {
      category,
      suburb: journeyContext.suburb || undefined,
      city: city || undefined,
      province: province || undefined,
      minPrice: initialResultFilters.minPrice,
      maxPrice: initialResultFilters.maxPrice,
      availability: initialResultFilters.availability,
      sort: initialResultFilters.sort,
      limit: 20,
    },
    {
      enabled: Boolean(
        parsedCategory && canonicalCitySlug && canonicalProvinceSlug && !hasConflictingGeography,
      ),
    },
  );
  const providers = (providersQuery.data || []) as ProviderDirectoryItem[];
  const categoryMeta = getCategoryMeta(category);

  const [filters, setFilters] = useState<ServicesResultFilters>({
    category,
    location: formatArea(city, province),
    minPrice: initialResultFilters.minPrice ? String(initialResultFilters.minPrice) : '',
    maxPrice: initialResultFilters.maxPrice ? String(initialResultFilters.maxPrice) : '',
    availability: initialResultFilters.availability,
    sort: initialResultFilters.sort,
  });

  useEffect(() => {
    setFilters({
      category,
      location: formatArea(city, province),
      minPrice: initialResultFilters.minPrice ? String(initialResultFilters.minPrice) : '',
      maxPrice: initialResultFilters.maxPrice ? String(initialResultFilters.maxPrice) : '',
      availability: initialResultFilters.availability,
      sort: initialResultFilters.sort,
    });
  }, [category, city, province, initialResultFilters]);

  useEffect(() => {
    applySeo({
      title: `${formatCategoryLabel(category)} in ${city}, ${province} | Property Listify`,
      description: `Browse published ${formatCategoryLabel(category).toLowerCase()} providers with listed coverage in ${city}, ${province}.`,
      canonicalPath,
      structuredData: buildServiceBreadcrumbStructuredData([
        { label: 'Home', path: '/' },
        { label: 'Services', path: '/services' },
        { label: formatCategoryLabel(category), path: `/services/${canonicalCategorySlug}` },
        { label: `${city}, ${province}` },
      ]),
    });
  }, [canonicalPath, category, city, province]);

  if (!parsedCategory || !canonicalCitySlug || !canonicalProvinceSlug || hasConflictingGeography) {
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
    const nextPath = buildServiceLocationPath(next.category, location, journeyContext);
    setLocation(withResultSearchParams(nextPath, next));
  }

  function resetFilters() {
    const cleared: ServicesResultFilters = {
      category,
      location: formatArea(city, province),
      minPrice: '',
      maxPrice: '',
      availability: 'any',
      sort: 'relevance',
    };
    setFilters(cleared);
    setLocation(buildServiceCategoryPath(category, widerCategoryContext));
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
                {categoryMeta.subtitle} Browse providers whose published coverage includes this
                area, then send a request to the provider you choose.
              </p>
            </div>
            <Link
              href={buildServiceCategoryPath(category, widerCategoryContext)}
              className="text-sm font-semibold text-[#168363] transition hover:text-[#116E54]"
            >
              View all {categoryMeta.label} areas
            </Link>
          </div>
        </div>

        <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-10">
          <ServicesResultsPanel
            filters={filters}
            onApply={applyFilters}
            onReset={resetFilters}
            providers={providers}
            isLoading={providersQuery.isLoading}
            error={Boolean(providersQuery.error)}
            summary={`Showing ${providers.length} provider${providers.length === 1 ? '' : 's'} in ${formatArea(city, province)} for ${categoryMeta.label}`}
            emptyMessage="No published providers list this city and province yet. Browse the wider category or try another area."
            profileHref={profileHref}
            onContact={startRequest}
          />
        </div>

        <ServicesSiteFooter />
      </main>
    </>
  );
}
