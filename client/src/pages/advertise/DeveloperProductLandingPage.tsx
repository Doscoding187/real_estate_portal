import React from 'react';
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  FileText,
  LayoutDashboard,
  MapPin,
  MessageSquareText,
  PackageOpen,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
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
import { DeveloperWorkspacePreview } from './DeveloperWorkspacePreview';
import { COMMERCIAL_HERO_CLASS } from './commercialHero';
import { isHomepageHeroJourneyEnabled } from '@/lib/publicNavigation';

type DeveloperCapability = {
  label: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  icon: typeof Building2;
};

const DEVELOPER_OPERATING_MODEL = [
  {
    label: 'Portfolio',
    title: 'Keep legitimate developments together',
    description:
      'Manage multiple development projects from a Developer account instead of rebuilding the context for every launch.',
    output: 'One portfolio view',
    icon: Building2,
  },
  {
    label: 'Project',
    title: 'Give each development its own working home',
    description:
      'Open a project view with its location, lifecycle state, readiness, inventory, captured demand and work that needs attention.',
    output: 'Project context',
    icon: LayoutDashboard,
  },
  {
    label: 'Inventory',
    title: 'Structure the unit options behind the project',
    description:
      'Organise unit types with names, categories, bedrooms, sizes, pricing, stock and supporting media where configured.',
    output: 'Unit catalogue',
    icon: PackageOpen,
  },
  {
    label: 'Discovery',
    title: 'Present eligible developments publicly',
    description:
      'Move from project data to a public development experience with location, media, unit options and normal discovery rules.',
    output: 'Public project page',
    icon: Search,
  },
  {
    label: 'Enquiries',
    title: 'Bring project interest back with context',
    description:
      'Development and unit interest returns with the project context your team needs for a useful response.',
    output: 'Project-linked enquiry',
    icon: MessageSquareText,
  },
  {
    label: 'Visibility',
    title: 'See readiness, demand and the next follow-up',
    description:
      'Use Developer views to understand publication state, captured enquiry activity, lead stages and the items that need attention.',
    output: 'Portfolio visibility',
    icon: BarChart3,
  },
] as const;

const DEVELOPER_CAPABILITIES: readonly DeveloperCapability[] = [
  {
    label: 'Run the portfolio',
    title: 'Manage every development from the same portfolio view.',
    description:
      'Search and manage your development portfolio, open each project home, and keep lifecycle status and project context close to the work.',
    href: '/developer/developments',
    ctaLabel: 'Explore developments',
    icon: Building2,
  },
  {
    label: 'Structure inventory',
    title: 'Give buyers real unit options to understand.',
    description:
      'Create unit types with the details the development experience can represent: type, beds, baths, size, pricing, availability, images and floor plans.',
    href: '/developer/create-development',
    ctaLabel: 'Open development setup',
    icon: PackageOpen,
  },
  {
    label: 'Publish and present',
    title: 'Make the project story useful before the enquiry.',
    description:
      'Public development pages bring together project media, location, unit choices, floor-plan context and a clear path to enquire.',
    href: '/new-developments',
    ctaLabel: 'Browse development discovery',
    icon: Search,
  },
  {
    label: 'Manage project enquiries',
    title: 'Know which development and unit prompted the interest.',
    description:
      'Review development-linked leads, move enquiries through the available stages, assign ownership, log activity and keep the next action visible.',
    href: '/developer/leads',
    ctaLabel: 'Explore enquiry workflow',
    icon: MessageSquareText,
  },
  {
    label: 'See portfolio activity',
    title: 'Make readiness and demand easier to see across launches.',
    description:
      'Developer views bring review and publication state, inventory snapshots, captured demand, funnel stages and attention queues into the project views available to your account.',
    href: '/developer/dashboard',
    ctaLabel: 'See Developer dashboard',
    icon: BarChart3,
  },
] as const;

const DEVELOPER_PROBLEMS = [
  {
    icon: Building2,
    eyebrow: 'Portfolio challenge',
    title: 'Multiple developments become difficult to present consistently.',
    response:
      'The Developer portfolio and project homes keep each development, its status and its project context together without turning every project into a generic single-property listing.',
  },
  {
    icon: PackageOpen,
    eyebrow: 'Inventory challenge',
    title: 'Unit options need more structure than one listing record.',
    response:
      'The development setup lets you structure the unit types behind a real project catalogue: classification, bedrooms, bathrooms, size, pricing, availability and supporting media.',
  },
  {
    icon: MapPin,
    eyebrow: 'Presentation challenge',
    title: 'A project needs its own public story before someone enquires.',
    response:
      'Public development and unit detail experiences connect location, project information, media, available options and the path to request information or contact sales.',
  },
  {
    icon: Route,
    eyebrow: 'Enquiry challenge',
    title: 'Project interest loses value when its context is missing.',
    response:
      'Development and unit-linked enquiries return with the project context needed to review ownership, stage, SLA, notes, activity and the next action.',
  },
  {
    icon: ShieldCheck,
    eyebrow: 'Readiness challenge',
    title: 'Draft, review and public status can be hard to hold in view.',
    response:
      'Readiness views show submission state, review feedback, blockers and public eligibility so publication remains a governed step rather than an assumed outcome.',
  },
] as const;

type DeveloperFaq = {
  question: string;
  answer: string;
};

function getDeveloperFaqs(priceLabel?: string, termLabel?: string): readonly DeveloperFaq[] {
  const hasCatalogPrice = Boolean(priceLabel);
  const hasCatalogTerm = Boolean(termLabel);
  const durationPhrase = termLabel ? `for ${termLabel}` : 'for a fixed launch period';

  return [
    {
      question: 'What is Developer Launch Access?',
      answer: `Developer Launch Access is the paid launch product for Developers. It gives you ${durationPhrase} to use the Developer workspace, with an unlimited legitimate Developer portfolio entitlement during that active period.`,
    },
    {
      question: hasCatalogPrice
        ? `What does ${priceLabel} include?`
        : 'What does Launch Access include?',
      answer: hasCatalogPrice
        ? `${priceLabel} is the once-off price for the Developer Launch Access period. It covers development portfolio organisation, structured unit inventory, public project presentation, development-linked enquiries and visibility into readiness and demand where those views are available. Normal ownership, verification, publication and platform rules still apply.`
        : 'Launch Access covers development portfolio organisation, structured unit inventory, public project presentation, development-linked enquiries and visibility into readiness and demand where those views are available. Confirm the current catalog details with Property Listify before requesting an invoice.',
    },
    {
      question: hasCatalogPrice ? `Is ${priceLabel} monthly?` : 'Is Launch Access monthly?',
      answer: hasCatalogPrice
        ? `No. ${priceLabel} is the once-off price for the Developer Launch Access period. It is not a monthly subscription and it is not a permanent locked-in price for future Developer products.`
        : 'No automatic renewal is promised. Confirm the current commercial term with Property Listify before requesting access.',
    },
    {
      question: 'How long does Launch Access last?',
      answer: hasCatalogTerm
        ? `Launch Access lasts for ${termLabel}. The term begins only after the manual EFT payment has been verified by Property Listify finance and the activation has been recorded.`
        : 'Launch Access has a fixed term. Confirm the current catalog term with Property Listify before requesting an invoice.',
    },
    {
      question: 'How many developments can I manage?',
      answer:
        'During the active Launch Access period, the entitlement is an unlimited legitimate Developer portfolio. That means developments the Developer owns or is authorised to represent, with truthful project information and the normal Property Listify review, publication and safety controls in force.',
    },
    {
      question: 'Can I manage different unit types and availability?',
      answer:
        'Yes. The development workflow supports structured unit types with names, categories and subtypes, bedrooms, bathrooms, unit and yard or plot sizes, pricing, available and reserved stock, unit media, features and floor plans where those fields are used.',
    },
    {
      question: 'Can I add development media and floor plans?',
      answer:
        'Yes. The development setup supports hero and gallery images, videos or video links, documents and unit-level media including floor plans. What becomes public remains subject to the submitted data, readiness and publication controls.',
    },
    {
      question: 'Are development enquiries guaranteed?',
      answer:
        'No. Property Listify provides public discovery surfaces and enquiry workflows, but it does not guarantee leads, traffic, viewings, sales or any particular commercial outcome.',
    },
    {
      question: 'How do I pay and when does access begin?',
      answer: hasCatalogTerm
        ? `Property Listify issues the Launch Access invoice, payment is made by manual EFT, and payment proof is submitted through the authenticated Developer billing flow. The Launch Access term begins only after Property Listify finance verifies the payment and the activation is recorded. Requesting an invoice or submitting payment proof does not activate access by itself.`
        : 'Property Listify issues the Launch Access invoice, payment is made by manual EFT, and payment proof is submitted through the authenticated Developer billing flow. The fixed term begins only after Property Listify finance verifies the payment and the activation is recorded. Confirm the current term before requesting access.',
    },
    {
      question: 'Does Launch Access renew automatically, and what happens after 90 days?',
      answer:
        'No. Developer Launch Access has no automatic renewal. Continued access after the fixed launch period requires a future normal Developer commercial product; its price and structure are not promised on this page.',
    },
  ];
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

function DeveloperOperatingModel() {
  return (
    <div
      data-testid="developer-operating-model"
      className="relative mt-12 overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
    >
      <div className="grid gap-7 bg-slate-950 px-6 py-8 text-white sm:px-10 md:grid-cols-[.85fr_1.15fr] md:items-end md:px-12">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">
            Portfolio → development → project interest
          </p>
          <h3 className="mt-4 max-w-xl font-serif text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">
            Keep each development connected to the interest it creates.
          </h3>
        </div>
        <p className="max-w-xl text-sm leading-7 text-slate-300 md:justify-self-end md:text-base">
          The project page is only the front door. Keep the development, its unit options, enquiry
          details and readiness signals together as each launch moves forward.
        </p>
      </div>

      <div className="relative bg-white px-5 py-8 sm:px-10 sm:py-10 md:px-12">
        <div
          className="pointer-events-none absolute bottom-12 left-[2.1rem] top-12 w-px bg-blue-100 sm:left-[3.1rem] md:left-[4.1rem]"
          aria-hidden="true"
        />
        <ol className="relative">
          {DEVELOPER_OPERATING_MODEL.map((step, index) => {
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
  capability: DeveloperCapability;
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

function DeveloperLaunchFallback() {
  return (
    <div
      data-testid="developer-launch-access-card"
      className="flex h-full flex-col rounded-[30px] border border-blue-200 bg-white p-7 text-slate-950 shadow-[0_30px_90px_rgba(15,23,42,0.16)] md:p-9"
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-blue)]">
            Developer Launch Access
          </p>
          <h3 className="mt-4 text-3xl font-bold leading-tight tracking-[-0.03em]">
            Assisted access path
          </h3>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--brand-blue)]">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-5 text-sm leading-7 text-slate-600">
        Current catalog details are unavailable, so Property Listify is keeping this route assisted
        instead of showing an unverified price or legacy offer.
      </p>
      <div className="mt-7 space-y-3">
        {[
          [
            'Fixed launch period',
            'Confirm the current Developer Launch Access term with Property Listify.',
          ],
          ['Manual EFT activation', 'Finance verification remains the activation authority.'],
          [
            'No automatic renewal',
            'Any continued access requires a future normal Developer product.',
          ],
        ].map(([label, detail], index) => (
          <div
            key={label}
            className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--brand-blue)] shadow-sm">
              {index === 0 ? (
                <Clock3 className="h-4 w-4" aria-hidden="true" />
              ) : index === 1 ? (
                <CircleDollarSign className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <span>
              <strong className="block text-sm font-bold text-slate-900">{label}</strong>
              <span className="mt-1 block text-xs leading-5 text-slate-500">{detail}</span>
            </span>
          </div>
        ))}
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

function DeveloperLaunchAccessCard({ product }: { product?: CommercialProduct }) {
  if (!product) return <DeveloperLaunchFallback />;

  const price = getCommercialPricePresentation(product);
  const term = getCommercialTermPresentation(product);
  const action = getCommercialActionPresentation(product);
  const limits = getCommercialPresentationLimits(product);
  const actionHref = action.href || '/contact';
  const portfolioEntitled = product.limits.unlimited_development_portfolio === true;

  return (
    <div
      data-testid="developer-launch-access-card"
      className="flex h-full flex-col rounded-[30px] border border-blue-200 bg-white p-7 shadow-[0_30px_90px_rgba(15,23,42,0.18)] md:p-9"
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-blue)]">
            Developer Launch Access
          </p>
          <h3 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-slate-950">
            {product.displayName}
          </h3>
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
            Put real projects, unit inventory and enquiry activity to work during the fixed launch
            period.
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
        {portfolioEntitled ? (
          <div className="flex items-start gap-2.5 text-sm leading-6 text-slate-700">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-[var(--brand-blue)]">
              <Check className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>
              Unlimited legitimate Developer portfolio during the active Launch Access period.
            </span>
          </div>
        ) : null}
        {limits
          .filter(([key]) => key !== 'unlimited_development_portfolio')
          .map(([key, value]) => (
            <div key={key} className="flex items-start gap-2.5 text-sm leading-6 text-slate-700">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-[var(--brand-blue)]">
                <Check className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>
                {formatCommercialLimitLabel(key)}: {formatCommercialLimitValue(value)}
              </span>
            </div>
          ))}
        <div className="flex items-start gap-2.5 text-sm leading-6 text-slate-700">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-[var(--brand-blue)]">
            <Check className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>Structured development, inventory, public presentation and enquiry workflows.</span>
        </div>
      </div>

      <div className="mt-auto rounded-2xl bg-slate-50 px-5 py-5 text-sm leading-6 text-slate-600">
        <div className="flex items-center gap-2 font-semibold text-slate-800">
          <Clock3 className="h-4 w-4 text-[var(--brand-blue)]" aria-hidden="true" />
          <span>Manual EFT · finance-verified activation</span>
        </div>
        <p className="mt-2">
          Create your owner account, verify your email, complete your company profile, then request
          your Launch Access invoice. Pay by manual EFT and submit proof through your authenticated
          Developer billing flow — finance verification starts your access period.{' '}
          {term.renewalLabel || 'There is no automatic renewal.'}
        </p>
      </div>

      <a
        href={actionHref}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--conversion)] px-5 py-4 text-sm font-bold text-white shadow-lg shadow-orange-900/15 transition hover:bg-[var(--conversion-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
      >
        {action.disabled ? 'Contact Property Listify' : action.label}{' '}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </a>
      <p className="mt-4 text-center text-xs leading-5 text-slate-500">
        Requesting an invoice is not instant checkout and does not activate access.
      </p>
    </div>
  );
}

function DeveloperFaqSection({ faqs }: { faqs: readonly DeveloperFaq[] }) {
  return (
    <section id="developer-faq" className="border-t border-slate-200 bg-white py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionIntro
          align="center"
          eyebrow="Developer questions"
          title="Clear commercial and product answers before you start."
        >
          Developer Launch Access is a fixed, assisted launch path for a real development portfolio.
          These answers keep the product boundary and the commercial terms clear.
        </SectionIntro>

        <div className="mt-12 divide-y divide-slate-200 overflow-hidden rounded-[26px] border border-slate-200 bg-slate-50">
          {faqs.map(item => (
            <details
              key={item.question}
              className="group bg-white px-5 py-5 open:bg-blue-50/40 sm:px-7"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left text-base font-bold text-slate-950 marker:hidden [&::-webkit-details-marker]:hidden">
                {item.question}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[var(--brand-blue)] transition group-open:rotate-45">
                  <span className="text-xl font-normal leading-none">+</span>
                </span>
              </summary>
              <p className="max-w-3xl pr-12 pt-4 text-sm leading-7 text-slate-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function DeveloperProductLandingPage() {
  const { data: catalog } = useCommercialCatalog('developer');
  const developmentsJourneyEnabled = isHomepageHeroJourneyEnabled('developments');
  const product = catalog?.products.find(item => item.productKey === 'developer_launch_access');
  const price = product ? getCommercialPricePresentation(product) : null;
  const term = product ? getCommercialTermPresentation(product) : null;
  const faqs = getDeveloperFaqs(price?.label, term?.label);

  return (
    <div className="min-h-screen bg-[var(--surface)] text-slate-950">
      <SEOHead
        title="Property Listify for Developers | Developments, Units & Enquiries"
        description="Property Listify helps South African property developers organise development portfolios, unit inventory, project discovery and development enquiries in one connected workspace."
        canonicalUrl="/advertise/sell/developers"
      />
      <EnhancedNavbar />

      <main id="main-content">
        <section data-commercial-hero="true" className={COMMERCIAL_HERO_CLASS}>
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(0,92,168,0.3),transparent_35%)]"
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
                  For property developers
                </p>
                <h1 className="mt-6 font-serif text-5xl font-semibold leading-[1.03] tracking-[-0.05em] text-white sm:text-6xl lg:mt-2 lg:text-7xl">
                  Run your development portfolio from one{' '}
                  <span className="text-blue-300">connected workspace.</span>
                </h1>
                <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl sm:leading-9 lg:mt-4">
                  Organise developments, structure unit inventory, present eligible projects,
                  capture project-linked enquiries and see what needs attention across your
                  portfolio.
                </p>
                <div className="mt-9 flex flex-wrap gap-3 lg:mt-5">
                  <a
                    href="#developer-workspace"
                    className="inline-flex items-center gap-2 rounded-2xl bg-[var(--conversion)] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-950/25 transition hover:bg-[var(--conversion-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    Explore the Developer workspace{' '}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                  <a
                    href="#launch-access"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-5 py-3.5 text-sm font-bold text-white transition hover:border-white/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    View Launch Access <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
                <div className="mt-8 flex flex-wrap gap-2.5 text-xs font-semibold text-slate-200 lg:mt-4">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2">
                    <CircleDollarSign
                      className="h-4 w-4 shrink-0 text-orange-300"
                      aria-hidden="true"
                    />
                    <span>
                      {price?.kind === 'fixed'
                        ? `${price.label} once-off`
                        : 'Launch Access pricing'}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2">
                    <Clock3 className="h-4 w-4 shrink-0 text-blue-200" aria-hidden="true" />
                    <span>{term?.label || 'Fixed launch term'}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2">
                    <Building2 className="h-4 w-4 shrink-0 text-blue-200" aria-hidden="true" />
                    <span>
                      {product ? 'Unlimited legitimate portfolio' : 'Developer portfolio access'}
                    </span>
                  </span>
                </div>
              </div>

              <div className="relative min-w-0 xl:mr-[calc(-1*max(0px,calc((100vw-96rem)/2+1rem)))] xl:translate-x-32 xl:w-[calc(100%+max(0px,calc((100vw-96rem)/2+1rem)))]">
                <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
                <DeveloperWorkspacePreview compact />
              </div>
            </div>
          </div>
        </section>

        <section
          id="developer-workflow"
          className="border-b border-slate-200 bg-white py-24 md:py-32"
        >
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
            <SectionIntro
              eyebrow="The Developer journey"
              title="Move from a portfolio of projects to a clearer launch journey."
            >
              Property Listify connects the development portfolio to project inventory, public
              discovery, project-linked enquiries and the visibility needed to keep launches moving.
            </SectionIntro>
            <DeveloperOperatingModel />
          </div>
        </section>

        <section id="developer-problems" className="bg-[var(--surface)] py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionIntro
              align="center"
              eyebrow="Developer problems and product responses"
              title="Connect each development to its inventory and project interest."
            >
              The Developer proposition is about more than uploading a new development. It is about
              preserving the relationship between project information, unit options, public
              presentation and the interest that follows.
            </SectionIntro>
            <div className="mt-12 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              {DEVELOPER_PROBLEMS.map(item => {
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
          id="developer-workspace"
          className="border-y border-slate-200 bg-white py-24 md:py-32"
        >
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
            <SectionIntro
              eyebrow="One connected Developer workspace"
              title="A product view shaped around developments, unit inventory and project interest."
            >
              The interface below is illustrative. It shows the Developer work in one view: multiple
              projects, unit availability, public readiness, project-linked enquiries and the
              follow-up signals that help you keep launches moving.
            </SectionIntro>
            <div className="mt-12">
              <DeveloperWorkspacePreview />
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-12">
              {DEVELOPER_CAPABILITIES.filter(
                capability => capability.href !== '/new-developments' || developmentsJourneyEnabled,
              ).map((capability, index) => (
                <CapabilityCard
                  key={capability.label}
                  capability={capability}
                  className={
                    index === 0
                      ? 'xl:col-span-7'
                      : index === 1
                        ? 'xl:col-span-5'
                        : index === 2
                          ? 'xl:col-span-5'
                          : index === 3
                            ? 'xl:col-span-7'
                            : 'md:col-span-2 xl:col-span-12'
                  }
                />
              ))}
            </div>
          </div>
        </section>

        <section id="developer-discovery" className="bg-[var(--surface)] py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionIntro
              align="center"
              eyebrow="From project data to public discovery"
              title="Help property seekers understand the development before they enquire."
            >
              A development page can bring together the project, its location, supporting media,
              unit options and the next information request. Launch Access does not buy search
              priority or guarantee demand.
            </SectionIntro>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              <article className="flex h-full flex-col rounded-[26px] border border-slate-200 bg-white p-7 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[var(--brand-blue)]">
                  <Search className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-2xl font-bold text-slate-950">Development discovery</h3>
                <p className="mt-4 flex-1 text-sm leading-7 text-slate-600">
                  Projects that meet publication requirements can appear in Property Listify's
                  development and location discovery experience.
                </p>
                {developmentsJourneyEnabled ? (
                  <a
                    href="/new-developments"
                    className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-slate-950"
                  >
                    Browse developments <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                ) : null}
              </article>
              <article className="flex h-full flex-col rounded-[26px] border border-slate-200 bg-white p-7 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-2xl font-bold text-slate-950">Unit detail</h3>
                <p className="mt-4 flex-1 text-sm leading-7 text-slate-600">
                  Unit choices can carry their own images, floor-plan context, price guidance,
                  availability and details before a buyer selects an enquiry path.
                </p>
                {developmentsJourneyEnabled ? (
                  <a
                    href="/new-developments"
                    className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-slate-950"
                  >
                    See public discovery <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                ) : null}
              </article>
              <article className="flex h-full flex-col rounded-[26px] border border-slate-200 bg-white p-7 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-700">
                  <MessageSquareText className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-2xl font-bold text-slate-950">Project enquiry</h3>
                <p className="mt-4 flex-1 text-sm leading-7 text-slate-600">
                  Enquiries from a development or unit detail page retain the project and unit
                  context needed for the next operating action.
                </p>
                <a
                  href="/contact"
                  className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-slate-950"
                >
                  Talk to Property Listify <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </article>
            </div>

            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-950">
              <ShieldCheck
                className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-blue)]"
                aria-hidden="true"
              />
              <p>
                Public visibility is governed by normal review, publication and safety rules. Launch
                Access does not buy ranking, sponsored placement, guaranteed traffic or guaranteed
                enquiries.
              </p>
            </div>
          </div>
        </section>

        <section
          id="developer-visibility"
          className="border-t border-slate-200 bg-white py-24 md:py-32"
        >
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
              <div>
                <SectionIntro
                  eyebrow="Portfolio visibility"
                  title="See where each development sits and what the next signal is."
                >
                  Keep project readiness, inventory and captured demand together so you can see
                  which development needs attention next—without pretending to be a construction or
                  finance system.
                </SectionIntro>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <a
                    href="/developer/dashboard"
                    className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:border-blue-200 hover:bg-white"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[var(--brand-blue)] shadow-sm">
                      <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 font-bold text-slate-950">Readiness and attention</h3>
                    <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">
                      Review blockers, review feedback, lifecycle state, public eligibility and
                      items requiring attention in the project home.
                    </p>
                  </a>
                  <a
                    href="/developer/leads"
                    className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:border-blue-200 hover:bg-white"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-orange-700 shadow-sm">
                      <MessageSquareText className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 font-bold text-slate-950">Demand and funnel</h3>
                    <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">
                      Work with selected-period captured leads, stages, owners, SLA warnings,
                      activity and next actions where available.
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
                      Developer signals
                    </p>
                    <h3 className="mt-1 text-xl font-bold">Keep the right signals nearby.</h3>
                  </div>
                </div>
                <div className="mt-8 space-y-3">
                  {[
                    ['Development lifecycle', 'Draft, review, changes required, approved or live'],
                    [
                      'Inventory snapshot',
                      'Unit types, totals and available or reserved stock where configured',
                    ],
                    ['Project demand', 'Selected-period captured leads and funnel stage counts'],
                    ['Next follow-up', 'Ownership, SLA, notes, activity and follow-up context'],
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
                  These signals reflect the current Developer workspace and its publication rules.
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
                  {term ? `${term.label} Launch Access` : 'Developer Launch Access'}
                </p>
                <h2 className="mt-5 max-w-xl font-serif text-4xl font-semibold leading-[1.04] tracking-[-0.04em] text-slate-950 md:text-5xl xl:text-[3.5rem]">
                  {term
                    ? `Put the full Developer workspace to work for ${term.label}.`
                    : 'Put the full Developer workspace to work during a focused launch period.'}
                </h2>
                <p className="mt-5 max-w-lg text-base leading-7 text-slate-600 md:text-lg md:leading-8">
                  {price
                    ? `${price.label} once-off gives your team ${term?.label || 'a fixed launch period'} to put Property Listify to work across a legitimate development portfolio—organising unit availability, keeping project enquiries connected and seeing which launches need attention.`
                    : 'Developer Launch Access gives your team a focused launch period to put Property Listify to work across a legitimate development portfolio—organising unit availability, keeping project enquiries connected and seeing which launches need attention. Confirm the current catalog details before requesting an invoice.'}
                </p>
                <div className="mt-8 grid gap-3 text-sm leading-6 text-slate-700">
                  {[
                    [
                      'Portfolio',
                      'Unlimited legitimate Developer portfolio during the active term.',
                    ],
                    [
                      'Inventory',
                      'Structured development and unit-type information where added to the project.',
                    ],
                    [
                      'Presentation',
                      'Public project, unit, media and enquiry experiences subject to review.',
                    ],
                    [
                      'Visibility',
                      'Readiness, captured demand and follow-up context where available.',
                    ],
                  ].map(([label, detail]) => (
                    <div
                      key={label}
                      className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-white/65 px-4 py-3.5"
                    >
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-blue)]"
                        aria-hidden="true"
                      />
                      <p>
                        <strong className="font-bold text-slate-950">{label}</strong>
                        <span> — {detail}</span>
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-7 flex items-start gap-3 text-xs leading-5 text-slate-500">
                  <Sparkles
                    className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-blue)]"
                    aria-hidden="true"
                  />
                  <p>
                    Figures, project names and inventory shown in the workspace preview are
                    illustrative only.
                  </p>
                </div>
              </div>
              <DeveloperLaunchAccessCard product={product} />
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-[var(--surface)] py-20 md:py-24">
          <div className="mx-auto flex max-w-4xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
            <Building2 className="h-7 w-7 text-[var(--brand-blue)]" aria-hidden="true" />
            <h2 className="mt-5 text-3xl font-bold tracking-[-0.03em] text-slate-950 md:text-4xl">
              Want to discuss your development portfolio first?
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              Talk through multiple projects, onboarding, portfolio migration questions or the
              Developer Launch Access fit with Property Listify before requesting an invoice.
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

        <DeveloperFaqSection faqs={faqs} />
      </main>

      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map(item => ({
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
