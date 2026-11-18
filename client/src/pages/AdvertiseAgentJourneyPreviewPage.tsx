import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BellRing,
  Check,
  CircleDollarSign,
  Clock3,
  FileText,
  Inbox,
  ListChecks,
  MapPin,
  MessageSquareText,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Link } from 'wouter';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { Footer } from '@/components/Footer';
import { AgentWorkspacePreview } from '@/pages/advertise/AgentWorkspacePreview';
import { useCommercialCatalog } from '@/hooks/useCommercialCatalog';
import { usePreviewSeo } from '@/hooks/usePreviewSeo';
import {
  getCommercialPricePresentation,
  getCommercialTermPresentation,
} from '@/lib/commercialCatalog';
import { getAccountAuthHref } from '@/lib/publicNavigation';

const AGENT_ACCOUNT_START_HREF = getAccountAuthHref('register', '/agent/select-package', {
  registerRole: 'agent',
});

const agentJourney = [
  {
    label: '01',
    title: 'Manage listings',
    description: 'Create and keep track of the active properties behind your business.',
    icon: ListChecks,
  },
  {
    label: '02',
    title: 'Participate in discovery',
    description:
      'Eligible listings can join normal Property Listify discovery after review and publication.',
    icon: MapPin,
  },
  {
    label: '03',
    title: 'Respond to enquiries',
    description: 'See the property context that helps you understand an enquiry.',
    icon: Inbox,
  },
  {
    label: '04',
    title: 'Keep follow-up visible',
    description: 'Use supported activity and productivity views to track the next action.',
    icon: BellRing,
  },
];

const agentValuePillars = [
  {
    label: 'Professional identity',
    title: 'Build a presence people can recognise.',
    description:
      'Create an Agent profile with your professional details and contact information. Connect your public profile to the property portfolio you manage.',
    details: ['Professional profile', 'Contact details', 'Public Agent mini-site'],
    icon: UserRound,
  },
  {
    label: 'Property portfolio',
    title: 'Manage the properties behind your business.',
    description:
      'Create and update listing details and media, prepare private drafts, submit eligible properties and follow their review and publication status.',
    details: ['Listing creation and editing', 'Private drafts', 'Review status'],
    icon: ListChecks,
  },
  {
    label: 'Marketplace participation',
    title: 'Connect approved listings to discovery.',
    description:
      'Eligible listings can appear on public property pages and in normal Property Listify search after they pass review and are published.',
    details: ['Public property pages', 'Normal search and discovery', 'Profile linked to listings'],
    icon: MapPin,
  },
  {
    label: 'Enquiries and prospects',
    title: 'Keep property interest in context.',
    description:
      'Receive enquiries from public journeys, see the property connected to the conversation, and use supported notes, follow-ups and viewing scheduling.',
    details: ['Enquiry information', 'Prospect follow-up', 'Viewing coordination'],
    icon: Inbox,
  },
  {
    label: 'Agent workspace',
    title: 'Keep the work together in one place.',
    description:
      'Use the Agent dashboard for portfolio and listing status, enquiry activity, productivity, analytics and supported commission and earnings views.',
    details: ['Dashboard and portfolio', 'Activity and analytics', 'Earnings views'],
    icon: BarChart3,
  },
  {
    label: 'Professional growth',
    title: 'Present your business across the ecosystem.',
    description:
      'Bring your identity and portfolio together so property seekers can discover eligible published listings and connect with you.',
    details: ['Recognisable presence', 'Connected portfolio', 'More ways to be discovered'],
    icon: MessageSquareText,
  },
];

const launchAccessIncludes = [
  'Agent professional profile and public mini-site',
  'Listing creation, editing, media and review-status tracking',
  'Normal search and discovery for eligible approved listings',
  'Property enquiries with lead-pipeline context',
  'Prospect notes, follow-ups and viewing scheduling',
  'Workspace analytics, activity and commission or earnings views',
];

const agentCapabilities = [
  {
    title: 'A professional presence',
    text: 'Build an Agent profile connected to the inventory and work you bring to the marketplace.',
    icon: UserRound,
  },
  {
    title: 'Listings with context',
    text: 'Create and manage property inventory, then keep property details connected to interest.',
    icon: FileText,
  },
  {
    title: 'Enquiries and follow-up',
    text: 'Use the supported enquiry pipeline, notes, follow-ups and viewing scheduling tools.',
    icon: MessageSquareText,
  },
  {
    title: 'A view of your activity',
    text: 'Review supported listing, enquiry, productivity and earnings information in your workspace.',
    icon: BarChart3,
  },
];

const agentSteps = [
  {
    number: '01',
    title: 'Create your Agent account',
    text: 'Start with your account and professional profile.',
  },
  {
    number: '02',
    title: 'Review Agent Launch Access',
    text: 'Confirm the current price, access term and active-listing limit shown in the offer.',
  },
  {
    number: '03',
    title: 'Request an invoice and pay by EFT',
    text: 'Use the existing invoice and manual payment process.',
  },
  {
    number: '04',
    title: 'Start after payment verification',
    text: 'Finance verification activates the paid term; payment proof alone does not.',
  },
];

const agentFaqs = [
  {
    question: 'What is Agent Launch Access?',
    answer:
      'It is a paid, once-off 90-day term for the complete supported Agent workspace. The current price, term and active-listing limit are confirmed from the current price list, and access does not renew automatically.',
  },
  {
    question: 'What do I get during Launch Access?',
    answer:
      'The supported Agent feature set includes your professional profile, property portfolio and listing tools, normal marketplace participation for eligible published listings, enquiry and follow-up tools, analytics and commission or earnings views.',
  },
  {
    question: 'Can I publish a listing as soon as I create it?',
    answer:
      'No. Before approved commercial activation, listings can be prepared as private drafts. After access is activated, eligible listings must still pass the normal review and publication rules before they appear publicly.',
  },
  {
    question: 'How many active listings are included?',
    answer:
      'The current Agent Launch Access limit is up to 50 active listings. Ownership, profile, verification, publication-quality and anti-abuse rules continue to apply.',
  },
  {
    question: 'Does Property Listify guarantee leads or sales?',
    answer:
      'No. Property Listify provides discovery surfaces and supported enquiry workflows. Demand and outcomes depend on your inventory, location, pricing, responsiveness and buyer behaviour.',
  },
  {
    question: 'When does my access begin?',
    answer:
      'The paid term begins after Property Listify finance verifies your manual EFT payment. Requesting an invoice or submitting payment proof does not activate access.',
  },
  {
    question: 'What happens when the 90 days end?',
    answer:
      'Access expires after the fixed 90-day term and does not renew automatically. Continued access would require a future approved Agent product; its price and structure are not promised here.',
  },
];

export default function AdvertiseAgentJourneyPreviewPage() {
  const catalog = useCommercialCatalog('agent');
  usePreviewSeo(
    'Property Listify for Agents | Preview',
    'Explore the Agent Launch Access workspace for professional presence, listings, marketplace participation, enquiries and follow-up.',
  );
  const product = catalog.data?.products.find(
    item => item.productKey === 'agent_launch_access' && item.term.kind === 'paid_launch_access',
  );
  const price = product ? getCommercialPricePresentation(product) : null;
  const term = product ? getCommercialTermPresentation(product) : null;
  const listingLimit = product?.limits.max_active_listings;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <EnhancedNavbar />

      <main id="main-content">
        <section className="overflow-hidden bg-[#08264f] text-white">
          <div className="mx-auto grid max-w-[1600px] lg:min-h-[610px] lg:grid-cols-2">
            <div className="flex items-center px-5 py-12 sm:px-8 lg:px-14 lg:py-20 xl:px-20">
              <div className="max-w-2xl">
                <Link
                  href="/advertise/partner-preview"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-100 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back to business paths
                </Link>
                <p className="mt-10 text-xs font-bold uppercase tracking-[0.18em] text-[#f1c34e]">
                  Early Access · Full Agent Experience
                </p>
                <h1 className="mt-4 font-serif text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-white sm:text-6xl lg:text-[4.35rem]">
                  Everything you need to build and manage your property business.
                </h1>
                <p className="mt-5 max-w-xl text-lg leading-8 text-blue-100 sm:text-xl">
                  Establish your professional presence, build your property portfolio, participate
                  in the Property Listify marketplace and manage prospective customer enquiries
                  through one connected Agent workspace.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <a
                    href="#agent-access"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#e8b333] px-6 text-sm font-bold text-[#102b4f] transition hover:bg-[#f0c14c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#08264f]"
                  >
                    Explore Agent Launch Access <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </a>
                  <Link
                    href="/contact"
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/35 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    Talk to our team
                  </Link>
                </div>
                <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-blue-100">
                  <span className="inline-flex items-center gap-2">
                    <CircleDollarSign className="h-4 w-4 text-[#f1c34e]" aria-hidden="true" />
                    {price?.kind === 'fixed' ? `${price.label} once-off` : 'Assisted access'}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#f1c34e]" aria-hidden="true" />
                    Complete supported Agent workspace
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-[#f1c34e]" aria-hidden="true" />
                    {term?.label || '90-day introductory access'}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#f1c34e]" aria-hidden="true" />
                    {term?.renewalLabel || 'No automatic renewal'}
                  </span>
                </div>
              </div>
            </div>
            <div className="relative min-h-[300px] overflow-hidden lg:min-h-full lg:rounded-l-[5rem]">
              <img
                src="/images/city-guides-v1/johannesburg-960.webp"
                alt="Johannesburg property landscape at golden hour"
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#071d37]/55 to-transparent" />
              <p className="absolute bottom-5 left-6 text-xs font-semibold uppercase tracking-[0.15em] text-white drop-shadow sm:left-8">
                Your profile · Your listings · Your next step
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a77717]">
                Included with Agent Launch Access
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.04em] text-[#092b59] sm:text-4xl">
                The tools and presence to move your property business forward.
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                One connected Agent experience for your professional identity, property portfolio,
                marketplace activity and the work that follows an enquiry.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {agentValuePillars.map((pillar, index) => {
                const Icon = pillar.icon;
                return (
                  <article
                    key={pillar.label}
                    className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_36px_-28px_rgba(8,38,79,0.35)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef4fb] text-[#0f3d7c]">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="text-xs font-bold tracking-[0.12em] text-[#a77717]">
                        0{index + 1}
                      </span>
                    </div>
                    <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      {pillar.label}
                    </p>
                    <h3 className="mt-2 text-xl font-bold leading-snug text-[#092b59]">
                      {pillar.title}
                    </h3>
                    <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">
                      {pillar.description}
                    </p>
                    <ul className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                      {pillar.details.map(detail => (
                        <li
                          key={detail}
                          className="flex items-start gap-2 text-xs leading-5 text-slate-600"
                        >
                          <Check
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0f3d7c]"
                            aria-hidden="true"
                          />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
            <div className="mt-7 flex items-start gap-3 rounded-2xl border border-blue-100 bg-[#f3f6fb] px-5 py-4 text-sm leading-6 text-slate-700">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0f3d7c]" aria-hidden="true" />
              <p>
                Profiles and drafts can be prepared privately. Public listings require approved
                commercial activation and normal review. Launch Access does not guarantee search
                priority, traffic, enquiries, leads or sales.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a77717]">
                The work behind every listing
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.04em] text-[#092b59] sm:text-4xl">
                Keep the full agent workflow in view.
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                From organising inventory to following up on an enquiry, the Agent workspace brings
                the supported parts of your day-to-day property work together.
              </p>
            </div>
            <div className="mt-11 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
              {agentJourney.map((step, index) => {
                const Icon = step.icon;
                return (
                  <article key={step.label} className="relative border-t border-slate-200 pt-6">
                    {index < agentJourney.length - 1 ? (
                      <span className="absolute right-0 top-[-1px] hidden h-px w-8 bg-[#e8b333] lg:block" />
                    ) : null}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold tracking-[0.14em] text-[#a77717]">
                        {step.label}
                      </span>
                      <Icon className="h-5 w-5 text-[#0f3d7c]" aria-hidden="true" />
                    </div>
                    <h3 className="mt-5 text-base font-bold text-[#092b59]">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="overflow-x-clip bg-[#f3f6fb] px-5 py-16 sm:px-8 lg:py-20">
          <div className="mx-auto grid max-w-[1600px] items-center gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16 lg:pl-[max(2rem,calc((100vw-80rem)/2))]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a77717]">
                A workspace for the work around your listings
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#092b59] sm:text-4xl">
                More than getting a property online.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Keep inventory, property interest and follow-up connected, with supported views for
                the activity across your Agent business.
              </p>
              <div className="mt-7 space-y-4">
                {agentCapabilities.map(capability => {
                  const Icon = capability.icon;
                  return (
                    <div key={capability.title} className="flex gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#0f3d7c] shadow-sm">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-[#092b59]">{capability.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{capability.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="relative min-w-0 xl:mr-[calc(-1*max(0px,calc((100vw-96rem)/2+1rem)))] xl:translate-x-24 xl:w-[calc(100%+max(0px,calc((100vw-96rem)/2+1rem)))]">
              <AgentWorkspacePreview compact />
              <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                Illustrative workspace view. Example activity is not live market data or a promise
                of results.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-16">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a77717]">
                  Agent Launch Access
                </p>
                <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#092b59] sm:text-4xl">
                  {price?.kind === 'fixed'
                    ? `${price.label} once-off. ${term?.label || '90 days'} of the complete Agent experience.`
                    : 'Assisted access to the complete Agent experience.'}
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  Use every supported Agent workspace feature during your access term—from your
                  professional profile and listings to enquiry follow-up and activity views, with up
                  to {listingLimit ?? 50} active listings and no automatic renewal.
                </p>
                <div className="mt-6 space-y-3 text-sm leading-6 text-slate-700">
                  <p className="flex items-start gap-3">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-[#0f3d7c]" aria-hidden="true" />
                    Once-off access for the fixed term.
                  </p>
                  <p className="flex items-start gap-3">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-[#0f3d7c]" aria-hidden="true" />
                    No automatic renewal.
                  </p>
                  <p className="flex items-start gap-3">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-[#0f3d7c]" aria-hidden="true" />
                    Payment is verified through the existing invoice and manual EFT process.
                  </p>
                </div>
              </div>

              <div
                id="agent-access"
                className="scroll-mt-24 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_70px_-38px_rgba(8,38,79,0.35)]"
              >
                <div className="bg-[#08264f] px-6 py-6 text-white sm:px-8">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f1c34e]">
                    Independent Agent
                  </p>
                  <h3 className="mt-2 font-serif text-2xl font-semibold">90-Day Launch Access</h3>
                  <p className="mt-2 text-sm text-blue-100">
                    A once-off introductory term. No automatic renewal.
                  </p>
                </div>
                <div className="p-6 sm:p-8">
                  <div className="mb-6 rounded-2xl border border-[#efd690] bg-[#fff9e8] p-4">
                    <p className="text-sm font-extrabold text-[#092b59]">
                      The full Agent workspace is included
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Every supported Agent tool is available during Launch Access. Any applicable
                      term and active-listing limit are shown below.
                    </p>
                  </div>
                  {price?.kind === 'fixed' ? (
                    <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                      <p className="text-4xl font-bold tracking-[-0.05em] text-[#092b59]">
                        {price.label}
                      </p>
                      <p className="pb-1 text-sm font-medium text-slate-500">
                        {price.period?.trim() || 'once-off'}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-2xl font-bold tracking-[-0.03em] text-[#092b59]">
                        Assisted access path
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        Contact Property Listify to confirm the current price and access term.
                      </p>
                    </div>
                  )}
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-[#f3f6fb] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        Access term
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#092b59]">
                        {term?.label || '90 days'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#f3f6fb] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        Active inventory
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#092b59]">
                        {typeof listingLimit === 'number'
                          ? `Up to ${listingLimit} listings`
                          : 'Up to 50 listings'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-7">
                    <h4 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#092b59]">
                      Included with your access
                    </h4>
                    <ul className="mt-3 divide-y divide-slate-100">
                      {launchAccessIncludes.map(feature => (
                        <li
                          key={feature}
                          className="flex items-start gap-3 py-3 text-sm leading-5 text-slate-700"
                        >
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <a
                    href={AGENT_ACCOUNT_START_HREF}
                    className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#e8b333] px-5 text-sm font-bold text-[#102b4f] transition hover:bg-[#f0c14c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f3d91] focus-visible:ring-offset-2"
                  >
                    Create your Agent account <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                  <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                    Account setup is private. Paid access begins only after finance verifies
                    payment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f3f6fb] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a77717]">
                A clear path to access
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.04em] text-[#092b59] sm:text-4xl">
                From first look to an active Agent workspace
              </h2>
            </div>
            <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
              {agentSteps.map(step => (
                <div key={step.number} className="relative border-t border-[#cdd8e6] pt-6">
                  <span className="absolute -top-4 left-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#e8b333] text-xs font-extrabold text-[#102b4f] ring-4 ring-[#f3f6fb]">
                    {step.number}
                  </span>
                  <h3 className="mt-2 text-sm font-bold text-[#092b59]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 flex items-start gap-3 rounded-2xl border border-blue-100 bg-white px-5 py-4 text-sm leading-6 text-slate-600">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0f3d7c]" aria-hidden="true" />
              Launch Access does not guarantee leads, traffic, viewings or sales. Search and
              publication follow the normal product rules.
            </p>
          </div>
        </section>

        <section className="bg-white px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a77717]">
                Agent Launch Access FAQs
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.04em] text-[#092b59] sm:text-4xl">
                Make an informed decision.
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Want to discuss your situation first? Our team can help with the next step.
              </p>
              <Link
                href="/contact"
                className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#0f3d7c]"
              >
                Contact Property Listify <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="divide-y divide-slate-200 border-y border-slate-200">
              {agentFaqs.map(faq => (
                <details key={faq.question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-[#092b59] marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f3d91]">
                    {faq.question}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f3f6fb] text-[#0f3d7c] transition group-open:rotate-180">
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </summary>
                  <p className="max-w-3xl pr-8 pt-3 text-sm leading-6 text-slate-600">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pb-14 sm:px-8 lg:px-12">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-3xl bg-gradient-to-r from-[#08264f] to-[#15508d] px-7 py-8 text-white sm:flex-row sm:items-center sm:px-10 sm:py-9">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f1c34e]">
                Your next step
              </p>
              <h2 className="mt-2 font-serif text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
                Ready to build your Agent presence?
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                Start with a private Agent account, review the current access details and continue
                when you are ready.
              </p>
            </div>
            <a
              href={AGENT_ACCOUNT_START_HREF}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#e8b333] px-6 text-sm font-bold text-[#102b4f] transition hover:bg-[#f0c14c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e3b70]"
            >
              Create your Agent account <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
