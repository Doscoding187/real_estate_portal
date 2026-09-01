import { lazy, Suspense } from 'react';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/advertise/SEOHead';
import { StructuredData } from '@/components/advertise/StructuredData';
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

export default function AdvertiseWithUs() {
  useAdvertiseAnalytics();
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
