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
  return titleCase(
    decodeURIComponent(value)
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
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

function buildAreaSeoData(transactionLabel: 'Sale' | 'Rent', segments: string[]): SeoPageData | null {
  const [province, city, suburb] = segments.map(humanizeSegment);
  const canonicalPath = `/${
    transactionLabel === 'Sale' ? 'property-for-sale' : 'property-to-rent'
  }/${segments.join('/')}`;

  if (province && city && suburb) {
    return {
      title: `Property for ${transactionLabel} in ${suburb}, ${city}, ${province} | ${DEFAULT_SITE_NAME}`,
      description: `Browse property for ${transactionLabel.toLowerCase()} in ${suburb}, ${city}, ${province}, including homes, apartments, and new developments on ${DEFAULT_SITE_NAME}.`,
      canonicalUrl: absoluteUrl(canonicalPath),
      robots: 'index, follow',
      siteName: DEFAULT_SITE_NAME,
    };
  }

  if (province && city) {
    return {
      title: `Property for ${transactionLabel} in ${city}, ${province} | ${DEFAULT_SITE_NAME}`,
      description: `Explore property for ${transactionLabel.toLowerCase()} in ${city}, ${province}, including residential listings, rentals, and developments on ${DEFAULT_SITE_NAME}.`,
      canonicalUrl: absoluteUrl(canonicalPath),
      robots: 'index, follow',
      siteName: DEFAULT_SITE_NAME,
    };
  }

  if (province) {
    return {
      title: `Property for ${transactionLabel} in ${province} | ${DEFAULT_SITE_NAME}`,
      description: `Find property for ${transactionLabel.toLowerCase()} across ${province}, including houses, apartments, and developments on ${DEFAULT_SITE_NAME}.`,
      canonicalUrl: absoluteUrl(canonicalPath),
      robots: 'index, follow',
      siteName: DEFAULT_SITE_NAME,
    };
  }

  return null;
}

export function resolveSeoPageData(requestUrl: string): SeoPageData {
  const parsedUrl = new URL(requestUrl, CANONICAL_PUBLIC_ORIGIN);
  const pathname = normalizePathname(parsedUrl.pathname);
  const pathSegments = pathname.split('/').filter(Boolean);

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
        "Explore advertising and acquisition opportunities for agents, developers, agencies, and property brands on Property Listify South Africa.",
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

  if (pathSegments[0] === 'property-for-sale') {
    return (
      buildAreaSeoData('Sale', pathSegments.slice(1)) || {
        title: `Property for Sale in South Africa | ${DEFAULT_SITE_NAME}`,
        description:
          'Browse homes, apartments, and developments for sale across South Africa on Property Listify.',
        canonicalUrl: absoluteUrl(pathname),
        robots: 'index, follow',
        siteName: DEFAULT_SITE_NAME,
      }
    );
  }

  if (pathSegments[0] === 'property-to-rent') {
    return (
      buildAreaSeoData('Rent', pathSegments.slice(1)) || {
        title: `Property to Rent in South Africa | ${DEFAULT_SITE_NAME}`,
        description:
          'Browse houses, apartments, and rentals across South Africa on Property Listify.',
        canonicalUrl: absoluteUrl(pathname),
        robots: 'index, follow',
        siteName: DEFAULT_SITE_NAME,
      }
    );
  }

  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    canonicalUrl: absoluteUrl(pathname),
    robots: 'index, follow',
    siteName: DEFAULT_SITE_NAME,
  };
}

export function injectSeoHead(template: string, requestUrl: string): string {
  const seo = resolveSeoPageData(requestUrl);

  return template
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
}
