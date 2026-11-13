// Why this section exists, what it shows and its rules: docs/product/homepage/explore-by-area.md
// Update that file with any change here.
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowRight, MapPin } from 'lucide-react';
import { CityGlyph } from '@/components/home/CityGlyphs';
import { ProvincePills } from '@/components/home/ProvincePills';
import { SectionEmptyState } from '@/components/ui/SectionEmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { CITY_GUIDES, POPULAR_CITY_SLUGS, PROVINCE_TILES } from '@/lib/cityGuides';
import { homeProvincePlaceId } from '@/lib/homeProvinceOptions';
import { trpc } from '@/lib/trpc';
import { useSharedHomeProvince } from '@/lib/useHomeProvince';

interface ExploreCitiesProps {
  title?: string;
  withinContentRail?: boolean;
  /** The page's shared province. Without it the section keeps its own. */
  selectedProvince?: string;
  onProvinceChange?: (province: string) => void;
}

/** What the server sends per area (server/services/homeAreasService.ts). */
type PopularArea = {
  placeId: string;
  name: string;
  kind: 'city' | 'suburb';
  href: string;
  listingCount: number;
};

type PopularAreasResult = {
  province: { placeId: string; name: string; href: string | null };
  areas: PopularArea[];
};

type Tile = { key: string; name: string; href: string; caption: string; glyphSlug: string };

const AREA_LIMIT = 12;
const STALE_TIME_MS = 10 * 60 * 1000;

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2774AE]';

// An older API does not have the procedure yet: remembered for the rest of the page session.
let areasApiMissing = false;

/** Test helper: forget that the API was missing. */
export function resetAreasApiDetection(): void {
  areasApiMissing = false;
}

function isProcedureMissing(error: unknown): boolean {
  const candidate = error as
    | { data?: { code?: string }; shape?: { data?: { code?: string } } }
    | null
    | undefined;
  const code = candidate?.data?.code ?? candidate?.shape?.data?.code;
  return code === 'NOT_FOUND' || code === 'BAD_REQUEST';
}

/** "{n} properties" / "1 property" for a real count; the province name otherwise (never "0"). */
export function areaCaption(listingCount: number, provinceName: string): string {
  if (Number.isFinite(listingCount) && listingCount > 0) {
    return `${listingCount.toLocaleString('en-ZA')} ${listingCount === 1 ? 'property' : 'properties'}`;
  }
  return provinceName;
}

/** The guide slug when the page is a known city guide, otherwise the place name (matched by CityGlyph). */
function glyphSlugForArea(href: string, name: string): string {
  return CITY_GUIDES.find(city => city.href === href)?.slug ?? name;
}

/** The curated static list for a province, popular cities first. No counts. */
function staticTiles(provinceName: string): Tile[] {
  const rank = (slug: string) => {
    const index = POPULAR_CITY_SLUGS.indexOf(slug);
    return index === -1 ? POPULAR_CITY_SLUGS.length : index;
  };
  return CITY_GUIDES.filter(city => city.province === provinceName)
    .sort((a, b) => rank(a.slug) - rank(b.slug))
    .slice(0, AREA_LIMIT)
    .map(city => ({
      key: city.slug,
      name: city.name,
      href: city.href,
      caption: city.province,
      glyphSlug: city.slug,
    }));
}

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

/** Public place discovery: the selected province's popular areas, with listing counts. */
export function ExploreCities({
  title = 'Explore South Africa by area',
  withinContentRail = false,
  selectedProvince: selectedProvinceProp,
  onProvinceChange,
}: ExploreCitiesProps = {}) {
  const [province, setProvince] = useSharedHomeProvince(selectedProvinceProp, onProvinceChange);
  const provincePlaceId = homeProvincePlaceId(province);
  const [missing, setMissing] = useState(areasApiMissing);

  const query = trpc.homeAreas.getPopularAreasByProvince.useQuery(
    { provincePlaceId: provincePlaceId ?? '', limit: AREA_LIMIT },
    {
      enabled: Boolean(provincePlaceId) && !missing,
      staleTime: STALE_TIME_MS,
      retry: (failureCount: number, failure: unknown) =>
        isProcedureMissing(failure) ? false : failureCount < 1,
    },
  );

  const procedureMissing = !missing && query.isError && isProcedureMissing(query.error);
  useEffect(() => {
    if (procedureMissing) {
      areasApiMissing = true;
      setMissing(true);
    }
  }, [procedureMissing]);

  const result = query.data as PopularAreasResult | undefined;
  const loading = !missing && !procedureMissing && Boolean(provincePlaceId) && query.isLoading;
  const serverAreas = !missing && !query.isError && result ? result.areas : [];
  const useServer = serverAreas.length > 0;

  const tiles: Tile[] = useServer
    ? serverAreas.slice(0, AREA_LIMIT).map(area => ({
        key: area.placeId,
        name: area.name,
        href: area.href,
        caption: areaCaption(area.listingCount, province),
        glyphSlug: glyphSlugForArea(area.href, area.name),
      }))
    : staticTiles(province);

  const viewAllHref = (useServer ? result?.province.href : null) ?? '/south-africa';
  const provinceTile = PROVINCE_TILES.find(tile => tile.name === province);

  return (
    <section className="home-section bg-white">
      <div className={withinContentRail ? 'home-section-content' : 'container'}>
        <div className="home-section-header flex flex-wrap items-end justify-between gap-4 text-left">
          <div className="max-w-3xl">
            <h2 className="home-section-title text-[1.125rem] font-bold text-slate-900 sm:text-xl md:text-[26px]">
              {title}
            </h2>
            <p className="text-[13px] leading-5 text-slate-600 md:text-sm md:leading-6">
              Popular areas in {province}, with the number of properties listed in each.
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

        <ProvincePills
          selectedProvince={province}
          onProvinceChange={setProvince}
          label="Province for areas"
        />

        <div className="mt-2">
          {loading ? (
            <ul
              data-testid="area-tile-skeletons"
              role="status"
              aria-label="Loading areas"
              className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4"
            >
              {Array.from({ length: AREA_LIMIT }, (_, index) => (
                <li key={index} className="min-w-0">
                  <Skeleton className="h-16 w-full rounded-xl md:h-[72px]" />
                </li>
              ))}
            </ul>
          ) : tiles.length > 0 ? (
            <ul
              data-testid="area-tile-grid"
              className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4"
            >
              {tiles.map(tile => (
                <li key={tile.key} className="min-w-0">
                  <AreaTile
                    href={tile.href}
                    name={tile.name}
                    caption={tile.caption}
                    visual={<CityGlyph slug={tile.glyphSlug} className="size-11" />}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <SectionEmptyState
              icon={MapPin}
              message={`Areas in ${province} will appear here as more homes are listed.`}
              action={{
                label: `Explore ${province}`,
                href: provinceTile?.href ?? '/south-africa',
              }}
            />
          )}
        </div>

        <div className="mt-4 flex justify-center">
          <Link
            href={viewAllHref}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-[#1d5a8e] hover:text-[#12395c] hover:underline ${FOCUS_RING}`}
          >
            View all areas in {province}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
