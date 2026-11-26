import { describe, expect, it } from 'vitest';
import { previewPublicLocation } from '../listingPreviewLocation';

const privateAddress = { streetNumber: '1', streetName: 'Test Walkthrough Road' };

describe('previewPublicLocation', () => {
  it('hides the house number for the street-location option', () => {
    const line = previewPublicLocation({
      privateAddress,
      fallbackAddress: '1 Test Walkthrough Road',
      publicLocationPrecision: 'approximate',
      areaLabel: 'North Riding, Randburg',
    });
    expect(line).toBe('Test Walkthrough Road, North Riding, Randburg');
    expect(line).not.toContain('1 Test');
  });

  it('shows number and street for the full-address option', () => {
    expect(
      previewPublicLocation({
        privateAddress,
        publicLocationPrecision: 'exact',
        areaLabel: 'North Riding',
      }),
    ).toBe('1 Test Walkthrough Road, North Riding');
  });

  it('never leaks an unstructured free-text address under the street option', () => {
    expect(
      previewPublicLocation({
        privateAddress: null,
        fallbackAddress: '1 Test Walkthrough Road',
        publicLocationPrecision: 'approximate',
        areaLabel: 'North Riding',
      }),
    ).toBe('North Riding');
  });
});
