import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowRight, MapPin } from 'lucide-react';
import { CityGlyph } from '@/components/home/CityGlyphs';
import { PROVINCE_TILES, popularCityGuides } from '@/lib/cityGuides';

interface ExploreCitiesProps {
  title?: string;
  description?: string;
  withinContentRail?: boolean;
}

type TabId = 'cities' | 'provinces';

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'cities', label: 'Popular cities' },
  { id: 'provinces', label: 'Provinces' },
];

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2774AE]';

/** One compact tile: tinted visual, divider, name and a muted line. The whole tile is one link. */
function AreaTile({
  href,
  name,
  caption,
  visual,
}: {
  href: string;
  name: string;
  caption: string;
  visual: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={name}
      className={`group flex h-16 items-center rounded-xl border border-slate-200 bg-white pr-2 transition duration-200 hover:-translate-y-0.5 hover:border-[#2774AE] hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:h-[72px] md:pr-3 ${FOCUS_RING}`}
    >
      <span className="flex shrink-0 items-center p-1 md:p-2">
        <span className="grid size-14 place-items-center rounded-lg bg-[#EEF5FB] transition-colors group-hover:bg-[#E2EEF8]">
          {visual}
        </span>
      </span>
      <span aria-hidden="true" className="h-8 w-px shrink-0 bg-slate-200 md:h-9" />
      <span className="min-w-0 flex-1 pl-2.5 md:pl-3.5">
        <span className="block truncate text-[13px] font-semibold leading-tight text-slate-900 group-hover:text-[#1d5a8e] md:text-[15px]">
          {name}
        </span>
        <span className="mt-0.5 block truncate text-[11px] leading-tight text-slate-500 md:text-xs">
          {caption}
        </span>
      </span>
    </Link>
  );
}

/** Public place discovery: compact tiles for popular cities and the nine provinces. */
export function ExploreCities({
  title = 'Explore South Africa by area',
  description = 'Find a province, city, town or suburb and see what is happening there.',
  withinContentRail = false,
}: ExploreCitiesProps = {}) {
  const [active, setActive] = useState<TabId>('cities');
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    cities: null,
    provinces: null,
  });
  const cities = popularCityGuides();

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    else return;
    event.preventDefault();
    const id = TABS[next].id;
    setActive(id);
    tabRefs.current[id]?.focus();
  }

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
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-[#2774AE] px-4 py-2 text-sm font-bold text-white hover:bg-[#1e5d8c] ${FOCUS_RING}`}
          >
            <MapPin className="size-4" aria-hidden="true" />
            Browse locations
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <div role="tablist" aria-label="Areas" className="mb-4 flex gap-2">
          {TABS.map((tab, index) => {
            const selected = active === tab.id;
            return (
              <button
                key={tab.id}
                ref={node => {
                  tabRefs.current[tab.id] = node;
                }}
                type="button"
                role="tab"
                id={`explore-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`explore-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(tab.id)}
                onKeyDown={event => moveTab(event, index)}
                className={`min-h-11 rounded-lg border px-4 text-sm font-semibold transition-colors ${FOCUS_RING} ${
                  selected
                    ? 'border-[#2774AE] bg-[#2774AE] text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`explore-panel-${active}`}
          aria-labelledby={`explore-tab-${active}`}
        >
          <ul
            data-testid="area-tile-grid"
            className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4"
          >
            {active === 'cities'
              ? cities.map(city => (
                  <li key={city.slug} className="min-w-0">
                    <AreaTile
                      href={city.href}
                      name={city.name}
                      caption={city.province}
                      visual={<CityGlyph slug={city.slug} className="size-11" />}
                    />
                  </li>
                ))
              : PROVINCE_TILES.map(province => (
                  <li key={province.code} className="min-w-0">
                    <AreaTile
                      href={province.href}
                      name={province.name}
                      caption="Province"
                      visual={
                        <span
                          aria-hidden="true"
                          className="text-base font-bold tracking-wide text-[#1d5a8e]"
                        >
                          {province.code}
                        </span>
                      }
                    />
                  </li>
                ))}
          </ul>
        </div>

        <div className="mt-4 flex justify-center">
          <Link
            href="/south-africa"
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-[#1d5a8e] hover:text-[#12395c] hover:underline ${FOCUS_RING}`}
          >
            View all areas
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
