import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  Home,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import {
  SERVICE_CATEGORIES,
  buildProviderProfilePath,
  buildServiceCategoryPath,
  buildServiceLocationPath,
  parseServiceLocationInput,
  serviceJourneyContextFromSearch,
  toProviderSlug,
  type ServiceCategory,
} from '@/features/services/catalog';
import { servicesUi } from '@/features/services/design';
import { CategoryIconWell, CategoryShowcaseCard } from '@/components/services/CategoryShowcaseCard';
import { ProviderShowcaseCard } from '@/components/services/ProviderShowcaseCard';
import { ServicesSiteFooter } from '@/components/services/ServicesSiteFooter';
import type { ProviderDirectoryItem } from '@/components/services/ProviderCard';
import { applySeo } from '@/lib/seo';
import { useServicesLocation } from '@/features/services/useServicesLocation';

const DIRECTORY_SCAN_LIMIT = 50;

const HOW_IT_WORKS = [
  {
    title: 'Search & explore',
    description: 'Choose a service category and add your location.',
    icon: Search,
  },
  {
    title: 'Compare providers',
    description: 'Review published services and listed coverage in your area.',
    icon: ClipboardList,
  },
  {
    title: 'Send an enquiry',
    description: 'Get in touch directly with the provider you choose.',
    icon: MessageSquare,
  },
  {
    title: 'Get it done',
    description: 'The provider responds with next steps and a quote.',
    icon: UserCheck,
  },
];

const TRUST_POINTS = [
  {
    title: 'Verified professionals',
    description: 'All providers are platform verified for your peace of mind.',
    icon: BadgeCheck,
  },
  {
    title: 'Local & trusted',
    description: 'Real professionals in your area, ready to help.',
    icon: ShieldCheck,
  },
  {
    title: 'Easy enquiries',
    description: 'Get in touch directly with the right provider, fast and simple.',
    icon: MessageSquare,
  },
];

export default function ServicesHomePage() {
  const { search, setLocation } = useServicesLocation();
  const journeyContext = serviceJourneyContextFromSearch(search);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>('home_improvement');
  const [searchLocation, setSearchLocation] = useState('');

  const directoryQuery = trpc.servicesEngine.directorySearch.useQuery({
    limit: DIRECTORY_SCAN_LIMIT,
  });
  const providers = useMemo(
    () => (directoryQuery.data || []) as ProviderDirectoryItem[],
    [directoryQuery.data],
  );
  const isLoading = directoryQuery.isLoading;
  const hasError = Boolean(directoryQuery.error);
  const isPartialCohort = providers.length >= DIRECTORY_SCAN_LIMIT;

  const categoryCounts = useMemo(() => {
    const counts = new Map<ServiceCategory, number>();
    for (const category of SERVICE_CATEGORIES) counts.set(category.value, 0);
    for (const provider of providers) {
      for (const service of provider.services || []) {
        const category = service.category as ServiceCategory | undefined;
        if (category && counts.has(category)) {
          counts.set(category, (counts.get(category) || 0) + 1);
        }
      }
    }
    return counts;
  }, [providers]);

  const featuredProviders = useMemo(() => providers.slice(0, 6), [providers]);
  const spotlightProvider = featuredProviders[0] || null;

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
    setLocation(buildServiceLocationPath(category, location, journeyContext));
  }

  function providerProfileHref(provider: ProviderDirectoryItem) {
    return buildProviderProfilePath(
      toProviderSlug(provider.companyName, provider.providerId),
      search,
      {
        ...journeyContext,
        providerId: provider.providerId,
        serviceCode:
          provider.services?.find(service => service.category === selectedCategory)?.code || '',
      },
    );
  }

  return (
    <main className="bg-[#FDFDFD] text-[#0B1B2A]">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative bg-[#02111E]">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(900px 420px at 12% 0%, rgba(22,131,99,0.32) 0%, transparent 60%), radial-gradient(700px 380px at 88% 18%, rgba(13,56,92,0.55) 0%, transparent 62%)',
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-10 pt-14 md:px-6 md:pb-14 md:pt-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5FD3AC]">
            Services
          </p>
          <h1 className="mt-4 max-w-3xl font-['Sora'] text-[34px] font-bold leading-[1.08] tracking-[-0.04em] text-white md:text-[54px]">
            Trusted local service providers for your property and home.
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-slate-300 md:text-lg">
            Find verified professionals across {SERVICE_CATEGORIES.length} service categories. From
            home repairs to renovations, connect with the right experts in your area.
          </p>
        </div>

        {/* The search card straddles the hero edge, as in the approved blueprint. */}
        <div className="relative z-10 mx-auto -mb-16 w-full max-w-7xl px-4 md:-mb-20 md:px-6">
          <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] md:p-5">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="block text-left">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4B5C6B]">
                  Select a service category
                </span>
                <select
                  aria-label="Service category"
                  value={selectedCategory}
                  onChange={event => setSelectedCategory(event.target.value as ServiceCategory)}
                  className="mt-2 h-12 w-full rounded-xl border border-[#E3EBF0] bg-[#FDFDFD] px-4 text-sm text-[#0B1B2A] outline-none transition focus:border-[#168363]"
                >
                  {SERVICE_CATEGORIES.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-left">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4B5C6B]">
                  Location
                </span>
                <div className="mt-2 flex h-12 items-center rounded-xl border border-[#E3EBF0] bg-[#FDFDFD] px-4 transition focus-within:border-[#168363]">
                  <MapPin className="mr-2 h-4 w-4 shrink-0 text-[#8A99A6]" aria-hidden="true" />
                  <input
                    aria-label="Service location"
                    value={searchLocation}
                    onChange={event => setSearchLocation(event.target.value)}
                    placeholder="e.g. Gauteng, Sandton"
                    className="w-full bg-transparent text-sm text-[#0B1B2A] outline-none placeholder:text-[#A8B4BF]"
                  />
                </div>
              </label>

              <button
                type="button"
                onClick={() => submitSearch(selectedCategory, searchLocation)}
                className={servicesUi.action}
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Category icon rail ───────────────────────────────────────────── */}
      <section className="border-b border-[#E3EBF0] bg-white pt-24 md:pt-28">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
          <div className="flex gap-6 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SERVICE_CATEGORIES.map(category => (
              <CategoryIconWell
                key={category.value}
                category={category.value}
                label={category.label}
                href={buildServiceCategoryPath(category.value, journeyContext)}
                isActive={category.value === selectedCategory}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Popular service categories ───────────────────────────────────── */}
      <section className="bg-white px-4 py-12 md:px-6 md:py-16">
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={servicesUi.eyebrow}>Popular service categories</p>
              <h2 className={`mt-2 ${servicesUi.heading}`}>Start with what you need done</h2>
            </div>
            <p className="text-sm text-[#8A99A6]">
              {SERVICE_CATEGORIES.length} categories in the Services directory
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {SERVICE_CATEGORIES.map(category => (
              <CategoryShowcaseCard
                key={category.value}
                category={category.value}
                label={category.label}
                href={buildServiceCategoryPath(category.value, journeyContext)}
                providerCount={categoryCounts.get(category.value) || 0}
                isPartial={isPartialCohort}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured providers ───────────────────────────────────────────── */}
      <section className="bg-[#F7FAFB] px-4 py-12 md:px-6 md:py-16">
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={servicesUi.eyebrow}>Featured service providers</p>
              <h2 className={`mt-2 ${servicesUi.heading}`}>Published and platform verified</h2>
            </div>
            <button
              type="button"
              onClick={() =>
                setLocation(buildServiceCategoryPath(selectedCategory, journeyContext))
              }
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#168363]"
            >
              View all providers
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {isLoading && (
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`services-featured-skeleton-${index}`}
                  className="h-72 animate-pulse rounded-2xl bg-[#E9F0F4]"
                />
              ))}
            </div>
          )}

          {!isLoading && hasError && (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
              We could not load the provider directory. Please try again.
            </div>
          )}

          {!isLoading && !hasError && featuredProviders.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              {featuredProviders.map(provider => (
                <ProviderShowcaseCard
                  key={provider.providerId}
                  provider={provider}
                  profileHref={providerProfileHref(provider)}
                />
              ))}
            </div>
          )}

          {!isLoading && !hasError && featuredProviders.length === 0 && (
            <div className="mt-8 rounded-2xl border border-dashed border-[#CBD8E0] bg-white p-8 text-sm leading-6 text-[#4B5C6B]">
              No published providers are available yet. The Services directory opens as providers
              complete review and publication.
            </div>
          )}
        </div>
      </section>

      {/* ── Featured provider spotlight ──────────────────────────────────── */}
      {spotlightProvider && (
        <section className="bg-white px-4 py-12 md:px-6 md:py-16">
          <div className="mx-auto grid w-full max-w-7xl overflow-hidden rounded-3xl bg-[#071829] lg:grid-cols-2">
            <div className="relative min-h-[240px] bg-[linear-gradient(140deg,#0D2237_0%,#116E54_100%)]">
              <div className="flex h-full items-center justify-center p-10">
                <span className="font-['Sora'] text-6xl font-bold tracking-[-0.04em] text-white/90">
                  {spotlightProvider.companyName.slice(0, 2).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="p-8 md:p-12">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5FD3AC]">
                Featured provider
              </p>
              <h2 className="mt-3 font-['Sora'] text-2xl font-bold tracking-[-0.03em] text-white md:text-3xl">
                {spotlightProvider.companyName}
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                {spotlightProvider.headline || spotlightProvider.bio}
              </p>

              <ul className="mt-6 space-y-2.5">
                {(spotlightProvider.services || []).slice(0, 4).map(service => (
                  <li
                    key={service.code || service.displayName}
                    className="flex items-center gap-2.5 text-sm text-slate-200"
                  >
                    <BadgeCheck className="h-4 w-4 shrink-0 text-[#5FD3AC]" aria-hidden="true" />
                    {service.displayName}
                  </li>
                ))}
                {(spotlightProvider.locations || []).slice(0, 1).map(location => (
                  <li
                    key={`${location.city}-${location.suburb}`}
                    className="flex items-center gap-2.5 text-sm text-slate-200"
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-[#5FD3AC]" aria-hidden="true" />
                    {[location.suburb, location.city, location.province].filter(Boolean).join(', ')}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => setLocation(providerProfileHref(spotlightProvider))}
                className={`mt-8 ${servicesUi.action}`}
              >
                View full profile
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Trust row ────────────────────────────────────────────────────── */}
      <section className="bg-[#F7FAFB] px-4 py-12 md:px-6 md:py-16">
        <div className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-4">
          {TRUST_POINTS.map(point => {
            const Icon = point.icon;
            return (
              <div key={point.title} className={servicesUi.surface + ' p-6'}>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EDF8F6]">
                  <Icon className="h-5 w-5 text-[#168363]" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-[15px] font-bold text-[#0B1B2A]">{point.title}</h3>
                <p className="mt-2 text-[13px] leading-6 text-[#4B5C6B]">{point.description}</p>
              </div>
            );
          })}

          <figure className={`${servicesUi.tintPanel} p-6`}>
            <blockquote className="text-[14px] leading-7 text-[#0B1B2A]">
              “From small repairs to big renovations, Property Listify makes it easy to find trusted
              professionals in your area.”
            </blockquote>
            <figcaption className="mt-4 text-[12px] font-semibold text-[#4B5C6B]">
              — Property Listify
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-12 md:px-6 md:py-16">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <div>
            <p className={servicesUi.eyebrow}>How it works</p>
            <h2 className={`mt-2 ${servicesUi.heading}`}>Get the right service in a few steps</h2>
            <ol className="mt-8 grid gap-6 sm:grid-cols-2">
              {HOW_IT_WORKS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li key={step.title} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#168363] text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="flex items-center gap-2 text-[15px] font-bold text-[#0B1B2A]">
                        <Icon className="h-4 w-4 text-[#168363]" aria-hidden="true" />
                        {step.title}
                      </h3>
                      <p className="mt-1.5 text-[13px] leading-6 text-[#4B5C6B]">
                        {step.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className={servicesUi.tintPanel + ' p-8'}>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
              <Home className="h-5 w-5 text-[#168363]" aria-hidden="true" />
            </span>
            <h3 className="mt-5 font-['Sora'] text-xl font-bold tracking-[-0.02em] text-[#0B1B2A]">
              Need help with a property or home service?
            </h3>
            <p className="mt-3 text-sm leading-7 text-[#4B5C6B]">
              Our team is here to assist you in finding the right professional.
            </p>
            <button
              type="button"
              onClick={() => setLocation('/contact')}
              className={`mt-6 ${servicesUi.actionOutline}`}
            >
              Contact support
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Ecosystem band ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#02111E] px-4 py-14 md:px-6 md:py-20">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'radial-gradient(760px 320px at 20% 0%, rgba(22,131,99,0.30) 0%, transparent 62%)',
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5FD3AC]">
              Part of the Property Listify ecosystem
            </p>
            <h2 className="mt-3 font-['Sora'] text-2xl font-bold tracking-[-0.03em] text-white md:text-3xl">
              More than just properties
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              From buying and renting to property services, developments and more — Property Listify
              is a complete property and home lifestyle platform.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLocation('/')}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#02111E] transition hover:bg-[#EDF8F6]"
          >
            Explore the full platform
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </section>

      <ServicesSiteFooter />
    </main>
  );
}
