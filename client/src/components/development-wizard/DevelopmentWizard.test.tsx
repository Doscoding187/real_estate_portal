import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DevelopmentWizard } from './DevelopmentWizard';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';

const testState = vi.hoisted(() => {
  const saveDraftMutationMock = vi.fn();
  const updateDevelopmentMock = vi.fn();
  const updatePublisherDevelopmentMock = vi.fn();
  const toastSuccessMock = vi.fn();
  const toastErrorMock = vi.fn();
  const setLocationMock = vi.fn();
  let currentUrl = '/developer/developments/new?draftId=321&brandProfileId=55';
  let userRole = 'developer';
  let publisherContext: any = null;

  const canonicalDraft = {
    _version: '3.0',
    workflowId: 'residential_rent',
    currentStepId: 'review_publish',
    completedSteps: [
      'configuration',
      'identity_market',
      'location',
      'amenities_features',
      'unit_types',
    ],
    currentPhase: 8,
    developmentType: 'residential',
    transactionType: 'for_rent',
    developmentData: {
      name: 'Resumed Manual Draft',
      description: 'A canonical draft resumed through the wizard shell.',
      developmentType: 'residential',
      transactionType: 'for_rent',
      status: 'selling',
      ownershipTypes: ['sectional-title'],
      location: {
        address: '17 Resume Road',
        suburb: 'Sea Point',
        city: 'Cape Town',
        province: 'Western Cape',
        postalCode: '8005',
      },
      media: { photos: [], videos: [], documents: [] },
    },
    stepData: {
      configuration: {
        developmentType: 'residential',
        transactionType: 'for_rent',
      },
      identity_market: {
        name: 'Resumed Manual Draft',
        transactionType: 'for_rent',
        status: 'selling',
      },
      location: {
        address: '17 Resume Road',
        suburb: 'Sea Point',
        city: 'Cape Town',
        province: 'Western Cape',
        postalCode: '8005',
      },
      unit_types: {
        selectedUnitId: 'resume-unit-db-1',
        unitTypes: [
          {
            id: 'resume-unit-db-1',
            name: 'Resume Rental Type',
            bedrooms: 2,
            bathrooms: 2,
            monthlyRentFrom: 15_000,
            monthlyRentTo: 18_000,
            basePriceFrom: 1_500_000,
            totalUnits: 9,
            availableUnits: 6,
          },
        ],
      },
      review_publish: {
        checklistConfirmed: true,
        readinessDismissals: ['launch-date-warning'],
      },
    },
    unitTypes: [
      {
        id: 'resume-unit-db-1',
        name: 'Resume Rental Type',
        bedrooms: 2,
        bathrooms: 2,
        monthlyRentFrom: 15_000,
        monthlyRentTo: 18_000,
        basePriceFrom: 1_500_000,
        totalUnits: 9,
        availableUnits: 6,
      },
    ],
  };

  const editDevelopment = {
    ...canonicalDraft,
    id: 987,
    workflowId: 'residential_rent',
    currentStepId: 'review_publish',
    developmentData: {
      ...canonicalDraft.developmentData,
      name: 'Edit Manual Draft',
      description: 'An existing development saved manually as an edit draft.',
    },
    stepData: {
      ...canonicalDraft.stepData,
      identity_market: {
        ...canonicalDraft.stepData.identity_market,
        name: 'Edit Manual Draft',
      },
    },
  };

  return {
    canonicalDraft,
    currentUrl,
    editDevelopment,
    publisherContext,
    saveDraftMutationMock,
    setLocationMock,
    toastErrorMock,
    toastSuccessMock,
    updateDevelopmentMock,
    updatePublisherDevelopmentMock,
    userRole,
  };
});

vi.mock('wouter', () => ({
  useLocation: () => [testState.currentUrl, testState.setLocationMock],
}));

vi.mock('sonner', () => ({
  toast: {
    error: testState.toastErrorMock,
    success: testState.toastSuccessMock,
  },
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 123, role: testState.userRole } }),
}));

vi.mock('@/hooks/usePublisherContext', () => ({
  usePublisherContext: () => ({ context: testState.publisherContext }),
}));

vi.mock('@/hooks/useAutoSave', () => ({
  useAutoSave: () => ({
    error: null,
    isSaving: false,
    lastSaved: null,
    saveNow: vi.fn(),
  }),
}));

vi.mock('@/components/wizard/DraftManager', () => ({
  DraftManager: () => null,
}));

vi.mock('@/components/ui/ErrorAlert', () => ({
  ErrorAlert: () => null,
}));

vi.mock('../wizard/WizardEngine', () => ({
  WizardEngine: ({
    saveStatus,
    onManualSaveDraft,
    isManualSaveDraftPending,
    onSaveProgress,
    isSaveProgressPending,
  }: any) =>
    React.createElement(
      React.Fragment,
      null,
      React.createElement('span', { 'data-testid': 'wizard-save-status' }, saveStatus),
      React.createElement(
        'button',
        {
          disabled: isManualSaveDraftPending,
          onClick: onManualSaveDraft,
          type: 'button',
        },
        isManualSaveDraftPending ? 'Saving...' : 'Manual Save Draft',
      ),
      onSaveProgress
        ? React.createElement(
            'button',
            {
              disabled: isSaveProgressPending,
              onClick: onSaveProgress,
              type: 'button',
            },
            isSaveProgressPending ? 'Saving Progress...' : 'Save Progress',
          )
        : null,
    ),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    developer: {
      getDraft: {
        useQuery: () => ({
          data: {
            id: 321,
            lastModified: '2026-05-24T10:00:00.000Z',
            draftData: testState.canonicalDraft,
          },
          error: null,
          isLoading: false,
        }),
      },
      getDevelopment: {
        useQuery: () => ({ data: testState.editDevelopment, error: null, isLoading: false }),
      },
      saveDraft: {
        useMutation: () => ({
          mutateAsync: testState.saveDraftMutationMock,
        }),
      },
      updateDevelopment: {
        useMutation: () => ({
          mutateAsync: testState.updateDevelopmentMock,
        }),
      },
    },
    superAdminPublisher: {
      getDevelopmentById: {
        useQuery: () => ({
          data: testState.publisherContext ? testState.editDevelopment : null,
          error: null,
          isLoading: false,
        }),
      },
      updateDevelopment: {
        useMutation: () => ({
          mutateAsync: testState.updatePublisherDevelopmentMock,
        }),
      },
    },
  },
}));

describe('DevelopmentWizard draft resume/manual save wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(
      {},
      '',
      '/developer/developments/new?draftId=321&brandProfileId=55',
    );
    testState.currentUrl = '/developer/developments/new?draftId=321&brandProfileId=55';
    testState.userRole = 'developer';
    testState.publisherContext = null;
    delete (testState.canonicalDraft as any).editingId;
    delete (testState.canonicalDraft as any).developmentId;
    testState.canonicalDraft.currentStepId = 'review_publish';
    testState.canonicalDraft.developmentData.name = 'Resumed Manual Draft';
    testState.canonicalDraft.developmentData.description =
      'A canonical draft resumed through the wizard shell.';
    testState.canonicalDraft.stepData.identity_market.name = 'Resumed Manual Draft';
    testState.editDevelopment.currentStepId = 'review_publish';
    testState.editDevelopment.completedSteps = [...testState.canonicalDraft.completedSteps];
    testState.saveDraftMutationMock.mockResolvedValue({ id: 321, success: true });
    testState.updateDevelopmentMock.mockResolvedValue({ success: true });
    testState.updatePublisherDevelopmentMock.mockResolvedValue({ success: true });
    useDevelopmentWizard.getState().reset();
    (useDevelopmentWizard as any).persist = {
      hasHydrated: () => true,
      onFinishHydration: () => () => {},
    };
  });

  it('manual save persists the resumed canonical draft snapshot', async () => {
    render(<DevelopmentWizard />);

    await waitFor(() => {
      expect(useDevelopmentWizard.getState().currentStepId).toBe('review_publish');
    });
    expect(screen.getByTestId('wizard-save-status').textContent).toBe('unsaved');

    fireEvent.click(screen.getByRole('button', { name: /manual save draft/i }));

    await waitFor(() => {
      expect(testState.saveDraftMutationMock).toHaveBeenCalledTimes(1);
    });

    const saveInput = testState.saveDraftMutationMock.mock.calls[0][0];
    const draftData = saveInput.draftData;

    expect(saveInput).toMatchObject({
      id: 321,
      brandProfileId: 55,
    });
    expect(draftData).toMatchObject({
      workflowId: 'residential_rent',
      currentStepId: 'review_publish',
      completedSteps: [
        'configuration',
        'identity_market',
        'location',
        'amenities_features',
        'unit_types',
      ],
      developmentData: {
        name: 'Resumed Manual Draft',
        transactionType: 'for_rent',
        location: {
          city: 'Cape Town',
          suburb: 'Sea Point',
        },
      },
    });
    expect(draftData.unitTypes).toHaveLength(1);
    expect(draftData.unitTypes[0]).toMatchObject({
      id: 'resume-unit-db-1',
      name: 'Resume Rental Type',
      monthlyRentFrom: 15_000,
      monthlyRentTo: 18_000,
    });
    expect(draftData.unitTypes[0]).not.toHaveProperty('basePriceFrom');
    expect(draftData.stepData.unit_types.unitTypes[0]).toEqual(draftData.unitTypes[0]);
    expect(draftData.stepData.review_publish).toEqual({
      checklistConfirmed: true,
      readinessDismissals: ['launch-date-warning'],
    });
    await waitFor(() => {
      expect(screen.getByTestId('wizard-save-status').textContent).toBe('saved');
    });
    expect(testState.toastSuccessMock).toHaveBeenCalledWith('Draft saved');
  });

  it('route draftId hydration replaces stale persisted wizard state before manual save', async () => {
    useDevelopmentWizard.setState({
      workflowId: 'residential_sale' as any,
      currentStepId: 'location' as any,
      completedSteps: ['configuration', 'identity_market'] as any,
      developmentData: {
        name: 'Stale Local Development',
        description: 'This stale persisted state must not survive route draft hydration.',
        developmentType: 'residential',
        transactionType: 'for_sale',
        location: {
          city: 'Johannesburg',
          suburb: 'Rosebank',
          province: 'Gauteng',
        },
      } as any,
      stepData: {
        identity_market: {
          name: 'Stale Local Development',
          transactionType: 'for_sale',
        },
        unit_types: {
          selectedUnitId: 'stale-local-unit',
          unitTypes: [
            {
              id: 'stale-local-unit',
              name: 'Stale Local Unit',
              bedrooms: 1,
              bathrooms: 1,
              priceFrom: 900_000,
            },
          ],
        },
      } as any,
      unitTypes: [
        {
          id: 'stale-local-unit',
          name: 'Stale Local Unit',
          bedrooms: 1,
          bathrooms: 1,
          priceFrom: 900_000,
        },
      ] as any,
    });

    render(<DevelopmentWizard />);

    await waitFor(() => {
      expect(useDevelopmentWizard.getState().currentStepId).toBe('review_publish');
    });
    expect(useDevelopmentWizard.getState().workflowId).toBe('residential_rent');
    expect(useDevelopmentWizard.getState().developmentData.name).toBe('Resumed Manual Draft');
    expect(useDevelopmentWizard.getState().unitTypes[0].id).toBe('resume-unit-db-1');

    fireEvent.click(screen.getByRole('button', { name: /manual save draft/i }));

    await waitFor(() => {
      expect(testState.saveDraftMutationMock).toHaveBeenCalledTimes(1);
    });

    const draftData = testState.saveDraftMutationMock.mock.calls[0][0].draftData;
    expect(draftData).toMatchObject({
      workflowId: 'residential_rent',
      currentStepId: 'review_publish',
      developmentData: {
        name: 'Resumed Manual Draft',
        transactionType: 'for_rent',
        location: {
          city: 'Cape Town',
          suburb: 'Sea Point',
        },
      },
    });
    expect(draftData.developmentData.name).not.toBe('Stale Local Development');
    expect(draftData.unitTypes[0]).toMatchObject({
      id: 'resume-unit-db-1',
      monthlyRentFrom: 15_000,
      monthlyRentTo: 18_000,
    });
    expect(draftData.unitTypes[0]).not.toHaveProperty('priceFrom');
    expect(draftData.stepData.unit_types.unitTypes[0]).toEqual(draftData.unitTypes[0]);
  });

  it('edit hydration keeps the normalized keyed workflow step when legacy raw step data is invalid', async () => {
    window.history.replaceState({}, '', '/developer/developments/edit?id=987&brandProfileId=55');
    testState.currentUrl = '/developer/developments/edit?id=987&brandProfileId=55';
    testState.editDevelopment.currentStepId = 'phase-10';
    testState.editDevelopment.completedSteps = [
      'configuration',
      'identity_market',
      'location',
      'governance_finances',
      'amenities_features',
      'marketing_summary',
      'development_media',
      'unit_types',
      'review_publish',
      'phase-10',
    ];

    render(<DevelopmentWizard />);

    await waitFor(() => {
      expect(useDevelopmentWizard.getState().currentStepId).toBe('review_publish');
    });
    expect(useDevelopmentWizard.getState().completedSteps).toEqual([
      'configuration',
      'identity_market',
      'location',
      'governance_finances',
      'amenities_features',
      'marketing_summary',
      'development_media',
      'unit_types',
      'review_publish',
    ]);
    expect(testState.toastSuccessMock).toHaveBeenCalledWith('Development loaded for editing.');
  });

  it('manual save of edit mode carries the existing development target in the canonical snapshot', async () => {
    window.history.replaceState({}, '', '/developer/developments/edit?id=987&brandProfileId=55');
    testState.currentUrl = '/developer/developments/edit?id=987&brandProfileId=55';
    testState.saveDraftMutationMock.mockResolvedValue({ id: 654, success: true });

    render(<DevelopmentWizard />);

    await waitFor(() => {
      expect(useDevelopmentWizard.getState().editingId).toBe(987);
    });

    fireEvent.click(screen.getByRole('button', { name: /manual save draft/i }));

    await waitFor(() => {
      expect(testState.saveDraftMutationMock).toHaveBeenCalledTimes(1);
    });

    const saveInput = testState.saveDraftMutationMock.mock.calls[0][0];
    const draftData = saveInput.draftData;

    expect(saveInput).toMatchObject({ brandProfileId: 55 });
    expect(saveInput).not.toHaveProperty('id');
    expect(draftData).toMatchObject({
      editingId: 987,
      developmentId: 987,
      workflowId: 'residential_rent',
      currentStepId: 'review_publish',
      developmentData: {
        name: 'Edit Manual Draft',
        transactionType: 'for_rent',
      },
    });
    expect(draftData.unitTypes[0]).toMatchObject({
      id: 'resume-unit-db-1',
      monthlyRentFrom: 15_000,
      monthlyRentTo: 18_000,
    });
    expect(draftData.unitTypes[0]).not.toHaveProperty('basePriceFrom');
    expect(draftData.stepData.unit_types.unitTypes[0]).toEqual(draftData.unitTypes[0]);
    expect(draftData.stepData.review_publish).toEqual({
      checklistConfirmed: true,
      readinessDismissals: ['launch-date-warning'],
    });
  });

  it('resumed edit drafts restore edit identity and baseline before manual save', async () => {
    (testState.canonicalDraft as any).editingId = 987;
    (testState.canonicalDraft as any).developmentId = 987;
    testState.canonicalDraft.developmentData.name = 'Resumed Edit Draft';
    testState.canonicalDraft.developmentData.description =
      'A canonical edit draft resumed from the draft route.';
    testState.canonicalDraft.stepData.identity_market.name = 'Resumed Edit Draft';

    render(<DevelopmentWizard />);

    await waitFor(() => {
      expect(useDevelopmentWizard.getState().editingId).toBe(987);
    });

    const baseline = useDevelopmentWizard.getState().getPersistedEditSnapshot();
    expect(baseline).toMatchObject({
      editingId: 987,
      developmentId: 987,
      workflowId: 'residential_rent',
      currentStepId: 'review_publish',
      developmentData: {
        name: 'Resumed Edit Draft',
        transactionType: 'for_rent',
      },
    });
    expect(baseline?.unitTypes[0]).toMatchObject({
      id: 'resume-unit-db-1',
      monthlyRentFrom: 15_000,
    });

    fireEvent.click(screen.getByRole('button', { name: /manual save draft/i }));

    await waitFor(() => {
      expect(testState.saveDraftMutationMock).toHaveBeenCalledTimes(1);
    });

    const saveInput = testState.saveDraftMutationMock.mock.calls[0][0];
    expect(saveInput).toMatchObject({ id: 321, brandProfileId: 55 });
    expect(saveInput.draftData).toMatchObject({
      editingId: 987,
      developmentId: 987,
      workflowId: 'residential_rent',
      currentStepId: 'review_publish',
      developmentData: {
        name: 'Resumed Edit Draft',
        transactionType: 'for_rent',
      },
    });
    expect(saveInput.draftData.unitTypes[0]).toMatchObject({
      id: 'resume-unit-db-1',
      monthlyRentFrom: 15_000,
    });
    expect(saveInput.draftData.unitTypes[0]).not.toHaveProperty('basePriceFrom');
  });

  it('edit mode save progress updates the existing development with a baseline-aware partial payload', async () => {
    window.history.replaceState({}, '', '/developer/developments/edit?id=987&brandProfileId=55');
    testState.currentUrl = '/developer/developments/edit?id=987&brandProfileId=55';
    testState.editDevelopment.currentStepId = 'marketing_summary';
    testState.editDevelopment.stepData = {
      ...testState.editDevelopment.stepData,
      marketing_summary: {
        description: 'Progress-save marketing description.',
        tagline: 'Progress-save tagline',
        keySellingPoints: ['Baseline aware'],
      },
    };

    render(<DevelopmentWizard />);

    await waitFor(() => {
      expect(useDevelopmentWizard.getState().editingId).toBe(987);
    });

    fireEvent.click(screen.getByRole('button', { name: /save progress/i }));

    await waitFor(() => {
      expect(testState.updateDevelopmentMock).toHaveBeenCalledTimes(1);
    });

    const updateInput = testState.updateDevelopmentMock.mock.calls[0][0];
    expect(updateInput.id).toBe(987);
    expect(updateInput.data).toMatchObject({
      canonicalUpdateMode: 'partial_step',
      currentStepId: 'marketing_summary',
      description: 'Progress-save marketing description.',
      tagline: 'Progress-save tagline',
      highlights: ['Baseline aware'],
      stepData: {
        marketing_summary: {
          description: 'Progress-save marketing description.',
          tagline: 'Progress-save tagline',
          keySellingPoints: ['Baseline aware'],
        },
      },
    });
    expect(updateInput.data).not.toHaveProperty('unitTypes');
    expect(updateInput.data).not.toHaveProperty('city');
    expect(useDevelopmentWizard.getState().getPersistedEditSnapshot()?.currentStepId).toBe(
      'marketing_summary',
    );
    expect(testState.saveDraftMutationMock).not.toHaveBeenCalled();
    expect(testState.toastSuccessMock).toHaveBeenCalledWith('Progress saved');
  });

  it('unit_types save progress preserves unit identity and display order', async () => {
    window.history.replaceState({}, '', '/developer/developments/edit?id=987&brandProfileId=55');
    testState.currentUrl = '/developer/developments/edit?id=987&brandProfileId=55';
    testState.editDevelopment.currentStepId = 'unit_types';
    testState.editDevelopment.stepData = {
      ...testState.editDevelopment.stepData,
      unit_types: {
        selectedUnitId: 'unit-b',
        unitTypes: [
          {
            id: 'unit-b',
            name: 'Reordered Rental Type B',
            bedrooms: 3,
            bathrooms: 2,
            monthlyRentFrom: 19_000,
            monthlyRentTo: 22_000,
            totalUnits: 4,
            availableUnits: 3,
            displayOrder: 0,
          },
          {
            id: 'resume-unit-db-1',
            name: 'Resume Rental Type Updated',
            bedrooms: 2,
            bathrooms: 2,
            monthlyRentFrom: 16_000,
            monthlyRentTo: 18_500,
            basePriceFrom: 1_500_000,
            totalUnits: 9,
            availableUnits: 5,
            displayOrder: 1,
          },
        ],
      },
    };
    testState.editDevelopment.unitTypes = testState.editDevelopment.stepData.unit_types.unitTypes;

    render(<DevelopmentWizard />);

    await waitFor(() => {
      expect(useDevelopmentWizard.getState().currentStepId).toBe('unit_types');
    });

    fireEvent.click(screen.getByRole('button', { name: /save progress/i }));

    await waitFor(() => {
      expect(testState.updateDevelopmentMock).toHaveBeenCalledTimes(1);
    });

    const updateInput = testState.updateDevelopmentMock.mock.calls[0][0];
    expect(updateInput.id).toBe(987);
    expect(updateInput.data).toMatchObject({
      canonicalUpdateMode: 'partial_step',
      currentStepId: 'unit_types',
      unitTypes: [
        {
          id: 'unit-b',
          name: 'Reordered Rental Type B',
          monthlyRentFrom: 19_000,
          displayOrder: 0,
        },
        {
          id: 'resume-unit-db-1',
          name: 'Resume Rental Type Updated',
          monthlyRentFrom: 16_000,
          displayOrder: 1,
        },
      ],
    });
    expect(updateInput.data.unitTypes[1]).not.toHaveProperty('basePriceFrom');
    expect(updateInput.data.stepData.unit_types.unitTypes).toEqual(updateInput.data.unitTypes);
    expect(useDevelopmentWizard.getState().getPersistedEditSnapshot()?.unitTypes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'unit-b', displayOrder: 0 }),
        expect.objectContaining({ id: 'resume-unit-db-1', displayOrder: 1 }),
      ]),
    );
    expect(testState.saveDraftMutationMock).not.toHaveBeenCalled();
  });

  it('publisher-context save progress uses the super admin brand-scoped update path', async () => {
    window.history.replaceState({}, '', '/developer/developments/edit?id=987&brandProfileId=77');
    testState.currentUrl = '/developer/developments/edit?id=987&brandProfileId=77';
    testState.userRole = 'super_admin';
    testState.publisherContext = {
      mode: 'seeding',
      brandProfileId: 77,
      brandProfileName: 'Publisher Brand',
      brandProfileType: 'developer',
    };
    testState.editDevelopment.currentStepId = 'marketing_summary';
    testState.editDevelopment.stepData = {
      ...testState.editDevelopment.stepData,
      marketing_summary: {
        description: 'Publisher progress description.',
        tagline: 'Publisher progress tagline',
        keySellingPoints: ['Brand scoped'],
      },
    };

    render(<DevelopmentWizard />);

    await waitFor(() => {
      expect(useDevelopmentWizard.getState().editingId).toBe(987);
    });

    fireEvent.click(screen.getByRole('button', { name: /save progress/i }));

    await waitFor(() => {
      expect(testState.updatePublisherDevelopmentMock).toHaveBeenCalledTimes(1);
    });

    expect(testState.updateDevelopmentMock).not.toHaveBeenCalled();
    const updateInput = testState.updatePublisherDevelopmentMock.mock.calls[0][0];
    expect(updateInput).toMatchObject({
      brandProfileId: 77,
      developmentId: 987,
      data: {
        canonicalUpdateMode: 'partial_step',
        currentStepId: 'marketing_summary',
        description: 'Publisher progress description.',
        tagline: 'Publisher progress tagline',
        highlights: ['Brand scoped'],
        brandProfileId: 77,
        developerBrandProfileId: 77,
        devOwnerType: 'platform',
        stepData: {
          marketing_summary: {
            description: 'Publisher progress description.',
            tagline: 'Publisher progress tagline',
            keySellingPoints: ['Brand scoped'],
          },
        },
      },
    });
    expect(updateInput.data).not.toHaveProperty('unitTypes');
    expect(updateInput.data).not.toHaveProperty('city');
    expect(testState.saveDraftMutationMock).not.toHaveBeenCalled();
    expect(testState.toastSuccessMock).toHaveBeenCalledWith('Progress saved');
  });
});
