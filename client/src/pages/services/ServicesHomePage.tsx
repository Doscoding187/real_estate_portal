import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import {
  formatArea,
  getCategoryMeta,
  isServiceCategory,
  SERVICE_CATEGORIES,
  type ServiceCategory,
} from '@/features/services/catalog';
import { ServiceHeroSearch } from '@/components/services/ServiceHeroSearch';
import { TrustBar } from '@/components/services/TrustBar';
import { CategoryTileGrid } from '@/components/services/CategoryTileGrid';
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
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Clock3,
  MapPinned,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

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
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
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

  const topDemandCategories = useMemo(() => {
    return demandItems
      .map(item =>
        SERVICE_CATEGORIES.find(category => category.label === item.title || category.subtitle === item.subtitle),
      )
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [demandItems]);

  const heroStats = useMemo(
    () => [
      {
        label: 'Verified pros',
        value: providers.filter(provider => provider.verificationStatus === 'verified').length || 0,
      },
      {
        label: 'Popular categories',
        value: SERVICE_CATEGORIES.length,
      },
      {
        label: 'Coverage focus',
        value: usingLocalizedProviders ? formatArea(lastLocation?.city, lastLocation?.province, lastLocation?.suburb) : 'South Africa',
      },
    ],
    [lastLocation?.city, lastLocation?.province, lastLocation?.suburb, providers, usingLocalizedProviders],
  );

  const serviceListifyBlue = '#0f3d91';
  const serviceListifyGold = '#c98b2b';
  const serviceListifyMist = '#eef4ff';

  useEffect(() => {
    applySeo({
      title: 'Service Listify | Find Trusted Home Services',
      description:
        'Find vetted service partners for home projects, finance and legal, moving, and more. Compare providers and start matching in minutes.',
      canonicalPath: '/services',
    });
  }, []);

  return (
    <main
      id="main-content"
      className="min-h-screen bg-[#f7f4ec]"
      style={
        {
          '--service-listify-blue': serviceListifyBlue,
          '--service-listify-gold': serviceListifyGold,
          '--service-listify-mist': serviceListifyMist,
        } as CSSProperties
      }
    >
      <div className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[44rem] bg-[radial-gradient(circle_at_top_left,_rgba(15,61,145,0.14),_transparent_34%),radial-gradient(circle_at_85%_15%,_rgba(201,139,43,0.16),_transparent_24%),linear-gradient(180deg,_#f9f6ef_0%,_#eef4ff_62%,_#f7f4ec_100%)]" />
        <div className="absolute left-[-8rem] top-28 h-64 w-64 rounded-full bg-white/50 blur-3xl" />
        <div className="absolute right-[-4rem] top-14 h-52 w-52 rounded-full bg-[#d7e5ff] blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6 md:py-12">
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#0f3d91]/15 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f3d91] shadow-sm backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" />
                  Service Listify
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#1f6f5f] px-3 py-1 text-xs font-semibold text-white">
                  <MapPinned className="h-3.5 w-3.5" />
                  Built for South Africa
                </span>
              </div>

              <div className="max-w-3xl space-y-4">
                <h1 className="font-serif text-4xl leading-tight text-slate-950 md:text-6xl">
                  Property Listify for trusted pros, repairs, moving, paperwork and handover help.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-700 md:text-lg">
                  Service Listify extends the Property Listify journey into the real work that
                  follows a search, sale, move, or renovation. Start with the most in-demand
                  service categories and get matched with vetted providers faster.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  className="h-12 rounded-full bg-[#0f3d91] px-6 text-sm font-semibold text-white hover:bg-[#0a2e6e]"
                  onClick={() => setLocation('/services/request/home_improvement')}
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
                {heroStats.map(stat => (
                  <div
                    key={stat.label}
                    className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-[0_18px_60px_-34px_rgba(15,61,145,0.45)] backdrop-blur"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-[#0d2046] p-4 shadow-[0_30px_120px_-40px_rgba(13,32,70,0.75)]">
                <div className="grid gap-4 rounded-[1.5rem] bg-[linear-gradient(160deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0.02))] p-4 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="flex min-h-[20rem] flex-col justify-between rounded-[1.25rem] bg-[linear-gradient(180deg,_rgba(255,255,255,0.12),_rgba(255,255,255,0.02))] p-5 text-white">
                    <div className="space-y-3">
                      <span className="inline-flex w-fit items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
                        Most in demand right now
                      </span>
                      <h2 className="text-2xl font-semibold leading-tight">
                        {usingLocalizedProviders
                          ? `Pros near ${formatArea(lastLocation?.city, lastLocation?.province, lastLocation?.suburb)}`
                          : 'Pros for every stage of the property journey'}
                      </h2>
                      <p className="max-w-sm text-sm leading-6 text-white/75">
                        Start with urgent jobs, compare provider fit, and move into booking with
                        less back-and-forth.
                      </p>
                    </div>

                    <div className="grid gap-3">
                      {(topDemandCategories.length ? topDemandCategories : SERVICE_CATEGORIES.slice(0, 3)).map(category => (
                        <button
                          key={category.value}
                          type="button"
                          onClick={() => setLocation(`/services/${category.value}`)}
                          className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
                        >
                          <div>
                            <p className="text-sm font-semibold">{category.label}</p>
                            <p className="text-xs text-white/65">{category.subtitle}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-white/80" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <img
                      src="/placeholders/urban-illustration-with-large-buildings-with-cars-and-trees-city-activities-vector.jpg"
                      alt="Service Listify city and home services illustration"
                      className="h-48 w-full rounded-[1.25rem] object-cover"
                    />
                    <div className="rounded-[1.25rem] bg-[#f5efe1] p-5 text-slate-900">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Promise
                          </p>
                          <p className="text-sm font-medium">Find a pro first. Handle the project after.</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Main flows
                          </p>
                          <p className="text-sm font-medium">Repairs, moving, compliance, finance and listing media.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-[#0f3d91]/10 bg-white/80 p-3 shadow-sm backdrop-blur">
                <ServiceHeroSearch
                  title="What can we help you with today?"
                  subtitle="Choose a service, add your suburb or city, and we will match you with providers that cover your project."
                  submitLabel="Find a pro"
                  onSubmit={({ category, location }) => {
                    const query = toLocationQuery(location);
                    setLocation(`/services/request/${category}${query ? `?${query}` : ''}`);
                  }}
                />
              </div>
            </div>
          </section>

          <TrustBar providers={providers} isLoading={isLoadingProviders} />

          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-[1.75rem] border border-[#0f3d91]/10 bg-white/85 p-6 shadow-sm">
              <ShieldCheck className="h-6 w-6 text-[#0f3d91]" />
              <h2 className="mt-4 text-xl font-semibold text-slate-950">Trusted by the Property Listify journey</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                We are designing this around the real property lifecycle, not a generic task board.
              </p>
            </article>
            <article className="rounded-[1.75rem] border border-[#c98b2b]/15 bg-[#fbf4e6] p-6 shadow-sm">
              <Clock3 className="h-6 w-6 text-[#a86d12]" />
              <h2 className="mt-4 text-xl font-semibold text-slate-950">Built around high-intent demand</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Homepage emphasis follows the categories and providers already showing strongest activity.
              </p>
            </article>
            <article className="rounded-[1.75rem] border border-[#1f6f5f]/15 bg-[#eef8f4] p-6 shadow-sm">
              <BriefcaseBusiness className="h-6 w-6 text-[#1f6f5f]" />
              <h2 className="mt-4 text-xl font-semibold text-slate-950">Balanced marketplace CTAs</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Homeowners can find a pro quickly while providers still get a clear onboarding route.
              </p>
            </article>
          </section>

          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0f3d91]">
                  Browse categories
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                  Start with the service lane that fits your property task
                </h2>
              </div>
              <Link href="/service/profile" className="hidden text-sm font-semibold text-[#0f3d91] md:inline-flex md:items-center md:gap-2">
                Join as a provider
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <CategoryTileGrid
              selected={selectedCategory}
              onSelect={category => {
                setSelectedCategory(category);
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

          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              {isLoadingProviders ? <PopularProjectsGridSkeleton /> : <PopularProjectsGrid />}
            </div>
            <aside className="rounded-[2rem] bg-[#10294f] p-6 text-white shadow-[0_24px_90px_-40px_rgba(16,41,79,0.8)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                How it works
              </p>
              <h2 className="mt-3 text-2xl font-semibold">A cleaner path from property question to booked provider.</h2>
              <div className="mt-6 space-y-4">
                {[
                  'Tell us the service and your location.',
                  'We surface providers that match category, trust, and coverage.',
                  'You compare profiles, reviews, and request options in one flow.',
                ].map((step, index) => (
                  <div key={step} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#10294f]">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-white/80">{step}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  className="rounded-full bg-white px-5 text-[#10294f] hover:bg-white/90"
                  onClick={() => setLocation('/services/request/home_improvement')}
                >
                  Start a request
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full border-white/20 bg-transparent px-5 text-white hover:bg-white/10"
                  onClick={() => setLocation('/services/home_improvement')}
                >
                  Explore providers
                </Button>
              </div>
            </aside>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f3d91]">
                  Provider directory
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                  {usingLocalizedProviders
                    ? `Top providers near ${formatArea(lastLocation?.city, lastLocation?.province, lastLocation?.suburb)}`
                    : 'Top rated providers'}
                </h2>
              </div>
            </div>
            <div className="grid gap-3">
              {isLoadingProviders &&
                Array.from({ length: 4 }).map((_, index) => (
                  <ProviderCardSkeleton key={`provider-skeleton-${index}`} />
                ))}
              {providers.slice(0, 6).map(provider => (
                <ProviderCard
                  key={provider.providerId}
                  provider={provider}
                  onCta={providerId =>
                    setLocation(
                      `/services/request/${provider.services?.[0]?.category || 'home_improvement'}?providerId=${providerId}`,
                    )
                  }
                />
              ))}
              {!isLoadingProviders && providers.length === 0 && (
                <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">We are expanding coverage in this area.</p>
                  <p className="mt-1">
                    Submit your request anyway and we will route it to the closest available providers.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setLocation('/services/request/home_improvement')}
                      className="rounded-full bg-[#0f3d91] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0a2e6e]"
                    >
                      Request anyway
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocation('/services/home_improvement/johannesburg/gauteng')}
                      className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Try Johannesburg, Gauteng
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocation('/services/home_improvement/cape-town/western-cape')}
                      className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Try Cape Town, Western Cape
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <CostGuidesSection />

          <section className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,_#0f3d91,_#173463_55%,_#c98b2b_150%)] p-8 text-white shadow-[0_26px_100px_-40px_rgba(15,61,145,0.85)] md:p-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="space-y-3">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                  <BadgeCheck className="h-4 w-4" />
                  Final call to action
                </p>
                <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
                  Find the right pro through Service Listify, or join the network and grow with Property Listify demand.
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-white/80 md:text-base">
                  The platform direction is now clear: homeowner-first search on the left, provider growth on the right.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  className="rounded-full bg-white px-6 text-[#0f3d91] hover:bg-white/90"
                  onClick={() => setLocation('/services/request/home_improvement')}
                >
                  Find a pro
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full border-white/25 bg-transparent px-6 text-white hover:bg-white/10"
                  onClick={() => setLocation('/service/profile')}
                >
                  Become a provider
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
