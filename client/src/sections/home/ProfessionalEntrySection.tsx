import { ArrowRight, BriefcaseBusiness } from 'lucide-react';
import { COMMERCIAL_ACTIVATION_STATE } from '@shared/commercialActivation';

const COMMERCIAL_PROFESSIONAL_PATHS = [
  {
    title: 'Agents',
    description: 'Present listings, receive property enquiries and organise follow-up.',
    href: '/advertise/sell/agents',
    cta: 'Explore Agent tools',
    icon: BriefcaseBusiness,
  },
] as const;

const PREPARATION_PROFESSIONAL_PATHS = [
  {
    title: 'Agents',
    description: 'Establish your Agent presence and prepare private listing drafts.',
    href: '/advertise/sell/agents',
    cta: 'Explore Agent preparation',
    icon: BriefcaseBusiness,
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
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
          For property professionals
        </p>
        <h2 id="professional-entry-heading" className="mt-3 text-2xl font-bold md:text-3xl">
          {preparationOnly
            ? 'Establish your Property Listify presence.'
            : 'Build your property business with Property Listify.'}
        </h2>
        <p className="mt-3 text-sm leading-7 text-white/70 md:text-base">
          {preparationOnly
            ? 'Choose the role that fits your work and start the available preparation path before commercial activation.'
            : 'Choose the path that fits your role, then explore the supported workspace and commercial offering behind it.'}
        </p>
      </div>

      <div className="mt-7 grid max-w-md gap-3">
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
              {cta}{' '}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
