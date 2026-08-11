import type { MediaType } from './listing-types';

/**
 * The persisted listing_media table and the wizard use different property
 * names for the same media facts. Keep the lifecycle rules in one place so
 * readiness, primary selection and public projection cannot drift apart.
 */
export type ListingMediaLike = {
  id?: string | number | null;
  url?: string | null;
  originalUrl?: string | null;
  processedUrl?: string | null;
  previewUrl?: string | null;
  thumbnailUrl?: string | null;
  mediaType?: MediaType | null;
  type?: MediaType | null;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed' | null;
  isPrimary?: boolean | number | null;
  displayOrder?: number | null;
  uploadToken?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  orientation?: 'vertical' | 'horizontal' | 'square' | null;
};

export const LISTING_MEDIA_TYPES = ['image', 'video', 'floorplan', 'pdf'] as const;

export function getListingMediaType(media: ListingMediaLike): MediaType | null {
  const type = media.mediaType ?? media.type;
  return LISTING_MEDIA_TYPES.includes(type as (typeof LISTING_MEDIA_TYPES)[number])
    ? (type as MediaType)
    : null;
}

export function getListingMediaUrl(media: ListingMediaLike): string | null {
  const url = media.url ?? media.processedUrl ?? media.previewUrl ?? media.originalUrl;
  return typeof url === 'string' && url.trim() ? url : null;
}

export function getListingMediaId(media: ListingMediaLike): string | null {
  if (media.id === null || media.id === undefined) return null;
  const id = String(media.id).trim();
  return id || null;
}

/**
 * A missing processing status is treated as complete for legacy rows created
 * before the status field was populated. Explicit pending/processing/failed
 * rows never qualify for readiness or the hero slot.
 */
export function isCompletedListingMedia(media: ListingMediaLike): boolean {
  return (
    media.processingStatus === undefined ||
    media.processingStatus === null ||
    media.processingStatus === 'completed'
  );
}

export function isCompletedListingImage(media: ListingMediaLike): boolean {
  return (
    getListingMediaType(media) === 'image' &&
    Boolean(getListingMediaId(media)) &&
    isCompletedListingMedia(media) &&
    Boolean(getListingMediaUrl(media))
  );
}

export function getCompletedListingImages(media: ListingMediaLike[]): ListingMediaLike[] {
  return media
    .filter(isCompletedListingImage)
    .sort((a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0));
}

export function getPrimaryListingImage(
  media: ListingMediaLike[],
  requestedId?: string | number | null,
): ListingMediaLike | null {
  const completedImages = getCompletedListingImages(media);
  if (completedImages.length === 0) return null;

  const normalizedRequestedId =
    requestedId === null || requestedId === undefined ? null : String(requestedId);
  if (normalizedRequestedId) {
    const requested = completedImages.find(
      item => getListingMediaId(item) === normalizedRequestedId,
    );
    if (requested) return requested;
  }

  return completedImages.find(item => Boolean(item.isPrimary)) ?? completedImages[0];
}

export function hasCompletedListingImage(media: ListingMediaLike[]): boolean {
  return getCompletedListingImages(media).length > 0;
}

export function normalizeListingMediaPrimary(
  media: ListingMediaLike[],
  requestedId?: string | number | null,
): { media: ListingMediaLike[]; primaryId: string | undefined } {
  const primary = getPrimaryListingImage(media, requestedId);
  const primaryId = getListingMediaId(primary ?? {});

  return {
    media: media.map(item => ({
      ...item,
      isPrimary: Boolean(primaryId && getListingMediaId(item) === primaryId),
    })),
    primaryId: primaryId ?? undefined,
  };
}
