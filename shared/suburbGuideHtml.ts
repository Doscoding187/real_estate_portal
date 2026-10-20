import { getCityGuideContent } from './cityGuideContent';
import { guideStatusNote } from './guidePublication';
import { SUBURB_GUIDE_PILOT, isSuburbGuidePilot } from './suburbGuidePolicy';

function escapeHtml(text: string) {
  return text.replace(
    /[&<>"']/g,
    char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
}

function displayName(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Visible, inventory-independent first document for the suburb guide pilot. React replaces
 * it on boot. It reuses the reviewed city-guide chapter that the rendered page also shows,
 * so the delivered document and the page never disagree. It contains no database-dependent
 * counts, prices, amenities or local professionals.
 */
export function suburbGuideInitialHtml(requestUrl: string): string | undefined {
  const parts = new URL(requestUrl, 'https://www.propertylistifysa.co.za').pathname
    .split('/')
    .filter(Boolean)
    .map(part => part.toLowerCase());
  if (parts.length !== 3) return undefined;

  const [provinceSlug, citySlug, suburbSlug] = parts;
  if (!isSuburbGuidePilot(provinceSlug, citySlug, suburbSlug)) return undefined;

  const cityGuide = getCityGuideContent(provinceSlug, citySlug);
  if (!cityGuide) return undefined;

  const region = cityGuide.regions.find(
    candidate => candidate.id === SUBURB_GUIDE_PILOT.cityContextRegionId,
  );
  if (!region) return undefined;

  const railCollection = cityGuide.collections.find(
    collection => collection.id === 'rail-connections',
  );
  const suburbName = displayName(suburbSlug);
  const cityName = displayName(citySlug);
  const provinceName = cityGuide.provinceName;
  const e = escapeHtml;
  const statusLine = guideStatusNote(cityGuide.status);

  const sources = cityGuide.sources.filter(
    source =>
      source.id === 'regions' ||
      source.id === 'region-e' ||
      (railCollection?.sourceIds.includes(source.id) ?? false),
  );

  return `<main id="suburb-guide-initial" style="max-width:1000px;margin:2rem auto;padding:1.5rem;font-family:system-ui,sans-serif;line-height:1.8;color:#11243f"><nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/${e(provinceSlug)}">${e(provinceName)} guide</a> / <a href="/${e(provinceSlug)}/${e(citySlug)}">${e(cityName)} guide</a> / ${e(suburbName)}</nav><h1>Explore ${e(suburbName)}</h1><p>${e(suburbName)} is a suburb of ${e(cityName)} in ${e(provinceName)}, South Africa. This guide covers homes for sale, rentals and new developments published for this exact suburb on Property Listify.</p><section id="suburb-city-context"><h2>Where ${e(suburbName)} fits in the city</h2><p>${e(region.text)}</p><p>${e(region.consider)}</p></section>${railCollection ? `<section id="suburb-getting-around"><h2>Getting around</h2><p>${e(railCollection.context)}</p></section>` : ''}<section id="suburb-methodology"><h2>How to read this guide</h2><ul><li><strong>Scope.</strong> Counts and medians cover eligible listings published for this exact suburb on Property Listify. Project units and other suburbs are kept separate.</li><li><strong>Prices.</strong> Figures use published asking prices, never completed sale prices.</li><li><strong>Supply.</strong> Listing counts are a snapshot of current published inventory, not a census of all homes in ${e(suburbName)}.</li></ul></section><section id="suburb-sources"><h2>Sources</h2><p>Sources checked ${e(cityGuide.sourceCheckedOn)}.${statusLine}</p><ul>${sources.map(source => `<li><a href="${e(source.url)}">${e(source.title)}</a></li>`).join('')}</ul></section><p>Enable JavaScript to load current listings, asking prices, nearby amenities and local professionals.</p></main>`;
}
