/**
 * PricingPreviewDemo Page
 *
 * Demo page to showcase the PricingPreviewSection component
 */

import React from 'react';
import { PricingPreviewSection } from '@/components/advertise/PricingPreviewSection';

export default function PricingPreviewDemo() {
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ padding: '2rem', textAlign: 'center', background: 'white' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Pricing Preview Section Demo
        </h1>
        <p style={{ color: '#6b7280' }}>Task 8: Implement Pricing Preview Section</p>
      </div>

      <PricingPreviewSection />

      <div style={{ padding: '2rem', textAlign: 'center', background: 'white', marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Component Features
        </h2>
        <ul style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto', color: '#4b5563' }}>
          <li>✅ Four pricing category cards (Agent, Developer, Bank/Loan, Service Provider)</li>
          <li>✅ Minimalist card styling with soft-UI design</li>
          <li>✅ Hover border glow effect on cards</li>
          <li>✅ Click navigation to full pricing page</li>
          <li>✅ Analytics tracking for card clicks</li>
          <li>✅ "View Full Pricing" CTA button</li>
          <li>✅ Responsive grid layout</li>
          <li>✅ Smooth animations on scroll</li>
        </ul>
      </div>
    </div>
  );
}
