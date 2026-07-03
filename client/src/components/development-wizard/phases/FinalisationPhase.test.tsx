import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => {
  const navigateMock = vi.fn();
  const toastSuccessMock = vi.fn();
  const toastErrorMock = vi.fn();
  const createDevelopmentMock = vi.fn();
  const updateDevelopmentMock = vi.fn();
  const publishDevelopmentMock = vi.fn();
  const createPublisherDevelopmentMock = vi.fn();
  const updatePublisherDevelopmentMock = vi.fn();
  const publishPublisherDevelopmentMock = vi.fn();
  const resetMock = vi.fn();
  const setPhaseMock = vi.fn();

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
      suburb: 'Sea Point',
      city: 'Cape Town',
      province: 'Western Cape',
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
    validateForPublish: () => ({ isValid: true, errors: [] }),
    getCardFieldRecommendations: () => [],
    setPhase: setPhaseMock,
    reset: resetMock,
  };

  return {
    createDevelopmentMock,
    createPublisherDevelopmentMock,
    navigateMock,
    publishDevelopmentMock,
    publishPublisherDevelopmentMock,
    resetMock,
    toastErrorMock,
    toastSuccessMock,
    updateDevelopmentMock,
    updatePublisherDevelopmentMock,
    wizardState,
  };
});

vi.mock('@/hooks/useDevelopmentWizard', () => ({
  useDevelopmentWizard: (selector?: (state: typeof testState.wizardState) => unknown) =>
    selector ? selector(testState.wizardState) : testState.wizardState,
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
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
  useAuth: () => ({ user: { id: 1, role: 'property_developer' } }),
}));

vi.mock('@/hooks/usePublisherContext', () => ({
  usePublisherContext: () => ({ context: null }),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/developer/developments', testState.navigateMock],
}));

vi.mock('sonner', () => ({
  toast: {
    success: testState.toastSuccessMock,
    error: testState.toastErrorMock,
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
    testState.createDevelopmentMock.mockResolvedValue({ development: { id: 123 } });
    testState.updateDevelopmentMock.mockResolvedValue({ success: true });
    testState.publishDevelopmentMock.mockResolvedValue({ success: true });
    testState.createPublisherDevelopmentMock.mockResolvedValue({ development: { id: 456 } });
    testState.updatePublisherDevelopmentMock.mockResolvedValue({ success: true });
    testState.publishPublisherDevelopmentMock.mockResolvedValue({ success: true });
  });

  it('publishes create-mode DLE payloads through the canonical submit mapper', async () => {
    render(<FinalisationPhase />);

    fireEvent.click(screen.getByRole('button', { name: /publish listing/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm & publish/i }));

    await waitFor(() => expect(testState.createDevelopmentMock).toHaveBeenCalledTimes(1));

    expect(testState.updateDevelopmentMock).not.toHaveBeenCalled();

    const payload = testState.createDevelopmentMock.mock.calls[0][0];
    expect(payload).toMatchObject({
      name: 'Finalisation Rental',
      transactionType: 'for_rent',
      monthlyRentFrom: 16_000,
      monthlyRentTo: 19_000,
      totalUnits: 12,
      availableUnits: 7,
      city: 'Cape Town',
      province: 'Western Cape',
    });
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
    expect(testState.resetMock).toHaveBeenCalled();
    expect(testState.navigateMock).toHaveBeenCalledWith('/developer/developments');
  });

  it('uses the same canonical submit payload for edit-mode updates', async () => {
    testState.wizardState.editingId = 987;

    render(<FinalisationPhase />);

    fireEvent.click(screen.getByRole('button', { name: /publish listing/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm & publish/i }));

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
});
