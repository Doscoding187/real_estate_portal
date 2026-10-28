const CANONICAL_PUBLIC_ORIGIN = 'https://www.propertylistifysa.co.za';

type JsonLdObject = Record<string, unknown>;

export function buildServiceBreadcrumbStructuredData(
  entries: Array<{ label: string; path?: string | null }>,
): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: entries.map((entry, index) => {
      const item: JsonLdObject = {
        '@type': 'ListItem',
        position: index + 1,
        name: entry.label,
      };
      if (entry.path) item.item = `${CANONICAL_PUBLIC_ORIGIN}${entry.path}`;
      return item;
    }),
  };
}

export function buildProviderBusinessStructuredData(input: {
  slug: string;
  companyName: string;
  headline?: string | null;
  bio?: string | null;
  logoUrl?: string | null;
  locations?: Array<{
    suburb?: string | null;
    city?: string | null;
    province?: string | null;
  }> | null;
  averageRating?: number | string | null;
  reviewCount?: number | null;
}): JsonLdObject {
  const profileUrl = `${CANONICAL_PUBLIC_ORIGIN}/services/provider/${input.slug}`;
  const description = String(input.headline || input.bio || '').trim();
  const areaServed = (input.locations || [])
    .map(location => [location.suburb, location.city, location.province].filter(Boolean).join(', '))
    .filter(Boolean);
  const rating = Number(input.averageRating);
  const reviewCount = Number(input.reviewCount);
  const hasAggregateRating = Number.isFinite(rating) && rating > 0 && reviewCount > 0;

  const data: JsonLdObject = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${profileUrl}#provider`,
    name: input.companyName,
    url: profileUrl,
  };

  if (description) data.description = description;
  if (input.logoUrl) data.image = input.logoUrl;
  if (areaServed.length > 0) data.areaServed = areaServed;
  if (hasAggregateRating) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating,
      reviewCount,
      bestRating: 5,
    };
  }

  return data;
}
