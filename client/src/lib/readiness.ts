export type ReadinessResult = {
  score: number;
  missing: Record<string, string[]>;
};

export {
  calculateDevelopmentReadiness,
  getDevelopmentReadinessPricing,
  normalizeDevelopmentReadinessTransactionType,
} from '../../../shared/developmentReadiness';

export const calculateListingReadiness = (listing: any): ReadinessResult => {
  const missing: Record<string, string[]> = {
    location: [],
    pricing: [],
    media: [],
    description: [],
    specs: [],
  };

  let score = 0;

  // 1. Location (20%)
  if (listing.address && listing.latitude && listing.longitude) {
    score += 20;
  } else {
    if (!listing.address) missing.location.push('Address');
    if (!listing.latitude || !listing.longitude) missing.location.push('Map Location');
  }

  // 2. Pricing (20%)
  if (
    (listing.askingPrice && Number(listing.askingPrice) > 0) ||
    (listing.monthlyRent && Number(listing.monthlyRent) > 0)
  ) {
    score += 20;
  } else {
    missing.pricing.push('Price');
  }

  // 3. Media (25%)
  let imageCount = 0;
  if (Array.isArray(listing.images)) {
    imageCount = listing.images.length;
  } else if (Array.isArray(listing.media)) {
    // Handle the shape returned by getById (media array of objects)
    imageCount = listing.media.length;
  }

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
  if (listing.propertyType) {
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
