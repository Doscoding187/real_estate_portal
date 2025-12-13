/**
 * Advertise Responsive Demo Page
 * 
 * Demonstrates responsive layouts across all breakpoints.
 * Use browser dev tools to test different viewport sizes.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { HeroSection } from '@/components/advertise/HeroSection';
import { PartnerSelectionSection } from '@/components/advertise/PartnerSelectionSection';
import { ValuePropositionSection } from '@/components/advertise/ValuePropositionSection';
import { HowItWorksSection } from '@/components/advertise/HowItWorksSection';
import { MobileStickyCTA, useMobileStickyCTA } from '@/components/advertise/MobileStickyCTA';
import { TrendingUp, Users, Star, Award } from 'lucide-react';
import '@/styles/advertise-responsive.css';

// Lazy load below-the-fold sections for better performance
const FeaturesGridSection = lazy(() => import('@/components/advertise/FeaturesGridSection'));
const SocialProofSection = lazy(() => import('@/components/advertise/SocialProofSection'));
const PricingPreviewSection = lazy(() => import('@/components/advertise/PricingPreviewSection'));
const FinalCTASection = lazy(() => import('@/components/advertise/FinalCTASection'));
const FAQSection = lazy(() => import('@/components/advertise/FAQSection'));

/**
 * Loading fallback for lazy-loaded sections
 */
const SectionLoader: React.FC = () => (
  <div className="py-16 md:py-24 px-4 md:px-8">
    <div className="max-w-7xl mx-auto">
      <div className="animate-pulse space-y-8">
        <div className="h-12 bg-gray-200 rounded-lg w-3/4 mx-auto" />
        <div className="h-6 bg-gray-200 rounded-lg w-1/2 mx-auto" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

/**
 * Viewport indicator component
 */
const ViewportIndicator: React.FC = () => {
  const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const updateViewport = () => {
      const w = window.innerWidth;
      setWidth(w);
      
      if (w < 768) {
        setViewport('mobile');
      } else if (w < 1024) {
        setViewport('tablet');
      } else {
        setViewport('desktop');
      }
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const getColor = () => {
    switch (viewport) {
      case 'mobile': return '#10b981';
      case 'tablet': return '#f59e0b';
      case 'desktop': return '#3b82f6';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 9999,
        background: 'white',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        fontSize: '0.875rem',
        fontWeight: 600,
        color: getColor(),
        border: `2px solid ${getColor()}`,
      }}
    >
      <div>{viewport.toUpperCase()}</div>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
        {width}px
      </div>
    </div>
  );
};

/**
 * Main demo page
 */
export default function AdvertiseResponsiveDemo() {
  const isMobileStickyCTAVisible = useMobileStickyCTA('hero-section');

  // Sample data
  const heroData = {
    headline: 'Reach Thousands of Verified Home Seekers',
    subheadline: 'Join South Africa\'s fastest-growing property platform and connect with high-intent buyers actively searching for their dream homes.',
    primaryCTA: {
      label: 'Get Started',
      href: '/register',
      variant: 'primary' as const,
    },
    secondaryCTA: {
      label: 'Request Demo',
      href: '/demo',
      variant: 'secondary' as const,
    },
    billboard: {
      imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
      alt: 'Luxury Development',
      developmentName: 'Sandton Heights',
      tagline: 'Luxury Living in the Heart of Sandton',
      href: '/developments/sandton-heights',
    },
    trustSignals: [
      { type: 'text' as const, content: 'Trusted by 500+ Partners' },
      { type: 'text' as const, content: '10,000+ Properties Promoted' },
      { type: 'text' as const, content: '95% Partner Satisfaction' },
    ],
  };

  const socialProofMetrics = [
    { value: '5,000+', label: 'Verified Leads Generated', icon: TrendingUp, iconColor: 'green' as const },
    { value: '10,000+', label: 'Properties Promoted', icon: Award, iconColor: 'blue' as const },
    { value: '95%', label: 'Partner Satisfaction', icon: Star, iconColor: 'yellow' as const },
    { value: '500+', label: 'Active Partners', icon: Users, iconColor: 'purple' as const },
  ];

  const finalCTAData = {
    headline: 'Ready to Start Advertising?',
    subtext: 'Join hundreds of successful partners already growing their business on our platform.',
    primaryCTA: {
      label: 'Get Started Now',
      href: '/register',
    },
    secondaryCTA: {
      label: 'Schedule a Demo',
      href: '/demo',
    },
  };

  return (
    <div className="advertise-page-container">
      {/* Viewport Indicator */}
      <ViewportIndicator />

      {/* Hero Section */}
      <div id="hero-section">
        <HeroSection {...heroData} />
      </div>

      {/* Partner Selection Section */}
      <PartnerSelectionSection />

      {/* Value Proposition Section */}
      <ValuePropositionSection />

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* Features Grid Section - Lazy Loaded */}
      <Suspense fallback={<SectionLoader />}>
        <FeaturesGridSection />
      </Suspense>

      {/* Social Proof Section - Lazy Loaded */}
      <Suspense fallback={<SectionLoader />}>
        <SocialProofSection
          metrics={socialProofMetrics}
          disclaimer="* Metrics are representative and will be updated with actual data"
        />
      </Suspense>

      {/* Pricing Preview Section - Lazy Loaded */}
      <Suspense fallback={<SectionLoader />}>
        <PricingPreviewSection />
      </Suspense>

      {/* Final CTA Section - Lazy Loaded */}
      <Suspense fallback={<SectionLoader />}>
        <FinalCTASection {...finalCTAData} />
      </Suspense>

      {/* FAQ Section - Lazy Loaded */}
      <Suspense fallback={<SectionLoader />}>
        <FAQSection />
      </Suspense>

      {/* Mobile Sticky CTA */}
      <MobileStickyCTA
        label="Start Advertising"
        href="/register"
        isVisible={isMobileStickyCTAVisible}
      />

      {/* Testing Instructions */}
      <section style={{ padding: '4rem 2rem', background: '#f9fafb' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Responsive Testing Instructions
          </h2>
          
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
              Mobile (&lt; 768px)
            </h3>
            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: '#6b7280' }}>
              <li>All sections stack vertically</li>
              <li>Single column layouts</li>
              <li>Full-width CTA buttons</li>
              <li>Mobile sticky CTA appears after scrolling</li>
              <li>Touch targets are 44px minimum</li>
            </ul>
          </div>

          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
              Tablet (768px - 1024px)
            </h3>
            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: '#6b7280' }}>
              <li>Two-column grids for most sections</li>
              <li>Adjusted spacing and typography</li>
              <li>Inline CTA buttons</li>
              <li>Process steps remain horizontal</li>
            </ul>
          </div>

          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
              Desktop (&gt; 1024px)
            </h3>
            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: '#6b7280' }}>
              <li>Full-width grids (3-5 columns)</li>
              <li>Max container width: 1440px</li>
              <li>Generous spacing and typography</li>
              <li>Optimal reading experience</li>
            </ul>
          </div>

          <div style={{ marginTop: '2rem', padding: '1rem', background: '#dbeafe', borderRadius: '8px' }}>
            <p style={{ fontSize: '0.875rem', color: '#1e40af' }}>
              <strong>Tip:</strong> Use browser dev tools (F12) to test different viewport sizes. 
              The viewport indicator in the top-right shows the current breakpoint.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
