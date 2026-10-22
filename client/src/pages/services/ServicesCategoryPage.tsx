import { useEffect, useMemo, useState } from 'react';
import { useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import {
  formatCategoryLabel,
  getCategoryMeta,
  parseServiceLocationInput,
  serviceCategoryFromSlug,
  slugifyLocationSegment,
  toServiceCategorySlug,
  type ServiceCategory,
} from '@/features/services/catalog';
import { ServiceHeroSearch } from '@/components/services/ServiceHeroSearch';
import { ProviderCard, type ProviderDirectoryItem } from '@/components/services/ProviderCard';
import { TrustStepsRow } from '@/components/services/TrustStepsRow';
import { applySeo } from '@/lib/seo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, BadgeCheck, MapPinned, Search, Sparkles } from 'lucide-react';
import { getServiceTopicPage, ServiceTopicPage } from './ServiceTopicPage';
import { useServicesLocation } from '@/features/services/useServicesLocation';

function normalizeLocation(location: string) {
  return parseServiceLocationInput(location);
}

function providerRequestPath(
  providerId: number,
  category: ServiceCategory,
  serviceCode: string,
  location: { city?: string; suburb?: string; province?: string },
  context: {
    propertyId?: string;
    intentStage?: string;
    sourceSurface?: string;
    reasonKey?: string;
  } = {},
) {
  const search = new URLSearchParams({
    providerId: String(providerId),
    serviceCode,
  });
  if (location.suburb) search.set('suburb', location.suburb);
  if (location.city) search.set('city', location.city);
  if (location.province) search.set('province', location.province);
  if (context.propertyId) search.set('propertyId', context.propertyId);
  if (context.intentStage) search.set('intentStage', context.intentStage);
  if (context.sourceSurface) search.set('sourceSurface', context.sourceSurface);
  if (context.reasonKey) search.set('reasonKey', context.reasonKey);
  return `/services/request/${category}?${search.toString()}`;
}

function categoryPath(
  category: ServiceCategory,
  location: { city?: string | null; suburb?: string | null; province?: string | null },
  context: {
    propertyId?: string | null;
    intentStage?: string | null;
    sourceSurface?: string | null;
    reasonKey?: string | null;
  } = {},
) {
  const search = new URLSearchParams();
  if (location.suburb) search.set('suburb', location.suburb);
  if (location.city) search.set('city', location.city);
  if (location.province) search.set('province', location.province);
  if (context.propertyId) search.set('propertyId', context.propertyId);
  if (context.intentStage) search.set('intentStage', context.intentStage);
  if (context.sourceSurface) search.set('sourceSurface', context.sourceSurface);
  if (context.reasonKey) search.set('reasonKey', context.reasonKey);
  return `/services/${toServiceCategorySlug(category)}${search.toString() ? `?${search.toString()}` : ''}`;
}

export default function ServicesCategoryPage() {
  const [, params] = useRoute('/services/:category');
  const { search, setLocation } = useServicesLocation();
  const categoryParam = String(params?.category || '').trim();
  const serviceTopic = getServiceTopicPage(slugifyLocationSegment(categoryParam));
  const parsedCategory = serviceCategoryFromSlug(categoryParam);
  const category = parsedCategory || ('home_improvement' as ServiceCategory);
  const initialQuery = useMemo(() => {
    const params = new URLSearchParams(search);
    return {
      query: params.get('query') || undefined,
      requestUnmatched: params.get('request') === 'unmatched',
      city: params.get('city') || undefined,
      suburb: params.get('suburb') || undefined,
      province: params.get('province') || undefined,
      propertyId: params.get('propertyId') || undefined,
      intentStage: params.get('intentStage') || undefined,
      sourceSurface: params.get('sourceSurface') || undefined,
      reasonKey: params.get('reasonKey') || undefined,
    };
  }, [search]);
  const [searchText, setSearchText] = useState(initialQuery.query || '');

  const providersQuery = trpc.servicesEngine.directorySearch.useQuery(
    {
      category,
      query: searchText.trim() || undefined,
      city: initialQuery.city,
      suburb: initialQuery.suburb,
      province: initialQuery.province,
      limit: 20,
    },
    {
      enabled: Boolean(parsedCategory),
    },
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

  if (serviceTopic && !parsedCategory) {
    return <ServiceTopicPage topic={serviceTopic} />;
  }

  if (!parsedCategory) {
    return (
      <main className="min-h-screen bg-[#f7f4ec] px-4 py-12 md:px-6">
        <Card className="mx-auto max-w-3xl border-[#0f3d91]/10 bg-white shadow-sm">
          <CardContent className="space-y-4 p-8">
            <h1 className="text-2xl font-semibold text-slate-950">Service category unavailable</h1>
            <p className="text-sm leading-6 text-slate-600">
              Choose a supported service category from the Property Listify directory.
            </p>
            <Button onClick={() => setLocation('/services')}>Browse services</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  function submitLocation(selectedCategory: ServiceCategory, location: string) {
    const normalized = normalizeLocation(location);
    setLocation(
      categoryPath(selectedCategory, normalized, {
        propertyId: initialQuery.propertyId,
        intentStage: initialQuery.intentStage,
        sourceSurface: initialQuery.sourceSurface,
        reasonKey: initialQuery.reasonKey,
      }),
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ec]">
      <div className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top_left,_rgba(15,61,145,0.14),_transparent_32%),radial-gradient(circle_at_78%_8%,_rgba(201,139,43,0.16),_transparent_24%),linear-gradient(180deg,_#f9f6ef_0%,_#eef4ff_58%,_#f7f4ec_100%)]" />
        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6 md:py-12">
          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#0f3d91]/15 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f3d91]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Property Listify Services
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#10294f] px-3 py-1 text-xs font-semibold text-white">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {categoryMeta.shortLabel}
                </span>
              </div>
              <div className="max-w-3xl space-y-4">
                <h1 className="font-serif text-4xl leading-tight text-slate-950 md:text-6xl">
                  Find {formatCategoryLabel(category).toLowerCase()} through Property Listify.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-700 md:text-lg">
                  {categoryMeta.subtitle} Compare published services and listed coverage before you
                  send a request.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  className="h-12 rounded-full bg-[#0f3d91] px-6 text-sm font-semibold text-white hover:bg-[#0a2e6e]"
                  onClick={() =>
                    setLocation(
                      categoryPath(category, initialQuery, {
                        propertyId: initialQuery.propertyId,
                        intentStage: initialQuery.intentStage,
                        sourceSurface: initialQuery.sourceSurface,
                        reasonKey: initialQuery.reasonKey,
                      }),
                    )
                  }
                >
                  Browse providers
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-12 rounded-full border-[#0f3d91]/20 bg-white/85 px-6 text-sm font-semibold text-[#0f3d91] hover:bg-white"
                  onClick={() => setLocation('/services')}
                >
                  All services
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Category
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">{categoryMeta.label}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Providers shown
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">{providers.length}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Search scope
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-950">
                    {hasLocation ? 'Listed coverage' : 'All published areas'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[2rem] border border-[#0f3d91]/10 bg-white/85 p-3 shadow-sm backdrop-blur">
                <ServiceHeroSearch
                  defaultCategory={category}
                  defaultLocation={[initialQuery.suburb, initialQuery.city, initialQuery.province]
                    .filter(Boolean)
                    .join(', ')}
                  title={`Browse ${formatCategoryLabel(category).toLowerCase()} providers`}
                  subtitle="Choose a service and enter the area where the work will happen."
                  onSubmit={({ category: selectedCategory, location }) =>
                    submitLocation(selectedCategory, location)
                  }
                />
              </div>
              <div className="rounded-[2rem] bg-[#10294f] p-6 text-white shadow-[0_24px_90px_-40px_rgba(16,41,79,0.8)]">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  <MapPinned className="h-4 w-4" />
                  Directory guidance
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    'Providers shown here have an active published profile.',
                    'Coverage is shown exactly as the provider listed it.',
                    'A request is routed to one provider you select.',
                  ].map(item => (
                    <div
                      key={item}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/80"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {initialQuery.requestUnmatched && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
              No published provider currently covers this request. It was not sent to an unrelated
              provider; browse the available options or try a wider area.
            </div>
          )}

          <TrustStepsRow />

          <section className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f3d91]">
                  Directory results
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                  {hasLocation
                    ? 'Providers covering your search'
                    : `Published ${categoryMeta.label} providers`}
                </h2>
              </div>
              <label className="flex w-full max-w-sm items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 md:w-auto">
                <Search className="h-4 w-4 text-slate-400" />
                <span className="sr-only">Search providers</span>
                <input
                  value={searchText}
                  onChange={event => setSearchText(event.target.value)}
                  placeholder="Search provider or service"
                  className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </label>
            </div>
            <div className="grid gap-3">
              {providersQuery.isLoading &&
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`category-provider-skeleton-${index}`}
                    className="h-44 animate-pulse rounded-2xl bg-slate-200"
                  />
                ))}
              {!providersQuery.isLoading && providersQuery.error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
                  We could not load providers for this category. Please try again.
                </div>
              )}
              {!providersQuery.isLoading &&
                !providersQuery.error &&
                providers.map(provider => (
                  <ProviderCard
                    key={provider.providerId}
                    provider={provider}
                    serviceCategory={category}
                    onCta={providerId =>
                      setLocation(
                        providerRequestPath(
                          providerId,
                          category,
                          provider.services?.find(service => service.category === category)?.code ||
                            '',
                          {
                            city: initialQuery.city,
                            suburb: initialQuery.suburb,
                            province: initialQuery.province,
                          },
                          {
                            propertyId: initialQuery.propertyId,
                            intentStage: initialQuery.intentStage,
                            sourceSurface: initialQuery.sourceSurface,
                            reasonKey: initialQuery.reasonKey,
                          },
                        ),
                      )
                    }
                  />
                ))}
              {!providersQuery.isLoading && !providersQuery.error && providers.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/75 p-6 text-sm leading-6 text-slate-600">
                  No published providers match this search. Try a wider area or another service
                  category.
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            <article className="rounded-[1.5rem] border bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900">How are providers selected?</h3>
              <p className="mt-2 text-sm text-slate-600">
                The directory shows active providers with a published profile and a matching
                service.
              </p>
            </article>
            <article className="rounded-[1.5rem] border bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900">What does verified mean?</h3>
              <p className="mt-2 text-sm text-slate-600">
                It means the provider has passed the platform verification state recorded for this
                directory.
              </p>
            </article>
            <article className="rounded-[1.5rem] border bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900">Can I edit my request?</h3>
              <p className="mt-2 text-sm text-slate-600">
                Start a new request from the provider profile or directory card. Each request is
                tied to the provider you choose.
              </p>
            </article>
          </section>
        </div>
      </div>
    </main>
  );
}
