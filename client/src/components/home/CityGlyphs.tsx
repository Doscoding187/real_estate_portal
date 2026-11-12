import type { ReactNode } from 'react';

/**
 * Original line illustrations for the homepage "Explore South Africa by area" tiles.
 *
 * One family: 48x48 viewBox, brand blue stroke (1.75, round caps and joins), one warm accent
 * fill, no text. They are decorative (aria-hidden); the tile's own text names the city.
 * Drawn for this site; not traced from or modelled on any other site's artwork.
 */
const STROKE = '#2774AE';
const ACCENT = '#FED7AA';

function Glyph({
  children,
  className,
  name,
}: {
  children: ReactNode;
  className?: string;
  name: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke={STROKE}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-glyph={name}
      className={className}
    >
      {children}
    </svg>
  );
}

const GROUND = <path d="M5 40H43" />;
const WAVES = <path d="M6 40q3-3 6 0t6 0t6 0t6 0t6 0t6 0" />;

/** Slug -> glyph. Add a city here when it gets its own drawing; everything else uses the fallback. */
const CITY_GLYPHS: Partial<Record<string, () => ReactNode>> = {
  // Skyline with one tall tower.
  johannesburg: () => (
    <>
      {GROUND}
      <rect x="8" y="27" width="9" height="13" />
      <rect x="31" y="22" width="9" height="18" fill={ACCENT} />
      <path d="M21.5 40L23 18M26.5 40L25 18" />
      <rect x="20" y="12" width="8" height="6" rx="1.5" fill={ACCENT} />
      <path d="M24 12V5M11 31h3M11 35h3M34 27h3M34 32h3" />
    </>
  ),
  // Flat-topped mountain with a sun.
  'cape-town': () => (
    <>
      {GROUND}
      <path d="M5 40L13 21L16 17H32L35 21L43 40" />
      <path d="M18 24h12" />
      <circle cx="38" cy="9" r="4" fill={ACCENT} />
    </>
  ),
  // Arch over a stadium bowl, above waves.
  durban: () => (
    <>
      <path d="M7 33Q24 -1 41 33" />
      <path d="M12 33Q24 22 36 33" />
      <ellipse cx="24" cy="33" rx="12" ry="3" fill={ACCENT} />
      {WAVES}
    </>
  ),
  // Domed civic building with columns.
  pretoria: () => (
    <>
      {GROUND}
      <rect x="8" y="30" width="32" height="10" />
      <path d="M14 30V40M20 30V40M28 30V40M34 30V40" />
      <path d="M16 30a8 8 0 0 1 16 0Z" fill={ACCENT} />
      <path d="M24 22V15M24 15h5" />
    </>
  ),
  // Cluster of office towers.
  sandton: () => (
    <>
      {GROUND}
      <rect x="7" y="23" width="9" height="17" />
      <rect x="18" y="9" width="11" height="31" fill={ACCENT} />
      <rect x="31" y="17" width="10" height="23" />
      <path d="M10 28h3M10 33h3M21 15h5M21 21h5M21 27h5M34 23h4M34 29h4" />
    </>
  ),
  // Slim campanile by the sea.
  gqeberha: () => (
    <>
      <rect x="21" y="12" width="6" height="22" />
      <path d="M20 12L24 4L28 12Z" fill={ACCENT} />
      <path d="M19 34H29M24 17v3M24 25v3" />
      {WAVES}
    </>
  ),
  // A rose.
  bloemfontein: () => (
    <>
      <circle cx="24" cy="19" r="10" fill={ACCENT} />
      <path d="M21 19a3 3 0 1 1 3 3M17.500 19a6.500 6.500 0 1 1 6.500 6.500" />
      <path d="M24 29V43M24 37q7-1 9-7q-7 0-9 7" />
    </>
  ),
  // Lake with a fountain.
  centurion: () => (
    <>
      <path d="M24 28V10M24 13Q15 13 13 25M24 13Q33 13 35 25" />
      <ellipse cx="24" cy="31" rx="15" ry="4" fill={ACCENT} />
      <path d="M12 39h24M17 43h14" />
    </>
  ),
  // Gabled house and a bunch of grapes.
  stellenbosch: () => (
    <>
      {GROUND}
      <rect x="4" y="28" width="24" height="12" />
      <path d="M10 28Q10 24 13 24Q13 19 16 17Q19 19 19 24Q22 24 22 28Z" fill={ACCENT} />
      <path d="M13 40V34H19V40" />
      <circle cx="33" cy="22" r="2.600" fill={ACCENT} />
      <circle cx="38" cy="22" r="2.600" fill={ACCENT} />
      <circle cx="35.500" cy="27" r="2.600" fill={ACCENT} />
      <circle cx="40.500" cy="27" r="2.600" fill={ACCENT} />
      <circle cx="38" cy="32" r="2.600" fill={ACCENT} />
      <path d="M35.500 19V14M35.500 15q3-3 6-1" />
    </>
  ),
  // Lowveld acacia in front of hills.
  mbombela: () => (
    <>
      {GROUND}
      <path d="M20 40Q30 22 42 40" />
      <path d="M6 40Q14 28 22 40" />
      <path d="M14 38V26Q14 23 10 22M14 28Q17 26 19 24" />
      <ellipse cx="14" cy="19" rx="9" ry="4" fill={ACCENT} />
    </>
  ),
  // Baobab.
  polokwane: () => (
    <>
      {GROUND}
      <path d="M17 40Q20 31 19 24H29Q28 31 31 40" />
      <path d="M19 24Q14 21 12 15M24 24V13M29 24Q34 21 36 15" />
      <circle cx="12" cy="13" r="3.500" fill={ACCENT} />
      <circle cx="24" cy="10" r="3.500" fill={ACCENT} />
      <circle cx="36" cy="13" r="3.500" fill={ACCENT} />
    </>
  ),
  // Cut diamond.
  kimberley: () => (
    <>
      <path d="M14 14H34L43 24L24 43L5 24Z" />
      <path d="M14 14H34L29 24H19Z" fill={ACCENT} />
      <path d="M5 24H43M19 24L24 43L29 24M14 14L19 24M34 14L29 24" />
    </>
  ),
};

/** Generic skyline with a map pin, used for any city that has no drawing of its own. */
function FallbackGlyph() {
  return (
    <>
      {GROUND}
      <rect x="6" y="25" width="10" height="15" />
      <rect x="18" y="19" width="10" height="21" />
      <path d="M9 30h4M9 35h4M21 25h4M21 31h4" />
      <path
        d="M35 5a6.500 6.500 0 0 1 6.500 6.500C41.500 17 35 24 35 24S28.500 17 28.500 11.500A6.500 6.500 0 0 1 35 5Z"
        fill={ACCENT}
      />
      <circle cx="35" cy="11.500" r="2" />
    </>
  );
}

export function hasCityGlyph(slug: string): boolean {
  return slug in CITY_GLYPHS;
}

export function CityGlyph({ slug, className }: { slug: string; className?: string }) {
  const draw = CITY_GLYPHS[slug];
  return (
    <Glyph className={className} name={draw ? slug : 'fallback'}>
      {draw ? draw() : <FallbackGlyph />}
    </Glyph>
  );
}
