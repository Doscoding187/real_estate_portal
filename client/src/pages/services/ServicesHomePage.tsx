import { useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import {
  formatArea,
  getCategoryMeta,
  isServiceCategory,
  type ServiceCategory,
} from '@/features/services/catalog';
import { ServiceHeroSearch } from '@/components/services/ServiceHeroSearch';
import { CategoryChips } from '@/components/services/CategoryChips';
import { DemandCarousel } from '@/components/services/DemandCarousel';
import { PopularProjectsGrid } from '@/components/services/PopularProjectsGrid';
import { ProviderCard, type ProviderDirectoryItem } from '@/components/services/ProviderCard';
import { CostGuidesSection } from '@/components/services/CostGuidesSection';
import {
  DemandCarouselSkeleton,
  PopularProjectsGridSkeleton,
  ProviderCardSkeleton,
} from '@/components/services/ServicesSkeletons';
import { applySeo } from '@/lib/seo';

function toLocationQuery(location: string) {
  const [suburb, city, province] = location
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  const query = new URLSearchParams();
  if (suburb) query.set('suburb', suburb);
  if (city) query.set('city', city);
  if (province) query.set('province', province);
  return query.toString();
}

type LastSearchLocation = {
  suburb?: string;
  city?: string;
  province?: string;
  timestamp?: number;
};

function getLastSearchLocation(): LastSearchLocation | null {
  try {
    const raw = localStorage.getItem('lastSearchLocation');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastSearchLocation;
    if (!parsed || (!parsed.suburb && !parsed.city && !parsed.province)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function ServicesHomePage() {
  const [, setLocation] = useLocation();
  const lastLocation = useMemo(getLastSearchLocation, []);
  const hasKnownLocation = Boolean(lastLocation?.suburb || lastLocation?.city || lastLocation?.province);

  const globalDirectoryQuery = trpc.servicesEngine.directorySearch.useQuery({
    limit: 18,
  });
  const localizedDirectoryQuery = trpc.servicesEngine.directorySearch.useQuery(
    {
      limit: 18,
      suburb: lastLocation?.suburb,
      city: lastLocation?.city,
      province: lastLocation?.province,
    },
    { enabled: hasKnownLocation },
  );

  const localizedProviders = (localizedDirectoryQuery.data || []) as ProviderDirectoryItem[];
  const globalProviders = (globalDirectoryQuery.data || []) as ProviderDirectoryItem[];
  const usingLocalizedProviders = localizedProviders.length > 0;
  const providers = usingLocalizedProviders ? localizedProviders : globalProviders;
  const isLoadingProviders =
    globalDirectoryQuery.isLoading || (hasKnownLocation && localizedDirectoryQuery.isLoading);

  const demandItems = useMemo(() => {
    const counter: Record<string, number> = {};
    for (const provider of providers) {
      for (const service of provider.services || []) {
        const key = String(service.category || 'home_improvement');
        counter[key] = (counter[key] || 0) + 1;
      }
    }

    return Object.entries(counter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, count]) => {
        const safeCategory = isServiceCategory(category)
          ? (category as ServiceCategory)
          : ('home_improvement' as ServiceCategory);
        return {
          title: getCategoryMeta(safeCategory).label,
          subtitle: getCategoryMeta(safeCategory).subtitle,
          signal: `${count} active providers`,
        };
      });
  }, [providers]);

  useEffect(() => {
    applySeo({
      title: 'Find Trusted Home Services | Services',
      description:
        'Find vetted service partners for home projects, finance and legal, moving, and more. Compare providers and start matching in minutes.',
      canonicalPath: '/services',
    });
  }, []);

  return (
    <main id="main-content" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6">
      <ServiceHeroSearch
        title="What can we help you with today?"
        subtitle="Find vetted service partners across the property journey. Share your need and get matched with up to 3 local pros."
        onSubmit={({ category, location }) => {
          const query = toLocationQuery(location);
          setLocation(`/services/request/${category}${query ? `?${query}` : ''}`);
        }}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Popular categories</h2>
        </div>
        <CategoryChips
          onSelect={category => {
            setLocation(`/services/${category}`);
          }}
        />
      </section>

      {isLoadingProviders ? (
        <DemandCarouselSkeleton />
      ) : (
        <DemandCarousel
          title={`Most in-demand in ${
            usingLocalizedProviders
              ? formatArea(lastLocation?.city, lastLocation?.province, lastLocation?.suburb)
              : 'South Africa'
          }`}
          items={demandItems}
        />
      )}

      {isLoadingProviders ? <PopularProjectsGridSkeleton /> : <PopularProjectsGrid />}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {usingLocalizedProviders
              ? `Top providers near ${formatArea(lastLocation?.city, lastLocation?.province, lastLocation?.suburb)}`
              : 'Top rated providers'}
          </h2>
        </div>
        <div className="grid gap-3">
          {isLoadingProviders &&
            Array.from({ length: 4 }).map((_, index) => <ProviderCardSkeleton key={`provider-skeleton-${index}`} />)}
          {providers.slice(0, 6).map(provider => (
            <ProviderCard
              key={provider.providerId}
              provider={provider}
              onCta={providerId =>
                setLocation(`/services/request/${provider.services?.[0]?.category || 'home_improvement'}?providerId=${providerId}`)
              }
            />
          ))}
          {!isLoadingProviders && providers.length === 0 && (
            <div className="rounded-md border border-dashed p-6 text-sm text-slate-700">
              <p className="font-medium text-slate-900">We are expanding coverage in this area.</p>
              <p className="mt-1">
                Submit your request anyway and we will route it to the closest available providers.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setLocation('/services/request/home_improvement')}
                  className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Request anyway
                </button>
                <button
                  type="button"
                  onClick={() => setLocation('/services/home_improvement/johannesburg/gauteng')}
                  className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Try Johannesburg, Gauteng
                </button>
                <button
                  type="button"
                  onClick={() => setLocation('/services/home_improvement/cape-town/western-cape')}
                  className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Try Cape Town, Western Cape
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <CostGuidesSection />
    </main>
  );
}
