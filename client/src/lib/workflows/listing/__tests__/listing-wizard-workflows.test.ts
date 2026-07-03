import { describe, it, expect } from 'vitest';
import { getListingWorkflow, getVisibleListingSteps } from '../index';

describe('Listing wizard workflow registry', () => {
  it('resolves "sell" to the sale workflow', () => {
    const workflow = getListingWorkflow({ action: 'sell' });
    expect(workflow).not.toBeNull();
    expect(workflow!.id).toBe('listing_sell');
    expect(workflow!.title).toContain('Sell');
  });

  it('resolves "rent" to the rent workflow', () => {
    const workflow = getListingWorkflow({ action: 'rent' });
    expect(workflow).not.toBeNull();
    expect(workflow!.id).toBe('listing_rent');
    expect(workflow!.title).toContain('Rent');
  });

  it('resolves "auction" to the auction workflow', () => {
    const workflow = getListingWorkflow({ action: 'auction' });
    expect(workflow).not.toBeNull();
    expect(workflow!.id).toBe('listing_auction');
    expect(workflow!.title).toContain('Auction');
  });

  it('returns null for an unknown action', () => {
    const workflow = getListingWorkflow({ action: 'unknown' as any });
    expect(workflow).toBeNull();
  });

  it('returns null when action is undefined', () => {
    const workflow = getListingWorkflow({});
    expect(workflow).toBeNull();
  });
});

describe('Listing workflow step visibility', () => {
  it('sale workflow includes all 8 core steps', () => {
    const workflow = getListingWorkflow({ action: 'sell' });
    expect(workflow).not.toBeNull();
    const steps = getVisibleListingSteps(workflow!, { action: 'sell' });
    expect(steps.length).toBeGreaterThanOrEqual(8);
    expect(steps.map((s) => s.id)).toEqual([
      'action',
      'property_type',
      'basic_information',
      'additional_information',
      'pricing',
      'location',
      'media_upload',
      'preview_publish',
    ]);
  });

  it('rent workflow includes all 8 core steps', () => {
    const workflow = getListingWorkflow({ action: 'rent' });
    expect(workflow).not.toBeNull();
    const steps = getVisibleListingSteps(workflow!, { action: 'rent' });
    expect(steps.map((s) => s.id)).toEqual([
      'action',
      'property_type',
      'basic_information',
      'additional_information',
      'pricing',
      'location',
      'media_upload',
      'preview_publish',
    ]);
  });

  it('auction workflow includes all 8 core steps', () => {
    const workflow = getListingWorkflow({ action: 'auction' });
    expect(workflow).not.toBeNull();
    const steps = getVisibleListingSteps(workflow!, { action: 'auction' });
    expect(steps.map((s) => s.id)).toEqual([
      'action',
      'property_type',
      'basic_information',
      'additional_information',
      'pricing',
      'location',
      'media_upload',
      'preview_publish',
    ]);
  });

  it('each workflow step has a non-empty componentKey', () => {
    const workflow = getListingWorkflow({ action: 'sell' });
    for (const step of workflow!.steps) {
      expect(step.componentKey).toBeTruthy();
      expect(typeof step.componentKey).toBe('string');
    }
  });
});
