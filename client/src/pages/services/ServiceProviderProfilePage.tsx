import { useEffect, useState } from 'react';
import { Link, useRoute } from 'wouter';
import {
  ArrowRight,
  CalendarCheck,
  Globe,
  House,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import {
  providerIdFromSlug,
  formatCategoryLabel,
  serviceCategoryFromSlug,
  serviceJourneyContextFromSearch,
  buildProviderServicePath,
  buildServiceRequestPath,
  toProviderServiceSlug,
  type ServiceCategory,
} from '@/features/services/catalog';
import { servicesUi } from '@/features/services/design';
import {
  buildProviderBusinessStructuredData,
  buildServiceBreadcrumbStructuredData,
} from '@/features/services/seoStructuredData';
import { StarRating } from '@/components/services/ProviderShowcaseCard';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { ServicesSiteFooter } from '@/components/services/ServicesSiteFooter';
import { trpc, type RouterOutputs } from '@/lib/trpc';
import { applySeo } from '@/lib/seo';
import { useServicesLocation } from '@/features/services/useServicesLocation';

type ProfileTab = 'overview' | 'projects' | 'services' | 'areas' | 'contact';
export type ProviderWebsitePublicProfile = NonNullable<
  RouterOutputs['servicesEngine']['getProviderPublicProfile']
>;

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}

export default function ServiceProviderProfilePage({
  previewProfile,
}: {
  previewProfile?: ProviderWebsitePublicProfile;
} = {}) {
  const isPreview = Boolean(previewProfile);
  const [, params] = useRoute('/services/provider/:slug');
  const { search, setLocation } = useServicesLocation();
  const slug = String(params?.slug || '');
  const providerId = previewProfile?.providerId || providerIdFromSlug(safeDecode(slug));
  const journeyContext = serviceJourneyContextFromSearch(search);
  const requestedCategory = journeyContext.category
    ? serviceCategoryFromSlug(journeyContext.category)
    : null;
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [activeWebsiteNavigation, setActiveWebsiteNavigation] = useState('Home');
  const profileQuery = trpc.servicesEngine.getProviderPublicProfile.useQuery(
    { providerId: providerId || 0 },
    { enabled: !isPreview && Boolean(providerId) },
  );
  const profile = previewProfile || profileQuery.data;
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
  const hasServiceCategory = Boolean(defaultService || requestedCategory || !isPreview);
  const websiteTemplate = profile?.websiteTemplate || 'corporate_brand';
  const featuredProject = profile?.projects?.[0];
  const categoryHeroImages: Record<ServiceCategory, string> = {
    home_improvement: '/images/services/category-home-improvement.jpg',
    finance_legal: '/images/services/category-finance-legal.jpg',
    moving: '/images/services/category-moving.jpg',
    inspection_compliance: '/images/services/category-inspection.jpg',
    insurance: '/images/services/category-insurance.jpg',
    media_marketing: '/images/services/category-media.jpg',
  };
  const heroImage = featuredProject?.coverImageUrl || profile?.gallery?.[0] || categoryHeroImages[defaultCategory];
  const heroImageIsIllustrative = !featuredProject?.coverImageUrl && !profile?.gallery?.[0];
  const heroHeadline = profile?.headline?.trim() || 'Professional maintenance\nservices for your property';

  useEffect(() => {
    if (isPreview) return;
    const providerName = profile?.companyName || 'Service provider';
    applySeo({
      title: `${providerName} | Property Listify Services`,
      description:
        profile?.bio ||
        profile?.description ||
        profile?.headline ||
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
              bio: profile.bio || profile.description,
              logoUrl: profile.logoUrl,
              locations: profile.locations,
              averageRating: profile?.averageRating,
              reviewCount: profile?.reviewCount,
            }),
          ]
        : undefined,
    });
  }, [isPreview, profile, slug]);

  function navigate(path: string) {
    if (!isPreview) setLocation(path);
  }

  if (!isPreview && !providerId) {
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

  if (!isPreview && profileQuery.isLoading) {
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

  if (!isPreview && (profileQuery.error || !profile)) {
    return (
      <>
        <EnhancedNavbar />
        <main className="min-h-screen bg-[#FDFDFD] px-4 py-8 md:px-6">
          <div className={`${servicesUi.surface} mx-auto max-w-3xl p-8`}>
            <h1 className="font-sans text-2xl font-bold tracking-[-0.03em] text-[#0B1B2A]">
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

  if (!profile) return null;

  const requestPath = buildServiceRequestPath(
    defaultCategory,
    profile.providerId,
    defaultService?.code || journeyContext.serviceCode || '',
    journeyContext,
  );
  const showProjectsInWebsite = isPreview || (profile.projects?.length || 0) > 0;
  const websiteNavigation: Array<{ label: string; tab: ProfileTab }> = [
    { label: 'Home', tab: 'overview' },
    { label: 'About', tab: 'overview' },
    { label: 'Services', tab: 'services' },
    ...(showProjectsInWebsite ? [{ label: 'Projects', tab: 'projects' as const }] : []),
    { label: 'Contact', tab: 'contact' },
  ];

  return (
    <>
      <main
        className="bg-white text-[#0B1B2A]"
        data-website-template={websiteTemplate}
        data-preview={isPreview ? 'private' : undefined}
        onClickCapture={event => {
          if (isPreview && (event.target as HTMLElement).closest('a')) {
            event.preventDefault();
          }
        }}
      >
        <header className="relative z-10 border-b border-[#e9eef4] bg-white">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-5 py-3 sm:px-7 md:h-[68px] md:flex-row md:items-center md:justify-between md:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#e8f1ff] text-[#0868da]">
                {profile.logoUrl
                  ? <img src={profile.logoUrl} alt={`${profile.companyName} logo`} className="h-full w-full object-contain" />
                  : <House className="h-6 w-6" aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold tracking-[-0.02em] text-[#071b4a] sm:text-base">{profile.companyName}</p>
                <p className="truncate text-[11px] font-medium text-[#78869d]">{hasServiceCategory ? formatCategoryLabel(defaultCategory) : 'Service provider'}</p>
              </div>
            </div>

            <nav aria-label="Business website navigation" className="flex w-full items-center gap-4 overflow-x-auto text-[11px] font-medium text-[#42516d] md:w-auto md:max-w-full md:gap-6 md:text-sm">
              {websiteNavigation.map((item, index) => (
                <button
                  key={`${item.label}-${index}`}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.tab);
                    setActiveWebsiteNavigation(item.label);
                    const targetId = item.label === 'About' ? 'provider-about' : 'provider-website-content';
                    window.setTimeout(() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
                  }}
                  aria-current={activeWebsiteNavigation === item.label ? 'page' : undefined}
                  className={`relative shrink-0 whitespace-nowrap py-2 transition hover:text-[#0868da] ${activeWebsiteNavigation === item.label ? 'font-semibold text-[#0868da] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[#0868da]' : ''}`}
                >
                  {item.label}
                </button>
              ))}
              <button type="button" onClick={() => navigate(requestPath)} className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-[#0755ba] px-3 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#06489e] md:ml-1 md:px-5 md:py-2.5 md:text-sm">
                Get a Quote
              </button>
            </nav>
          </div>
        </header>

        <section className="relative isolate flex min-h-[280px] items-center overflow-hidden bg-[#071b35] sm:min-h-[310px] lg:min-h-[365px]">
          <img src={heroImage} alt="" aria-hidden="true" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#061a32]/95 via-[#071b35]/75 to-[#071b35]/10" aria-hidden="true" />
          <div className="mx-auto w-full max-w-[1280px] px-5 py-9 sm:px-7 sm:py-12 lg:px-10 lg:py-14">
            <div className="max-w-[640px] text-white">
              <h1 className="mt-0 max-w-[620px] whitespace-pre-line text-[25px] font-bold leading-[1.1] tracking-[-0.035em] sm:text-[32px] lg:text-[36px]">
                {heroHeadline}
              </h1>
              <p className="mt-3 max-w-[560px] text-sm font-medium leading-6 text-white/90 sm:text-base sm:leading-7">
                Reliable. Experienced. Local.
              </p>
              <button type="button" onClick={() => navigate(requestPath)} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0868da] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#075bc4]">
                Get a Quote <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {heroImageIsIllustrative && (
              <span className="absolute bottom-3 right-4 rounded bg-black/35 px-2 py-1 text-[9px] font-medium text-white/90 backdrop-blur-sm sm:right-6 lg:right-10">Illustrative image</span>
            )}
          </div>
        </section>

        <div id="provider-website-content" className="mx-auto w-full max-w-6xl scroll-mt-6 px-4 md:px-6">
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

                    <div id="provider-about" className="scroll-mt-6">
                      <h2 className="text-lg font-bold text-[#0B1B2A]">About</h2>
                    </div>

                    {Object.values(profile.socialLinks || {}).some(Boolean) && (
                      <section aria-labelledby="provider-social-heading">
                        <h2 id="provider-social-heading" className="text-lg font-bold text-[#0B1B2A]">Find this business online</h2>
                        <ul className="mt-3 flex flex-wrap gap-3">
                          {Object.entries(profile.socialLinks || {}).map(([network, url]) => url ? (
                            <li key={network}><a href={url} target="_blank" rel="noopener noreferrer" className={`${servicesUi.actionNeutral} capitalize`}>{network}</a></li>
                          ) : null)}
                        </ul>
                      </section>
                    )}

                    {profile.credentials?.length > 0 && (
                      <section aria-labelledby="provider-credentials-heading">
                        <h2 id="provider-credentials-heading" className="text-lg font-bold text-[#0B1B2A]">Verified credentials</h2>
                        <p className="mt-2 text-[12px] leading-5 text-[#6B7C8A]">These credentials were reviewed by Property Listify.</p>
                        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                          {profile.credentials.map(credential => (
                            <li key={credential.id} className={`${servicesUi.surface} flex items-start gap-3 p-4`}>
                              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#168363]" aria-hidden="true" />
                              <span><span className="block text-sm font-semibold text-[#0B1B2A]">{credential.title}</span>{credential.issuingBody && <span className="mt-1 block text-xs text-[#6B7C8A]">{credential.issuingBody}</span>}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

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
                        onClick={() => navigate(requestPath)}
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

              {/* Approved portfolio projects are separate from draft website content. */}
              <div hidden={activeTab !== 'projects'}>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#168363]">{websiteTemplate === 'project_showcase' ? 'Project Showcase' : 'Selected work'}</p>
                    <h2 className="mt-1 text-xl font-bold text-[#0B1B2A]">Projects from {profile.companyName}</h2>
                  </div>
                  <button type="button" onClick={() => navigate(requestPath)} className={servicesUi.action}>
                    Discuss a project <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  {(profile.projects || []).map(project => (
                    <article key={project.id} className={`${servicesUi.surface} overflow-hidden`}>
                      {project.coverImageUrl && <img src={project.coverImageUrl} alt={`${project.title} completed by ${profile.companyName}`} className="aspect-[16/9] w-full object-cover" loading="lazy" />}
                      <div className="p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#168363]">{formatCategoryLabel(project.category)}</p>
                        <h3 className="mt-2 text-base font-bold text-[#0B1B2A]">{project.title}</h3>
                        {project.locationLabel && <p className="mt-1 flex items-center gap-1 text-xs text-[#6B7C8A]"><MapPin className="h-3.5 w-3.5" />{project.locationLabel}</p>}
                        {project.description && <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#4B5C6B]">{project.description}</p>}
                        {project.gallery.length > 0 && <div className="mt-4 grid grid-cols-3 gap-2">{project.gallery.slice(0, 3).map((image, index) => <img key={`${project.id}-${index}`} src={image} alt={`${project.title} work photo ${index + 1}`} className="aspect-square w-full rounded-lg object-cover" loading="lazy" />)}</div>}
                      </div>
                    </article>
                  ))}
                </div>
                {isPreview && (profile.projects || []).length === 0 && (
                  <p className="mt-6 text-sm text-[#4B5C6B]">Project examples can be added to your website when you are ready.</p>
                )}
              </div>

              {/* Services */}
              <div hidden={activeTab !== 'services'}>
                <h2 className="text-lg font-bold text-[#0B1B2A]">Services</h2>
                <p className="mt-2 text-[13px] leading-6 text-[#4B5C6B]">
                  Choose a service to view its details, price information and service coverage.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {profile.services.map(service => (
                    <Link
                      key={service.code}
                      href={buildProviderServicePath(
                        slug,
                        toProviderServiceSlug(service.displayName, service.code),
                        search,
                      )}
                      className="inline-flex items-center gap-2 rounded-full border border-[#cddfee] bg-[#f8fbff] px-4 py-2.5 text-sm font-semibold text-[#0B1B2A] shadow-sm transition hover:border-[#168363] hover:bg-[#edf8f6] hover:text-[#116E54] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168363]"
                    >
                      {service.displayName}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
                {profile.services.length === 0 && (
                  <p className="mt-6 text-sm text-[#4B5C6B]">Services you add will appear here.</p>
                )}
              </div>

              {/* Service areas */}
              <div hidden={activeTab !== 'areas'}>
                <h2 className="text-lg font-bold text-[#0B1B2A]">{isPreview ? 'Service areas' : 'Listed coverage'}</h2>
                <p className="mt-2 text-[13px] leading-6 text-[#4B5C6B]">
                  {isPreview
                    ? 'The areas you select will be shown to customers after review and approval.'
                    : 'Coverage is shown exactly as the provider listed it, and matched exactly when you search.'}
                </p>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {profile.locations.map(location => {
                    return (
                      <li
                        key={`${location.id}-${location.canonicalPlaceId}`}
                        className={`${servicesUi.surface} p-5`}
                      >
                        <p className="flex items-center gap-2 text-[14px] font-semibold text-[#0B1B2A]">
                          <MapPin className="h-4 w-4 shrink-0 text-[#168363]" aria-hidden="true" />
                          {location.label || 'Selected Place unavailable'}
                        </p>
                        <p className="mt-1.5 pl-6 text-[12px] text-[#8A99A6]">
                          Exact Place coverage
                        </p>
                      </li>
                    );
                  })}
                </ul>
                {profile.locations.length === 0 && (
                    <p className="mt-6 text-sm text-[#4B5C6B]">
                      {isPreview ? 'Selected service areas will appear here.' : 'No coverage areas listed yet.'}
                    </p>
                )}
              </div>

              {/* Contact */}
              <div hidden={activeTab !== 'contact'}>
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div>
                    <h2 className="text-lg font-bold text-[#0B1B2A]">Contact details</h2>
                    <p className="mt-2 text-[13px] leading-6 text-[#4B5C6B]">
                      {isPreview
                        ? 'After approval, customers can use this page to send a private enquiry. Direct contact details are not published.'
                        : 'Direct contact details are held by the provider and are not published on this platform. Send a request and the provider will contact you directly.'}
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
                        onClick={() => navigate(requestPath)}
                        className={`${servicesUi.action} mt-5 w-full`}
                      >
                        Request service
                      </button>
                    </div>
                  </aside>
                </div>
              </div>
            </div>
        </div>

        {!isPreview && <ServicesSiteFooter />}
      </main>
    </>
  );
}
