import React from 'react';
import { ArrowRight, Building2, CheckCircle2, UserRound, UsersRound } from 'lucide-react';

export type SegmentType = 'agent' | 'agency' | 'developer';

interface SegmentData {
  id: SegmentType;
  label: string;
  eyebrow: string;
  icon: React.ElementType;
  description: string;
  benefits: string[];
  ctaText: string;
  ctaLink: string;
  accent: {
    icon: string;
    border: string;
    wash: string;
    text: string;
    button: string;
  };
}

const segments: SegmentData[] = [
  {
    id: 'agent',
    label: 'Agent',
    eyebrow: 'Individual property business',
    icon: UserRound,
    description:
      'Manage your listings, capture property enquiries and organise follow-up in the supported Agent workspace.',
    benefits: ['Listing management', 'Property enquiry access', 'Agent follow-up tools'],
    ctaText: 'Explore Agent tools',
    ctaLink: '/advertise/sell/agents',
    accent: {
      icon: 'bg-blue-50 text-blue-700',
      border: 'border-blue-200 hover:border-blue-400',
      wash: 'bg-blue-50/60',
      text: 'text-blue-700',
      button: 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-300',
    },
  },
  {
    id: 'agency',
    label: 'Agency',
    eyebrow: 'Team and business workspace',
    icon: UsersRound,
    description:
      'Bring agency inventory, team capability, lead routing and business follow-up into one supported workspace.',
    benefits: ['Agency inventory management', 'Team and account capability', 'Lead routing'],
    ctaText: 'Explore Agency tools',
    ctaLink: '/advertise/sell/agencies',
    accent: {
      icon: 'bg-orange-50 text-orange-700',
      border: 'border-orange-200 hover:border-orange-400',
      wash: 'bg-orange-50/60',
      text: 'text-orange-700',
      button: 'bg-orange-500 hover:bg-orange-600 focus-visible:ring-orange-300',
    },
  },
  {
    id: 'developer',
    label: 'Developer',
    eyebrow: 'Development portfolio',
    icon: Building2,
    description:
      'Present development and unit inventory, capture project enquiries and manage development opportunities.',
    benefits: ['Development portfolio access', 'Unit inventory presentation', 'Project follow-up'],
    ctaText: 'Explore Developer tools',
    ctaLink: '/advertise/sell/developers',
    accent: {
      icon: 'bg-emerald-50 text-emerald-700',
      border: 'border-emerald-200 hover:border-emerald-400',
      wash: 'bg-emerald-50/60',
      text: 'text-emerald-700',
      button: 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-300',
    },
  },
];

export interface SegmentationLayerProps {
  roleContext?: SegmentType;
}

export const SegmentationLayer: React.FC<SegmentationLayerProps> = () => {
  return (
    <section
      id="audience-gateways"
      data-testid="segmentation-section"
      className="border-b border-slate-100 bg-slate-50 py-20 md:py-28"
      aria-labelledby="segmentation-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
            MVP commercial gateway
          </p>
          <h2
            id="segmentation-heading"
            className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl"
          >
            Choose how you work with Property Listify
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Three focused Launch Access paths, each connected to the business workspace and tools
            that support that way of working.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          {segments.map(segment => {
            const Icon = segment.icon;
            return (
              <article
                key={segment.id}
                data-testid="audience-gateway-card"
                data-audience={segment.id}
                className={`group flex h-full flex-col rounded-2xl border bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl md:p-8 ${segment.accent.border}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${segment.accent.icon}`}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${segment.accent.wash} ${segment.accent.text}`}
                  >
                    {segment.label}
                  </span>
                </div>
                <p
                  className={`mt-7 text-xs font-bold uppercase tracking-[0.14em] ${segment.accent.text}`}
                >
                  {segment.eyebrow}
                </p>
                <h3 className="mt-2 text-2xl font-extrabold text-slate-950 md:text-3xl">
                  For {segment.id === 'agency' ? 'Agencies' : `${segment.label}s`}
                </h3>
                <p className="mt-4 min-h-[88px] text-base leading-7 text-slate-600 md:text-lg md:leading-8">
                  {segment.description}
                </p>

                <ul className="mt-6 space-y-3 border-t border-slate-100 pt-6">
                  {segment.benefits.map(benefit => (
                    <li
                      key={benefit}
                      className="flex items-start gap-3 text-base font-medium text-slate-700"
                    >
                      <CheckCircle2
                        className={`mt-0.5 h-4 w-4 shrink-0 ${segment.accent.text}`}
                        aria-hidden="true"
                      />
                      {benefit}
                    </li>
                  ))}
                </ul>

                <a
                  href={segment.ctaLink}
                  className={`mt-8 inline-flex items-center justify-center rounded-xl px-5 py-4 text-base font-bold text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${segment.accent.button}`}
                >
                  {segment.ctaText}
                  <ArrowRight
                    className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SegmentationLayer;
