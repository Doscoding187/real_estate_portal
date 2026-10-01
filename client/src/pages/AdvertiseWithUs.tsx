import { lazy, Suspense } from 'react';
import { BriefcaseBusiness, Building2, UsersRound } from 'lucide-react';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { Footer } from '@/components/Footer';
import { CommercialActivationNotice } from '@/components/commercial/CommercialActivationNotice';
import { SEOHead } from '@/components/advertise/SEOHead';
import { StructuredData } from '@/components/advertise/StructuredData';
import { VisualPathCard } from '@/components/advertise/VisualPathCard';
import { useAdvertiseAnalytics } from '@/hooks/useAdvertiseAnalytics';
import { useCommercialCatalog } from '@/hooks/useCommercialCatalog';
import { SectionErrorBoundary } from '@/components/advertise/AdvertiseErrorBoundary';
import { FAQSectionSkeleton, SectionLoader } from '@/components/advertise/SkeletonLoaders';
import { DashboardShowcaseSection } from '@/components/advertise/DashboardShowcaseSection';

const FinalCTASection = lazy(() => import('@/components/advertise/FinalCTASection'));

const FAQSection = lazy(() => import('@/components/advertise/FAQSection'));

const ValuePropositionSection = lazy(() =>
  import('@/components/advertise/ValuePropositionSection').then(module => ({
    default: module.ValuePropositionSection,
  })),
);

const HowItWorksSection = lazy(() =>
  import('@/components/advertise/HowItWorksSection').then(module => ({
    default: module.HowItWorksSection,
  })),
);

const PricingPreviewSection = lazy(() =>
  import('@/components/advertise/PricingPreviewSection').then(module => ({
    default: module.PricingPreviewSection,
  })),
);

const ExtendedNetworkSection = lazy(() =>
  import('@/components/advertise/ExtendedNetworkSection').then(module => ({
    default: module.ExtendedNetworkSection,
  })),
);

const SegmentationLayer = lazy(() =>
  import('@/components/advertise/SegmentationLayer').then(module => ({
    default: module.SegmentationLayer,
  })),
);

const EcosystemSection = lazy(() =>
  import('@/components/advertise/EcosystemSection').then(module => ({
    default: module.EcosystemSection,
  })),
);

import { TrustStripSection } from '@/components/advertise/TrustStripSection';
import { LiveDemandSection } from '@/components/advertise/LiveDemandSection';
import { HeroSection } from '@/components/advertise/HeroSection';
import { toAbsoluteUrl } from '@/lib/seo/structuredData';
import { RoleWorkspaceHeroPreview } from './advertise/RoleWorkspaceHeroPreview';
import { COMMERCIAL_ACTIVATION_STATE } from '@shared/commercialActivation';

const PREPARATION_PATHS = [
  {
    title: 'For Agents',
    description:
      'Establish your professional presence, complete the available onboarding work, and prepare private listing drafts.',
    icon: BriefcaseBusiness,
    href: '/advertise/sell/agents',
    ctaText: 'Start Agent preparation',
    benefits: [
      'Account and profile preparation',
      'Canonical coverage setup',
      'Private listing drafts',
    ],
  },
  {
    title: 'For Agencies',
    description:
      'Create an owner account, establish your Agency identity, and prepare private inventory before activation.',
    icon: UsersRound,
    href: '/advertise/sell/agencies',
    ctaText: 'Start Agency preparation',
    benefits: [
      'Agency owner account',
      'Identity and branding preparation',
      'Private inventory workspace',
    ],
  },
  {
    title: 'For Developers',
    description:
      'Establish your Developer organisation for review and prepare private development drafts.',
    icon: Building2,
    href: '/advertise/sell/developers',
    ctaText: 'Start Developer preparation',
    benefits: [
      'Developer organisation setup',
      'Organisation review state',
      'Private development drafts',
    ],
  },
];

export function CommercialAdvertiseWithUs() {
  const { data: commercialCatalog } = useCommercialCatalog();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SEOHead
        title="Launch Access | Property Listify"
        description="Bring property or development inventory onto Property Listify, make it discoverable, capture enquiries and follow up in the right business workspace."
        canonicalUrl={toAbsoluteUrl('/advertise')}
      />
      <StructuredData pageUrl={toAbsoluteUrl('/advertise')} organizationName="Property Listify" />

      <EnhancedNavbar />

      <main id="main-content" className="flex-1 advertise-page bg-white">
        <SectionErrorBoundary sectionName="Hero Section">
          <section id="hero-section" aria-labelledby="hero-headline">
            <HeroSection
              eyebrow="90-Day Launch Access"
              headline={
                <>
                  Reach property seekers.
                  <br />
                  Capture enquiries.
                  <br />
                  Run your <span className="text-blue-300">property pipeline.</span>
                </>
              }
              subheadline="Publish and manage inventory, participate in Property Listify discovery, capture property interest and follow up in the right business workspace."
              primaryCTA={{
                label: 'Choose your business path',
                href: '#audience-gateways',
                variant: 'primary',
              }}
              secondaryCTA={{
                label: 'See the dashboard',
                href: '#dashboard-showcase',
                variant: 'secondary',
              }}
              stats={[
                { value: '90', suffix: ' days', label: 'launch access' },
                { value: 'Once-off', label: 'pricing' },
                { value: 'No auto', label: 'renewal' },
              ]}
              visual={<RoleWorkspaceHeroPreview />}
              visualCaption="Select a role to preview its workspace. Illustrative product views — not live market activity."
            />
          </section>
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="Audience Gateways">
          <Suspense
            fallback={<SectionLoader minHeight="500px" message="Loading business paths..." />}
          >
            <SegmentationLayer />
          </Suspense>
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="Trust Strip">
          <section id="trust-strip" aria-label="Launch Access reassurance">
            <TrustStripSection
              badges={['Manual EFT payment', 'Finance-verified activation', 'No automatic renewal']}
            />
          </section>
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="Dashboard Showcase">
          <DashboardShowcaseSection />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="Enquiry Journey">
          <section id="live-demand" aria-labelledby="live-demand-heading">
            <LiveDemandSection />
          </section>
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="Platform Journey">
          <Suspense
            fallback={<SectionLoader minHeight="300px" message="Loading platform journey..." />}
          >
            <section id="ecosystem" aria-labelledby="ecosystem-heading">
              <EcosystemSection />
            </section>
          </Suspense>
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="Value Proposition">
          <Suspense
            fallback={<SectionLoader minHeight="300px" message="Loading value proposition..." />}
          >
            <section id="value-proposition" aria-labelledby="value-proposition-heading">
              <ValuePropositionSection />
            </section>
          </Suspense>
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="How It Works">
          <Suspense
            fallback={<SectionLoader minHeight="300px" message="Loading the property journey..." />}
          >
            <section id="how-it-works" aria-labelledby="how-it-works-heading">
              <HowItWorksSection />
            </section>
          </Suspense>
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="Discovery Reach">
          <Suspense
            fallback={<SectionLoader minHeight="300px" message="Loading discovery surfaces..." />}
          >
            <section id="extended-network" aria-labelledby="extended-network-heading">
              <ExtendedNetworkSection />
            </section>
          </Suspense>
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="Pricing Preview">
          <Suspense
            fallback={<SectionLoader minHeight="600px" message="Loading Launch Access..." />}
          >
            <section id="pricing-preview" aria-labelledby="pricing-preview-heading">
              <PricingPreviewSection />
            </section>
          </Suspense>
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="Final CTA">
          <Suspense
            fallback={<SectionLoader minHeight="300px" message="Loading the next step..." />}
          >
            <section id="final-cta" aria-labelledby="final-cta-heading">
              <FinalCTASection
                headline="Ready to start your 90-Day Launch Access?"
                subtext="Bring your inventory onto Property Listify, make it discoverable, capture enquiries and experience the strongest supported business tools for 90 days."
                primaryCTA={{
                  label: 'Explore Launch Access',
                  href: '#pricing-preview',
                }}
                secondaryCTA={{
                  label: 'Contact Property Listify',
                  href: '/contact',
                }}
              />
            </section>
          </Suspense>
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName="FAQ">
          <Suspense fallback={<FAQSectionSkeleton />}>
            <section id="faq" aria-labelledby="faq-heading">
              <FAQSection commercialProducts={commercialCatalog?.products} />
            </section>
          </Suspense>
        </SectionErrorBoundary>
      </main>

      <Footer />
    </div>
  );
}

function PreparationAdvertiseWithUs() {
  return (
    <div data-testid="advertise-preparation-page" className="flex min-h-screen flex-col bg-white">
      <SEOHead
        title="Prepare your Property Listify workspace | Property Listify"
        description="Choose an available Property Listify preparation path, establish your role-specific presence, and prepare private inventory before commercial activation."
        canonicalUrl="/advertise"
      />
      <EnhancedNavbar />

      <main id="main-content" className="flex-1 bg-white">
        <section className="border-b border-slate-200 bg-slate-950 py-20 text-white md:py-28">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,.72fr)] lg:items-center lg:gap-16 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-300">
                For property professionals
              </p>
              <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
                Prepare your Property Listify workspace before commercial activation.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
                Start with the role that fits your business. You can establish the available account
                and organisation details, then prepare private inventory while publication and paid
                participation remain protected.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/15 bg-white/10 p-6 shadow-[0_28px_80px_rgba(15,23,42,0.24)] backdrop-blur sm:p-8">
              <CommercialActivationNotice />
            </div>
          </div>
        </section>

        <section id="audience-gateways" className="bg-slate-50 py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                Choose your preparation path
              </p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
                Establish the parts of your workspace that are available now.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Each role has an existing private preparation path. Marketplace publication,
                commercial activation, and new marketplace opportunities remain subject to their
                existing approval and entitlement controls.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
              {PREPARATION_PATHS.map(path => (
                <div key={path.href} data-testid="advertise-preparation-path">
                  <VisualPathCard {...path} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white py-20 md:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              Private preparation remains separate from public participation.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600 md:text-lg">
              Preparing an account, organisation, or draft does not activate payment, grant a
              commercial entitlement, or make inventory public. Those transitions remain governed by
              the existing approval, review, and activation requirements.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default function AdvertiseWithUs() {
  useAdvertiseAnalytics();

  return COMMERCIAL_ACTIVATION_STATE.enabled ? (
    <CommercialAdvertiseWithUs />
  ) : (
    <PreparationAdvertiseWithUs />
  );
}
