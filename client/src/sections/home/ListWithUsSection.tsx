// Why this section exists, what it says and its rules: docs/product/homepage/professionals.md
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  KeyRound,
  UsersRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

type RolePath = {
  title: string;
  get: string;
  today: string;
  href: string;
  cta: string;
  icon: LucideIcon;
  open: boolean;
};

const PROFESSIONAL_PATHS: readonly RolePath[] = [
  {
    title: 'Agents',
    get: 'A public profile, your listings and your enquiries in one place.',
    today: 'Create your account and set up your profile now. Publishing opens soon.',
    href: '/advertise/sell/agents',
    cta: 'Set up your agent profile',
    icon: BriefcaseBusiness,
    open: true,
  },
  {
    title: 'Agencies',
    get: 'One home for your agency, your team and your listings.',
    today: 'Agency accounts are not open yet. See how it will work and get in touch.',
    href: '/advertise/sell/agencies',
    cta: 'See agency details',
    icon: UsersRound,
    open: false,
  },
  {
    title: 'Developers',
    get: 'A place to present your developments and receive enquiries.',
    today: 'Developer accounts are not open yet. See how it will work and get in touch.',
    href: '/advertise/sell/developers',
    cta: 'See developer details',
    icon: Building2,
    open: false,
  },
  {
    title: 'Service businesses',
    get: 'A service profile in the property services directory, with requests from people who need you.',
    today: 'Service provider accounts are not open yet. See how it will work and get in touch.',
    href: '/advertise/services',
    cta: 'See service details',
    icon: Wrench,
    open: false,
  },
];

export function ListWithUsSection() {
  return (
    <section
      data-testid="home-professional-entry"
      aria-labelledby="professional-entry-heading"
      className="relative mt-14 overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-slate-950 via-[#0b2a4a] to-[#0f4c81] px-5 py-10 text-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.6)] sm:px-6 md:mt-24 md:rounded-[2rem] md:px-10 md:py-14"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#2774AE]/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">
            For property professionals
          </p>
          <h2
            id="professional-entry-heading"
            className="mt-3 text-[1.75rem] font-bold leading-[1.1] tracking-tight sm:text-4xl md:text-[2.75rem]"
          >
            List with Property Listify
          </h2>
          <p className="mt-4 text-sm leading-6 text-white md:text-lg md:leading-8">
            Put your properties, your profile and your developments where buyers and renters search.
          </p>
        </div>
        <a
          href="/advertise"
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 self-start text-sm font-bold text-white underline underline-offset-4 hover:text-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:self-auto"
        >
          See all options <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>

      <div className="relative mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PROFESSIONAL_PATHS.map(({ title, get, today, href, cta, icon: Icon, open }) => (
          <article
            key={title}
            className={`flex flex-col rounded-2xl border p-5 backdrop-blur-sm ${
              open
                ? 'border-white/40 bg-white/[0.12] shadow-lg shadow-black/20'
                : 'border-white/20 bg-white/[0.06]'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              {open ? (
                <span className="rounded-full bg-emerald-300 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-950">
                  Set up today
                </span>
              ) : (
                <span className="rounded-full border border-amber-300/70 bg-amber-300/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-100">
                  Opening soon
                </span>
              )}
            </div>
            <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-white">{get}</p>
            <p className="mt-3 flex-1 text-sm font-semibold leading-6 text-white">{today}</p>
            <a
              href={href}
              className={`mt-5 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-center text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                open
                  ? 'bg-white text-slate-900 shadow-md hover:bg-blue-50'
                  : 'border border-white/60 bg-transparent text-white hover:bg-white/10'
              }`}
            >
              {cta} <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>
          </article>
        ))}
      </div>

      <div
        data-testid="home-owner-card"
        className="relative mt-5 flex flex-col gap-5 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-amber-100 p-5 text-slate-900 shadow-lg shadow-black/20 md:flex-row md:items-center md:justify-between md:p-6"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-300 text-amber-950">
            <KeyRound className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Selling or letting your own property?
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-800">
              Owners do not list on their own yet. An agent lists your property for you. Find an
              agent near you and ask them to get started.
            </p>
          </div>
        </div>
        <a
          href="/agents"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-slate-900 px-6 text-sm font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          Find an agent <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
