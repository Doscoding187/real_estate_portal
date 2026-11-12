import { ArrowRight, BriefcaseBusiness, Building2, UsersRound } from 'lucide-react';
import { COMMERCIAL_ACTIVATION_STATE } from '@shared/commercialActivation';

const COMMERCIAL_PROFESSIONAL_PATHS = [
  {
    title: 'Agents',
    get: 'A public profile, your listings and your property enquiries in one place.',
    today: 'See what is included and how to get started.',
    href: '/advertise/sell/agents',
    cta: 'See agent options',
    icon: BriefcaseBusiness,
  },
  {
    title: 'Agencies',
    get: 'One home for your agency, your team and your listings.',
    today: 'See what is included and how to get started.',
    href: '/advertise/sell/agencies',
    cta: 'See agency options',
    icon: UsersRound,
  },
  {
    title: 'Developers',
    get: 'A place to present your developments and receive enquiries.',
    today: 'See what is included and how to get started.',
    href: '/advertise/sell/developers',
    cta: 'See developer options',
    icon: Building2,
  },
] as const;

const PREPARATION_PROFESSIONAL_PATHS = [
  {
    title: 'Agents',
    get: 'A public profile, your listings and your property enquiries in one place.',
    today: 'Set up your profile and prepare listings now. Publishing opens soon.',
    href: '/advertise/sell/agents',
    cta: 'Set up your agent profile',
    icon: BriefcaseBusiness,
  },
  {
    title: 'Agencies',
    get: 'One home for your agency, your team and your listings.',
    today: 'Agency accounts open soon. See how it will work and get in touch.',
    href: '/advertise/sell/agencies',
    cta: 'See agency details',
    icon: UsersRound,
  },
  {
    title: 'Developers',
    get: 'A place to present your developments and receive enquiries.',
    today: 'Developer accounts open soon. See how it will work and get in touch.',
    href: '/advertise/sell/developers',
    cta: 'See developer details',
    icon: Building2,
  },
] as const;

export function ProfessionalEntrySection() {
  const preparationOnly = !COMMERCIAL_ACTIVATION_STATE.enabled;
  const professionalPaths = preparationOnly
    ? PREPARATION_PROFESSIONAL_PATHS
    : COMMERCIAL_PROFESSIONAL_PATHS;

  return (
    <section
      data-testid="home-professional-entry"
      aria-labelledby="professional-entry-heading"
      className="rounded-[26px] border border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-[#0f4c81] px-6 py-8 text-white shadow-[0_18px_50px_rgba(15,23,42,0.16)] md:px-10 md:py-10"
    >
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">
          For property professionals
        </p>
        <h2 id="professional-entry-heading" className="mt-3 text-2xl font-bold md:text-3xl">
          {preparationOnly
            ? 'List and grow with Property Listify.'
            : 'Grow your property business with Property Listify.'}
        </h2>
        <p className="mt-3 text-sm leading-7 text-white/90 md:text-base">
          {preparationOnly
            ? 'Agents can set up now. Agencies and developers can see what is coming. Publishing opens soon.'
            : 'Choose your role to see what is included and how to get started.'}
        </p>
      </div>

      <div className="mt-7 grid gap-3 md:grid-cols-3">
        {professionalPaths.map(({ title, get, today, href, cta, icon: Icon }) => (
          <a
            key={title}
            href={href}
            className="group rounded-2xl border border-white/15 bg-white/[0.07] p-4 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.12]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-base font-bold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/90">{get}</p>
            <p className="mt-2 min-h-[3rem] text-sm font-semibold leading-6 text-white">{today}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-white">
              {cta}{' '}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
