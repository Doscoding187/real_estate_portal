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
      <div className="custom-how-it-works">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Start Your Journey</h2>
          <p className="text-slate-600">
            Join thousands of successful partners in just three steps
          </p>
        </div>
        <HowItWorksSection />
      </div>

      {/* Spacer */}
      <div style={{ height: '50vh' }} />
    </div>
  );
}
