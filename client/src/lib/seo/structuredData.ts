import type { BreadcrumbItem } from '@/lib/urlUtils';

const DEFAULT_PUBLIC_SITE_ORIGIN = 'https://www.propertylistifysa.co.za';
const LEGACY_PUBLIC_HOSTS = new Set(['platform.com', 'www.platform.com']);

type StructuredDataValue = Record<string, unknown>;

interface GeoInput {
  latitude?: number | string | null;
  longitude?: number | string | null;
}

interface AddressInput {
  streetAddress?: string | null;
  addressLocality?: string | null;
  addressRegion?: string | null;
  postalCode?: string | null;
  addressCountry?: string | null;
}

interface AdditionalPropertyInput {
  name: string;
  value: string | number;
  unitText?: string;
}

interface PlaceStructuredDataInput {
  name: string;
  description?: string;
  url: string;
  images?: string[];
  address?: AddressInput;
  geo?: GeoInput;
  additionalProperties?: AdditionalPropertyInput[];
}

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, '');
}

function parseNumericCoordinate(value: number | string | null | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function getPublicSiteOrigin(): string {
  const configuredOrigin =
    typeof import.meta !== 'undefined' && typeof import.meta.env?.VITE_APP_URL === 'string'
      ? import.meta.env.VITE_APP_URL.trim()
      : '';

  if (configuredOrigin) {
    try {
      return normalizeOrigin(new URL(configuredOrigin).toString());
    } catch {
      // Fall through to runtime/default resolution.
    }
  }

  if (typeof window !== 'undefined') {
    if (isLocalHost(window.location.hostname)) {
      return normalizeOrigin(window.location.origin);
    }

    return DEFAULT_PUBLIC_SITE_ORIGIN;
  }

  return DEFAULT_PUBLIC_SITE_ORIGIN;
}

export function toAbsoluteUrl(pathOrUrl: string, origin = getPublicSiteOrigin()): string {
  try {
    const parsed = new URL(pathOrUrl);
    if (LEGACY_PUBLIC_HOSTS.has(parsed.hostname)) {
      return new URL(`${parsed.pathname}${parsed.search}${parsed.hash}`, origin).toString();
    }
    return parsed.toString();
  } catch {
    return new URL(pathOrUrl, origin).toString();
  }
}

export function buildBreadcrumbStructuredData(
  items: BreadcrumbItem[],
  origin = getPublicSiteOrigin(),
): StructuredDataValue {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: toAbsoluteUrl(item.href, origin),
    })),
  };
}

export function buildPlaceStructuredData({
  name,
  description,
  url,
  images = [],
  address,
  geo,
  additionalProperties = [],
}: PlaceStructuredDataInput): StructuredDataValue {
  const schema: StructuredDataValue = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name,
    url: toAbsoluteUrl(url),
  };

  const trimmedDescription = description?.trim();
  if (trimmedDescription) {
    schema.description = trimmedDescription;
  }

  const validImages = images.filter(Boolean);
  if (validImages.length === 1) {
    schema.image = validImages[0];
  } else if (validImages.length > 1) {
    schema.image = validImages;
  }

  const latitude = parseNumericCoordinate(geo?.latitude);
  const longitude = parseNumericCoordinate(geo?.longitude);
  if (latitude !== null && longitude !== null) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude,
      longitude,
    };
  }

  const hasAddress =
    Boolean(address?.streetAddress) ||
    Boolean(address?.addressLocality) ||
    Boolean(address?.addressRegion) ||
    Boolean(address?.postalCode);

  if (hasAddress) {
    schema.address = {
      '@type': 'PostalAddress',
      ...(address?.streetAddress ? { streetAddress: address.streetAddress } : {}),
      ...(address?.addressLocality ? { addressLocality: address.addressLocality } : {}),
      ...(address?.addressRegion ? { addressRegion: address.addressRegion } : {}),
      ...(address?.postalCode ? { postalCode: address.postalCode } : {}),
      addressCountry: address?.addressCountry || 'ZA',
    };
  }

  const validProperties = additionalProperties.filter(
    property => property.name && property.value !== null && property.value !== undefined,
  );

  if (validProperties.length > 0) {
    schema.additionalProperty = validProperties.map(property => ({
      '@type': 'PropertyValue',
      name: property.name,
      value: property.value,
      ...(property.unitText ? { unitText: property.unitText } : {}),
    }));
  }

  return schema;
}

interface OrganizationStructuredDataInput {
  name: string;
  url?: string;
  logoUrl?: string;
  description?: string;
}

interface WebsiteStructuredDataInput {
  name: string;
  url?: string;
  description?: string;
  searchPath?: string;
}

export function buildOrganizationStructuredData({
  name,
  url = '/',
  logoUrl,
  description,
}: OrganizationStructuredDataInput): StructuredDataValue {
  const absoluteUrl = toAbsoluteUrl(url);
  const schema: StructuredDataValue = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${absoluteUrl}#organization`,
    name,
    url: absoluteUrl,
  };

  if (logoUrl) {
    schema.logo = {
      '@type': 'ImageObject',
      url: toAbsoluteUrl(logoUrl),
    };
  }

  if (description?.trim()) {
    schema.description = description.trim();
  }

  return schema;
}

export function buildWebsiteStructuredData({
  name,
  url = '/',
  description,
  searchPath = '/properties?search={search_term_string}',
}: WebsiteStructuredDataInput): StructuredDataValue {
  const absoluteUrl = toAbsoluteUrl(url);
  const schema: StructuredDataValue = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${absoluteUrl}#website`,
    name,
    url: absoluteUrl,
  };

  if (description?.trim()) {
    schema.description = description.trim();
  }

  schema.potentialAction = {
    '@type': 'SearchAction',
    target: toAbsoluteUrl(searchPath),
    'query-input': 'required name=search_term_string',
  };

  return schema;
}
