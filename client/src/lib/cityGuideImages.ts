import { CITY_GUIDE_FEATURES } from '@shared/cityGuideFeatures';
import { PROVINCIAL_CONFIGS } from '@shared/provincialDiscovery';

const covers = new Set(CITY_GUIDE_FEATURES.map(([province, city]) => `${province}/${city}`));
const provinceCovers: Record<string, string> = {
  gauteng: 'johannesburg',
  'western-cape': 'cape-town',
  'kwazulu-natal': 'durban',
  'eastern-cape': 'gqeberha',
  'free-state': 'bloemfontein',
  limpopo: 'polokwane',
  mpumalanga: 'mbombela',
  'northern-cape': 'kimberley',
  'north-west': 'mahikeng',
};

function imageFiles(citySlug: string) {
  const path = `/images/city-guides-v1/${citySlug}`;
  return {
    thumbnail: `${path}-480.webp`,
    srcSet: `${path}-480.webp 480w, ${path}-960.webp 960w`,
    hero: `${path}-hero.webp`,
    heroPosition: citySlug === 'johannesburg' ? 'center 25%' : 'center',
  };
}

export function getProvinceGuideImage(provinceSlug: string) {
  const cover = provinceCovers[provinceSlug];
  const province = Object.values(PROVINCIAL_CONFIGS).find(item => item.slug === provinceSlug);
  if (!cover || !province) return undefined;
  return {
    ...imageFiles(cover),
    scope: 'province' as const,
    label: `AI province illustration · ${province.name}`,
    alt: `AI-generated provincial scene of ${province.name}`,
  };
}

export function getCityGuideImage(provinceSlug: string, citySlug: string) {
  if (!covers.has(`${provinceSlug}/${citySlug}`)) return getProvinceGuideImage(provinceSlug);
  return {
    ...imageFiles(citySlug),
    scope: 'city' as const,
    label: 'AI city illustration',
    alt: undefined,
  };
}
