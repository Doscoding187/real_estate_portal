import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hydrateListingWizardForUser, useListingWizardStore } from '@/hooks/useListingWizard';
const api = vi.hoisted(() => ({ reserve: vi.fn(), confirm: vi.fn() }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    listing: {
      uploadMedia: { useMutation: () => ({ mutateAsync: api.reserve }) },
      confirmMediaUpload: { useMutation: () => ({ mutateAsync: api.confirm }) },
    },
  },
}));
vi.mock('@/components/media/SortableMediaGrid', () => ({ SortableMediaGrid: () => null }));
vi.mock('@/components/media/UploadProgressBar', () => ({ UploadProgressList: () => null }));
import MediaUploadStep from './MediaUploadStep';
const reservation = {
  mediaId: 'uploads/fixture.png',
  uploadUrl: '/fixture-put',
  publicUrl: '/fixture-object',
  uploadToken: 'reserved-token',
};
beforeEach(async () => {
  localStorage.clear();
  await hydrateListingWizardForUser(null);
  await hydrateListingWizardForUser(101);
  api.reserve.mockResolvedValue(reservation);
  api.confirm.mockResolvedValue({ uploadToken: 'confirmed-token', fileSize: 4 });
});
describe('media ownership orchestration (mocked transport)', () => {
  it('binds reservation to the saved draft and adds only the server-confirmed token after a PUT', async () => {
    const put = vi.fn();
    class MockXHR extends EventTarget {
      upload = new EventTarget();
      status = 200;
      open = put;
      setRequestHeader = vi.fn();
      send() {
        this.dispatchEvent(new Event('load'));
      }
    }
    vi.stubGlobal('XMLHttpRequest', MockXHR);
    try {
      const view = render(<MediaUploadStep listingId={88} />);
      fireEvent.change(view.container.querySelector('input[type=file]')!, {
        target: { files: [new File(['png!'], 'fixture.png', { type: 'image/png' })] },
      });
      await waitFor(() => expect(useListingWizardStore.getState().media).toHaveLength(1));
      expect(api.reserve).toHaveBeenCalledWith({
        listingId: 88,
        type: 'image',
        filename: 'fixture.png',
        contentType: 'image/png',
      });
      expect(put).toHaveBeenCalledWith('PUT', '/fixture-put');
      expect(api.confirm).toHaveBeenCalledWith({ uploadToken: 'reserved-token' });
      expect(useListingWizardStore.getState().media[0]).toMatchObject({
        id: reservation.mediaId,
        uploadToken: 'confirmed-token',
        processingStatus: 'completed',
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('ignores a late reservation after unmount/account switch', async () => {
    let resolve!: (value: typeof reservation) => void;
    api.reserve.mockImplementation(
      () =>
        new Promise(r => {
          resolve = r;
        }),
    );
    const view = render(<MediaUploadStep listingId={88} />);
    fireEvent.change(view.container.querySelector('input[type=file]')!, {
      target: { files: [new File(['png!'], 'fixture.png', { type: 'image/png' })] },
    });
    expect(api.reserve).toHaveBeenCalledOnce();
    view.unmount();
    await act(async () => {
      await hydrateListingWizardForUser(202);
      resolve(reservation);
    });
    expect(api.confirm).not.toHaveBeenCalled();
    expect(useListingWizardStore.getState()).toMatchObject({ persistedOwnerId: 202, media: [] });
  });
});
