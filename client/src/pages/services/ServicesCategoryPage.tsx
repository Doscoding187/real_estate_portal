import { useEffect, useMemo } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import {
  formatCategoryLabel,
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

function normalizeLocation(location: string) {
  const [suburb, city, province] = location
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  return { suburb, city, province };
}

export default function ServicesCategoryPage() {
  const [, params] = useRoute('/services/:category');
  const [, setLocation] = useLocation();
  const categoryParam = String(params?.category || '').trim();
  const category = serviceCategoryFromSlug(categoryParam) || ('home_improvement' as ServiceCategory);

  const initialQuery = useMemo(() => {
    const search = new URLSearchParams(window.location.search);
    return {
      city: search.get('city') || undefined,
      suburb: search.get('suburb') || undefined,
      province: search.get('province') || undefined,
    };
  }, []);

  const providersQuery = trpc.servicesEngine.directorySearch.useQuery({
    category,
    city: initialQuery.city,
    suburb: initialQuery.suburb,
    province: initialQuery.province,
    limit: 20,
  });

  const providers = (providersQuery.data || []) as ProviderDirectoryItem[];
  const categoryMeta = getCategoryMeta(category);
  const topProviders = providers.slice(0, 6);

  useEffect(() => {
    const categoryLabel = formatCategoryLabel(category);
    applySeo({
      title: `${categoryLabel} Services | Services`,
      description: `Get matched with verified ${categoryLabel.toLowerCase()} providers in your area. Compare ratings, reviews, and request quotes.`,
      canonicalPath: `/services/${toServiceCategorySlug(category)}`,
    });
  }, [category]);

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
                  Service Listify
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#10294f] px-3 py-1 text-xs font-semibold text-white">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {categoryMeta.shortLabel}
                </span>
              </div>

              <div className="max-w-3xl space-y-4">
                <h1 className="font-serif text-4xl leading-tight text-slate-950 md:text-6xl">
                  Find trusted {formatCategoryLabel(category).toLowerCase()} through Service Listify.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-700 md:text-lg">
                  {categoryMeta.subtitle} Start with your location and move straight into comparison,
                  quotes, and provider discovery.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  className="h-12 rounded-full bg-[#0f3d91] px-6 text-sm font-semibold text-white hover:bg-[#0a2e6e]"
                  onClick={() => setLocation(`/services/request/${category}`)}
                >
                  Find a pro
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-12 rounded-full border-[#0f3d91]/20 bg-white/85 px-6 text-sm font-semibold text-[#0f3d91] hover:bg-white"
                  onClick={() => setLocation('/service/profile')}
                >
                  Become a provider
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
                    Search mode
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">National + local</p>
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
                  title={`Find top rated ${formatCategoryLabel(category)} in your area`}
                  subtitle="Start with your location and we will match you with trusted providers who cover your project type."
                  onSubmit={({ category: selectedCategory, location }) => {
                    const normalized = normalizeLocation(location);
                    if (normalized.city && normalized.province) {
                      setLocation(
                        `/services/${toServiceCategorySlug(selectedCategory)}/${slugifyLocationSegment(normalized.city)}/${slugifyLocationSegment(normalized.province)}`,
                      );
                      return;
                    }
                    setLocation(`/services/request/${selectedCategory}`);
                  }}
                />
              </div>

              <div className="rounded-[2rem] bg-[#10294f] p-6 text-white shadow-[0_24px_90px_-40px_rgba(16,41,79,0.8)]">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  <MapPinned className="h-4 w-4" />
                  What you can do here
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    'Filter this category by suburb, city, or province.',
                    'Browse trusted providers before submitting your request.',
                    'Jump into the guided request flow when you are ready.',
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
                  Directory results
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                  Top {formatCategoryLabel(category)} providers
                </h2>
              </div>
              <Link href="/services" className="hidden text-sm font-semibold text-[#0f3d91] md:inline-flex md:items-center md:gap-2">
                Back to all categories
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-3">
              {topProviders.map(provider => (
                <ProviderCard
                  key={provider.providerId}
                  provider={provider}
                  onCta={providerId =>
                    setLocation(`/services/request/${category}?providerId=${providerId}`)
                  }
                />
              ))}
              {providers.length === 0 && (
                <p className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/75 p-6 text-sm text-slate-600">
                  No providers found for this category yet.
                </p>
              )}
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            <article className="rounded-[1.5rem] border bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900">How many quotes will I get?</h3>
              <p className="mt-2 text-sm text-slate-600">
                Most requests are routed to up to 3 providers based on fit and location.
              </p>
            </article>
            <article className="rounded-[1.5rem] border bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900">Are providers vetted?</h3>
              <p className="mt-2 text-sm text-slate-600">
                Verified providers and moderation tiers are shown as profile badges.
              </p>
            </article>
            <article className="rounded-[1.5rem] border bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900">Can I edit my request?</h3>
              <p className="mt-2 text-sm text-slate-600">
                Yes. You can refine stage, context, and location before final submission.
              </p>
            </article>
          </section>
        </div>
      </div>
    </main>
  );
}
