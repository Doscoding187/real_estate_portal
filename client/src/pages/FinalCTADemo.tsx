/**
 * FinalCTASection Demo Page
 * 
 * Demonstrates the FinalCTASection component with example content.
 */

import React from 'react';
import { FinalCTASection } from '@/components/advertise/FinalCTASection';

export default function FinalCTADemo() {
  const handlePrimaryCTA = () => {
    console.log('Primary CTA clicked: Get Started');
    alert('Navigating to registration...');
  };

  const handleSecondaryCTA = () => {
    console.log('Secondary CTA clicked: Request a Demo');
    alert('Navigating to contact form...');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Spacer to simulate page content */}
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Scroll Down to See Final CTA Section
          </h1>
          <p className="text-lg text-gray-600">
            This simulates the end of the landing page
          </p>
        </div>
      </div>

      {/* Final CTA Section - Example 1 */}
      <FinalCTASection
        headline="Ready to Reach High-Intent Property Buyers?"
        subtext="Join thousands of successful partners who are growing their business with our platform. Get started today or schedule a demo to learn more."
        primaryCTA={{
          label: "Get Started",
          href: "/register",
          onClick: handlePrimaryCTA,
        }}
        secondaryCTA={{
          label: "Request a Demo",
          href: "/contact",
          onClick: handleSecondaryCTA,
        }}
      />

      {/* Spacer */}
      <div className="h-32 bg-white" />

      {/* Final CTA Section - Example 2 (Alternative Copy) */}
      <FinalCTASection
        headline="Start Advertising Today"
        subtext="No credit card required. Set up your profile in minutes and start reaching verified property seekers across South Africa."
        primaryCTA={{
          label: "Create Free Account",
          href: "/register",
          onClick: handlePrimaryCTA,
        }}
        secondaryCTA={{
          label: "View Pricing",
          href: "/pricing",
          onClick: handleSecondaryCTA,
        }}
      />

      {/* Spacer */}
      <div className="h-32 bg-white" />

      {/* Final CTA Section - Example 3 (Urgency-focused) */}
      <FinalCTASection
        headline="Don't Miss Out on Qualified Leads"
        subtext="Over 10,000 verified property seekers use our platform daily. Start capturing leads and growing your business today."
        primaryCTA={{
          label: "Get Started Now",
          href: "/register",
          onClick: handlePrimaryCTA,
        }}
        secondaryCTA={{
          label: "Learn More",
          href: "/about",
          onClick: handleSecondaryCTA,
        }}
      />

      {/* Footer spacer */}
      <div className="h-20 bg-gray-50" />
    </div>
  );
}

