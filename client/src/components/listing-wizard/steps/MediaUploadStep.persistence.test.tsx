import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMutation as useQueryMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { hydrateListingWizardForUser, useListingWizardStore } from '@/hooks/useListingWizard';
const api = vi.hoisted(() => ({ reserve: vi.fn(), confirm: vi.fn(), realMutations: false }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    listing: {
      uploadMedia: {
        useMutation: (options?: { retry?: boolean }) => {
          const mutation = useQueryMutation(
            { mutationFn: (input: unknown) => api.reserve(input), ...options },
            queryClient,
          );
          return api.realMutations ? mutation : { mutateAsync: api.reserve };
        },
      },
      confirmMediaUpload: {
        useMutation: (options?: { retry?: boolean }) => {
          const mutation = useQueryMutation(
            { mutationFn: (input: unknown) => api.confirm(input), ...options },
            queryClient,
          );
          return api.realMutations ? mutation : { mutateAsync: api.confirm };
        },
      },
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
  api.realMutations = false;
  queryClient.clear();
  localStorage.clear();
  await hydrateListingWizardForUser(null);
  await hydrateListingWizardForUser(101);
  api.reserve.mockResolvedValue(reservation);
  api.confirm.mockResolvedValue({ uploadToken: 'confirmed-token', fileSize: 4 });
});
describe('media ownership orchestration (mocked transport)', () => {
  it.each(['reservation', 'confirmation'] as const)(
    'does not automatically replay a failed %s with the production QueryClient',
    async phase => {
      api.realMutations = true;
      if (phase === 'reservation')
        api.reserve.mockRejectedValue(new Error('Reservation result unknown'));
      else api.confirm.mockRejectedValue(new Error('Confirmation result unknown'));
      class MockXHR extends EventTarget {
        upload = new EventTarget();
        status = 200;
        open = vi.fn();
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
        await waitFor(() => expect(api.reserve).toHaveBeenCalled());
        // The inherited production retry delay is one second. Wait beyond it
        // so a suppressed duplicate is observable, rather than checking options.
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 1300));
        });
        expect(api.reserve).toHaveBeenCalledOnce();
        if (phase === 'reservation') expect(api.confirm).not.toHaveBeenCalled();
        else expect(api.confirm).toHaveBeenCalledOnce();
        expect(useListingWizardStore.getState().media).toHaveLength(0);
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );

  it('ignores a late confirmation after the draft changes but keeps uploads during its first save', async () => {
    let confirm!: (value: { uploadToken: string; fileSize: number }) => void;
    api.confirm.mockImplementation(
      () =>
        new Promise(r => {
          confirm = r;
        }),
    );
    class MockXHR extends EventTarget {
      upload = new EventTarget();
      status = 200;
      open = vi.fn();
      setRequestHeader = vi.fn();
      send() {
        this.dispatchEvent(new Event('load'));
      }
    }
    vi.stubGlobal('XMLHttpRequest', MockXHR);
    try {
      const view = render(<MediaUploadStep draftContextKey="owner-101:first-draft" />);
      const upload = () =>
        fireEvent.change(view.container.querySelector('input[type=file]')!, {
          target: { files: [new File(['png!'], 'fixture.png', { type: 'image/png' })] },
        });
      upload();
      await waitFor(() => expect(api.confirm).toHaveBeenCalledOnce());
      view.rerender(<MediaUploadStep listingId={88} draftContextKey="owner-101:first-draft" />);
      await act(async () => {
        confirm({ uploadToken: 'confirmed-first', fileSize: 4 });
      });
      expect(useListingWizardStore.getState().media).toHaveLength(1);
      upload();
      await waitFor(() => expect(api.confirm).toHaveBeenCalledTimes(2));
      view.rerender(<MediaUploadStep listingId={99} draftContextKey="owner-101:another-draft" />);
      act(() => useListingWizardStore.getState().reset());
      await act(async () => {
        confirm({ uploadToken: 'confirmed-late', fileSize: 4 });
      });
      expect(useListingWizardStore.getState().media).toHaveLength(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('ignores a late reservation when the same owner switches the listing binding', async () => {
    let resolve!: (value: typeof reservation) => void;
    api.reserve.mockImplementation(
      () =>
        new Promise(r => {
          resolve = r;
        }),
    );
    class MockXHR extends EventTarget {
      upload = new EventTarget();
      status = 200;
      open = vi.fn();
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
      expect(api.reserve).toHaveBeenCalledOnce();
      view.rerender(<MediaUploadStep listingId={99} />);
      await act(async () => {
        resolve(reservation);
      });
      expect(api.confirm).not.toHaveBeenCalled();
      expect(useListingWizardStore.getState().media).toHaveLength(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

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
