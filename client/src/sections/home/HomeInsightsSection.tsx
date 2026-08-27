import { ArrowRight, BookOpenText, ChartNoAxesCombined, Lightbulb } from 'lucide-react';
import { Link } from 'wouter';

const insightPaths = [
  {
    title: 'Market trends',
    description: 'Explore market context, area movement and the questions behind local property demand.',
    href: '/insights/market-trends',
    icon: ChartNoAxesCombined,
  },
  {
    title: 'Property insights',
    description: 'Research property types, affordability signals and location context before you decide.',
    href: '/insights/property-insights',
    icon: Lightbulb,
  },
  {
    title: 'Property Listify blog',
    description: 'Read property education, local explainers and platform updates in one place.',
    href: '/insights/blog',
    icon: BookOpenText,
  },
] as const;

export function HomeInsightsSection() {
  return (
    <section className="home-section bg-white" aria-labelledby="home-insights-heading">
      <div className="container">
        <div className="home-section-header max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2774AE]">Insights</p>
          <h2
            id="home-insights-heading"
            className="home-section-title mt-2 text-[1.125rem] font-bold text-slate-900 sm:text-xl md:text-[26px]"
          >
            Research the move, not just the listing.
          </h2>
          <p className="max-w-3xl text-[13px] leading-5 text-slate-600 md:text-sm md:leading-6">
            Explore market context, practical property research and explainers that help you ask
            better questions while you search.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          {insightPaths.map(({ title, description, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl border border-slate-200 bg-slate-50/70 p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#2774AE] shadow-sm ring-1 ring-slate-100">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-base font-bold text-slate-900">{title}</h3>
              <p className="mt-2 min-h-[3rem] text-sm leading-6 text-slate-600">{description}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#2774AE]">
                Explore insights
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
