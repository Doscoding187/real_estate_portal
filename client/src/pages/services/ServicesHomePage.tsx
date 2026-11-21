import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  Check,
  ClipboardCheck,
  ClipboardList,
  Hammer,
  Home,
  MapPin,
  MessageSquare,
  Scale,
  Search,
  ShieldCheck,
  Truck,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import {
  SERVICE_CATEGORIES,
  buildProviderProfilePath,
  buildServiceCategoryPath,
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
import {
  CanonicalPlaceSelector,
  type CanonicalPlaceSelection,
} from '@/components/location/CanonicalPlaceSelector';
import { canonicalPlaceSelectionFromResolved } from '@/lib/canonicalPlaceSelection';
import { isCanonicalPlaceId } from '@shared/placeAuthority';
import { useApiAvailability } from '@/components/ApiAvailabilityBoundary';

const DIRECTORY_SCAN_LIMIT = 50;
const RAIL_SIZE = 9;

const CATEGORY_ICONS: Record<ServiceCategory, LucideIcon> = {
  home_improvement: Hammer,
  finance_legal: Scale,
  moving: Truck,
  inspection_compliance: ClipboardCheck,
  insurance: ShieldCheck,
  media_marketing: Camera,
};

const PROJECT_STARTS: Array<{
  title: string;
  description: string;
  category: ServiceCategory;
  query?: string;
  image: string;
  icon: LucideIcon;
}> = [
  {
    title: 'Repair or improve a home',
    description: 'Browse home improvement services, from maintenance to renovations.',
    category: 'home_improvement',
    image: SERVICES_IMAGES.categories.home_improvement,
    icon: Hammer,
  },
  {
    title: 'Plan a move',
    description: 'Find moving and storage providers, then check the places they list.',
    category: 'moving',
    query: 'moving',
    image: SERVICES_IMAGES.categories.moving,
    icon: Truck,
  },
  {
    title: 'Check a property',
    description: 'Explore inspection and compliance services for your property needs.',
    category: 'inspection_compliance',
    query: 'inspection',
    image: SERVICES_IMAGES.categories.inspection_compliance,
    icon: ClipboardCheck,
  },
];

const CHOICE_GUIDANCE = [
  {
    title: 'Check the listed coverage',
    description:
      'Make sure the provider has listed the place where you need the service. Coverage is shown by the provider.',
    icon: MapPin,
  },
  {
    title: 'Read the service details',
    description:
      'Compare what each provider says they do. Prices appear when the provider has supplied them.',
    icon: ClipboardList,
  },
  {
    title: 'Choose who receives your request',
    description:
      'An enquiry goes to the provider you select. It does not book a service or guarantee a response.',
    icon: MessageSquare,
  },
];

const HOW_IT_WORKS = [
  {
    title: 'Choose a service',
    description: 'Browse by service and select a place that matches your project.',
    icon: Search,
  },
  {
    title: 'Review provider details',
    description: 'Check the provider’s listed services, coverage, and available trust signals.',
    icon: ClipboardList,
  },
  {
    title: 'Send one enquiry',
    description: 'Share your request with the provider you choose.',
    icon: MessageSquare,
  },
  {
    title: 'Discuss next steps',
    description: 'The provider can follow up with you directly about the request.',
    icon: UserCheck,
  },
];

const TRUST_POINTS = [
  {
    title: 'Reviewed for publication',
    description: 'A provider profile must be approved before it appears in the public directory.',
    icon: BadgeCheck,
  },
  {
    title: 'Listed service coverage',
    description: 'See the places a provider has listed for the services they offer.',
    icon: MapPin,
  },
  {
    title: 'Reviews when available',
    description: 'Read eligible published customer reviews where a provider has them.',
    icon: ShieldCheck,
  },
];

function providerCategory(provider: ProviderDirectoryItem): ServiceCategory {
  const category = provider.services?.find(service => service.category)?.category;
  return (category as ServiceCategory | undefined) || 'home_improvement';
}

export default function ServicesHomePage() {
  const { search, setLocation } = useServicesLocation();
  const { isUnavailable } = useApiAvailability();
  const journeyContext = serviceJourneyContextFromSearch(search);
  const rawPlaceId = new URLSearchParams(search).get('canonicalPlaceId');
  const initialPlaceId = isCanonicalPlaceId(rawPlaceId) ? rawPlaceId : '';
  const resolvedPlaceQuery = trpc.placeAuthority.resolveSearchPlace.useQuery(
    { placeId: initialPlaceId },
    { enabled: Boolean(initialPlaceId) && !isUnavailable, refetchOnWindowFocus: false },
  );
  const resolvedPlace = useMemo(
    () => canonicalPlaceSelectionFromResolved(resolvedPlaceQuery.data),
    [resolvedPlaceQuery.data],
  );
  const [selectedServiceKey, setSelectedServiceKey] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<CanonicalPlaceSelection | null | undefined>(
    undefined,
  );
  const activePlace = selectedPlace === undefined ? resolvedPlace : selectedPlace;

  const directoryQuery = trpc.servicesEngine.directorySearch.useQuery(
    {
      limit: DIRECTORY_SCAN_LIMIT,
      sort: 'rating',
    },
    { enabled: !isUnavailable },
  );
  const providers = useMemo(
    () => (isUnavailable ? [] : directoryQuery.data || []) as ProviderDirectoryItem[],
    [directoryQuery.data, isUnavailable],
  );
  const isLoading = !isUnavailable && directoryQuery.isLoading;
  const hasError = Boolean(directoryQuery.error);
  const directoryUnavailable = isUnavailable || hasError;

  const rankedServices = useMemo(() => rankPopularServiceGroups(providers), [providers]);
  const railServices = rankedServices.slice(0, RAIL_SIZE);
  const moreServices = rankedServices.slice(RAIL_SIZE);
  const selectedService =
    rankedServices.find(service => service.key === selectedServiceKey) || null;

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
    if (!selectedService.category) {
      setLocation('/services');
      return;
    }
    setLocation(
      buildPopularServiceHref(selectedService, {
        ...journeyContext,
        canonicalPlaceId: activePlace?.canonicalPlaceId,
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
              Property services for every step of your journey
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-slate-200 md:text-lg">
              Explore six service categories. Published provider availability is shown for your
              selected area, and enquiries go only to the provider you choose.
            </p>

            <div className="mt-10 rounded-2xl border border-white/20 bg-white p-3 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] md:mt-14 md:p-4">
              <div className="grid gap-3 md:grid-cols-[1.1fr_1fr_auto] md:items-start">
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
                    <option value="" disabled>
                      Choose a service
                    </option>
                    {rankedServices.map(service => (
                      <option key={service.key} value={service.key}>
                        {service.label}
                      </option>
                    ))}
                  </select>
                </label>

                <CanonicalPlaceSelector
                  value={activePlace}
                  onChange={setSelectedPlace}
                  label="Location"
                  purpose="search"
                  placeholder="Choose an approved Place"
                  labelClassName="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4B5C6B]"
                  inputClassName="h-12 rounded-xl border-[#E3EBF0] bg-[#FDFDFD] px-4"
                  statusClassName="text-xs leading-5 text-[#6B7B88]"
                />

                <button
                  type="button"
                  onClick={submitSearch}
                  disabled={!selectedService}
                  className={`${servicesUi.action} h-12 md:mt-6 disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Search
                </button>
              </div>
            </div>
          </div>
        </section>

        {isUnavailable && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 md:px-6" role="status">
            <p className="mx-auto max-w-7xl text-sm leading-6 text-amber-900">
              Live provider availability is temporarily unavailable while the application service
              reconnects. You can continue exploring service categories, but no provider or request
              information has been confirmed.
            </p>
          </div>
        )}

        {/* ── Ranked service rail ────────────────────────────────────────── */}
        <section className="border-b border-[#E3EBF0] bg-white">
          <div className="mx-auto w-full max-w-7xl px-4 py-9 md:px-6 md:py-10">
            <div className="mb-6">
              <p className={servicesUi.eyebrow}>Start with a service</p>
              <h2 className={`mt-2 ${servicesUi.heading}`}>What do you need help with?</h2>
              <p className="mt-2 max-w-2xl text-sm text-[#4B5C6B]">
                Choose a service to browse providers and their listed coverage.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-5 lg:grid-cols-9">
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

        {/* ── Additional service shortcuts ───────────────────────────────── */}
        <section className="bg-[#F7FAFB] px-4 py-14 md:px-6 md:py-16">
          <div className="mx-auto w-full max-w-7xl">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className={servicesUi.eyebrow}>More ways to get started</p>
                <h2 className={`mt-2 ${servicesUi.heading}`}>Explore more services</h2>
                <p className="mt-2 max-w-2xl text-sm text-[#8A99A6]">
                  Browse additional property service types and choose the category that best fits
                  what you need done.
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

        {/* ── Canonical service categories ───────────────────────────────── */}
        <section className="bg-white px-4 py-14 md:px-6 md:py-16">
          <div className="mx-auto w-full max-w-7xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className={servicesUi.eyebrow}>Browse the directory</p>
                <h2 className={`mt-2 ${servicesUi.heading}`}>Services for your property</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4B5C6B]">
                  Explore the six service categories and choose the one that best fits your need.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLocation('/services')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#168363]"
              >
                Browse all services
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SERVICE_CATEGORIES.map(category => {
                const Icon = CATEGORY_ICONS[category.value];
                return (
                  <Link
                    key={category.value}
                    href={buildServiceCategoryPath(category.value, journeyContext)}
                    className="group flex min-h-[188px] overflow-hidden rounded-2xl border border-[#E3EBF0] bg-white transition hover:-translate-y-0.5 hover:border-[#168363]/40 hover:shadow-[0_18px_40px_-28px_rgba(2,17,30,0.45)]"
                  >
                    <div className="relative hidden w-2/5 shrink-0 overflow-hidden bg-[#E9F0F4] sm:block">
                      <img
                        src={SERVICES_IMAGES.categories[category.value]}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                        loading="lazy"
                      />
                      <span
                        className="absolute inset-0 bg-gradient-to-t from-[#02111E]/60 to-transparent"
                        aria-hidden="true"
                      />
                      <span className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#168363] shadow-sm">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center p-5">
                      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDF8F6] text-[#168363] sm:hidden">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <h3 className="text-[16px] font-bold leading-snug text-[#0B1B2A]">
                        {category.label}
                      </h3>
                      <p className="mt-2 text-[13px] leading-5 text-[#4B5C6B]">
                        {category.subtitle}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#168363]">
                        Browse category
                        <ArrowRight
                          className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Project-based entry points ────────────────────────────────── */}
        <section className="bg-[#F7FAFB] px-4 py-14 md:px-6 md:py-16">
          <div className="mx-auto w-full max-w-7xl">
            <p className={servicesUi.eyebrow}>Start with the task</p>
            <h2 className={`mt-2 ${servicesUi.heading}`}>Where would you like to begin?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4B5C6B]">
              These starting points take you to the relevant service directory. You can review each
              provider’s details before sending an enquiry.
            </p>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {PROJECT_STARTS.map(start => {
                const Icon = start.icon;
                const categoryPath = buildServiceCategoryPath(start.category, journeyContext);
                const href = start.query
                  ? `${categoryPath}${categoryPath.includes('?') ? '&' : '?'}query=${encodeURIComponent(start.query)}`
                  : categoryPath;
                return (
                  <Link
                    key={start.title}
                    href={href}
                    className="group relative flex min-h-[300px] flex-col justify-end overflow-hidden rounded-3xl bg-[#071829] p-6 text-white md:p-7"
                  >
                    <img
                      src={start.image}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                    <span
                      className="absolute inset-0 bg-gradient-to-t from-[#02111E] via-[#02111E]/65 to-[#02111E]/10"
                      aria-hidden="true"
                    />
                    <span className="relative mb-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white/95 text-[#168363]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="relative mt-12">
                      <h3 className="font-['Sora'] text-xl font-bold tracking-[-0.02em] md:text-2xl">
                        {start.title}
                      </h3>
                      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-200">
                        {start.description}
                      </p>
                      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#8CE0C1]">
                        Explore services
                        <ArrowRight
                          className="h-4 w-4 transition group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Published providers ────────────────────────────────────────── */}
        <section className="bg-white px-4 py-14 md:px-6 md:py-16">
          <div className="mx-auto w-full max-w-7xl">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className={servicesUi.eyebrow}>Provider directory</p>
                <h2 className={`mt-2 ${servicesUi.heading}`}>
                  Published providers, when available
                </h2>
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

            {!isLoading && directoryUnavailable && (
              <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
                {isUnavailable
                  ? 'Live provider availability is temporarily unavailable. No provider information is being shown until the application service reconnects.'
                  : 'We could not load the provider directory. Please try again.'}
              </div>
            )}

            {!isLoading && !directoryUnavailable && featuredProviders.length > 0 && (
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

            {!isLoading && !directoryUnavailable && featuredProviders.length === 0 && (
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
                    Provider spotlight
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
                        key={location.canonicalPlaceId}
                        className="flex items-center gap-2.5 text-[13px] text-slate-200"
                      >
                        <MapPin
                          className="h-3.5 w-3.5 shrink-0 text-[#5FD3AC]"
                          aria-hidden="true"
                        />
                        {location.label}
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

        {/* ── Provider choice guide ──────────────────────────────────────── */}
        <section className="bg-white px-4 py-14 md:px-6 md:py-16">
          <div className="mx-auto w-full max-w-7xl">
            <div className="max-w-2xl">
              <p className={servicesUi.eyebrow}>Choose with clarity</p>
              <h2 className={`mt-2 ${servicesUi.heading}`}>
                A few things to check before you enquire
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#4B5C6B]">
                Compare the information providers have published, and make sure it fits the work you
                need done.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {CHOICE_GUIDANCE.map(item => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="rounded-2xl border border-[#E3EBF0] bg-[#FDFDFD] p-6"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EDF8F6] text-[#168363]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 text-[15px] font-bold text-[#0B1B2A]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#4B5C6B]">{item.description}</p>
                  </article>
                );
              })}
            </div>

            <p className="mt-5 max-w-4xl text-xs leading-5 text-[#6B7B88]">
              Platform review controls which provider profiles can appear in the directory. It is
              not a certification of every trade qualification, and Property Listify does not
              guarantee that a provider will accept or complete a request.
            </p>
          </div>
        </section>

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
                An enquiry is a first step
              </h3>
              <p className="mt-3 text-sm leading-7 text-[#4B5C6B]">
                Your request goes to the provider you choose. It is not a booking, quote or payment,
                and the provider decides whether to follow up.
              </p>
              <p className="mt-3 text-sm leading-6 text-[#4B5C6B]">
                Need platform assistance? Our support team can help with the site.
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

        {/* ── Service provider acquisition ──────────────────────────────── */}
        <section className="bg-white px-4 pb-14 md:px-6 md:pb-16">
          <div className="mx-auto w-full max-w-7xl">
            <div className="relative overflow-hidden rounded-3xl bg-[#02111E] px-7 py-10 md:px-12 md:py-12">
              <div
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(22,131,99,0.36),transparent_55%)]"
                aria-hidden="true"
              />
              <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8CE0C1]">
                    For service businesses
                  </p>
                  <h2 className="mt-3 font-['Sora'] text-2xl font-bold tracking-[-0.03em] text-white md:text-[32px]">
                    Your business deserves more than a listing.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-200">
                    Present your business, describe the services you offer and show where you work.
                    Approved providers get a shareable Property Listify business profile.
                  </p>
                  <p className="mt-3 text-xs leading-5 text-slate-300">
                    New profiles stay private until an authorized reviewer approves publication.
                  </p>
                </div>
                <Link
                  href="/advertise/services"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#02111E] transition hover:bg-[#EDF8F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Apply as a service provider
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
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
