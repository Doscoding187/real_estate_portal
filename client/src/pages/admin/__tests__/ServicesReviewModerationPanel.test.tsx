import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const mockModerateMutate = vi.fn();
const mockResolveMutate = vi.fn();

const reviewQueue = {
  entries: [
    {
      id: 77,
      providerId: 20,
      companyName: 'Sandton Repairs',
      reviewerUserId: 9,
      reviewerName: 'Thandi Mokoena',
      reviewerEmail: 'thandi@example.co.za',
      rating: 5,
      title: 'Excellent work',
      content: 'Fixed the geyser quickly.',
      isVerified: true,
      isPublished: false,
      moderationStatus: 'pending',
      moderationNote: null,
      moderatedAt: null,
      createdAt: '2026-10-20 10:00:00',
      openReportCount: 0,
    },
  ],
  pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
  counts: { pending: 1, published: 3, rejected: 0 },
};

const reportQueue = {
  entries: [
    {
      id: 44,
      reviewId: 77,
      providerId: 20,
      companyName: 'Sandton Repairs',
      reporterUserId: 12,
      reporterName: 'Sipho Dlamini',
      reporterEmail: 'sipho@example.co.za',
      reason: 'spam',
      detail: 'Looks like an advertisement.',
      status: 'pending',
      resolutionNote: null,
      resolvedByUserId: null,
      resolvedAt: null,
      createdAt: '2026-10-21 09:00:00',
      review: {
        rating: 5,
        title: 'Excellent work',
        content: 'Fixed the geyser quickly.',
        moderationStatus: 'published',
        isPublished: true,
      },
    },
  ],
  pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
  counts: { pending: 1, resolved: 0, dismissed: 0 },
};

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      servicesEngine: {
        listProviderReviewModerationQueue: { invalidate: vi.fn() },
        listProviderReviewReportQueue: { invalidate: vi.fn() },
        getProviderReviews: { invalidate: vi.fn() },
        getProviderPublicProfile: { invalidate: vi.fn() },
      },
    }),
    servicesEngine: {
      listProviderReviewModerationQueue: {
        useQuery: () => ({ data: reviewQueue, isLoading: false, error: null }),
      },
      listProviderReviewReportQueue: {
        useQuery: () => ({ data: reportQueue, isLoading: false, error: null }),
      },
      reviewProviderReview: {
        useMutation: () => ({ mutate: mockModerateMutate, isPending: false, error: null }),
      },
      resolveProviderReviewReport: {
        useMutation: () => ({ mutate: mockResolveMutate, isPending: false, error: null }),
      },
    },
  },
}));

import ServicesReviewModerationPanel from '../ServicesReviewModerationPanel';

describe('Services customer review moderation', () => {
  beforeEach(() => {
    mockModerateMutate.mockReset();
    mockResolveMutate.mockReset();
  });

  it('shows pending reviews with the evidence a reviewer needs', () => {
    render(<ServicesReviewModerationPanel />);

    expect(screen.getByText('Sandton Repairs')).toBeInTheDocument();
    expect(screen.getByText(/Thandi Mokoena/)).toBeInTheDocument();
    expect(screen.getByText('Excellent work')).toBeInTheDocument();
    expect(screen.getByText('Fixed the geyser quickly.')).toBeInTheDocument();
    expect(screen.getByText('Verified request')).toBeInTheDocument();
  });

  it('approves a pending review through the moderation procedure', () => {
    render(<ServicesReviewModerationPanel />);

    fireEvent.change(screen.getByLabelText('Moderation note for review 77'), {
      target: { value: 'Request confirmed as completed.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(mockModerateMutate).toHaveBeenCalledWith({
      reviewId: 77,
      decision: 'approve',
      notes: 'Request confirmed as completed.',
    });
  });

  it('triages a report and can reject the reported review', () => {
    render(<ServicesReviewModerationPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Reports' }));

    expect(screen.getByText('Spam or advertising')).toBeInTheDocument();
    expect(screen.getByText('Looks like an advertisement.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }));
    expect(mockResolveMutate).toHaveBeenCalledWith({
      reportId: 44,
      decision: 'resolve',
      resolutionNote: undefined,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reject review' }));
    expect(mockModerateMutate).toHaveBeenCalledWith({
      reviewId: 77,
      decision: 'reject',
      notes: 'Rejected from review report #44',
    });
  });
});
