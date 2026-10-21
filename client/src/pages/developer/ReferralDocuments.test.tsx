import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReferralDocuments from './ReferralDocuments';

const {
  mockListDocumentDeliveriesQuery,
  mockDownloadMutation,
  mockAcknowledgeMutation,
  mockInvalidate,
  mockDownloadPrivateDocument,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockListDocumentDeliveriesQuery: vi.fn(),
  mockDownloadMutation: vi.fn(),
  mockAcknowledgeMutation: vi.fn(),
  mockInvalidate: vi.fn(),
  mockDownloadPrivateDocument: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      distribution: {
        developer: {
          listDocumentDeliveries: { invalidate: mockInvalidate },
        },
      },
    }),
    distribution: {
      developer: {
        listDocumentDeliveries: {
          useQuery: (...args: unknown[]) => mockListDocumentDeliveriesQuery(...args),
        },
        downloadDocumentDelivery: {
          useMutation: () => ({ mutateAsync: mockDownloadMutation }),
        },
        acknowledgeDocumentDelivery: {
          useMutation: (options?: { onSuccess?: () => Promise<void> | void }) => ({
            mutateAsync: async (input: unknown) => {
              const result = await mockAcknowledgeMutation(input);
              await options?.onSuccess?.();
              return result;
            },
          }),
        },
      },
    },
  },
}));

vi.mock('@/lib/privateDocumentUpload', () => ({
  downloadPrivateDocument: (...args: unknown[]) => mockDownloadPrivateDocument(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

const awaitingDelivery = {
  deliveryId: 11,
  deliveryVersion: 2,
  dealId: 501,
  dealRef: 'DEAL-501',
  buyerName: 'Thandi Buyer',
  developmentId: 77,
  developmentName: 'Ocean View Estate',
  templateId: 31,
  documentCode: 'id_document',
  documentLabel: 'ID document',
  fileName: 'id-document.pdf',
  deliveredAt: '2026-10-20T09:00:00.000Z',
  deliveredBy: { userId: 5, name: 'Nomsa Manager' },
  acknowledgedAt: null,
  acknowledgedBy: null,
  acknowledgementNote: null,
};

const acknowledgedDelivery = {
  deliveryId: 12,
  deliveryVersion: 1,
  dealId: 502,
  dealRef: 'DEAL-502',
  buyerName: null,
  developmentId: 78,
  developmentName: 'Hillcrest Gardens',
  templateId: 32,
  documentCode: 'proof_of_address',
  documentLabel: 'Proof of address',
  fileName: 'proof-of-address.pdf',
  deliveredAt: '2026-10-19T09:00:00.000Z',
  deliveredBy: { userId: 5, name: 'Nomsa Manager' },
  acknowledgedAt: '2026-10-19T12:00:00.000Z',
  acknowledgedBy: { userId: 9, name: 'Sipho Developer' },
  acknowledgementNote: 'Received by the sales team',
};

function setDeliveries(deliveries: unknown[]) {
  mockListDocumentDeliveriesQuery.mockReturnValue({
    isLoading: false,
    error: null,
    data: {
      deliveries,
      awaitingAcknowledgementCount: deliveries.filter(
        (delivery: any) => !delivery.acknowledgedAt,
      ).length,
      acknowledgedCount: deliveries.filter((delivery: any) => Boolean(delivery.acknowledgedAt))
        .length,
    },
  });
}

describe('ReferralDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDeliveries([awaitingDelivery, acknowledgedDelivery]);
    mockDownloadMutation.mockResolvedValue({
      deliveryId: 11,
      fileName: 'id-document.pdf',
      mimeType: 'application/pdf',
      byteSize: 12,
      base64Content: 'UERG',
    });
    mockAcknowledgeMutation.mockResolvedValue({
      deliveryId: 11,
      acknowledgedAt: '2026-10-21T08:00:00.000Z',
      alreadyAcknowledged: false,
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('shows the delivery totals and the recorded delivery state', () => {
    render(<ReferralDocuments />);

    expect(screen.getByText('Referral documents')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
    expect(screen.getAllByText('Awaiting acknowledgement').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Acknowledged').length).toBeGreaterThan(0);
    expect(screen.getByText('Delivery inbox')).toBeInTheDocument();
    expect(screen.getByText('ID document')).toBeInTheDocument();
    expect(screen.getByText('Proof of address')).toBeInTheDocument();
    expect(screen.getByText(/Ocean View Estate/)).toBeInTheDocument();
    expect(screen.getByText(/Buyer: Thandi Buyer/)).toBeInTheDocument();
    expect(screen.getByText('File: id-document.pdf')).toBeInTheDocument();
    expect(screen.getByText('Note: Received by the sales team')).toBeInTheDocument();
  });

  it('filters the inbox by acknowledgement state', () => {
    render(<ReferralDocuments />);

    fireEvent.click(screen.getByRole('button', { name: 'Acknowledged' }));
    expect(screen.queryByText('ID document')).not.toBeInTheDocument();
    expect(screen.getByText('Proof of address')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Awaiting acknowledgement' }));
    expect(screen.getByText('ID document')).toBeInTheDocument();
    expect(screen.queryByText('Proof of address')).not.toBeInTheDocument();
  });

  it('downloads the delivered file through the private document helper', async () => {
    render(<ReferralDocuments />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Download' })[0]);

    await waitFor(() => {
      expect(mockDownloadMutation).toHaveBeenCalledWith({ deliveryId: 11 });
    });
    expect(mockDownloadPrivateDocument).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: 'id-document.pdf' }),
    );
  });

  it('acknowledges receipt only after the organisation confirms', async () => {
    render(<ReferralDocuments />);

    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge receipt' }));

    await waitFor(() => {
      expect(mockAcknowledgeMutation).toHaveBeenCalledWith({ deliveryId: 11 });
    });
    expect(mockInvalidate).toHaveBeenCalled();
    expect(mockToastSuccess).toHaveBeenCalledWith('Document receipt acknowledged.');
  });

  it('does not acknowledge when the organisation declines the confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ReferralDocuments />);

    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge receipt' }));

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
    });
    expect(mockAcknowledgeMutation).not.toHaveBeenCalled();
  });

  it('shows the empty state when nothing has been delivered', () => {
    setDeliveries([]);
    render(<ReferralDocuments />);

    expect(
      screen.getByText('No deal documents have been delivered to your organisation yet.'),
    ).toBeInTheDocument();
  });
});
