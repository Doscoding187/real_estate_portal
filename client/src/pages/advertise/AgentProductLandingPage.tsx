import React from 'react';
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  BellRing,
  BriefcaseBusiness,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Inbox,
  ListChecks,
  MapPin,
  MessageSquareText,
  PhoneCall,
  Route,
  Search,
  ShieldCheck,
  UserRound,
  Workflow,
} from 'lucide-react';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/advertise/SEOHead';
import { AgentWorkspacePreview } from './AgentWorkspacePreview';
import { useCommercialCatalog, type CommercialProduct } from '@/hooks/useCommercialCatalog';
import {
  formatCommercialLimitLabel,
  formatCommercialLimitValue,
  getCommercialActionPresentation,
  getCommercialPricePresentation,
  getCommercialPresentationLimits,
  getCommercialTermPresentation,
} from '@/lib/commercialCatalog';
import { COMMERCIAL_HERO_CLASS } from './commercialHero';

type AgentCapability = {
  label: string;
  title: string;
  description: string;
  href: string;
  icon: typeof ListChecks;
  matches: readonly string[];
};

const AGENT_CAPABILITIES: readonly AgentCapability[] = [
  {
    label: 'Listings',
    title: 'Keep your inventory under control.',
    description:
      'Create, manage and keep sight of the active properties behind your day-to-day work.',
    href: '/agent/listings',
    icon: ListChecks,
    matches: ['listing'],
  },
  {
    label: 'Enquiries',
    title: 'Keep interest connected to the property.',
    description:
      'See what a prospect is asking about so the next conversation starts with useful context.',
    href: '/agent/leads',
    icon: Inbox,
    matches: ['lead', 'enquir'],
  },
  {
    label: 'Follow-up',
    title: 'Know what needs attention next.',
    description:
      'Use supported activity and productivity views to keep the work after the enquiry visible.',
    href: '/agent/productivity',
    icon: BellRing,
    matches: [],
  },
  {
    label: 'Agent profile',
    title: 'Build a professional Property Listify presence.',
    description:
      'Connect your public Agent identity to the inventory and work you bring to the marketplace.',
    href: '/agent/settings',
    icon: UserRound,
    matches: ['profile', 'directory'],
  },
  {
    label: 'Analytics',
    title: 'See more of what is happening.',
    description:
      'Use the supported analytics and reporting views to learn what is moving across your work.',
    href: '/agent/analytics',
    icon: BarChart3,
    matches: ['analytic', 'report'],
  },
];

const JOURNEY_STEPS = [
  {
    label: 'List',
    title: 'Publish and manage inventory',
    description: 'Keep the properties behind your business organised and visible.',
    icon: ListChecks,
  },
  {
    label: 'Get discovered',
    title: 'Participate in normal discovery',
    description: 'Your listings become part of Property Listify discovery surfaces.',
    icon: MapPin,
  },
  {
    label: 'Receive enquiries',
    title: 'Bring interest back with context',
    description: 'Know which property prompted the conversation where supported.',
    icon: MessageSquareText,
  },
  {
    label: 'Follow up',
    title: 'Keep the next action visible',
    description: 'Stay closer to the work between a new enquiry and the next conversation.',
    icon: BellRing,
  },
  {
    label: 'Progress the opportunity',
    title: 'Move the relationship forward',
    description: 'Use the supported workflow for viewings, offers and continued follow-up.',
    icon: Workflow,
  },
] as const;

const FAQS = [
  {
    question: 'What is Agent Launch Access?',
    answer:
      'Agent Launch Access is a paid, once-off introductory term that gives you 90 days of the strongest supported Agent workspace available in Property Listify. It is designed to give you enough time to use the product against real inventory and business activity.',
  },
  {
    question: 'Is the Launch Access price monthly?',
    answer:
      'No. The catalog price is for the complete 90-day Launch Access period. It is not a monthly subscription and it does not become a permanent locked-in renewal price.',
  },
  {
    question: 'When do my 90 days begin?',
    answer:
      'Your 90 days begin only after Property Listify finance verifies your manual EFT payment. Requesting an invoice or uploading payment proof does not activate access.',
  },
  {
    question: 'How many active listings can I manage?',
    answer:
      'The current Agent Launch Access safeguard is up to 50 active listings. Normal ownership, profile, verification, publication-quality and anti-abuse rules still apply.',
  },
  {
    question: 'Can Property Listify guarantee enquiries, leads or sales?',
    answer:
      'No. Property Listify provides the product, discovery surfaces and supported enquiry workflows. Demand depends on your inventory, pricing, location and buyer behaviour, so we do not promise a specific result.',
  },
  {
    question: 'What happens after 90 days?',
    answer:
      'Launch Access expires without automatic renewal. A future normal Agent commercial product will be required for continued access after the launch period; its price and structure are not being promised here.',
  },
  {
    question: 'How do I pay?',
    answer:
      'Request an invoice, pay by manual EFT and submit the payment proof through the supported assisted process. Finance verification is the activation authority.',
  },
  {
    question: 'Can I speak to Property Listify first?',
    answer:
      'Yes. Use the Contact Property Listify route if you want to ask questions or have an assisted conversation before requesting Launch Access.',
  },
] as const;

function hasMatchingBenefit(product: CommercialProduct, matches: readonly string[]) {
  if (!matches.length) return true;
  const benefits = product.benefits.map(benefit => benefit.toLowerCase());
  return matches.some(match => benefits.some(benefit => benefit.includes(match)));
}

function formatLimit(value: unknown) {
  return formatCommercialLimitValue(value);
}

function SectionIntro({
  eyebrow,
  title,
  children,
  align = 'left',
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  align?: 'left' | 'center';
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl'}>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-blue)]">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-3xl font-bold leading-tight tracking-[-0.045em] text-slate-950 md:text-5xl">
        {title}
      </h2>
      <p className="mt-5 text-base leading-8 text-slate-600 md:text-lg">{children}</p>
    </div>
  );
}

function AgentWorkflow() {
  return (
    <div className="mt-12 grid gap-5 md:grid-cols-5">
      {JOURNEY_STEPS.map((step, index) => {
        const Icon = step.icon;
        return (
          <div key={step.label} className="relative md:pr-1">
            <div className="flex h-full flex-col rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[var(--brand-blue)]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="font-mono text-xs font-semibold text-slate-400">0{index + 1}</span>
              </div>
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-[var(--brand-blue)]">
                {step.label}
              </p>
              <h3 className="mt-3 text-xl font-bold leading-tight text-slate-950 md:min-h-[3.5rem]">
                {step.title}
              </h3>
              <p className="mt-4 flex-1 text-sm leading-7 text-slate-600 md:min-h-[5.5rem]">
                {step.description}
              </p>
            </div>
            {index < JOURNEY_STEPS.length - 1 ? (
              <span className="absolute -right-3.5 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-blue-100 bg-white text-[var(--brand-blue)] shadow-sm md:flex">
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function CapabilityCard({
  capability,
  included,
}: {
  capability: AgentCapability;
  included: boolean;
}) {
  const Icon = capability.icon;
  return (
    <article className="group flex h-full flex-col rounded-[26px] border border-slate-200 bg-white p-7 shadow-[0_16px_45px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_24px_60px_rgba(37,99,235,0.12)]">
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[var(--brand-blue)]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
          {included ? 'Launch Access' : 'Supported workspace'}
        </span>
      </div>
      <p className="mt-6 text-xs font-bold uppercase tracking-[0.17em] text-slate-500">
        {capability.label}
      </p>
      <h3 className="mt-3 text-2xl font-bold leading-tight tracking-[-0.03em] text-slate-950">
        {capability.title}
      </h3>
      <p className="mt-4 flex-1 text-sm leading-8 text-slate-600">{capability.description}</p>
      <a
        href={capability.href}
        className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-slate-950 underline decoration-slate-300 underline-offset-4 transition group-hover:decoration-slate-950"
      >
        Explore {capability.label.toLowerCase()}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </a>
    </article>
  );
}

function LaunchAccessCard({ product }: { product?: CommercialProduct }) {
  if (!product) {
    return (
      <div className="rounded-[30px] border border-slate-200 bg-white p-7 text-slate-950 shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-blue)]">
          Agent Launch Access
        </p>
        <h3 className="mt-4 text-3xl font-bold">Commercial details unavailable</h3>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          The canonical Agent product is not available right now. Contact Property Listify for an
          assisted conversation instead of relying on an old price.
        </p>
        <a
          href="/contact"
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--conversion)] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[var(--conversion-hover)]"
        >
          Contact Property Listify <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    );
  }

  const price = getCommercialPricePresentation(product);
  const term = getCommercialTermPresentation(product);
  const action = getCommercialActionPresentation(product);
  const limits = getCommercialPresentationLimits(product);
  const actionHref =
    product.productKey === 'agent_launch_access'
      ? '/agent/select-package'
      : action.href || '/contact';

  return (
    <div
      data-testid="agent-launch-access-card"
      className="rounded-[30px] border border-blue-200 bg-white p-7 shadow-[0_30px_90px_rgba(15,23,42,0.18)] md:p-9"
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-blue)]">
            Agent Launch Access
          </p>
          <h3 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-slate-950">
            {product.displayName}
          </h3>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--brand-blue)]">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Once-off</p>
          <p className="mt-2 font-mono text-5xl font-semibold tracking-[-0.06em] text-slate-950">
            {price.label}
          </p>
          {price.period ? (
            <p className="mt-1 text-sm font-semibold text-slate-500">{price.period.trim()}</p>
          ) : null}
        </div>
        <div className="rounded-2xl bg-blue-50 px-4 py-3 text-right">
          <p className="text-xs font-semibold text-slate-500">Access period</p>
          <p className="mt-1 text-xl font-extrabold text-[var(--brand-blue)]">{term.label}</p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {product.benefits.map(benefit => (
          <div key={benefit} className="flex items-start gap-2.5 text-sm leading-6 text-slate-700">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-[var(--brand-blue)]">
              <Check className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>{benefit}</span>
          </div>
        ))}
        {limits.map(([key, value]) => (
          <div key={key} className="flex items-start gap-2.5 text-sm leading-6 text-slate-700">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-[var(--brand-blue)]">
              <Check className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>
              {formatCommercialLimitLabel(key)}: {formatLimit(value)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl bg-slate-50 px-5 py-5 text-sm leading-6 text-slate-600">
        <p className="font-semibold text-slate-800">How activation works</p>
        <p className="mt-2">
          Request an invoice, pay by manual EFT and submit proof. Finance verification starts the
          {` ${term.label.toLowerCase()}`} period.{' '}
          {term.renewalLabel || 'There is no automatic renewal.'}
        </p>
      </div>

      <a
        href={actionHref}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--conversion)] px-5 py-4 text-sm font-bold text-white shadow-lg shadow-orange-900/15 transition hover:bg-[var(--conversion-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
      >
        {action.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </a>
      <p className="mt-4 text-center text-xs leading-5 text-slate-500">
        Requesting an invoice is not instant checkout and does not activate access.
      </p>
    </div>
  );
}

function FaqSection() {
  return (
    <section id="agent-faq" className="border-t border-slate-200 bg-white py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionIntro
          align="center"
          eyebrow="Agent questions"
          title="Clear answers before you decide."
        >
          Launch Access is deliberately straightforward: a fixed 90-day period, assisted payment,
          and no promise of guaranteed market results.
        </SectionIntro>
        <div className="mt-12 divide-y divide-slate-200 rounded-[28px] border border-slate-200 bg-slate-50 px-5 sm:px-8 lg:px-10">
          {FAQS.map(item => (
            <details key={item.question} className="group py-7">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left text-base font-bold text-slate-950 sm:text-lg [&::-webkit-details-marker]:hidden">
                {item.question}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[var(--brand-blue)] shadow-sm">
                  <ArrowDown
                    className="h-4 w-4 transition group-open:rotate-180"
                    aria-hidden="true"
                  />
                </span>
              </summary>
              <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function AgentProductLandingPage() {
  const catalog = useCommercialCatalog('agent');
  const product = catalog.data?.products.find(
    item => item.productKey === 'agent_launch_access' && item.term.kind === 'paid_launch_access',
  );
  const price = product ? getCommercialPricePresentation(product) : null;
  const term = product ? getCommercialTermPresentation(product) : null;
  const listingLimit = product?.limits.max_active_listings;

  return (
    <div className="min-h-screen bg-[var(--surface)] text-slate-950">
      <SEOHead
        title="Property Listify for Agents | Listings, Enquiries & Follow-Up"
        description="Property Listify helps South African property agents manage listings, enquiries and follow-up in one connected workspace. Explore 90-Day Agent Launch Access."
        canonicalUrl="/advertise/sell/agents"
      />
      <EnhancedNavbar />

      <main id="main-content">
        <section data-commercial-hero="true" className={COMMERCIAL_HERO_CLASS}>
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(0,92,168,0.28),transparent_34%)]"
            aria-hidden="true"
          />
          <div className="mx-auto max-w-screen-2xl px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pb-32 lg:pt-14">
            <a
              href="/advertise"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white"
            >
              <ArrowRight className="h-4 w-4 rotate-180" aria-hidden="true" />
              Back to Advertise
            </a>

            <div className="mt-14 grid items-center gap-12 xl:grid-cols-[.82fr_1.18fr] xl:gap-14 2xl:gap-16">
              <div className="relative z-10 max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-300">
                  For independent property agents
                </p>
                <h1 className="mt-6 font-serif text-5xl font-semibold leading-[1.03] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
                  Run your listings, enquiries and follow-ups from one place.
                </h1>
                <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl sm:leading-9">
                  Property Listify helps bring the work around every listing into one connected
                  Agent workspace — from managing inventory and participating in discovery to
                  keeping property interest and the next action in view.
                </p>
                <div className="mt-9 flex flex-wrap gap-3">
                  <a
                    href="#agent-workspace"
                    className="inline-flex items-center gap-2 rounded-2xl bg-[var(--conversion)] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-950/25 transition hover:bg-[var(--conversion-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    Explore the Agent workspace{' '}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                  <a
                    href="#launch-access"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/35 bg-white/10 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:border-white/60 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    View Launch Access <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
                <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold text-slate-300">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2">
                    <CircleDollarSign
                      className="h-4 w-4 shrink-0 text-orange-300"
                      aria-hidden="true"
                    />
                    <span>{price?.label || 'Catalog pricing'} once-off</span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2">
                    <Clock3 className="h-4 w-4 shrink-0 text-blue-200" aria-hidden="true" />
                    <span>{term?.label || '90 days'}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2">
                    <ListChecks className="h-4 w-4 shrink-0 text-blue-200" aria-hidden="true" />
                    <span>
                      {listingLimit
                        ? `Up to ${formatLimit(listingLimit)} active listings`
                        : 'Supported Agent workspace'}
                    </span>
                  </span>
                </div>
              </div>

              <div className="relative min-w-0 xl:mr-[calc(-1*max(0px,calc((100vw-96rem)/2+1rem)))] xl:translate-x-32 xl:w-[calc(100%+max(0px,calc((100vw-96rem)/2+1rem)))]">
                <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
                <AgentWorkspacePreview compact />
              </div>
            </div>
          </div>
        </section>

        <section id="agent-workflow" className="border-b border-slate-200 bg-white py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionIntro
              eyebrow="The agent work"
              title="There is more work behind every listing than publishing it."
            >
              Property Listify is designed around the connected flow that follows: inventory,
              discovery, enquiries, follow-up and the opportunity that may come from the next
              conversation.
            </SectionIntro>
            <AgentWorkflow />
          </div>
        </section>

        <section id="agent-problems" className="bg-[var(--surface)] py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionIntro
              align="center"
              eyebrow="Built around the work"
              title="A clearer operating picture for the parts of the job that happen between listings."
            >
              The work is complex. Property Listify helps bring more of it into a connected flow
              without pretending that the platform controls the market or the outcome.
            </SectionIntro>
            <div className="mt-12 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              {[
                {
                  icon: MessageSquareText,
                  eyebrow: 'Common challenge',
                  title: 'Keep interest connected',
                  text: 'Property context matters. See what a prospect is asking about before the next conversation where the workflow supports it.',
                },
                {
                  icon: BellRing,
                  eyebrow: 'Common challenge',
                  title: 'Keep follow-up visible',
                  text: 'The opportunity often lives between enquiry, response, viewing and the next action. Keep that work easier to see.',
                },
                {
                  icon: ClipboardCheck,
                  eyebrow: 'Common challenge',
                  title: 'Know what needs attention',
                  text: 'Use supported workspace and productivity views instead of reconstructing the day from disconnected messages and memory.',
                },
                {
                  icon: BarChart3,
                  eyebrow: 'Common challenge',
                  title: 'See the business picture',
                  text: 'Where supported, activity and analytics views help you understand more than whether a listing is online.',
                },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="grid gap-4 border-b border-slate-200 p-6 last:border-b-0 md:grid-cols-[minmax(12rem,.65fr)_auto_minmax(0,1.35fr)] md:items-center md:gap-8 md:px-8 md:py-7"
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--brand-blue)]">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                          {item.eyebrow}
                        </p>
                        <h3 className="mt-1 text-lg font-bold leading-tight text-slate-950 md:text-xl">
                          {item.title}
                        </h3>
                      </div>
                    </div>
                    <span className="mx-auto flex h-8 w-8 rotate-90 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-[var(--brand-blue)] md:mx-0 md:rotate-0">
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[var(--brand-blue)]">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <p className="text-sm leading-7 text-slate-600">{item.text}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="agent-workspace" className="border-y border-slate-200 bg-white py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionIntro
              eyebrow="One connected workspace"
              title="Tools for the work behind every listing."
            >
              The current Agent experience brings together the supported tools that help you
              organise inventory, respond to interest, keep follow-up visible and understand
              activity across your work.
            </SectionIntro>
            <div className="mt-12">
              <AgentWorkspacePreview />
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {AGENT_CAPABILITIES.map(capability => {
                const included = product
                  ? hasMatchingBenefit(product, capability.matches) ||
                    capability.matches.length === 0
                  : false;
                return (
                  <CapabilityCard
                    key={capability.label}
                    capability={capability}
                    included={included}
                  />
                );
              })}
            </div>
          </div>
        </section>

        <section id="agent-discovery" className="bg-[var(--surface)] py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionIntro
              align="center"
              eyebrow="From listing to opportunity"
              title="Your listings do not sit in isolation."
            >
              They participate in normal Property Listify discovery, where property seekers can
              encounter inventory and express interest through the supported platform journey.
            </SectionIntro>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              <article className="flex h-full flex-col rounded-[26px] border border-slate-200 bg-white p-7 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[var(--brand-blue)]">
                  <Search className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-2xl font-bold text-slate-950">Normal discovery</h3>
                <p className="mt-4 flex-1 text-sm leading-7 text-slate-600">
                  Inventory can participate in the platform&apos;s organic search and discovery
                  experiences according to normal product rules.
                </p>
                <a
                  href="/explore"
                  className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-slate-950"
                >
                  Explore Property Listify <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </article>
              <article className="flex h-full flex-col rounded-[26px] border border-slate-200 bg-white p-7 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Route className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-2xl font-bold text-slate-950">Property context</h3>
                <p className="mt-4 flex-1 text-sm leading-7 text-slate-600">
                  The value of an enquiry is clearer when the Agent can see which listing or work
                  context prompted the conversation.
                </p>
                <a
                  href="/agent/leads"
                  className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-slate-950"
                >
                  See enquiry workspace <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </article>
              <article className="flex h-full flex-col rounded-[26px] border border-slate-200 bg-white p-7 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-700">
                  <PhoneCall className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-2xl font-bold text-slate-950">The next conversation</h3>
                <p className="mt-4 flex-1 text-sm leading-7 text-slate-600">
                  Property Listify helps keep the work after an enquiry visible where the current
                  Agent workflow supports follow-up and activity.
                </p>
                <a
                  href="/agent/productivity"
                  className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-slate-950"
                >
                  See productivity tools <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </article>
            </div>

            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-950">
              <ShieldCheck
                className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-blue)]"
                aria-hidden="true"
              />
              <p>
                Launch Access does not buy search priority, sponsored placement, guaranteed traffic
                or guaranteed leads. Search remains organic and product rules remain in force.
              </p>
            </div>
          </div>
        </section>

        <section
          id="agent-business-visibility"
          className="border-t border-slate-200 bg-white py-24 md:py-32"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-[1fr_.9fr] lg:gap-20">
              <div>
                <SectionIntro
                  eyebrow="Beyond publishing"
                  title="See more of what is happening across your work."
                >
                  A listing being online is only the beginning. The supported Agent workspace also
                  includes visibility into activity across your inventory and pipeline.
                </SectionIntro>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <a
                    href="/agent/analytics"
                    className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:border-blue-200 hover:bg-white"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[var(--brand-blue)] shadow-sm">
                      <BarChart3 className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 font-bold text-slate-950">Analytics and reporting</h3>
                    <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">
                      Understand supported listing and enquiry activity across your Agent workspace.
                    </p>
                  </a>
                  <a
                    href="/agent/leads"
                    className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:border-blue-200 hover:bg-white"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
                      <Workflow className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 font-bold text-slate-950">Lead pipeline</h3>
                    <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">
                      Work every enquiry with stages, notes, follow-ups and viewing scheduling.
                    </p>
                  </a>
                </div>
              </div>
              <div className="rounded-[30px] border border-blue-100 bg-blue-50/70 p-7 text-slate-950 shadow-[0_24px_65px_rgba(0,92,168,0.08)]">
                <div className="flex items-center gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[var(--brand-blue)] shadow-sm">
                    <BarChart3 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--brand-blue)]">
                      Supported workspace
                    </p>
                    <h3 className="mt-1 text-xl font-bold">Keep the working picture nearby.</h3>
                  </div>
                </div>
                <div className="mt-8 space-y-3">
                  {[
                    'Activity across your work',
                    'Listing and enquiry reporting',
                    'Pipeline and follow-up visibility',
                  ].map(item => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-xl border border-blue-100 bg-white px-4 py-4 text-sm text-slate-700"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-xs leading-5 text-slate-600">
                  Capability availability is governed by the current canonical Agent product and
                  runtime.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="launch-access" className="bg-blue-50/70 py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-start gap-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-20">
              <div className="pt-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-blue)]">
                  90-Day Launch Access
                </p>
                <h2 className="mt-5 font-serif text-4xl font-semibold leading-tight tracking-[-0.04em] text-slate-950 md:text-6xl">
                  Experience the complete supported Agent workspace.
                </h2>
                <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                  Launch Access is intentionally broad. It gives you enough time to load real
                  inventory, use the supported Agent tools and decide whether Property Listify
                  belongs in your business before normal long-term products are introduced.
                </p>
                <div className="mt-9 space-y-4 text-sm leading-7 text-slate-700">
                  <div className="flex items-start gap-3">
                    <Check
                      className="mt-1 h-4 w-4 shrink-0 text-[var(--brand-blue)]"
                      aria-hidden="true"
                    />
                    Once-off introductory access for the full fixed term.
                  </div>
                  <div className="flex items-start gap-3">
                    <Check
                      className="mt-1 h-4 w-4 shrink-0 text-[var(--brand-blue)]"
                      aria-hidden="true"
                    />
                    Activation begins only after finance verifies manual EFT payment.
                  </div>
                  <div className="flex items-start gap-3">
                    <Check
                      className="mt-1 h-4 w-4 shrink-0 text-[var(--brand-blue)]"
                      aria-hidden="true"
                    />
                    No automatic renewal and no promise of permanent launch pricing.
                  </div>
                </div>
              </div>
              <LaunchAccessCard product={product} />
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-[var(--surface)] py-20 md:py-24">
          <div className="mx-auto flex max-w-4xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
            <BriefcaseBusiness className="h-7 w-7 text-[var(--brand-blue)]" aria-hidden="true" />
            <h2 className="mt-5 text-3xl font-bold tracking-[-0.03em] text-slate-950 md:text-4xl">
              Want to talk it through first?
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              Ask a question, discuss your current inventory or have an assisted conversation before
              requesting an invoice.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <a
                href="/contact"
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[var(--brand-blue)]"
              >
                Contact Property Listify <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="#launch-access"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-bold text-slate-950 transition hover:border-slate-950"
              >
                Review Launch Access <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <FaqSection />
      </main>

      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQS.map(item => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer },
          })),
        })}
      </script>
      <Footer />
    </div>
  );
}
