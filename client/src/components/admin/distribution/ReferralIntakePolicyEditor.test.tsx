import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReferralIntakePolicyEditor } from './ReferralIntakePolicyEditor';

const { mockGetReferralIntakePolicyUseQuery, mockUseUtils, mockSaveDraftUseMutation } = vi.hoisted(
  () => {
    const invalidate = vi.fn();
    return {
      mockGetReferralIntakePolicyUseQuery: vi.fn(),
      mockUseUtils: vi.fn(() => ({
        distribution: {
          admin: {
            getReferralIntakePolicy: { invalidate },
            getProgramReadiness: { invalidate },
          },
        },
      })),
      mockSaveDraftUseMutation: vi.fn(() => ({
        mutateAsync: vi.fn(),
        isPending: false,
      })),
    };
  },
);

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => mockUseUtils(),
    distribution: {
      admin: {
        getReferralIntakePolicy: {
          useQuery: () => mockGetReferralIntakePolicyUseQuery(),
        },
        saveReferralIntakePolicyDraft: {
          useMutation: () => mockSaveDraftUseMutation(),
        },
        publishReferralIntakePolicy: {
          useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
        },
      },
    },
  },
}));

describe('ReferralIntakePolicyEditor workflow defaults', () => {
  it('starts a new policy draft with the default guided-process steps', () => {
    mockGetReferralIntakePolicyUseQuery.mockReturnValue({
      isLoading: false,
      data: { activeRelease: null, draftRelease: null },
    });

    render(<ReferralIntakePolicyEditor developmentId={42} onChanged={() => {}} />);

    const titles = screen
      .getAllByLabelText<HTMLInputElement>('Step title')
      .map(input => input.value);

    expect(titles).toEqual([
      'Referral received',
      'Qualification',
      'Viewing arranged',
      'Application submitted',
      'Outcome recorded',
      'Payout recorded',
    ]);
    expect(screen.getByText(/New drafts start with default steps/)).toBeInTheDocument();
  });

  it('keeps a saved step configuration instead of replacing it with defaults', () => {
    mockGetReferralIntakePolicyUseQuery.mockReturnValue({
      isLoading: false,
      data: {
        activeRelease: null,
        draftRelease: {
          id: 7,
          updatedAt: '2026-10-19T08:00:00.000Z',
          configurationDigest: 'a'.repeat(64),
          configuration: {
            workflowSteps: [
              {
                key: 'custom_step',
                title: 'Custom developer step',
                partnerInstructions: 'Follow the custom developer process.',
                ownerRole: 'Developer team',
                isBlocking: true,
              },
            ],
          },
        },
      },
    });

    render(<ReferralIntakePolicyEditor developmentId={42} onChanged={() => {}} />);

    expect(screen.getByDisplayValue('Custom developer step')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Referral received')).not.toBeInTheDocument();
  });

  it('restores the default steps when an administrator has removed them all', () => {
    mockGetReferralIntakePolicyUseQuery.mockReturnValue({
      isLoading: false,
      data: { activeRelease: null, draftRelease: null },
    });

    render(<ReferralIntakePolicyEditor developmentId={42} onChanged={() => {}} />);

    while (screen.queryAllByRole('button', { name: 'Remove process step' }).length > 0) {
      fireEvent.click(screen.getAllByRole('button', { name: 'Remove process step' })[0]!);
    }
    expect(screen.queryAllByLabelText('Step title')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: /Use default steps/ }));

    expect(screen.getAllByLabelText('Step title')).toHaveLength(6);
  });
});
