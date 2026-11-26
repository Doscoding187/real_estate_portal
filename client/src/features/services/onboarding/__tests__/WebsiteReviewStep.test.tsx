import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockStatus = vi.fn();
const mockProfile = vi.fn();
const mockSubmit = vi.fn();
const mockInvalidate = vi.fn(async () => undefined);

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      servicesEngine: {
        myProviderProfile: { invalidate: mockInvalidate },
        myOnboardingStatus: { invalidate: mockInvalidate },
      },
    }),
    servicesEngine: {
      myProviderProfile: { useQuery: () => ({ data: mockProfile(), isLoading: false, error: null }) },
      getProviderPublicProfile: { useQuery: () => ({ data: null, isLoading: false, error: null }) },
      myOnboardingStatus: { useQuery: () => ({ data: mockStatus(), isLoading: false, error: null }) },
      upsertProviderProfile: { useMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }) },
      saveProviderProject: { useMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }) },
      deleteProviderProject: { useMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }) },
      requestProviderCredentialUpload: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }) },
      addProviderCredential: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }) },
      submitProviderWebsite: {
        useMutation: ({ onSuccess }: { onSuccess: () => void }) => ({
          mutate: () => { mockSubmit(); void onSuccess(); },
          isPending: false,
          error: null,
        }),
      },
    },
    upload: { presign: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }) } },
  },
}));

import { WebsiteReviewStep } from '../steps/WebsiteReviewStep';
import { initialOnboardingState } from '../useOnboardingReducer';

const ready = {
  completionPercent: 100,
  readyForSubmission: true,
  blockers: [],
  items: [{ id: 'identity', label: 'Business identity', complete: true }],
  optionalEnrichment: ['Add completed projects and project photographs.'],
};

describe('WebsiteReviewStep', () => {
  beforeEach(() => {
    mockStatus.mockReset();
    mockProfile.mockReset();
    mockSubmit.mockReset();
    mockStatus.mockReturnValue({ readiness: ready });
    mockProfile.mockReturnValue({
      providerId: 11,
      companyName: 'Example Plumbing',
      logoUrl: null,
      headline: 'Plumbing and maintenance',
      bio: 'Professional plumbing repairs and installations for local homes.',
      services: [],
      locations: [],
      projects: [],
      credentials: [],
      websiteTemplate: 'corporate_brand',
      submissionStatus: 'draft',
    });
  });

  it('submits a genuinely ready website for review', async () => {
    const liveDraftState = {
      ...initialOnboardingState,
      companyName: 'Unpublished Acme',
      headline: 'Repairs for local homes',
      bio: 'We provide careful plumbing repairs and maintenance for local homes.',
      dirtySteps: { 1: true },
    };
    render(<WebsiteReviewStep state={liveDraftState} onBack={vi.fn()} />);

    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /preview it, then send it for review/i })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Business website preview' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /submit website for review/i }));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/stays private until an authorized reviewer approves publication/i)).toBeInTheDocument();
  });

  it('does not block on optional project or credential enrichment', () => {
    mockStatus.mockReturnValue({ readiness: ready });
    render(<WebsiteReviewStep state={initialOnboardingState} onBack={vi.fn()} />);

    expect(screen.getByRole('button', { name: /submit website for review/i })).toBeEnabled();
    expect(screen.getByRole('heading', { name: 'Professional Business' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /personal brand|corporate brand|project showcase/i })).not.toBeInTheDocument();
    expect(screen.getByText(/projects and credentials can strengthen it, but they are optional/i)).toBeInTheDocument();
  });

  it('keeps submission disabled when required persisted readiness is incomplete', () => {
    mockStatus.mockReturnValue({ readiness: { ...ready, completionPercent: 86, readyForSubmission: false, blockers: ['A useful service description'] } });
    render(<WebsiteReviewStep state={initialOnboardingState} onBack={vi.fn()} />);

    expect(screen.getByRole('button', { name: /submit website for review/i })).toBeDisabled();
    expect(screen.getByText(/a useful service description/i)).toBeInTheDocument();
  });
});
