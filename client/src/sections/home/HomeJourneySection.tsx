import { Building2, MapPinned, SearchCheck } from 'lucide-react';

const journeySteps = [
  {
    title: 'Discover',
    description: 'Search homes, developments and local areas from one starting point.',
    icon: SearchCheck,
  },
  {
    title: 'Decide',
    description: 'Use property details and location context to build a clearer shortlist.',
    icon: MapPinned,
  },
  {
    title: 'Connect',
    description: 'Find agents, developers and service businesses when you need support.',
    icon: Building2,
  },
] as const;

export function HomeJourneySection() {
  return (
    <section className="home-section bg-slate-50" aria-labelledby="home-journey-heading">
      <div className="home-section-content">
        <div className="home-section-header max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2774AE]">
            One connected property journey
          </p>
          <h2
            id="home-journey-heading"
            className="home-section-title mt-2 text-[1.125rem] font-bold text-slate-900 sm:text-xl md:text-[26px]"
          >
            Make every property move with more context.
          </h2>
          <p className="max-w-3xl text-[13px] leading-5 text-slate-600 md:text-sm md:leading-6">
            Property Listify brings discovery, decision-making and the people around a property
            move into one connected experience.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {journeySteps.map(({ title, description, icon: Icon }, index) => (
            <article
              key={title}
              className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#2774AE]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="text-xs font-bold tabular-nums text-slate-300">0{index + 1}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
