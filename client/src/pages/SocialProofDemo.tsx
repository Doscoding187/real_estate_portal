/**
 * SocialProofSection Demo Page
 * 
 * Demonstrates the SocialProofSection component with sample data
 */

import React from 'react';
import { SocialProofSection } from '@/components/advertise/SocialProofSection';
import { TrendingUp, Users, Star, Award } from 'lucide-react';

export default function SocialProofDemo() {
  const metrics = [
    {
      value: '5,000+',
      label: 'Verified Leads Generated',
      icon: TrendingUp,
      iconColor: 'green' as const,
    },
    {
      value: '10,000+',
      label: 'Properties Promoted',
      icon: Award,
      iconColor: 'blue' as const,
    },
    {
      value: '95%',
      label: 'Partner Satisfaction',
      icon: Star,
      iconColor: 'yellow' as const,
    },
    {
      value: '500+',
      label: 'Active Partners',
      icon: Users,
      iconColor: 'purple' as const,
    },
  ];

  const partnerLogos = [
    { name: 'Leading Developer', alt: 'Leading Developer Logo' },
    { name: 'Top Agency', alt: 'Top Agency Logo' },
    { name: 'Premier Bank', alt: 'Premier Bank Logo' },
    { name: 'Bond Originator', alt: 'Bond Originator Logo' },
    { name: 'Service Provider', alt: 'Service Provider Logo' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Demo Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Social Proof Section Demo</h1>
          <p className="text-xl opacity-90">
            Showcasing trust signals and key metrics
          </p>
        </div>
      </div>

      {/* Social Proof Section */}
      <SocialProofSection
        heading="Trusted by Leading Property Professionals"
        subheading="Join hundreds of successful partners who are growing their business with our platform"
        metrics={metrics}
        partnerLogos={partnerLogos}
        disclaimer="* Metrics are representative examples and will be updated with actual data"
      />

      {/* Variant: Without Logos */}
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-4 text-center">Variant: Metrics Only</h2>
        </div>
        <SocialProofSection
          heading="Our Impact in Numbers"
          metrics={metrics}
          showLogos={false}
        />
      </div>

      {/* Variant: With Count-up Animation */}
      <div className="py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-4 text-center">Variant: With Count-up Animation</h2>
        </div>
        <SocialProofSection
          heading="Real-Time Performance"
          metrics={[
            {
              value: 5234,
              label: 'Verified Leads Generated',
              icon: TrendingUp,
              iconColor: 'green',
            },
            {
              value: 12567,
              label: 'Properties Promoted',
              icon: Award,
              iconColor: 'blue',
            },
            {
              value: 487,
              label: 'Active Partners',
              icon: Users,
              iconColor: 'purple',
            },
          ]}
          showLogos={false}
        />
      </div>
    </div>
  );
}
