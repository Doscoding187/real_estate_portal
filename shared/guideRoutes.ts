import { CITY_GUIDE_CONTENT } from './cityGuideContent';
import { COUNTRY_DISCOVERY_PATH } from './countryDiscovery';
import { PROVINCE_GUIDE_CONTENT } from './provinceGuideContent';
import { SUBURB_GUIDE_PILOT } from './suburbGuidePolicy';

/**
 * Guide routes that receive their own delivered document at build time. The build emits one
 * static file per route and the hosting layer serves that file for the matching request, so
 * a guide is never answered with the generic application shell.
 *
 * The list is derived from authored guide content, not from place records: an existing
 * province, city or suburb row does not create a guide route.
 */
export const GUIDE_HTML_ROUTES: readonly string[] = [
  COUNTRY_DISCOVERY_PATH.replace(/^\//, ''),
  ...PROVINCE_GUIDE_CONTENT.map(guide => guide.slug),
  ...CITY_GUIDE_CONTENT.map(guide => `${guide.provinceSlug}/${guide.slug}`),
  `${SUBURB_GUIDE_PILOT.provinceSlug}/${SUBURB_GUIDE_PILOT.citySlug}/${SUBURB_GUIDE_PILOT.suburbSlug}`,
];
