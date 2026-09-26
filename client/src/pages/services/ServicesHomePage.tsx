import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Hammer,
  MapPin,
  Scale,
  Search,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { ProviderCard, type ProviderDirectoryItem } from '@/components/services/ProviderCard';
import {
  SERVICE_CATEGORIES,
  buildProviderProfilePath,
  buildServiceCategoryPath,
  buildServiceLocationPath,
  buildServiceRequestPath,
  formatArea,
  getCategoryMeta,
  parseServiceLocationInput,
  serviceJourneyContextFromSearch,
  toProviderSlug,
  type ServiceCategory,
} from '@/features/services/catalog';
import { ProviderCardSkeleton } from '@/components/services/ServicesSkeletons';
import { applySeo } from '@/lib/seo';
import { useServicesLocation } from '@/features/services/useServicesLocation';

const CATEGORY_ICONS: Record<ServiceCategory, LucideIcon> = {
  home_improvement: Hammer,
  moving: Truck,
  finance_legal: Scale,
  inspection_compliance: ClipboardCheck,
  insurance: ShieldCheck,
  media_marketing: Camera,
};

type LastSearchLocation = {
  suburb?: string;
  city?: string;
  province?: string;
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
  const { search, setLocation } = useServicesLocation();
  const journeyContext = serviceJourneyContextFromSearch(search);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>('home_improvement');
  const [searchLocation, setSearchLocation] = useState('');
  const lastLocation = useMemo(() => getLastSearchLocation(), []);
  const journeyLocation = {
    suburb: journeyContext.suburb || undefined,
    city: journeyContext.city || undefined,
    province: journeyContext.province || undefined,
  };
  const hasJourneyLocation = Boolean(
    journeyLocation.suburb || journeyLocation.city || journeyLocation.province,
  );
  const effectiveLocation: LastSearchLocation = hasJourneyLocation
    ? journeyLocation
    : lastLocation || {};
  const hasKnownLocation = Boolean(
    effectiveLocation.suburb || effectiveLocation.city || effectiveLocation.province,
  );
  const locationLabel = formatArea(
    effectiveLocation.city,
    effectiveLocation.province,
    effectiveLocation.suburb,
  );
  const navigationContext = {
    ...journeyContext,
    ...effectiveLocation,
  };

  const providersQuery = trpc.servicesEngine.directorySearch.useQuery(
    {
      category: selectedCategory,
      limit: 12,
      ...(hasKnownLocation
        ? {
            suburb: effectiveLocation.suburb,
            city: effectiveLocation.city,
            province: effectiveLocation.province,
          }
        : {}),
    },
    { enabled: true },
  );
  const providers = (providersQuery.data || []) as ProviderDirectoryItem[];
  const isLoading = providersQuery.isLoading;
  const hasError = Boolean(providersQuery.error);
  const SelectedCategoryIcon = CATEGORY_ICONS[selectedCategory];
  const selectedCategoryMeta = getCategoryMeta(selectedCategory);

  useEffect(() => {
    applySeo({
      title: 'Property Professionals | Property Listify Services',
      description:
        'Find property-related professionals by service and listed coverage, then send a clear request to the provider you choose.',
      canonicalPath: '/services',
    });
  }, []);

  function submitSearch(category: ServiceCategory, rawLocation: string) {
    const location = parseServiceLocationInput(rawLocation);
    setLocation(buildServiceLocationPath(category, location, navigationContext));
  }

  return (
    <main className="bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-14 md:px-6 md:py-20">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Property Listify Services
          </div>
          <h1 className="max-w-4xl font-['Sora'] text-4xl font-bold tracking-[-0.05em] text-slate-950 md:text-6xl">
            Find the right property professional.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 md:text-lg">
            Browse services and listed coverage, understand what a provider offers, and send one
            clear request when you are ready.
          </p>

          <div className="mt-8 w-full max-w-3xl rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="grid gap-3 md:grid-cols-[1.1fr_1fr_auto]">
              <label className="space-y-2 text-left">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Service
                </span>
                <select
                  aria-label="Service category"
                  value={selectedCategory}
                  onChange={event => setSelectedCategory(event.target.value as ServiceCategory)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                >
                  {SERVICE_CATEGORIES.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-left">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Location
                </span>
                <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-blue-400 focus-within:bg-white">
                  <MapPin className="mr-2 h-4 w-4 text-slate-400" />
                  <input
                    aria-label="Service location"
                    value={searchLocation}
                    onChange={event => setSearchLocation(event.target.value)}
                    placeholder="Suburb, city, province"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>
              <div className="flex items-end">
                <Button
                  className="h-12 w-full rounded-xl bg-blue-700 px-6 text-sm font-semibold hover:bg-blue-800 md:w-auto"
                  onClick={() => submitSearch(selectedCategory, searchLocation)}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Browse providers
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500">
            <span>{providers.length} published providers</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>{SERVICE_CATEGORIES.length} service categories</span>
            {hasKnownLocation && (
              <>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span>Listed coverage near {locationLabel}</span>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 px-4 py-8 md:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              Browse by service
            </p>
            <h2 className="mt-2 font-['Sora'] text-3xl font-bold tracking-[-0.04em] text-slate-950">
              Choose a property need
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICE_CATEGORIES.map(category => {
              const Icon = CATEGORY_ICONS[category.value];
              const isActive = selectedCategory === category.value;
              return (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => setSelectedCategory(category.value)}
                  className={`flex min-h-28 items-center gap-4 rounded-2xl border px-5 py-4 text-left transition ${
                    isActive
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{category.label}</span>
                    <span className="mt-1 block text-xs text-slate-500">{category.subtitle}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:px-6 md:py-16">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                Directory
              </div>
              <h2 className="mt-2 font-['Sora'] text-3xl font-bold tracking-[-0.04em] text-slate-950">
                {selectedCategoryMeta.label} providers
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Every provider shown has an active published profile and lists a service area.
                Review the profile before you contact them.
              </p>
            </div>
            <Button
              variant="outline"
              className="self-start text-blue-700 md:self-auto"
              onClick={() =>
                setLocation(buildServiceCategoryPath(selectedCategory, navigationContext))
              }
            >
              Open category
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-4">
            {isLoading &&
              Array.from({ length: 3 }).map((_, index) => (
                <ProviderCardSkeleton key={`services-provider-skeleton-${index}`} />
              ))}
            {!isLoading && hasError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
                We could not load the provider directory. Please try again.
              </div>
            )}
            {!isLoading &&
              !hasError &&
              providers.map(provider => (
                <ProviderCard
                  key={provider.providerId}
                  provider={provider}
                  serviceCategory={selectedCategory}
                  profileHref={buildProviderProfilePath(
                    toProviderSlug(provider.companyName, provider.providerId),
                    '',
                    {
                      ...journeyContext,
                      ...effectiveLocation,
                      category: selectedCategory,
                      providerId: provider.providerId,
                      serviceCode:
                        provider.services?.find(service => service.category === selectedCategory)
                          ?.code || '',
                    },
                  )}
                  onCta={providerId => {
                    const serviceCode =
                      provider.services?.find(service => service.category === selectedCategory)
                        ?.code || '';
                    setLocation(
                      buildServiceRequestPath(selectedCategory, providerId, serviceCode, {
                        ...journeyContext,
                        ...effectiveLocation,
                      }),
                    );
                  }}
                />
              ))}
            {!isLoading && !hasError && providers.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm leading-6 text-slate-600">
                No published providers match this service and location yet. Try another category or
                browse the wider category directory.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 px-4 py-12 md:px-6 md:py-16">
        <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] bg-slate-950 p-8 text-white md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
              How Services V1 works
            </p>
            <h2 className="mt-3 max-w-xl font-['Sora'] text-3xl font-bold tracking-[-0.04em]">
              A direct path from property need to professional contact.
            </h2>
            <div className="mt-7 space-y-4">
              {[
                'Choose the service and area that matter.',
                'Compare the provider profile, services, and listed coverage.',
                'Send one request with your project details and account contact context.',
              ].map((step, index) => (
                <div key={step} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-semibold text-blue-200">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm leading-6 text-slate-300">{step}</p>
                </div>
              ))}
            </div>
            <Button
              className="mt-8 bg-white text-slate-950 hover:bg-slate-100"
              onClick={() =>
                setLocation(buildServiceCategoryPath(selectedCategory, navigationContext))
              }
            >
              Find a provider
            </Button>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 md:p-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <SelectedCategoryIcon className="h-6 w-6" />
            </div>
            <h2 className="mt-6 font-['Sora'] text-2xl font-semibold tracking-[-0.03em] text-slate-950">
              Looking for {selectedCategoryMeta.label.toLowerCase()}?
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {selectedCategoryMeta.subtitle} Start with the directory when you want to compare
              providers, or go straight to a request when you already know what you need.
            </p>
            <Button
              className="mt-7"
              onClick={() =>
                setLocation(buildServiceCategoryPath(selectedCategory, navigationContext))
              }
            >
              Browse {selectedCategoryMeta.label}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:px-6 md:py-16">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 rounded-[28px] border border-slate-200 bg-white p-8 md:flex-row md:items-center md:justify-between md:p-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              For service providers
            </p>
            <h2 className="mt-2 font-['Sora'] text-2xl font-semibold tracking-[-0.03em] text-slate-950">
              Publish a clear profile for the first provider cohort.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Complete your business profile, services, and coverage areas. Publication is reviewed
              manually before a provider appears in the public directory.
            </p>
          </div>
          <Button className="shrink-0" onClick={() => setLocation('/service/profile')}>
            Manage provider profile
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>
    </main>
  );
}
