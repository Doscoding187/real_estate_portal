import React, { useState, lazy, Suspense } from 'react';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/advertise/SEOHead';
import { StructuredData } from '@/components/advertise/StructuredData';
import { TrendingUp, Users, Star, Award } from 'lucide-react';
import { useAdvertiseAnalytics } from '@/hooks/useAdvertiseAnalytics';
import { SectionErrorBoundary } from '@/components/advertise/AdvertiseErrorBoundary';
import {
  HeroSectionSkeleton,
  FAQSectionSkeleton,
  SectionLoader,
} from '@/components/advertise/SkeletonLoaders';

// Lazy load below-the-fold sections for better performance with error handling
const FinalCTASection = lazy(() =>
  import('@/components/advertise/FinalCTASection')
    .then(module => {
      console.log('✓ FinalCTASection loaded successfully');
      return module;
    })
    .catch(error => {
      console.error('✗ Failed to load FinalCTASection:', error);
      throw error;
    }),
);

const FAQSection = lazy(() =>
  import('@/components/advertise/FAQSection')
    .then(module => {
      console.log('✓ FAQSection loaded successfully');
      return module;
    })
    .catch(error => {
      console.error('✗ Failed to load FAQSection:', error);
      throw error;
    }),
);

const ValuePropositionSection = lazy(() =>
  import('@/components/advertise/ValuePropositionSection')
    .then(module => ({ default: module.ValuePropositionSection }))
);

const HowItWorksSection = lazy(() =>
  import('@/components/advertise/HowItWorksSection')
    .then(module => ({ default: module.HowItWorksSection }))
);

const PricingPreviewSection = lazy(() =>
  import('@/components/advertise/PricingPreviewSection')
    .then(module => ({ default: module.PricingPreviewSection }))
);

const ExtendedNetworkSection = lazy(() =>
  import('@/components/advertise/ExtendedNetworkSection')
    .then(module => ({ default: module.ExtendedNetworkSection }))
);

const SegmentationLayer = lazy(() =>
  import('@/components/advertise/SegmentationLayer')
    .then(module => ({ default: module.SegmentationLayer }))
);

const EcosystemSection = lazy(() =>
  import('@/components/advertise/EcosystemSection')
    .then(module => ({ default: module.EcosystemSection }))
);

// Import the initial above-the-fold section components statically
import { TrustStripSection } from '@/components/advertise/TrustStripSection';
import { LiveDemandSection } from '@/components/advertise/LiveDemandSection';
import { DemandCaptureModal } from '@/components/advertise/DemandCaptureModal';
import { HeroSection } from '@/components/advertise/HeroSection';
import { useMobileStickyCTA } from '@/components/advertise/MobileStickyCTA';

export default function AdvertiseWithUs() {
  // Set up analytics tracking (tracks page view and scroll depth automatically)
  useAdvertiseAnalytics();

  const isMobileStickyCTAVisible = useMobileStickyCTA('hero-section');

  // Loading and error states
  const [heroLoading, setHeroLoading] = useState(false);
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);

  // Sample billboard banner
  const billboard = {
    imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
    alt: 'Luxury development showcase',
    developmentName: 'Sandton Heights',
    tagline: 'Premium Living in the Heart of Sandton',
    ctaLabel: 'View Development',
    href: '/developments/sandton-heights',
  };

  // Sample trust signals
  const trustSignals = [
    { type: 'text' as const, content: 'Trusted by 500+ Developers' },
    { type: 'text' as const, content: '2M+ Monthly Visitors' },
    { type: 'text' as const, content: '150k+ Leads Generated' },
  ];

  // Sample metrics for social proof
  const metrics = [
    {
      value: '150,000+',
      label: 'Verified Leads Generated',
      icon: TrendingUp,
    },
    {
      value: '25,000+',
      label: 'Properties Promoted',
      icon: Star,
    },
    {
      value: '4.8/5',
      label: 'Partner Satisfaction',
      icon: Award,
    },
    {
      value: '500+',
      label: 'Active Partners',
      icon: Users,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <DemandCaptureModal 
        isOpen={isCaptureModalOpen} 
        onClose={() => setIsCaptureModalOpen(false)} 
      />
      {/* SEO Meta Tags */}
      <SEOHead
        title="Advertise With Us | Property Platform"
        description="Select your industry to explore tailored advertising and acquisition solutions on South Africa's fastest-growing property platform."
        canonicalUrl="https://platform.com/advertise"
      />
      <StructuredData
        pageUrl="https://platform.com/advertise"
        organizationName="Property Platform"
      />

      <EnhancedNavbar />

      <main id="main-content" className="flex-1 flex flex-col pt-24 pb-16 advertise-page bg-white">
        {/* Hero Section */}
        <SectionErrorBoundary sectionName="Hero Section">
          <section id="hero-section" aria-labelledby="hero-heading">
            {heroLoading ? (
              <HeroSectionSkeleton />
            ) : (
              <HeroSection
                headline="Reach High-Intent Property Buyers Across South Africa"
                subheadline="Advertise your properties, developments, and services to thousands of verified home seekers. AI-powered visibility, verified leads, and full dashboard control."
                primaryCTA={{
                  label: 'Get Started',
                  href: '/role-selection',
                  variant: 'primary' as const,
                }}
                secondaryCTA={{
                  label: 'See Buyers Near You',
                  onClick: () => setIsCaptureModalOpen(true),
                  variant: 'secondary' as const,
                }}
                stats={[
                  { value: '150k', suffix: '+', label: 'Verified Leads' },
                  { value: '25k', suffix: '+', label: 'Properties Promoted' },
                  { value: '4.8', suffix: '/5', label: 'Partner Satisfaction' }
                ]}
              />
            )}
          </section>
        </SectionErrorBoundary>

        {/* Trust Strip Section */}
        <SectionErrorBoundary sectionName="Trust Strip">
          <section id="trust-strip" aria-labelledby="trust-strip-heading">
            <TrustStripSection badges={[
              '500+ Active Partners',
              '10,000+ Properties Promoted',
              '50,000+ Verified Leads',
              '95% Partner Satisfaction'
            ]} />
          </section>
        </SectionErrorBoundary>

        {/* Live Demand Section */}
        <SectionErrorBoundary sectionName="Live Demand">
          <section id="live-demand" aria-labelledby="live-demand-heading">
            <LiveDemandSection onCaptureClick={() => setIsCaptureModalOpen(true)} />
          </section>
        </SectionErrorBoundary>

        {/* Ecosystem Section */}
        <SectionErrorBoundary sectionName="Ecosystem">
          <Suspense fallback={<SectionLoader minHeight="300px" message="Loading ecosystem..." />}>
            <section id="ecosystem" aria-labelledby="ecosystem-heading">
              <EcosystemSection />
            </section>
          </Suspense>
        </SectionErrorBoundary>

        {/* Segmentation Layer */}
        <SectionErrorBoundary sectionName="Segmentation Layer">
          <Suspense fallback={<SectionLoader minHeight="300px" message="Loading segmentation..." />}>
            <section id="segmentation" aria-labelledby="segmentation-heading">
              <SegmentationLayer />
            </section>
          </Suspense>
        </SectionErrorBoundary>

        {/* Value Proposition Section */}
        <SectionErrorBoundary sectionName="Value Proposition">
          <Suspense fallback={<SectionLoader minHeight="300px" message="Loading value proposition..." />}>
            <section id="value-proposition" aria-labelledby="value-proposition-heading">
              <ValuePropositionSection />
            </section>
          </Suspense>
        </SectionErrorBoundary>

        {/* How It Works Section */}
        <SectionErrorBoundary sectionName="How It Works">
          <Suspense fallback={<SectionLoader minHeight="300px" message="Loading pipeline..." />}>
            <section id="how-it-works" aria-labelledby="how-it-works-heading">
              <HowItWorksSection />
            </section>
          </Suspense>
        </SectionErrorBoundary>

        {/* Extended Network Section */}
        <SectionErrorBoundary sectionName="Extended Network">
          <Suspense fallback={<SectionLoader minHeight="300px" message="Loading network..." />}>
            <section id="extended-network" aria-labelledby="extended-network-heading">
              <ExtendedNetworkSection />
            </section>
          </Suspense>
        </SectionErrorBoundary>

        {/* Pricing Preview Section - Now inline */}
        <SectionErrorBoundary sectionName="Pricing Preview">
          <Suspense fallback={<SectionLoader minHeight="300px" message="Loading pricing..." />}>
            <section id="pricing-preview" aria-labelledby="pricing-preview-heading">
              <PricingPreviewSection />
            </section>
          </Suspense>
        </SectionErrorBoundary>

        {/* Final CTA Section - Lazy loaded */}
        <SectionErrorBoundary sectionName="Final CTA">
          <Suspense
            fallback={<SectionLoader minHeight="300px" message="Loading final call-to-action..." />}
          >
            <section id="final-cta" aria-labelledby="final-cta-heading">
              <FinalCTASection
                headline="Start Receiving Buyer Leads This Week"
                subtext="Don't let your competitors capture your market share. Join hundreds of successful partners already plugged into South Africa's most active property demand network."
                primaryCTA={{
                  label: 'Claim Your Market Access',
                  href: '/role-selection',
                }}
                secondaryCTA={{
                  label: 'Schedule a Demo',
                  href: '/contact',
                }}
              />
            </section>
          </Suspense>
        </SectionErrorBoundary>

        {/* FAQ Section - Lazy loaded */}
        <SectionErrorBoundary sectionName="FAQ">
          <Suspense fallback={<FAQSectionSkeleton />}>
            <section id="faq" aria-labelledby="faq-heading">
              <FAQSection />
            </section>
          </Suspense>
        </SectionErrorBoundary>
      </main>

      <Footer />
    </div>
  );
}
