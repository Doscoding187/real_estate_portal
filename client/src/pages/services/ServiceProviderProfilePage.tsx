import { useEffect, useState } from 'react';
import { Link, useRoute } from 'wouter';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Clock,
  Globe,
  Layers,
  MapPin,
  MessagesSquare,
  ShieldCheck,
} from 'lucide-react';
import {
  providerIdFromSlug,
  formatPriceRange,
  formatCategoryLabel,
  serviceCategoryFromSlug,
  serviceJourneyContextFromSearch,
  buildProviderServicePath,
  buildServiceRequestPath,
  toProviderServiceSlug,
  type ServiceCategory,
} from '@/features/services/catalog';
import { formatResponseLatency } from '@/features/services/leadMetrics';
import { servicesUi } from '@/features/services/design';
import {
  buildProviderBusinessStructuredData,
  buildServiceBreadcrumbStructuredData,
} from '@/features/services/seoStructuredData';
import {
  ProviderBrandPlate,
  ProviderRating,
  StarRating,
} from '@/components/services/ProviderShowcaseCard';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { ServicesSiteFooter } from '@/components/services/ServicesSiteFooter';
import { trpc } from '@/lib/trpc';
import { applySeo } from '@/lib/seo';
import { useServicesLocation } from '@/features/services/useServicesLocation';

type ProfileTab = 'overview' | 'services' | 'areas' | 'contact';

const TABS: Array<{ id: ProfileTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'services', label: 'Services' },
  { id: 'areas', label: 'Service areas' },
  { id: 'contact', label: 'Contact' },
];

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}

export default function ServiceProviderProfilePage() {
  const [, params] = useRoute('/services/provider/:slug');
  const { search, setLocation } = useServicesLocation();
  const slug = String(params?.slug || '');
  const providerId = providerIdFromSlug(safeDecode(slug));
  const journeyContext = serviceJourneyContextFromSearch(search);
  const requestedCategory = journeyContext.category
    ? serviceCategoryFromSlug(journeyContext.category)
    : null;
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const profileQuery = trpc.servicesEngine.getProviderPublicProfile.useQuery(
    { providerId: providerId || 0 },
    { enabled: Boolean(providerId) },
  );
  const profile = profileQuery.data;
  const [selectedServiceCode, setSelectedServiceCode] = useState<string | null>(
    journeyContext.serviceCode || null,
  );
  const defaultService =
    profile?.services?.find(service => service.code === selectedServiceCode) ||
    (journeyContext.serviceCode
      ? profile?.services?.find(service => service.code === journeyContext.serviceCode)
      : undefined) ||
    profile?.services?.[0];
  const defaultCategory = (defaultService?.category ||
    requestedCategory ||
    'home_improvement') as ServiceCategory;

  useEffect(() => {
    const providerName = profile?.companyName || 'Service provider';
    applySeo({
      title: `${providerName} | Property Listify Services`,
      description:
        profile?.headline ||
        profile?.bio ||
        'Review published services, listed coverage, and platform verification for this provider.',
      canonicalPath: `/services/provider/${encodeURIComponent(slug)}`,
      structuredData: profile
        ? [
            buildServiceBreadcrumbStructuredData([
              { label: 'Home', path: '/' },
              { label: 'Services', path: '/services' },
              { label: profile.companyName },
            ]),
            buildProviderBusinessStructuredData({
              slug,
              companyName: profile.companyName,
              headline: profile.headline,
              bio: profile.bio,
              logoUrl: profile.logoUrl,
              locations: profile.locations,
              averageRating: profile?.averageRating,
              reviewCount: profile?.reviewCount,
            }),
          ]
        : undefined,
    });
  }, [profile, slug]);

  if (!providerId) {
    return (
      <>
        <EnhancedNavbar />
        <main className="min-h-screen bg-[#FDFDFD] px-4 py-8 md:px-6">
          <div className={`${servicesUi.surface} mx-auto max-w-4xl p-6 text-sm text-[#4B5C6B]`}>
            This provider link is not valid.
          </div>
        </main>
      </>
    );
  }

  if (profileQuery.isLoading) {
    return (
      <>
        <EnhancedNavbar />
        <main className="min-h-screen bg-[#FDFDFD] px-4 py-8 md:px-6">
          <div className="mx-auto max-w-6xl animate-pulse space-y-4">
            <div className="h-56 rounded-3xl bg-[#E9F0F4]" />
            <div className="h-40 rounded-3xl bg-[#E9F0F4]" />
          </div>
        </main>
      </>
    );
  }

  if (profileQuery.error || !profile) {
    return (
      <>
        <EnhancedNavbar />
        <main className="min-h-screen bg-[#FDFDFD] px-4 py-8 md:px-6">
          <div className={`${servicesUi.surface} mx-auto max-w-3xl p-8`}>
            <h1 className="font-['Sora'] text-2xl font-bold tracking-[-0.03em] text-[#0B1B2A]">
              Provider profile unavailable
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#4B5C6B]">
              This provider is not currently published in the Services directory. Browse the
              directory to find an available professional.
            </p>
            <button
              type="button"
              onClick={() => setLocation('/services')}
              className={`${servicesUi.action} mt-6`}
            >
              Browse services
            </button>
          </div>
        </main>
      </>
    );
  }

  const requestPath = buildServiceRequestPath(
    defaultCategory,
    providerId,
    defaultService?.code || journeyContext.serviceCode || '',
    journeyContext,
  );
  const primaryLocation = profile.locations[0];
  const locationLine = primaryLocation
    ? [primaryLocation.suburb, primaryLocation.city, primaryLocation.province]
        .filter(Boolean)
        .join(', ')
    : 'Coverage on request';

  // Only facts the platform actually holds may be presented as trust signals.
  const responsePerformance =
    profile.responsePerformance && profile.responsePerformance.sampleReady
      ? profile.responsePerformance
      : null;
  const trustFacts = [
    {
      title: 'Platform verified',
      description: 'Verification is recorded by Property Listify for this directory.',
      icon: BadgeCheck,
    },
    {
      title: `${profile.services.length} published service${profile.services.length === 1 ? '' : 's'}`,
      description: 'Each service is set by the provider and reviewed before publication.',
      icon: Layers,
    },
    {
      title: `${profile.locations.length} listed area${profile.locations.length === 1 ? '' : 's'}`,
      description: 'Coverage is listed exactly as the provider supplied it.',
      icon: MapPin,
    },
    ...(responsePerformance
      ? [
          {
            title: `Typical first response: ${formatResponseLatency(
              responsePerformance.medianResponseSeconds,
            )}`,
            description: `Median measured across ${
              responsePerformance.measuredLeads
            } request${responsePerformance.measuredLeads === 1 ? '' : 's'} in the last ${
              responsePerformance.windowDays
            } days.`,
            icon: Clock,
          },
        ]
      : []),
    {
      title: 'Direct request',
      description: 'Your request goes straight to the provider you choose.',
      icon: MessagesSquare,
    },
  ];

  return (
    <>
      <EnhancedNavbar />
      <main className="bg-[#FDFDFD] text-[#0B1B2A]">
        {/* Hero band */}
        <div className="bg-[#F7FAFB]">
          <div className="mx-auto w-full max-w-6xl px-4 py-4 md:px-6">
            <Link
              href="/services"
              className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#4B5C6B] transition hover:text-[#168363]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to results
            </Link>
          </div>
        </div>

        <div className="relative bg-[#02111E]">
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden opacity-60"
            style={{
              backgroundImage:
                'radial-gradient(800px 360px at 15% 0%, rgba(22,131,99,0.28) 0%, transparent 62%)',
            }}
            aria-hidden="true"
          />
          <ProviderBrandPlate
            companyName={profile.companyName}
            logoUrl={profile.logoUrl}
            className="relative h-40 w-full md:h-56"
          />
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
          {/* Identity */}
          <section className="relative z-10 -mt-10 md:-mt-16">
            <div className={`${servicesUi.surface} p-6 md:p-8`}>
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E4F2EC] px-2.5 py-1 text-[11px] font-semibold text-[#116E54]">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      Platform verified
                    </span>
                    <span className={servicesUi.neutralChip}>
                      {formatCategoryLabel(defaultCategory)}
                    </span>
                    {profile.acceptingRequests === true ? (
                      <span className={servicesUi.greenChip}>Accepting requests</span>
                    ) : profile.acceptingRequests === false ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                        Waitlist
                      </span>
                    ) : null}
                  </div>

                  <h1 className="mt-3 font-['Sora'] text-2xl font-bold tracking-[-0.03em] text-[#0B1B2A] md:text-4xl">
                    {profile.companyName}
                  </h1>
                  <ProviderRating
                    averageRating={profile.averageRating}
                    reviewCount={profile.reviewCount}
                    className="mt-2"
                  />
                  {profile.headline && (
                    <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#4B5C6B]">
                      {profile.headline}
                    </p>
                  )}
                  <p className="mt-3 flex items-center gap-1.5 text-[13px] text-[#4B5C6B]">
                    <MapPin className="h-4 w-4 shrink-0 text-[#168363]" aria-hidden="true" />
                    {locationLine}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {profile.websiteUrl && (
                    <a
                      href={profile.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={servicesUi.actionNeutral}
                    >
                      <Globe className="h-4 w-4" aria-hidden="true" />
                      Visit provider website
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setLocation(requestPath)}
                    className={servicesUi.action}
                  >
                    Request service
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Tabs */}
          <section className="mt-8">
            <div
              role="tablist"
              aria-label="Provider profile sections"
              className="flex gap-1 overflow-x-auto border-b border-[#E3EBF0] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? 'border-[#168363] text-[#168363]'
                      : 'border-transparent text-[#6B7C8A] hover:text-[#0B1B2A]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="py-8">
              {/* Overview */}
              <div hidden={activeTab !== 'overview'}>
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-8">
                    {profile.gallery.length > 0 && (
                      <div>
                        <h2 className="text-lg font-bold text-[#0B1B2A]">Work gallery</h2>
                        <p className="mt-2 text-[12px] text-[#8A99A6]">
                          Photos supplied by the provider.
                        </p>
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {profile.gallery.map((image, index) => (
                            <img
                              key={`provider-gallery-${index}`}
                              src={image}
                              alt={`${profile.companyName} work example ${index + 1}`}
                              className="aspect-[4/3] w-full rounded-xl border border-[#E3EBF0] object-cover"
                              loading="lazy"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h2 className="text-lg font-bold text-[#0B1B2A]">About</h2>
                      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#4B5C6B]">
                        {profile.bio || 'This provider has not published a biography yet.'}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {trustFacts.map(fact => {
                        const Icon = fact.icon;
                        return (
                          <div key={fact.title} className={`${servicesUi.surface} p-5`}>
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDF8F6]">
                              <Icon className="h-4.5 w-4.5 text-[#168363]" aria-hidden="true" />
                            </span>
                            <h3 className="mt-3 text-[14px] font-bold text-[#0B1B2A]">
                              {fact.title}
                            </h3>
                            <p className="mt-1.5 text-[12px] leading-5 text-[#4B5C6B]">
                              {fact.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {profile.reviews.length > 0 && (
                      <div>
                        <h2 className="text-lg font-bold text-[#0B1B2A]">Published feedback</h2>
                        <p className="mt-2 text-[13px] leading-6 text-[#4B5C6B]">
                          Feedback published on this profile. Treat it as one input, not a guarantee
                          of availability or outcome.
                        </p>
                        <ul className="mt-4 space-y-3">
                          {profile.reviews.slice(0, 5).map(review => (
                            <li key={review.id} className={`${servicesUi.surface} p-4`}>
                              <StarRating rating={review.rating} className="mb-2" />
                              {review.title && (
                                <p className="text-[14px] font-semibold text-[#0B1B2A]">
                                  {review.title}
                                </p>
                              )}
                              <p className="mt-1 text-[13px] leading-6 text-[#4B5C6B]">
                                {review.content || 'No written review provided.'}
                              </p>
                            </li>
                          ))}
                        </ul>
                        <Link
                          href={`/services/reviews/${providerId}${search || ''}`}
                          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#168363]"
                        >
                          Read all published feedback
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </div>
                    )}
                  </div>

                  <aside className="space-y-4">
                    <div className={`${servicesUi.tintPanel} p-6`}>
                      <h2 className="text-[15px] font-bold text-[#0B1B2A]">Before you contact</h2>
                      <ul className="mt-3 space-y-2.5 text-[13px] leading-6 text-[#4B5C6B]">
                        <li>Check that the service and listed coverage fit your property need.</li>
                        <li>Published feedback is one input, not a guarantee of outcome.</li>
                        <li>Your request goes to this provider, and to nobody else.</li>
                      </ul>
                      <button
                        type="button"
                        onClick={() => setLocation(requestPath)}
                        className={`${servicesUi.action} mt-5 w-full`}
                      >
                        Request this provider
                      </button>
                    </div>

                    {profile.services.length > 1 && (
                      <div className={`${servicesUi.surface} p-6`}>
                        <label className="block text-[13px] font-semibold text-[#0B1B2A]">
                          Service to request
                          <select
                            aria-label="Service to request"
                            value={defaultService?.code || ''}
                            onChange={event => setSelectedServiceCode(event.target.value)}
                            className="mt-2 h-11 w-full rounded-xl border border-[#E3EBF0] bg-white px-3 text-sm outline-none transition focus:border-[#168363]"
                          >
                            {profile.services.map(service => (
                              <option key={service.code} value={service.code}>
                                {service.displayName}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}
                  </aside>
                </div>
              </div>

              {/* Services */}
              <div hidden={activeTab !== 'services'}>
                <h2 className="text-lg font-bold text-[#0B1B2A]">Services</h2>
                <p className="mt-2 text-[13px] leading-6 text-[#4B5C6B]">
                  Published by this provider. Prices are in ZAR and exclude any work the provider
                  quotes directly.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {profile.services.map(service => (
                    <Link
                      key={service.code}
                      href={buildProviderServicePath(
                        slug,
                        toProviderServiceSlug(service.displayName, service.code),
                        search,
                      )}
                      className={`${servicesUi.surface} block p-5 transition hover:border-[#168363]`}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#168363]">
                        {formatCategoryLabel(service.category as ServiceCategory)}
                      </p>
                      <h3 className="mt-2 text-[15px] font-bold text-[#0B1B2A]">
                        {service.displayName}
                      </h3>
                      {service.description && (
                        <p className="mt-2 text-[13px] leading-6 text-[#4B5C6B]">
                          {service.description}
                        </p>
                      )}
                      <p className="mt-3 text-[13px] font-semibold text-[#0B1B2A]">
                        {service.minPrice != null && service.maxPrice != null
                          ? formatPriceRange(service.minPrice, service.maxPrice)
                          : 'Price on request'}
                      </p>
                      <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#168363]">
                        View service page
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </p>
                    </Link>
                  ))}
                </div>
                {profile.services.length === 0 && (
                  <p className="mt-6 text-sm text-[#4B5C6B]">No services listed yet.</p>
                )}
              </div>

              {/* Service areas */}
              <div hidden={activeTab !== 'areas'}>
                <h2 className="text-lg font-bold text-[#0B1B2A]">Listed coverage</h2>
                <p className="mt-2 text-[13px] leading-6 text-[#4B5C6B]">
                  Coverage is shown exactly as the provider listed it, and matched exactly when you
                  search.
                </p>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {profile.locations.map(location => {
                    const primary = location.suburb || location.city || 'Unspecified';
                    const secondary = [location.city, location.province].filter(Boolean).join(', ');
                    return (
                      <li
                        key={`${location.id}-${location.city}-${location.suburb}`}
                        className={`${servicesUi.surface} p-5`}
                      >
                        <p className="flex items-center gap-2 text-[14px] font-semibold text-[#0B1B2A]">
                          <MapPin className="h-4 w-4 shrink-0 text-[#168363]" aria-hidden="true" />
                          {primary}
                        </p>
                        {secondary && (
                          <p className="mt-1.5 pl-6 text-[12px] text-[#4B5C6B]">{secondary}</p>
                        )}
                        <p className="mt-1.5 pl-6 text-[12px] text-[#8A99A6]">
                          Coverage label supplied by the provider
                        </p>
                      </li>
                    );
                  })}
                </ul>
                {profile.locations.length === 0 && (
                  <p className="mt-6 text-sm text-[#4B5C6B]">No coverage areas listed yet.</p>
                )}
              </div>

              {/* Contact */}
              <div hidden={activeTab !== 'contact'}>
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div>
                    <h2 className="text-lg font-bold text-[#0B1B2A]">Contact details</h2>
                    <p className="mt-2 text-[13px] leading-6 text-[#4B5C6B]">
                      Direct contact details are held by the provider and are not published on this
                      platform. Send a request and the provider will contact you directly.
                    </p>

                    <div className="mt-6 space-y-3">
                      {profile.websiteUrl && (
                        <a
                          href={profile.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={`${servicesUi.surface} flex items-center gap-3 p-4 transition hover:border-[#168363]`}
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDF8F6]">
                            <Globe className="h-4.5 w-4.5 text-[#168363]" aria-hidden="true" />
                          </span>
                          <span>
                            <span className="block text-[13px] font-semibold text-[#0B1B2A]">
                              Provider website
                            </span>
                            <span className="block text-[12px] text-[#4B5C6B]">
                              {profile.websiteUrl}
                            </span>
                          </span>
                        </a>
                      )}

                      <div className={`${servicesUi.surface} flex items-center gap-3 p-4`}>
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDF8F6]">
                          <CalendarCheck
                            className="h-4.5 w-4.5 text-[#168363]"
                            aria-hidden="true"
                          />
                        </span>
                        <span>
                          <span className="block text-[13px] font-semibold text-[#0B1B2A]">
                            Listed coverage
                          </span>
                          <span className="block text-[12px] text-[#4B5C6B]">
                            {profile.locations.length} listed area
                            {profile.locations.length === 1 ? '' : 's'}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <aside>
                    <div className={`${servicesUi.tintPanel} p-6`}>
                      <ShieldCheck className="h-5 w-5 text-[#168363]" aria-hidden="true" />
                      <h2 className="mt-3 text-[15px] font-bold text-[#0B1B2A]">
                        One request, one provider
                      </h2>
                      <p className="mt-2 text-[13px] leading-6 text-[#4B5C6B]">
                        Your request is routed to this provider only. Property Listify does not
                        resell or share your contact details.
                      </p>
                      <button
                        type="button"
                        onClick={() => setLocation(requestPath)}
                        className={`${servicesUi.action} mt-5 w-full`}
                      >
                        Request service
                      </button>
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          </section>
        </div>

        <ServicesSiteFooter />
      </main>
    </>
  );
}
