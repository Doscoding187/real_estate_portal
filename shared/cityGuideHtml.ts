import { getCityGuideContent } from './cityGuideContent';
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
/** Visible inventory-independent first document; React replaces it on startup. */
export function cityGuideInitialHtml(requestUrl: string): string | undefined {
  const parts = new URL(requestUrl, 'https://www.propertylistifysa.co.za').pathname
    .split('/')
    .filter(Boolean);
  const guide = parts.length === 2 ? getCityGuideContent(parts[0], parts[1]) : undefined;
  if (!guide) return;
  const e = escape;
  return `<main id="city-guide-initial" style="max-width:1000px;margin:2rem auto;padding:1.5rem;font-family:system-ui,sans-serif;line-height:1.8;color:#11243f"><nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/${e(guide.provinceSlug)}">${e(guide.provinceName)} guide</a> / ${e(guide.name)}</nav><h1>Explore ${e(guide.name)}</h1><p>${e(guide.introduction)}</p><section id="city-discover"><h2>Discover your side of ${e(guide.name)}</h2>${guide.collections.map(item => `<h3>${e(item.label)}</h3><p>${e(item.description)}</p><p>${e(item.context)}</p><ul>${item.places.map(place => `<li>${e(place.name)}: ${e(place.caption)}</li>`).join('')}</ul>`).join('')}</section><section id="city-regions"><h2>One metro. Different local lives.</h2>${guide.regions.map(item => `<article id="city-region-${e(item.id)}"><h3>${e(item.title)}</h3><p>${e(item.text)}</p><p>${e(item.consider)}</p></article>`).join('')}</section><section><h2>Make the shortlist work for everyday life</h2>${guide.practical.map(item => `<h3>${e(item.title)}</h3><p>${e(item.text)}</p>`).join('')}</section><section><h2>Questions about ${e(guide.name)}</h2>${guide.faqs.map(item => `<h3>${e(item.question)}</h3><p>${e(item.answer)}</p>`).join('')}</section><section><h2>Sources</h2><p>Sources checked ${e(guide.sourceCheckedOn)}. Local-review draft.</p><ul>${guide.sources.map(item => `<li><a href="${e(item.url)}">${e(item.title)}</a></li>`).join('')}</ul></section><p>Enable JavaScript to load verified place links, suburb search and platform inventory.</p></main>`;
}
