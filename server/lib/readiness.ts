
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
  if (listing.address && listing.latitude && listing.longitude) {
    score += 20;
  } else {
    if (!listing.address) missing.location.push('Address');
    if (!listing.latitude || !listing.longitude) missing.location.push('Map Location');
  }

  // 2. Pricing (20%)
  if ((listing.askingPrice && Number(listing.askingPrice) > 0) || (listing.monthlyRent && Number(listing.monthlyRent) > 0)) {
    score += 20;
  } else {
    missing.pricing.push('Price');
  }

  // 3. Media (25%)
  // Ensure listing.images is defined and has length. Assuming it might be a JSON string or array.
  // We'll simplistic check here, can be refined based on actual data structure passing in.
  let imageCount = 0;
  if (Array.isArray(listing.images)) {
      imageCount = listing.images.length;
  } else if (typeof listing.images === 'string') {
      try {
          const parsed = JSON.parse(listing.images);
          if (Array.isArray(parsed)) imageCount = parsed.length;
      } catch (e) {
          // invalid json
      }
  }

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
     else if (listing.description.length < 100) missing.description.push('Description too short (<100 chars)');
  }

  // 5. Specs (20%)
  // Minimal specs: Bedrooms, Property Type.
  if (listing.propertyType) {
      // Basic property details usually in propertyDetails json
      let details: any = listing.propertyDetails || {};
      if (typeof details === 'string') {
           try { details = JSON.parse(details); } catch(e) {}
      }
      
      if (details.bedrooms || listing.propertyType === 'land' || listing.propertyType === 'commercial') {
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
      if (!dev.description || dev.description.length <= 50) missing.basic.push('Description (min 50 chars)');
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
      } catch (e) {}
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
      } catch (e) {}
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
