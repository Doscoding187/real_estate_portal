import type { MediaFile } from '@shared/listing-types';
import { getCompletedListingImages, normalizeListingMediaPrimary } from '@shared/listing-media';

/** The visible wizard order chooses the cover; only a completed photo qualifies. */
export function normalizeWizardPhotoOrder(media: MediaFile[]) {
  const ordered = media.map((item, displayOrder) => ({ ...item, displayOrder }));
  const firstPhoto = getCompletedListingImages(ordered)[0];
  const normalized = normalizeListingMediaPrimary(ordered, firstPhoto?.id);
  return { media: normalized.media as MediaFile[], mainMediaId: normalized.primaryId };
}
