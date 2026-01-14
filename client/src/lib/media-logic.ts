export type ImageCategory =
  | 'featured'
  | 'general' // often maps to 'interior'
  | 'interior'
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
};

export type DevelopmentMedia = {
  featuredImage?: ImageMedia;
  images: ImageMedia[];
  videos: VideoMedia[];
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
  return media.featuredImage || media.images[0];
}

/**
 * The main hero slot on the Details page.
 * Logic: Video > Featured Image.
 */
export function getDevelopmentHeroMedia(media: DevelopmentMedia): { type: 'video', video: VideoMedia } | { type: 'image', image: ImageMedia | undefined } {
  if (media.videos.length > 0) {
    return {
      type: 'video',
      video: media.videos[0],
    };
  }

  return {
    type: 'image',
    image: media.featuredImage || media.images[0],
  };
}

/**
 * Builds the canonical ordered array of images for the lightbox.
 * Order: Featured -> Interior/General -> Amenities -> Outdoors -> Rest.
 * STRICTLY images only. No videos.
 */
export function buildDevelopmentGalleryImages(media: DevelopmentMedia): ImageMedia[] {
  const featured = media.featuredImage ? [media.featuredImage] : [];
  
  // Exclude featured from the rest to prevent duplication
  const rest = media.images.filter(img => 
    !media.featuredImage || img.url !== media.featuredImage.url
  );

  // Approximate category grouping (stable sort)
  const categoryPriority: Record<string, number> = {
    'interior': 1,
    'general': 1,
    'amenities': 2,
    'outdoors': 3,
    'photo': 4,
    'render': 5
  };

  const sortedRest = [...rest].sort((a, b) => {
    const pA = categoryPriority[a.category] || 99;
    const pB = categoryPriority[b.category] || 99;
    return pA - pB;
  });

  return [...featured, ...sortedRest];
}

/**
 * Finds the index of the first image in a specific category.
 */
export function getGalleryStartIndex(gallery: ImageMedia[], category: ImageCategory): number {
  if (!gallery.length) return 0;
  
  if (category === 'interior') {
      const idx = gallery.findIndex(img => img.category === 'interior' || img.category === 'general');
      return idx !== -1 ? idx : 0;
  }

  const index = gallery.findIndex(img => img.category === category);
  return index !== -1 ? index : 0;
}

/**
 * Logic for the "View Gallery" tile (usually bottom right or large tile).
 */
export function getDevelopmentViewGalleryTileImage(media: DevelopmentMedia): ImageMedia | undefined {
  if (media.videos.length > 0) {
    return media.featuredImage || media.images[0];
  }
  const interior = media.images.find(img => img.category === 'interior' || img.category === 'general');
  return interior ?? media.images[0] ?? media.featuredImage;
}

/**
 * Amenities Tile
 */
export function getDevelopmentAmenityTileImage(media: DevelopmentMedia): ImageMedia | undefined {
  return (
    media.images.find(img => img.category === 'amenities') ??
    media.images[0]
  );
}

/**
 * Outdoors Tile
 */
export function getDevelopmentOutdoorsTileImage(media: DevelopmentMedia): ImageMedia | undefined {
  return (
    media.images.find(img => img.category === 'outdoors') ??
    media.images[1] ?? 
    media.images[0]
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
  return (
    media.images.find(img => img.isPrimary) ??
    media.images[0]
  );
}

// =============================================================================
// 3. UTILS
// =============================================================================

/**
 * Resolves a thumbnail for a video.
 */
export function getVideoThumbnail(video: VideoMedia): string | undefined {
  if (!video.url) return undefined;

  if (video.url.includes('youtube') || video.url.includes('youtu.be')) {
    const match = video.url.match(/(?:youtu\.be\/|youtube\.com\/.*v=)([^&]+)/);
    const id = match ? match[1] : null;
    return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : undefined;
  }

  return undefined;
}
