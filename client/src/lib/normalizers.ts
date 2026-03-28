import type { PropertyCardProps } from '@/components/PropertyCard';
import { BADGE_TEMPLATES } from '@/../../shared/listing-types';

function coerceImageUrl(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return trimmed.startsWith('http') || trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  if (typeof value === 'object') {
    const candidate = value as Record<string, unknown>;
    return coerceImageUrl(
      candidate.url ||
        candidate.imageUrl ||
        candidate.thumbnailUrl ||
        candidate.originalUrl ||
        candidate.processedUrl ||
        candidate.large ||
        candidate.medium ||
        candidate.small,
    );
  }

  return undefined;
}

function resolvePrimaryImage(raw: any): string {
  const arraySources = [raw.images, raw.propertyImages, raw.listingMedia, raw.media].filter(Array.isArray);

  for (const source of arraySources) {
    const primaryItem =
      source.find((item: any) => item?.isPrimary) ||
      source.find((item: any) => item?.type === 'image') ||
      source[0];
    const resolved = coerceImageUrl(primaryItem);
    if (resolved) return resolved;
  }

  const directImage = coerceImageUrl(raw.image || raw.mainImage || raw.coverImage);
  if (directImage) return directImage;

  return '/placeholder.jpg';
}

// Normalizes raw API property objects to the props expected by PropertyCard.
export function normalizePropertyForUI(raw: any): PropertyCardProps | null {
  if (!raw || typeof raw !== 'object') return null;

  // Check for required fields
  if (
    !raw.id ||
    !raw.title ||
    (raw.price == null && raw.pricing?.askingPrice == null && raw.pricing?.monthlyRent == null)
  ) {
    return null;
  }

  // Extract property details safely - handle both direct object and JSON string
  let details = raw.propertyDetails || {};

  // If propertySettings exists and is a string, parse it
  if (raw.propertySettings) {
    try {
      details =
        typeof raw.propertySettings === 'string'
          ? JSON.parse(raw.propertySettings)
          : raw.propertySettings;
    } catch (e) {
      // If parsing fails, try propertyDetails
      details = raw.propertyDetails || {};
    }
  }

  // Determine price
  let price = Number(raw.price) || 0;
  if (raw.pricing) {
    price =
      Number(raw.pricing.askingPrice) ||
      Number(raw.pricing.monthlyRent) ||
      Number(raw.pricing.startingBid) ||
      price;
  }

  // Determine building/floor area (house size, apartment size, floor size)
  const area =
    Number(details.unitSizeM2) || // Apartment unit size
    Number(details.houseAreaM2) || // House building size
    Number(details.floorAreaM2) || // Commercial floor size
    Number(raw.area) ||
    undefined;

  // Determine yard/land size (separate from building size)
  // For houses: erfSizeM2 (plot/erf size)
  // For farms/land: landSizeM2OrHa or landSizeHa
  const yardSize =
    Number(details.erfSizeM2) || // Erf/Plot size for houses
    Number(details.landSizeM2OrHa) || // Land size
    Number(raw.yardSize) || // Direct field from backend
    (Number(details.landSizeHa) ? Number(details.landSizeHa) * 10000 : undefined); // Convert hectares to m²

  // Determine agent/user info
  const derivedAgentName = (
    raw.user?.name ||
    raw.agent?.name ||
    [raw.agent?.firstName, raw.agent?.lastName].filter(Boolean).join(' ')
  )?.trim();
  const agent = derivedAgentName
    ? {
        name: derivedAgentName,
        image:
          raw.user?.image ||
          raw.agent?.image ||
          raw.user?.avatar ||
          raw.agent?.avatar ||
          raw.agent?.profileImage,
        phone: raw.agent?.phone || raw.user?.phone || undefined,
        whatsapp: raw.agent?.whatsapp || raw.user?.whatsapp || undefined,
        email: raw.agent?.email || raw.user?.email || undefined,
      }
    : undefined;

  const developerBrand = (() => {
    const candidate = raw.developerBrand || raw.developerBrandProfile;
    if (candidate && typeof candidate === 'object') {
      const id = Number((candidate as any).id || 0);
      const brandName = String((candidate as any).brandName || (candidate as any).name || '').trim();
      const slug = String((candidate as any).slug || '').trim();
      if (Number.isFinite(id) && id > 0 && brandName && slug) {
        return {
          id,
          brandName,
          slug,
          logoUrl: (candidate as any).logoUrl ?? (candidate as any).logo ?? null,
          publicContactEmail: (candidate as any).publicContactEmail ?? null,
          phone: (candidate as any).phone ?? null,
        };
      }
    }

    const legacyId = Number(raw.developerBrandProfileId || 0);
    const legacyName = String(raw.builderBrandName || '').trim();
    const legacySlug = String(raw.builderSlug || '').trim();
    if (Number.isFinite(legacyId) && legacyId > 0 && legacyName && legacySlug) {
      return {
        id: legacyId,
        brandName: legacyName,
        slug: legacySlug,
        logoUrl: raw.builderLogoUrl ?? null,
        publicContactEmail: raw.builderPublicContactEmail ?? null,
        phone: raw.builderPhone ?? raw.developerPhone ?? null,
      };
    }

    return undefined;
  })();

  const development = (() => {
    const candidate = raw.development;
    if (candidate && typeof candidate === 'object') {
      const name = String((candidate as any).name || '').trim();
      const slug = String((candidate as any).slug || '').trim();
      const id = Number((candidate as any).id || 0);
      if (name || (Number.isFinite(id) && id > 0)) {
        return {
          id: Number.isFinite(id) && id > 0 ? id : null,
          name: name || null,
          slug: slug || null,
        };
      }
    }

    const name = String(raw.developmentName || '').trim();
    const slug = String(raw.developmentSlug || '').trim();
    const id = Number(raw.developmentId || 0);
    if (name || (Number.isFinite(id) && id > 0)) {
      return {
        id: Number.isFinite(id) && id > 0 ? id : null,
        name: name || null,
        slug: slug || null,
      };
    }

    const inferredName = String(details.developmentName || '').trim();
    if (inferredName) {
      return { id: null, name: inferredName, slug: null };
    }

    return undefined;
  })();

  const listingSource =
    raw.listingSource === 'development'
      ? 'development'
      : raw.listingSource === 'manual'
        ? 'manual'
        : !agent && !!developerBrand
          ? 'development'
          : 'manual';
  const listerType =
    raw.listerType === 'agency' || raw.listerType === 'agent' || raw.listerType === 'private'
      ? raw.listerType
      : agent
        ? 'agent'
        : listingSource === 'manual'
          ? 'private'
          : undefined;

  // Determine badges
  const formatBadge = (badge: string) =>
    BADGE_TEMPLATES[badge as keyof typeof BADGE_TEMPLATES]?.label ||
    badge
      .split(/[_-\s]+/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  const badges: string[] = [];
  if (raw.status === 'sold') badges.push('Sold');
  if (raw.status === 'rented') badges.push('Rented');
  if (raw.featured) badges.push('Featured');
  if (raw.badges && Array.isArray(raw.badges)) {
    badges.push(...raw.badges.map(formatBadge));
  }
  if (details.badges && Array.isArray(details.badges)) {
    badges.push(...details.badges.map(formatBadge));
  }

  // Determine media counts
  const imageCount =
    raw.images?.length || raw.media?.filter((m: any) => m.type === 'image').length || 0;
  const videoCount =
    raw.videos?.length || raw.media?.filter((m: any) => m.type === 'video').length || 0;

  const firstImage = Array.isArray(raw.images) ? raw.images[0] : undefined;
  const firstImageUrl =
    typeof firstImage === 'string'
      ? firstImage
      : firstImage?.url || firstImage?.imageUrl || firstImage?.thumbnailUrl;

  return {
    id: String(raw.id),
    title: String(raw.title),
    price,
    location: raw.location?.city
      ? `${raw.location.suburb ? raw.location.suburb + ', ' : ''}${raw.location.city}`
      : [raw.suburb, raw.city, raw.province].filter(Boolean).join(', ') || raw.address || '-',
    image: firstImageUrl || resolvePrimaryImage(raw),
    description: raw.description || undefined,
    bedrooms: Number(details.bedrooms) || Number(raw.bedrooms) || undefined,
    bathrooms: Number(details.bathrooms) || Number(raw.bathrooms) || undefined,
    area, // Building/floor size
    yardSize: yardSize || Number(raw.erfSize) || Number(raw.yardSize) || undefined, // Yard/land size (separate)
    propertyType: raw.propertyType
      ? raw.propertyType.charAt(0).toUpperCase() + raw.propertyType.slice(1).replace('_', ' ')
      : undefined,
    listingType: raw.listingType || raw.action || 'sale',
    listingSource,
    listerType,
    status: raw.status === 'available' ? 'Ready to Move' : raw.status, // Map backend status to UI status
    transactionType: raw.transactionType || (raw.listingType === 'rent' ? 'Rent' : 'Sale'),
    agent,
    developerBrand,
    development,
    badges: badges.length > 0 ? Array.from(new Set(badges)) : undefined,
    imageCount,
    videoCount,
    highlights: (() => {
      const source =
        raw.highlights ||
        details.propertyHighlights ||
        details.amenitiesFeatures ||
        raw.amenities ||
        raw.features;

      const formatHighlight = (s: string) => {
        if (!s || typeof s !== 'string') return s;
        // Parse snake_case or kebab-case
        return s
          .split(/[_-\s]+/)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
      };

      if (Array.isArray(source)) {
        return source.map(formatHighlight);
      }

      if (typeof source === 'string') {
        try {
          const parsed = JSON.parse(source);
          return Array.isArray(parsed) ? parsed.map(formatHighlight) : undefined;
        } catch (e) {
          return undefined;
        }
      }
      return undefined;
    })(),
  };
}
