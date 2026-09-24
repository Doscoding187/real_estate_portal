import { useEffect } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import {
  formatCategoryLabel,
  formatArea,
  getCategoryMeta,
  parseServiceLocationInput,
  SA_PROVINCES,
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
import { ArrowRight, BadgeCheck, MapPinned, Sparkles } from 'lucide-react';

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

export default function ServicesLocalizedCategoryPage() {
  const [, params] = useRoute('/services/:category/:city/:province');
  const [, setLocation] = useLocation();
  const categoryParam = safeDecode(String(params?.category || '').trim());
  const cityParam = safeDecode(String(params?.city || '').trim());
  const provinceParam = safeDecode(String(params?.province || '').trim());
  const parsedCategory = serviceCategoryFromSlug(categoryParam);
  const category = parsedCategory || ('home_improvement' as ServiceCategory);
  const canonicalCategorySlug = toServiceCategorySlug(category);
  const canonicalCitySlug = slugifyLocationSegment(cityParam);
  const canonicalProvinceSlug = slugifyLocationSegment(provinceParam);
  const canonicalPath = `/services/${canonicalCategorySlug}/${canonicalCitySlug}/${canonicalProvinceSlug}`;
  const city = canonicalCitySlug.replace(/-/g, ' ');
  const province = provinceLabelFromSlug(canonicalProvinceSlug);

  useEffect(() => {
    if (!parsedCategory || !canonicalCitySlug || !canonicalProvinceSlug) return;

    if (window.location.pathname !== canonicalPath) {
      setLocation(canonicalPath, { replace: true });
    }
  }, [canonicalCitySlug, canonicalPath, canonicalProvinceSlug, parsedCategory, setLocation]);

  const providersQuery = trpc.servicesEngine.directorySearch.useQuery(
    {
      category,
      city: city || undefined,
      province: province || undefined,
      limit: 20,
    },
    { enabled: Boolean(parsedCategory && canonicalCitySlug && canonicalProvinceSlug) },
  );
  const providers = (providersQuery.data || []) as ProviderDirectoryItem[];
  const categoryMeta = getCategoryMeta(category);

  useEffect(() => {
    applySeo({
      title: `${formatCategoryLabel(category)} in ${city}, ${province} | Property Listify`,
      description: `Browse published ${formatCategoryLabel(category).toLowerCase()} providers with listed coverage in ${city}, ${province}.`,
      canonicalPath,
    });
  }, [canonicalPath, category, city, province]);

  if (!parsedCategory || !canonicalCitySlug || !canonicalProvinceSlug) {
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

  return (
    <main className="min-h-screen bg-[#f7f4ec]">
      <div className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_top_left,_rgba(15,61,145,0.14),_transparent_32%),radial-gradient(circle_at_78%_8%,_rgba(201,139,43,0.16),_transparent_24%),linear-gradient(180deg,_#f9f6ef_0%,_#eef4ff_58%,_#f7f4ec_100%)]" />
        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6 md:py-12">
          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#0f3d91]/15 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f3d91]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Property Listify Services
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#1f6f5f] px-3 py-1 text-xs font-semibold text-white">
                  <MapPinned className="h-3.5 w-3.5" />
                  {formatArea(city, province)}
                </span>
              </div>
              <div className="max-w-3xl space-y-4">
                <h1 className="font-serif text-4xl leading-tight text-slate-950 md:text-6xl">
                  {formatCategoryLabel(category)} in {formatArea(city, province)}.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-700 md:text-lg">
                  {categoryMeta.subtitle} Browse providers whose published coverage includes this
                  area, then send a request to the provider you choose.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  className="h-12 rounded-full bg-[#0f3d91] px-6 text-sm font-semibold text-white hover:bg-[#0a2e6e]"
                  onClick={() => setLocation(`/services/${category}`)}
                >
                  Browse providers
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-12 rounded-full border-[#0f3d91]/20 bg-white/85 px-6 text-sm font-semibold text-[#0f3d91] hover:bg-white"
                  onClick={() => setLocation(`/services/${category}`)}
                >
                  Browse all areas
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    City
                  </p>
                  <p className="mt-2 text-xl font-semibold capitalize text-slate-950">{city}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Province
                  </p>
                  <p className="mt-2 text-xl font-semibold capitalize text-slate-950">{province}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Providers shown
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">{providers.length}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[2rem] border border-[#0f3d91]/10 bg-white/85 p-3 shadow-sm backdrop-blur">
                <ServiceHeroSearch
                  defaultCategory={category}
                  defaultLocation={`${city}, ${province}`}
                  title={`Browse ${formatCategoryLabel(category).toLowerCase()} providers`}
                  subtitle="Change the service or search another listed area."
                  onSubmit={({ category: selectedCategory, location }) => {
                    const parsed = parseServiceLocationInput(location);
                    const search = new URLSearchParams();
                    if (parsed.suburb) search.set('suburb', parsed.suburb);
                    if (parsed.city) search.set('city', parsed.city);
                    if (parsed.province) search.set('province', parsed.province);
                    const query = search.toString();
                    setLocation(
                      `/services/${toServiceCategorySlug(selectedCategory)}${
                        query ? `?${query}` : ''
                      }`,
                    );
                  }}
                />
              </div>
              <div className="rounded-[2rem] bg-[#10294f] p-6 text-white shadow-[0_24px_90px_-40px_rgba(16,41,79,0.8)]">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  <BadgeCheck className="h-4 w-4" />
                  Local directory
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    `Only providers listing coverage in ${formatArea(city, province)} are shown.`,
                    'Open a profile to review the service details before contacting anyone.',
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

          <TrustStepsRow />

          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f3d91]">
                  Local directory
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                  Published providers in {formatArea(city, province)}
                </h2>
              </div>
              <Link
                href={`/services/${category}`}
                className="hidden text-sm font-semibold text-[#0f3d91] md:inline-flex md:items-center md:gap-2"
              >
                View wider category
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-3">
              {providersQuery.isLoading &&
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`localized-provider-skeleton-${index}`}
                    className="h-44 animate-pulse rounded-2xl bg-slate-200"
                  />
                ))}
              {!providersQuery.isLoading && providersQuery.error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
                  We could not load providers for this area. Please try again.
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
                        `/services/request/${category}?providerId=${providerId}&serviceCode=${encodeURIComponent(provider.services?.find(service => service.category === category)?.code || '')}&city=${encodeURIComponent(city)}&province=${encodeURIComponent(province)}`,
                      )
                    }
                  />
                ))}
              {!providersQuery.isLoading && !providersQuery.error && providers.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/75 p-6 text-sm leading-6 text-slate-600">
                  No published providers list this city and province yet. Browse the wider category
                  or try another area.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
