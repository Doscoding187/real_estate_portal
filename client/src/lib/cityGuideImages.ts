import { CITY_GUIDE_FEATURES } from '@shared/cityGuideFeatures';

const covers = new Set(CITY_GUIDE_FEATURES.map(([province, city]) => `${province}/${city}`));
export function getCityGuideImage(provinceSlug: string, citySlug: string) {
  if (!covers.has(`${provinceSlug}/${citySlug}`)) return undefined;
  const path = `/images/city-guides-v1/${citySlug}`;
  return {
    thumbnail: `${path}-480.webp`,
    srcSet: `${path}-480.webp 480w, ${path}-960.webp 960w`,
    hero: `${path}-hero.webp`,
    heroPosition: citySlug === 'johannesburg' ? 'center 25%' : 'center',
    label: 'AI city illustration',
  };
}
