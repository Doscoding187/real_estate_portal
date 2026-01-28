/**
 * Advertise Hero Demo Page
 *
 * Demonstrates the enhanced HeroSection with elevated card stack carousel
 */

import React from 'react';
import { HeroSection } from '@/components/advertise/HeroSection';

const AdvertiseHeroDemo: React.FC = () => {
  // Sample billboard banner
  const billboard = {
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=800&fit=crop',
    alt: 'Luxury waterfront development with modern architecture',
    developmentName: 'Waterfront Residences',
    tagline: 'Luxury living on the Atlantic Seaboard',
    ctaLabel: 'View Development',
    href: '/developments/waterfront-residences',
  };

  // Sample trust signals
  const trustSignals = [
    { type: 'text' as const, content: '500+ Active Partners' },
    { type: 'text' as const, content: '10,000+ Properties Listed' },
    { type: 'text' as const, content: '50,000+ Verified Leads' },
  ];

  return (
    <div className="min-h-screen">
      <HeroSection
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
        billboard={billboard}
        trustSignals={trustSignals}
      />

      {/* Demo Info */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">
            HeroSection v3 Features - Static Billboard Banner
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-white rounded-2xl shadow-lg">
              <h3 className="text-xl font-semibold mb-3">🎯 Focused Conversion</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Single, static banner for maximum impact</li>
                <li>• No distracting carousel rotation</li>
                <li>• Clear call-to-action messaging</li>
                <li>• Direct link to development pages</li>
              </ul>
            </div>

            <div className="p-6 bg-white rounded-2xl shadow-lg">
              <h3 className="text-xl font-semibold mb-3">👆 Interactions</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Entire banner is clickable</li>
                <li>• Hover lift effect with glow ring</li>
                <li>• Smooth scale animation on hover</li>
                <li>• Image zoom on hover</li>
              </ul>
            </div>

            <div className="p-6 bg-white rounded-2xl shadow-lg">
              <h3 className="text-xl font-semibold mb-3">🎨 Premium Design</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Soft-UI styling with rounded corners</li>
                <li>• Gradient overlay for text readability</li>
                <li>• Featured badge indicator</li>
                <li>• Smooth spring animations</li>
              </ul>
            </div>

            <div className="p-6 bg-white rounded-2xl shadow-lg">
              <h3 className="text-xl font-semibold mb-3">📱 Responsive</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Adaptive heights for all devices</li>
                <li>• Touch-optimized for mobile</li>
                <li>• Maintains aspect ratio</li>
                <li>• Optimized image loading</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl">
            <h3 className="text-xl font-semibold mb-3">💡 Try It Out</h3>
            <ul className="space-y-2 text-gray-700">
              <li>
                • <strong>Desktop</strong>: Hover over the banner to see the lift effect and image
                zoom
              </li>
              <li>
                • <strong>Mobile</strong>: Tap the banner to navigate to the development page
              </li>
              <li>
                • <strong>All Devices</strong>: Notice the smooth animations and premium feel
              </li>
              <li>
                • <strong>Conversion</strong>: Single focused message drives better conversion than
                rotating carousel
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvertiseHeroDemo;
