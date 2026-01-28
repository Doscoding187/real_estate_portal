/**
 * Partner Selection Section Demo Page
 *
 * Demonstrates the PartnerSelectionSection component with all five partner types.
 * Shows staggered animations, hover interactions, and responsive layout.
 */

import React from 'react';
import { PartnerSelectionSection } from '@/components/advertise/PartnerSelectionSection';

export default function PartnerSelectionDemo() {
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Demo Header */}
      <div
        style={{
          background: 'white',
          padding: '2rem',
          borderBottom: '1px solid #e5e7eb',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '2.25rem',
            fontWeight: '800',
            color: '#111827',
            marginBottom: '0.5rem',
          }}
        >
          Partner Selection Section Demo
        </h1>
        <p
          style={{
            fontSize: '1.125rem',
            color: '#6b7280',
          }}
        >
          Interactive partner type cards with staggered animations and hover effects
        </p>
      </div>

      {/* Partner Selection Section */}
      <PartnerSelectionSection />

      {/* Demo Info */}
      <div
        style={{
          maxWidth: '1440px',
          margin: '4rem auto',
          padding: '0 1rem',
        }}
      >
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.06)',
          }}
        >
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '1rem',
            }}
          >
            Features Demonstrated
          </h2>
          <ul
            style={{
              listStyle: 'disc',
              paddingLeft: '1.5rem',
              color: '#4b5563',
              lineHeight: '1.75',
            }}
          >
            <li>
              Five partner type cards (Agent, Developer, Bank, Bond Originator, Service Provider)
            </li>
            <li>Staggered fade-up animations on scroll (100ms delay per card)</li>
            <li>Hover lift animation with shadow expansion</li>
            <li>Click navigation to sub-landing pages</li>
            <li>Touch-optimized spacing for mobile devices</li>
            <li>Responsive grid layout (1 column mobile, 2 columns tablet, auto-fit desktop)</li>
            <li>Accessibility features (ARIA labels, keyboard navigation)</li>
            <li>Analytics tracking for partner type selection</li>
            <li>Respects prefers-reduced-motion user preference</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
