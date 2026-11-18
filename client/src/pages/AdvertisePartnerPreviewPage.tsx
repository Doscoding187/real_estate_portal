import {
  ArrowDown,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Handshake,
  House,
  MessageCircleMore,
  Search,
  Store,
  UserRound,
  Wrench,
} from 'lucide-react';
import { Link } from 'wouter';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { Footer } from '@/components/Footer';
import { usePreviewSeo } from '@/hooks/usePreviewSeo';

const audiencePaths = [
  {
    title: 'Independent agents',
    description:
      'Build your professional presence and manage your listings and enquiries in one place.',
    href: '/advertise/partner-preview/agents',
    action: 'Explore agent access',
    image: '/images/city-guides-v1/johannesburg-960.webp',
    imageAlt: 'Johannesburg homes and city buildings',
    icon: UserRound,
    imageClass: 'object-[center_48%]',
  },
  {
    title: 'Real estate agencies',
    description:
      'Bring your agency identity, team, eligible inventory and enquiry workflows together.',
    href: '/advertise/partner-preview/agencies',
    action: 'Explore agency access',
    image: '/properties/property-detail-preview-v1/living-kitchen.webp',
    imageAlt: 'Bright contemporary interior of a residential property',
    icon: Building2,
    imageClass: 'object-center',
  },
  {
    title: 'Property developers',
    description:
      'Organise development projects and unit inventory, and present projects to property seekers.',
    href: '/advertise/sell/developers',
    action: 'Explore developer access',
    image: '/placeholders/development_placeholder_1_1763712033438.png',
    imageAlt: 'Modern residential development',
    icon: House,
    imageClass: 'object-[center_52%]',
  },
  {
    title: 'Service providers',
    description: 'Explore the reviewed provider directory for property and home-related services.',
    href: '/advertise/services',
    action: 'Explore provider access',
    image: '/images/services/hero-services.jpg',
    imageAlt: 'Home improvement and property service work',
    icon: Store,
    imageClass: 'object-[center_45%]',
  },
  {
    title: 'Other partners',
    description: 'Have a property-sector partnership idea that does not fit the paths above?',
    href: '/contact?area=other&topic=partnership',
    action: 'Make a partnership enquiry',
    image: '/images/services/ecosystem-property.jpg',
    imageAlt: 'Homes and services connected through the property journey',
    icon: Handshake,
    imageClass: 'object-center',
  },
];

const participationPoints = [
  {
    number: '01',
    title: 'Choose your path',
    description: 'Start with the page that matches your role and business.',
  },
  {
    number: '02',
    title: 'Review the offer',
    description: 'See the supported tools, current terms and available next steps.',
  },
  {
    number: '03',
    title: 'Set up privately',
    description: 'Complete the account and business details for your participation path.',
  },
  {
    number: '04',
    title: 'Complete activation',
    description: 'Finish any applicable payment, review and approval steps for access.',
  },
];

const roleCapabilities = [
  {
    title: 'Independent agents',
    detail: 'Professional profile, listing management, enquiries and follow-up tools.',
    icon: UserRound,
  },
  {
    title: 'Agencies',
    detail: 'Team roles, shared inventory, listing attribution and enquiry workflows.',
    icon: Building2,
  },
  {
    title: 'Developers',
    detail: 'Development portfolios, structured unit inventory and project enquiries.',
    icon: House,
  },
  {
    title: 'Service providers',
    detail: 'Reviewed provider profiles and private service-request workflows.',
    icon: Store,
  },
];

const journeyStages = [
  { title: 'Explore property', icon: Search },
  { title: 'Work with a professional', icon: BriefcaseBusiness },
  { title: 'Find a related service', icon: Wrench },
];

const commonQuestions = [
  {
    question: 'Where can I see pricing and participation terms?',
    answer:
      'Each audience page explains the offer and current terms for that business type. Service provider participation follows a separate reviewed-provider model.',
  },
  {
    question: 'Does joining guarantee enquiries or sales?',
    answer:
      'No. Property Listify provides supported products, discovery surfaces and enquiry workflows. Results depend on factors such as inventory, location, pricing, responsiveness and customer decisions.',
  },
  {
    question: 'When do I create an account and become active?',
    answer:
      'After you decide to proceed, you complete the private setup for your role. Payment, review and approval requirements vary by participation path; access follows the applicable requirements.',
  },
];

export default function AdvertisePartnerPreviewPage() {
  usePreviewSeo(
    'Advertise & Partner Preview | Property Listify',
    'Preview the Property Listify commercial participation page for agents, agencies, developers, service providers and partners.',
  );

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <EnhancedNavbar />

      <main id="main-content">
        <section className="overflow-hidden bg-[#08264f] text-white">
          <div className="mx-auto grid max-w-[1600px] lg:min-h-[570px] lg:grid-cols-2">
            <div className="flex items-center px-5 py-14 sm:px-8 lg:px-14 lg:py-20 xl:px-20">
              <div className="max-w-2xl">
                <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#f1c34e]">
                  <span className="h-px w-7 bg-[#e6b33c]" />
                  For property businesses and partners
                </p>
                <h1 className="mt-5 font-serif text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-white sm:text-6xl lg:text-[4.3rem]">
                  Your business has a place in the property journey.
                </h1>
                <p className="mt-5 max-w-xl text-lg font-semibold leading-7 text-blue-100 sm:text-xl">
                  Property Listify brings property professionals, developments and related services
                  into a connected property marketplace.
                </p>
                <p className="mt-3 max-w-lg text-base leading-7 text-slate-200">
                  Explore the business path that fits you, learn what is available for your role and
                  decide how you would like to take part.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <a
                    href="#business-paths"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#e8b333] px-6 text-sm font-bold text-[#102b4f] shadow-lg shadow-black/20 transition hover:bg-[#f0c14c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#08264f]"
                  >
                    Explore your options <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </a>
                  <Link
                    href="/contact"
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/35 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#08264f]"
                  >
                    Talk to our team
                  </Link>
                </div>
              </div>
            </div>
            <div className="relative min-h-[300px] overflow-hidden lg:min-h-full lg:rounded-l-[5rem]">
              <img
                src="/properties/property-detail-preview-v1/hero-exterior.webp"
                alt="Contemporary home at dusk"
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#071d37]/55 to-transparent" />
              <p className="absolute bottom-5 left-6 text-xs font-semibold uppercase tracking-[0.15em] text-white drop-shadow sm:left-8">
                Property · People · Possibility
              </p>
            </div>
          </div>
        </section>

        <section
          id="business-paths"
          className="scroll-mt-24 bg-white px-5 py-16 sm:px-8 lg:px-12 lg:py-20"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a77717]">
                Choose your path
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.04em] text-[#092b59] sm:text-4xl">
                Find the fit for your business
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Each path explains the relevant product, participation terms and next step for that
                kind of business.
              </p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
              {audiencePaths.map(path => {
                const Icon = path.icon;
                return (
                  <article
                    key={path.title}
                    className="group flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_36px_-28px_rgba(15,43,80,0.35)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_22px_45px_-30px_rgba(15,43,80,0.42)]"
                  >
                    <div className="relative h-40 overflow-hidden bg-slate-100 sm:h-36 xl:h-32">
                      <img
                        src={path.image}
                        alt={path.imageAlt}
                        loading="lazy"
                        className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.04] ${path.imageClass}`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#092b59]/55 via-transparent to-transparent" />
                      <span className="absolute bottom-3 left-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-white text-[#123c70] shadow-md">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="text-base font-bold tracking-tight text-[#092b59]">
                        {path.title}
                      </h3>
                      <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
                        {path.description}
                      </p>
                      <Link
                        href={path.href}
                        className="mt-5 inline-flex min-h-10 items-center gap-2 self-start text-sm font-bold text-[#0f3d7c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f3d91] focus-visible:ring-offset-2"
                      >
                        {path.action}
                        <ArrowRight
                          className="h-4 w-4 text-[#bd8b1a] transition group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </Link>
                    </div>
                    <div className="h-1 bg-[#e8b333]" />
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-[#f7f5ef] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a77717]">
                A wider property journey
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#092b59] sm:text-4xl">
                Property decisions bring different businesses together.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                People explore homes and developments, work with property professionals and look for
                related services along the way. Property Listify gives these businesses distinct
                ways to present and manage their work.
              </p>
            </div>
            <div className="relative grid gap-4 sm:grid-cols-3">
              <div className="absolute left-[16%] right-[16%] top-8 hidden h-px bg-[#d7c28a] sm:block" />
              {journeyStages.map((stage, index) => {
                const Icon = stage.icon;
                return (
                  <div key={stage.title} className="relative text-center">
                    <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#e6d9b9] bg-white text-[#123c70] shadow-sm">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                      <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#e8b333] text-[10px] font-bold text-[#102b4f]">
                        {index + 1}
                      </span>
                    </div>
                    <h3 className="mx-auto mt-4 max-w-40 text-sm font-bold leading-5 text-[#092b59]">
                      {stage.title}
                    </h3>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a77717]">
                Tools shaped around your role
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.04em] text-[#092b59] sm:text-4xl">
                Different businesses. Relevant ways to work.
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                The supported workspace and participation terms depend on the path you choose.
                Explore your audience page for the current details.
              </p>
            </div>
            <div className="mt-9 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
              {roleCapabilities.map(capability => {
                const Icon = capability.icon;
                return (
                  <div key={capability.title} className="border-t-2 border-[#e8b333] pt-5">
                    <Icon className="h-6 w-6 text-[#0f3d7c]" aria-hidden="true" />
                    <h3 className="mt-4 text-sm font-bold text-[#092b59]">{capability.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{capability.detail}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-7 flex items-start gap-2 text-xs leading-5 text-slate-500">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8b6a20]" aria-hidden="true" />
              Service provider participation is currently reviewed; it does not use the same paid
              Launch Access offer as agents, agencies and developers.
            </p>
          </div>
        </section>

        <section className="border-y border-[#e5ebf3] bg-[#f3f6fb] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a77717]">
                Participation, made clear
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#092b59] sm:text-4xl">
                From exploring the offer to getting started
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Learn what is available before entering private account setup.
              </p>
            </div>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {participationPoints.map(point => (
                <div key={point.number} className="relative border-t border-[#d3dce8] pt-5">
                  <span className="absolute -top-4 left-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#e8b333] text-xs font-extrabold text-[#102b4f] ring-4 ring-[#f3f6fb]">
                    {point.number}
                  </span>
                  <h3 className="mt-2 text-sm font-bold text-[#092b59]">{point.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{point.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a77717]">
                Good to know
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.04em] text-[#092b59] sm:text-4xl">
                Clear answers before you choose.
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Your audience page has the specifics for its product and participation path.
              </p>
              <Link
                href="/contact"
                className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#0f3d7c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f3d91]"
              >
                Ask us a question <MessageCircleMore className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="divide-y divide-slate-200 border-y border-slate-200">
              {commonQuestions.map(item => (
                <details key={item.question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-[#092b59] marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f3d91]">
                    {item.question}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f5f7fa] text-[#0f3d7c] transition group-open:rotate-45">
                      <span aria-hidden="true" className="text-lg font-normal leading-none">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="max-w-3xl pr-8 pt-3 text-sm leading-6 text-slate-600">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-12">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-3xl bg-gradient-to-r from-[#08264f] to-[#15508d] px-7 py-8 text-white sm:flex-row sm:items-center sm:px-10 sm:py-9">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f1c34e]">
                Start a conversation
              </p>
              <h2 className="mt-2 font-serif text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
                Let’s find the right fit for your business.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                Talk with Property Listify if you have questions about participation or want to
                discuss a partnership.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#e8b333] px-6 text-sm font-bold text-[#102b4f] transition hover:bg-[#f0c14c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e3b70]"
            >
              Get in touch <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
