export type ImageCategory =
  | 'featured'
  | 'general' // Development-wide visuals and site plans.
  | 'interior' // Legacy development category; unit interiors belong to unit galleries.
  | 'amenities'
  | 'outdoors'
  | 'photo' // location/neighborhood
  | 'render';

export type ImageMedia = {
  url: string;
  category: ImageCategory;
  isPrimary?: boolean;
};

export type VideoMedia = {
  url: string;
  title?: string; // Optional title for thumbnail overlays
  thumbnailUrl?: string;
};

export type DevelopmentMedia = {
  featuredImage?: ImageMedia;
  images: ImageMedia[];
  videos: VideoMedia[];
};

export type DevelopmentGalleryTile = {
  image: ImageMedia;
  label: string;
  index: number;
};

const DEVELOPMENT_IMAGE_CATEGORY_LABELS: Record<ImageCategory, string> = {
  featured: 'Featured',
  general: 'Development Overview',
  interior: 'Interior',
  amenities: 'Amenities',
  outdoors: 'Exterior & Outdoors',
  photo: 'Location & Views',
  render: 'Aerial & Drone',
};

const getUniqueDevelopmentImages = (media: DevelopmentMedia): ImageMedia[] => {
  const seen = new Set<string>();
  return [media.featuredImage, ...media.images].filter((img): img is ImageMedia => {
    // Older development records may still contain interiors. Keep those assets
    // stored, but do not repeat unit-specific room imagery on the development page.
    if (!img?.url || img.category === 'interior' || seen.has(img.url)) return false;
    seen.add(img.url);
    return true;
  });
};

const getFeaturedDevelopmentImage = (media: DevelopmentMedia): ImageMedia | undefined =>
  media.featuredImage?.category === 'interior' ? undefined : media.featuredImage;

const pickFirstByCategory = (
  images: ImageMedia[],
  categories: ImageCategory[],
  excludedUrls: Set<string> = new Set(),
): ImageMedia | undefined =>
  images.find(img => categories.includes(img.category) && !excludedUrls.has(img.url));

const pickFallbackImage = (
  media: DevelopmentMedia,
  categoryOrder: ImageCategory[][],
  excludedUrls: Set<string> = new Set(),
): ImageMedia | undefined => {
  const images = getUniqueDevelopmentImages(media);

  for (const categoryGroup of categoryOrder) {
    const match = pickFirstByCategory(images, categoryGroup, excludedUrls);
    if (match) return match;
  }

  return images.find(img => !excludedUrls.has(img.url));
};

// =============================================================================
// 1. CARDS / LISTINGS (Marketing Layer)
// =============================================================================

// =============================================================================
// 1. DEVELOPMENT MEDIA (Global Marketing Assets)
// =============================================================================

/**
 * Cards and listing views must ALWAYS use the featured image.
 * Videos strictly forbidden.
 */
export function getDevelopmentCardImage(media: DevelopmentMedia): ImageMedia | undefined {
  return getFeaturedDevelopmentImage(media) || getUniqueDevelopmentImages(media)[0];
}

/**
 * The main hero slot on the Details page.
 * Use the first available development video as the hero; fall back to the selected photo.
 */
export function getDevelopmentHeroMedia(
  media: DevelopmentMedia,
): { type: 'video'; video: VideoMedia } | { type: 'image'; image: ImageMedia | undefined } {
  const featuredVideo = media.videos.find(video => Boolean(video.url));
  if (featuredVideo) {
    return { type: 'video', video: featuredVideo };
  }

  return {
    type: 'image',
    image: getFeaturedDevelopmentImage(media) || getUniqueDevelopmentImages(media)[0],
  };
}

/**
 * Builds the canonical ordered array of images for the lightbox.
 * Order: Featured -> Development Overview -> Amenities -> Outdoors -> Rest.
 * STRICTLY images only. No videos.
 */
export function buildDevelopmentGalleryImages(media: DevelopmentMedia): ImageMedia[] {
  const uniqueImages = getUniqueDevelopmentImages(media);
  const featured = media.featuredImage
    ? uniqueImages.filter(img => img.url === media.featuredImage?.url)
    : [];

  // Exclude featured from the rest to prevent duplication
  const rest = uniqueImages.filter(
    img => !media.featuredImage || img.url !== media.featuredImage.url,
  );

  // Approximate category grouping (stable sort)
  const categoryPriority: Record<string, number> = {
    general: 1,
    amenities: 2,
    outdoors: 3,
    photo: 4,
    render: 5,
  };

  const sortedRest = [...rest].sort((a, b) => {
    const pA = categoryPriority[a.category] || 99;
    const pB = categoryPriority[b.category] || 99;
    return pA - pB;
  });

  return [...featured, ...sortedRest];
}

/**
 * Select up to two distinct gallery photos for the detail-page side cards.
 * Prefer category variety, then fill any remaining slot with another photo.
 */
export function getDevelopmentGalleryTiles(
  gallery: ImageMedia[],
  featuredImage?: ImageMedia,
): DevelopmentGalleryTile[] {
  const excludedUrls = new Set(featuredImage?.url ? [featuredImage.url] : []);
  const candidates = gallery.filter(
    image => image.url && image.category !== 'interior' && !excludedUrls.has(image.url),
  );
  const selected: ImageMedia[] = [];
  const selectedUrls = new Set<string>();
  const seenCategories = new Set<ImageCategory>();

  for (const image of candidates) {
    if (seenCategories.has(image.category)) continue;
    selected.push(image);
    selectedUrls.add(image.url);
    seenCategories.add(image.category);
    if (selected.length === 2) break;
  }

  if (selected.length < 2) {
    for (const image of candidates) {
      if (selectedUrls.has(image.url)) continue;
      selected.push(image);
      selectedUrls.add(image.url);
      if (selected.length === 2) break;
    }
  }

  return selected.flatMap(image => {
    const index = gallery.findIndex(candidate => candidate.url === image.url);
    if (index < 0) return [];
    return [{ image, label: DEVELOPMENT_IMAGE_CATEGORY_LABELS[image.category], index }];
  });
}

export function getDevelopmentGalleryRemainderTileImage(
  gallery: ImageMedia[],
  featuredImage: ImageMedia | undefined,
  tiles: DevelopmentGalleryTile[],
): ImageMedia | undefined {
  const excludedUrls = new Set([
    ...(featuredImage?.url ? [featuredImage.url] : []),
    ...tiles.map(tile => tile.image.url),
  ]);
  return gallery.find(image => image.url && !excludedUrls.has(image.url));
}

/** Selects the still photo shown beside the hero video or behind video previews. */
export function getDevelopmentViewGalleryTileImage(
  media: DevelopmentMedia,
): ImageMedia | undefined {
  if (media.videos.length > 0) {
    return getFeaturedDevelopmentImage(media) || getUniqueDevelopmentImages(media)[0];
  }
  const featuredImage = getFeaturedDevelopmentImage(media);
  const excludedUrls = new Set<string>(featuredImage?.url ? [featuredImage.url] : []);
  return pickFallbackImage(
    media,
    [['general'], ['amenities'], ['outdoors'], ['photo'], ['render']],
    excludedUrls,
  );
}

// =============================================================================
// 2. UNIT TYPE MEDIA (Product Assets)
// =============================================================================

export type UnitImage = {
  url: string;
  isPrimary?: boolean;
};

export type UnitTypeMedia = {
  images: UnitImage[];
};

/**
 * Unit Type Card Image Selection
 * Logic: Primary Image > First Image.
 * NEVER use Development Hero logic.
 */
export function getUnitTypeCardImage(media: UnitTypeMedia): UnitImage | undefined {
  if (!media || !media.images) return undefined;
  return media.images.find(img => img.isPrimary) ?? media.images[0];
}

// =============================================================================
// 3. UTILS
// =============================================================================

/**
 * Resolves a thumbnail for a video.
 */
export function getVideoThumbnail(video: VideoMedia): string | undefined {
  if (!video.url) return undefined;
  if (video.thumbnailUrl) return video.thumbnailUrl;

  if (video.url.includes('youtube') || video.url.includes('youtu.be')) {
    const match = video.url.match(/(?:youtu\.be\/|youtube\.com\/.*v=)([^&]+)/);
    const id = match ? match[1] : null;
    return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : undefined;
  }

  return undefined;
}
