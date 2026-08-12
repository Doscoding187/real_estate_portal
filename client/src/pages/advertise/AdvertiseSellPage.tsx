import React from 'react';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { Footer } from '@/components/Footer';
import { Building2, UserRound, UsersRound, ArrowLeft } from 'lucide-react';
import { VisualPathCard } from '@/components/advertise/VisualPathCard';
import { SEOHead } from '@/components/advertise/SEOHead';
import { Link } from 'wouter';

export default function AdvertiseSellPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEOHead
        title="Choose Your Launch Access | Property Listify"
        description="Choose the Property Listify Launch Access path for an Agent, Agency or Developer business."
        canonicalUrl="/advertise/sell"
      />
      <EnhancedNavbar />

      <main className="flex flex-1 flex-col pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <Link href="/advertise">
            <a className="inline-flex items-center text-slate-500 hover:text-primary mb-8 font-medium transition-colors cursor-pointer">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Advertising Hub
            </a>
          </Link>

          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">
              Choose your Property Listify workspace
            </h1>
            <p className="text-xl text-slate-600">
              Choose one of three focused commercial paths. Each connects inventory, discovery,
              enquiries and business follow-up.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <VisualPathCard
              title="For Agents"
              description="Manage listings, capture property enquiries and organise follow-up in the supported Agent workspace."
              icon={UserRound}
              href="/advertise/sell/agents"
              ctaText="Explore Agent tools"
              benefits={['Listing management', 'Property enquiry access', 'Agent follow-up tools']}
            />
            <VisualPathCard
              title="For Agencies"
              description="Bring agency inventory, team capability, lead routing and business follow-up into one supported workspace."
              icon={UsersRound}
              href="/advertise/sell/agencies"
              ctaText="Explore Agency tools"
              benefits={[
                'Agency inventory management',
                'Team and account capability',
                'Lead routing',
              ]}
            />
            <VisualPathCard
              title="For Developers"
              description="Present development and unit inventory, capture project enquiries and manage development opportunities."
              icon={Building2}
              href="/advertise/sell/developers"
              ctaText="Explore Developer tools"
              benefits={[
                'Development portfolio access',
                'Unit inventory presentation',
                'Project follow-up',
              ]}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
