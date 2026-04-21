/**
 * Property-Based Tests for useOnboardingReducer
 *
 * Feature: services-marketplace-overhaul
 *
 * Property 16: Onboarding service rows add/remove invariant
 * For any starting count k where k < 10, ADD_SERVICE increases count to k + 1.
 * For any k > 1, REMOVE_SERVICE decreases count to k - 1.
 * Validates: Requirements 9.3, 9.4
 *
 * Property 17: Onboarding location rows add/remove invariant
 * For any starting count k where k < 5, ADD_LOCATION increases count to k + 1.
 * For any k > 1, REMOVE_LOCATION decreases count to k - 1.
 * Validates: Requirements 10.3, 10.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { onboardingReducer, initialOnboardingState, type OnboardingState } from '../useOnboardingReducer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a state with exactly `count` service rows */
function stateWithServiceCount(count: number): OnboardingState {
  let state = { ...initialOnboardingState, services: [] };
  for (let i = 0; i < count; i++) {
    state = onboardingReducer(state, { type: 'ADD_SERVICE' });
  }
  return state;
}

/** Build a state with exactly `count` location rows */
function stateWithLocationCount(count: number): OnboardingState {
  let state = { ...initialOnboardingState, locations: [] };
  for (let i = 0; i < count; i++) {
    state = onboardingReducer(state, { type: 'ADD_LOCATION' });
  }
  return state;
}

// ---------------------------------------------------------------------------
// Property 16: Service rows add/remove invariant
// ---------------------------------------------------------------------------

// Feature: services-marketplace-overhaul, Property 16: Onboarding service rows add/remove invariant
describe('useOnboardingReducer — Property 16: service rows add/remove invariant', () => {
  it('ADD_SERVICE increases count by 1 for any k in [1, 9]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9 }),
        k => {
          const state = stateWithServiceCount(k);
          expect(state.services.length).toBe(k);

          const next = onboardingReducer(state, { type: 'ADD_SERVICE' });
          expect(next.services.length).toBe(k + 1);
        },
      ),
      { numRuns: 9 },
    );
  });

  it('ADD_SERVICE does NOT increase count beyond 10', () => {
    const state = stateWithServiceCount(10);
    const next = onboardingReducer(state, { type: 'ADD_SERVICE' });
    expect(next.services.length).toBe(10);
  });

  it('REMOVE_SERVICE decreases count by 1 for any k in [2, 10]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        k => {
          const state = stateWithServiceCount(k);
          const idToRemove = state.services[0].id;

          const next = onboardingReducer(state, { type: 'REMOVE_SERVICE', id: idToRemove });
          expect(next.services.length).toBe(k - 1);
        },
      ),
      { numRuns: 9 },
    );
  });

  it('REMOVE_SERVICE does NOT decrease count below 1', () => {
    const state = stateWithServiceCount(1);
    const idToRemove = state.services[0].id;
    const next = onboardingReducer(state, { type: 'REMOVE_SERVICE', id: idToRemove });
    expect(next.services.length).toBe(1);
  });

  it('each service row has a unique id', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        k => {
          const state = stateWithServiceCount(k);
          const ids = state.services.map(s => s.id);
          const uniqueIds = new Set(ids);
          expect(uniqueIds.size).toBe(k);
        },
      ),
      { numRuns: 9 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 17: Location rows add/remove invariant
// ---------------------------------------------------------------------------

// Feature: services-marketplace-overhaul, Property 17: Onboarding location rows add/remove invariant
describe('useOnboardingReducer — Property 17: location rows add/remove invariant', () => {
  it('ADD_LOCATION increases count by 1 for any k in [1, 4]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }),
        k => {
          const state = stateWithLocationCount(k);
          expect(state.locations.length).toBe(k);

          const next = onboardingReducer(state, { type: 'ADD_LOCATION' });
          expect(next.locations.length).toBe(k + 1);
        },
      ),
      { numRuns: 4 },
    );
  });

  it('ADD_LOCATION does NOT increase count beyond 5', () => {
    const state = stateWithLocationCount(5);
    const next = onboardingReducer(state, { type: 'ADD_LOCATION' });
    expect(next.locations.length).toBe(5);
  });

  it('REMOVE_LOCATION decreases count by 1 for any k in [2, 5]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        k => {
          const state = stateWithLocationCount(k);
          const idToRemove = state.locations[0].id;

          const next = onboardingReducer(state, { type: 'REMOVE_LOCATION', id: idToRemove });
          expect(next.locations.length).toBe(k - 1);
        },
      ),
      { numRuns: 4 },
    );
  });

  it('REMOVE_LOCATION does NOT decrease count below 1', () => {
    const state = stateWithLocationCount(1);
    const idToRemove = state.locations[0].id;
    const next = onboardingReducer(state, { type: 'REMOVE_LOCATION', id: idToRemove });
    expect(next.locations.length).toBe(1);
  });

  it('each location row defaults radiusKm to "25"', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        k => {
          const state = stateWithLocationCount(k);
          for (const loc of state.locations) {
            expect(loc.radiusKm).toBe('25');
          }
        },
      ),
      { numRuns: 5 },
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests for other reducer actions
// ---------------------------------------------------------------------------

describe('useOnboardingReducer — unit tests', () => {
  it('SET_STEP updates currentStep', () => {
    const state = onboardingReducer(initialOnboardingState, { type: 'SET_STEP', step: 3 });
    expect(state.currentStep).toBe(3);
  });

  it('SET_FIELD updates a top-level field', () => {
    const state = onboardingReducer(initialOnboardingState, {
      type: 'SET_FIELD',
      field: 'companyName',
      value: 'Acme Plumbing',
    });
    expect(state.companyName).toBe('Acme Plumbing');
  });

  it('UPDATE_SERVICE updates a specific field on a service row', () => {
    const state = stateWithServiceCount(1);
    const id = state.services[0].id;
    const next = onboardingReducer(state, {
      type: 'UPDATE_SERVICE',
      id,
      field: 'displayName',
      value: 'Geyser Replacement',
    });
    expect(next.services[0].displayName).toBe('Geyser Replacement');
  });

  it('UPDATE_LOCATION updates a specific field on a location row', () => {
    const state = stateWithLocationCount(1);
    const id = state.locations[0].id;
    const next = onboardingReducer(state, {
      type: 'UPDATE_LOCATION',
      id,
      field: 'city',
      value: 'Cape Town',
    });
    expect(next.locations[0].city).toBe('Cape Town');
  });

  it('SET_ERROR stores error message for a step', () => {
    const state = onboardingReducer(initialOnboardingState, {
      type: 'SET_ERROR',
      step: 2,
      message: 'Something went wrong',
    });
    expect(state.errors[2]).toBe('Something went wrong');
  });

  it('CLEAR_ERROR removes error for a step', () => {
    let state = onboardingReducer(initialOnboardingState, {
      type: 'SET_ERROR',
      step: 2,
      message: 'Something went wrong',
    });
    state = onboardingReducer(state, { type: 'CLEAR_ERROR', step: 2 });
    expect(state.errors[2]).toBeUndefined();
  });

  it('SET_PENDING sets the pending step', () => {
    const state = onboardingReducer(initialOnboardingState, { type: 'SET_PENDING', step: 3 });
    expect(state.pendingStep).toBe(3);
  });

  it('SET_PENDING with null clears the pending step', () => {
    let state = onboardingReducer(initialOnboardingState, { type: 'SET_PENDING', step: 3 });
    state = onboardingReducer(state, { type: 'SET_PENDING', step: null });
    expect(state.pendingStep).toBeNull();
  });

  it('initialOnboardingState has one service row and one location row', () => {
    expect(initialOnboardingState.services.length).toBe(1);
    expect(initialOnboardingState.locations.length).toBe(1);
  });
});
