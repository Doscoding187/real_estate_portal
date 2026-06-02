import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  setLocation: vi.fn(),
  refetch: vi.fn(),
  deleteMutate: vi.fn(),
  canonicalDraft: {} as any,
  buildCanonicalDraft: () => ({
    id: 42,
    draftName: 'Canonical Draft Card',
    lastModified: '2026-05-23T10:00:00.000Z',
    progress: 10,
    currentStep: 1,
    draftMeta: {
      workflowId: 'residential_sale',
      currentStepId: 'review_publish',
      currentStep: 9,
      progress: 100,
      totalSteps: 9,
      stepLabel: 'Review & Publish',
      source: 'workflowId',
    },
    draftData: {
      developmentData: {
        location: {
          address: '10 Canonical Road',
          city: 'Cape Town',
          province: 'Western Cape',
        },
      },
      stepData: {
        unit_types: {
          unitTypes: [
            { id: 'unit-a', name: 'Type A' },
            { id: 'unit-b', name: 'Type B' },
          ],
        },
      },
      unitTypes: [{ id: 'legacy-root-unit', name: 'Legacy Root Unit' }],
    },
  }),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/developer/drafts', mocks.setLocation],
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    developer: {
      getDrafts: {
        useQuery: () => ({
          data: [mocks.canonicalDraft],
          isLoading: false,
          refetch: mocks.refetch,
        }),
      },
      deleteDraft: {
        useMutation: () => ({
          mutate: mocks.deleteMutate,
          isPending: false,
        }),
      },
    },
  },
}));

import MyDrafts from './MyDrafts';

describe('MyDrafts', () => {
  beforeEach(() => {
    mocks.setLocation.mockClear();
    mocks.refetch.mockClear();
    mocks.deleteMutate.mockClear();
    mocks.canonicalDraft = mocks.buildCanonicalDraft();
  });

  it('renders canonical draft metadata from draftMeta and nested draftData', () => {
    render(<MyDrafts />);

    expect(screen.getByText('Canonical Draft Card')).toBeInTheDocument();
    expect(screen.getByText(/Review & Publish\s+·\s+100%/)).toBeInTheDocument();
    expect(screen.getAllByText('Cape Town, Western Cape')).toHaveLength(2);
    expect(screen.getByText('2 unit type(s)')).toBeInTheDocument();
    expect(screen.queryByText('1 unit type(s)')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /resume/i }));
    expect(mocks.setLocation).toHaveBeenCalledWith('/developer/create-development?draftId=42');
  });

  it('derives canonical progress from nested draftData when draftMeta is unavailable', async () => {
    mocks.canonicalDraft.draftMeta = undefined as any;
    mocks.canonicalDraft.progress = 17;
    mocks.canonicalDraft.currentStep = 1;
    (mocks.canonicalDraft.draftData as any).currentStepId = 'unit_types';

    render(<MyDrafts />);

    expect(screen.getByText(/Unit Types\s+·\s+89%/)).toBeInTheDocument();
    expect(screen.queryByText(/17%/)).not.toBeInTheDocument();
  });

  it('displays normalized canonical progress for malformed saved workflow state', async () => {
    mocks.canonicalDraft.draftMeta = undefined as any;
    mocks.canonicalDraft.progress = 17;
    mocks.canonicalDraft.currentStep = 1;
    Object.assign(mocks.canonicalDraft.draftData as any, {
      workflowId: ' residential_sale ',
      currentStepId: 'phase-10',
      completedSteps: ['configuration', 'identity_market', 'configuration', 'not_real'],
    });

    render(<MyDrafts />);

    expect(screen.getByText(/Location\s+·\s+33%/)).toBeInTheDocument();
    expect(screen.queryByText(/17%/)).not.toBeInTheDocument();
  });
});
