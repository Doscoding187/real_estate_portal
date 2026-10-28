import { useEffect } from 'react';
import { Link, useRoute } from 'wouter';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Clock,
  Layers,
  MapPin,
  MessagesSquare,
  ShieldCheck,
} from 'lucide-react';
import {
  buildProviderProfilePath,
  buildProviderServicePath,
  buildServiceRequestPath,
  formatCategoryLabel,
  formatPriceRange,
  providerIdFromSlug,
  serviceJourneyContextFromSearch,
  toProviderServiceSlug,
  type ServiceCategory,
} from '@/features/services/catalog';
import { formatResponseLatency } from '@/features/services/leadMetrics';
import { servicesUi } from '@/features/services/design';
import {
  buildProviderServiceStructuredData,
  buildServiceBreadcrumbStructuredData,
} from '@/features/services/seoStructuredData';
import { ProviderRating } from '@/components/services/ProviderShowcaseCard';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { ServicesSiteFooter } from '@/components/services/ServicesSiteFooter';
import { trpc } from '@/lib/trpc';
import { applySeo } from '@/lib/seo';
import { useServicesLocation } from '@/features/services/useServicesLocation';

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}

export default function ProviderServiceDetailPage() {
  const [, params] = useRoute('/services/provider/:slug/service/:service');
  const { search, setLocation } = useServicesLocation();
  const slug = safeDecode(String(params?.slug || ''));
  const serviceSlug = safeDecode(String(params?.service || ''));
  const providerId = providerIdFromSlug(slug);
  const journeyContext = serviceJourneyContextFromSearch(search);
  const profileQuery = trpc.servicesEngine.getProviderPublicProfile.useQuery(
    { providerId: providerId || 0 },
    { enabled: Boolean(providerId) },
  );
  const profile = profileQuery.data;
  const service = profile?.services?.find(
    candidate => toProviderServiceSlug(candidate.displayName, candidate.code) === serviceSlug,
  );

  useEffect(() => {
    if (!profile || !service) return;
    applySeo({
      title: `${profile.companyName} · ${service.displayName} | Property Listify Services`,
      description:
        service.description ||
        profile.headline ||
        `${service.displayName} by ${profile.companyName}, published on Property Listify Services.`,
      canonicalPath: buildProviderServicePath(slug, serviceSlug),
      structuredData: [
        buildServiceBreadcrumbStructuredData([
          { label: 'Home', path: '/' },
          { label: 'Services', path: '/services' },
          { label: profile.companyName, path: buildProviderProfilePath(slug) },
          { label: service.displayName },
        ]),
        buildProviderServiceStructuredData({
          providerSlug: slug,
          companyName: profile.companyName,
          headline: profile.headline,
          bio: profile.bio,
          logoUrl: profile.logoUrl,
          locations: profile.locations,
          averageRating: profile.averageRating,
          reviewCount: profile.reviewCount,
          servicePath: buildProviderServicePath(slug, serviceSlug),
          service: {
            displayName: service.displayName,
            description: service.description,
            categoryLabel: formatCategoryLabel(service.category as ServiceCategory),
            minPrice: service.minPrice,
            maxPrice: service.maxPrice,
            currency: service.currency,
          },
        }),
      ],
    });
  }, [profile, service, slug, serviceSlug]);

  if (!providerId || !slug) {
    return (
      <>
        <EnhancedNavbar />
        <main className="min-h-screen bg-[#FDFDFD] px-4 py-8 md:px-6">
          <div className={`${servicesUi.surface} mx-auto max-w-4xl p-6 text-sm text-[#4B5C6B]`}>
            This service link is not valid.
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
            <div className="h-32 rounded-3xl bg-[#E9F0F4]" />
            <div className="h-48 rounded-3xl bg-[#E9F0F4]" />
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
              Service page unavailable
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#4B5C6B]">
              This provider is not currently published in the Services directory, so this service
              page is not available. Browse the directory to find an available professional.
            </p>
            <Link href="/services" className={`${servicesUi.action} mt-6 inline-flex`}>
              Browse services
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (!service) {
    return (
      <>
        <EnhancedNavbar />
        <main className="min-h-screen bg-[#FDFDFD] px-4 py-8 md:px-6">
          <div className={`${servicesUi.surface} mx-auto max-w-3xl p-8`}>
            <h1 className="font-['Sora'] text-2xl font-bold tracking-[-0.03em] text-[#0B1B2A]">
              Service not published
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#4B5C6B]">
              {profile.companyName} does not publish a service at this address. The provider profile
              lists every currently published service.
            </p>
            <Link
              href={buildProviderProfilePath(slug, search)}
              className={`${servicesUi.action} mt-6 inline-flex`}
            >
              View {profile.companyName}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </main>
      </>
    );
  }

  const category = service.category as ServiceCategory;
  const requestPath = buildServiceRequestPath(category, providerId, service.code, journeyContext);
  const priceLine =
    service.minPrice != null && service.maxPrice != null
      ? formatPriceRange(service.minPrice, service.maxPrice)
      : 'Price on request';

  // Only facts the platform actually holds may be presented as trust signals.
  const responsePerformance =
    profile.responsePerformance && profile.responsePerformance.sampleReady
      ? profile.responsePerformance
      : null;
  const hasRating = Number(profile.averageRating) > 0 && Number(profile.reviewCount) > 0;

  return (
    <>
      <EnhancedNavbar />
      <main className="bg-[#FDFDFD] text-[#0B1B2A]">
        <div className="bg-[#F7FAFB]">
          <div className="mx-auto w-full max-w-6xl px-4 py-4 md:px-6">
            <Link
              href={buildProviderProfilePath(slug, search)}
              className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#4B5C6B] transition hover:text-[#168363]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to {profile.companyName}
            </Link>
          </div>
        </div>

        <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-12">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E4F2EC] px-2.5 py-1 text-[11px] font-semibold text-[#116E54]">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Platform verified
            </span>
            <span className={servicesUi.neutralChip}>{formatCategoryLabel(category)}</span>
            {profile.acceptingRequests === true ? (
              <span className={servicesUi.greenChip}>Accepting requests</span>
            ) : profile.acceptingRequests === false ? (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                Waitlist
              </span>
            ) : null}
          </div>

          <h1 className="mt-4 font-['Sora'] text-2xl font-bold tracking-[-0.03em] text-[#0B1B2A] md:text-4xl">
            {service.displayName}
          </h1>
          <p className="mt-2 text-[13px] leading-6 text-[#4B5C6B]">
            Published by{' '}
            <Link
              href={buildProviderProfilePath(slug, search)}
              className="font-semibold text-[#168363] transition hover:text-[#116E54]"
            >
              {profile.companyName}
            </Link>
          </p>
          {hasRating && (
            <ProviderRating
              averageRating={profile.averageRating}
              reviewCount={profile.reviewCount}
              className="mt-2"
            />
          )}

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-8">
              <div className={`${servicesUi.surface} p-6 md:p-8`}>
                <h2 className="text-[15px] font-bold text-[#0B1B2A]">About this service</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#4B5C6B]">
                  {service.description || 'This provider has not published a description yet.'}
                </p>
                <p className="mt-4 text-[13px] font-semibold text-[#0B1B2A]">
                  Price range: <span className="text-[#168363]">{priceLine}</span>
                </p>
                <p className="mt-1 text-[12px] text-[#8A99A6]">
                  Prices are set by the provider, shown in {service.currency || 'ZAR'}, and exclude
                  any work they quote directly.
                </p>
              </div>

              <div>
                <h2 className="text-[15px] font-bold text-[#0B1B2A]">Where this provider works</h2>
                <p className="mt-2 text-[13px] leading-6 text-[#4B5C6B]">
                  Coverage is shown exactly as {profile.companyName} listed it, and matched exactly
                  when you search.
                </p>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {profile.locations.map(location => {
                    const primary = location.suburb || location.city || 'Unspecified';
                    const secondary = [location.city, location.province].filter(Boolean).join(', ');
                    return (
                      <li
                        key={`${location.id}-${location.city}-${location.suburb}`}
                        className={`${servicesUi.surface} p-4`}
                      >
                        <p className="flex items-center gap-2 text-[13px] font-semibold text-[#0B1B2A]">
                          <MapPin className="h-4 w-4 shrink-0 text-[#168363]" aria-hidden="true" />
                          {primary}
                        </p>
                        {secondary && (
                          <p className="mt-1 pl-6 text-[12px] text-[#4B5C6B]">{secondary}</p>
                        )}
                      </li>
                    );
                  })}
                  {profile.locations.length === 0 && (
                    <li className="text-sm text-[#4B5C6B]">No coverage areas listed yet.</li>
                  )}
                </ul>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className={`${servicesUi.surface} p-5`}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDF8F6]">
                    <BadgeCheck className="h-4.5 w-4.5 text-[#168363]" aria-hidden="true" />
                  </span>
                  <h3 className="mt-3 text-[14px] font-bold text-[#0B1B2A]">Platform verified</h3>
                  <p className="mt-1.5 text-[12px] leading-5 text-[#4B5C6B]">
                    Verification is recorded by Property Listify for this directory.
                  </p>
                </div>
                {responsePerformance && (
                  <div className={`${servicesUi.surface} p-5`}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDF8F6]">
                      <Clock className="h-4.5 w-4.5 text-[#168363]" aria-hidden="true" />
                    </span>
                    <h3 className="mt-3 text-[14px] font-bold text-[#0B1B2A]">
                      Typical first response:{' '}
                      {formatResponseLatency(responsePerformance.medianResponseSeconds)}
                    </h3>
                    <p className="mt-1.5 text-[12px] leading-5 text-[#4B5C6B]">
                      Median measured across {responsePerformance.measuredLeads} request
                      {responsePerformance.measuredLeads === 1 ? '' : 's'} in the last{' '}
                      {responsePerformance.windowDays} days.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <aside className="space-y-4">
              <div className={`${servicesUi.tintPanel} p-6`}>
                <ShieldCheck className="h-5 w-5 text-[#168363]" aria-hidden="true" />
                <h2 className="mt-3 text-[15px] font-bold text-[#0B1B2A]">
                  Request {service.displayName}
                </h2>
                <p className="mt-2 text-[13px] leading-6 text-[#4B5C6B]">
                  Your request goes straight to {profile.companyName}, and to nobody else. Property
                  Listify does not resell or share your contact details.
                </p>
                <Link href={requestPath} className={`${servicesUi.action} mt-5 w-full`}>
                  <MessagesSquare className="h-4 w-4" aria-hidden="true" />
                  Request this service
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              <div className={`${servicesUi.surface} p-5`}>
                <Layers className="h-4 w-4 text-[#168363]" aria-hidden="true" />
                <h3 className="mt-2 text-[13px] font-bold text-[#0B1B2A]">
                  All services by {profile.companyName}
                </h3>
                <ul className="mt-3 space-y-1.5">
                  {profile.services.map(other => (
                    <li key={other.code}>
                      <Link
                        href={buildProviderServicePath(
                          slug,
                          toProviderServiceSlug(other.displayName, other.code),
                          search,
                        )}
                        className={`block text-[13px] leading-6 transition ${
                          other.code === service.code
                            ? 'font-semibold text-[#168363]'
                            : 'text-[#4B5C6B] hover:text-[#0B1B2A]'
                        }`}
                      >
                        {other.displayName}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </section>

        <ServicesSiteFooter />
      </main>
    </>
  );
}
