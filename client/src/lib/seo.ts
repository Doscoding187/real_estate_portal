type SeoInput = {
  title?: string;
  description?: string;
  canonicalPath?: string;
  noindex?: boolean;
  image?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  geo?: {
    latitude: number | string;
    longitude: number | string;
    name?: string;
    region?: string;
  };
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
};

const MANAGED_ATTR = 'data-seo-managed';

function getSingleton(selector: string, create: () => HTMLElement): HTMLElement {
  const matches = Array.from(document.querySelectorAll<HTMLElement>(selector));
  const element = matches[0] ?? create();

  for (const duplicate of matches.slice(1)) {
    duplicate.remove();
  }

  return element;
}

function upsertMetaByName(name: string, content: string) {
  const el = getSingleton(`meta[name="${name}"]`, () => {
    const created = document.createElement('meta');
    created.setAttribute('name', name);
    document.head.appendChild(created);
    return created;
  }) as HTMLMetaElement;

  el.setAttribute('content', content);
  el.setAttribute(MANAGED_ATTR, 'true');
}

function upsertMetaByProperty(property: string, content: string) {
  const el = getSingleton(`meta[property="${property}"]`, () => {
    const created = document.createElement('meta');
    created.setAttribute('property', property);
    document.head.appendChild(created);
    return created;
  }) as HTMLMetaElement;

  el.setAttribute('content', content);
  el.setAttribute(MANAGED_ATTR, 'true');
}

function removeMetaByName(name: string) {
  document.querySelectorAll(`meta[name="${name}"]`).forEach(element => element.remove());
}

function removeMetaByProperty(property: string) {
  document.querySelectorAll(`meta[property="${property}"]`).forEach(element => element.remove());
}

function upsertLink(rel: string, href: string) {
  const el = getSingleton(`link[rel="${rel}"]`, () => {
    const created = document.createElement('link');
    created.setAttribute('rel', rel);
    document.head.appendChild(created);
    return created;
  }) as HTMLLinkElement;

  el.setAttribute('href', href);
  el.setAttribute(MANAGED_ATTR, 'true');
}

function upsertStructuredData(structuredData: SeoInput['structuredData']) {
  document
    .querySelectorAll(`script[type="application/ld+json"][${MANAGED_ATTR}="true"]`)
    .forEach(element => element.remove());

  const values = Array.isArray(structuredData)
    ? structuredData.filter(Boolean)
    : structuredData
      ? [structuredData]
      : [];

  for (const value of values) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute(MANAGED_ATTR, 'true');
    script.textContent = JSON.stringify(value);
    document.head.appendChild(script);
  }
}

export function applySeo(input: SeoInput) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  if (input.title !== undefined) {
    document.title = input.title;
    upsertMetaByProperty('og:title', input.title);
    upsertMetaByName('twitter:title', input.title);
  }

  upsertMetaByProperty('og:type', 'website');

  if (input.description !== undefined) {
    upsertMetaByName('description', input.description);
    upsertMetaByProperty('og:description', input.description);
    upsertMetaByName('twitter:description', input.description);
  }

  if (input.image) {
    upsertMetaByProperty('og:image', input.image);
    upsertMetaByName('twitter:image', input.image);
  } else {
    removeMetaByProperty('og:image');
    removeMetaByName('twitter:image');
  }

  if (input.canonicalPath !== undefined) {
    const canonicalUrl = new URL(input.canonicalPath, window.location.origin).toString();
    upsertLink('canonical', canonicalUrl);
    upsertMetaByProperty('og:url', canonicalUrl);
    upsertMetaByName('twitter:url', canonicalUrl);
  }

  upsertMetaByName(
    'twitter:card',
    input.twitterCard ?? (input.image ? 'summary_large_image' : 'summary'),
  );
  upsertMetaByName('robots', input.noindex ? 'noindex, nofollow' : 'index, follow');

  if (input.geo) {
    upsertMetaByName('geo.position', `${input.geo.latitude};${input.geo.longitude}`);
    upsertMetaByName('geo.placename', input.geo.name ?? '');
    upsertMetaByName('geo.region', input.geo.region ?? 'ZA');
  } else {
    removeMetaByName('geo.position');
    removeMetaByName('geo.placename');
    removeMetaByName('geo.region');
  }

  upsertStructuredData(input.structuredData);
}
