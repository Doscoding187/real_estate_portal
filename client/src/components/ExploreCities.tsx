import { Link } from 'wouter';
import { ArrowRight, MapPin } from 'lucide-react';

interface ExploreCitiesProps {
  title?: string;
  description?: string;
  withinContentRail?: boolean;
}

/** Public place discovery always starts from the national Place catalogue. */
export function ExploreCities({
  title = 'Explore canonical places',
  description = 'Find an admitted province, city, town, suburb, or locality in the national Place catalogue.',
  withinContentRail = false,
}: ExploreCitiesProps = {}) {
  return (
    <section className="home-section bg-white">
      <div className={withinContentRail ? 'home-section-content' : 'container'}>
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="max-w-3xl">
            <h2 className="home-section-title text-[1.125rem] font-bold text-slate-900 sm:text-xl md:text-[26px]">
              {title}
            </h2>
            <p className="mt-2 text-[13px] leading-5 text-slate-600 md:text-sm md:leading-6">
              {description}
            </p>
          </div>
          <Link
            href="/south-africa"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-[#2774AE] px-4 py-2 text-sm font-bold text-white hover:bg-[#1e5d8c]"
          >
            <MapPin className="size-4" aria-hidden="true" />
            Browse locations
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
