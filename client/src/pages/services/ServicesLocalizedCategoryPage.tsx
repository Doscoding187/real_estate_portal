import { useEffect } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import {
  formatCategoryLabel,
  formatArea,
  getCategoryMeta,
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
import { ArrowRight, BadgeCheck, MapPinned, Sparkles } from 'lucide-react';

export default function ServicesLocalizedCategoryPage() {
  const [, params] = useRoute('/services/:category/:city/:province');
  const [, setLocation] = useLocation();

  const categoryParam = decodeURIComponent(String(params?.category || '').trim());
  const cityParam = decodeURIComponent(String(params?.city || '').trim());
  const provinceParam = decodeURIComponent(String(params?.province || '').trim());

  const category = serviceCategoryFromSlug(categoryParam) || ('home_improvement' as ServiceCategory);
  const canonicalCategorySlug = toServiceCategorySlug(category);
  const canonicalCitySlug = slugifyLocationSegment(cityParam);
  const canonicalProvinceSlug = slugifyLocationSegment(provinceParam);
  const canonicalPath = `/services/${canonicalCategorySlug}/${canonicalCitySlug}/${canonicalProvinceSlug}`;

  const city = canonicalCitySlug.replace(/-/g, ' ');
  const province = canonicalProvinceSlug.replace(/-/g, ' ');

  useEffect(() => {
    if (!canonicalCitySlug || !canonicalProvinceSlug) return;
    const currentPath = window.location.pathname;
    if (currentPath !== canonicalPath) {
      setLocation(canonicalPath, { replace: true });
    }
  }, [canonicalCitySlug, canonicalPath, canonicalProvinceSlug, setLocation]);

  const providersQuery = trpc.servicesEngine.directorySearch.useQuery({
    category,
    city: city || undefined,
    province: province || undefined,
    limit: 20,
  });

  const providers = (providersQuery.data || []) as ProviderDirectoryItem[];
  const categoryMeta = getCategoryMeta(category);

  useEffect(() => {
    const categoryLabel = formatCategoryLabel(category);
    const cityLabel = city;
    const provinceLabel = province;

    applySeo({
      title: `${categoryLabel} in ${cityLabel}, ${provinceLabel} | Services`,
      description: `Get matched with verified ${categoryLabel.toLowerCase()} providers near ${cityLabel}. Compare ratings, reviews, and request quotes.`,
      canonicalPath,
    });
  }, [canonicalPath, category, city, province]);

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
                  Service Listify
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#1f6f5f] px-3 py-1 text-xs font-semibold text-white">
                  <MapPinned className="h-3.5 w-3.5" />
                  {formatArea(city, province)}
                </span>
              </div>

              <div className="max-w-3xl space-y-4">
                <h1 className="font-serif text-4xl leading-tight text-slate-950 md:text-6xl">
                  {formatCategoryLabel(category)} in {formatArea(city, province)}, made easier.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-700 md:text-lg">
                  {categoryMeta.subtitle} Browse local provider options for this area, then move into
                  a guided request when you are ready.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  className="h-12 rounded-full bg-[#0f3d91] px-6 text-sm font-semibold text-white hover:bg-[#0a2e6e]"
                  onClick={() =>
                    setLocation(
                      `/services/request/${category}?city=${encodeURIComponent(city)}&province=${encodeURIComponent(province)}`,
                    )
                  }
                >
                  Find a pro
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
                  title={`Find top rated ${formatCategoryLabel(category)} in ${formatArea(city, province)}`}
                  subtitle="Share your request details and compare local quotes from vetted providers."
                  onSubmit={({ category: selectedCategory }) =>
                    setLocation(
                      `/services/request/${selectedCategory}?city=${encodeURIComponent(city)}&province=${encodeURIComponent(province)}`,
                    )
                  }
                />
              </div>

              <div className="rounded-[2rem] bg-[#10294f] p-6 text-white shadow-[0_24px_90px_-40px_rgba(16,41,79,0.8)]">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  <BadgeCheck className="h-4 w-4" />
                  Local service flow
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    `See providers already covering ${formatArea(city, province)}.`,
                    'Request quotes without losing your location context.',
                    'Switch back to the wider category page if you need more options.',
                  ].map(item => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/80">
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
                  Recommended in {formatArea(city, province)}
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
              {providers.map(provider => (
                <ProviderCard
                  key={provider.providerId}
                  provider={provider}
                  onCta={providerId =>
                    setLocation(
                      `/services/request/${category}?providerId=${providerId}&city=${encodeURIComponent(city)}&province=${encodeURIComponent(province)}`,
                    )
                  }
                />
              ))}
              {providers.length === 0 && (
                <p className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/75 p-6 text-sm text-slate-600">
                  No providers available in this area yet. Expand your location or try another category.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
