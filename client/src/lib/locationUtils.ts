// Shared mapping for popular South African cities to provinces
// This helps frontend components construct hierarchical URLs without needing a full DB lookup for known entities
// In a production app, this would ideally be dynamic or fetched from a global config

export const CITY_PROVINCE_MAP: Record<string, string> = {
  'johannesburg': 'gauteng',
  'cape-town': 'western-cape',
  'durban': 'kwazulu-natal',
  'pretoria': 'gauteng',
  'sandton': 'gauteng',
  'randburg': 'gauteng',
  'centurion': 'gauteng',
  'midrand': 'gauteng',
  'roodepoort': 'gauteng',
  'kempton-park': 'gauteng',
  'benoni': 'gauteng',
  'boksburg': 'gauteng',
  'alberton': 'gauteng',
  'edenvale': 'gauteng',
  'germiston': 'gauteng',
  'springs': 'gauteng',
  'brakpan': 'gauteng',
  'krugersdorp': 'gauteng',
  'stellenbosch': 'western-cape',
  'somerset-west': 'western-cape',
  'paarl': 'western-cape',
  'george': 'western-cape',
  'knysna': 'western-cape',
  'mossel-bay': 'western-cape',
  'hermanus': 'western-cape',
  'bellville': 'western-cape',
  'durbanville': 'western-cape',
  'ballito': 'kwazulu-natal',
  'umhlanga': 'kwazulu-natal',
  'pietermaritzburg': 'kwazulu-natal',
  'richards-bay': 'kwazulu-natal',
  'bloemfontein': 'free-state',
  'port-elizabeth': 'eastern-cape',
  'gqeberha': 'eastern-cape',
  'east-london': 'eastern-cape',
  'polokwane': 'limpopo',
  'nelspruit': 'mpumalanga',
  'mbombela': 'mpumalanga',
  'rustenburg': 'north-west',
  'kimberley': 'northern-cape',
  'mahikeng': 'north-west',
  'witbank': 'mpumalanga',
  'emalahleni': 'mpumalanga',
  'potchefstroom': 'north-west'
};

export const PROVINCE_SLUGS = [
  'gauteng',
  'western-cape',
  'kwazulu-natal',
  'eastern-cape',
  'free-state',
  'limpopo',
  'mpumalanga',
  'north-west',
  'northern-cape'
];

/**
 * Helper to get property URL
 */
export const getCityUrl = (cityName: string) => {
  const slug = cityName.toLowerCase().replace(/\s+/g, '-');
  const province = CITY_PROVINCE_MAP[slug] || 'properties'; // Fallback if unknown
  return `/${province}/${slug}`;
};

export const getSuburbUrl = (cityName: string, suburbName: string) => {
  const citySlug = cityName.toLowerCase().replace(/\s+/g, '-');
  const suburbSlug = suburbName.toLowerCase().replace(/\s+/g, '-');
  const province = CITY_PROVINCE_MAP[citySlug] || 'properties';
  return `/${province}/${citySlug}/${suburbSlug}`;
};
