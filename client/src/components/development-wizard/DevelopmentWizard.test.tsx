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
        getOptions: vi.fn(() => ({})),
        rehydrate: vi.fn().mockResolvedValue(undefined),
      },
      getState: vi.fn(() => wizardState),
    },
  );

  return {
    authUser: { id: 1, role: 'super_admin' },
    authLoading: false,
    publisherContext: { cataloguePublisherId: 1109 },
    invalidate: vi.fn().mockResolvedValue(undefined),
    mutateAsync: vi.fn().mockResolvedValue({}),
    saveNow: vi.fn(),
    setLocation: vi.fn(),
    setListingIdentity: wizardState.setListingIdentity,
    useDevelopmentWizardMock,
    wizardState,
    getDevelopmentQueryResult: { current: null as unknown },
    draftQueryResult: { current: null as unknown },
    autoSaveOptions: { current: null as any },
    persistManual: vi.fn(),
    editRefetch: vi.fn(),
    searchParams: { current: '' },
  };
});

vi.mock('@/hooks/useDevelopmentWizard', () => ({
  useDevelopmentWizard: testState.useDevelopmentWizardMock,
  DEVELOPMENT_WIZARD_STORAGE_KEY: 'development-wizard',
  PUBLISHER_DEVELOPMENT_WIZARD_STORAGE_KEY: 'publisher-development-wizard',
  persistManualDevelopmentDraft: (...args: unknown[]) => testState.persistManual(...args),
}));

vi.mock('@/hooks/useAutoSave', () => ({
  useAutoSave: (_data: unknown, options: unknown) => {
    testState.autoSaveOptions.current = options;
    return {
      lastSaved: null,
      isSaving: false,
      error: null,
      saveNow: testState.saveNow,
    };
  },
}));

vi.mock('@/components/wizard/DraftManager', () => ({
  DraftManager: ({ open, onResume, onStartFresh, draftData }: any) =>
    open ? (
      <div>
        <span data-testid="draft-data">
          {JSON.stringify({
            name: draftData?.developmentName,
            lastModified: draftData?.lastModified
              ? new Date(draftData.lastModified).toISOString()
              : null,
          })}
        </span>
        <button onClick={onResume}>Resume draft</button>
        <button onClick={onStartFresh}>Start new</button>
      </div>
    ) : null,
}));

vi.mock('@/components/development-wizard/phases/BasicsPhase', () => ({
  BasicsPhase: () => <div>Basics step body</div>,
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({ user: testState.authUser, loading: testState.authLoading }),
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
      getDraft: {
        useQuery: () =>
          typeof testState.draftQueryResult.current === 'object' &&
          testState.draftQueryResult.current !== null
            ? (testState.draftQueryResult.current as Record<string, unknown>)
            : { data: null, error: null, isLoading: false },
      },
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
    testState.authLoading = false;
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
      expect(screen.getByRole('heading', { name: 'Basics' })).toBeInTheDocument();
    });

    expect(screen.getByText('Basics step body')).toBeInTheDocument();
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
      expect(screen.getByRole('heading', { name: 'Basics' })).toBeInTheDocument();
    });

    expect(screen.getByText('Basics step body')).toBeInTheDocument();
    expect(testState.setListingIdentity).not.toHaveBeenCalled();
  });

  it('waits for auth before selecting a storage key and isolates persistence by account', async () => {
    testState.authUser = null as any;
    testState.authLoading = true;
    testState.publisherContext = null;
    localStorage.setItem(
      'development-wizard',
      JSON.stringify({ state: { developmentData: { name: 'Legacy private draft' } } }),
    );

    const view = render(<DevelopmentWizard />);

    expect(localStorage.getItem('development-wizard')).not.toBeNull();
    expect(testState.useDevelopmentWizardMock.persist.setOptions).not.toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.any(String) }),
    );

    testState.authUser = { id: 202, role: 'property_developer' };
    testState.authLoading = false;
    view.rerender(<DevelopmentWizard />);

    await waitFor(() => {
      expect(testState.useDevelopmentWizardMock.persist.setOptions).toHaveBeenCalledWith({
        name: 'development-wizard:user-202',
      });
    });
    expect(localStorage.getItem('development-wizard')).toBeNull();

    testState.authUser = { id: 303, role: 'property_developer' };
    view.rerender(<DevelopmentWizard />);

    await waitFor(() => {
      expect(testState.useDevelopmentWizardMock.persist.setOptions).toHaveBeenCalledWith({
        name: 'development-wizard:user-303',
      });
    });
  });
});

describe('DevelopmentWizard edit-mode lifecycle truth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.authUser = { id: 2, role: 'property_developer' };
    testState.authLoading = false;
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
    expect(screen.queryByRole('heading', { name: 'Basics' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(testState.editRefetch).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Back to developments' }));
    expect(testState.setLocation).toHaveBeenCalledWith('/developer/developments');
  });
});

describe('DevelopmentWizard draft safety and autosave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.authUser = { id: 2, role: 'property_developer' };
    testState.authLoading = false;
    testState.publisherContext = null;
    testState.wizardState.currentPhase = 0;
    testState.wizardState.developmentType = null;
    testState.wizardState.developmentData = { name: '', transactionType: null };
    testState.wizardState.workflowId = null;
    testState.wizardState.currentStepId = null;
    testState.wizardState.unitTypes = [];
    testState.getDevelopmentQueryResult.current = null;
    testState.draftQueryResult.current = null;
    testState.autoSaveOptions.current = null;
    window.history.replaceState({}, '', '/developer/create-development');
  });

  afterEach(() => {
    testState.draftQueryResult.current = null;
    window.history.replaceState({}, '', '/developer/create-development');
  });

  it('starts clean (reset) only when there is no local work', async () => {
    render(<DevelopmentWizard />);
    // One reset is the account-key switch (writes muted, then rehydrated); the second is the clean start.
    await waitFor(() => expect(testState.wizardState.reset).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('button', { name: 'Resume draft' })).not.toBeInTheDocument();
  });

  it('does NOT wipe an existing local draft in create mode: offers Resume / Start new instead', async () => {
    testState.wizardState.developmentData = { name: 'Baltimore Lifestyle Estate', transactionType: 'for_sale' };
    testState.wizardState.workflowId = 'residential_sale' as any;

    render(<DevelopmentWizard />);

    expect(await screen.findByRole('button', { name: 'Resume draft' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start new' })).toBeInTheDocument();
    // Only the account-key switch reset (muted, then rehydrated) runs; the
    // create-mode reset that used to wipe progress must not.
    expect(testState.wizardState.reset).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Resume draft' }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Resume draft' })).not.toBeInTheDocument(),
    );
    expect(testState.wizardState.reset).toHaveBeenCalledTimes(1);
    // A resumed local copy has never been confirmed on the server, so autosave is armed.
    await waitFor(() => expect(testState.autoSaveOptions.current?.enabled).toBe(true));
  });

  it('Start new clears the local draft only after the publisher chooses it', async () => {
    testState.wizardState.developmentData = { name: 'Baltimore', transactionType: 'for_sale' };
    render(<DevelopmentWizard />);

    fireEvent.click(await screen.findByRole('button', { name: 'Start new' }));
    await waitFor(() => expect(testState.wizardState.reset).toHaveBeenCalledTimes(2));
  });

  it('resumes a server draft from ?draftId without resetting the store', async () => {
    window.history.replaceState({}, '', '/developer/create-development?draftId=42');
    testState.draftQueryResult.current = {
      data: { draftData: { workflowId: 'residential_sale', developmentData: { name: 'Saved one' } } },
      error: null,
      isLoading: false,
    };

    render(<DevelopmentWizard />);

    await waitFor(() =>
      expect(testState.wizardState.hydrateDevelopment).toHaveBeenCalledWith({
        workflowId: 'residential_sale',
        developmentData: { name: 'Saved one' },
      }),
    );
    expect(testState.wizardState.reset).toHaveBeenCalledTimes(1); // account-key switch only
    expect(screen.queryByRole('button', { name: 'Resume draft' })).not.toBeInTheDocument();
  });

  it('after a reload with ?draftId the save badge says "Saved {time}" from the server draft, not "Not saved yet"', async () => {
    window.history.replaceState({}, '', '/developer/create-development?draftId=42');
    // The server stores "YYYY-MM-DD HH:mm:ss" in UTC.
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19);
    testState.draftQueryResult.current = {
      data: {
        lastModified: fiveMinutesAgo,
        draftData: { workflowId: 'residential_sale', developmentData: { name: 'Saved one' } },
      },
      error: null,
      isLoading: false,
    };

    render(<DevelopmentWizard />);

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/^Saved 5 min ago/));
    expect(screen.queryByText('Not saved yet')).not.toBeInTheDocument();
  });

  it('shows "Not saved yet" for a brand-new wizard that has never been saved', async () => {
    render(<DevelopmentWizard />);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Not saved yet'));
  });

  it('the Resume dialog gets the draft name (or Untitled) and the last saved time', async () => {
    const savedAt = Date.now() - 10 * 60 * 1000;
    testState.wizardState.developmentData = { name: '', transactionType: 'for_sale' };
    testState.wizardState.workflowId = 'residential_sale' as any;
    (testState.wizardState as any).draftSavedAt = savedAt;

    const view = render(<DevelopmentWizard />);
    const untitled = JSON.parse((await screen.findByTestId('draft-data')).textContent ?? '{}');
    expect(untitled.name).toBe('Untitled');
    expect(untitled.lastModified).toBe(new Date(savedAt).toISOString());
    view.unmount();

    testState.wizardState.developmentData = { name: 'Baltimore Lifestyle Estate', transactionType: 'for_sale' };
    render(<DevelopmentWizard />);
    const named = JSON.parse((await screen.findByTestId('draft-data')).textContent ?? '{}');
    expect(named.name).toBe('Baltimore Lifestyle Estate');
    (testState.wizardState as any).draftSavedAt = undefined;
  });

  it('arms real autosave (debounced, developer path) once the wizard is ready', async () => {
    render(<DevelopmentWizard />);
    await waitFor(() => expect(testState.autoSaveOptions.current?.enabled).toBe(true));
    expect(testState.autoSaveOptions.current.schedule).toBe(true);
    expect(testState.autoSaveOptions.current.debounceMs).toBe(2000);
    // Nothing worth saving yet: no empty drafts are created.
    expect(testState.autoSaveOptions.current.shouldSkipSave()).toBe(true);
  });

  it('never auto-saves a live development in edit mode (explicit save only)', async () => {
    window.history.replaceState({}, '', '/developer/create-development?id=77');
    testState.getDevelopmentQueryResult.current = {
      data: { approvalStatus: 'draft', isPublished: 0, rejectionNote: null },
      error: null,
      isLoading: false,
    };
    render(<DevelopmentWizard />);
    await waitFor(() => expect(testState.autoSaveOptions.current?.enabled).toBe(true));
    expect(testState.autoSaveOptions.current.schedule).toBe(false);
  });

  it('puts the new draft id in the URL after the first confirmed save so a reload resumes', async () => {
    testState.persistManual.mockResolvedValue({ success: true, id: 42 });
    testState.wizardState.developmentData = { name: 'Baltimore', transactionType: 'for_sale' };
    testState.wizardState.workflowId = 'residential_sale' as any;
    render(<DevelopmentWizard />);
    fireEvent.click(await screen.findByRole('button', { name: 'Resume draft' }));
    await waitFor(() => expect(testState.autoSaveOptions.current?.enabled).toBe(true));

    await testState.autoSaveOptions.current.onSave({});

    expect(testState.persistManual).toHaveBeenCalledOnce();
    expect(window.location.search).toContain('draftId=42');
  });

  it('does not report a save when the server write fails (error propagates)', async () => {
    testState.persistManual.mockRejectedValue(new Error('Draft save failed'));
    render(<DevelopmentWizard />);
    await waitFor(() => expect(testState.autoSaveOptions.current?.enabled).toBe(true));

    await expect(testState.autoSaveOptions.current.onSave({})).rejects.toThrow('Draft save failed');
    expect(window.location.search).not.toContain('draftId');
  });
});
