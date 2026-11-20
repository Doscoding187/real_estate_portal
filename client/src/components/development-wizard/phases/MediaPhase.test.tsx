import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  user: { id: 1, role: 'property_developer' } as { id: number; role: string },
  publisher: null as null | { mode: string },
  saved: [] as Array<{ step: string; data: any }>,
  stepData: {} as Record<string, any>,
  presign: vi.fn(),
  reserve: vi.fn(),
  confirm: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/_core/hooks/useAuth', () => ({ useAuth: () => ({ user: h.user }) }));
vi.mock('@/hooks/usePublisherContext', () => ({
  usePublisherContext: () => ({ context: h.publisher }),
}));
vi.mock('sonner', () => ({ toast: { error: h.toastError, success: vi.fn() } }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    developer: {
      reserveMediaUpload: { useMutation: () => ({ mutateAsync: h.reserve }) },
      confirmMediaUpload: { useMutation: () => ({ mutateAsync: h.confirm }) },
    },
    upload: { presign: { useMutation: () => ({ mutateAsync: h.presign }) } },
  },
}));
vi.mock('@/hooks/useDevelopmentWizard', () => {
  const state = () => ({
    stepData: h.stepData,
    editingId: null,
    stepErrors: {},
    currentStepId: 'development_media',
    getWizardData: () => ({}),
    saveWorkflowStepData: (step: string, data: any) => {
      h.saved.push({ step, data });
    },
  });
  const useDevelopmentWizard: any = (selector?: (s: any) => any) =>
    selector ? selector(state()) : state();
  return { useDevelopmentWizard };
});

import { MediaPhase } from './MediaPhase';

const pick = (slot: string, file: File) => {
  const input = screen.getByTestId(`media-input-${slot}`) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
};

describe('MediaPhase guided slots', () => {
  beforeEach(() => {
    h.user = { id: 1, role: 'property_developer' };
    h.publisher = null;
    h.saved = [];
    h.stepData = {};
    h.presign.mockReset().mockResolvedValue({ url: 'https://put.test/a', key: 'k1', publicUrl: 'https://cdn.test/a.jpg' });
    h.reserve.mockReset().mockResolvedValue({ uploadUrl: 'https://put.test/b', uploadReceipt: 'rcpt' });
    h.confirm.mockReset().mockResolvedValue({
      url: 'https://cdn.test/b.jpg',
      key: 'k2',
      fileSize: 10,
      uploadReceipt: 'rcpt',
    });
    h.toastError.mockReset();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
  });

  it('shows the five photo slots, video and four PDF document slots', () => {
    render(<MediaPhase />);
    for (const id of ['cover', 'entrance', 'amenities', 'streetscape', 'neighbourhood']) {
      expect(screen.getByTestId(`media-slot-${id}`)).toBeTruthy();
    }
    for (const id of ['brochure', 'site_plan', 'spec_sheet', 'price_list']) {
      expect(screen.getByTestId(`media-doc-${id}`)).toBeTruthy();
    }
    expect(screen.getByText('Required · 1')).toBeTruthy();
    expect(screen.getAllByText(/15 MB/).length).toBeGreaterThan(0);
  });

  it('uses the developer reserve/confirm path and stores the slot category and cover', async () => {
    render(<MediaPhase />);
    pick('cover', new File(['x'], 'cover.jpg', { type: 'image/jpeg' }));
    await waitFor(() => expect(h.saved.length).toBe(1));
    expect(h.reserve).toHaveBeenCalledWith(expect.objectContaining({ category: 'development_image' }));
    expect(h.confirm).toHaveBeenCalled();
    expect(h.presign).not.toHaveBeenCalled();
    const data = h.saved[0].data;
    expect(data.photos[0]).toMatchObject({ category: 'featured', isPrimary: true, url: 'https://cdn.test/b.jpg' });
    expect(data.heroImage.url).toBe('https://cdn.test/b.jpg');
  });

  it('uses the curated publisher presign path for a platform curator', async () => {
    h.user = { id: 2, role: 'super_admin' };
    h.publisher = { mode: 'platform_curator' };
    render(<MediaPhase />);
    pick('entrance', new File(['x'], 'gate.jpg', { type: 'image/jpeg' }));
    await waitFor(() => expect(h.saved.length).toBe(1));
    expect(h.presign).toHaveBeenCalled();
    expect(h.reserve).not.toHaveBeenCalled();
    expect(h.saved[0].data.photos[0]).toMatchObject({ category: 'outdoors', isPrimary: false });
  });

  it('rejects an .xlsx price list without uploading', async () => {
    render(<MediaPhase />);
    pick(
      'price_list',
      new File(['x'], 'prices.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );
    const alert = await screen.findByTestId('media-error-price_list');
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.textContent).toBe(
      'prices.xlsx: Spreadsheets stay private; export a PDF to show it to buyers.',
    );
    expect(h.reserve).not.toHaveBeenCalled();
    expect(h.saved).toHaveLength(0);
  });

  it('shows a persistent inline error for an oversize photo, cleared by the next good upload', async () => {
    render(<MediaPhase />);
    const big = new File(['x'], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(big, 'size', { value: 15 * 1024 * 1024 + 1 });
    pick('amenities', big);
    const alert = await screen.findByTestId('media-error-amenities');
    expect(alert.textContent).toBe('huge.jpg: too large (max 15 MB).');
    expect(h.reserve).not.toHaveBeenCalled();
    pick('amenities', new File(['x'], 'pool.jpg', { type: 'image/jpeg' }));
    await waitFor(() => expect(h.saved.length).toBe(1));
    await waitFor(() => expect(screen.queryByTestId('media-error-amenities')).toBeNull());
  });

  it('labels the buttons without a doubled plus', () => {
    render(<MediaPhase />);
    expect(screen.getAllByRole('button', { name: 'Add' }).length).toBe(5);
    expect(screen.queryByText(/\+ Add/)).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Upload PDF' }).length).toBe(4);
  });

  it('stores a PDF with its document type', async () => {
    render(<MediaPhase />);
    pick('spec_sheet', new File(['x'], 'spec.pdf', { type: 'application/pdf' }));
    await waitFor(() => expect(h.saved.length).toBe(1));
    expect(h.reserve).toHaveBeenCalledWith(expect.objectContaining({ category: 'development_document' }));
    expect(h.saved[0].data.documents[0]).toMatchObject({ documentType: 'spec_sheet', type: 'pdf' });
  });
});
