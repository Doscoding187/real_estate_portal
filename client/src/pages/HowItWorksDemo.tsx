/**
 * HowItWorksDemo Page
 *
 * Demo page to showcase the HowItWorksSection component
 * with different configurations and responsive behavior.
 */

import React from 'react';
import { HowItWorksSection } from '@/components/advertise/HowItWorksSection';

export default function HowItWorksDemo() {
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Spacer for scroll testing */}
      <div
        style={{ height: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <h1 style={{ fontSize: '2rem', color: '#1f2937' }}>
          Scroll down to see the How It Works section
        </h1>
      </div>

      {/* Default Configuration */}
      <HowItWorksSection />

      {/* Custom Configuration */}
      <HowItWorksSection
        heading="Start Your Journey"
        subheading="Join thousands of successful partners in just three steps"
        ctaButton={{
          label: 'Get Started Free',
          href: '/register',
          onClick: () => console.log('Custom CTA clicked'),
        }}
        className="custom-how-it-works"
      />

      {/* Spacer */}
      <div style={{ height: '50vh' }} />
    </div>
  );
}
