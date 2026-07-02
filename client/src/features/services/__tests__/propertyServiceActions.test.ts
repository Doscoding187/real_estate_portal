import { describe, expect, it } from 'vitest';
import {
  getPropertyServiceActions,
  type PropertyServiceAction,
} from '@/features/services/propertyServiceActions';

function expectValidActions(actions: PropertyServiceAction[]) {
  expect(actions.length).toBeLessThanOrEqual(4);

  for (const action of actions) {
    expect(action.category).toBeTruthy();
    expect(action.intentStage).toBeTruthy();
    expect(action.label).toBeTruthy();
    expect(action.description).toBeTruthy();
    expect(action.reasonKey).toBeTruthy();
  }
}

describe('getPropertyServiceActions', () => {
  it('returns the approved sale actions', () => {
    const actions = getPropertyServiceActions({ listingType: 'sale' });

    expect(actions.map(action => action.category)).toEqual([
      'finance_legal',
      'inspection_compliance',
      'insurance',
      'moving',
    ]);
    expectValidActions(actions);
  });

  it('returns the approved rental actions', () => {
    const actions = getPropertyServiceActions({ listingType: 'rent' });

    expect(actions.map(action => action.category)).toEqual([
      'moving',
      'insurance',
      'inspection_compliance',
      'home_improvement',
    ]);
    expectValidActions(actions);
  });

  it('accepts rental as an alias for rent', () => {
    expect(getPropertyServiceActions({ listingType: 'rental' })).toEqual(
      getPropertyServiceActions({ listingType: 'rent' }),
    );
  });

  it('returns the approved auction actions', () => {
    const actions = getPropertyServiceActions({ listingType: 'auction' });

    expect(actions.map(action => action.category)).toEqual([
      'finance_legal',
      'inspection_compliance',
      'insurance',
      'home_improvement',
    ]);
    expectValidActions(actions);
  });

  it('normalizes listing type casing and whitespace', () => {
    expect(getPropertyServiceActions({ listingType: '  SALE  ' })).toEqual(
      getPropertyServiceActions({ listingType: 'sale' }),
    );
  });

  it('returns no actions for an unknown listing type', () => {
    expect(getPropertyServiceActions({ listingType: 'shared_living' })).toEqual([]);
  });

  it('returns no actions when listing type is missing', () => {
    expect(getPropertyServiceActions({})).toEqual([]);
  });

  it('changes finance and legal context for development-linked sale properties', () => {
    const actions = getPropertyServiceActions({
      listingType: 'sale',
      isDevelopmentLinked: true,
    });

    const financeAction = actions.find(action => action.category === 'finance_legal');

    expect(financeAction).toMatchObject({
      reasonKey: 'development_finance_legal',
      description: 'Get help with finance, transfer, and development purchase steps.',
    });
    expectValidActions(actions);
  });
});
