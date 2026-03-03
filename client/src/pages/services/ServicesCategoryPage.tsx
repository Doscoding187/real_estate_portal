import { useEffect, useMemo } from 'react';
import { useLocation, useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import {
  formatCategoryLabel,
  serviceCategoryFromSlug,
  slugifyLocationSegment,
  toServiceCategorySlug,
  type ServiceCategory,
} from '@/features/services/catalog';
import { ServiceHeroSearch } from '@/components/services/ServiceHeroSearch';
import { ProviderCard, type ProviderDirectoryItem } from '@/components/services/ProviderCard';
import { TrustStepsRow } from '@/components/services/TrustStepsRow';
import { applySeo } from '@/lib/seo';

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

  useEffect(() => {
    const categoryLabel = formatCategoryLabel(category);
    applySeo({
      title: `${categoryLabel} Services | Services`,
      description: `Get matched with verified ${categoryLabel.toLowerCase()} providers in your area. Compare ratings, reviews, and request quotes.`,
      canonicalPath: `/services/${toServiceCategorySlug(category)}`,
    });
  }, [category]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6">
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

      <TrustStepsRow />

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Top {formatCategoryLabel(category)} providers
        </h2>
        <div className="grid gap-3">
          {providers.map(provider => (
            <ProviderCard
              key={provider.providerId}
              provider={provider}
              onCta={providerId =>
                setLocation(`/services/request/${category}?providerId=${providerId}`)
              }
            />
          ))}
          {providers.length === 0 && (
            <p className="rounded-md border border-dashed p-6 text-sm text-slate-600">
              No providers found for this category yet.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-xl border bg-white p-4">
          <h3 className="font-semibold text-slate-900">How many quotes will I get?</h3>
          <p className="mt-2 text-sm text-slate-600">
            Most requests are routed to up to 3 providers based on fit and location.
          </p>
        </article>
        <article className="rounded-xl border bg-white p-4">
          <h3 className="font-semibold text-slate-900">Are providers vetted?</h3>
          <p className="mt-2 text-sm text-slate-600">
            Verified providers and moderation tiers are shown as profile badges.
          </p>
        </article>
        <article className="rounded-xl border bg-white p-4">
          <h3 className="font-semibold text-slate-900">Can I edit my request?</h3>
          <p className="mt-2 text-sm text-slate-600">
            Yes. You can refine stage, context, and location before final submission.
          </p>
        </article>
      </section>
    </main>
  );
}
