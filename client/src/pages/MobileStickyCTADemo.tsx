/**
 * MobileStickyCTA Demo Page
 * 
 * Demonstrates the MobileStickyCTA component with scroll behavior.
 * Best viewed on mobile or with mobile device emulation.
 */

import React, { useState } from 'react';
import { MobileStickyCTA, useMobileStickyCTA } from '@/components/advertise/MobileStickyCTA';

export default function MobileStickyCTADemo() {
  const isVisible = useMobileStickyCTA('demo-hero');
  const [dismissCount, setDismissCount] = useState(0);

  const handleClick = () => {
    console.log('Mobile Sticky CTA clicked');
    alert('Navigating to registration...');
  };

  const handleDismiss = () => {
    console.log('Mobile Sticky CTA dismissed');
    setDismissCount(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section
        id="demo-hero"
        className="h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500"
      >
        <div className="text-center text-white px-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Mobile Sticky CTA Demo
          </h1>
          <p className="text-xl md:text-2xl mb-8">
            Scroll down to see the sticky CTA appear
          </p>
          <div className="inline-block bg-white/20 backdrop-blur-sm rounded-lg p-4">
            <p className="text-sm">
              📱 Best viewed on mobile or with device emulation
            </p>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-gray-900">
            Section 1: Value Proposition
          </h2>
          <p className="text-lg text-gray-600 mb-4">
            As you scroll past the hero section, the mobile sticky CTA will appear at the bottom of the screen.
            This provides a persistent conversion opportunity throughout the user's journey.
          </p>
          <p className="text-lg text-gray-600">
            The sticky CTA is only visible on mobile devices (screens smaller than 768px).
            On desktop, it's hidden to avoid cluttering the interface.
          </p>
        </div>
      </section>

      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-gray-900">
            Section 2: Features
          </h2>
          <div className="space-y-6">
            <div className="bg-purple-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-2 text-purple-900">
                Scroll-Triggered
              </h3>
              <p className="text-gray-700">
                The CTA appears automatically when you scroll past the hero section,
                ensuring it's visible when users are engaged with content.
              </p>
            </div>
            <div className="bg-pink-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-2 text-pink-900">
                Dismissible
              </h3>
              <p className="text-gray-700">
                Users can dismiss the sticky CTA by clicking the X button.
                This respects user preference and reduces annoyance.
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-2 text-blue-900">
                Safe Area Support
              </h3>
              <p className="text-gray-700">
                The component respects iOS safe area insets, ensuring it doesn't
                overlap with the home indicator on notched devices.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-gray-900">
            Section 3: Analytics
          </h2>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">
              Tracking Events
            </h3>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-purple-500 mr-2">•</span>
                <span>CTA clicks are tracked with location metadata</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-500 mr-2">•</span>
                <span>Dismissal events are logged for optimization</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-500 mr-2">•</span>
                <span>Timestamps help analyze user behavior patterns</span>
              </li>
            </ul>
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Dismiss Count:</strong> {dismissCount}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <strong>CTA Visible:</strong> {isVisible ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-gray-900">
            Section 4: Best Practices
          </h2>
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 mb-4">
              When implementing the mobile sticky CTA, consider these best practices:
            </p>
            <ol className="space-y-3 text-gray-700 list-decimal list-inside">
              <li>Keep the button text short (2-3 words maximum)</li>
              <li>Ensure the hero section has a unique ID for scroll detection</li>
              <li>Allow users to dismiss the CTA for better UX</li>
              <li>Track both clicks and dismissals for analytics</li>
              <li>Test on actual mobile devices, especially iOS with notches</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6 text-gray-900">
            End of Demo
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            The sticky CTA should remain visible as you scroll through all sections.
            Try dismissing it and scrolling back up to see it reappear.
          </p>
          <div className="inline-block bg-purple-100 rounded-lg p-6">
            <p className="text-purple-900 font-semibold">
              💡 Tip: Resize your browser to mobile width to see the sticky CTA
            </p>
          </div>
        </div>
      </section>

      {/* Mobile Sticky CTA */}
      <MobileStickyCTA
        label="Get Started"
        href="/register"
        isVisible={isVisible}
        onClick={handleClick}
        onDismiss={handleDismiss}
      />
    </div>
  );
}

