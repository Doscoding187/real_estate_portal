import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LandReviewWorkspace, { plainReviewError } from './LandReviewWorkspace';

const harness = vi.hoisted(() => ({ state: 'pending' }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({ land: { accessEvidence: { fetch: vi.fn() } } }),
    land: {
      reviewerQueue: { useQuery: () => ({ data: [{ listingId: 4, title: 'Stand', classification: 'serviced', submissionSequence: 1, state: harness.state }], refetch: vi.fn() }) },
      reviewerWorkspace: {
        useQuery: () => ({
          data: {
            listing: { title: 'Stand', city: 'Randburg', province: 'Gauteng' },
            asset: { classification: 'serviced' },
            reviewCase: { state: harness.state, submissionSequence: 1 },
            readiness: { blockers: { publication: [] } },
            claims: [], assertions: [], evidence: [], reviewEvents: [], parcels: [],
          },
          refetch: vi.fn(),
        }),
      },
      review: { useMutation: () => ({ mutateAsync: vi.fn() }) },
    },
  },
}));

const buttons = () => screen.getAllByRole('button').map(b => b.textContent);

describe('Land review decision actions', () => {
  const open = (state: string) => {
    harness.state = state;
    render(<LandReviewWorkspace />);
    fireEvent.click(screen.getAllByRole('button')[0]);
  };
  it('offers only Start review while pending', () => {
    open('pending');
    expect(buttons()).toContain('Start review');
    expect(buttons()).not.toContain('Approve Land submission');
    expect(buttons()).not.toContain('Suspend');
  });
  it('offers review decisions while reviewing', () => {
    open('reviewing');
    expect(buttons()).toEqual(expect.arrayContaining(['Request changes', 'Reject', 'Approve Land submission', 'Suspend']));
    expect(buttons()).not.toContain('Start review');
  });
  it('offers only Suspend once approved', () => {
    open('approved');
    expect(buttons()).toContain('Suspend');
    expect(buttons()).not.toContain('Approve Land submission');
    expect(buttons()).not.toContain('Start review');
  });
  it('maps raw server transition errors to plain English', () => {
    expect(plainReviewError(new Error('Land review cannot approve from pending.'))).toBe('You cannot approve this submission while it is pending. Refresh the page to see the current state.');
  });
});
