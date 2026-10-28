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

export function buildProviderServiceStructuredData(input: {
  providerSlug: string;
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
  service: {
    displayName: string;
    description?: string | null;
    categoryLabel?: string | null;
    minPrice?: number | null;
    maxPrice?: number | null;
    currency?: string | null;
  };
  servicePath: string;
}): JsonLdObject {
  const profileUrl = `${CANONICAL_PUBLIC_ORIGIN}/services/provider/${input.providerSlug}`;
  const serviceUrl = `${CANONICAL_PUBLIC_ORIGIN}${input.servicePath}`;
  const description = String(input.service.description || '').trim();

  const data: JsonLdObject = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${serviceUrl}#service`,
    name: input.service.displayName,
    url: serviceUrl,
    provider: {
      '@type': 'LocalBusiness',
      '@id': `${profileUrl}#provider`,
      name: input.companyName,
      url: profileUrl,
    },
  };

  const profileDescription = String(input.headline || input.bio || '').trim();
  if (description) {
    data.description = description;
  } else if (profileDescription) {
    data.description = profileDescription;
  }

  if (input.logoUrl) data.image = input.logoUrl;
  if (input.service.categoryLabel) data.serviceType = input.service.categoryLabel;

  const areaServed = (input.locations || [])
    .map(location => [location.suburb, location.city, location.province].filter(Boolean).join(', '))
    .filter(Boolean);
  if (areaServed.length > 0) data.areaServed = areaServed;

  if (
    input.service.minPrice != null &&
    input.service.maxPrice != null &&
    Number.isFinite(Number(input.service.minPrice)) &&
    Number.isFinite(Number(input.service.maxPrice))
  ) {
    data.offers = {
      '@type': 'Offer',
      priceCurrency: input.service.currency || 'ZAR',
      priceSpecification: {
        '@type': 'PriceSpecification',
        minPrice: Number(input.service.minPrice),
        maxPrice: Number(input.service.maxPrice),
        priceCurrency: input.service.currency || 'ZAR',
      },
    };
  }

  return data;
}
