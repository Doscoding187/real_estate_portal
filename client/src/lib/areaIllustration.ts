export type AreaIllustration =
  | 'leafy-residential'
  | 'business-towers'
  | 'security-estate'
  | 'mixed-suburb'
  | 'apartment-blocks';

export type AreaIllustrationInput = {
  slug: string;
  typeLabel?: string | null;
};

const RESIDENTIAL_SET: AreaIllustration[] = [
  'leafy-residential',
  'mixed-suburb',
  'apartment-blocks',
];

function hashSlug(slug: string): number {
  let hash = 5381;
  for (let index = 0; index < slug.length; index += 1) {
    hash = ((hash << 5) + hash + slug.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function candidatesFor(typeLabel?: string | null): AreaIllustration[] {
  const label = (typeLabel || '').toLowerCase();
  if (/business|commercial|office|cbd/.test(label)) return ['business-towers'];
  if (/estate|secure/.test(label)) return ['security-estate'];
  return RESIDENTIAL_SET;
}

export function areaIllustrationUrl(name: AreaIllustration): string {
  return `/images/area-illustrations/${name}.svg`;
}

/**
 * Deterministic illustration per area. Adjacent entries never share an
 * illustration: if a pick equals the previous one, the next candidate is used.
 */
export function pickAreaIllustrations(areas: AreaIllustrationInput[]): AreaIllustration[] {
  const picks: AreaIllustration[] = [];
  areas.forEach((area, index) => {
    const typed = candidatesFor(area.typeLabel);
    const pool = typed;
    let pick = pool[hashSlug(area.slug) % pool.length];
    const previous = picks[index - 1];
    if (previous === pick) {
      const widened = pool.length > 1 ? pool : RESIDENTIAL_SET;
      const start = widened.indexOf(pick);
      pick = widened[(start + 1) % widened.length];
      if (previous === pick)
        pick = RESIDENTIAL_SET[(RESIDENTIAL_SET.indexOf(pick) + 1) % RESIDENTIAL_SET.length];
    }
    picks.push(pick);
  });
  return picks;
}
