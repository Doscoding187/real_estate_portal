import { useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import {
  formatCategoryLabel,
  formatArea,
  serviceCategoryFromSlug,
  slugifyLocationSegment,
  toServiceCategorySlug,
  type ServiceCategory,
} from '@/features/services/catalog';
import { ServiceHeroSearch } from '@/components/services/ServiceHeroSearch';
import { ProviderCard, type ProviderDirectoryItem } from '@/components/services/ProviderCard';
import { TrustStepsRow } from '@/components/services/TrustStepsRow';
import { applySeo } from '@/lib/seo';

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
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6">
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

      <TrustStepsRow />

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Recommended in {formatArea(city, province)}
        </h2>
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
            <p className="rounded-md border border-dashed p-6 text-sm text-slate-600">
              No providers available in this area yet. Expand your location or try another category.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
