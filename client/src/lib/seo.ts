type SeoInput = {
  title: string;
  description?: string;
  canonicalPath?: string;
  noindex?: boolean;
};

const MANAGED_ATTR = 'data-seo-managed';

function upsertMetaByName(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
  el.setAttribute(MANAGED_ATTR, 'true');
}

function upsertMetaByProperty(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
  el.setAttribute(MANAGED_ATTR, 'true');
}

function upsertLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
  el.setAttribute(MANAGED_ATTR, 'true');
}

export function applySeo(input: SeoInput) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  document.title = input.title;

  upsertMetaByProperty('og:title', input.title);
  upsertMetaByProperty('og:type', 'website');

  if (input.description) {
    upsertMetaByName('description', input.description);
    upsertMetaByProperty('og:description', input.description);
  }

  if (input.canonicalPath) {
    const canonicalUrl = new URL(input.canonicalPath, window.location.origin).toString();
    upsertLink('canonical', canonicalUrl);
    upsertMetaByProperty('og:url', canonicalUrl);
  }

  upsertMetaByName('robots', input.noindex ? 'noindex, nofollow' : 'index, follow');
}
