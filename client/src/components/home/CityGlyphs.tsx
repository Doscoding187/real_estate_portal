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

  // ---- Gauteng ----
  // Elevated highway with a car.
  midrand: () => (
    <>
      {GROUND}
      <path d="M5 28H43M11 28V40M24 28V40M37 28V40" />
      <rect x="17" y="22" width="12" height="6" rx="2.500" fill={ACCENT} />
      <path d="M20 22V20H26V22" />
    </>
  ),
  // Row of three gabled houses.
  randburg: () => (
    <>
      {GROUND}
      <path d="M5 40V29L11 23L17 29V40" />
      <path d="M19 40V23L25.500 16L32 23V40Z" fill={ACCENT} />
      <path d="M34 40V30L38.500 25L43 30V40" />
      <path d="M23 40V33H28V40M22.500 23h6" />
    </>
  ),
  // Flat-topped mine dump with a little tree.
  roodepoort: () => (
    <>
      {GROUND}
      <path d="M4 40L13 19H30L39 40Z" fill={ACCENT} />
      <path d="M10 31H33M15 25H28" />
      <path d="M41 40V32M41 32L38 28M41 30L44 27" />
    </>
  ),
  // Pair of cooling towers.
  soweto: () => (
    <>
      {GROUND}
      <path d="M6 40Q12 30 11 11H20Q19 30 25 40" />
      <path d="M24 40Q30 30 29 11H38Q37 30 43 40Z" fill={ACCENT} />
      <path d="M11 17H20M29 17H38" />
    </>
  ),
  // Sailboat on a lake.
  benoni: () => (
    <>
      <path d="M24 8L35 29H24Z" fill={ACCENT} />
      <path d="M24 5V32M21 14L14 29H24" />
      <path d="M12 33H36L32 38H16Z" />
      {WAVES}
    </>
  ),
  // Saw-tooth factory roof.
  boksburg: () => (
    <>
      {GROUND}
      <path d="M6 40V23L14 16V23L22 16V23L30 16V23H42V40Z" fill={ACCENT} />
      <path d="M10 31h4M18 31h4M26 31h4M34 31h4" />
      <path d="M32 40V34H38V40" />
    </>
  ),
  // Aeroplane.
  'kempton-park': () => (
    <g transform="rotate(45 24 24)">
      <path d="M24 4Q27 7 27 13V30L24 35L21 30V13Q21 7 24 4Z" fill={ACCENT} />
      <path d="M27 18L43 29V32L27 27M21 18L5 29V32L21 27M21 38L24 35L27 38V40L24 39L21 40Z" />
    </g>
  ),
  // Single spreading tree.
  alberton: () => (
    <>
      {GROUND}
      <circle cx="24" cy="18" r="11" fill={ACCENT} />
      <path d="M24 29V40M24 36L18 30M24 34L30 27" />
    </>
  ),

  // ---- Western Cape ----
  // Granite dome rock.
  paarl: () => (
    <>
      {GROUND}
      <path d="M5 40Q8 14 26 14Q41 14 43 40Z" fill={ACCENT} />
      <path d="M13 31Q19 27 25 31M22 23Q28 21 33 25M30 34Q35 31 40 34" />
    </>
  ),
  // Jagged range with a snow cap.
  george: () => (
    <>
      {GROUND}
      <path d="M4 40L15 20L21 29L31 11L44 40" />
      <path d="M26 21L31 11L36 21L31 18Z" fill={ACCENT} />
    </>
  ),
  // Rolling hill with vineyard rows.
  'somerset-west': () => (
    <>
      {GROUND}
      <path d="M5 40Q24 4 43 40Z" fill={ACCENT} />
      <path d="M13 40Q24 18 35 40M19 40Q24 29 29 40" />
    </>
  ),
  // Two headlands facing across a narrow channel.
  knysna: () => (
    <>
      <path d="M5 38V16Q5 12 10 12H14Q19 12 21 22L22 38Z" fill={ACCENT} />
      <path d="M43 38V20Q43 16 38 16H35Q30 16 28 24L27 38Z" />
      <path d="M5 41q3-3 6 0t6 0t6 0t6 0t6 0t6 0" />
    </>
  ),
  // Whale tail above the waves.
  hermanus: () => (
    <>
      <path
        d="M24 38C24 32 23 28 21 25C16 24 10 20 7 12C14 11 20 14 24 19C28 14 34 11 41 12C38 20 32 24 27 25C25 28 24 32 24 38Z"
        fill={ACCENT}
      />
      <path d="M6 41q3-3 6 0t6 0t6 0t6 0t6 0t6 0" />
    </>
  ),
  // Lighthouse on a rock.
  'mossel-bay': () => (
    <>
      <path d="M20 36L22 17H26L28 36Z" />
      <path d="M21 25H27M20.500 31H27.500" />
      <rect x="21" y="11" width="6" height="6" fill={ACCENT} />
      <path d="M20 11L24 6L28 11Z" />
      <path d="M18 14H9M30 14H39" />
      <path d="M6 40Q13 33 21 37Q24 34 28 37Q36 33 42 40Z" />
    </>
  ),
  // Wine glass.
  franschhoek: () => (
    <>
      <path d="M16 6H32V16Q32 26 24 26Q16 26 16 16Z" />
      <path d="M16.500 15Q24 19 31.500 15Q32 26 24 26Q16 26 16.500 15Z" fill={ACCENT} />
      <path d="M24 26V38M17 40H31" />
    </>
  ),

  // ---- KwaZulu-Natal ----
  // Clock tower beside a civic hall.
  pietermaritzburg: () => (
    <>
      {GROUND}
      <rect x="5" y="30" width="38" height="10" />
      <rect x="19" y="14" width="10" height="16" fill={ACCENT} />
      <path d="M19 14L24 7L29 14" />
      <circle cx="24" cy="21" r="3" />
      <path d="M24 19.500V21H25.500M10 34h4M34 34h4" />
    </>
  ),
  // Beach umbrella.
  ballito: () => (
    <>
      <path d="M8 24Q24 4 40 24Z" fill={ACCENT} />
      <path d="M24 14V38M16 24Q18 20 24 24Q30 20 32 24" />
      {WAVES}
    </>
  ),
  // Harbour gantry crane lifting a container.
  'richards-bay': () => (
    <>
      <path d="M12 38V12H32V38M6 12H44M22 12V22" />
      <rect x="17" y="22" width="10" height="6" fill={ACCENT} />
      <path d="M6 38H42L38 33H10Z" />
      {WAVES}
    </>
  ),
  // Farmland under the sun.
  newcastle: () => (
    <>
      <circle cx="34" cy="14" r="5" fill={ACCENT} />
      <path d="M5 28Q14 22 24 28T43 28M5 34Q14 28 24 34T43 34M5 40Q14 34 24 40T43 40" />
    </>
  ),
  // Sail-shaped seafront tower.
  umhlanga: () => (
    <>
      <path d="M13 38Q15 20 30 6Q34 22 34 38Z" fill={ACCENT} />
      <path d="M22 18Q24 24 24 38M30 14V38" />
      {WAVES}
    </>
  ),

  // ---- Eastern Cape ----
  // Suspension bridge over water.
  'east-london': () => (
    <>
      <path d="M5 33H43M14 33V12M34 33V12" />
      <path d="M5 28L14 12Q24 30 34 12L43 28" />
      <path d="M24 28V33M19 24V33M29 24V33" />
      {WAVES}
      <circle cx="14" cy="12" r="2.500" fill={ACCENT} />
      <circle cx="34" cy="12" r="2.500" fill={ACCENT} />
    </>
  ),
  // Round thatched homestead.
  mthatha: () => (
    <>
      {GROUND}
      <path d="M11 40V28H37V40" />
      <path d="M7 28L24 11L41 28Z" fill={ACCENT} />
      <path d="M20.500 40V33H27.500V40" />
    </>
  ),
  // Breaking wave with a surfboard.
  'jeffreys-bay': () => (
    <>
      <path d="M5 40C8 22 18 12 32 12C38 12 41 16 40 21C37 18 31 19 30 26C30 32 34 38 43 40" />
      <ellipse cx="19" cy="29" rx="3" ry="9" transform="rotate(35 19 29)" fill={ACCENT} />
    </>
  ),

  // ---- Free State ----
  // Gold nugget with a sparkle.
  welkom: () => (
    <>
      <path d="M10 34L9 25L17 17L29 15L38 22L40 31L30 38Z" fill={ACCENT} />
      <path d="M16 26Q21 22 27 25M22 32Q27 30 33 32" />
      <path d="M38 6V12M35 9H41" />
    </>
  ),
  // Layered sandstone mesa.
  bethlehem: () => (
    <>
      {GROUND}
      <path d="M6 40V26H13V17H27V24H33V31H42V40" fill={ACCENT} />
      <path d="M6 33H42M13 25H27" />
    </>
  ),

  // ---- Limpopo ----
  // Mango with a leaf.
  tzaneen: () => (
    <>
      <path d="M16 22Q19 13 30 15Q40 19 36 31Q30 42 20 37Q12 31 16 22Z" fill={ACCENT} />
      <path d="M30 15Q30 9 34 6M33 8Q40 5 43 9Q38 13 33 8M20 25Q21 21 24 20" />
    </>
  ),
  // Drum.
  thohoyandou: () => (
    <>
      <path d="M14 18V36Q24 42 34 36V18" />
      <ellipse cx="24" cy="18" rx="10" ry="4" fill={ACCENT} />
      <path d="M15 24L20 36M24 26V40M33 24L28 36" />
    </>
  ),

  // ---- Mpumalanga ----
  // Coal wagon on rails.
  emalahleni: () => (
    <>
      <path d="M12 23H36L33 35H15Z" fill={ACCENT} />
      <path d="M13 23Q17 16 21 22Q25 15 30 22Q33 18 35 23" />
      <circle cx="18" cy="38" r="3" />
      <circle cx="30" cy="38" r="3" />
      <path d="M5 42H43" />
    </>
  ),
  // Refinery stacks and a storage tank.
  secunda: () => (
    <>
      {GROUND}
      <path d="M13 40V12H19V40M24 40V20H29V40" />
      <path d="M24 20H29V40H24Z" fill={ACCENT} />
      <path d="M16 12Q11 8 16 3Q21 8 16 12Z" fill={ACCENT} />
      <rect x="32" y="29" width="11" height="11" rx="2" />
      <path d="M29 33H32" />
    </>
  ),
  // Mine headgear with winding wheel.
  middelburg: () => (
    <>
      {GROUND}
      <path d="M8 40L18 13L28 40M12 31H24" />
      <circle cx="18" cy="12" r="4" fill={ACCENT} />
      <path d="M21 14L36 31V40M33 31H43V40" />
    </>
  ),

  // ---- North West ----
  // Stacked platinum ingots.
  rustenburg: () => (
    <>
      {GROUND}
      <path d="M8 31H24L22 38H10ZM26 31H42L40 38H28Z" />
      <path d="M17 23H33L31 30H19Z" fill={ACCENT} />
      <path d="M38 8V14M35 11H41" />
    </>
  ),
  // A heap of boulders ("place of rocks").
  mahikeng: () => (
    <>
      {GROUND}
      <path d="M5 40Q5 29 14 29Q22 29 22 40Z" fill={ACCENT} />
      <path d="M20 40Q20 22 31 22Q41 22 41 40Z" />
      <path d="M26 31Q30 28 34 31" />
      <path d="M37 40Q37 35 41 35Q45 35 45 40Z" />
    </>
  ),
  // Mortarboard.
  potchefstroom: () => (
    <>
      <path d="M13 24V33Q24 40 35 33V24" />
      <path d="M24 9L43 18L24 27L5 18Z" fill={ACCENT} />
      <path d="M41 20V32" />
    </>
  ),
  // Windmill.
  klerksdorp: () => (
    <>
      {GROUND}
      <path d="M19 40L22 20H26L29 40M20.500 32H27.500" />
      <path d="M24 18L24 5M24 18L36 24M24 18L12 24" />
      <circle cx="24" cy="18" r="3" fill={ACCENT} />
    </>
  ),

  // ---- Northern Cape ----
  // Palm beside the river.
  upington: () => (
    <>
      <path d="M21 38Q23 28 24 20" />
      <path d="M24 20Q16 16 10 21M24 20Q18 11 13 12M24 20Q30 11 35 12M24 20Q32 16 38 21M24 20V11" />
      <circle cx="25.500" cy="23" r="2.500" fill={ACCENT} />
      {WAVES}
    </>
  ),
};

/** Other names for the same place. */
const ALIASES: Record<string, string> = {
  mafikeng: 'mahikeng',
  witbank: 'emalahleni',
  nelspruit: 'mbombela',
  'port-elizabeth': 'gqeberha',
};

/** "Jeffrey's Bay" / " Kempton  Park " -> "jeffreys-bay" / "kempton-park". */
export function glyphKey(nameOrSlug: string): string {
  const key = nameOrSlug
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ALIASES[key] ?? key;
}

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

export function hasCityGlyph(nameOrSlug: string): boolean {
  return Object.prototype.hasOwnProperty.call(CITY_GLYPHS, glyphKey(nameOrSlug));
}

/** `slug` may be a slug or a place name (any case); aliases such as Mafikeng resolve too. */
export function CityGlyph({ slug, className }: { slug: string; className?: string }) {
  const key = glyphKey(slug);
  const draw = Object.prototype.hasOwnProperty.call(CITY_GLYPHS, key)
    ? CITY_GLYPHS[key]
    : undefined;
  return (
    <Glyph className={className} name={draw ? key : 'fallback'}>
      {draw ? draw() : <FallbackGlyph />}
    </Glyph>
  );
}
