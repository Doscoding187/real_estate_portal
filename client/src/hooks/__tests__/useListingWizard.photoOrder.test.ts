import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MediaFile } from '@shared/listing-types';
import { hydrateListingWizardForUser, useListingWizardStore } from '../useListingWizard';

const photo = (id: string, overrides: Partial<MediaFile> = {}): MediaFile => ({
  id,
  url: `/${id}.jpg`,
  type: 'image',
  processingStatus: 'completed',
  displayOrder: 0,
  isPrimary: false,
  uploadToken: `confirmed-${id}`,
  ...overrides,
});
const store = () => useListingWizardStore.getState();

beforeEach(async () => {
  localStorage.clear();
  await act(async () => {
    await hydrateListingWizardForUser(101);
  });
});

describe('listing wizard cover follows photo order', () => {
  it('changes the cover on drop and preserves upload evidence through refresh', async () => {
    act(() => {
      store().addMedia(photo('front'));
      store().addMedia(photo('kitchen'));
      store().reorderMedia(1, 0);
    });
    await act(async () => {
      await hydrateListingWizardForUser(101);
    });
    expect(store().mainMediaId).toBe('kitchen');
    expect(store().media).toMatchObject([
      { id: 'kitchen', displayOrder: 0, isPrimary: true, uploadToken: 'confirmed-kitchen' },
      { id: 'front', displayOrder: 1, isPrimary: false, uploadToken: 'confirmed-front' },
    ]);
  });

  it('bulk reorder replaces the old cover and removal selects the next photo', () => {
    act(() => {
      store().setMedia([photo('front'), photo('kitchen'), photo('garden')]);
      const [front, kitchen, garden] = store().media;
      store().setMedia([garden, front, kitchen]);
    });
    expect(store().mainMediaId).toBe('garden');
    act(() => store().removeMedia(0));
    expect(store().mainMediaId).toBe('front');
    expect(store().media.filter(item => item.isPrimary)).toHaveLength(1);
  });

  it('never selects video, plans, failed or processing photos as the cover', () => {
    act(() =>
      store().setMedia([
        photo('video', { type: 'video', isPrimary: true }),
        photo('plan', { type: 'floorplan' }),
        photo('processing', { processingStatus: 'processing' }),
        photo('failed', { processingStatus: 'failed' }),
        photo('front'),
      ]),
    );
    expect(store().mainMediaId).toBe('front');
    act(() => store().updateMedia(2, { processingStatus: 'completed' }));
    expect(store().mainMediaId).toBe('processing');
  });

  it('clears the cover when the last completed photo is removed', () => {
    act(() => {
      store().setMedia([photo('front'), photo('video', { type: 'video' })]);
      store().removeMedia(0);
    });
    expect(store().mainMediaId).toBeUndefined();
    expect(store().media.every(item => !item.isPrimary)).toBe(true);
    expect(store().canAdvanceFromStep(7)).toBe(false);
  });

  it('keeps saved-listing cover selection consistent by moving it to the front', () => {
    act(() => {
      store().setMedia([photo('front'), photo('kitchen')]);
      store().setMainMedia('kitchen');
    });
    expect(store().media[0].id).toBe('kitchen');
    expect(store().mainMediaId).toBe('kitchen');
  });

  it('normalizes stale cover flags in a same-owner device draft', async () => {
    localStorage.setItem(
      'listing-wizard-storage',
      JSON.stringify({
        state: {
          persistedOwnerId: 101,
          media: [photo('front'), photo('kitchen', { isPrimary: true })],
          mainMediaId: 'kitchen',
        },
        version: 0,
      }),
    );
    await act(async () => {
      await hydrateListingWizardForUser(101);
    });
    expect(store().mainMediaId).toBe('front');
    expect(store().media.map(item => item.isPrimary)).toEqual([true, false]);
  });
});
