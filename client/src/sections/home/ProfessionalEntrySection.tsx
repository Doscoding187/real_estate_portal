import { ArrowRight, BriefcaseBusiness, Building2, Handshake, UsersRound } from 'lucide-react';

const professionalPaths = [
  {
    title: 'Agents',
    description: 'Present listings, receive property enquiries and organise follow-up.',
    href: '/advertise/sell/agents',
    cta: 'Explore Agent tools',
    icon: BriefcaseBusiness,
  },
  {
    title: 'Agencies',
    description: 'Bring inventory, team workflow and routed enquiries together.',
    href: '/advertise/sell/agencies',
    cta: 'Explore Agency tools',
    icon: UsersRound,
  },
  {
    title: 'Developers',
    description: 'Present developments and unit availability, then manage project enquiries.',
    href: '/advertise/sell/developers',
    cta: 'Explore Developer tools',
    icon: Building2,
  },
  {
    title: 'Service businesses',
    description: 'Introduce your property service to people looking for practical help.',
    href: '/advertise/services',
    cta: 'Explore service solutions',
    icon: Handshake,
  },
] as const;

export function ProfessionalEntrySection() {
  return (
    <section
      data-testid="home-professional-entry"
      aria-labelledby="professional-entry-heading"
      className="rounded-[26px] border border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-[#0f4c81] px-6 py-8 text-white shadow-[0_18px_50px_rgba(15,23,42,0.16)] md:px-10 md:py-10"
    >
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
          For property professionals
        </p>
        <h2 id="professional-entry-heading" className="mt-3 text-2xl font-bold md:text-3xl">
          Build your property business with Property Listify.
        </h2>
        <p className="mt-3 text-sm leading-7 text-white/70 md:text-base">
          Choose the path that fits your role, then explore the supported workspace and commercial
          offering behind it.
        </p>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {professionalPaths.map(({ title, description, href, cta, icon: Icon }) => (
          <a
            key={title}
            href={href}
            className="group rounded-2xl border border-white/15 bg-white/[0.07] p-4 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.12]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-base font-bold text-white">{title}</h3>
            <p className="mt-2 min-h-[3rem] text-sm leading-6 text-white/65">{description}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-white">
              {cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </a>
        ))}
      </div>

      <div className="mt-6">
        <a
          href="/advertise"
          className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 transition hover:text-white"
        >
          Explore all professional solutions <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
