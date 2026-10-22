import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Check,
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
  buildProviderProfilePath,
  buildServiceCategoryPath,
  parseServiceLocationInput,
  serviceJourneyContextFromSearch,
  toProviderSlug,
  type ServiceCategory,
} from '@/features/services/catalog';
import {
  SERVICES_IMAGES,
  buildPopularServiceHref,
  rankPopularServiceGroups,
} from '@/features/services/media';
import { servicesUi } from '@/features/services/design';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import {
  PopularServiceCard,
  PopularServiceIconWell,
} from '@/components/services/PopularServiceCard';
import { ProviderShowcaseCard } from '@/components/services/ProviderShowcaseCard';
import { ServicesSiteFooter } from '@/components/services/ServicesSiteFooter';
import type { ProviderDirectoryItem } from '@/components/services/ProviderCard';
import { applySeo } from '@/lib/seo';
import { useServicesLocation } from '@/features/services/useServicesLocation';

const DIRECTORY_SCAN_LIMIT = 50;
const RAIL_SIZE = 8;

const HOW_IT_WORKS = [
  {
    title: 'Search & explore',
    description: 'Choose a service category and add your location.',
    icon: Search,
  },
  {
    title: 'Compare providers',
    description: 'Browse verified professionals in your area.',
    icon: ClipboardList,
  },
  {
    title: 'Send an enquiry',
    description: 'Get in touch directly with the provider you choose.',
    icon: MessageSquare,
  },
  {
    title: 'Get it done',
    description: 'The provider will contact you to discuss your needs.',
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

function providerCategory(provider: ProviderDirectoryItem): ServiceCategory {
  const category = provider.services?.find(service => service.category)?.category;
  return (category as ServiceCategory | undefined) || 'home_improvement';
}

export default function ServicesHomePage() {
  const { search, setLocation } = useServicesLocation();
  const journeyContext = serviceJourneyContextFromSearch(search);
  const [selectedServiceKey, setSelectedServiceKey] = useState('plumbing');
  const [searchLocation, setSearchLocation] = useState('');

  const directoryQuery = trpc.servicesEngine.directorySearch.useQuery({
    limit: DIRECTORY_SCAN_LIMIT,
    sort: 'rating',
  });
  const providers = useMemo(
    () => (directoryQuery.data || []) as ProviderDirectoryItem[],
    [directoryQuery.data],
  );
  const isLoading = directoryQuery.isLoading;
  const hasError = Boolean(directoryQuery.error);

  const rankedServices = useMemo(() => rankPopularServiceGroups(providers), [providers]);
  const railServices = rankedServices.slice(0, RAIL_SIZE);
  const moreServices = rankedServices.slice(RAIL_SIZE);
  const selectedService =
    rankedServices.find(service => service.key === selectedServiceKey) || rankedServices[0] || null;

  const featuredProviders = useMemo(() => {
    return [...providers]
      .sort(
        (a, b) =>
          Number(b.averageRating || 0) - Number(a.averageRating || 0) ||
          Number(b.reviewCount || 0) - Number(a.reviewCount || 0) ||
          a.companyName.localeCompare(b.companyName),
      )
      .slice(0, 6);
  }, [providers]);
  const spotlightProvider = featuredProviders[0] || null;

  useEffect(() => {
    applySeo({
      title: 'Property Professionals | Property Listify Services',
      description:
        'Find property-related professionals by service and listed coverage, then send a clear request to the provider you choose.',
      canonicalPath: '/services',
    });
  }, []);

  function submitSearch() {
    if (!selectedService) return;
    const location = parseServiceLocationInput(searchLocation);
    if (!selectedService.category) {
      setLocation('/services');
      return;
    }
    setLocation(
      buildPopularServiceHref(selectedService, {
        ...journeyContext,
        ...location,
      }),
    );
  }

  function providerProfileHref(provider: ProviderDirectoryItem) {
    return buildProviderProfilePath(
      toProviderSlug(provider.companyName, provider.providerId),
      search,
      {
        ...journeyContext,
        providerId: provider.providerId,
        serviceCode: provider.services?.[0]?.code || '',
      },
    );
  }

  return (
    <>
      <EnhancedNavbar />
      <main className="bg-[#FDFDFD] text-[#0B1B2A]">
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="relative isolate overflow-hidden bg-[#02111E]">
          <img
            src={SERVICES_IMAGES.hero}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            fetchPriority="high"
          />
          <div
            className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,17,30,0.94)_0%,rgba(2,17,30,0.76)_42%,rgba(2,17,30,0.28)_72%,rgba(2,17,30,0.38)_100%)]"
            aria-hidden="true"
          />
          <div className="relative mx-auto w-full max-w-7xl px-4 pb-8 pt-14 md:px-6 md:pb-10 md:pt-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5FD3AC]">
              Services
            </p>
            <h1 className="mt-4 max-w-3xl font-['Sora'] text-[34px] font-bold leading-[1.08] tracking-[-0.04em] text-white md:text-[52px]">
              Trusted Local Service Providers for Your Property &amp; Home
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-slate-200 md:text-lg">
              Find verified professionals across 6 service categories. From home repairs to
              renovations, connect with the right experts in your area.
            </p>

            <div className="mt-10 rounded-2xl border border-white/20 bg-white p-3 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] md:mt-14 md:p-4">
              <div className="grid gap-3 md:grid-cols-[1.1fr_1fr_auto] md:items-end">
                <label className="block text-left">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4B5C6B]">
                    Select a service category
                  </span>
                  <select
                    aria-label="Service category"
                    value={selectedService?.key || ''}
                    onChange={event => setSelectedServiceKey(event.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border border-[#E3EBF0] bg-[#FDFDFD] px-4 text-sm text-[#0B1B2A] outline-none transition focus:border-[#168363]"
                  >
                    {rankedServices.map(service => (
                      <option key={service.key} value={service.key}>
                        {service.label}
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
                      placeholder="e.g. Sandton, Gauteng"
                      className="w-full bg-transparent text-sm text-[#0B1B2A] outline-none placeholder:text-[#A8B4BF]"
                    />
                  </div>
                </label>

                <button type="button" onClick={submitSearch} className={servicesUi.action}>
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Search
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Ranked service rail ────────────────────────────────────────── */}
        <section className="border-b border-[#E3EBF0] bg-white">
          <div className="mx-auto w-full max-w-7xl px-4 py-9 md:px-6 md:py-10">
            <div className="flex gap-6 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {railServices.map(service => (
                <PopularServiceIconWell
                  key={service.key}
                  service={service}
                  href={buildPopularServiceHref(service, journeyContext)}
                  isActive={service.key === selectedService?.key}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── Remaining services ─────────────────────────────────────────── */}
        <section className="bg-[#F7FAFB] px-4 py-14 md:px-6 md:py-16">
          <div className="mx-auto w-full max-w-7xl">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className={servicesUi.eyebrow}>More property services</p>
                <h2 className={`mt-2 ${servicesUi.heading}`}>The rest of the directory</h2>
                <p className="mt-2 max-w-2xl text-sm text-[#8A99A6]">
                  The most-requested services are ranked in the rail above. Every other service
                  group follows here, with no duplicate cards.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLocation('/services')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#168363]"
              >
                View all services
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              {moreServices.map(service => (
                <PopularServiceCard
                  key={service.key}
                  service={service}
                  href={buildPopularServiceHref(service, journeyContext)}
                />
              ))}
              <button
                type="button"
                onClick={() => setLocation('/services')}
                className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#CBD8E0] bg-white p-5 text-center transition hover:border-[#168363]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EDF8F6]">
                  <ArrowRight className="h-5 w-5 text-[#168363]" aria-hidden="true" />
                </span>
                <span className="text-[14px] font-bold text-[#0B1B2A]">View all services</span>
                <span className="text-[12px] text-[#8A99A6]">Browse the full directory</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── Featured providers ─────────────────────────────────────────── */}
        <section className="bg-white px-4 py-14 md:px-6 md:py-16">
          <div className="mx-auto w-full max-w-7xl">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className={servicesUi.eyebrow}>Featured service providers</p>
                <h2 className={`mt-2 ${servicesUi.heading}`}>Published and platform verified</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!selectedService?.category) {
                    setLocation('/services');
                    return;
                  }
                  setLocation(buildServiceCategoryPath(selectedService.category, journeyContext));
                }}
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
                    className="h-80 animate-pulse rounded-2xl bg-[#E9F0F4]"
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

        {/* ── Spotlight, trust and testimonial ───────────────────────────── */}
        {spotlightProvider && (
          <section className="bg-[#F7FAFB] px-4 py-14 md:px-6 md:py-16">
            <div className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-[1.65fr_1fr]">
              <div className="grid overflow-hidden rounded-3xl bg-[#071829] md:grid-cols-2">
                <div className="relative min-h-[260px]">
                  <img
                    src={spotlightProvider.logoUrl || SERVICES_IMAGES.ecosystem}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                  <span
                    className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,17,30,0.05)_0%,rgba(2,17,30,0.55)_100%)]"
                    aria-hidden="true"
                  />
                </div>
                <div className="p-7 md:p-9">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5FD3AC]">
                    Featured provider
                  </p>
                  <h2 className="mt-3 font-['Sora'] text-2xl font-bold tracking-[-0.03em] text-white md:text-[26px]">
                    {spotlightProvider.companyName}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    {spotlightProvider.headline || spotlightProvider.bio}
                  </p>

                  <ul className="mt-5 space-y-2">
                    {(spotlightProvider.services || []).slice(0, 4).map(service => (
                      <li
                        key={service.code || service.displayName}
                        className="flex items-center gap-2.5 text-[13px] text-slate-200"
                      >
                        <Check className="h-3.5 w-3.5 shrink-0 text-[#5FD3AC]" aria-hidden="true" />
                        {service.displayName}
                      </li>
                    ))}
                    {(spotlightProvider.locations || []).slice(0, 1).map(location => (
                      <li
                        key={`${location.city}-${location.suburb}`}
                        className="flex items-center gap-2.5 text-[13px] text-slate-200"
                      >
                        <MapPin
                          className="h-3.5 w-3.5 shrink-0 text-[#5FD3AC]"
                          aria-hidden="true"
                        />
                        {[location.suburb, location.city, location.province]
                          .filter(Boolean)
                          .join(', ')}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => setLocation(providerProfileHref(spotlightProvider))}
                    className={`mt-6 ${servicesUi.action}`}
                  >
                    View full profile
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border border-[#E3EBF0] bg-white p-5">
                  <ul className="space-y-4">
                    {TRUST_POINTS.map(point => {
                      const Icon = point.icon;
                      return (
                        <li key={point.title} className="flex gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EDF8F6]">
                            <Icon className="h-4.5 w-4.5 text-[#168363]" aria-hidden="true" />
                          </span>
                          <div>
                            <h3 className="text-[13px] font-bold text-[#0B1B2A]">{point.title}</h3>
                            <p className="mt-0.5 text-[12px] leading-5 text-[#4B5C6B]">
                              {point.description}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <figure className={`${servicesUi.tintPanel} flex flex-col justify-between p-6`}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                    <Home className="h-4.5 w-4.5 text-[#168363]" aria-hidden="true" />
                  </span>
                  <blockquote className="mt-4 text-[14px] leading-6 text-[#0B1B2A]">
                    “From small repairs to big renovations, Property Listify makes it easy to find
                    trusted professionals in your area.”
                  </blockquote>
                  <figcaption className="mt-3 text-[12px] font-semibold text-[#4B5C6B]">
                    — Property Listify
                  </figcaption>
                </figure>
              </div>
            </div>
          </section>
        )}

        {/* ── How it works ───────────────────────────────────────────────── */}
        <section className="bg-white px-4 py-14 md:px-6 md:py-16">
          <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1.7fr_1fr] lg:items-start">
            <div>
              <p className={servicesUi.eyebrow}>How it works</p>
              <h2 className={`mt-2 ${servicesUi.heading}`}>
                Get the right service, in just a few steps.
              </h2>
              <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {HOW_IT_WORKS.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <li key={step.title} className="relative flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#168363] text-[12px] font-bold text-white">
                          {index + 1}
                        </span>
                        <Icon className="h-5 w-5 text-[#168363]" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="text-[14px] font-bold text-[#0B1B2A]">{step.title}</h3>
                        <p className="mt-1 text-[12px] leading-5 text-[#4B5C6B]">
                          {step.description}
                        </p>
                      </div>
                      {index < HOW_IT_WORKS.length - 1 && (
                        <span
                          className="absolute left-10 top-4 hidden h-px w-[calc(100%-2rem)] bg-[#E3EBF0] lg:block"
                          aria-hidden="true"
                        />
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className={`${servicesUi.tintPanel} p-7 md:p-8`}>
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

        {/* ── Ecosystem band ─────────────────────────────────────────────── */}
        <section className="bg-white px-4 pb-14 md:px-6 md:pb-16">
          <div className="relative mx-auto w-full max-w-7xl overflow-hidden rounded-3xl bg-[#02111E]">
            <img
              src={SERVICES_IMAGES.ecosystem}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
            <div
              className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,17,30,0.94)_0%,rgba(2,17,30,0.78)_44%,rgba(2,17,30,0.2)_100%)]"
              aria-hidden="true"
            />
            <div className="relative flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between md:p-12">
              <div className="max-w-2xl">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5FD3AC]">
                  Part of the Property Listify ecosystem
                </p>
                <h2 className="mt-3 font-['Sora'] text-2xl font-bold tracking-[-0.03em] text-white md:text-[32px]">
                  More Than Just Properties
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  From buying and renting to property services, developments and more — Property
                  Listify is your complete property and home lifestyle platform.
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
          </div>
        </section>

        <ServicesSiteFooter />
      </main>
    </>
  );
}
