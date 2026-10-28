import {
  COUNTRY_DISCOVERY_DESCRIPTION,
  COUNTRY_DISCOVERY_PATH,
  COUNTRY_DISCOVERY_TITLE,
} from '../../shared/countryDiscovery';
import {
  canonicalPlaceUrlByPath,
  canonicalPlaceUrlByPlaceId,
} from '../services/canonicalPlaceUrlService';

const CANONICAL_PUBLIC_ORIGIN = 'https://www.propertylistifysa.co.za';
const DEFAULT_SITE_NAME = 'Property Listify';
const DEFAULT_TITLE = 'Property Listify | South African Property Search and New Developments';
const DEFAULT_DESCRIPTION =
  'Search South African property listings, explore new developments, compare areas, and connect with agents and developers on Property Listify.';

type SeoPageData = {
  title: string;
  description: string;
  canonicalUrl: string;
  robots: string;
  siteName: string;
};

function titleCase(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function humanizeSegment(value: string): string {
  return titleCase(decodeURIComponent(value).replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim());
}

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function absoluteUrl(pathname: string): string {
  return new URL(pathname, CANONICAL_PUBLIC_ORIGIN).toString();
}

export function resolveSeoPageData(requestUrl: string): SeoPageData {
  const parsedUrl = new URL(requestUrl, CANONICAL_PUBLIC_ORIGIN);
  const pathname = normalizePathname(parsedUrl.pathname);
  const pathSegments = pathname.split('/').filter(Boolean);

  if (pathname === COUNTRY_DISCOVERY_PATH) {
    return {
      title: COUNTRY_DISCOVERY_TITLE,
      description: COUNTRY_DISCOVERY_DESCRIPTION,
      canonicalUrl: absoluteUrl(COUNTRY_DISCOVERY_PATH),
      robots: parsedUrl.search ? 'noindex, follow' : 'index, follow',
      siteName: DEFAULT_SITE_NAME,
    };
  }

  const placeRoute = canonicalPlaceUrlByPath(pathname);
  if (placeRoute) {
    const context = placeRoute.path_context?.name;
    const placeLabel = placeRoute.preferred_public_name;
    return {
      title: `${placeLabel} property search | ${DEFAULT_SITE_NAME}`,
      description: context
        ? `Explore property listings in ${placeLabel}, ${context}, ${placeRoute.province_name}.`
        : `Explore property listings in ${placeLabel}, ${placeRoute.province_name}.`,
      canonicalUrl: absoluteUrl(placeRoute.path),
      robots:
        placeRoute.publication_eligible &&
        placeRoute.verification_status === 'verified' &&
        !parsedUrl.search
          ? 'index, follow'
          : 'noindex, follow',
      siteName: DEFAULT_SITE_NAME,
    };
  }

  if (pathname === '/') {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      canonicalUrl: absoluteUrl('/'),
      robots: 'index, follow',
      siteName: DEFAULT_SITE_NAME,
    };
  }

  if (pathname === '/advertise') {
    return {
      title: 'Advertise With Us | Property Listify',
      description:
        'Explore advertising and acquisition opportunities for agents, developers, agencies, and property brands on Property Listify South Africa.',
      canonicalUrl: absoluteUrl(pathname),
      robots: 'index, follow',
      siteName: DEFAULT_SITE_NAME,
    };
  }

  if (pathname.startsWith('/advertise/')) {
    const routeLabel = humanizeSegment(pathSegments.slice(1).join(' '));
    return {
      title: `${routeLabel} | Property Listify`,
      description: `Learn more about ${routeLabel.toLowerCase()} opportunities on Property Listify South Africa.`,
      canonicalUrl: absoluteUrl(pathname),
      robots: 'index, follow',
      siteName: DEFAULT_SITE_NAME,
    };
  }

  if (pathname === '/get-started') {
    return {
      title: 'Get Started | Property Listify Advertiser Onboarding',
      description:
        'Start advertiser onboarding for agents, agencies, developers, and private sellers on Property Listify.',
      canonicalUrl: absoluteUrl(pathname),
      robots: 'index, follow',
      siteName: DEFAULT_SITE_NAME,
    };
  }

  if (pathname.startsWith('/get-started/')) {
    const roleLabel = humanizeSegment(pathSegments[1] || 'advertiser');
    const isConfirmation = pathSegments[2] === 'confirmation';
    return {
      title: isConfirmation
        ? `${roleLabel} Strategy Confirmation | Property Listify`
        : `${roleLabel} Onboarding | Property Listify`,
      description: isConfirmation
        ? `Review next steps for your ${roleLabel.toLowerCase()} guided onboarding with Property Listify.`
        : `See the onboarding path, setup options, and advertiser packages for ${roleLabel.toLowerCase()} on Property Listify.`,
      canonicalUrl: absoluteUrl(pathname),
      robots: 'index, follow',
      siteName: DEFAULT_SITE_NAME,
    };
  }

  if (pathname === '/book-strategy') {
    return {
      title: 'Book Strategy | Property Listify',
      description:
        'Book a guided strategy session to plan your property marketing and growth setup with Property Listify.',
      canonicalUrl: absoluteUrl(pathname),
      robots: 'index, follow',
      siteName: DEFAULT_SITE_NAME,
    };
  }

  if (pathname === '/new-developments') {
    return {
      title: 'New Developments in South Africa | Property Listify',
      description:
        'Discover new residential and mixed-use developments across South Africa on Property Listify.',
      canonicalUrl: absoluteUrl(pathname),
      robots: 'index, follow',
      siteName: DEFAULT_SITE_NAME,
    };
  }

  if (pathname.startsWith('/development/')) {
    const developmentLabel = humanizeSegment(pathSegments[1] || 'development');
    return {
      title: `${developmentLabel} | New Development on Property Listify`,
      description: `View details, pricing, and location information for ${developmentLabel} on Property Listify South Africa.`,
      canonicalUrl: absoluteUrl(pathname),
      robots: 'index, follow',
      siteName: DEFAULT_SITE_NAME,
    };
  }

  if (pathname.startsWith('/property/')) {
    const propertySlug = pathSegments[1] || '';
    const label = propertySlug.replace(/^\d+-?/, '');
    const propertyLabel = humanizeSegment(label || 'property');
    return {
      title: `${propertyLabel} | Property Listing on Property Listify`,
      description: `View the latest details, pricing, and media for ${propertyLabel.toLowerCase()} on Property Listify South Africa.`,
      canonicalUrl: absoluteUrl(pathname),
      robots: 'index, follow',
      siteName: DEFAULT_SITE_NAME,
    };
  }

  if (pathname === '/property-for-sale') {
    return {
      title: `Property for Sale in South Africa | ${DEFAULT_SITE_NAME}`,
      description:
        'Browse homes, apartments, and developments for sale across South Africa on Property Listify.',
      canonicalUrl: absoluteUrl(pathname),
      robots: parsedUrl.search ? 'noindex, follow' : 'index, follow',
      siteName: DEFAULT_SITE_NAME,
    };
  }

  if (pathname === '/property-to-rent') {
    return {
      title: `Property to Rent in South Africa | ${DEFAULT_SITE_NAME}`,
      description:
        'Browse houses, apartments, and rentals across South Africa on Property Listify.',
      canonicalUrl: absoluteUrl(pathname),
      robots: parsedUrl.search ? 'noindex, follow' : 'index, follow',
      siteName: DEFAULT_SITE_NAME,
    };
  }

  if (pathname === '/agents') {
    return {
      title: `Find Property Practitioners | ${DEFAULT_SITE_NAME}`,
      description:
        'Browse approved property practitioners on Property Listify — view their profiles, service areas and live listings.',
      canonicalUrl: absoluteUrl('/agents'),
      robots: 'index, follow',
      siteName: DEFAULT_SITE_NAME,
    };
  }

  if (
    (pathSegments[0] === 'agents' || pathSegments[0] === 'a') &&
    pathSegments.length === 2 &&
    Boolean(pathSegments[1])
  ) {
    const canonicalPath = pathSegments[0] === 'a' ? `/agents/${pathSegments[1]}` : pathname;
    return {
      title: `Property Practitioner Profile | ${DEFAULT_SITE_NAME}`,
      description:
        'View this property practitioner on Property Listify — live listings, service areas and direct contact options.',
      canonicalUrl: absoluteUrl(canonicalPath),
      robots: 'index, follow',
      siteName: DEFAULT_SITE_NAME,
    };
  }

  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    canonicalUrl: absoluteUrl(pathname),
    robots: 'noindex, follow',
    siteName: DEFAULT_SITE_NAME,
  };
}

/**
 * Structured data for the delivered country and canonical Place documents. It uses only
 * canonical projection facts, so crawlers and the rendered page share one route authority.
 */
function canonicalDiscoveryStructuredData(pathname: string): Record<string, unknown>[] | undefined {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 1 && segments[0] === 'south-africa') {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'South Africa',
            item: absoluteUrl(COUNTRY_DISCOVERY_PATH),
          },
        ],
      },
    ];
  }

  const breadcrumb = (items: { name: string; url: string }[]) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  });

  const entry = canonicalPlaceUrlByPath(pathname);
  if (!entry) return undefined;
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'South Africa', url: COUNTRY_DISCOVERY_PATH },
  ];
  if (entry.search_scope !== 'province') {
    breadcrumbs.push({ name: entry.province_name, url: `/${entry.province_slug}` });
  }
  const contextRoute = entry.path_context
    ? canonicalPlaceUrlByPlaceId(entry.path_context.place_id)
    : null;
  if (contextRoute) {
    breadcrumbs.push({
      name: contextRoute.preferred_public_name,
      url: contextRoute.path,
    });
  }
  breadcrumbs.push({ name: entry.preferred_public_name, url: entry.path });
  return [
    breadcrumb(breadcrumbs),
    {
      '@context': 'https://schema.org',
      '@type': 'Place',
      name: entry.preferred_public_name,
      url: absoluteUrl(entry.path),
      additionalType: entry.place_type,
      address: {
        '@type': 'PostalAddress',
        addressRegion: entry.province_name,
        addressCountry: 'ZA',
      },
    },
  ];
}

export function injectSeoHead(template: string, requestUrl: string): string {
  const seo = resolveSeoPageData(requestUrl);
  const withHead = template
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(seo.title)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    )
    .replace(
      /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="robots" content="${escapeHtml(seo.robots)}" />`,
    )
    .replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:url" content="${escapeHtml(seo.canonicalUrl)}" />`,
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    )
    .replace(
      /<meta\s+property="og:site_name"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:site_name" content="${escapeHtml(seo.siteName)}" />`,
    )
    .replace(
      /<meta\s+name="twitter:url"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:url" content="${escapeHtml(seo.canonicalUrl)}" />`,
    )
    .replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    )
    .replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${escapeHtml(seo.canonicalUrl)}" />`,
    );

  const structuredData: Record<string, unknown>[] =
    canonicalDiscoveryStructuredData(new URL(requestUrl, CANONICAL_PUBLIC_ORIGIN).pathname) ?? [];
  if (!structuredData.length) return withHead;

  // The rendered page replaces these nodes on boot, so the delivered document and the page
  // never present two different sets of structured data.
  const scripts = structuredData
    .map(
      item =>
        `<script type="application/ld+json" data-seo-managed="true">${JSON.stringify(item)}</script>`,
    )
    .join('');
  return withHead.replace(/<\/head>/i, `${scripts}</head>`);
}
