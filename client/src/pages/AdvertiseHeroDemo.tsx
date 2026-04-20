/**
 * Advertise Hero Demo Page
 *
 * Demonstrates the enhanced HeroSection with conversion-focused design
 */

import React from 'react';
import { HeroSection } from '@/components/advertise/HeroSection';

const AdvertiseHeroDemo: React.FC = () => {
  return (
    <div className="min-h-screen">
      <HeroSection
        eyebrow="South Africa's #1 Property Partner Network"
        headline="Reach High-Intent Property Buyers Across South Africa"
        subheadline="Advertise your properties, developments, and services to thousands of verified home seekers. AI-powered visibility, verified leads, and full dashboard control."
        primaryCTA={{
          label: 'Get Started',
          href: '/register',
          variant: 'primary',
        }}
        secondaryCTA={{
          label: 'Request a Demo',
          href: '/demo',
          variant: 'secondary',
        }}
        stats={[
          { value: '500', suffix: '+', label: 'Active Partners' },
          { value: '10,000', suffix: '+', label: 'Properties Listed' },
          { value: '50,000', suffix: '+', label: 'Verified Leads' },
        ]}
      />

      {/* Demo Info */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">
            HeroSection v4 Features – Conversion-Focused Design
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-white rounded-2xl shadow-lg">
              <h3 className="text-xl font-semibold mb-3">🎯 Focused Conversion</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Centered layout for maximum impact</li>
                <li>• Bold stat counters for social proof</li>
                <li>• Clear call-to-action messaging</li>
                <li>• Animated background orbs</li>
              </ul>
            </div>

            <div className="p-6 bg-white rounded-2xl shadow-lg">
              <h3 className="text-xl font-semibold mb-3">👆 Interactions</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Animated glow orbs in background</li>
                <li>• Smooth stagger entrance animations</li>
                <li>• Responsive stat grid</li>
                <li>• Mobile-optimized layout</li>
              </ul>
            </div>

            <div className="p-6 bg-white rounded-2xl shadow-lg">
              <h3 className="text-xl font-semibold mb-3">🎨 Premium Design</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Dark hero with gradient background</li>
                <li>• Soft-UI styling with rounded corners</li>
                <li>• Eyebrow badge for context</li>
                <li>• Smooth spring animations</li>
              </ul>
            </div>

            <div className="p-6 bg-white rounded-2xl shadow-lg">
              <h3 className="text-xl font-semibold mb-3">📱 Responsive</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Adaptive heights for all devices</li>
                <li>• Touch-optimized for mobile</li>
                <li>• Responsive typography scaling</li>
                <li>• Centered single-column layout</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl">
            <h3 className="text-xl font-semibold mb-3">💡 Try It Out</h3>
            <ul className="space-y-2 text-gray-700">
              <li>
                • <strong>Desktop</strong>: Notice the animated orbs and stat counters
              </li>
              <li>
                • <strong>Mobile</strong>: See the stacked layout and full-width CTAs
              </li>
              <li>
                • <strong>All Devices</strong>: Notice the smooth animations and premium feel
              </li>
              <li>
                • <strong>Conversion</strong>: Centered layout with social proof drives better conversion
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvertiseHeroDemo;
