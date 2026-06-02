import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useDevelopmentWizard } from './useDevelopmentWizard';
import { buildDevelopmentUpdatePayload } from '@/lib/developmentSubmitPayload';
import { flattenCanonicalDevelopmentPayload } from '../../../server/lib/canonicalDevelopmentPayload';
import { resolveDevelopmentUpdateIntent } from '../../../server/lib/developmentUpdateIntent';
import { sanitizeDraftData } from '../../../server/lib/sanitizeDraftData';
import { buildCanonicalRentalEditSnapshotFixture } from '../../../server/test-utils/canonicalDevelopmentFixtures';

describe('useDevelopmentWizard Validation Logic', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useDevelopmentWizard());
    act(() => {
      result.current.reset();
    });
  });

  describe('Current Phase Mapping', () => {
    it('phase 1 requires a represented developer brand for marketing agencies', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      const validation = result.current.validatePhase(1);
      act(() => {
        result.current.setListingIdentity({ identityType: 'marketing_agency' });
      });

      const invalid = result.current.validatePhase(1);
      expect(invalid.isValid).toBe(false);
      expect(invalid.errors).toContain('Select the Developer Brand you are representing');

      act(() => {
        result.current.setListingIdentity({ developerBrandProfileId: 123 });
      });

      const valid = result.current.validatePhase(1);
      expect(valid.isValid).toBe(true);
    });

    it('phase 4 enforces core identity/market fields', () => {
      const { result } = renderHook(() => useDevelopmentWizard());
      const validation = result.current.validatePhase(4);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Development name is required');
      expect(validation.errors).toContain('Please select at least one ownership type');
    });

    it('phase 5 enforces location address and city', () => {
      const { result } = renderHook(() => useDevelopmentWizard());
      const invalid = result.current.validatePhase(5);
      expect(invalid.isValid).toBe(false);
      expect(invalid.errors).toContain('Location is required');
      expect(invalid.errors).toContain('City is required');

      act(() => {
        result.current.setIdentity({
          location: {
            address: '123 Main Road',
            city: 'Cape Town',
            province: 'Western Cape',
            latitude: '-33.9',
            longitude: '18.4',
          },
        });
      });

      const valid = result.current.validatePhase(5);
      expect(valid.isValid).toBe(true);
    });

    it('phase 8 enforces highlights/description only', () => {
      const { result } = renderHook(() => useDevelopmentWizard());
      act(() => {
        result.current.setIdentity({
          status: 'selling',
          highlights: ['One', 'Two'],
          description: 'Too short',
        });
      });

      const validation = result.current.validatePhase(8);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Add at least 3 key selling points');
      expect(validation.errors).toContain('Description must be at least 50 characters');
    });

    it('phase 9 enforces hero image and at least one brochure/document', () => {
      const { result } = renderHook(() => useDevelopmentWizard());
      const validation = result.current.validatePhase(9);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Hero image is required');
      expect(validation.errors).toContain('Add at least 1 brochure or document');
    });

    it('phase 10 requires unit types for non-land and skips for land', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      const requiresUnits = result.current.validatePhase(10);
      expect(requiresUnits.isValid).toBe(false);
      expect(requiresUnits.errors).toContain('Add at least one unit type');

      act(() => {
        result.current.setClassification({ type: 'land' });
      });
      const landValidation = result.current.validatePhase(10);
      expect(landValidation.isValid).toBe(true);
    });

    it('phase 10 passes with at least one unit for residential', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.setClassification({ type: 'residential' });
        result.current.addUnitType({
          name: 'Unit A',
          bedrooms: 2,
          bathrooms: 2,
          parkingType: 'carport',
          parkingBays: 1,
          priceFrom: 1000000,
          priceTo: 1200000,
          totalUnits: 10,
          availableUnits: 10,
          reservedUnits: 0,
          amenities: { standard: [], additional: [] },
        });
      });

      const validation = result.current.validatePhase(10);
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Final Publish Validation', () => {
    it('should enforce image requirement', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.setClassification({ type: 'residential' });
        result.current.setIdentity({
          name: 'Valid Development',
          ownershipType: 'sectional-title',
          transactionType: 'for_sale',
          location: {
            address: '123 Main Road',
            city: 'Cape Town',
            province: 'Western Cape',
            latitude: '-33.9',
            longitude: '18.4',
          },
          highlights: ['A', 'B', 'C', 'D'],
          description:
            'This description is long enough to pass publish validation requirements for summaries.',
        });
        result.current.addUnitType({
          name: 'Unit A',
          bedrooms: 1,
          bathrooms: 1,
          parkingType: 'carport',
          parkingBays: 1,
          priceFrom: 1000000,
          priceTo: 1100000,
          totalUnits: 10,
          availableUnits: 9,
          reservedUnits: 1,
          amenities: { standard: [], additional: [] },
        });
      });

      const validation = result.current.validateForPublish();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('At least 1 image is required');
    });

    it('rejects inverted rental unit monthly rent ranges', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.setClassification({ type: 'residential' });
        result.current.setIdentity({
          name: 'Valid Rental Development',
          status: 'planning',
          transactionType: 'for_rent',
          ownershipTypes: ['sectional-title'],
          location: {
            address: '123 Main Road',
            city: 'Cape Town',
            province: 'Western Cape',
            latitude: '-33.9',
            longitude: '18.4',
          },
          media: {
            heroImage: { id: 'hero', url: 'hero.jpg' },
            photos: [],
            videos: [],
            documents: [],
          },
          highlights: ['A', 'B', 'C'],
          description:
            'This rental description is long enough to pass publish validation requirements.',
        });
        result.current.saveWorkflowStepData('unit_types' as any, {
          unitTypes: [
            {
              id: 'rental-unit-1',
              name: 'Rental Type',
              bedrooms: 2,
              bathrooms: 2,
              monthlyRentFrom: 15_000,
              monthlyRentTo: 12_500,
              totalUnits: 10,
              availableUnits: 10,
              reservedUnits: 0,
            },
          ],
        });
      });

      const validation = result.current.validateForPublish();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        'Monthly rent upper range must be greater than or equal to monthly rent from',
      );
    });

    it('rejects inverted sale unit price ranges', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.setClassification({ type: 'residential' });
        result.current.setIdentity({
          name: 'Valid Sale Development',
          status: 'planning',
          transactionType: 'for_sale',
          ownershipTypes: ['sectional-title'],
          location: {
            address: '123 Main Road',
            city: 'Cape Town',
            province: 'Western Cape',
            latitude: '-33.9',
            longitude: '18.4',
          },
          media: {
            heroImage: { id: 'hero', url: 'hero.jpg' },
            photos: [],
            videos: [],
            documents: [],
          },
          highlights: ['A', 'B', 'C'],
          description:
            'This sale description is long enough to pass publish validation requirements.',
        });
        result.current.saveWorkflowStepData('unit_types' as any, {
          unitTypes: [
            {
              id: 'sale-unit-1',
              name: 'Sale Type',
              bedrooms: 2,
              bathrooms: 2,
              priceFrom: 1_500_000,
              priceTo: 1_200_000,
              totalUnits: 10,
              availableUnits: 10,
              reservedUnits: 0,
            },
          ],
        });
      });

      const validation = result.current.validateForPublish();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        'Price upper range must be greater than or equal to base price',
      );
    });

    it('rejects invalid auction timing through shared readiness rules', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.setClassification({ type: 'residential' });
        result.current.setIdentity({
          name: 'Valid Auction Development',
          status: 'planning',
          transactionType: 'auction',
          ownershipTypes: ['sectional-title'],
          location: {
            address: '123 Main Road',
            city: 'Cape Town',
            province: 'Western Cape',
            latitude: '-33.9',
            longitude: '18.4',
          },
          media: {
            heroImage: { id: 'hero', url: 'hero.jpg' },
            photos: [],
            videos: [],
            documents: [],
          },
          highlights: ['A', 'B', 'C'],
          description:
            'This auction description is long enough to pass publish validation requirements.',
        });
        result.current.saveWorkflowStepData('unit_types' as any, {
          unitTypes: [
            {
              id: 'auction-unit-1',
              name: 'Auction Type',
              bedrooms: 2,
              bathrooms: 2,
              startingBid: 900_000,
              reservePrice: 950_000,
              auctionStartDate: '2099-05-01T10:00:00.000Z',
              auctionEndDate: '2099-05-01T09:00:00.000Z',
              totalUnits: 10,
              availableUnits: 10,
              reservedUnits: 0,
            },
          ],
        });
      });

      const validation = result.current.validateForPublish();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Auction end date must be after the start date');
    });

    it('rejects invalid inventory through shared readiness rules', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.setClassification({ type: 'residential' });
        result.current.setIdentity({
          name: 'Valid Inventory Development',
          status: 'planning',
          transactionType: 'for_sale',
          ownershipTypes: ['sectional-title'],
          location: {
            address: '123 Main Road',
            city: 'Cape Town',
            province: 'Western Cape',
            latitude: '-33.9',
            longitude: '18.4',
          },
          media: {
            heroImage: { id: 'hero', url: 'hero.jpg' },
            photos: [],
            videos: [],
            documents: [],
          },
          highlights: ['A', 'B', 'C'],
          description:
            'This inventory description is long enough to pass publish validation requirements.',
        });
        result.current.saveWorkflowStepData('unit_types' as any, {
          unitTypes: [
            {
              id: 'inventory-unit-1',
              name: 'Inventory Type',
              bedrooms: 2,
              bathrooms: 2,
              priceFrom: 1_500_000,
              totalUnits: 10,
              availableUnits: 8,
              reservedUnits: 3,
            },
          ],
        });
      });

      const validation = result.current.validateForPublish();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        'Each unit type must satisfy available + reserved <= total units',
      );
    });
  });

  describe('Canonical draft snapshot', () => {
    it('getDraftData includes workflow state, stepData, developmentData, and canonical unitTypes', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.initializeWorkflow('residential', 'for_sale');
        useDevelopmentWizard.setState({
          currentStepId: 'unit_types' as any,
          completedSteps: ['identity_market', 'configuration'] as any,
        });
        result.current.saveWorkflowStepData('unit_types' as any, {
          unitTypes: [
            {
              id: 'db-unit-1',
              name: 'Type A',
              bedrooms: 2,
              bathrooms: 2,
              priceFrom: 1500000,
              totalUnits: 10,
              availableUnits: 8,
            },
          ],
        });
      });

      const draft = result.current.getDraftData();

      expect(draft.workflowId).toBe('residential_sale');
      expect(draft.currentStepId).toBe('unit_types');
      expect(draft.completedSteps).toEqual(['identity_market', 'configuration']);
      expect(draft.stepData.unit_types.unitTypes[0].id).toBe('db-unit-1');
      expect(draft.unitTypes[0].id).toBe('db-unit-1');
      expect(draft.developmentData).toBeDefined();
      expect(draft._version).toBe('3.0');
      expect(draft._savedAt).toBeDefined();
    });

    it('getDraftData promotes canonical step slices over stale developmentData mirrors', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.initializeWorkflow('residential', 'for_sale');
        result.current.saveWorkflowStepData('configuration' as any, {
          developmentType: 'residential',
          transactionType: 'for_sale',
        });
        result.current.saveWorkflowStepData('identity_market' as any, {
          name: 'Canonical Manual Save',
          subtitle: 'Step owned subtitle',
          status: 'selling',
          nature: 'new',
          transactionType: 'for_sale',
          ownershipTypes: ['sectional-title'],
          launchDate: '2026-09-01',
          completionDate: '2027-07-31',
        });
        result.current.saveWorkflowStepData('location' as any, {
          address: '8 Canonical Lane',
          city: 'Cape Town',
          province: 'Western Cape',
          suburb: 'Green Point',
          postalCode: '8051',
        });
        result.current.saveWorkflowStepData('governance_finances' as any, {
          levyRange: { min: 1800, max: 2300 },
          rightsAndTaxes: { min: 950, max: 1250 },
          transferCostsIncluded: true,
        });
        result.current.saveWorkflowStepData('amenities_features' as any, {
          amenities: ['Pool'],
          features: ['Solar ready'],
        });
        result.current.saveWorkflowStepData('marketing_summary' as any, {
          description: 'Canonical manual save description that should beat stale root data.',
          tagline: 'Canonical save tagline',
          keySellingPoints: ['Sea views', 'Secure parking', 'Low levies'],
        });
        result.current.saveWorkflowStepData('development_media' as any, {
          heroImage: { id: 'hero-step', url: 'https://example.com/hero.jpg' },
          photos: [{ id: 'photo-step', url: 'https://example.com/photo.jpg' }],
          videos: [],
          documents: [],
        });
        result.current.saveWorkflowStepData('unit_types' as any, {
          unitTypes: [
            {
              id: 'step-unit-1',
              name: 'Step Unit',
              bedrooms: 2,
              bathrooms: 2,
              priceFrom: 1_550_000,
              monthlyRentFrom: 15_000,
              totalUnits: 10,
              availableUnits: 7,
              reservedUnits: 1,
            },
          ],
        });

        const current = useDevelopmentWizard.getState();
        useDevelopmentWizard.setState({
          developmentData: {
            ...current.developmentData,
            name: 'Stale Root Name',
            description: 'Stale root description',
            transactionType: 'for_rent' as any,
            status: 'planning' as any,
            launchDate: null,
            monthlyLevyFrom: 99,
            monthlyLevyTo: 199,
            ratesFrom: 88,
            ratesTo: 188,
            transferCostsIncluded: false,
            location: {
              ...current.developmentData.location,
              city: 'Old City',
              province: 'Old Province',
            },
            media: {
              ...current.developmentData.media,
              heroImage: { id: 'old-hero', url: 'https://example.com/old.jpg' },
            },
          },
        });
      });

      const draft = result.current.getDraftData();

      expect(draft.developmentData).toMatchObject({
        name: 'Canonical Manual Save',
        description: 'Canonical manual save description that should beat stale root data.',
        transactionType: 'for_sale',
        status: 'selling',
        ownershipTypes: ['sectional-title'],
        ownershipType: 'sectional-title',
        launchDate: '2026-09-01',
        completionDate: '2027-07-31',
        monthlyLevyFrom: 1800,
        monthlyLevyTo: 2300,
        ratesFrom: 950,
        ratesTo: 1250,
        transferCostsIncluded: true,
        amenities: ['Pool'],
        features: ['Solar ready'],
        highlights: ['Sea views', 'Secure parking', 'Low levies'],
        location: {
          address: '8 Canonical Lane',
          city: 'Cape Town',
          province: 'Western Cape',
          suburb: 'Green Point',
          postalCode: '8051',
        },
      });
      expect(draft.name).toBe('Canonical Manual Save');
      expect(draft.status).toBe('selling');
      expect(draft.marketingRole).toBe(draft.developmentData.marketingRole);
      expect(draft.ownershipTypes).toEqual(['sectional-title']);
      expect(draft.developmentData.media.heroImage).toMatchObject({ id: 'hero-step' });
      expect(draft.stepData.identity_market.name).toBe('Canonical Manual Save');
      expect(draft.stepData.location.city).toBe('Cape Town');
      expect(draft.stepData.marketing_summary.description).toBe(
        'Canonical manual save description that should beat stale root data.',
      );
      expect(draft.unitTypes[0]).toMatchObject({ id: 'step-unit-1', priceFrom: 1_550_000 });
      expect(draft.unitTypes[0]).not.toHaveProperty('monthlyRentFrom');
      expect(draft.stepData.unit_types.unitTypes[0]).toEqual(draft.unitTypes[0]);
    });

    it('saveDraft emits the canonical snapshot used by manual draft persistence', async () => {
      const { result } = renderHook(() => useDevelopmentWizard());
      let savedPayload: any;

      act(() => {
        result.current.initializeWorkflow('residential', 'for_sale');
        useDevelopmentWizard.setState({
          currentStepId: 'unit_types' as any,
          completedSteps: ['identity_market', 'configuration'] as any,
        });
        result.current.saveWorkflowStepData('unit_types' as any, {
          unitTypes: [
            {
              id: 'db-unit-1',
              name: 'Type A',
              bedrooms: 2,
              bathrooms: 2,
              priceFrom: 1500000,
              monthlyRentFrom: 12000,
              totalUnits: 10,
              availableUnits: 8,
            },
          ],
        });
      });

      await act(async () => {
        await result.current.saveDraft(async data => {
          savedPayload = data;
        });
      });

      expect(savedPayload.workflowId).toBe('residential_sale');
      expect(savedPayload.currentStepId).toBe('unit_types');
      expect(savedPayload.completedSteps).toEqual(['identity_market', 'configuration']);
      expect(savedPayload.developmentData.transactionType).toBe('for_sale');
      expect(savedPayload.unitTypes[0].id).toBe('db-unit-1');
      expect(savedPayload.unitTypes[0]).not.toHaveProperty('monthlyRentFrom');
      expect(savedPayload.stepData.unit_types.unitTypes[0]).toEqual(savedPayload.unitTypes[0]);
    });

    it('getDraftData strips unit pricing fields that do not match the active transaction type', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.initializeWorkflow('residential', 'auction');
        result.current.saveWorkflowStepData('unit_types' as any, {
          unitTypes: [
            {
              id: 'auction-unit-1',
              name: 'Auction Type',
              bedrooms: 3,
              bathrooms: 2,
              priceFrom: 1500000,
              monthlyRentFrom: 12000,
              startingBid: 900000,
              auctionStartDate: '2026-10-01T09:00',
              auctionStatus: 'scheduled',
            },
          ],
        });
      });

      const draft = result.current.getDraftData();
      const unit = draft.unitTypes[0];

      expect(draft.developmentData.transactionType).toBe('auction');
      expect(unit).toMatchObject({
        id: 'auction-unit-1',
        startingBid: 900000,
        auctionStartDate: '2026-10-01T09:00',
        auctionStatus: 'scheduled',
      });
      expect(unit).not.toHaveProperty('priceFrom');
      expect(unit).not.toHaveProperty('monthlyRentFrom');
      expect(result.current.stepData.unit_types.unitTypes[0]).toEqual(unit);
      expect(draft.stepData.unit_types.unitTypes[0]).toEqual(unit);
    });

    it('unit actions write through the canonical unit_types step slice', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.initializeWorkflow('residential', 'for_rent');
        result.current.addUnitType({
          name: 'Rental Unit',
          bedrooms: 2,
          bathrooms: 2,
          parkingType: 'carport',
          parkingBays: 1,
          priceFrom: 1_500_000,
          monthlyRentFrom: 15_000,
          totalUnits: 10,
          availableUnits: 8,
          reservedUnits: 1,
          amenities: { standard: [], additional: [] },
        });
      });

      const createdId = result.current.unitTypes[0].id;
      expect(result.current.unitTypes[0]).not.toHaveProperty('priceFrom');
      expect(result.current.stepData.unit_types.unitTypes[0]).toEqual(result.current.unitTypes[0]);

      act(() => {
        result.current.updateUnitType(createdId, {
          priceFrom: 2_000_000,
          monthlyRentTo: 14_000,
        } as any);
      });

      expect(result.current.unitTypes[0]).not.toHaveProperty('priceFrom');
      expect(result.current.unitTypes[0].monthlyRentTo).toBe(14_000);
      expect(result.current.stepData.unit_types.unitTypes[0]).toEqual(result.current.unitTypes[0]);

      act(() => {
        result.current.deleteUnitType(createdId);
      });

      expect(result.current.unitTypes).toEqual([]);
      expect(result.current.stepData.unit_types.unitTypes).toEqual([]);
    });

    it('hydrateDevelopment restores draft workflow state and completed steps', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.hydrateDevelopment({
          _version: '3.0',
          workflowId: 'residential_sale',
          currentStepId: 'unit_types',
          completedSteps: ['identity_market', 'configuration'],
          developmentType: 'residential',
          developmentData: {
            name: 'Drafted Development',
            description: 'A draft with workflow state',
            transactionType: 'for_sale',
            status: 'selling',
            location: {
              address: '1 Main Road',
              city: 'Cape Town',
              province: 'Western Cape',
            },
            media: { photos: [], videos: [], documents: [] },
          },
          stepData: {
            identity_market: {
              name: 'Drafted Development',
              transactionType: 'for_sale',
            },
            unit_types: {
              unitTypes: [{ id: 'db-unit-1', name: 'Type A', bedrooms: 2, bathrooms: 2 }],
            },
          },
          unitTypes: [{ id: 'db-unit-1', name: 'Type A', bedrooms: 2, bathrooms: 2 }],
        });
      });

      expect(result.current.workflowId).toBe('residential_sale');
      expect(result.current.currentStepId).toBe('unit_types');
      expect(result.current.completedSteps).toEqual(['configuration', 'identity_market']);
      expect(result.current.stepData.unit_types.unitTypes[0].id).toBe('db-unit-1');
      expect(result.current.unitTypes[0].id).toBe('db-unit-1');
    });

    it('hydrateDevelopment normalizes draft workflow state before resume', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.hydrateDevelopment({
          _version: '3.0',
          workflowId: ' residential_sale ',
          currentStepId: 'phase-10',
          completedSteps: ['configuration', 'identity_market', 'configuration', 'not_real'],
          developmentType: 'residential',
          developmentData: {
            name: 'Workflow Normalized Draft',
            description: 'A draft with malformed workflow state',
            transactionType: 'for_sale',
            status: 'planning',
            media: { photos: [], videos: [], documents: [] },
          },
          unitTypes: [],
        });
      });

      expect(result.current.workflowId).toBe('residential_sale');
      expect(result.current.currentStepId).toBe('location');
      expect(result.current.completedSteps).toEqual(['configuration', 'identity_market']);
    });

    it('hydrateDevelopment restores canonical stepData unit types when root unitTypes is missing', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.hydrateDevelopment({
          _version: '3.0',
          workflowId: 'residential_rent',
          currentStepId: 'unit_types',
          completedSteps: ['identity_market', 'configuration'],
          developmentType: 'residential',
          developmentData: {
            name: 'Step Data Only Draft',
            description: 'A canonical draft where inventory only lives in stepData',
            transactionType: 'for_rent',
            status: 'planning',
            media: { photos: [], videos: [], documents: [] },
          },
          stepData: {
            identity_market: {
              name: 'Step Data Only Draft',
              transactionType: 'for_rent',
            },
            unit_types: {
              unitTypes: [
                {
                  id: 'step-rental-unit',
                  name: 'Step Rental Unit',
                  bedrooms: 2,
                  bathrooms: 2,
                  priceFrom: 1_500_000,
                  monthlyRentFrom: 18_000,
                  monthlyRentTo: 20_000,
                  totalUnits: 10,
                  availableUnits: 8,
                  reservedUnits: 1,
                },
              ],
            },
          },
        });
      });

      expect(result.current.workflowId).toBe('residential_rent');
      expect(result.current.currentStepId).toBe('unit_types');
      expect(result.current.unitTypes).toHaveLength(1);
      expect(result.current.unitTypes[0]).toMatchObject({
        id: 'step-rental-unit',
        monthlyRentFrom: 18_000,
        monthlyRentTo: 20_000,
      });
      expect(result.current.unitTypes[0]).not.toHaveProperty('priceFrom');
      expect(result.current.stepData.unit_types.unitTypes[0]).toEqual(result.current.unitTypes[0]);
    });

    it('hydrateDevelopment falls back to root unitTypes when legacy stepData only carries unit ids', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.hydrateDevelopment({
          _version: '3.0',
          workflowId: 'residential_sale',
          currentStepId: 'unit_types',
          completedSteps: ['identity_market', 'configuration'],
          developmentType: 'residential',
          developmentData: {
            name: 'Legacy Unit Reference Draft',
            description: 'A draft with legacy ID-only unit references in stepData',
            transactionType: 'for_sale',
            status: 'selling',
            media: { photos: [], videos: [], documents: [] },
          },
          stepData: {
            identity_market: {
              name: 'Legacy Unit Reference Draft',
              transactionType: 'for_sale',
            },
            unit_types: {
              unitTypes: [{ id: 'db-unit-1' }],
            },
          },
          unitTypes: [
            {
              id: 'db-unit-1',
              name: 'Full DB Unit',
              bedrooms: 2,
              bathrooms: 2,
              basePriceFrom: '1500000.00',
              basePriceTo: '1650000.00',
              monthlyRentFrom: '14000.00',
              totalUnits: '10',
              availableUnits: '7',
              reservedUnits: '1',
            },
          ],
        });
      });

      expect(result.current.workflowId).toBe('residential_sale');
      expect(result.current.currentStepId).toBe('unit_types');
      expect(result.current.unitTypes[0]).toMatchObject({
        id: 'db-unit-1',
        label: 'Full DB Unit',
        priceFrom: 1_500_000,
        priceTo: 1_650_000,
        totalUnits: 10,
        availableUnits: 7,
        reservedUnits: 1,
      });
      expect(result.current.unitTypes[0]).not.toHaveProperty('monthlyRentFrom');
      expect(result.current.stepData.unit_types.unitTypes[0]).toEqual(result.current.unitTypes[0]);
    });

    it('hydrateDevelopment strips stale unit pricing fields from restored draft stepData', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.hydrateDevelopment({
          _version: '3.0',
          workflowId: 'residential_rent',
          currentStepId: 'unit_types',
          completedSteps: ['identity_market'],
          developmentType: 'residential',
          developmentData: {
            name: 'Rental Draft',
            description: 'A draft with stale unit fields',
            transactionType: 'for_rent',
            status: 'planning',
            media: { photos: [], videos: [], documents: [] },
          },
          stepData: {
            identity_market: {
              name: 'Rental Draft',
              transactionType: 'for_rent',
            },
            unit_types: {
              unitTypes: [
                {
                  id: 'rental-unit-1',
                  name: 'Rental Type',
                  bedrooms: 2,
                  bathrooms: 2,
                  priceFrom: 1_500_000,
                  monthlyRentFrom: 15_000,
                  monthlyRentTo: 12_500,
                  startingBid: 900_000,
                },
              ],
            },
          },
          unitTypes: [
            {
              id: 'rental-unit-1',
              name: 'Rental Type',
              bedrooms: 2,
              bathrooms: 2,
              priceFrom: 1_500_000,
              monthlyRentFrom: 15_000,
              monthlyRentTo: 12_500,
              startingBid: 900_000,
            },
          ],
        });
      });

      const unit = result.current.unitTypes[0] as any;
      const stepUnit = result.current.stepData.unit_types.unitTypes[0] as any;

      expect(unit).toMatchObject({
        id: 'rental-unit-1',
        monthlyRentFrom: 15_000,
        monthlyRentTo: 15_000,
      });
      expect(unit).not.toHaveProperty('priceFrom');
      expect(unit).not.toHaveProperty('startingBid');
      expect(stepUnit).toMatchObject({
        id: 'rental-unit-1',
        monthlyRentFrom: 15_000,
        monthlyRentTo: 15_000,
      });
      expect(stepUnit).not.toHaveProperty('priceFrom');
      expect(stepUnit).not.toHaveProperty('priceTo');
      expect(stepUnit).not.toHaveProperty('basePriceFrom');
      expect(stepUnit).not.toHaveProperty('startingBid');
      expect(stepUnit).not.toHaveProperty('reservePrice');
    });

    it('hydrateDevelopment promotes canonical edit step slices over stale root mirrors', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.hydrateDevelopment({
          id: 456,
          workflowId: 'residential_sale',
          currentStepId: 'marketing_summary',
          completedSteps: ['configuration', 'identity_market', 'location', 'unit_types'],
          developmentType: 'residential',
          transactionType: 'for_rent',
          name: 'Stale Root Name',
          description: 'Stale root description',
          status: 'planning',
          city: 'Old City',
          province: 'Old Province',
          developmentData: {
            name: 'Stale Nested Name',
            description: 'Stale nested description',
            transactionType: 'for_rent',
            status: 'planning',
            monthlyLevyFrom: 100,
            ratesFrom: 50,
            location: {
              address: 'Old Address',
              city: 'Old City',
              province: 'Old Province',
            },
            media: {
              heroImage: { id: 'old-hero', url: 'https://example.com/old.jpg' },
              photos: [],
              videos: [],
              documents: [],
            },
          },
          stepData: {
            configuration: {
              developmentType: 'residential',
              transactionType: 'for_sale',
            },
            identity_market: {
              name: 'Canonical Edit Name',
              subtitle: 'Canonical edit subtitle',
              status: 'selling',
              nature: 'new',
              transactionType: 'for_sale',
              ownershipTypes: ['sectional-title'],
              launchDate: '2026-09-01',
              completionDate: '2027-07-31',
            },
            location: {
              address: '8 Canonical Lane',
              city: 'Cape Town',
              province: 'Western Cape',
              suburb: 'Green Point',
              postalCode: '8051',
            },
            governance_finances: {
              levyRange: { min: 1800, max: 2300 },
              rightsAndTaxes: { min: 950, max: 1250 },
              transferCostsIncluded: true,
            },
            amenities_features: {
              amenities: ['Pool'],
              features: ['Solar ready'],
            },
            marketing_summary: {
              description: 'Canonical edit description that should beat stale root data.',
              tagline: 'Canonical edit tagline',
              keySellingPoints: ['Sea views', 'Secure parking', 'Low levies'],
            },
            development_media: {
              heroImage: { id: 'hero-step', url: 'https://example.com/hero.jpg' },
              photos: [{ id: 'photo-step', url: 'https://example.com/photo.jpg' }],
              videos: [],
              documents: [],
            },
            unit_types: {
              unitTypes: [
                {
                  id: 'edit-unit-1',
                  name: 'Edit Unit',
                  bedrooms: 2,
                  bathrooms: 2,
                  priceFrom: 1_550_000,
                  monthlyRentFrom: 15_000,
                  totalUnits: 10,
                  availableUnits: 7,
                  reservedUnits: 1,
                },
              ],
            },
          },
        });
      });

      expect(result.current.editingId).toBe(456);
      expect(result.current.workflowId).toBe('residential_sale');
      expect(result.current.currentStepId).toBe('marketing_summary');
      expect(result.current.completedSteps).toEqual([
        'configuration',
        'identity_market',
        'location',
        'unit_types',
      ]);
      expect(result.current.developmentData).toMatchObject({
        name: 'Canonical Edit Name',
        description: 'Canonical edit description that should beat stale root data.',
        transactionType: 'for_sale',
        status: 'selling',
        ownershipTypes: ['sectional-title'],
        ownershipType: 'sectional-title',
        monthlyLevyFrom: 1800,
        monthlyLevyTo: 2300,
        ratesFrom: 950,
        ratesTo: 1250,
        transferCostsIncluded: true,
        amenities: ['Pool'],
        features: ['Solar ready'],
        highlights: ['Sea views', 'Secure parking', 'Low levies'],
        location: {
          address: '8 Canonical Lane',
          city: 'Cape Town',
          province: 'Western Cape',
          suburb: 'Green Point',
          postalCode: '8051',
        },
      });
      expect(result.current.developmentData.media.heroImage).toMatchObject({ id: 'hero-step' });
      expect(result.current.stepData.identity_market.name).toBe('Canonical Edit Name');
      expect(result.current.stepData.location.city).toBe('Cape Town');
      expect(result.current.stepData.governance_finances.levyRange).toEqual({
        min: 1800,
        max: 2300,
      });
      expect(result.current.unitTypes[0]).toMatchObject({
        id: 'edit-unit-1',
        priceFrom: 1_550_000,
      });
      expect(result.current.unitTypes[0]).not.toHaveProperty('monthlyRentFrom');
      expect(result.current.stepData.unit_types.unitTypes[0]).toEqual(result.current.unitTypes[0]);
    });

    it('captures loaded edit canonical snapshot as a stable partial-save baseline', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.hydrateDevelopment({
          id: 654,
          workflowId: 'residential_rent',
          currentStepId: 'unit_types',
          completedSteps: ['configuration', 'identity_market'],
          developmentType: 'residential',
          developmentData: {
            name: 'Persisted Edit Baseline',
            description: 'Loaded edit state used as the immutable save baseline.',
            transactionType: 'for_rent',
            status: 'selling',
            media: { photos: [], videos: [], documents: [] },
          },
          stepData: {
            identity_market: {
              name: 'Persisted Edit Baseline',
              transactionType: 'for_rent',
              status: 'selling',
            },
            unit_types: {
              unitTypes: [
                {
                  id: 'baseline-unit-1',
                  name: 'Baseline Rental Unit',
                  bedrooms: 2,
                  bathrooms: 2,
                  monthlyRentFrom: 12_000,
                  monthlyRentTo: 14_000,
                  totalUnits: 8,
                  availableUnits: 5,
                },
              ],
            },
          },
        });
      });

      const baseline = result.current.getPersistedEditSnapshot();
      expect(baseline).toMatchObject({
        editingId: 654,
        developmentId: 654,
        workflowId: 'residential_rent',
        currentStepId: 'unit_types',
        developmentData: {
          name: 'Persisted Edit Baseline',
          transactionType: 'for_rent',
        },
      });
      expect(baseline?.unitTypes[0]).toMatchObject({
        id: 'baseline-unit-1',
        monthlyRentFrom: 12_000,
      });

      act(() => {
        result.current.updateUnitType('baseline-unit-1', {
          monthlyRentFrom: 16_000,
        } as any);
      });

      expect(result.current.unitTypes[0]).toMatchObject({ monthlyRentFrom: 16_000 });
      expect(result.current.getPersistedEditSnapshot()?.unitTypes[0]).toMatchObject({
        id: 'baseline-unit-1',
        monthlyRentFrom: 12_000,
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.getPersistedEditSnapshot()).toBeNull();
    });

    it('roundtrips edit hydration through manual draft snapshot and server canonical flattening', () => {
      const editSnapshot = buildCanonicalRentalEditSnapshotFixture();
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.hydrateDevelopment(editSnapshot);
      });

      const manualDraftSnapshot = result.current.getDraftData();
      const sanitizedDraft = sanitizeDraftData(manualDraftSnapshot);
      const flattened = flattenCanonicalDevelopmentPayload(sanitizedDraft);

      expect(manualDraftSnapshot.workflowId).toBe('residential_rent');
      expect(manualDraftSnapshot.currentStepId).toBe(editSnapshot.currentStepId);
      expect(manualDraftSnapshot.editingId).toBe(editSnapshot.id);
      expect(manualDraftSnapshot.developmentId).toBe(editSnapshot.id);
      expect(manualDraftSnapshot.stepData.unit_types.unitTypes[0]).toEqual(
        manualDraftSnapshot.unitTypes[0],
      );
      expect(sanitizedDraft.editingId).toBe(editSnapshot.id);
      expect(sanitizedDraft.developmentId).toBe(editSnapshot.id);
      expect(sanitizedDraft.stepData.unit_types.unitTypes[0]).toBe(sanitizedDraft.unitTypes[0]);
      expect(flattened).toMatchObject({
        name: 'Canonical Rental Edit',
        transactionType: 'for_rent',
        city: 'Cape Town',
        province: 'Western Cape',
        suburb: 'Sea Point',
      });
      expect(flattened.unitTypes[0]).toMatchObject({
        id: 'rent-unit-db-1',
        name: 'Rental Type A',
        monthlyRentFrom: 14_500,
        monthlyRentTo: 18_000,
        totalUnits: 12,
        availableUnits: 8,
        reservedUnits: 2,
      });
      expect(flattened.unitTypes[0]).not.toHaveProperty('basePriceFrom');
      expect(flattened.unitTypes[0]).not.toHaveProperty('priceFrom');
      expect(flattened.unitTypes[0]).not.toHaveProperty('startingBid');

      act(() => {
        result.current.reset();
        result.current.hydrateDevelopment({ draftData: sanitizedDraft });
      });

      const resumedWizardData = result.current.getWizardData();
      const resumedDraftSnapshot = result.current.getDraftData();
      expect(result.current.editingId).toBe(editSnapshot.id);
      expect(resumedDraftSnapshot.editingId).toBe(editSnapshot.id);
      expect(resumedDraftSnapshot.developmentId).toBe(editSnapshot.id);
      expect(resumedDraftSnapshot.currentPhase).toBeDefined();
      expect(resumedDraftSnapshot._version).toBe('3.0');
      expect(resumedDraftSnapshot.overview).toBeDefined();
      expect(resumedDraftSnapshot.finalisation).toBeDefined();
      const updatePayload = buildDevelopmentUpdatePayload({
        wizardData: resumedWizardData as any,
        amenities: resumedWizardData.amenities ?? [],
        canonicalSnapshot: resumedDraftSnapshot,
        residentialConfig: result.current.residentialConfig as any,
      });

      expect(resolveDevelopmentUpdateIntent(updatePayload)).toMatchObject({
        unitTypesMode: 'canonical_full_sync',
        deleteMissingUnitTypes: true,
      });
      expect(updatePayload).toMatchObject({
        workflowId: 'residential_rent',
        currentStepId: editSnapshot.currentStepId,
        name: 'Canonical Rental Edit',
        transactionType: 'for_rent',
        monthlyRentFrom: 14_500,
        monthlyRentTo: 18_000,
      });
      expect(updatePayload).not.toHaveProperty('editingId');
      expect(updatePayload).not.toHaveProperty('developmentId');
      expect(updatePayload).not.toHaveProperty('currentPhase');
      expect(updatePayload).not.toHaveProperty('currentStep');
      expect(updatePayload).not.toHaveProperty('_version');
      expect(updatePayload).not.toHaveProperty('_savedAt');
      expect(updatePayload).not.toHaveProperty('overview');
      expect(updatePayload).not.toHaveProperty('finalisation');
      expect(updatePayload.developmentData).not.toHaveProperty('editingId');
      expect(updatePayload.developmentData).not.toHaveProperty('developmentId');
      expect(updatePayload.developmentData).not.toHaveProperty('currentPhase');
      expect(updatePayload.unitTypes[0]).toMatchObject({
        id: 'rent-unit-db-1',
        name: 'Rental Type A',
        monthlyRentFrom: 14_500,
        monthlyRentTo: 18_000,
        totalUnits: 12,
        availableUnits: 8,
        reservedUnits: 2,
      });
      expect(updatePayload.unitTypes[0]).not.toHaveProperty('basePriceFrom');
      expect(updatePayload.unitTypes[0]).not.toHaveProperty('priceFrom');
      expect(updatePayload.stepData.unit_types.unitTypes[0]).toEqual(updatePayload.unitTypes[0]);

      const flattenedUpdatePayload = flattenCanonicalDevelopmentPayload(updatePayload);
      expect(flattenedUpdatePayload.unitTypes[0]).toEqual(updatePayload.unitTypes[0]);
      expect(flattenedUpdatePayload).toMatchObject({
        name: 'Canonical Rental Edit',
        transactionType: 'for_rent',
        monthlyRentFrom: 14_500,
        monthlyRentTo: 18_000,
      });
    });

    it('DB edit hydration ignores stale local workflow step', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        useDevelopmentWizard.setState({
          workflowId: 'residential_rent' as any,
          currentStepId: 'review_publish' as any,
          completedSteps: ['configuration', 'identity_market', 'location'] as any,
        });

        result.current.hydrateDevelopment({
          id: 123,
          name: 'DB Development',
          description: 'A DB edit row without a saved wizard snapshot',
          developmentType: 'residential',
          transactionType: 'for_sale',
          status: 'selling',
          address: '1 Main Road',
          city: 'Cape Town',
          province: 'Western Cape',
          propertyTypes: JSON.stringify(['apartment']),
          images: JSON.stringify(['https://example.com/db-photo.jpg']),
          unitTypes: [
            {
              id: 'db-unit-1',
              name: 'Type A',
              bedrooms: 2,
              bathrooms: 2,
              specifications: JSON.stringify({
                classification: { category: 'house', subType: 'duplex' },
              }),
              basePriceFrom: '1500000.00',
              basePriceTo: '1750000.00',
              unitSize: '85',
              parkingType: 'carport',
              parkingBays: '2',
              totalUnits: '10',
              availableUnits: '7',
              reservedUnits: '1',
            },
          ],
        });
      });

      expect(result.current.workflowId).toBeNull();
      expect(result.current.currentStepId).toBeNull();
      expect(result.current.completedSteps).toEqual([]);
      expect(result.current.editingId).toBe(123);
      expect(result.current.developmentData.propertyTypes).toEqual(['apartment']);
      expect(result.current.developmentData.media.heroImage).toMatchObject({
        url: 'https://example.com/db-photo.jpg',
        category: 'featured',
        isPrimary: true,
      });
      expect(result.current.developmentData.media.photos[0]).toMatchObject({
        url: 'https://example.com/db-photo.jpg',
      });
      expect(result.current.unitTypes[0]).toMatchObject({
        id: 'db-unit-1',
        label: 'Type A',
        priceFrom: 1500000,
        priceTo: 1750000,
        unitSize: 85,
        unitCategory: 'house',
        unitSubType: 'duplex',
        parkingType: 'carport',
        parkingBays: 2,
        totalUnits: 10,
        availableUnits: 7,
        reservedUnits: 1,
      });
      expect(result.current.unitTypes[0].specifications.classification).toEqual({
        category: 'house',
        subType: 'duplex',
      });
      expect(result.current.stepData.unit_types.unitTypes[0]).toEqual(result.current.unitTypes[0]);

      act(() => {
        result.current.initializeWorkflow('residential', 'for_sale');
      });

      expect(result.current.workflowId).toBe('residential_sale');
      expect(result.current.currentStepId).toBe('configuration');
      expect(result.current.currentStepId).not.toBe('review_publish');

      const draft = result.current.getDraftData();
      expect(draft.unitTypes[0].id).toBe('db-unit-1');
      expect(draft.stepData.unit_types.unitTypes[0]).toEqual(draft.unitTypes[0]);
    });

    it('partial DB edit hydration preserves omitted canonical development and unit fields', () => {
      const { result } = renderHook(() => useDevelopmentWizard());

      act(() => {
        result.current.saveWorkflowStepData('unit_types' as any, {
          unitTypes: [
            {
              id: 'existing-unit-1',
              name: 'Existing Unit',
              bedrooms: 2,
              bathrooms: 2,
              priceFrom: 1_450_000,
              totalUnits: 10,
              availableUnits: 6,
            },
          ],
        });
        result.current.setIdentity({
          name: 'Existing Canonical Name',
          description: 'Existing canonical description that should survive partial hydration.',
          status: 'planning',
          transactionType: 'for_sale',
          location: {
            address: 'Existing Address',
            city: 'Cape Town',
            province: 'Western Cape',
            suburb: 'Sea Point',
            postalCode: '8005',
          },
          media: {
            heroImage: { id: 'existing-hero', url: 'https://example.com/existing-hero.jpg' },
            photos: [{ id: 'existing-photo', url: 'https://example.com/existing-photo.jpg' }],
            videos: [],
            documents: [],
          },
          monthlyLevyFrom: 1_250,
          ratesFrom: 950,
        } as any);

        result.current.hydrateDevelopment({
          id: 789,
          developmentType: 'residential',
          transactionType: 'for_sale',
          status: 'selling',
        });
      });

      expect(result.current.editingId).toBe(789);
      expect(result.current.developmentData).toMatchObject({
        name: 'Existing Canonical Name',
        description: 'Existing canonical description that should survive partial hydration.',
        status: 'selling',
        transactionType: 'for_sale',
        monthlyLevyFrom: 1_250,
        ratesFrom: 950,
        location: {
          address: 'Existing Address',
          city: 'Cape Town',
          province: 'Western Cape',
          suburb: 'Sea Point',
          postalCode: '8005',
        },
      });
      expect(result.current.developmentData.media.heroImage).toMatchObject({
        id: 'existing-hero',
      });
      expect(result.current.developmentData.media.photos).toEqual([
        { id: 'existing-photo', url: 'https://example.com/existing-photo.jpg' },
      ]);
      expect(result.current.unitTypes[0]).toMatchObject({
        id: 'existing-unit-1',
        name: 'Existing Unit',
        priceFrom: 1_450_000,
      });
      expect(result.current.stepData.unit_types.unitTypes[0]).toEqual(result.current.unitTypes[0]);
    });
  });
});
