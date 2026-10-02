import React from 'react';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { Footer } from '@/components/Footer';
import { Building2, UserRound, UsersRound, ArrowLeft } from 'lucide-react';
import { CommercialActivationNotice } from '@/components/commercial/CommercialActivationNotice';
import { VisualPathCard } from '@/components/advertise/VisualPathCard';
import { SEOHead } from '@/components/advertise/SEOHead';
import { Link } from 'wouter';
import { COMMERCIAL_ACTIVATION_STATE } from '@shared/commercialActivation';

export function CommercialAdvertiseSellPage() {
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

function PreparationAdvertiseSellPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <SEOHead
        title="Choose your preparation path | Property Listify"
        description="Choose the Property Listify preparation path for an Agent, Agency, or Developer business before commercial activation."
        canonicalUrl="/advertise/sell"
      />
      <EnhancedNavbar />

      <main className="flex flex-1 flex-col pb-16">
        <div className="container mx-auto max-w-7xl px-4">
          <Link href="/advertise">
            <a className="mb-8 inline-flex cursor-pointer items-center text-slate-500 transition-colors hover:text-primary">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to preparation paths
            </a>
          </Link>

          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
              Choose your Property Listify preparation path
            </h1>
            <p className="text-xl text-slate-600">
              Establish your role-specific presence and prepare private inventory before commercial
              activation.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-3xl">
            <CommercialActivationNotice />
          </div>

          <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
            <VisualPathCard
              title="For Agents"
              description="Complete the available Agent setup and prepare private listing drafts."
              icon={UserRound}
              href="/advertise/sell/agents"
              ctaText="Start Agent preparation"
              benefits={[
                'Professional profile preparation',
                'Canonical coverage setup',
                'Private listing drafts',
              ]}
            />
            <VisualPathCard
              title="For Agencies"
              description="Establish an Agency owner account, identity, and private inventory workspace."
              icon={UsersRound}
              href="/advertise/sell/agencies"
              ctaText="Start Agency preparation"
              benefits={[
                'Agency owner account',
                'Business identity preparation',
                'Private inventory workspace',
              ]}
            />
            <VisualPathCard
              title="For Developers"
              description="Establish your Developer organisation for review and prepare private development drafts."
              icon={Building2}
              href="/advertise/sell/developers"
              ctaText="Start Developer preparation"
              benefits={[
                'Developer organisation setup',
                'Organisation review state',
                'Private development drafts',
              ]}
            />
          </div>

          <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm leading-7 text-slate-700">
            Marketplace publication, paid commercial access, and new marketplace opportunities
            remain protected by their existing approval and activation requirements.
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function AdvertiseSellPage() {
  return COMMERCIAL_ACTIVATION_STATE.enabled ? (
    <CommercialAdvertiseSellPage />
  ) : (
    <PreparationAdvertiseSellPage />
  );
}
