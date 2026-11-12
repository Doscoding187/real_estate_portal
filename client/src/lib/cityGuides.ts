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
