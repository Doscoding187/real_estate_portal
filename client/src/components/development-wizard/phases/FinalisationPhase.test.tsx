import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveDevelopmentUpdateIntent } from '../../../../../server/lib/developmentUpdateIntent';

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

  const canonicalSnapshot = {
    workflowId: 'residential_rent',
    currentStepId: 'review_publish',
    completedSteps: ['configuration', 'identity_market', 'location', 'unit_types'],
    developmentData: {
      name: 'Finalisation Edit Rental',
      description: 'A resumed canonical edit draft that should update existing inventory.',
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
    },
    stepData: {
      configuration: {
        developmentType: 'residential',
        transactionType: 'for_rent',
      },
      identity_market: {
        name: 'Finalisation Edit Rental',
        transactionType: 'for_rent',
        status: 'selling',
        ownershipTypes: ['sectional-title'],
      },
      location: {
        address: '11 Edit Road',
        suburb: 'Sea Point',
        city: 'Cape Town',
        province: 'Western Cape',
        postalCode: '8005',
      },
      amenities_features: {
        amenities: ['Pool'],
      },
      unit_types: {
        selectedUnitId: 'db-rent-unit-final',
        unitTypes: [
          {
            id: 'db-rent-unit-final',
            name: 'Final Rent Type',
            bedrooms: 2,
            bathrooms: 2,
            monthlyRentFrom: 16_000,
            monthlyRentTo: 19_000,
            basePriceFrom: 2_000_000,
            totalUnits: 12,
            availableUnits: 7,
            reservedUnits: 2,
          },
        ],
      },
    },
    unitTypes: [
      {
        id: 'db-rent-unit-final',
        name: 'Final Rent Type',
        bedrooms: 2,
        bathrooms: 2,
        monthlyRentFrom: 16_000,
        monthlyRentTo: 19_000,
        basePriceFrom: 2_000_000,
        totalUnits: 12,
        availableUnits: 7,
        reservedUnits: 2,
      },
    ],
  };

  const wizardData = {
    ...canonicalSnapshot.developmentData,
    workflowId: canonicalSnapshot.workflowId,
    currentStepId: canonicalSnapshot.currentStepId,
    completedSteps: canonicalSnapshot.completedSteps,
    stepData: canonicalSnapshot.stepData,
    unitTypes: canonicalSnapshot.unitTypes,
    amenities: ['Pool'],
    media: canonicalSnapshot.developmentData.media,
  };

  const wizardState = {
    editingId: 987,
    persistedEditSnapshot: canonicalSnapshot,
    getPersistedEditSnapshot: vi.fn(() => canonicalSnapshot),
    classification: { type: 'residential' },
    listingIdentity: undefined,
    residentialConfig: { residentialType: 'apartment' },
    landConfig: undefined,
    commercialConfig: undefined,
    mixedUseConfig: undefined,
    specifications: undefined,
    developmentData: {
      ...canonicalSnapshot.developmentData,
      amenities: ['Pool'],
    },
    stepData: canonicalSnapshot.stepData,
    selectedAmenities: [],
    getWizardData: () => wizardData,
    getDraftData: () => canonicalSnapshot,
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

import {
  FinalisationPhase,
  getFinalisationAvailabilityLabel,
  getFinalisationPublishCopy,
  getFinalisationPriceLine,
} from './FinalisationPhase';

describe('FinalisationPhase transaction copy helpers', () => {
  it('uses transaction-native review and preview price labels', () => {
    expect(getFinalisationPriceLine('for_sale', '1,200,000')).toBe('From R 1,200,000');
    expect(getFinalisationPriceLine('for_rent', '16,000')).toBe('Rent from R 16,000 / month');
    expect(getFinalisationPriceLine('auction', '850,000 (starting bid)')).toBe(
      'Starting bid R 850,000 (starting bid)',
    );
  });

  it('uses transaction-native availability language', () => {
    expect(getFinalisationAvailabilityLabel('for_sale', 7)).toBe('7 Avail');
    expect(getFinalisationAvailabilityLabel('for_sale', 0)).toBe('Sold out');
    expect(getFinalisationAvailabilityLabel('for_rent', 7)).toBe('7 rentals available');
    expect(getFinalisationAvailabilityLabel('for_rent', 0)).toBe('Fully let');
    expect(getFinalisationAvailabilityLabel('auction', 2)).toBe('2 lots open');
    expect(getFinalisationAvailabilityLabel('auction', 0)).toBe('Auction closed');
  });

  it('uses transaction-native publish confirmation copy', () => {
    expect(getFinalisationPublishCopy('for_sale')).toMatchObject({
      previewHeading: 'Live Preview Mode',
      publishButton: 'Publish Listing',
      confirmButton: 'Confirm & Publish',
    });
    expect(getFinalisationPublishCopy('for_rent')).toMatchObject({
      previewHeading: 'Rental Preview',
      publishButton: 'Publish Rental Package',
      validationTitle: 'Rental Package Ready',
      confirmButton: 'Confirm & Publish Rental',
    });
    expect(getFinalisationPublishCopy('auction')).toMatchObject({
      previewHeading: 'Auction Preview',
      publishButton: 'Publish Auction Package',
      validationTitle: 'Auction Package Ready',
      confirmButton: 'Confirm & Publish Auction',
    });
  });
});

function makeFinalisationRentalSnapshot() {
  return {
    workflowId: 'residential_rent',
    currentStepId: 'review_publish',
    completedSteps: ['configuration', 'identity_market', 'location', 'unit_types'],
    developmentData: {
      name: 'Finalisation Edit Rental',
      description: 'A resumed canonical edit draft that should update existing inventory.',
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
    },
    stepData: {
      configuration: {
        developmentType: 'residential',
        transactionType: 'for_rent',
      },
      identity_market: {
        name: 'Finalisation Edit Rental',
        transactionType: 'for_rent',
        status: 'selling',
        ownershipTypes: ['sectional-title'],
      },
      location: {
        address: '11 Edit Road',
        suburb: 'Sea Point',
        city: 'Cape Town',
        province: 'Western Cape',
        postalCode: '8005',
      },
      amenities_features: {
        amenities: ['Pool'],
      },
      unit_types: {
        selectedUnitId: 'db-rent-unit-final',
        unitTypes: [
          {
            id: 'db-rent-unit-final',
            name: 'Final Rent Type',
            bedrooms: 2,
            bathrooms: 2,
            monthlyRentFrom: 16_000,
            monthlyRentTo: 19_000,
            basePriceFrom: 2_000_000,
            totalUnits: 12,
            availableUnits: 7,
            reservedUnits: 2,
          },
        ],
      },
    },
    unitTypes: [
      {
        id: 'db-rent-unit-final',
        name: 'Final Rent Type',
        bedrooms: 2,
        bathrooms: 2,
        monthlyRentFrom: 16_000,
        monthlyRentTo: 19_000,
        basePriceFrom: 2_000_000,
        totalUnits: 12,
        availableUnits: 7,
        reservedUnits: 2,
      },
    ],
  };
}

function makeFinalisationAuctionSnapshot() {
  return {
    workflowId: 'residential_auction',
    currentStepId: 'review_publish',
    completedSteps: ['configuration', 'identity_market', 'location', 'unit_types'],
    developmentData: {
      name: 'Finalisation Auction Draft',
      description: 'A resumed canonical auction draft that should publish auction inventory.',
      developmentType: 'residential',
      transactionType: 'auction',
      status: 'selling',
      ownershipTypes: ['sectional-title'],
      location: {
        address: '18 Final Auction Road',
        suburb: 'De Waterkant',
        city: 'Cape Town',
        province: 'Western Cape',
        postalCode: '8001',
      },
      media: {
        heroImage: {
          id: 'hero-auction',
          url: 'https://example.com/auction-hero.jpg',
          type: 'image',
        },
        photos: [],
        videos: [],
        documents: [],
      },
    },
    stepData: {
      configuration: {
        developmentType: 'residential',
        transactionType: 'auction',
      },
      identity_market: {
        name: 'Finalisation Auction Draft',
        transactionType: 'auction',
        status: 'selling',
        ownershipTypes: ['sectional-title'],
      },
      location: {
        address: '18 Final Auction Road',
        suburb: 'De Waterkant',
        city: 'Cape Town',
        province: 'Western Cape',
        postalCode: '8001',
      },
      amenities_features: {
        amenities: ['Concierge'],
      },
      unit_types: {
        selectedUnitId: 'db-auction-unit-final',
        unitTypes: [
          {
            id: 'db-auction-unit-final',
            name: 'Final Auction Lot',
            bedrooms: 3,
            bathrooms: 2,
            priceFrom: 2_700_000,
            monthlyRentFrom: 24_000,
            startingBid: 850_000,
            reservePrice: 950_000,
            auctionStartDate: '2030-02-01T09:00:00.000Z',
            auctionEndDate: '2030-02-08T17:00:00.000Z',
            auctionStatus: 'scheduled',
            totalUnits: 4,
            availableUnits: 2,
            reservedUnits: 1,
          },
        ],
      },
    },
    unitTypes: [
      {
        id: 'db-auction-unit-final',
        name: 'Final Auction Lot',
        bedrooms: 3,
        bathrooms: 2,
        priceFrom: 2_700_000,
        monthlyRentFrom: 24_000,
        startingBid: 850_000,
        reservePrice: 950_000,
        auctionStartDate: '2030-02-01T09:00:00.000Z',
        auctionEndDate: '2030-02-08T17:00:00.000Z',
        auctionStatus: 'scheduled',
        totalUnits: 4,
        availableUnits: 2,
        reservedUnits: 1,
      },
    ],
  };
}

function configureFinalisationSnapshot(
  snapshot: ReturnType<typeof makeFinalisationRentalSnapshot>,
  options: { editingId?: number } = {},
) {
  const wizardData = {
    ...snapshot.developmentData,
    workflowId: snapshot.workflowId,
    currentStepId: snapshot.currentStepId,
    completedSteps: snapshot.completedSteps,
    stepData: snapshot.stepData,
    unitTypes: snapshot.unitTypes,
    amenities: snapshot.stepData.amenities_features?.amenities ?? [],
    media: snapshot.developmentData.media,
  };

  testState.wizardState.editingId = options.editingId;
  testState.wizardState.persistedEditSnapshot = snapshot;
  testState.wizardState.getPersistedEditSnapshot.mockReturnValue(snapshot);
  testState.wizardState.developmentData = {
    ...snapshot.developmentData,
    amenities: wizardData.amenities,
  };
  testState.wizardState.stepData = snapshot.stepData;
  testState.wizardState.getWizardData = () => wizardData;
  testState.wizardState.getDraftData = () => snapshot;
  testState.wizardState.validateForPublish = () => ({ isValid: true, errors: [] });
}

describe('FinalisationPhase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureFinalisationSnapshot(makeFinalisationRentalSnapshot(), { editingId: 987 });
    testState.createDevelopmentMock.mockResolvedValue({ development: { id: 123 } });
    testState.updateDevelopmentMock.mockResolvedValue({ success: true });
    testState.publishDevelopmentMock.mockResolvedValue({ success: true });
    testState.createPublisherDevelopmentMock.mockResolvedValue({ development: { id: 123 } });
    testState.updatePublisherDevelopmentMock.mockResolvedValue({ success: true });
    testState.publishPublisherDevelopmentMock.mockResolvedValue({ success: true });
  });

  it('uses canonical update payloads for edit-mode publish', async () => {
    render(<FinalisationPhase />);

    fireEvent.click(screen.getByRole('button', { name: /publish rental package/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm & publish rental/i }));

    await waitFor(() => expect(testState.updateDevelopmentMock).toHaveBeenCalledTimes(1));

    expect(testState.createDevelopmentMock).not.toHaveBeenCalled();
    expect(testState.updateDevelopmentMock).toHaveBeenCalledWith({
      id: 987,
      data: expect.objectContaining({
        workflowId: 'residential_rent',
        currentStepId: 'review_publish',
        name: 'Finalisation Edit Rental',
        transactionType: 'for_rent',
        monthlyRentFrom: 16_000,
        monthlyRentTo: 19_000,
      }),
    });

    const payload = testState.updateDevelopmentMock.mock.calls[0][0].data;
    expect(testState.wizardState.getPersistedEditSnapshot).toHaveBeenCalled();
    expect(resolveDevelopmentUpdateIntent(payload)).toMatchObject({
      unitTypesMode: 'canonical_full_sync',
      deleteMissingUnitTypes: true,
    });
    expect(payload.unitTypes[0]).toMatchObject({
      id: 'db-rent-unit-final',
      name: 'Final Rent Type',
      monthlyRentFrom: 16_000,
      monthlyRentTo: 19_000,
      totalUnits: 12,
      availableUnits: 7,
      reservedUnits: 2,
    });
    expect(payload.unitTypes[0]).not.toHaveProperty('basePriceFrom');
    expect(payload.stepData.unit_types.unitTypes[0]).toEqual(payload.unitTypes[0]);
    expect(payload.images).toEqual([
      { url: 'https://example.com/edit-hero.jpg', category: 'hero' },
    ]);
    expect(testState.publishDevelopmentMock).toHaveBeenCalledWith({ id: 987 });
    expect(testState.resetMock).toHaveBeenCalled();
    expect(testState.navigateMock).toHaveBeenCalledWith('/developer/developments');
  });

  it('publishes a resumed create-mode canonical draft without legacy phase fields or stale unit prices', async () => {
    testState.wizardState.editingId = undefined;

    render(<FinalisationPhase />);

    fireEvent.click(screen.getByRole('button', { name: /publish rental package/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm & publish rental/i }));

    await waitFor(() => expect(testState.createDevelopmentMock).toHaveBeenCalledTimes(1));

    expect(testState.updateDevelopmentMock).not.toHaveBeenCalled();
    const payload = testState.createDevelopmentMock.mock.calls[0][0];

    expect(payload).toMatchObject({
      workflowId: 'residential_rent',
      currentStepId: 'review_publish',
      completedSteps: ['configuration', 'identity_market', 'location', 'unit_types'],
      name: 'Finalisation Edit Rental',
      transactionType: 'for_rent',
      monthlyRentFrom: 16_000,
      monthlyRentTo: 19_000,
      totalUnits: 12,
      availableUnits: 7,
    });
    expect(payload).not.toHaveProperty('currentPhase');
    expect(payload).not.toHaveProperty('currentStep');
    expect(payload).not.toHaveProperty('editingId');
    expect(payload).not.toHaveProperty('developmentId');
    expect(payload.developmentData).not.toHaveProperty('currentPhase');
    expect(payload.developmentData).not.toHaveProperty('editingId');
    expect(payload.unitTypes[0]).toMatchObject({
      id: 'db-rent-unit-final',
      name: 'Final Rent Type',
      monthlyRentFrom: 16_000,
      monthlyRentTo: 19_000,
      totalUnits: 12,
      availableUnits: 7,
      reservedUnits: 2,
    });
    expect(payload.unitTypes[0]).not.toHaveProperty('basePriceFrom');
    expect(payload.unitTypes[0]).not.toHaveProperty('priceFrom');
    expect(payload.stepData.unit_types.unitTypes[0]).toEqual(payload.unitTypes[0]);
    expect(testState.publishDevelopmentMock).toHaveBeenCalledWith({ id: 123 });
    expect(testState.navigateMock).toHaveBeenCalledWith('/developer/developments');
  });

  it('publishes a resumed auction canonical draft without stale sale or rental unit prices', async () => {
    configureFinalisationSnapshot(makeFinalisationAuctionSnapshot(), { editingId: undefined });

    render(<FinalisationPhase />);

    fireEvent.click(screen.getByRole('button', { name: /publish auction package/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm & publish auction/i }));

    await waitFor(() => expect(testState.createDevelopmentMock).toHaveBeenCalledTimes(1));

    expect(testState.updateDevelopmentMock).not.toHaveBeenCalled();
    const payload = testState.createDevelopmentMock.mock.calls[0][0];

    expect(payload).toMatchObject({
      workflowId: 'residential_auction',
      currentStepId: 'review_publish',
      completedSteps: ['configuration', 'identity_market', 'location', 'unit_types'],
      name: 'Finalisation Auction Draft',
      transactionType: 'auction',
      auctionStartDate: '2030-02-01T09:00:00.000Z',
      auctionEndDate: '2030-02-08T17:00:00.000Z',
      startingBidFrom: 850_000,
      reservePriceFrom: 950_000,
      totalUnits: 4,
      availableUnits: 2,
    });
    expect(payload.priceFrom).toBeUndefined();
    expect(payload.priceTo).toBeUndefined();
    expect(payload.monthlyRentFrom).toBeUndefined();
    expect(payload.monthlyRentTo).toBeUndefined();
    expect(payload.unitTypes[0]).toMatchObject({
      id: 'db-auction-unit-final',
      name: 'Final Auction Lot',
      startingBid: 850_000,
      reservePrice: 950_000,
      auctionStartDate: '2030-02-01T09:00:00.000Z',
      auctionEndDate: '2030-02-08T17:00:00.000Z',
      auctionStatus: 'scheduled',
      totalUnits: 4,
      availableUnits: 2,
      reservedUnits: 1,
    });
    expect(payload.unitTypes[0]).not.toHaveProperty('basePriceFrom');
    expect(payload.unitTypes[0]).not.toHaveProperty('priceFrom');
    expect(payload.unitTypes[0]).not.toHaveProperty('monthlyRentFrom');
    expect(payload.stepData.unit_types.unitTypes[0]).toEqual(payload.unitTypes[0]);
    expect(testState.publishDevelopmentMock).toHaveBeenCalledWith({ id: 123 });
    expect(testState.navigateMock).toHaveBeenCalledWith('/developer/developments');
  });
});
