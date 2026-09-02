import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => {
  const wizardState = {
    currentPhase: 0,
    setPhase: vi.fn(),
    developmentType: null,
    developmentData: { name: '', transactionType: null },
    classification: null,
    overview: null,
    unitTypes: [],
    finalisation: null,
    reset: vi.fn(),
    saveDraft: vi.fn(),
    hydrateDevelopment: vi.fn(),
    initializeWorkflow: vi.fn(),
    setWorkflowStep: vi.fn(),
    setListingIdentity: vi.fn(),
    workflowId: null,
    currentStepId: null,
    goWorkflowNext: vi.fn(),
    goWorkflowBack: vi.fn(),
    stepErrors: {},
    listingIdentity: null,
  };

  const useDevelopmentWizardMock = Object.assign(
    vi.fn(() => wizardState),
    {
      persist: {
        hasHydrated: vi.fn(() => true),
        onFinishHydration: vi.fn(() => () => undefined),
        setOptions: vi.fn(),
        rehydrate: vi.fn().mockResolvedValue(undefined),
      },
      getState: vi.fn(() => wizardState),
    },
  );

  return {
    authUser: { id: 1, role: 'super_admin' },
    publisherContext: { cataloguePublisherId: 1109 },
    invalidate: vi.fn().mockResolvedValue(undefined),
    mutateAsync: vi.fn().mockResolvedValue({}),
    saveNow: vi.fn(),
    setLocation: vi.fn(),
    setListingIdentity: wizardState.setListingIdentity,
    useDevelopmentWizardMock,
    wizardState,
    getDevelopmentQueryResult: { current: null as unknown },
    editRefetch: vi.fn(),
    searchParams: { current: '' },
  };
});

vi.mock('@/hooks/useDevelopmentWizard', () => ({
  useDevelopmentWizard: testState.useDevelopmentWizardMock,
  DEVELOPMENT_WIZARD_STORAGE_KEY: 'development-wizard',
  PUBLISHER_DEVELOPMENT_WIZARD_STORAGE_KEY: 'publisher-development-wizard',
  persistManualDevelopmentDraft: vi.fn(),
}));

vi.mock('@/hooks/useAutoSave', () => ({
  useAutoSave: () => ({
    lastSaved: null,
    isSaving: false,
    error: null,
    saveNow: testState.saveNow,
  }),
}));

vi.mock('@/components/wizard/DraftManager', () => ({
  DraftManager: () => null,
}));

vi.mock('@/components/development-wizard/phases/DevelopmentTypePhase', () => ({
  DevelopmentTypePhase: () => <div>Development type setup</div>,
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({ user: testState.authUser }),
}));

vi.mock('@/hooks/usePublisherContext', () => ({
  usePublisherContext: () => ({ context: testState.publisherContext }),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      developer: {
        getDrafts: { invalidate: testState.invalidate },
        getDraft: { invalidate: testState.invalidate },
      },
      superAdminPublisher: {
        getDrafts: { invalidate: testState.invalidate },
        getDraft: { invalidate: testState.invalidate },
      },
    }),
    developer: {
      saveDraft: { useMutation: () => ({ isPending: false, mutateAsync: testState.mutateAsync }) },
      getDraft: { useQuery: () => ({ data: null, error: null, isLoading: false }) },
      getDevelopment: {
        useQuery: () =>
          typeof testState.getDevelopmentQueryResult.current === 'object' &&
          testState.getDevelopmentQueryResult.current !== null
            ? {
                refetch: testState.editRefetch,
                ...(testState.getDevelopmentQueryResult.current as Record<string, unknown>),
              }
            : { data: null, error: null, isLoading: false, refetch: testState.editRefetch },
      },
    },
    superAdminPublisher: {
      saveDraft: { useMutation: () => ({ isPending: false, mutateAsync: testState.mutateAsync }) },
      getDraft: { useQuery: () => ({ data: null, error: null, isLoading: false }) },
      getDevelopmentById: { useQuery: () => ({ data: null, error: null, isLoading: false }) },
    },
  },
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/developer/create-development', testState.setLocation],
  useSearch: () => testState.searchParams.current,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { DevelopmentWizard } from './DevelopmentWizard';

describe('DevelopmentWizard publisher context initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.authUser = { id: 1, role: 'super_admin' };
    testState.publisherContext = { cataloguePublisherId: 1109 };
    testState.wizardState.currentPhase = 0;
    testState.wizardState.developmentType = null;
    testState.wizardState.developmentData = { name: '', transactionType: null };
    testState.wizardState.workflowId = null;
    testState.wizardState.currentStepId = null;
    testState.wizardState.listingIdentity = null;
    testState.getDevelopmentQueryResult.current = null;
  });

  it('renders the curated create wizard with a platform-reference publisher context', async () => {
    render(<DevelopmentWizard />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Project Setup' })).toBeInTheDocument();
    });

    expect(screen.getByText('Development type setup')).toBeInTheDocument();
    expect(testState.setListingIdentity).toHaveBeenCalledWith({
      identityType: 'brand',
      cataloguePublisherId: 1109,
    });
  });

  it('preserves the normal registered-developer create wizard path', async () => {
    testState.authUser = { id: 2, role: 'property_developer' };
    testState.publisherContext = null;

    render(<DevelopmentWizard />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Project Setup' })).toBeInTheDocument();
    });

    expect(screen.getByText('Development type setup')).toBeInTheDocument();
    expect(testState.setListingIdentity).not.toHaveBeenCalled();
  });
});

describe('DevelopmentWizard edit-mode lifecycle truth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.authUser = { id: 2, role: 'property_developer' };
    testState.publisherContext = null;
    // The wizard parses mode params from window.location.search directly.
    window.history.replaceState({}, '', '/developer/create-development?id=77');
  });

  afterEach(() => {
    testState.getDevelopmentQueryResult.current = null;
    window.history.replaceState({}, '', '/developer/create-development');
  });

  it('explains that an in-review development cannot be resubmitted until the review completes', async () => {
    testState.getDevelopmentQueryResult.current = {
      data: { approvalStatus: 'pending', isPublished: 0, rejectionNote: null },
      error: null,
      isLoading: false,
    };

    render(<DevelopmentWizard />);

    await waitFor(() => {
      expect(screen.getByText(/Under review\./)).toBeInTheDocument();
      expect(screen.getByText(/submitting again is blocked/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Reviewer feedback:/i)).not.toBeInTheDocument();
  });

  it('warns that submitting changes to a live development unpublishes it', async () => {
    testState.getDevelopmentQueryResult.current = {
      data: { approvalStatus: 'approved', isPublished: 1, rejectionNote: null },
      error: null,
      isLoading: false,
    };

    render(<DevelopmentWizard />);

    await waitFor(() => {
      expect(screen.getByText(/This development is live\./)).toBeInTheDocument();
      expect(screen.getByText(/back to review until the update is approved/i)).toBeInTheDocument();
    });
  });

  it('surfaces reviewer feedback inside the editor so correction needs no detour', async () => {
    testState.getDevelopmentQueryResult.current = {
      data: {
        approvalStatus: 'draft',
        isPublished: 0,
        rejectionNote: 'Add at least three development highlights.',
      },
      error: null,
      isLoading: false,
    };

    render(<DevelopmentWizard />);

    await waitFor(() => {
      expect(screen.getByText(/Reviewer feedback:/i)).toBeInTheDocument();
      expect(screen.getByText(/Add at least three development highlights\./)).toBeInTheDocument();
    });
  });

  it('blocks the editor instead of falling through to a blank creation flow when the read fails', async () => {
    testState.getDevelopmentQueryResult.current = {
      data: null,
      error: new Error('Database temporarily unavailable'),
      isLoading: false,
    };

    render(<DevelopmentWizard />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Unable to open this development' }),
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'Project Setup' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(testState.editRefetch).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Back to developments' }));
    expect(testState.setLocation).toHaveBeenCalledWith('/developer/developments');
  });
});
