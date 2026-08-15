import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
      getDevelopment: { useQuery: () => ({ data: null, error: null, isLoading: false }) },
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
