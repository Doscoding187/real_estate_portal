// Why this section exists, what it says and its rules: docs/product/homepage/professionals.md
import { ArrowRight, BriefcaseBusiness, Building2, KeyRound, UsersRound } from 'lucide-react';

const PROFESSIONAL_PATHS = [
  {
    title: 'Agents',
    get: 'A public profile, your listings and your enquiries in one place.',
    today: 'Create your account and set up your profile now. Publishing opens soon.',
    href: '/advertise/sell/agents',
    cta: 'Set up your agent profile',
    icon: BriefcaseBusiness,
  },
  {
    title: 'Agencies',
    get: 'One home for your agency, your team and your listings.',
    today: 'Agency accounts are not open yet. See how it will work and get in touch.',
    href: '/advertise/sell/agencies',
    cta: 'See agency details',
    icon: UsersRound,
  },
  {
    title: 'Developers',
    get: 'A place to present your developments and receive enquiries.',
    today: 'Developer accounts are not open yet. See how it will work and get in touch.',
    href: '/advertise/sell/developers',
    cta: 'See developer details',
    icon: Building2,
  },
] as const;

export function ListWithUsSection() {
  return (
    <section
      data-testid="home-professional-entry"
      aria-labelledby="professional-entry-heading"
      className="rounded-[26px] border border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-[#0f4c81] px-5 py-8 text-white shadow-[0_18px_50px_rgba(15,23,42,0.16)] md:px-10 md:py-10"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">
            For property professionals
          </p>
          <h2 id="professional-entry-heading" className="mt-3 text-2xl font-bold md:text-3xl">
            List with Property Listify
          </h2>
          <p className="mt-3 text-sm leading-7 text-white md:text-base">
            Put your properties, your profile and your developments where buyers and renters are
            already looking.
          </p>
        </div>
        <a
          href="/advertise"
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 self-start text-sm font-bold text-white underline underline-offset-4 hover:text-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:self-auto"
        >
          See all options <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>

      <div className="mt-7 grid gap-3 md:grid-cols-3">
        {PROFESSIONAL_PATHS.map(({ title, get, today, href, cta, icon: Icon }) => (
          <article
            key={title}
            className="flex flex-col rounded-2xl border border-white/15 bg-white/[0.07] p-4"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-base font-bold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-white">{get}</p>
            <p className="mt-2 flex-1 text-sm font-semibold leading-6 text-white">{today}</p>
            <a
              href={href}
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-white px-5 text-sm font-bold text-slate-900 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              {cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </article>
        ))}
      </div>

      <div
        data-testid="home-owner-card"
        className="mt-3 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-slate-900 md:flex-row md:items-center md:justify-between"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-950">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
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
