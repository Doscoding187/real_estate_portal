import React from 'react';
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  BellRing,
  BriefcaseBusiness,
  Building2,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Inbox,
  ListChecks,
  MapPin,
  MessageSquareText,
  Route,
  Search,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
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
import { AgencyWorkspacePreview } from './AgencyWorkspacePreview';

type AgencyCapability = {
  label: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  icon: typeof ListChecks;
  matches: readonly string[];
};

const AGENCY_CAPABILITIES: readonly AgencyCapability[] = [
  {
    label: 'Run the team',
    title: 'Bring Agents into the Agency workspace.',
    description:
      'Use Agency accounts, invitations, membership status, roles and workload visibility to organise participation without promising an HR system or seat plan that does not exist.',
    href: '/agency/team',
    ctaLabel: 'Explore team tools',
    icon: UsersRound,
    matches: ['team', 'account'],
  },
  {
    label: 'Run the inventory',
    title: 'See the business portfolio with responsibility attached.',
    description:
      'Keep active properties, readiness and Agency or Agent association visible as a business-level inventory view.',
    href: '/agency/listings',
    ctaLabel: 'Explore inventory tools',
    icon: ListChecks,
    matches: ['inventory', 'listing'],
  },
  {
    label: 'Run opportunities',
    title: 'Give property interest a clear operating owner.',
    description:
      'Use Agency lead access, assignment and routing with property context. The current workflow does not claim AI best-agent selection.',
    href: '/agency/leads',
    ctaLabel: 'Explore opportunity tools',
    icon: Route,
    matches: ['lead', 'routing'],
  },
  {
    label: 'Run follow-up',
    title: 'Keep the work after the enquiry visible.',
    description:
      'Lead stages, contact attempts, notes, next actions, follow-ups and viewings help the team carry context forward.',
    href: '/agency/leads',
    ctaLabel: 'Explore follow-up tools',
    icon: Inbox,
    matches: ['lead', 'enquir'],
  },
  {
    label: 'Understand the business',
    title: 'See progress from activity to commercial work.',
    description:
      'Use supported reporting, revenue, offers, transaction and commission views to understand the operating picture without reconstructing it from messages.',
    href: '/agency/reporting',
    ctaLabel: 'Explore business visibility',
    icon: BarChart3,
    matches: ['report', 'commission'],
  },
];

const AGENCY_OPERATING_MODEL = [
  {
    label: 'People',
    title: 'Bring the team into the work',
    description:
      'Agency accounts, invitations, roles and responsibility bring Agent participation into one workspace.',
    output: 'Team context',
    icon: UsersRound,
  },
  {
    label: 'Inventory',
    title: 'Organise the business portfolio',
    description: 'See active properties, readiness and the Agent association behind each listing.',
    output: 'Business inventory',
    icon: ListChecks,
  },
  {
    label: 'Opportunities',
    title: 'Give enquiries a clear owner',
    description: 'Route and assign property interest inside the Agency operating context.',
    output: 'Clear ownership',
    icon: Route,
  },
  {
    label: 'Process',
    title: 'Keep the next action moving',
    description: 'Carry lead stages, contact, notes, follow-up and viewings forward with context.',
    output: 'Next action',
    icon: ClipboardCheck,
  },
  {
    label: 'Commercial progress',
    title: 'Carry work into deals and commission',
    description:
      'Supported offers, transactions, reporting and commission views connect the operating chain.',
    output: 'Commercial progress',
    icon: CircleDollarSign,
  },
  {
    label: 'Management view',
    title: 'Know what needs attention',
    description:
      'Bring inventory, response, team and commercial signals into one Agency-level view.',
    output: 'Management visibility',
    icon: BarChart3,
  },
] as const;

const AGENCY_PROBLEMS = [
  {
    icon: UsersRound,
    eyebrow: 'Agency challenge',
    title: 'Which people and properties sit with the business?',
    response:
      'Agency accounts, team participation, listing association and readiness views give the principal a clearer picture of responsibility across the portfolio.',
  },
  {
    icon: Route,
    eyebrow: 'Agency challenge',
    title: 'Who owns this opportunity?',
    response:
      'Supported Agency lead routing and assignment connect property interest to the Agency context and an active assignable team member.',
  },
  {
    icon: BellRing,
    eyebrow: 'Agency challenge',
    title: 'What needs attention next?',
    response:
      'Lead stages, contact, notes, follow-ups, viewings and next actions help the business see where work is waiting without monitoring every conversation.',
  },
  {
    icon: CircleDollarSign,
    eyebrow: 'Agency challenge',
    title: 'Are opportunities progressing commercially?',
    response:
      'Supported offers, transactions, reporting, revenue and commission views keep commercial progress closer to the people, property and opportunity that produce it.',
  },
] as const;

const FAQS = [
  {
    question: 'What is Agency Launch Access?',
    answer:
      'Agency Launch Access is a paid, once-off term that gives an Agency 90 days of the strongest supported Agency workspace available in Property Listify. It is broad enough to use against real inventory, team activity and property enquiries before a normal long-term product is introduced.',
  },
  {
    question: 'What does R999 include?',
    answer:
      'The canonical Agency Launch Access product includes supported Agency inventory management, team and account workflows, property enquiries, lead routing, Agency reporting and analytics, and commission and deal workflows. It also carries an explicit safeguard of up to 500 active listings during the 90-day term.',
  },
  {
    question: 'Is R999 a monthly subscription?',
    answer:
      'No. R999 is the once-off price for the fixed 90-day Agency Launch Access period. It is not a monthly subscription and it is not a permanent locked-in price for future renewal.',
  },
  {
    question: 'When do the 90 days begin?',
    answer:
      'The 90 days begin only after Property Listify finance verifies the manual EFT payment. Requesting an invoice or submitting payment proof does not activate access by itself.',
  },
  {
    question: 'How many active listings can the Agency manage?',
    answer:
      'Agency Launch Access allows up to 500 active listings. Ownership, authorization, verification, publication-quality and anti-abuse rules remain in force; the safeguard is launch capacity, not permission to publish inventory that the Agency is not authorised to represent.',
  },
  {
    question: 'Can my team use Property Listify?',
    answer:
      'Yes. The supported Agency workspace includes Agency account and team workflows, invitations, membership status, role boundaries and team visibility. Property Listify does not publish an unlimited-seats promise or a separate commercial seat limit here.',
  },
  {
    question: 'How does the Agency workspace support visibility without micromanagement?',
    answer:
      'It focuses attention on ownership and next actions: inventory needing work, unassigned opportunities, follow-ups, viewings and supported commercial progress. The point is to make the operating picture clearer without claiming access to every private conversation.',
  },
  {
    question: 'How does lead routing work?',
    answer:
      'Agency lead routing keeps an enquiry in the Agency operating context and supports assignment to an active, assignable team member. The current workflow is not advertised as AI-based best-agent selection; the Agency team remains responsible for ownership and follow-up.',
  },
  {
    question: 'Are leads or sales guaranteed?',
    answer:
      'No. Property Listify provides the Agency workspace, normal discovery surfaces and supported enquiry workflows. Demand and outcomes depend on inventory, location, pricing, responsiveness and buyer behaviour, so Launch Access does not guarantee leads, traffic, viewings or sales.',
  },
  {
    question: 'What happens after 90 days?',
    answer:
      'Launch Access expires without automatic renewal. Continued access after the launch period will require a future normal Agency commercial product; its price and structure are not promised on this page.',
  },
  {
    question: 'How does the Agency pay?',
    answer:
      'Request the supported Launch Access invoice, pay by manual EFT and submit the payment proof through the assisted process. Finance verification is the activation authority; there is no instant checkout on the public page.',
  },
  {
    question: 'Can we talk to Property Listify before requesting an invoice?',
    answer:
      'Yes. Use the Contact Property Listify route if you want to discuss your team structure, inventory, onboarding or commercial requirements before requesting Launch Access.',
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

function AgencyOperatingModel() {
  return (
    <div
      data-testid="agency-operating-model"
      className="relative mt-12 overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
    >
      <div className="grid gap-7 bg-slate-950 px-6 py-8 text-white sm:px-10 md:grid-cols-[.85fr_1.15fr] md:items-end md:px-12">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">
            Your Agency · operating model
          </p>
          <h3 className="mt-4 max-w-xl font-serif text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">
            People, property and commercial progress in one connected loop.
          </h3>
        </div>
        <p className="max-w-xl text-sm leading-7 text-slate-300 md:justify-self-end md:text-base">
          The public listing is only the front door. The Agency workspace is designed to keep the
          responsibility, process and progress behind it easier to see.
        </p>
      </div>

      <div className="relative bg-white px-5 py-8 sm:px-10 sm:py-10 md:px-12">
        <div
          className="pointer-events-none absolute bottom-12 left-[2.1rem] top-12 w-px bg-blue-100 sm:left-[3.1rem] md:left-[4.1rem]"
          aria-hidden="true"
        />
        <ol className="relative">
          {AGENCY_OPERATING_MODEL.map((step, index) => {
            const Icon = step.icon;
            return (
              <li
                key={step.label}
                className="relative grid gap-5 py-5 first:pt-0 last:pb-0 md:grid-cols-[4.5rem_minmax(0,1.15fr)_minmax(13rem,.85fr)] md:items-center md:gap-7"
              >
                <div className="relative flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--brand-blue)] ring-8 ring-white">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-400 md:hidden">
                    0{index + 1}
                  </span>
                </div>
                <div className="pl-14 md:pl-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--brand-blue)]">
                    {step.label}
                  </p>
                  <h4 className="mt-2 text-xl font-bold leading-tight text-slate-950 sm:text-2xl">
                    {step.title}
                  </h4>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                    {step.description}
                  </p>
                </div>
                <div className="ml-14 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 md:ml-0">
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-[var(--brand-blue)]"
                    aria-hidden="true"
                  />
                  <span>{step.output}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function CapabilityCard({
  capability,
  className = '',
}: {
  capability: AgencyCapability;
  className?: string;
}) {
  const Icon = capability.icon;
  return (
    <article
      className={`group flex h-full flex-col rounded-[26px] border border-slate-200 bg-white p-7 shadow-[0_16px_45px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_24px_60px_rgba(37,99,235,0.12)] ${className}`}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[var(--brand-blue)]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
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
        {capability.ctaLabel}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </a>
    </article>
  );
}

function CapabilitySupportSummary({ product }: { product?: CommercialProduct }) {
  const includedCount = product
    ? AGENCY_CAPABILITIES.filter(capability => hasMatchingBenefit(product, capability.matches))
        .length
    : 0;
  const allCapabilitiesIncluded = includedCount === AGENCY_CAPABILITIES.length;

  return (
    <div
      data-testid="agency-capability-support"
      className="mt-12 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500"
    >
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 font-bold uppercase tracking-[0.14em] text-emerald-800">
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        Supported Agency workspace
      </span>
      <span>
        {allCapabilitiesIncluded
          ? 'All five capability areas are supported by the current Launch Access product.'
          : 'Capability coverage follows the current supported Agency product.'}
      </span>
    </div>
  );
}

const AGENCY_LAUNCH_FALLBACK_DETAILS = [
  {
    label: '90-day assisted access',
    detail: 'Confirm the current Launch Access setup for the fixed launch period.',
    icon: Clock3,
  },
  {
    label: 'Manual EFT activation',
    detail: 'Finance verification remains the activation authority.',
    icon: CircleDollarSign,
  },
  {
    label: 'No automatic renewal',
    detail: 'Any continued access requires a future normal Agency product.',
    icon: ShieldCheck,
  },
] as const;

function LaunchAccessCard({ product }: { product?: CommercialProduct }) {
  if (!product) {
    return (
      <div
        data-testid="agency-launch-access-card"
        className="flex h-full flex-col rounded-[30px] border border-blue-200 bg-white p-7 text-slate-950 shadow-[0_30px_90px_rgba(15,23,42,0.16)] md:p-9"
      >
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-blue)]">
              Agency Launch Access
            </p>
            <h3 className="mt-4 text-3xl font-bold leading-tight tracking-[-0.03em]">
              90-day assisted access path
            </h3>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--brand-blue)]">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
        <p className="mt-5 text-sm leading-7 text-slate-600">
          The canonical product details are unavailable right now, so Property Listify is keeping
          this route assisted rather than showing an unverified price.
        </p>
        <div className="mt-7 space-y-3">
          {AGENCY_LAUNCH_FALLBACK_DETAILS.map(item => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--brand-blue)] shadow-sm">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>
                  <strong className="block text-sm font-bold text-slate-900">{item.label}</strong>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{item.detail}</span>
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-auto pt-8">
          <a
            href="/contact"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--conversion)] px-5 py-4 text-sm font-bold text-white shadow-lg shadow-orange-900/15 transition hover:bg-[var(--conversion-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
          >
            Contact Property Listify <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <p className="mt-4 text-center text-xs leading-5 text-slate-500">
            We can confirm the current assisted setup without relying on old pricing.
          </p>
        </div>
      </div>
    );
  }

  const price = getCommercialPricePresentation(product);
  const term = getCommercialTermPresentation(product);
  const action = getCommercialActionPresentation(product);
  const limits = getCommercialPresentationLimits(product);
  const actionHref = action.href || '/contact';

  return (
    <div
      data-testid="agency-launch-access-card"
      className="flex h-full flex-col rounded-[30px] border border-blue-200 bg-white p-7 shadow-[0_30px_90px_rgba(15,23,42,0.18)] md:p-9"
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-blue)]">
            Agency Launch Access
          </p>
          <h3 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-slate-950">
            {product.displayName}
          </h3>
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
            Use the supported Agency workspace with your real team, inventory and opportunities
            during the fixed launch period.
          </p>
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

      <div className="mt-auto rounded-2xl bg-slate-50 px-5 py-5 text-sm leading-6 text-slate-600">
        <div className="flex items-center gap-2 font-semibold text-slate-800">
          <Clock3 className="h-4 w-4 text-[var(--brand-blue)]" aria-hidden="true" />
          <span>Finance-verified activation</span>
        </div>
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

function AgencyFaqSection() {
  return (
    <section id="agency-faq" className="border-t border-slate-200 bg-white py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionIntro
          align="center"
          eyebrow="Agency questions"
          title="Clear answers for the people running the business."
        >
          Launch Access is designed to be broad and testable in real Agency work: fixed term,
          assisted payment, explicit launch capacity and no promise of guaranteed demand.
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

export default function AgencyProductLandingPage() {
  const catalog = useCommercialCatalog('agency');
  const product = catalog.data?.products.find(
    item => item.productKey === 'agency_launch_access' && item.term.kind === 'paid_launch_access',
  );
  const price = product ? getCommercialPricePresentation(product) : null;
  const term = product ? getCommercialTermPresentation(product) : null;

  return (
    <div className="min-h-screen bg-[var(--surface)] text-slate-950">
      <SEOHead
        title="Property Listify for Agencies | Agency Operating Workspace"
        description="Property Listify helps South African property agencies connect people, inventory, enquiries, follow-up and commercial visibility in one Agency operating workspace. Explore 90-day Launch Access."
        canonicalUrl="/advertise/sell/agencies"
      />
      <EnhancedNavbar />

      <main id="main-content">
        <section className="relative overflow-x-clip bg-slate-950 text-white">
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
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-300">
                  For property agencies
                </p>
                <h1 className="mt-6 font-serif text-5xl font-semibold leading-[1.03] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
                  Run more of your agency from one connected operating workspace.
                </h1>
                <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl sm:leading-9">
                  Property Listify helps agencies bring together the people, properties, enquiries
                  and operating processes behind the public listings — with clearer ownership,
                  follow-up and business visibility.
                </p>
                <div className="mt-9 flex flex-wrap gap-3">
                  <a
                    href="#agency-workspace"
                    className="inline-flex items-center gap-2 rounded-2xl bg-[var(--conversion)] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-950/25 transition hover:bg-[var(--conversion-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    Explore the Agency workspace{' '}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                  <a
                    href="#launch-access"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-5 py-3.5 text-sm font-bold text-white transition hover:border-white/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    View Launch Access <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
                <div className="mt-8 flex flex-wrap gap-2.5 text-xs font-semibold text-slate-200">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2">
                    <CircleDollarSign
                      className="h-4 w-4 shrink-0 text-orange-300"
                      aria-hidden="true"
                    />
                    <span>{price ? `${price.label} once-off` : 'Launch Access pricing'}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2">
                    <Clock3 className="h-4 w-4 shrink-0 text-blue-200" aria-hidden="true" />
                    <span>{term?.label || 'Fixed launch term'}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2">
                    <UsersRound className="h-4 w-4 shrink-0 text-blue-200" aria-hidden="true" />
                    <span>Team + operating views</span>
                  </span>
                </div>
              </div>

              <div className="relative min-w-0 xl:mr-[calc(-1*max(0px,calc((100vw-96rem)/2+1rem)))] xl:translate-x-32 xl:w-[calc(100%+max(0px,calc((100vw-96rem)/2+1rem)))]">
                <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
                <AgencyWorkspacePreview compact />
              </div>
            </div>
          </div>
        </section>

        <section id="agency-workflow" className="border-b border-slate-200 bg-white py-24 md:py-32">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
            <SectionIntro
              eyebrow="Your Agency operating model"
              title="Run the business behind the listings, not just the listings themselves."
            >
              Build the team, organise responsibility, manage inventory, distribute opportunities,
              carry follow-up forward and understand commercial progress in one connected loop.
            </SectionIntro>
            <AgencyOperatingModel />
          </div>
        </section>

        <section id="agency-problems" className="bg-[var(--surface)] py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionIntro
              align="center"
              eyebrow="Agency problems and product responses"
              title="Know who owns the work and what needs attention next."
            >
              The value is not a bigger number on a listing allowance. It is clearer responsibility,
              process and progress across the business that sits behind the public inventory.
            </SectionIntro>
            <div className="mt-12 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              {AGENCY_PROBLEMS.map(item => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="grid gap-5 border-b border-slate-200 p-6 last:border-b-0 md:grid-cols-[minmax(15rem,.75fr)_auto_minmax(0,1.25fr)] md:items-center md:gap-8 md:px-8 md:py-8"
                  >
                    <div className="flex items-start gap-4">
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
                      <p className="text-sm leading-7 text-slate-600">{item.response}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="agency-workspace"
          className="border-y border-slate-200 bg-white py-24 md:py-32"
        >
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
            <SectionIntro
              eyebrow="One connected Agency workspace"
              title="A managerial view of people, property and opportunity."
            >
              The workspace is designed to help principals and teams see the operating picture: who
              is involved, what inventory needs attention, where opportunities sit and how supported
              commercial work is progressing.
            </SectionIntro>
            <div className="mt-12">
              <AgencyWorkspacePreview />
            </div>
            <CapabilitySupportSummary product={product} />
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-12">
              {AGENCY_CAPABILITIES.map((capability, index) => (
                <CapabilityCard
                  key={capability.label}
                  capability={capability}
                  className={
                    index < 3
                      ? 'xl:col-span-4'
                      : index === 3
                        ? 'xl:col-span-5'
                        : 'md:col-span-2 xl:col-span-7'
                  }
                />
              ))}
            </div>
          </div>
        </section>

        <section id="agency-discovery" className="bg-[var(--surface)] py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionIntro
              align="center"
              eyebrow="Public discovery is part of the loop"
              title="Inventory enters the market. The Agency manages what happens next."
            >
              Legitimate Agency inventory can take part in normal Search, province and location
              discovery. Public discovery opens the opportunity; the operating workspace keeps the
              ownership and follow-through visible afterwards.
            </SectionIntro>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              <article className="flex h-full flex-col rounded-[26px] border border-slate-200 bg-white p-7 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[var(--brand-blue)]">
                  <Search className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-2xl font-bold text-slate-950">Search</h3>
                <p className="mt-4 flex-1 text-sm leading-7 text-slate-600">
                  Publish eligible inventory into the same normal property search environment used
                  by people looking for homes and rentals.
                </p>
                <a
                  href="/property-for-sale"
                  className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-slate-950"
                >
                  Browse property search <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </article>
              <article className="flex h-full flex-col rounded-[26px] border border-slate-200 bg-white p-7 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-2xl font-bold text-slate-950">Location discovery</h3>
                <p className="mt-4 flex-1 text-sm leading-7 text-slate-600">
                  Province, city and suburb journeys help property seekers understand where an
                  Agency listing sits before they open the property detail.
                </p>
                <a
                  href="/gauteng"
                  className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-slate-950"
                >
                  Explore a province page <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </article>
              <article className="flex h-full flex-col rounded-[26px] border border-slate-200 bg-white p-7 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-700">
                  <MessageSquareText className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-2xl font-bold text-slate-950">Property context</h3>
                <p className="mt-4 flex-1 text-sm leading-7 text-slate-600">
                  The enquiry workflow retains the listing and contact context needed to bring
                  interest back into the Agency&apos;s operating view.
                </p>
                <a
                  href="/explore"
                  className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-slate-950"
                >
                  Explore Property Listify <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
                or guaranteed leads. Discovery and publication remain subject to normal product and
                safety rules.
              </p>
            </div>
          </div>
        </section>

        <section
          id="agency-visibility"
          className="border-t border-slate-200 bg-white py-24 md:py-32"
        >
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
              <div>
                <SectionIntro
                  eyebrow="Management visibility"
                  title="Know what needs attention without managing every conversation."
                >
                  Agency principals do not need to monitor every conversation. They need a clearer
                  view of inventory requiring work, opportunity ownership, follow-up and commercial
                  progress — visibility and accountability without surveillance.
                </SectionIntro>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <a
                    href="/agency/reporting"
                    className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:border-blue-200 hover:bg-white"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[var(--brand-blue)] shadow-sm">
                      <BarChart3 className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 font-bold text-slate-950">Management reporting</h3>
                    <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">
                      Bring supported inventory, lead, conversion and activity views into the
                      Agency-level operating picture.
                    </p>
                  </a>
                  <a
                    href="/agency/commission"
                    className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:border-blue-200 hover:bg-white"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
                      <CircleDollarSign className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 font-bold text-slate-950">Commercial progress</h3>
                    <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">
                      Keep supported offers, transactions, commission and revenue visibility near
                      the work that produces it; Property Listify does not guarantee earnings.
                    </p>
                  </a>
                </div>
              </div>
              <div className="rounded-[30px] border border-blue-100 bg-blue-50/70 p-7 text-slate-950 shadow-[0_24px_65px_rgba(0,92,168,0.08)]">
                <div className="flex items-center gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[var(--brand-blue)] shadow-sm">
                    <Building2 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--brand-blue)]">
                      Supported Agency views
                    </p>
                    <h3 className="mt-1 text-xl font-bold">See the signals together.</h3>
                  </div>
                </div>
                <div className="mt-8 space-y-3">
                  {[
                    ['People and ownership', 'Team roles, workload and responsibility'],
                    ['Inventory attention', 'Readiness and assigned Agent context'],
                    ['Opportunity progress', 'Stages, follow-up and viewing context'],
                    ['Commercial visibility', 'Offers, deals, commission and reporting'],
                  ].map(([label, detail]) => (
                    <div
                      key={label}
                      className="flex items-start gap-3 rounded-xl border border-blue-100 bg-white px-4 py-4 text-sm text-slate-700"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span>
                        <strong className="block font-semibold text-slate-900">{label}</strong>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          {detail}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-xs leading-5 text-slate-600">
                  Capability availability is governed by the current canonical Agency product and
                  implemented runtime.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="launch-access" className="bg-blue-50/70 py-24 md:py-32">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
            <div className="grid items-stretch gap-10 xl:grid-cols-[.85fr_1.15fr] xl:gap-16">
              <div className="pt-2 xl:pt-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-blue)]">
                  90-Day Launch Access
                </p>
                <h2 className="mt-5 max-w-xl font-serif text-4xl font-semibold leading-[1.04] tracking-[-0.04em] text-slate-950 md:text-5xl xl:text-[3.5rem]">
                  Give your Agency 90 days to operate the complete supported workspace.
                </h2>
                <p className="mt-5 max-w-lg text-base leading-7 text-slate-600 md:text-lg md:leading-8">
                  R999 gives the business time to bring real people, inventory and opportunities
                  into Property Listify — then use supported follow-up, deal, commission and
                  management views in the rhythm of the Agency.
                </p>
                <div className="mt-8 grid gap-3 text-sm leading-6 text-slate-700">
                  <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-white/65 px-4 py-3.5">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-blue)]"
                      aria-hidden="true"
                    />
                    <p>
                      <strong className="font-bold text-slate-950">Run the team</strong>
                      <span>
                        {' '}
                        — supported Agency accounts, invitations, roles and ownership context.
                      </span>
                    </p>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-white/65 px-4 py-3.5">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-blue)]"
                      aria-hidden="true"
                    />
                    <p>
                      <strong className="font-bold text-slate-950">
                        Run opportunities and follow-up
                      </strong>
                      <span> — enquiry access, routing, stages, viewings and next actions.</span>
                    </p>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-white/65 px-4 py-3.5">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-blue)]"
                      aria-hidden="true"
                    />
                    <p>
                      <strong className="font-bold text-slate-950">Understand the business</strong>
                      <span>
                        {' '}
                        — supported reporting, revenue, offers, transactions and commission
                        visibility.
                      </span>
                    </p>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-white/65 px-4 py-3.5">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-blue)]"
                      aria-hidden="true"
                    />
                    <p>
                      <strong className="font-bold text-slate-950">
                        Up to 500 active listings
                      </strong>
                      <span>
                        {' '}
                        — launch capacity safeguard, subject to normal controls; not the whole
                        reason to buy.
                      </span>
                    </p>
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
              Want to talk through the Agency fit first?
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              Discuss team structure, inventory, onboarding or commercial requirements with Property
              Listify before requesting an invoice.
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

        <AgencyFaqSection />
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
