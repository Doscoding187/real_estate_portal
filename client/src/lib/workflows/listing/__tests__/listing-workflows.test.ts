/**
 * Unit tests for listing workflow resolution & step visibility logic.
 *
 * Tests:
 * 1. Workflow resolution from (action, propertyType)
 * 2. Workflow step definitions exist for all actions
 * 3. Step visibility filtering (shouldShow)
 * 4. Step-level validation
 * 5. Progress calculation
 * 6. Invalid / edge cases
 */

import { describe, it, expect } from 'vitest';
import {
  getListingWorkflow,
  getVisibleListingSteps,
  validateListingStep,
  computeListingProgress,
  findListingStep,
  LISTING_WORKFLOWS,
} from '../index';
import type { ListingWizardWorkflow, ListingWizardStep, ListingWorkflowData } from '@shared/listing-workflow-types';

// ─── Helper ──────────────────────────────────────────────────────────

const emptyData = (overrides: Partial<ListingWorkflowData> = {}): ListingWorkflowData => ({
  action: undefined,
  propertyType: undefined,
  ...overrides,
});

// ─── Workflow Resolution ─────────────────────────────────────────────

describe('getListingWorkflow', () => {
  it('returns listing_sell workflow for sell action', () => {
    const workflow = getListingWorkflow(emptyData({ action: 'sell' }));
    expect(workflow).not.toBeNull();
    expect(workflow!.id).toBe('listing_sell');
  });

  it('returns listing_rent workflow for rent action', () => {
    const workflow = getListingWorkflow(emptyData({ action: 'rent' }));
    expect(workflow).not.toBeNull();
    expect(workflow!.id).toBe('listing_rent');
  });

  it('returns listing_auction workflow for auction action', () => {
    const workflow = getListingWorkflow(emptyData({ action: 'auction' }));
    expect(workflow).not.toBeNull();
    expect(workflow!.id).toBe('listing_auction');
  });

  it('returns null when no action is selected', () => {
    const workflow = getListingWorkflow(emptyData({ action: undefined }));
    expect(workflow).toBeNull();
  });

  it('returns null for unknown action', () => {
    const workflow = getListingWorkflow(emptyData({ action: 'unknown' as any }));
    expect(workflow).toBeNull();
  });
});

// ─── Workflow Definitions ────────────────────────────────────────────

describe('Workflow Definitions', () => {
  it('registers all 3 workflows', () => {
    expect(Object.keys(LISTING_WORKFLOWS)).toHaveLength(3);
    expect(LISTING_WORKFLOWS).toHaveProperty('listing_sell');
    expect(LISTING_WORKFLOWS).toHaveProperty('listing_rent');
    expect(LISTING_WORKFLOWS).toHaveProperty('listing_auction');
  });

  it('each workflow has steps', () => {
    for (const [id, workflow] of Object.entries(LISTING_WORKFLOWS)) {
      expect(workflow.steps.length).toBeGreaterThan(0);
      expect(workflow.id).toBe(id);
    }
  });

  it('each workflow has all required step fields', () => {
    for (const workflow of Object.values(LISTING_WORKFLOWS)) {
      for (const step of workflow.steps) {
        expect(step.id).toBeDefined();
        expect(step.title).toBeDefined();
        expect(step.componentKey).toBeDefined();
        expect(typeof step.required).toBe('boolean');
        // Every workflow starts with action and property_type steps
        if (step.id === 'action') {
          expect(step.componentKey).toBe('ActionStep');
        }
        if (step.id === 'preview_publish') {
          expect(step.componentKey).toBe('PreviewStep');
        }
      }
    }
  });
});

// ─── Step Visibility ─────────────────────────────────────────────────

describe('getVisibleListingSteps', () => {
  it('returns all steps when no shouldShow conditions exist', () => {
    const workflow = getListingWorkflow(emptyData({ action: 'sell' }))!;
    const visible = getVisibleListingSteps(workflow, emptyData({ action: 'sell' }));
    expect(visible).toEqual(workflow.steps);
  });
});

// ─── Step Validation ─────────────────────────────────────────────────

describe('validateListingStep', () => {
  it('returns valid=true when step has no validator', () => {
    const workflow = getListingWorkflow(emptyData({ action: 'sell' }))!;
    const actionStep = workflow.steps.find(s => s.id === 'action')!;
    const result = validateListingStep(actionStep, emptyData());
    expect(result.valid).toBe(true);
  });

  it('rejects basic information step with short title', () => {
    const workflow = getListingWorkflow(emptyData({ action: 'sell' }))!;
    const basicInfoStep = workflow.steps.find(s => s.id === 'basic_information')!;
    const result = validateListingStep(basicInfoStep, emptyData({
      title: 'Short',
      description: '',
    }));
    expect(result.valid).toBe(false);
    expect(result.errors!.length).toBeGreaterThanOrEqual(1);
    expect(result.errors![0].field).toBe('title');
  });

  it('rejects basic information step with short description', () => {
    const workflow = getListingWorkflow(emptyData({ action: 'sell' }))!;
    const basicInfoStep = workflow.steps.find(s => s.id === 'basic_information')!;
    const result = validateListingStep(basicInfoStep, emptyData({
      title: 'A valid title with enough characters',
      description: 'Too short',
    }));
    expect(result.valid).toBe(false);
    expect(result.errors!.some(e => e.field === 'description')).toBe(true);
  });

  it('passes basic information with valid title and description', () => {
    const workflow = getListingWorkflow(emptyData({ action: 'sell' }))!;
    const basicInfoStep = workflow.steps.find(s => s.id === 'basic_information')!;
    const result = validateListingStep(basicInfoStep, emptyData({
      title: 'Modern 3-Bedroom Apartment in Sandton',
      description: 'A beautiful modern apartment located in the heart of Sandton with stunning views and premium finishes throughout the property.',
    }));
    expect(result.valid).toBe(true);
  });

  it('rejects sell pricing without asking price', () => {
    const workflow = getListingWorkflow(emptyData({ action: 'sell' }))!;
    const pricingStep = workflow.steps.find(s => s.id === 'pricing')!;
    const result = validateListingStep(pricingStep, emptyData({
      pricing: {} as any,
    }));
    expect(result.valid).toBe(false);
  });

  it('rejects sell pricing with too-low asking price', () => {
    const workflow = getListingWorkflow(emptyData({ action: 'sell' }))!;
    const pricingStep = workflow.steps.find(s => s.id === 'pricing')!;
    const result = validateListingStep(pricingStep, emptyData({
      pricing: { askingPrice: 500 } as any,
    }));
    expect(result.valid).toBe(false);
  });

  it('passes sell pricing with valid asking price', () => {
    const workflow = getListingWorkflow(emptyData({ action: 'sell' }))!;
    const pricingStep = workflow.steps.find(s => s.id === 'pricing')!;
    const result = validateListingStep(pricingStep, emptyData({
      pricing: { askingPrice: 1500000 } as any,
    }));
    expect(result.valid).toBe(true);
  });

  it('rejects location without address', () => {
    const workflow = getListingWorkflow(emptyData({ action: 'sell' }))!;
    const locationStep = workflow.steps.find(s => s.id === 'location')!;
    const result = validateListingStep(locationStep, emptyData({
      location: {} as any,
    }));
    expect(result.valid).toBe(false);
  });

  it('rejects location without coordinates', () => {
    const workflow = getListingWorkflow(emptyData({ action: 'sell' }))!;
    const locationStep = workflow.steps.find(s => s.id === 'location')!;
    const result = validateListingStep(locationStep, emptyData({
      location: { address: '123 Main St' } as any,
    }));
    expect(result.valid).toBe(false);
  });

  it('passes location with address and coordinates', () => {
    const workflow = getListingWorkflow(emptyData({ action: 'sell' }))!;
    const locationStep = workflow.steps.find(s => s.id === 'location')!;
    const result = validateListingStep(locationStep, emptyData({
      location: { address: '123 Main St', latitude: -26.2, longitude: 28.04 } as any,
    }));
    expect(result.valid).toBe(true);
  });
});

// ─── Progress Calculation ────────────────────────────────────────────

describe('computeListingProgress', () => {
  it('returns 0 for empty steps', () => {
    expect(computeListingProgress(0, 0)).toBe(0);
  });

  it('calculates correct progress for step 1 of 8', () => {
    expect(computeListingProgress(0, 8)).toBe(13);
  });

  it('calculates correct progress for step 4 of 8', () => {
    expect(computeListingProgress(3, 8)).toBe(50);
  });

  it('calculates correct progress for last step', () => {
    expect(computeListingProgress(7, 8)).toBe(100);
  });
});

// ─── findListingStep ─────────────────────────────────────────────────

describe('findListingStep', () => {
  it('finds a step by ID', () => {
    const workflow = getListingWorkflow(emptyData({ action: 'sell' }))!;
    const step = findListingStep(workflow, 'pricing');
    expect(step).not.toBeUndefined();
    expect(step!.id).toBe('pricing');
  });

  it('returns undefined for non-existent step', () => {
    const workflow = getListingWorkflow(emptyData({ action: 'sell' }))!;
    const step = findListingStep(workflow, 'bad_id' as any);
    expect(step).toBeUndefined();
  });
});