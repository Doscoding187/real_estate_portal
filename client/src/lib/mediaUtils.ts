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

export const resolveMediaUrl = (input?: string | null): string | null => {
  if (!input) return null;

  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  // Already absolute or data/blob
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  const base =
    import.meta.env.VITE_CLOUDFRONT_URL ||
    import.meta.env.VITE_ASSETS_BASE_URL ||
    '';

  if (!base) return trimmed; // fallback (relative)

  const cleanBase = base.replace(/\/$/, '');
  const cleanPath = trimmed.replace(/^\//, '');
  return `${cleanBase}/${cleanPath}`;
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
    img =>
      typeof img === 'object' &&
      img !== null &&
      img.category === 'hero' &&
      (img.url || img.key || img.src),
  );
  if (heroImg) {
    const candidate = heroImg.url || heroImg.key || heroImg.src;
    if (typeof candidate === 'string') return resolveMediaUrl(candidate);
  }

  // 3. Fallback to First Valid Image
  for (const img of images) {
    if (typeof img === 'string' && img.length > 0) return resolveMediaUrl(img);
    if (
      typeof img === 'object' &&
      img !== null &&
      (img.url || img.key || img.src)
    ) {
      const candidate = img.url || img.key || img.src;
      if (typeof candidate === 'string' && candidate.length > 0) {
        return resolveMediaUrl(candidate);
      }
    }
  }

  return null;
};
