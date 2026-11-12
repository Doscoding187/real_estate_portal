/**
 * Cities shown in the homepage "Explore South Africa by area" cards and the footer.
 *
 * A city is listed only when its public page is published by the same rule the server
 * uses for sitemap and place pages (server/services/canonicalPlaceUrlService.ts,
 * publishedCanonicalPlaceUrls): the entry in data/place-url-projection-national-v0.1.json
 * (origin/main, checked 2026-11-12) has publication_eligible === true AND
 * lifecycle_status === 'active'. The entry's preferred_public_name equals the city name and
 * its place_type is a city or town, or a suburb for Sandton. The href is the entry's own path.
 * Place id column shows the last 8 characters of place_id.
 *
 * | City          | path (href)                | place id | type   | verification |
 * |---------------|----------------------------|----------|--------|--------------|
 * | Johannesburg  | /gauteng/johannesburg      | 9ec7525f | city   | provisional |
 * | Cape Town     | /western-cape/cape-town    | f9dd45b3 | city   | verified    |
 * | Durban        | /kwazulu-natal/durban      | 8cb257be | town   | verified    |
 * | Pretoria      | /gauteng/pretoria          | bb02e528 | city   | provisional |
 * | Sandton       | /gauteng/city-of-johannesburg/sandton | d1a258ad | suburb | provisional |
 * | Gqeberha      | /eastern-cape/gqeberha     | 974d0b7a | town   | verified    |
 * | Bloemfontein  | /free-state/bloemfontein   | 407c3a3e | city   | verified    |
 * | Centurion     | /gauteng/centurion         | d6c987df | town   | provisional |
 * | Midrand       | /gauteng/midrand           | 1aee83fd | town   | provisional |
 * | Randburg      | /gauteng/randburg          | 97c1a395 | city   | provisional |
 * | Soweto        | /gauteng/soweto            | 09bf6349 | town   | provisional |
 * | Stellenbosch  | /western-cape/stellenbosch | 1a7b3f50 | town   | verified    |
 * | Mbombela      | /mpumalanga/mbombela       | b89fb39d | city   | verified    |
 * | Polokwane     | /limpopo/polokwane         | 03c60f2e | city   | verified    |
 * | Kimberley     | /noord-kaap/kimberley      | a1900510 | city   | verified    |
 * | Roodepoort    | /gauteng/roodepoort        | 295fcdc6 | town   | provisional |
 * | Benoni        | /gauteng/benoni            | 38a8ee14 | town   | provisional |
 * | Boksburg      | /gauteng/boksburg          | 0b044611 | town   | provisional |
 * | Kempton Park  | /gauteng/kempton-park      | 1e35ed86 | town   | provisional |
 * | Alberton      | /gauteng/alberton          | bd727832 | town   | provisional |
 *
 * All rows: publication_eligible=true, search_eligible=true, lifecycle_status=active.
 *
 * Not listed (images exist in /images/city-guides-v1 but no published page):
 *  - Mahikeng: no entry with that name. The projection only has "Mafikeng" (/north-west/mafikeng).
 *  - Umhlanga: the entry named Umhlanga is a village with publication_eligible=false.
 *
 * Kimberley's published path uses the projection's province segment "noord-kaap". The href is
 * kept exactly as published.
 */
export interface CityGuide {
  slug: string;
  name: string;
  province: string;
  href: string;
}

export const CITY_GUIDES: readonly CityGuide[] = [
  {
    slug: 'johannesburg',
    name: 'Johannesburg',
    province: 'Gauteng',
    href: '/gauteng/johannesburg',
  },
  {
    slug: 'cape-town',
    name: 'Cape Town',
    province: 'Western Cape',
    href: '/western-cape/cape-town',
  },
  { slug: 'durban', name: 'Durban', province: 'KwaZulu-Natal', href: '/kwazulu-natal/durban' },
  { slug: 'pretoria', name: 'Pretoria', province: 'Gauteng', href: '/gauteng/pretoria' },
  {
    slug: 'sandton',
    name: 'Sandton',
    province: 'Gauteng',
    href: '/gauteng/city-of-johannesburg/sandton',
  },
  { slug: 'gqeberha', name: 'Gqeberha', province: 'Eastern Cape', href: '/eastern-cape/gqeberha' },
  {
    slug: 'bloemfontein',
    name: 'Bloemfontein',
    province: 'Free State',
    href: '/free-state/bloemfontein',
  },
  { slug: 'centurion', name: 'Centurion', province: 'Gauteng', href: '/gauteng/centurion' },
  { slug: 'midrand', name: 'Midrand', province: 'Gauteng', href: '/gauteng/midrand' },
  { slug: 'randburg', name: 'Randburg', province: 'Gauteng', href: '/gauteng/randburg' },
  { slug: 'soweto', name: 'Soweto', province: 'Gauteng', href: '/gauteng/soweto' },
  {
    slug: 'stellenbosch',
    name: 'Stellenbosch',
    province: 'Western Cape',
    href: '/western-cape/stellenbosch',
  },
  { slug: 'mbombela', name: 'Mbombela', province: 'Mpumalanga', href: '/mpumalanga/mbombela' },
  { slug: 'polokwane', name: 'Polokwane', province: 'Limpopo', href: '/limpopo/polokwane' },
  {
    slug: 'kimberley',
    name: 'Kimberley',
    province: 'Northern Cape',
    href: '/noord-kaap/kimberley',
  },
  { slug: 'roodepoort', name: 'Roodepoort', province: 'Gauteng', href: '/gauteng/roodepoort' },
  { slug: 'benoni', name: 'Benoni', province: 'Gauteng', href: '/gauteng/benoni' },
  { slug: 'boksburg', name: 'Boksburg', province: 'Gauteng', href: '/gauteng/boksburg' },
  {
    slug: 'kempton-park',
    name: 'Kempton Park',
    province: 'Gauteng',
    href: '/gauteng/kempton-park',
  },
  { slug: 'alberton', name: 'Alberton', province: 'Gauteng', href: '/gauteng/alberton' },
];

export function cityGuideImage(slug: string) {
  const base = `/images/city-guides-v1/${slug}`;
  return {
    src: `${base}-480.webp`,
    srcSet: `${base}-480.webp 480w, ${base}-960.webp 960w`,
    width: 480,
    height: 270,
  };
}

/**
 * Full canonical place ids for the entries above, copied from the same projection entries
 * (matched by path, checked 2026-11-12). Every entry is a city (search_scope metro_city) except
 * Sandton (locality).
 */
export const CITY_GUIDE_PLACE_IDS: Readonly<Record<string, string>> = {
  johannesburg: 'pl-place-01-21f154cd5d0954c29ec7525f',
  'cape-town': 'pl-place-01-13ed41eeb1c2f1c0f9dd45b3',
  durban: 'pl-place-01-64b4aab651d573698cb257be',
  pretoria: 'pl-place-01-d0401eba0f556a60bb02e528',
  sandton: 'pl-place-01-dee61758ef3bda7cd1a258ad',
  gqeberha: 'pl-place-01-ac826ee0a4e6b23f974d0b7a',
  bloemfontein: 'pl-place-01-f027383082fe13c5407c3a3e',
  centurion: 'pl-place-01-1a30ae4d635ef747d6c987df',
  midrand: 'pl-place-01-0614f47352b29b431aee83fd',
  randburg: 'pl-place-01-7e92e438655b8d2b97c1a395',
  soweto: 'pl-place-01-99b91be60755ea1f09bf6349',
  stellenbosch: 'pl-place-01-60511c8e98656bb21a7b3f50',
  mbombela: 'pl-place-01-0fee11726d524e50b89fb39d',
  polokwane: 'pl-place-01-2fb67dcdf3f294d903c60f2e',
  kimberley: 'pl-place-01-bd85870dd1c2331ba1900510',
  roodepoort: 'pl-place-01-de64523ea374afb6295fcdc6',
  benoni: 'pl-place-01-a883dbe0691336eb38a8ee14',
  boksburg: 'pl-place-01-f32a20dcdd9bda610b044611',
  'kempton-park': 'pl-place-01-80841bed32edb0281e35ed86',
  alberton: 'pl-place-01-17dec3188c1a55debd727832',
};

export interface BrowseCity {
  name: string;
  slug: string;
  provinceSlug: string;
  canonicalPlaceId: string;
  canonicalPath: string;
}

function browseCity(slug: string): BrowseCity {
  const guide = CITY_GUIDES.find(item => item.slug === slug);
  const canonicalPlaceId = CITY_GUIDE_PLACE_IDS[slug];
  if (!guide || !canonicalPlaceId) throw new Error(`Unknown browse city ${slug}`);
  return {
    name: guide.name,
    slug,
    provinceSlug: guide.href.split('/')[1],
    canonicalPlaceId,
    canonicalPath: guide.href,
  };
}

/**
 * City pills in the homepage "Browse by city, category, and property journey" block.
 *
 * Mahikeng is the current official name of Mafikeng. The projection (origin/main, checked
 * 2026-11-12) publishes it as "Mafikeng": place_type city, search_scope metro_city, verified,
 * publication_eligible, active, path /north-west/mafikeng, place id
 * pl-place-01-30239f30c13e9f470ac582a0. The pill shows "Mahikeng" and uses that entry. The
 * projection itself has no alias record for "Mahikeng", so the equivalence is general
 * knowledge, not data; delete that pill if it is not wanted.
 */
export const HOME_BROWSE_CITIES: readonly BrowseCity[] = [
  browseCity('cape-town'),
  browseCity('johannesburg'),
  browseCity('pretoria'),
  browseCity('durban'),
  browseCity('bloemfontein'),
  browseCity('gqeberha'),
  browseCity('polokwane'),
  browseCity('kimberley'),
  browseCity('mbombela'),
  {
    name: 'Mahikeng',
    slug: 'mafikeng',
    provinceSlug: 'north-west',
    canonicalPlaceId: 'pl-place-01-30239f30c13e9f470ac582a0',
    canonicalPath: '/north-west/mafikeng',
  },
];
