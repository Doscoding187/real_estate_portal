import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => {
  const navigateMock = vi.fn();
  const toastSuccessMock = vi.fn();
  const toastErrorMock = vi.fn();
  const toastInfoMock = vi.fn();
  const createDevelopmentMock = vi.fn();
  const updateDevelopmentMock = vi.fn();
  const publishDevelopmentMock = vi.fn();
  const createPublisherDevelopmentMock = vi.fn();
  const updatePublisherDevelopmentMock = vi.fn();
  const publishPublisherDevelopmentMock = vi.fn();
  const assignSuburbMock = vi.fn();
  const saveStepDataMock = vi.fn();
  const invalidateDevelopmentHomeMock = vi.fn().mockResolvedValue(undefined);
  const invalidateOperatingHomeMock = vi.fn().mockResolvedValue(undefined);
  const invalidatePublisherOperatingHomeMock = vi.fn().mockResolvedValue(undefined);
  const fetchPublisherOperatingHomeMock = vi.fn().mockResolvedValue(undefined);
  const invalidatePublisherDevelopmentsMock = vi.fn().mockResolvedValue(undefined);
  const resetMock = vi.fn();
  const setPhaseMock = vi.fn();
  let validationErrors: string[] = [];
  let authUser = { id: 1, role: 'property_developer' };
  let publisherContext: { cataloguePublisherId: number } | null = null;

  const rentUnit = {
    id: 'rent-unit-final',
    name: 'Final Rent Type',
    bedrooms: 2,
    bathrooms: 2,
    priceFrom: 2_000_000,
    basePriceFrom: 2_000_000,
    monthlyRentFrom: 16_000,
    monthlyRentTo: 19_000,
    parkingType: 'street',
    parkingBays: '1',
    totalUnits: 12,
    availableUnits: 7,
    reservedUnits: 2,
  };

  const wizardData = {
    name: 'Finalisation Rental',
    subtitle: 'Canonical rent',
    description:
      'A canonical rental development description with enough detail for publish validation.',
    developmentType: 'residential',
    transactionType: 'for_rent',
    status: 'selling',
    ownershipTypes: ['sectional-title'],
    location: {
      address: '11 Edit Road',
      postalCode: '8005',
    },
    highlights: ['Pool', 'Secure access', 'Walkable location'],
    heroImage: 'https://example.com/edit-hero.jpg',
    media: {
      heroImage: {
        id: 'hero-edit',
        url: 'https://example.com/edit-hero.jpg',
        type: 'image',
      },
      photos: [],
      videos: [],
      documents: [],
    },
    hasGoverningBody: true,
    governanceType: 'hoa',
    levyRange: { min: 1_200, max: 1_500 },
    rightsAndTaxes: { min: 900, max: 1_100 },
    unitTypes: [rentUnit],
    stepData: {
      configuration: {
        developmentType: 'residential',
        transactionType: 'for_rent',
      },
      amenities_features: {
        amenities: ['Pool'],
      },
      unit_types: {
        unitTypes: [rentUnit],
      },
    },
  };

  const wizardState = {
    editingId: undefined as number | undefined,
    classification: { type: 'residential' },
    listingIdentity: undefined as any,
    residentialConfig: { residentialType: 'apartment', communityTypes: ['estate'] },
    landConfig: undefined,
    commercialConfig: undefined,
    mixedUseConfig: undefined,
    specifications: undefined,
    developmentData: {
      ...wizardData,
      amenities: ['Pool'],
      ownershipType: 'sectional-title',
    },
    stepData: wizardData.stepData,
    selectedAmenities: [],
    getWizardData: () => wizardData,
    validateForPublish: () => ({
      isValid: validationErrors.length === 0,
      errors: validationErrors,
    }),
    getCardFieldRecommendations: () => [],
    setPhase: setPhaseMock,
    setWorkflowStep: vi.fn(),
    saveWorkflowStepData: saveStepDataMock,
    reset: resetMock,
  };

  return {
    createDevelopmentMock,
    assignSuburbMock,
    saveStepDataMock,
    createPublisherDevelopmentMock,
    navigateMock,
    publishDevelopmentMock,
    publishPublisherDevelopmentMock,
    invalidateDevelopmentHomeMock,
    invalidateOperatingHomeMock,
    invalidatePublisherOperatingHomeMock,
    fetchPublisherOperatingHomeMock,
    invalidatePublisherDevelopmentsMock,
    resetMock,
    toastErrorMock,
    toastInfoMock,
    toastSuccessMock,
    updateDevelopmentMock,
    updatePublisherDevelopmentMock,
    setValidationErrors: (errors: string[]) => {
      validationErrors = errors;
    },
    setActor: (
      user: { id: number; role: string } = { id: 1, role: 'property_developer' },
      context: { cataloguePublisherId: number } | null = null,
    ) => {
      authUser = user;
      publisherContext = context;
    },
    getAuthUser: () => authUser,
    getPublisherContext: () => publisherContext,
    wizardState,
  };
});

vi.mock('@/hooks/useDevelopmentWizard', () => ({
  useDevelopmentWizard: (selector?: (state: typeof testState.wizardState) => unknown) =>
    selector ? selector(testState.wizardState) : testState.wizardState,
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      developer: {
        getDevelopmentHome: { invalidate: testState.invalidateDevelopmentHomeMock },
        getOperatingHome: { invalidate: testState.invalidateOperatingHomeMock },
      },
      superAdminPublisher: {
        getOperatingHome: {
          invalidate: testState.invalidatePublisherOperatingHomeMock,
          fetch: testState.fetchPublisherOperatingHomeMock,
        },
        getDevelopments: { invalidate: testState.invalidatePublisherDevelopmentsMock },
      },
    }),
    admin: {
      adminReviewDevelopmentPlaceAssignment: {
        useMutation: () => ({ mutateAsync: testState.assignSuburbMock }),
      },
    },
    developer: {
      createDevelopment: { useMutation: () => ({ mutateAsync: testState.createDevelopmentMock }) },
      updateDevelopment: { useMutation: () => ({ mutateAsync: testState.updateDevelopmentMock }) },
      publishDevelopment: {
        useMutation: () => ({ mutateAsync: testState.publishDevelopmentMock }),
      },
    },
    superAdminPublisher: {
      createDevelopment: {
        useMutation: () => ({ mutateAsync: testState.createPublisherDevelopmentMock }),
      },
      updateDevelopment: {
        useMutation: () => ({ mutateAsync: testState.updatePublisherDevelopmentMock }),
      },
      publishDevelopment: {
        useMutation: () => ({ mutateAsync: testState.publishPublisherDevelopmentMock }),
      },
    },
  },
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({ user: testState.getAuthUser() }),
}));

vi.mock('@/hooks/usePublisherContext', () => ({
  usePublisherContext: () => ({ context: testState.getPublisherContext() }),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/developer/developments', testState.navigateMock],
}));

vi.mock('sonner', () => ({
  toast: {
    success: testState.toastSuccessMock,
    error: testState.toastErrorMock,
    info: testState.toastInfoMock,
  },
}));

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

import { FinalisationPhase } from './FinalisationPhase';

describe('FinalisationPhase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.wizardState.editingId = undefined;
    testState.setValidationErrors([]);
    testState.setActor();
    testState.createDevelopmentMock.mockResolvedValue({ development: { id: 123 } });
    testState.updateDevelopmentMock.mockResolvedValue({ success: true });
    testState.publishDevelopmentMock.mockResolvedValue({ success: true });
    testState.createPublisherDevelopmentMock.mockResolvedValue({ development: { id: 456 } });
    testState.updatePublisherDevelopmentMock.mockResolvedValue({ success: true });
    testState.publishPublisherDevelopmentMock.mockResolvedValue({ success: true });
    testState.invalidateDevelopmentHomeMock.mockResolvedValue(undefined);
    testState.invalidateOperatingHomeMock.mockResolvedValue(undefined);
  });

  it('submits create-mode DLE payloads through the canonical submit mapper', async () => {
    render(<FinalisationPhase />);

    fireEvent.click(screen.getByRole('button', { name: /submit for review/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm & submit/i }));

    await waitFor(() => expect(testState.createDevelopmentMock).toHaveBeenCalledTimes(1));

    expect(testState.invalidateDevelopmentHomeMock).toHaveBeenCalledTimes(3);
    expect(testState.invalidateDevelopmentHomeMock).toHaveBeenCalledWith({
      developmentId: 123,
      range: '30d',
    });

    expect(testState.updateDevelopmentMock).not.toHaveBeenCalled();

    const payload = testState.createDevelopmentMock.mock.calls[0][0];
    expect(payload).toMatchObject({
      name: 'Finalisation Rental',
      transactionType: 'for_rent',
      monthlyRentFrom: 16_000,
      monthlyRentTo: 19_000,
      totalUnits: 12,
      availableUnits: 7,
    });
    expect(payload).not.toHaveProperty('city');
    expect(payload).not.toHaveProperty('province');
    expect(payload).not.toHaveProperty('suburb');
    expect(payload).not.toHaveProperty('locationId');
    expect(payload.priceFrom).toBeUndefined();
    expect(payload.priceTo).toBeUndefined();
    expect(payload.unitTypes[0]).toMatchObject({
      id: 'rent-unit-final',
      name: 'Final Rent Type',
      monthlyRentFrom: 16_000,
      monthlyRentTo: 19_000,
      totalUnits: 12,
      availableUnits: 7,
      reservedUnits: 2,
      parkingType: 'open',
      parkingBays: 1,
    });
    expect(payload.unitTypes[0]).not.toHaveProperty('basePriceFrom');
    expect(payload.unitTypes[0]).not.toHaveProperty('priceFrom');
    expect(payload.features).toEqual(
      expect.arrayContaining([
        'cfg:res_type:apartment',
        'cfg:comm_type:estate',
        'cfg:hoa:true',
        'cfg:governance_type:hoa',
      ]),
    );
    expect(payload.images).toEqual([
      { url: 'https://example.com/edit-hero.jpg', category: 'hero' },
    ]);
    expect(testState.publishDevelopmentMock).toHaveBeenCalledWith({ id: 123 });
    expect(testState.toastSuccessMock).toHaveBeenCalledWith('Development submitted for review!');
    expect(testState.resetMock).toHaveBeenCalled();
    expect(testState.navigateMock).toHaveBeenCalledWith('/developer/developments');
  });

  it('uses the same canonical submit payload for edit-mode updates', async () => {
    testState.wizardState.editingId = 987;

    render(<FinalisationPhase />);

    fireEvent.click(screen.getByRole('button', { name: /submit for review/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm & submit/i }));

    await waitFor(() => expect(testState.updateDevelopmentMock).toHaveBeenCalledTimes(1));

    expect(testState.createDevelopmentMock).not.toHaveBeenCalled();
    expect(testState.updateDevelopmentMock).toHaveBeenCalledWith({
      id: 987,
      data: expect.objectContaining({
        name: 'Finalisation Rental',
        transactionType: 'for_rent',
        monthlyRentFrom: 16_000,
        monthlyRentTo: 19_000,
      }),
    });
    expect(testState.updateDevelopmentMock.mock.calls[0][0].data.unitTypes[0]).not.toHaveProperty(
      'basePriceFrom',
    );
    expect(testState.publishDevelopmentMock).toHaveBeenCalledWith({ id: 987 });
  });

  it('blocks incomplete development data from entering the active submit flow', () => {
    testState.setValidationErrors(['At least one photo is required']);

    render(<FinalisationPhase />);

    expect(screen.getByText('Action Required')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit for review/i })).toBeDisabled();
    expect(testState.publishDevelopmentMock).not.toHaveBeenCalled();
  });

  it('uses privileged curated publication for a super-admin publisher context', async () => {
    testState.setActor({ id: 2, role: 'super_admin' }, { cataloguePublisherId: 44 });

    render(<FinalisationPhase />);

    expect(screen.getByRole('heading', { name: 'Review & Publish' })).toBeInTheDocument();
    expect(screen.getByText('Curated Publication Controls')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish Development' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Publish Development' }));
    expect(screen.getByRole('heading', { name: 'Confirm Publication' })).toBeInTheDocument();
    expect(screen.getByTestId('publish-confirm-text').textContent).toBe(
      'Publishes Finalisation Rental with 1 house type. It becomes visible to the public on the site.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Publish Development' }));

    await waitFor(() => expect(testState.createPublisherDevelopmentMock).toHaveBeenCalledTimes(1));

    expect(testState.publishPublisherDevelopmentMock).toHaveBeenCalledWith({
      cataloguePublisherId: 44,
      developmentId: 456,
    });
    expect(testState.publishDevelopmentMock).not.toHaveBeenCalled();
    // No suburb in the wizard data, so no Place assignment is attempted.
    expect(testState.assignSuburbMock).not.toHaveBeenCalled();
    expect(testState.toastSuccessMock).toHaveBeenCalledWith('Curated development published!');
    expect(testState.navigateMock).toHaveBeenCalledWith('/admin/publisher');
    expect(testState.invalidatePublisherOperatingHomeMock).toHaveBeenCalledWith({
      cataloguePublisherId: 44,
      range: '30d',
    });
    expect(testState.fetchPublisherOperatingHomeMock).toHaveBeenCalledWith({
      cataloguePublisherId: 44,
      range: '30d',
    });
  });

  it('records the chosen suburb as the accepted site Place assignment', async () => {
    testState.setActor({ id: 2, role: 'super_admin' }, { cataloguePublisherId: 44 });
    testState.assignSuburbMock.mockResolvedValue({ success: true });
    const original = testState.wizardState.getWizardData;
    testState.wizardState.getWizardData = () => ({
      ...original(),
      location: {
        ...original().location,
        suburbPlaceId: 'place_north_riding',
        suburbLabel: 'North Riding',
      },
    });

    try {
      render(<FinalisationPhase />);
      fireEvent.click(screen.getByRole('button', { name: 'Publish Development' }));
      fireEvent.click(screen.getByRole('button', { name: 'Publish Development' }));

      await waitFor(() => expect(testState.assignSuburbMock).toHaveBeenCalledTimes(1));
      expect(testState.assignSuburbMock).toHaveBeenCalledWith({
        developmentId: 456,
        phaseId: null,
        placeId: 'place_north_riding',
        evidenceReference: expect.stringContaining('chosen from our canonical geography'),
        replaceExisting: true,
      });
      await waitFor(() =>
        expect(testState.saveStepDataMock).toHaveBeenCalledWith('location', {
          suburbAssignedPlaceId: 'place_north_riding',
        }),
      );
      expect(testState.navigateMock).toHaveBeenCalledWith('/admin/publisher');
    } finally {
      testState.wizardState.getWizardData = original;
    }
  });

  it('a failed assignment after publish offers Retry, which calls it again and records it', async () => {
    testState.setActor({ id: 2, role: 'super_admin' }, { cataloguePublisherId: 44 });
    testState.assignSuburbMock.mockRejectedValueOnce(new Error('boom')).mockResolvedValue({ success: true });
    const original = testState.wizardState.getWizardData;
    testState.wizardState.getWizardData = () => ({
      ...original(),
      location: { ...original().location, suburbPlaceId: 'place_north_riding' },
    });
    try {
      render(<FinalisationPhase />);
      fireEvent.click(screen.getByRole('button', { name: 'Publish Development' }));
      fireEvent.click(screen.getByRole('button', { name: 'Publish Development' }));
      await waitFor(() => expect(testState.toastErrorMock).toHaveBeenCalled());
      const [message, options] = testState.toastErrorMock.mock.calls.at(-1)!;
      expect(message).toMatch(/could not be recorded/);
      expect(options.action.label).toBe('Retry');
      options.action.onClick();
      await waitFor(() => expect(testState.assignSuburbMock).toHaveBeenCalledTimes(2));
      await waitFor(() =>
        expect(testState.saveStepDataMock).toHaveBeenCalledWith('location', {
          suburbAssignedPlaceId: 'place_north_riding',
        }),
      );
    } finally {
      testState.wizardState.getWizardData = original;
    }
  });

  it('a developer never records a Place assignment', async () => {
    const original = testState.wizardState.getWizardData;
    testState.wizardState.getWizardData = () => ({
      ...original(),
      location: { ...original().location, suburbPlaceId: 'place_north_riding' },
    });
    try {
      render(<FinalisationPhase />);
      fireEvent.click(screen.getByRole('button', { name: /submit for review/i }));
      fireEvent.click(screen.getByRole('button', { name: /confirm & submit/i }));
      await waitFor(() => expect(testState.publishDevelopmentMock).toHaveBeenCalledTimes(1));
      expect(testState.assignSuburbMock).not.toHaveBeenCalled();
    } finally {
      testState.wizardState.getWizardData = original;
    }
  });

  describe('review in the new design', () => {
    const baltimore = () => ({
      ...testState.wizardState.getWizardData(),
      name: 'Baltimore Lifestyle Estate',
      transactionType: 'for_sale',
      setting: 'estate',
      estateType: 'lifestyle',
      subtitle: 'Freestanding family homes',
      phaseLabel: 'Phase 2',
      status: 'selling',
      salesStage: 'off_plan',
      ownershipTypes: ['full-title'],
      location: {
        address: '',
        noOfficialStreet: true,
        suburbLabel: 'North Riding, Johannesburg',
        postalCode: '2162',
        latitude: -26.0412,
        longitude: 28.0001,
      },
      rightsAndTaxes: { min: 2000, max: 2000 },
      hasGoverningBody: true,
      governanceType: 'hoa',
      levyRange: { min: 1500, max: 1500 },
      highlights: ['Security estate', 'Full title', 'Controlled access', 'Near schools', 'Pet friendly'],
      media: {
        heroImage: { url: 'https://cdn/c.jpg', category: 'featured', isPrimary: true },
        photos: [
          { id: 'c', url: 'https://cdn/c.jpg', category: 'featured', isPrimary: true },
          { id: 'g', url: 'https://cdn/g.jpg', category: 'outdoors' },
          { id: 'a1', url: 'https://cdn/a1.jpg', category: 'amenities' },
          { id: 'a2', url: 'https://cdn/a2.jpg', category: 'amenities' },
        ],
        videos: [{ id: 'v', url: 'https://cdn/v.mp4' }],
        documents: [{ id: 'd', url: 'https://cdn/b.pdf', documentType: 'brochure' }],
      },
      unitTypes: [
        {
          id: 'u1',
          name: '91 m² 4-bedroom house',
          bedrooms: 4,
          bathrooms: 2,
          unitSize: 91,
          priceFrom: 1930000,
          availableUnits: 50,
          parkingType: 'carport',
          parkingBays: 2,
          unitCategory: 'house',
          unitSubType: 'freestanding-house',
          baseMedia: { gallery: [{ id: 'p', url: 'x' }], floorPlans: [{ id: 'f', url: 'y' }] },
        },
        { id: 'u2', name: 'Second', bedrooms: 3, bathrooms: 2, unitSize: 71, priceFrom: 1745000, availableUnits: 50 },
      ],
    });

    const withData = (data: any, fn: () => void) => {
      const original = testState.wizardState.getWizardData;
      testState.wizardState.getWizardData = () => data;
      testState.wizardState.stepData = { amenities_features: { amenities: ['controlled_gate_access', 'Padel court'] } } as any;
      try {
        fn();
      } finally {
        testState.wizardState.getWizardData = original;
      }
    };

    it('shows one section per step with its truthful content and no raw amenity keys', () => {
      testState.wizardState.stepData = {
        amenities_features: { amenities: ['controlled_gate_access', '24_hour_security', 'Padel court'] },
      } as any;
      withData(baltimore(), () => {
        render(<FinalisationPhase />);
        for (const id of ['basics', 'about', 'location', 'costs', 'amenities', 'highlights', 'media', 'house_types']) {
          expect(screen.getByTestId(`review-${id}`)).toBeInTheDocument();
        }
        expect(screen.getByText('Security estate · Lifestyle estate')).toBeInTheDocument();
        expect(screen.getByText('No street address yet')).toBeInTheDocument();
        expect(screen.getByText('North Riding, Johannesburg')).toBeInTheDocument();
        expect(screen.getByText('-26.04120, 28.00010')).toBeInTheDocument();
        expect(screen.queryByText(/map preview/i)).toBeNull();
        expect(screen.getByText('R2000 a month (estimate)'.replace('R2000', 'R2,000'))).toBeInTheDocument();
        expect(screen.getByText('HOA levy')).toBeInTheDocument();
        const chips = screen.getByTestId('review-amenity-chips');
        expect(chips.textContent).not.toMatch(/controlled_gate_access|24_hour_security|_/);
        expect(within(chips).getByText('Padel court')).toBeInTheDocument();
        // Highlights: first three then "+N more"
        expect(screen.getByText('+2 more')).toBeInTheDocument();
        // Media per slot, video and documents by type
        expect(within(screen.getByTestId('review-media')).getByText('Cover photo').nextSibling?.textContent).toBe('1 photo');
        expect(within(screen.getByTestId('review-media')).getByText('Amenities & lifestyle').nextSibling?.textContent).toBe('2 photos');
        expect(within(screen.getByTestId('review-media')).getByText('Brochure').nextSibling?.textContent).toBe('Added');
        expect(within(screen.getByTestId('review-media')).getByText('Price list').nextSibling?.textContent).toBe('Not added');
        // House types
        const cards = screen.getAllByTestId('review-house-type');
        expect(cards).toHaveLength(2);
        expect(cards[0].textContent).toContain('Carport · 2 bays');
        expect(cards[0].textContent).toContain('50 available');
        expect(cards[0].textContent).toContain('1 photo · 1 floor plan');
        expect(cards[0].textContent).toContain('R1,930,000');
      });
    });

    it('each section Edit jumps to its own step', () => {
      withData(baltimore(), () => {
        render(<FinalisationPhase />);
        const expected: Record<string, string> = {
          Basics: 'configuration',
          About: 'identity_market',
          Location: 'location',
          'Monthly costs': 'governance_finances',
          Amenities: 'amenities_features',
          Highlights: 'amenities_features',
          Media: 'development_media',
          'House types': 'unit_types',
        };
        for (const [title, step] of Object.entries(expected)) {
          testState.wizardState.setWorkflowStep.mockClear();
          fireEvent.click(screen.getByRole('button', { name: `Edit ${title}` }));
          expect(testState.wizardState.setWorkflowStep).toHaveBeenCalledWith(step);
        }
      });
    });

    it('lists what is missing, each linking to its step, and shows Ready when nothing is', () => {
      testState.setValidationErrors(['Address is required', 'At least 1 image is required', 'Add at least one unit type']);
      withData(baltimore(), () => {
        render(<FinalisationPhase />);
        const list = screen.getByTestId('review-missing');
        expect(within(list).getAllByRole('listitem')).toHaveLength(3);
        fireEvent.click(within(list).getByRole('button', { name: 'Fix in Location' }));
        expect(testState.wizardState.setWorkflowStep).toHaveBeenLastCalledWith('location');
        fireEvent.click(within(list).getByRole('button', { name: 'Fix in Media' }));
        expect(testState.wizardState.setWorkflowStep).toHaveBeenLastCalledWith('development_media');
        fireEvent.click(within(list).getByRole('button', { name: 'Fix in House types' }));
        expect(testState.wizardState.setWorkflowStep).toHaveBeenLastCalledWith('unit_types');
      });
      testState.setValidationErrors([]);
      withData(baltimore(), () => {
        cleanup();
        render(<FinalisationPhase />);
        expect(screen.queryByTestId('review-missing')).toBeNull();
        expect(screen.getByText('Ready to Submit for Review')).toBeInTheDocument();
      });
    });

    it('the curated publish confirmation names the development, the publisher and the house types', () => {
      testState.setActor({ id: 2, role: 'super_admin' }, {
        cataloguePublisherId: 44,
        publisherName: 'Cosmopolitan Projects',
      } as any);
      withData(baltimore(), () => {
        render(<FinalisationPhase />);
        fireEvent.click(screen.getByRole('button', { name: 'Publish Development' }));
        expect(screen.getByTestId('publish-confirm-text').textContent).toBe(
          'Publishes Baltimore Lifestyle Estate for Cosmopolitan Projects with 2 house types. It becomes visible to the public on the site.',
        );
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      });
    });

    it('developer mode keeps its submit-for-review wording', () => {
      withData(baltimore(), () => {
        render(<FinalisationPhase />);
        fireEvent.click(screen.getByRole('button', { name: /submit for review/i }));
        expect(screen.getByTestId('publish-confirm-text').textContent).toBe(
          'Submits Baltimore Lifestyle Estate with 2 house types for review. It will not be visible publicly until an authorised reviewer approves and publishes it.',
        );
        expect(screen.getByRole('button', { name: /confirm & submit/i })).toBeInTheDocument();
      });
    });
  });
});
