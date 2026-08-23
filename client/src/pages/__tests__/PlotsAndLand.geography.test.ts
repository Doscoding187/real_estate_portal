import { describe, expect, it } from 'vitest';
import { editManualLandGeography } from '../PlotsAndLand';

describe('Plots & Land manual geography edits', () => {
  it('replaces a canonical city handoff with the visible manual City state', () => {
    expect(editManualLandGeography({
      city: '', province: '', locationId: 'city:21', locationIds: [], handoffError: 'unsupported-location-scope',
    }, { city: 'Johannesburg', province: 'Gauteng' })).toEqual({
      city: 'Johannesburg', province: 'Gauteng', locationIds: [], handoffError: null,
    });
  });

  it('clears a Search Area before executing a manual city', () => {
    expect(editManualLandGeography({
      city: '', province: '', locationIds: [], searchAreaId: 'johannesburg-sandton',
    }, { city: 'Pretoria', province: 'Gauteng' })).toEqual({
      city: 'Pretoria', province: 'Gauteng', locationIds: [], handoffError: null,
    });
  });

  it('clears a sibling OR selection before executing a manual city', () => {
    expect(editManualLandGeography({
      city: '', province: '', locationIds: ['city:12', 'city:21'],
    }, { city: 'Cape Town', province: 'Western Cape' })).toEqual({
      city: 'Cape Town', province: 'Western Cape', locationIds: [], handoffError: null,
    });
  });
});
