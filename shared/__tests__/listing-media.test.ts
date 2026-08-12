import { describe, expect, it } from 'vitest';
import {
  getCompletedListingImages,
  getPrimaryListingImage,
  normalizeListingMediaPrimary,
} from '../listing-media';

describe('canonical listing media rules', () => {
  it('counts only identified, completed images as qualifying media', () => {
    const media = [
      {
        id: 'pending-image',
        url: 'pending.jpg',
        type: 'image' as const,
        processingStatus: 'pending' as const,
      },
      {
        id: 'video-1',
        url: 'tour.mp4',
        type: 'video' as const,
        processingStatus: 'completed' as const,
      },
      {
        id: 'image-1',
        url: 'front.jpg',
        type: 'image' as const,
        processingStatus: 'completed' as const,
      },
      {
        id: '',
        url: 'unidentified.jpg',
        type: 'image' as const,
        processingStatus: 'completed' as const,
      },
    ];

    expect(getCompletedListingImages(media)).toEqual([expect.objectContaining({ id: 'image-1' })]);
    expect(getPrimaryListingImage(media)?.id).toBe('image-1');
  });

  it('never promotes video or document media to the primary image slot', () => {
    const media = [
      { id: 'video-1', url: 'tour.mp4', type: 'video' as const, isPrimary: true },
      { id: 'pdf-1', url: 'plan.pdf', type: 'pdf' as const },
      { id: 'image-1', url: 'front.jpg', type: 'image' as const },
    ];

    const normalized = normalizeListingMediaPrimary(media);
    expect(normalized.primaryId).toBe('image-1');
    expect(normalized.media.find(item => item.id === 'image-1')?.isPrimary).toBe(true);
    expect(normalized.media.find(item => item.id === 'video-1')?.isPrimary).toBe(false);
  });

  it('keeps an explicit completed image primary across reorder operations', () => {
    const media = [
      { id: 'image-1', url: 'front.jpg', type: 'image' as const, displayOrder: 1 },
      {
        id: 'image-2',
        url: 'kitchen.jpg',
        type: 'image' as const,
        displayOrder: 0,
        isPrimary: true,
      },
    ];

    const normalized = normalizeListingMediaPrimary(media, 'image-2');
    expect(normalized.primaryId).toBe('image-2');
    expect(normalized.media.find(item => item.id === 'image-2')?.isPrimary).toBe(true);
  });
});
