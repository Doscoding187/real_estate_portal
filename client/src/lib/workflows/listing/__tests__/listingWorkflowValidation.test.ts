import { describe, it, expect } from 'vitest';
import {
  v2StepToV1Number,
  buildValidationContext,
  flattenWizardStateForValidation,
  validateListingWorkflowStep,
  validateListingWorkflowPayload,
} from '../listingWorkflowValidation';
import type { ListingWorkflowData } from '@shared/listing-workflow-types';

describe('v2StepToV1Number', () => {
  it('maps action to step 1', () => {
    expect(v2StepToV1Number('action')).toBe(1);
  });

  it('maps property_type to step 2', () => {
    expect(v2StepToV1Number('property_type')).toBe(2);
  });

  it('maps basic_information to step 3', () => {
    expect(v2StepToV1Number('basic_information')).toBe(3);
  });

  it('maps additional_information to step 4', () => {
    expect(v2StepToV1Number('additional_information')).toBe(4);
  });

  it('maps pricing to step 5', () => {
    expect(v2StepToV1Number('pricing')).toBe(5);
  });

  it('maps location to step 6', () => {
    expect(v2StepToV1Number('location')).toBe(6);
  });

  it('maps media_upload to step 7', () => {
    expect(v2StepToV1Number('media_upload')).toBe(7);
  });

  it('maps preview_publish to step 8', () => {
    expect(v2StepToV1Number('preview_publish')).toBe(8);
  });
});

describe('buildValidationContext', () => {
  it('extracts action, propertyType, media, pricing from workflow data', () => {
    const data: ListingWorkflowData = {
      action: 'sell',
      propertyType: 'apartment',
      media: [{ id: 'm1' }],
      pricing: { askingPrice: 1000000 },
    };
    const ctx = buildValidationContext(data);
    expect(ctx.action).toBe('sell');
    expect(ctx.propertyType).toBe('apartment');
    expect(ctx.media).toEqual([{ id: 'm1' }]);
    expect(ctx.pricing).toEqual({ askingPrice: 1000000 });
  });

  it('handles missing optional fields', () => {
    const ctx = buildValidationContext({});
    expect(ctx.action).toBeUndefined();
    expect(ctx.pricing).toBeUndefined();
  });
});

describe('flattenWizardStateForValidation', () => {
  it('flattens top-level and nested fields', () => {
    const data: ListingWorkflowData = {
      action: 'sell',
      propertyType: 'house',
      title: 'Test',
      pricing: { askingPrice: 2000000, monthlyRent: undefined },
      location: { address: '123', city: 'CT', province: 'WC', latitude: -33, longitude: 18 },
      media: [{ id: 'm1' }],
      propertyDetails: { bedrooms: 3, bathrooms: 2 },
    };
    const flat = flattenWizardStateForValidation(data);
    expect(flat.action).toBe('sell');
    expect(flat.propertyType).toBe('house');
    expect(flat.title).toBe('Test');
    expect(flat.askingPrice).toBe(2000000);
    expect(flat.address).toBe('123');
    expect(flat.city).toBe('CT');
    expect(flat.bedrooms).toBe(3);
    expect(flat.bathrooms).toBe(2);
  });

  it('handles missing pricing', () => {
    const flat = flattenWizardStateForValidation({});
    expect(flat.askingPrice).toBeUndefined();
    expect(flat.monthlyRent).toBeUndefined();
  });

  it('handles missing location', () => {
    const flat = flattenWizardStateForValidation({});
    expect(flat.address).toBeUndefined();
    expect(flat.latitude).toBeUndefined();
  });

  it('handles missing propertyDetails', () => {
    const flat = flattenWizardStateForValidation({});
    expect(flat.bedrooms).toBeUndefined();
    expect(flat.bathrooms).toBeUndefined();
  });
});

describe('validateListingWorkflowStep', () => {
  it('step 3 (basic_information) fails when title is missing', async () => {
    const data: ListingWorkflowData = {
      action: 'sell',
      propertyType: 'house',
      title: '',
      description: '',
    };
    const result = await validateListingWorkflowStep('basic_information', data);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.field === 'title')).toBe(true);
  });

  it('step 5 (pricing) fails when askingPrice is missing for sell', async () => {
    const data: ListingWorkflowData = {
      action: 'sell',
      propertyType: 'house',
      pricing: {},
    };
    const result = await validateListingWorkflowStep('pricing', data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'askingPrice')).toBe(true);
  });

  it('step 5 (pricing) passes when askingPrice is provided for sell', async () => {
    const data: ListingWorkflowData = {
      action: 'sell',
      propertyType: 'house',
      pricing: { askingPrice: 1500000 },
    };
    const result = await validateListingWorkflowStep('pricing', data);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('step 5 (pricing) fails when monthlyRent is missing for rent', async () => {
    const data: ListingWorkflowData = {
      action: 'rent',
      propertyType: 'apartment',
      pricing: {},
    };
    const result = await validateListingWorkflowStep('pricing', data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'monthlyRent')).toBe(true);
  });

  it('step 5 (pricing) fails when startingBid is missing for auction', async () => {
    const data: ListingWorkflowData = {
      action: 'auction',
      propertyType: 'house',
      pricing: {},
    };
    const result = await validateListingWorkflowStep('pricing', data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'startingBid')).toBe(true);
  });

  it('step 6 (location) fails when address is missing', async () => {
    const data: ListingWorkflowData = {
      action: 'sell',
      propertyType: 'house',
      location: {},
    };
    const result = await validateListingWorkflowStep('location', data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'address')).toBe(true);
  });

  it('step 7 (media_upload) fails when media is empty for sell', async () => {
    const data: ListingWorkflowData = {
      action: 'sell',
      propertyType: 'house',
      media: [],
    };
    const result = await validateListingWorkflowStep('media_upload', data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'media')).toBe(true);
  });

  it('marks errors with the correct step id', async () => {
    const data: ListingWorkflowData = {
      action: 'sell',
      propertyType: 'house',
      title: '',
    };
    const result = await validateListingWorkflowStep('basic_information', data);
    for (const err of result.errors) {
      expect(err.step).toBe('basic_information');
    }
  });
});

describe('validateListingWorkflowPayload', () => {
  it('fails for an empty payload', async () => {
    const result = await validateListingWorkflowPayload({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('passes for a valid sell listing payload', async () => {
    const data: ListingWorkflowData = {
      action: 'sell',
      propertyType: 'house',
      title: 'Beautiful Family Home',
      description: 'Beautiful 4-bedroom family home with 2 bathrooms, modern kitchen, and a large garden in prime location.',
      pricing: { askingPrice: 2500000 },
      location: {
        address: '42 Oak Avenue',
        city: 'Johannesburg',
        province: 'Gauteng',
        latitude: -26.2041,
        longitude: 28.0473,
      },
      media: [{ id: 'media-1', url: 'https://example.com/photo.jpg', type: 'image', displayOrder: 0 }],
      mainMediaId: 'media-1',
    };
    const result = await validateListingWorkflowPayload(data);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
