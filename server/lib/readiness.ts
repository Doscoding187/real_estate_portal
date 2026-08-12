import { getPrimaryPrice } from '../../shared/pricing-contract';
import { validateManualLocationEvidence } from '../../shared/location-contract';
import { getCompletedListingImages } from '../../shared/listing-media';

export type ReadinessResult = {
  score: number;
  missing: {
    [key: string]: string[];
  };
};

export const calculateListingReadiness = (listing: any): ReadinessResult => {
  const missing: { [key: string]: string[] } = {
    location: [],
    pricing: [],
    media: [],
    description: [],
    specs: [],
  };

  let score = 0;

  // 1. Location (20%)
  const authoredLocation = listing.location || listing;
  const hasCoordinates =
    authoredLocation.latitude != null &&
    authoredLocation.longitude != null &&
    Number.isFinite(Number(authoredLocation.latitude)) &&
    Number.isFinite(Number(authoredLocation.longitude)) &&
    !(Number(authoredLocation.latitude) === 0 && Number(authoredLocation.longitude) === 0);
  const locationIssues = validateManualLocationEvidence({
    propertyType: listing.propertyType,
    discovery: {
      provinceId: authoredLocation.provinceId,
      cityId: authoredLocation.cityId,
      suburbId: authoredLocation.suburbId ?? null,
    },
    privateAddress: authoredLocation.privateAddress || null,
  });
  const hasCanonicalLocation =
    locationIssues.length === 0 && authoredLocation.locationConfirmationState === 'confirmed';
  const hasLegacyLocation = Boolean(authoredLocation.address) && hasCoordinates;
  if (hasCanonicalLocation || hasLegacyLocation) {
    score += 20;
  } else {
    if (locationIssues.some(issue => /province|city|suburb|locality/i.test(issue))) {
      missing.location.push('Area');
    }
    if (locationIssues.some(issue => /street|farm|holding|portion/i.test(issue))) {
      missing.location.push('Street or rural reference');
    }
    if (authoredLocation.locationConfirmationState !== 'confirmed') {
      missing.location.push('Confirm Location');
    }
    const onlyOneCoordinate =
      (authoredLocation.latitude == null) !== (authoredLocation.longitude == null);
    if (onlyOneCoordinate || (hasCoordinates && locationIssues.length > 0)) {
      missing.location.push('Map coordinates');
    }
  }

  // 2. Pricing (20%)
  const primaryPrice = listing.action
    ? getPrimaryPrice(listing.action, listing.pricing || listing, listing.propertyDetails)
    : Number(listing.askingPrice ?? listing.monthlyRent ?? 0) || undefined;
  if (primaryPrice !== undefined && primaryPrice > 0) {
    score += 20;
  } else {
    missing.pricing.push('Price');
  }

  // 3. Media (25%) — only completed qualifying images count. Videos,
  // documents and failed/incomplete uploads never satisfy image readiness.
  let mediaItems = Array.isArray(listing.media) ? listing.media : [];
  if (mediaItems.length === 0 && Array.isArray(listing.images)) {
    mediaItems = listing.images.map((url: unknown) => ({ url, type: 'image' as const }));
  }
  if (mediaItems.length === 0 && typeof listing.images === 'string') {
    try {
      const parsed = JSON.parse(listing.images);
      if (Array.isArray(parsed)) {
        mediaItems = parsed.map((url: unknown) => ({ url, type: 'image' as const }));
      }
    } catch (_error) {
      // invalid json
    }
  }
  const imageCount = getCompletedListingImages(mediaItems).length;

  // If there's a mainMediaId, that counts as well effectively
  if (imageCount >= 5) {
    score += 25;
  } else {
    missing.media.push(`Upload at least 5 images (Current: ${imageCount})`);
  }

  // 4. Description (15%)
  if (listing.description && listing.description.length >= 100) {
    score += 15;
  } else {
    if (!listing.description) missing.description.push('Description');
    else if (listing.description.length < 100)
      missing.description.push('Description too short (<100 chars)');
  }

  // 5. Specs (20%)
  // Minimal specs: Bedrooms, Property Type.
  if (listing.propertyType) {
    // Basic property details usually in propertyDetails json
    let details: any = listing.propertyDetails || {};
    if (typeof details === 'string') {
      try {
        details = JSON.parse(details);
      } catch (_error) {
        // Ignore malformed payloads and treat as missing specs.
      }
    }

    if (
      details.bedrooms ||
      listing.propertyType === 'land' ||
      listing.propertyType === 'commercial'
    ) {
      score += 20;
    } else {
      missing.specs.push('Bedrooms');
    }
  } else {
    missing.specs.push('Property Type');
  }

  return { score, missing };
};

export const calculateDevelopmentReadiness = (dev: any): ReadinessResult => {
  const missing: { [key: string]: string[] } = {
    basic: [],
    location: [],
    media: [],
    amenities: [],
    specs: [],
  };
  let score = 0;

  // 1. Basic Info (20%)
  if (dev.name && dev.description && dev.description.length > 50) {
    score += 20;
  } else {
    if (!dev.name) missing.basic.push('Name');
    if (!dev.description || dev.description.length <= 50)
      missing.basic.push('Description (min 50 chars)');
  }

  // 2. Location (20%)
  if (dev.address && dev.latitude && dev.longitude) {
    score += 20;
  } else {
    if (!dev.address) missing.location.push('Address');
    if (!dev.latitude || !dev.longitude) missing.location.push('Map Location');
  }

  // 3. Media (20%)
  let imageCount = 0;
  if (Array.isArray(dev.images)) {
    imageCount = dev.images.length;
  } else if (typeof dev.images === 'string') {
    try {
      const parsed = JSON.parse(dev.images);
      if (Array.isArray(parsed)) imageCount = parsed.length;
    } catch (_error) {
      // Ignore malformed image payloads and keep count at zero.
    }
  }

  if (imageCount >= 1) {
    score += 20;
  } else {
    missing.media.push('Main Image');
  }

  // 4. Amenities (20%) - Require at least 3 amenities
  let amenityCount = 0;
  if (Array.isArray(dev.amenities)) {
    amenityCount = dev.amenities.length;
  } else if (typeof dev.amenities === 'string') {
    try {
      const parsed = JSON.parse(dev.amenities);
      if (Array.isArray(parsed)) amenityCount = parsed.length;
    } catch (_error) {
      // Ignore malformed amenities payloads and keep count at zero.
    }
  }

  if (amenityCount >= 3) {
    score += 20;
  } else {
    missing.amenities.push(`Select at least 3 amenities (Current: ${amenityCount})`);
  }

  // 5. Units/Specs (20%)
  if (dev.priceFrom && Number(dev.priceFrom) > 0) {
    score += 20;
  } else {
    missing.specs.push('Price From (Units)');
  }

  return { score, missing };
};
