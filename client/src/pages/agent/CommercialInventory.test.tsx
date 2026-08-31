import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { inventoryQuery, mutation, mutate, mutateAsync, refetch } = vi.hoisted(() => ({
  inventoryQuery: vi.fn(),
  mutation: vi.fn(),
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    commercial: {
      myInventory: { useQuery: (...args: unknown[]) => inventoryQuery(...args) },
      reconfirmAvailability: { useMutation: (...args: unknown[]) => mutation(...args) },
      setAvailabilityStatus: { useMutation: (...args: unknown[]) => mutation(...args) },
      attachMarketingMedia: { useMutation: (...args: unknown[]) => mutation(...args) },
      submit: { useMutation: (...args: unknown[]) => mutation(...args) },
    },
    listing: {
      uploadMedia: { useMutation: (...args: unknown[]) => mutation(...args) },
      confirmMediaUpload: { useMutation: (...args: unknown[]) => mutation(...args) },
    },
  },
}));

vi.mock('@/components/agent/AgentAppShell', () => ({
  AgentAppShell: ({ children }: PropsWithChildren) => <>{children}</>,
}));

vi.mock('wouter', () => ({
  Link: ({ children, href }: { children: PropsWithChildren['children']; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import CommercialInventory from './CommercialInventory';

const inventoryItem = {
  listing: {
    id: 71,
    title: 'Flexible warehouse in Midrand',
    slug: 'flexible-warehouse-midrand',
    status: 'published',
    approvalStatus: 'approved',
    publishedAt: '2026-08-01 10:00:00',
  },
  asset: { id: 51, name: 'Logistics Park', cityId: 11, suburbId: 12 },
  space: {
    id: 41,
    useType: 'industrial_logistics',
    kind: 'warehouse',
    identifier: 'Warehouse 4',
    rentableAreaM2: '2500',
  },
  availability: {
    id: 31,
    state: 'needs_reconfirmation',
    label: 'Availability needs reconfirmation',
    source: 'Asset manager',
    confirmationSource: 'asset_manager',
    confirmationSourceLabel: null,
    confirmedAt: '2026-07-01 09:00:00',
    occupationDate: null,
    reconfirmationDueAt: '2026-08-01 09:00:00',
    isPubliclyDiscoverable: false,
  },
};

const draftInventoryItem = {
  ...inventoryItem,
  listing: {
    ...inventoryItem.listing,
    id: 72,
    title: 'Retail unit ready for launch',
    status: 'draft',
    approvalStatus: 'pending',
  },
  marketing: { completedMediaCount: 1, completedImageCount: 1 },
};

describe('CommercialInventory', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/agent/commercial');
    inventoryQuery.mockReset();
    mutation.mockReset();
    mutate.mockReset();
    mutateAsync.mockReset();
    refetch.mockReset();
    inventoryQuery.mockReturnValue({
      data: [inventoryItem],
      isLoading: false,
      error: null,
      refetch,
    });
    mutation.mockReturnValue({ mutate, mutateAsync, isPending: false, error: null });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows stale inventory as non-public and restores its governed source when reconfirming', () => {
    render(<CommercialInventory />);

    expect(screen.getByText('Not publicly discoverable')).toBeInTheDocument();
    expect(screen.getByText('Availability needs reconfirmation')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create vacancy' })).toHaveAttribute(
      'href',
      '/agent/commercial/create',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reconfirm availability' }));

    expect(screen.getByLabelText('Confirmation source')).toHaveValue('asset_manager');
    expect(screen.queryByLabelText('Confirmation source details')).not.toBeInTheDocument();
  });

  it('requires a described other source and submits a fresh canonical availability confirmation', () => {
    render(<CommercialInventory />);
    fireEvent.click(screen.getByRole('button', { name: 'Reconfirm availability' }));
    fireEvent.change(screen.getByLabelText('Confirmation source'), {
      target: { value: 'other' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save fresh confirmation' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Describe the source of the availability confirmation.',
    );

    fireEvent.change(screen.getByLabelText('Confirmation source details'), {
      target: { value: 'Property manager on site' },
    });
    fireEvent.change(screen.getByLabelText('Confirmed at'), {
      target: { value: '2026-08-29T10:00' },
    });
    fireEvent.change(screen.getByLabelText('Reconfirm by'), {
      target: { value: '2026-09-28T10:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save fresh confirmation' }));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        commercialAvailabilityId: 31,
        availabilityState: 'available_confirmed',
        occupationDate: null,
        confirmationSource: 'other',
        confirmationSourceLabel: 'Property manager on site',
        lastConfirmedAt: expect.stringContaining('2026-08-29T'),
        reconfirmationDueAt: expect.stringContaining('2026-09-28T'),
      }),
    );
  });

  it('removes a vacancy from public discovery through a canonical non-public status transition', () => {
    render(<CommercialInventory />);

    fireEvent.click(screen.getByRole('button', { name: 'Mark under offer' }));

    expect(mutate).toHaveBeenCalledWith({
      commercialAvailabilityId: 31,
      availabilityState: 'under_offer',
    });
  });

  it('lets an author resume a saved commercial draft and submit it through review', () => {
    inventoryQuery.mockReturnValue({
      data: [draftInventoryItem],
      isLoading: false,
      error: null,
      refetch,
    });
    render(<CommercialInventory />);

    expect(screen.getByText('1 confirmed file (1 image)')).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Submit for review' });
    expect(submit).toBeEnabled();

    fireEvent.click(submit);
    expect(mutate).toHaveBeenCalledWith({ listingId: 72 });
  });

  it('uploads resumed-draft marketing only through the confirmed Listing-media flow', async () => {
    inventoryQuery.mockReturnValue({
      data: [{ ...draftInventoryItem, marketing: { completedMediaCount: 0, completedImageCount: 0 } }],
      isLoading: false,
      error: null,
      refetch,
    });
    mutateAsync.mockImplementation((input: Record<string, unknown>) => {
      if ('type' in input) {
        return Promise.resolve({ uploadUrl: 'https://uploads.example.test/72', uploadToken: 'reserved' });
      }
      if (input.uploadToken === 'reserved') return Promise.resolve({ uploadToken: 'confirmed' });
      return Promise.resolve({ mediaId: 99 });
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    render(<CommercialInventory />);

    expect(screen.getByRole('button', { name: 'Submit for review' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Add marketing media to Retail unit ready for launch'), {
      target: { files: [new File(['image'], 'retail.jpg', { type: 'image/jpeg' })] },
    });

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({ listingId: 72, uploadToken: 'confirmed' }),
    );
    expect(mutateAsync).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        listingId: 72,
        type: 'image',
        filename: 'retail.jpg',
        contentType: 'image/jpeg',
      }),
    );
    expect(mutateAsync).toHaveBeenNthCalledWith(2, { uploadToken: 'reserved' });
    expect(refetch).toHaveBeenCalled();
  });
});
