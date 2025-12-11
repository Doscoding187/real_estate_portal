/**
 * Advertise With Us Landing Page
 * 
 * The main landing page for advertising partners featuring all sections:
 * - Hero with billboard banner
 * - Partner selection
 * - Value proposition
 * - How it works
 * - Features grid
 * - Social proof
 * - Pricing preview
 * - Final CTA
 * - FAQ
 * - Mobile sticky CTA
 */

import React, { lazy, Suspense, useState, useEffect } from 'react';

import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { Footer } from '@/components/Footer';
import { HeroSection } from '@/components/advertise/HeroSection';
import { MobileStickyCTA, useMobileStickyCTA } from '@/components/advertise/MobileStickyCTA';
import { PerformanceOptimizer } from '@/components/advertise/PerformanceOptimizer';
import { SkipLinks } from '@/components/advertise/SkipLinks';
import { AdvertiseBreadcrumb } from '@/components/advertise/Breadcrumb';
import { SEOHead } from '@/components/advertise/SEOHead';
import { StructuredData } from '@/components/advertise/StructuredData';
import { TrendingUp, Users, Star, Award } from 'lucide-react';
import { useAdvertiseAnalytics } from '@/hooks/useAdvertiseAnalytics';
import { SectionErrorBoundary } from '@/components/advertise/AdvertiseErrorBoundary';
import { 
  HeroSectionSkeleton,
  FeaturesGridSkeleton,
  SocialProofSkeleton,
  FAQSectionSkeleton,
  SectionLoader,
} from '@/components/advertise/SkeletonLoaders';
import {
  MetricsPlaceholder,
} from '@/components/advertise/ErrorStates';

// Lazy load below-the-fold sections for better performance with error handling
const FeaturesGridSection = lazy(() => 
  import('@/components/advertise/FeaturesGridSection')
    .then(module => {
      console.log('✓ FeaturesGridSection loaded successfully');
      return module;
    })
    .catch(error => {
      console.error('✗ Failed to load FeaturesGridSection:', error);
      throw error;
    })
);

const SocialProofSection = lazy(() => 
  import('@/components/advertise/SocialProofSection')
    .then(module => {
      console.log('✓ SocialProofSection loaded successfully');
      return module;
    })
    .catch(error => {
      console.error('✗ Failed to load SocialProofSection:', error);
      throw error;
    })
);

const FinalCTASection = lazy(() => 
  import('@/components/advertise/FinalCTASection')
    .then(module => {
      console.log('✓ FinalCTASection loaded successfully');
      return module;
    })
    .catch(error => {
      console.error('✗ Failed to load FinalCTASection:', error);
      throw error;
    })
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
    })
);

// Import the actual section components
import { PartnerSelectionSection } from '@/components/advertise/PartnerSelectionSection';
import { ValuePropositionSection } from '@/components/advertise/ValuePropositionSection';
import { HowItWorksSection } from '@/components/advertise/HowItWorksSection';
import { PricingPreviewSection } from '@/components/advertise/PricingPreviewSection';

export default function AdvertiseWithUs() {
  // Set up analytics tracking (tracks page view and scroll depth automatically)
  useAdvertiseAnalytics();
  
  const isMobileStickyCTAVisible = useMobileStickyCTA('hero-section');

  // Loading and error states
  const [heroLoading, setHeroLoading] = useState(false);
  const [metricsError] = useState(false);

  // Load and cleanup page-specific CSS
  useEffect(() => {
    // Dynamically load CSS files
    const responsiveLink = document.createElement('link');
    responsiveLink.rel = 'stylesheet';
    responsiveLink.href = '/src/styles/advertise-responsive.css';
    responsiveLink.id = 'advertise-responsive-css';
    
    const focusLink = document.createElement('link');
    focusLink.rel = 'stylesheet';
    focusLink.href = '/src/styles/advertise-focus-indicators.css';
    focusLink.id = 'advertise-focus-css';
    
    document.head.appendChild(responsiveLink);
    document.head.appendChild(focusLink);
    
    // Cleanup function to remove CSS when component unmounts
    return () => {
      const responsiveCss = document.getElementById('advertise-responsive-css');
      const focusCss = document.getElementById('advertise-focus-css');
      if (responsiveCss) responsiveCss.remove();
      if (focusCss) focusCss.remove();
    };
  }, []);

  // Simulate loading completion (in real app, this would be based on data fetching)
  React.useEffect(() => {
    // Hero loads immediately
    setHeroLoading(false);
  }, []);

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
    <>
      {/* SEO Meta Tags */}
      <SEOHead
        title="Advertise With Us | Reach High-Intent Property Buyers"
        description="Advertise your properties, developments, and services to thousands of verified home seekers across South Africa. AI-powered visibility, verified leads, and full dashboard control."
        canonicalUrl="https://platform.com/advertise"
        ogImage="https://platform.com/images/advertise-og-image.jpg"
        ogType="website"
      />
      
      {/* Structured Data (Schema.org) */}
      <StructuredData
        pageUrl="https://platform.com/advertise"
        organizationName="Property Platform"
        organizationUrl="https://platform.com"
        organizationLogo="https://platform.com/logo.png"
      />
      
      {/* Performance optimization wrapper */}
      <PerformanceOptimizer />
      
      {/* Skip links for accessibility */}
      <SkipLinks />
      
      {/* Navigation */}
      <EnhancedNavbar />
      
      {/* Breadcrumb Navigation */}
      <div className="w-full bg-slate-50 border-b border-slate-200">
        <AdvertiseBreadcrumb />
      </div>
      
      {/* Main content - Scoped container for advertise page */}
      <main id="main-content" className="advertise-page bg-white">
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
                  label: 'Request a Demo',
                  href: '/contact',
                  variant: 'secondary' as const,
                }}
                billboard={billboard}
                trustSignals={trustSignals}
              />
            )}
          </section>
        </SectionErrorBoundary>

        {/* Partner Selection Section */}
        <SectionErrorBoundary sectionName="Partner Selection">
          <section id="partner-selection" aria-labelledby="partner-selection-heading">
            <PartnerSelectionSection />
          </section>
        </SectionErrorBoundary>

        {/* Value Proposition Section */}
        <SectionErrorBoundary sectionName="Value Proposition">
          <section id="value-proposition" aria-labelledby="value-proposition-heading">
            <ValuePropositionSection />
          </section>
        </SectionErrorBoundary>

        {/* How It Works Section */}
        <SectionErrorBoundary sectionName="How It Works">
          <section id="how-it-works" aria-labelledby="how-it-works-heading">
            <HowItWorksSection />
          </section>
        </SectionErrorBoundary>

        {/* Features Grid Section - Lazy loaded */}
        <SectionErrorBoundary sectionName="Features Grid">
          <Suspense fallback={<FeaturesGridSkeleton />}>
            <section id="features-grid" aria-labelledby="features-grid-heading">
              <FeaturesGridSection />
            </section>
          </Suspense>
        </SectionErrorBoundary>

        {/* Social Proof Section - Lazy loaded */}
        <SectionErrorBoundary sectionName="Social Proof">
          <Suspense fallback={<SocialProofSkeleton />}>
            <section id="social-proof" aria-labelledby="social-proof-heading">
              {metricsError ? (
                <MetricsPlaceholder />
              ) : (
                <SocialProofSection metrics={metrics} />
              )}
            </section>
          </Suspense>
        </SectionErrorBoundary>

        {/* Pricing Preview Section - Now inline */}
        <SectionErrorBoundary sectionName="Pricing Preview">
          <section id="pricing-preview" aria-labelledby="pricing-preview-heading">
            <PricingPreviewSection />
          </section>
        </SectionErrorBoundary>

        {/* Final CTA Section - Lazy loaded */}
        <SectionErrorBoundary sectionName="Final CTA">
          <Suspense fallback={<SectionLoader minHeight="300px" message="Loading final call-to-action..." />}>
            <section id="final-cta" aria-labelledby="final-cta-heading">
              <FinalCTASection
                headline="Ready to Grow Your Business?"
                subtext="Join hundreds of successful partners already advertising on South Africa's fastest-growing property platform."
                primaryCTA={{
                  label: 'Get Started Now',
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

      {/* Mobile Sticky CTA */}
      <MobileStickyCTA
        label="Start Advertising"
        href="/role-selection"
        isVisible={isMobileStickyCTAVisible}
      />

      {/* Footer */}
      <Footer />
    </>
  );
}
