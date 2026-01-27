/**
 * Utility to resolve the backend API URL.
 * Prefixes relative paths with the API base.
 */
export const withApiBase = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  // Fallback to localhost:5000 if VITE_API_URL is missing (dev mode assumption)
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Ensure we don't double slash
  const cleanApiUrl = apiUrl.replace(/\/$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;

  return `${cleanApiUrl}${cleanPath}`;
};

/**
 * Robustly extracts the primary image URL from a development's images field.
 * Handles mixed types: string[], object[], JSON strings, etc.
 * Prioritizes 'hero' category if available, otherwise takes the first valid image.
 */
export const getPrimaryDevelopmentImageUrl = (imagesData: any): string | null => {
  if (!imagesData) return null;

  let images: any[] = [];

  // 1. Parse/Normalize input to an array
  if (Array.isArray(imagesData)) {
    images = imagesData;
  } else if (typeof imagesData === 'string') {
    try {
      const parsed = JSON.parse(imagesData);
      if (Array.isArray(parsed)) images = parsed;
      else if (typeof parsed === 'string') images = [parsed];
      else if (typeof parsed === 'object' && parsed !== null) images = [parsed];
    } catch {
      // Raw string URL
      if (imagesData.trim().startsWith('http') || imagesData.trim().startsWith('/')) {
        images = [imagesData.trim()];
      }
    }
  } else if (typeof imagesData === 'object' && imagesData !== null) {
    // Single object case
    images = [imagesData];
  }

  if (images.length === 0) return null;

  // 2. Find Hero Image
  // Check for object structure with category='hero'
  const heroImg = images.find(
    img => typeof img === 'object' && img !== null && img.category === 'hero' && img.url,
  );
  if (heroImg && typeof heroImg.url === 'string') return heroImg.url;

  // 3. Fallback to First Valid Image
  for (const img of images) {
    if (typeof img === 'string' && img.length > 0) return img;
    if (
      typeof img === 'object' &&
      img !== null &&
      img.url &&
      typeof img.url === 'string' &&
      img.url.length > 0
    ) {
      return img.url;
    }
  }

  return null;
};
