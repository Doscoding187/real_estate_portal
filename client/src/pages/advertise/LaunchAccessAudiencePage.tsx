import React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, Mail, ShieldCheck } from 'lucide-react';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/advertise/SEOHead';
import { useCommercialCatalog, type CommercialProduct } from '@/hooks/useCommercialCatalog';
import {
  formatCommercialLimitLabel,
  formatCommercialLimitValue,
  getCommercialActionPresentation,
  getCommercialPricePresentation,
  getCommercialPresentationLimits,
  getCommercialTermPresentation,
} from '@/lib/commercialCatalog';

export type LaunchAudience = 'agent' | 'agency' | 'developer';

type AudienceMeta = {
  label: string;
  pluralLabel: string;
  eyebrow: string;
  description: string;
  workspaceDescription: string;
  accent: {
    text: string;
    soft: string;
    border: string;
    button: string;
    ring: string;
  };
  workspaceLinks: Array<{ label: string; href: string }>;
};

const audienceMeta: Record<LaunchAudience, AudienceMeta> = {
  agent: {
    label: 'Agent',
    pluralLabel: 'Agents',
    eyebrow: 'Agent Launch Access',
    description:
      'Publish and manage your listings, receive property enquiries and organise follow-up in the supported Agent workspace.',
    workspaceDescription:
      'Use the supported Agent tools for listings, enquiries and business follow-up.',
    accent: {
      text: 'text-blue-700',
      soft: 'bg-blue-50',
      border: 'border-blue-200',
      button: 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-300',
      ring: 'ring-blue-100',
    },
    workspaceLinks: [
      { label: 'Agent dashboard', href: '/agent/dashboard' },
      { label: 'Agent listings', href: '/agent/listings' },
      { label: 'Agent enquiries', href: '/agent/leads' },
    ],
  },
  agency: {
    label: 'Agency',
    pluralLabel: 'Agencies',
    eyebrow: 'Agency Launch Access',
    description:
      'Bring agency inventory, team capability, lead routing and business follow-up into one supported Agency workspace.',
    workspaceDescription:
      'Use the supported Agency tools for inventory, team work and routed enquiries.',
    accent: {
      text: 'text-orange-700',
      soft: 'bg-orange-50',
      border: 'border-orange-200',
      button: 'bg-orange-500 hover:bg-orange-600 focus-visible:ring-orange-300',
      ring: 'ring-orange-100',
    },
    workspaceLinks: [
      { label: 'Agency overview', href: '/agency/overview' },
      { label: 'Agency team', href: '/agency/team' },
      { label: 'Agency enquiries', href: '/agency/leads' },
    ],
  },
  developer: {
    label: 'Developer',
    pluralLabel: 'Developers',
    eyebrow: 'Developer Launch Access',
    description:
      'Present your development portfolio and unit inventory, participate in property discovery, capture project enquiries and manage development opportunities.',
    workspaceDescription:
      'Use the supported Developer tools for portfolio, development and enquiry activity.',
    accent: {
      text: 'text-emerald-700',
      soft: 'bg-emerald-50',
      border: 'border-emerald-200',
      button: 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-300',
      ring: 'ring-emerald-100',
    },
    workspaceLinks: [
      { label: 'Developer dashboard', href: '/developer/dashboard' },
      { label: 'Developer portfolio', href: '/developer/developments' },
      { label: 'Developer enquiries', href: '/developer/leads' },
    ],
  },
};

function ProductSummary({
  audience,
  product,
}: {
  audience: LaunchAudience;
  product?: CommercialProduct;
}) {
  const meta = audienceMeta[audience];

  if (!product) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-700">
          Current Launch Access details are loading.
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Contact Property Listify for an assisted commercial conversation.
        </p>
        <a
          href="/contact"
          className={`mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white ${meta.accent.button}`}
        >
          Contact Property Listify
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    );
  }

  const price = getCommercialPricePresentation(product);
  const term = getCommercialTermPresentation(product);
  const action = getCommercialActionPresentation(product);
  const limits = getCommercialPresentationLimits(product);

  return (
    <div
      className={`overflow-hidden rounded-3xl border ${meta.accent.border} bg-white shadow-xl shadow-slate-200/70 ring-8 ${meta.accent.ring}`}
    >
      <div className={`border-b ${meta.accent.border} ${meta.accent.soft} px-6 py-5 md:px-8`}>
        <div className="flex items-center justify-between gap-4">
          <p className={`text-xs font-bold uppercase tracking-[0.16em] ${meta.accent.text}`}>
            {meta.eyebrow}
          </p>
          <ShieldCheck className={`h-5 w-5 ${meta.accent.text}`} aria-hidden="true" />
        </div>
        <h2 className="mt-3 text-2xl font-extrabold text-slate-950">{product.displayName}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{product.description}</p>
      </div>

      <div className="p-6 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Once-off launch fee
            </p>
            <p className="mt-2 text-4xl font-extrabold tracking-tight text-slate-950">
              {price.label}
            </p>
            {price.period && (
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {price.period.replace(/^\s+/, '')}
              </p>
            )}
          </div>
          <div
            className={`rounded-xl border ${meta.accent.border} ${meta.accent.soft} px-4 py-3 text-right`}
          >
            <p className="text-xs font-semibold text-slate-500">Access term</p>
            <p className={`mt-1 text-lg font-extrabold ${meta.accent.text}`}>{term.label}</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {product.benefits.filter(Boolean).map(benefit => (
            <div
              key={benefit}
              className="flex items-start gap-3 text-sm font-medium text-slate-700"
            >
              <CheckCircle2
                className={`mt-0.5 h-4 w-4 shrink-0 ${meta.accent.text}`}
                aria-hidden="true"
              />
              {benefit}
            </div>
          ))}
          {limits.map(([key, value]) => (
            <div key={key} className="flex items-start gap-3 text-sm font-medium text-slate-700">
              <CheckCircle2
                className={`mt-0.5 h-4 w-4 shrink-0 ${meta.accent.text}`}
                aria-hidden="true"
              />
              {formatCommercialLimitLabel(key)}: {formatCommercialLimitValue(value)}
            </div>
          ))}
        </div>

        <div className="mt-7 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
          Finance-verified manual EFT activation. {term.renewalLabel || 'No automatic renewal.'}
        </div>

        {action.href ? (
          <a
            href={action.href}
            className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${meta.accent.button}`}
          >
            {action.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        ) : (
          <span className="mt-6 block rounded-xl bg-slate-100 px-5 py-3.5 text-center text-sm font-bold text-slate-500">
            {action.label}
          </span>
        )}
        <p className="mt-3 text-center text-xs leading-5 text-slate-500">
          Requesting an invoice starts an assisted commercial conversation; it is not instant
          checkout.
        </p>
      </div>
    </div>
  );
}

export default function LaunchAccessAudiencePage({ audience }: { audience: LaunchAudience }) {
  const meta = audienceMeta[audience];
  const { data: catalog, isLoading } = useCommercialCatalog(audience);
  const product = catalog?.products.find(item => item.audience === audience);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SEOHead
        title={`${meta.eyebrow} | Property Listify`}
        description={meta.description}
        canonicalUrl={`/advertise/sell/${audience === 'agent' ? 'agents' : audience === 'agency' ? 'agencies' : 'developers'}`}
      />
      <EnhancedNavbar />

      <main id="main-content" className="flex-1">
        <section className="border-b border-slate-100 bg-slate-50 py-12 md:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <a
              href="/advertise"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Advertise
            </a>

            <div className="mt-10 grid items-center gap-12 lg:grid-cols-[1fr_.9fr] lg:gap-20">
              <div className="max-w-2xl">
                <p className={`text-xs font-bold uppercase tracking-[0.18em] ${meta.accent.text}`}>
                  For {meta.pluralLabel}
                </p>
                <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-slate-950 md:text-6xl">
                  {audience === 'agent' && (
                    <>
                      A clearer path from listing to{' '}
                      <span className={meta.accent.text}>follow-up.</span>
                    </>
                  )}
                  {audience === 'agency' && (
                    <>
                      Bring your agency inventory and{' '}
                      <span className={meta.accent.text}>follow-up together.</span>
                    </>
                  )}
                  {audience === 'developer' && (
                    <>
                      Present your development portfolio with a clearer{' '}
                      <span className={meta.accent.text}>enquiry path.</span>
                    </>
                  )}
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">{meta.description}</p>
                <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold text-slate-600">
                  <span className="rounded-full border border-slate-200 bg-white px-4 py-2">
                    90-Day Launch Access
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-4 py-2">
                    Once-off pricing
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-4 py-2">
                    Manual EFT
                  </span>
                </div>
              </div>

              <div className="min-w-0">
                {isLoading ? (
                  <div
                    className="h-[520px] animate-pulse rounded-3xl border border-slate-200 bg-white"
                    aria-label="Loading Launch Access details"
                  />
                ) : (
                  <ProductSummary audience={audience} product={product} />
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-100 bg-white py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
              <div>
                <p className={`text-xs font-bold uppercase tracking-[0.16em] ${meta.accent.text}`}>
                  Your supported workspace
                </p>
                <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">
                  A product path you can actually use.
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  {meta.workspaceDescription}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {meta.workspaceLinks.map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md"
                  >
                    <ExternalLink className={`h-5 w-5 ${meta.accent.text}`} aria-hidden="true" />
                    <span className="mt-5 block text-sm font-bold text-slate-900">
                      {link.label}
                    </span>
                    <span className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-500 group-hover:text-slate-900">
                      Open workspace <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-50 py-16 md:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <Mail className={`mx-auto h-7 w-7 ${meta.accent.text}`} aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-extrabold text-slate-950 md:text-3xl">
              Want to talk through your launch?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Contact Property Listify for a custom conversation or help choosing the supported
              Launch Access path for your business.
            </p>
            <a
              href="/contact"
              className={`mt-7 inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${meta.accent.button}`}
            >
              Contact Property Listify
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
