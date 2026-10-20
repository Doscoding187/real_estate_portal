import { PROVINCIAL_CONFIGS, getProvincialConfig } from './provincialDiscovery';

/**
 * The national entry point for location discovery.
 *
 * Someone searching for property in South Africa is usually deciding where to start, not
 * filtering a list. This page gives them the nine provinces and the ladder below them:
 * province, then city, then suburb. It is one canonical page, not a generated page per
 * province, and it is the only place the country sits above the province guides.
 */
export const COUNTRY_DISCOVERY_PATH = '/south-africa';

export const COUNTRY_DISCOVERY_TITLE =
  'Property for sale in South Africa: start with your province | Property Listify';

export const COUNTRY_DISCOVERY_DESCRIPTION =
  'Property for sale in South Africa starts with the province. Browse Gauteng, the Western Cape, KwaZulu-Natal and six more, then drill down from a province to a city to a suburb.';

export interface CountryProvinceEntry {
  slug: string;
  name: string;
  description: string;
  path: string;
  /** Cities and areas this province guide covers, when the guide is authored. */
  areas: readonly string[];
}

const PROVINCE_AREA_OVERVIEW: Record<string, readonly string[]> = {
  gauteng: ['Johannesburg', 'Tshwane & Pretoria', 'Ekurhuleni', 'West Rand', 'Sedibeng & the Vaal'],
  'western-cape': ['Cape Town', 'Stellenbosch', 'The Winelands', 'The coast'],
  'kwazulu-natal': ['Durban', 'Umhlanga', 'Ballito', 'Pietermaritzburg'],
  'eastern-cape': ['Gqeberha', 'East London', 'The Amathole Mountains'],
  'free-state': ['Bloemfontein', 'Welkom', 'Sasolburg'],
  limpopo: ['Polokwane', 'Tzaneen', 'Musina', 'the Soutpansberg'],
  mpumalanga: ['Mbombela', 'Emalahleni', 'Secunda', 'Middelburg'],
  'north-west': ['Rustenburg', 'Potchefstroom', 'Klerksdorp'],
  'northern-cape': ['Kimberley', 'Upington', 'Springbok'],
};

/** The provinces a visitor can start from, in a stable, deliberate order. */
export const COUNTRY_PROVINCES: readonly CountryProvinceEntry[] = Object.values(PROVINCIAL_CONFIGS)
  .map(config => ({
    slug: config.slug,
    name: config.name,
    description: config.shortProposition,
    path: `/${config.slug}`,
    areas: PROVINCE_AREA_OVERVIEW[config.slug] ?? [],
  }))
  .sort((left, right) => left.name.localeCompare(right.name));

export function getCountryProvince(slug: string): CountryProvinceEntry | undefined {
  return COUNTRY_PROVINCES.find(province => province.slug === slug);
}

/** A province that has no authored guide yet is still listed, but it says so. */
export function isProvinceGuidePublished(slug: string): boolean {
  const config = getProvincialConfig(slug);
  return Boolean(config);
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
}

/**
 * The visible first document for the national entry. It carries the province directory and
 * the ladder, so a crawler receives a usable page rather than an empty shell.
 */
export function countryDiscoveryInitialHtml(requestUrl: string): string | undefined {
  const pathname = new URL(requestUrl, 'https://www.propertylistifysa.co.za').pathname.replace(
    /\/+$/,
    '',
  );
  if (pathname !== COUNTRY_DISCOVERY_PATH) return undefined;
  const e = escapeHtml;

  const provinces = COUNTRY_PROVINCES.map(
    province =>
      `<li><a href="${e(province.path)}"><strong>${e(province.name)}</strong></a><p>${e(
        province.description,
      )}</p>${province.areas.length ? `<p>${e(province.areas.join(' · '))}</p>` : ''}</li>`,
  ).join('');

  return `<main id="country-discovery-initial" style="max-width:1000px;margin:2rem auto;padding:1.5rem;font-family:system-ui,sans-serif;line-height:1.8;color:#11243f"><nav aria-label="Breadcrumb"><a href="/">Home</a> / South Africa</nav><h1>Property for sale in South Africa</h1><p>Most people start with the province they are considering, not with a list of every address in the country. Choose a province to read its guide, then narrow to a city, then to a suburb. Each level explains what the place is actually like and what to weigh up before you search.</p><section id="country-provinces"><h2>Choose a province</h2><ul>${provinces}</ul></section><section id="country-ladder"><h2>How the guides fit together</h2><p><strong>Province</strong> gives you the shape of the area and the towns inside it. <strong>City</strong> compares the parts of a city and points to the suburbs worth a closer look. <strong>Suburb</strong> is the local view: what is published there, what the numbers mean, and what is around it.</p><p>Guides and property results are separate. A guide explains a place; a search returns the homes, rentals and new developments published for the exact area you chose.</p></section><p>Enable JavaScript to load current listings and platform availability.</p></main>`;
}
