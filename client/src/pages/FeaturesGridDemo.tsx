/**
 * FeaturesGridSection Demo Page
 * 
 * Demonstrates the FeaturesGridSection component with six feature tiles
 * in a responsive grid layout.
 */

import React from 'react';
import { FeaturesGridSection } from '@/components/advertise/FeaturesGridSection';

export default function FeaturesGridDemo() {
  return (
    <div style={{ minHeight: '100vh', background: '#ffffff' }}>
      {/* Demo Header */}
      <div
        style={{
          padding: '2rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Features Grid Section Demo
        </h1>
        <p style={{ fontSize: '1.125rem', opacity: 0.9 }}>
          Responsive grid with 3 columns (desktop), 2 columns (tablet), 1 column (mobile)
        </p>
      </div>

      {/* Features Grid Section */}
      <FeaturesGridSection />

      {/* Demo Info */}
      <div
        style={{
          padding: '3rem 1rem',
          maxWidth: '1200px',
          margin: '0 auto',
          background: '#f9fafb',
        }}
      >
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Component Features
        </h2>
        <ul style={{ listStyle: 'disc', paddingLeft: '2rem', lineHeight: '1.8' }}>
          <li>Six feature tiles with soft-UI card styling</li>
          <li>Hover lift animation with shadow expansion</li>
          <li>Icon color transition on hover</li>
          <li>Responsive grid layout:
            <ul style={{ listStyle: 'circle', paddingLeft: '2rem', marginTop: '0.5rem' }}>
              <li>Desktop (≥1024px): 3 columns</li>
              <li>Tablet (768px-1023px): 2 columns</li>
              <li>Mobile (&lt;768px): 1 column with touch-optimized spacing</li>
            </ul>
          </li>
          <li>Staggered fade-in animation on scroll</li>
          <li>Accessible with proper ARIA labels and semantic HTML</li>
        </ul>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '2rem', marginBottom: '1rem' }}>
          Features Included
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'white', borderRadius: '8px' }}>
            <strong>Listing Promotion</strong>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
              Premium listing placements
            </p>
          </div>
          <div style={{ padding: '1rem', background: 'white', borderRadius: '8px' }}>
            <strong>Explore Feed Ads</strong>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
              Short-form video content
            </p>
          </div>
          <div style={{ padding: '1rem', background: 'white', borderRadius: '8px' }}>
            <strong>Boost Campaigns</strong>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
              Targeted audience reach
            </p>
          </div>
          <div style={{ padding: '1rem', background: 'white', borderRadius: '8px' }}>
            <strong>Lead Engine</strong>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
              Verified buyer connections
            </p>
          </div>
          <div style={{ padding: '1rem', background: 'white', borderRadius: '8px' }}>
            <strong>Team Collaboration</strong>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
              Seamless team management
            </p>
          </div>
          <div style={{ padding: '1rem', background: 'white', borderRadius: '8px' }}>
            <strong>Media Templates</strong>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
              Professional marketing materials
            </p>
          </div>
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '2rem', marginBottom: '1rem' }}>
          Testing Instructions
        </h3>
        <ol style={{ listStyle: 'decimal', paddingLeft: '2rem', lineHeight: '1.8' }}>
          <li>Resize your browser window to test responsive breakpoints</li>
          <li>Hover over feature tiles to see lift animation and icon color change</li>
          <li>Scroll to trigger the staggered fade-in animation</li>
          <li>Test on mobile devices for touch-optimized spacing</li>
          <li>Verify accessibility with keyboard navigation (Tab key)</li>
        </ol>
      </div>
    </div>
  );
}
