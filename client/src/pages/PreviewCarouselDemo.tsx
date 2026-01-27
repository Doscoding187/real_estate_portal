/**
 * PreviewCarousel Demo Page
 *
 * Demonstrates the PreviewCarousel component with sample slides
 */

import React from 'react';
import { PreviewCarousel, PreviewSlide } from '@/components/advertise/PreviewCarousel';

const sampleSlides: PreviewSlide[] = [
  {
    type: 'explore-feed',
    imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop',
    alt: 'Explore Feed - Discover properties through engaging video content',
  },
  {
    type: 'property-card',
    imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
    alt: 'Property Cards - Showcase your listings with beautiful cards',
  },
  {
    type: 'developer-showcase',
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop',
    alt: 'Developer Showcase - Promote your developments to qualified buyers',
  },
];

export default function PreviewCarouselDemo() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">Preview Carousel Demo</h1>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Auto-Rotating Carousel</h2>
          <p className="text-gray-600 mb-6">
            This carousel auto-rotates every 5 seconds. Hover over it to pause. Click the indicators
            to navigate manually.
          </p>

          <PreviewCarousel slides={sampleSlides} />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Features</h2>
          <ul className="space-y-2 text-gray-600">
            <li>✓ Auto-rotates every 5 seconds</li>
            <li>✓ Smooth fade transitions between slides</li>
            <li>✓ Pauses on hover</li>
            <li>✓ Manual navigation with indicators</li>
            <li>✓ Accessible with ARIA labels</li>
            <li>✓ Responsive design</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
