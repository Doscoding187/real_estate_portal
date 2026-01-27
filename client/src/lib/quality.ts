export interface ListingQualityBreakdown {
  score: number;
  breakdown: {
    imageCount: number;
    hasVideo: boolean;
    descriptionLength: number;
    featureCount: number;
    hasVirtualTour: boolean;
    trustSignals: string[];
    priceClarity: boolean;
    locationAccuracy: boolean;
    floorSizePresent: boolean;
  };
  tips: string[];
}

/**
 * Calculates a quality score (0-100) for a listing based on content richness.
 * Frontend version mirroring server logic for instant feedback.
 */
export function calculateListingQualityScore(listing: any): ListingQualityBreakdown {
  // --- 1. Scoring Inputs ---
  const images =
    listing.images ||
    listing.media?.filter((m: any) => m.type === 'image' || m.mediaType === 'image') ||
    [];
  const videos =
    listing.videos ||
    listing.media?.filter((m: any) => m.type === 'video' || m.mediaType === 'video') ||
    [];

  // Handle description
  const description = listing.description || '';
  const descLength = description.length;

  // Handle features
  const features = listing.features || listing.propertyHighlights || listing.amenities || [];
  const featureCount = Array.isArray(features) ? features.length : 0;

  // Attributes / Completeness
  const hasFloorSize = !!(
    listing.floorSize ||
    listing.propertySize ||
    listing.erfSize ||
    (listing.propertyDetails &&
      (listing.propertyDetails.unitSizeM2 || listing.propertyDetails.erfSizeM2))
  );

  // Price clarity
  const priceClarity = listing.price > 0 || listing.askingPrice > 0 || listing.monthlyRent > 0;

  // Geo accuracy
  const locationAccuracy = !!(listing.latitude && listing.longitude);

  // Trust signals (Mocked placeholders until User/Agency verification is fully integrated in this context)
  const isVerifiedAgent =
    listing.isVerifiedAgent === true || listing.agent?.verificationStatus === 'verified';
  const isExclusive = listing.isExclusive === true || listing.mandateType === 'exclusive';

  // Check for virtual tour
  const hasVirtualTour = !!listing.virtualTourUrl || videos.some((v: any) => v.isVirtualTour);
  const hasVideo = videos.length > 0;
  const imageCount = images.length;

  // --- 2. Calculate Score ---
  let score = 0;
  const tips: string[] = [];

  // A. Media Quality (Max 40)
  if (imageCount >= 5) score += 15;
  if (imageCount >= 10) score += 10;

  if (imageCount < 5)
    tips.push(`Add ${5 - imageCount} more photos to reach the minimum recommended standard.`);
  else if (imageCount < 10)
    tips.push(`Add ${10 - imageCount} more photos to improve your gallery score.`);

  const hasMix = imageCount >= 5;
  if (hasMix) score += 10;

  if (hasVideo || hasVirtualTour) {
    score += 5;
  } else {
    tips.push('Add a video or virtual tour to engage more buyers.');
  }

  // B. Content Quality (Max 25)
  if (descLength >= 300) score += 10;
  if (descLength >= 500) score += 10;

  if (descLength < 300) tips.push('Expand your description to at least 300 characters.');
  else if (descLength < 500)
    tips.push('Add more detail to your description (500+ characters recommended).');

  if (featureCount >= 5) {
    score += 5;
  } else {
    tips.push('List at least 5 key features or amenities.');
  }

  // C. Completeness Signals (Max 20)
  if (hasFloorSize) score += 5;
  else tips.push('Add property floor size or erf size.');

  if (priceClarity) score += 10;
  else tips.push('Ensure price is clearly listed.');

  if (locationAccuracy) score += 5;
  else tips.push('Pinpoint exact location on the map.');

  // D. Trust Signals (Max 15)
  if (isVerifiedAgent) score += 5;
  if (isExclusive) score += 5;

  const trustSignals: string[] = [];
  if (isVerifiedAgent) trustSignals.push('Verified Agent');
  if (isExclusive) trustSignals.push('Exclusive Mandate');

  // Cap at 100
  score = Math.min(100, score);

  return {
    score,
    breakdown: {
      imageCount,
      hasVideo,
      descriptionLength: descLength,
      featureCount,
      hasVirtualTour,
      trustSignals,
      priceClarity,
      locationAccuracy,
      floorSizePresent: hasFloorSize,
    },
    tips,
  };
}

export type QualityTier = 'featured' | 'optimized' | 'basic' | 'poor';

export function getQualityTier(score: number): { tier: QualityTier; label: string; color: string } {
  if (score >= 90) return { tier: 'featured', label: 'Featured', color: 'green' }; // 90-100
  if (score >= 75) return { tier: 'optimized', label: 'Optimized', color: 'blue' }; // 75-89
  if (score >= 50) return { tier: 'basic', label: 'Basic', color: 'yellow' }; // 50-74
  return { tier: 'poor', label: 'Poor', color: 'red' }; // < 50
}
