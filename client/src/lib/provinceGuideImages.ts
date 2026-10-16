import { getProvincialConfig } from '@shared/provincialDiscovery';

/** Existing map-outline artwork recovered from the saved geography visual foundation. */
export function getProvinceGuideCover(provinceSlug: string) {
  if (!getProvincialConfig(provinceSlug)) return undefined;
  const base = `/images/province-guides-v1/${provinceSlug}`;
  return {
    desktop: `${base}-desktop.webp`,
    mobile: provinceSlug === 'gauteng' ? `${base}-mobile.webp` : undefined,
  };
}
