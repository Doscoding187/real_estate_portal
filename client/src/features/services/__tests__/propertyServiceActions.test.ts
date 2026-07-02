import { describe, it, expect } from 'vitest';
import {
  getServiceActionsForListing,
  reasonKeyToLabel,
} from '../propertyServiceActions';

describe('getServiceActionsForListing', () => {
  it('returns finance, inspection, moving, home_improvement for sale', () => {
    const actions = getServiceActionsForListing('sale');
    expect(actions).toHaveLength(4);
    expect(actions.map(a => a.category)).toEqual([
      'finance_legal',
      'inspection_compliance',
      'moving',
      'home_improvement',
    ]);
  });

  it('returns inspection, moving, insurance, home_improvement for rent', () => {
    const actions = getServiceActionsForListing('rent');
    expect(actions).toHaveLength(4);
    expect(actions.map(a => a.category)).toEqual([
      'inspection_compliance',
      'moving',
      'insurance',
      'home_improvement',
    ]);
  });

  it('returns finance, inspection, moving, insurance for auction', () => {
    const actions = getServiceActionsForListing('auction');
    expect(actions).toHaveLength(4);
    expect(actions.map(a => a.category)).toEqual([
      'finance_legal',
      'inspection_compliance',
      'moving',
      'insurance',
    ]);
  });

  it('caps at 4 actions maximum', () => {
    const actions = getServiceActionsForListing('sale');
    expect(actions.length).toBeLessThanOrEqual(4);
  });

  it('returns empty array for unknown listing type', () => {
    expect(getServiceActionsForListing(null)).toEqual([]);
    expect(getServiceActionsForListing('')).toEqual([]);
    expect(getServiceActionsForListing('unknown')).toEqual([]);
    expect(getServiceActionsForListing(undefined)).toEqual([]);
  });

  it('handles case-insensitive listing types', () => {
    expect(getServiceActionsForListing('SALE')).toHaveLength(4);
    expect(getServiceActionsForListing('Rent')).toHaveLength(4);
    expect(getServiceActionsForListing('Auction')).toHaveLength(4);
  });

  it('includes finance_legal when development-linked and not already present', () => {
    const rentActions = getServiceActionsForListing('rent', true);
    const rentCategories = rentActions.map(a => a.category);
    expect(rentCategories[0]).toBe('finance_legal');
    expect(rentCategories).toContain('finance_legal');
  });

  it('does not duplicate finance_legal when already present', () => {
    const saleActions = getServiceActionsForListing('sale', true);
    const financeActions = saleActions.filter(a => a.category === 'finance_legal');
    expect(financeActions).toHaveLength(1);
  });

  it('all actions have required fields', () => {
    for (const listingType of ['sale', 'rent', 'auction']) {
      const actions = getServiceActionsForListing(listingType);
      for (const action of actions) {
        expect(action.category).toBeTruthy();
        expect(action.intentStage).toBeTruthy();
        expect(action.label).toBeTruthy();
        expect(action.description).toBeTruthy();
        expect(action.reasonKey).toBeTruthy();
      }
    }
  });
});

describe('reasonKeyToLabel', () => {
  it('returns correct label for known reason keys', () => {
    expect(reasonKeyToLabel('bond_or_transfer')).toBe('Financing this property');
    expect(reasonKeyToLabel('property_check')).toBe('Inspecting this property');
    expect(reasonKeyToLabel('relocation')).toBe('Moving into this property');
    expect(reasonKeyToLabel('fix_or_improve')).toBe('Improving this property');
    expect(reasonKeyToLabel('cover_protection')).toBe('Insuring this property');
  });

  it('returns null for unknown reason keys', () => {
    expect(reasonKeyToLabel(null)).toBeNull();
    expect(reasonKeyToLabel(undefined)).toBeNull();
    expect(reasonKeyToLabel('')).toBeNull();
    expect(reasonKeyToLabel('unknown_key')).toBeNull();
  });
});
