import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, ChevronDown, MapPin } from 'lucide-react';
import { CITY_GUIDES, cityGuideImage, type CityGuide } from '@/lib/cityGuides';

interface ExploreCitiesProps {
  title?: string;
  description?: string;
  withinContentRail?: boolean;
  /** How many city cards show before "Show more cities". */
  initialLimit?: number;
}

function CityCard({ city }: { city: CityGuide }) {
  const image = cityGuideImage(city.slug);
  return (
    <Link
      href={city.href}
      className="group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2774AE]"
    >
      <div className="aspect-[16/9] overflow-hidden bg-slate-100">
        <img
          src={image.src}
          srcSet={image.srcSet}
          sizes="(min-width: 1024px) 270px, (min-width: 640px) 25vw, 46vw"
          width={image.width}
          height={image.height}
          alt={`${city.name}, ${city.province}`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="text-[15px] font-bold leading-snug text-slate-900 group-hover:text-[#2774AE] sm:text-base">
          {city.name}
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
          <MapPin className="size-3 shrink-0" aria-hidden="true" />
          {city.province}
        </p>
      </div>
    </Link>
  );
}

/** Public place discovery: photo cards for cities with a published page, then the national list. */
export function ExploreCities({
  title = 'Explore South Africa by area',
  description = 'Find a province, city, town or suburb and see what is happening there.',
  withinContentRail = false,
  initialLimit = 8,
}: ExploreCitiesProps = {}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? CITY_GUIDES : CITY_GUIDES.slice(0, initialLimit);
  const hasMore = CITY_GUIDES.length > initialLimit;

  return (
    <section className="home-section bg-white">
      <div className={withinContentRail ? 'home-section-content' : 'container'}>
        <div className="home-section-header flex flex-wrap items-end justify-between gap-4 text-left">
          <div className="max-w-3xl">
            <h2 className="home-section-title text-[1.125rem] font-bold text-slate-900 sm:text-xl md:text-[26px]">
              {title}
            </h2>
            <p className="text-[13px] leading-5 text-slate-600 md:text-sm md:leading-6">
              {description}
            </p>
          </div>
          <Link
            href="/south-africa"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-[#2774AE] px-4 py-2 text-sm font-bold text-white hover:bg-[#1e5d8c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <MapPin className="size-4" aria-hidden="true" />
            Browse locations
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <ul
          data-testid="city-guide-grid"
          className="home-card-grid grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4"
        >
          {visible.map(city => (
            <li key={city.slug} className="min-w-0">
              <CityCard city={city} />
            </li>
          ))}
        </ul>
        {hasMore && !expanded ? (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2774AE]"
            >
              Show more cities
              <ChevronDown className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
