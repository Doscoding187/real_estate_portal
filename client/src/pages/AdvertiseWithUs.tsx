import React from 'react';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/advertise/SEOHead';
import { StructuredData } from '@/components/advertise/StructuredData';
import { Building2, Landmark, Wrench } from 'lucide-react';
import { VisualPathCard } from '@/components/advertise/VisualPathCard';

export default function AdvertiseWithUs() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEOHead
        title="Advertise With Us | Property Platform"
        description="Select your industry to explore tailored advertising and acquisition solutions on South Africa's fastest-growing property platform."
        canonicalUrl="https://platform.com/advertise"
      />
      <StructuredData
        pageUrl="https://platform.com/advertise"
        organizationName="Property Platform"
      />

      <EnhancedNavbar />

      <main className="flex-1 flex flex-col pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">
              Partner with the leading <br className="hidden sm:block" />
              property network
            </h1>
            <p className="text-xl text-slate-600">
              Select your industry to explore tailored advertising and client acquisition solutions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <VisualPathCard
              title="Real Estate"
              description="For Agencies, Independent Agents, and Property Developers looking to reach verified, high-intent buyers and renters."
              icon={Building2}
              href="/advertise/sell"
              ctaText="Explore Real Estate Solutions"
              benefits={[
                'High-intent buyer & renter leads',
                'Premium spotlight placements',
                'Advanced performance analytics',
                'Brand trust verification',
              ]}
            />
            
            <VisualPathCard
              title="Financial Services"
              description="For Retail Banks, Bond Originators, and Bridging Financiers seeking to connect with pre-qualified applicants."
              icon={Landmark}
              href="/advertise/finance"
              ctaText="Explore Financial Solutions"
              benefits={[
                'Exclusive pre-qualification leads',
                'Contextual financing placements',
                'Integrated affordability calculators',
                'Direct-to-buyer financial routing',
              ]}
            />

            <VisualPathCard
              title="Home Services"
              description="For Movers, Contractors, Legal Professionals, and Property Managers looking for direct service requests."
              icon={Wrench}
              href="/advertise/services"
              ctaText="Explore Service Solutions"
              benefits={[
                'Direct service request leads',
                'Verified business profiles',
                'Customer review management',
                'High-visibility directory listings',
              ]}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
