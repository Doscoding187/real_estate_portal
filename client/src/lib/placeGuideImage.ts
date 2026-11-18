/** Slugs that have a /images/city-guides-v1/<slug>-hero.webp file in the repo. */
export const CITY_HERO_SLUGS: ReadonlySet<string> = new Set([
  'alberton',
  'benoni',
  'bloemfontein',
  'boksburg',
  'cape-town',
  'centurion',
  'durban',
  'gqeberha',
  'johannesburg',
  'kempton-park',
  'kimberley',
  'mahikeng',
  'mbombela',
  'midrand',
  'polokwane',
  'pretoria',
  'randburg',
  'roodepoort',
  'sandton',
  'soweto',
  'stellenbosch',
  'umhlanga',
]);

/** Province slugs that have a /images/province-guides-v1/<slug>-desktop.webp file. */
export const PROVINCE_HERO_SLUGS: ReadonlySet<string> = new Set([
  'eastern-cape',
  'free-state',
  'gauteng',
  'kwazulu-natal',
  'limpopo',
  'mpumalanga',
  'northern-cape',
  'north-west',
  'western-cape',
]);

function lastSegment(path: string | null | undefined): string {
  return (path ?? '').split('/').filter(Boolean).pop()?.toLowerCase() ?? '';
}

/**
 * Hero image for a place: its own hero, then its parent city's hero, then its province's.
 * Returns undefined when no repository image applies (the page then shows its plain skyline fallback).
 */
export function placeGuideHeroImage(input: {
  placePath: string;
  cityPath?: string | null;
  provincePath?: string | null;
}): { hero: string; heroPosition: string } | undefined {
  const own = lastSegment(input.placePath);
  const city = lastSegment(input.cityPath);
  const province = lastSegment(input.provincePath);
  const slug = CITY_HERO_SLUGS.has(own) ? own : CITY_HERO_SLUGS.has(city) ? city : '';
  if (slug) {
    return {
      hero: `/images/city-guides-v1/${slug}-hero.webp`,
      heroPosition: slug === 'johannesburg' ? 'center 25%' : 'center',
    };
  }
  if (PROVINCE_HERO_SLUGS.has(province)) {
    return { hero: `/images/province-guides-v1/${province}-desktop.webp`, heroPosition: 'center' };
  }
  return undefined;
}
