import { guideStatusNote } from './guidePublication';
import { getProvinceGuideContent } from './provinceGuideContent';

function escapeHtml(text: string) {
  return text.replace(
    /[&<>"']/g,
    char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
}
/** Durable, inventory-independent first HTML. React replaces it on boot; never a hidden SEO block. */
export function provinceGuideInitialHtml(requestUrl: string): string | undefined {
  const path = new URL(requestUrl, 'https://www.propertylistifysa.co.za').pathname.replace(
    /\/$/,
    '',
  );
  const guide = getProvinceGuideContent(path.slice(1));
  if (!guide) return undefined;
  const e = escapeHtml;
  const chapters = guide.regions
    .map(
      region =>
        `<article id="region-${e(region.id)}"><p>${e(region.kind)}</p><h2>${e(region.name)}</h2><h3>${e(region.strapline)}</h3>${region.paragraphs.map(text => `<p>${e(text)}</p>`).join('')}<p>${e(region.consider)}</p></article>`,
    )
    .join('');
  return `<main id="province-guide-initial" style="max-width:1000px;margin:2rem auto;padding:1.5rem;font-family:system-ui,sans-serif;line-height:1.8;color:#11243f"><nav aria-label="Breadcrumb"><a href="/">Home</a> / ${e(guide.name)} guide</nav><h1>Explore ${e(guide.name)}</h1><p>${e(guide.introduction)}</p><nav aria-label="Regions">${guide.regions.map(region => `<a style="margin-right:1rem" href="#region-${e(region.id)}">${e(region.name)}</a>`).join('')}</nav>${chapters}<section><h2>Discover your side of ${e(guide.name)}</h2>${guide.collections.map(collection => `<h3>${e(collection.label)}</h3><p>${e(collection.description)}</p><p>${e(collection.context)}</p><ul>${collection.places.map(place => `<li>${e(place.name)} — ${e(place.caption)}</li>`).join('')}</ul>`).join('')}</section><section><h2>Everyday life: what to weigh up</h2>${guide.practical.map(item => `<h3>${e(item.title)}</h3><p>${e(item.text)}</p>`).join('')}</section><section><h2>Questions about ${e(guide.name)}</h2>${guide.faqs.map(item => `<h3>${e(item.question)}</h3><p>${e(item.answer)}</p>`).join('')}</section><section><h2>Sources</h2><p>Sources checked ${e(guide.sourceCheckedOn)}.${guideStatusNote(guide.status)}</p><ul>${guide.sources.map(source => `<li><a href="${e(source.url)}">${e(source.title)}</a></li>`).join('')}</ul></section><p>Enable JavaScript to load the city directory and current platform availability.</p></main>`;
}
