import React from 'react';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { Footer } from '@/components/Footer';
import { Building, Building2, UserCircle, ArrowLeft } from 'lucide-react';
import { VisualPathCard } from '@/components/advertise/VisualPathCard';
import { SEOHead } from '@/components/advertise/SEOHead';
import { Link } from 'wouter';

export default function AdvertiseSellPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEOHead
        title="Real Estate Advertising Solutions | Property Listify"
        description="Advertising and client acquisition solutions tailored for estate agents, agencies, and property developers."
        canonicalUrl="/advertise/sell"
      />
      <EnhancedNavbar />
      
      <main className="flex-1 flex flex-col pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <Link href="/advertise">
            <a className="inline-flex items-center text-slate-500 hover:text-primary mb-8 font-medium transition-colors cursor-pointer">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Advertising Hub
            </a>
          </Link>

          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">
              Real Estate Solutions
            </h1>
            <p className="text-xl text-slate-600">
              Select your profile to explore tailored lead acquisition and branding solutions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <VisualPathCard
              title="Independent Agents"
              description="Build your personal brand, control your deal flow, and get qualified buyers directly to your phone."
              icon={UserCircle}
              href="/advertise/sell/agents"
              ctaText="Explore Agent Solutions"
              benefits={[
                'Direct inquiries from qualified buyers',
                'Personal agent profile & branding',
                'Performance analytics dashboard',
                'Seamless CRM integrations',
              ]}
            />
            <VisualPathCard
              title="Agencies & Brokerages"
              description="Recruit top talent, track team conversion rates, and establish absolute territory dominance across your target suburbs."
              icon={Building2}
              href="/advertise/sell/agencies"
              ctaText="Explore Agency Solutions"
              benefits={[
                'Multi-agent team management',
                'Recruitment pipeline tools',
                'Territory brand reach tracking',
                'Agency-level analytics & reporting',
              ]}
            />
            <VisualPathCard
              title="Property Developers"
              description="Scale your off-plan sales with interactive site maps, bulk-buyer targeting, and full project lifecycle marketing."
              icon={Building}
              href="/advertise/sell/developers"
              ctaText="Explore Developer Solutions"
              benefits={[
                'Multi-unit development showcases',
                'Interactive site maps and media',
                'Investor and bulk-buyer targeting',
                'Project lifecycle marketing',
              ]}
            />
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
