/**
 * Onboarding wizard state management via useReducer.
 *
 * Feature: services-marketplace-overhaul
 * Requirements: 7.1, 9.3, 9.4, 10.3, 10.4, 13.6
 */

import { useReducer } from 'react';
import { type ServiceCategory, type SAProvince } from '../catalog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ServiceRow = {
  id: string;
  displayName: string;
  category: ServiceCategory;
  minPrice: string; // string for input binding, parsed to number on submit
  maxPrice: string;
};

export type LocationRow = {
  id: string;
  suburb: string;
  city: string;
  province: SAProvince | '';
  radiusKm: string; // string for input binding, defaults to '25'
};

export type OnboardingState = {
  currentStep: number; // 1–5, or 6 for completion screen
  // Step 1
  companyName: string;
  primaryCategory: ServiceCategory | null;
  bio: string;
  // Step 2
  headline: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  logoFile: File | null;
  logoPreviewUrl: string | null;
  // Step 3
  services: ServiceRow[];
  // Step 4
  locations: LocationRow[];
  // Step 5
  selectedPlan: 'directory' | 'directory_explore' | 'ecosystem_pro' | null;
  // Meta
  errors: Record<number, string>; // step → error message
  pendingStep: number | null; // which step has a pending mutation
};

export type OnboardingAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_FIELD'; field: keyof OnboardingState; value: unknown }
  | { type: 'HYDRATE'; value: Partial<OnboardingState> }
  | { type: 'ADD_SERVICE' }
  | { type: 'REMOVE_SERVICE'; id: string }
  | { type: 'UPDATE_SERVICE'; id: string; field: keyof ServiceRow; value: string }
  | { type: 'ADD_LOCATION' }
  | { type: 'REMOVE_LOCATION'; id: string }
  | { type: 'UPDATE_LOCATION'; id: string; field: keyof LocationRow; value: string }
  | { type: 'SET_ERROR'; step: number; message: string }
  | { type: 'CLEAR_ERROR'; step: number }
  | { type: 'SET_PENDING'; step: number | null };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeServiceRow(): ServiceRow {
  return {
    id: crypto.randomUUID(),
    displayName: '',
    category: 'home_improvement',
    minPrice: '',
    maxPrice: '',
  };
}

function makeLocationRow(): LocationRow {
  return {
    id: crypto.randomUUID(),
    suburb: '',
    city: '',
    province: '',
    radiusKm: '25',
  };
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export const initialOnboardingState: OnboardingState = {
  currentStep: 1,
  companyName: '',
  primaryCategory: null,
  bio: '',
  headline: '',
  contactEmail: '',
  contactPhone: '',
  websiteUrl: '',
  logoFile: null,
  logoPreviewUrl: null,
  services: [makeServiceRow()],
  locations: [makeLocationRow()],
  selectedPlan: null,
  errors: {},
  pendingStep: null,
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function onboardingReducer(
  state: OnboardingState,
  action: OnboardingAction,
): OnboardingState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step };

    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };

    case 'HYDRATE':
      return {
        ...state,
        ...action.value,
        services:
          action.value.services && action.value.services.length > 0
            ? action.value.services
            : state.services,
        locations:
          action.value.locations && action.value.locations.length > 0
            ? action.value.locations
            : state.locations,
      };

    case 'ADD_SERVICE': {
      if (state.services.length >= 10) return state;
      return { ...state, services: [...state.services, makeServiceRow()] };
    }

    case 'REMOVE_SERVICE': {
      if (state.services.length <= 1) return state;
      return {
        ...state,
        services: state.services.filter(s => s.id !== action.id),
      };
    }

    case 'UPDATE_SERVICE': {
      return {
        ...state,
        services: state.services.map(s =>
          s.id === action.id ? { ...s, [action.field]: action.value } : s,
        ),
      };
    }

    case 'ADD_LOCATION': {
      if (state.locations.length >= 5) return state;
      return { ...state, locations: [...state.locations, makeLocationRow()] };
    }

    case 'REMOVE_LOCATION': {
      if (state.locations.length <= 1) return state;
      return {
        ...state,
        locations: state.locations.filter(l => l.id !== action.id),
      };
    }

    case 'UPDATE_LOCATION': {
      return {
        ...state,
        locations: state.locations.map(l =>
          l.id === action.id ? { ...l, [action.field]: action.value } : l,
        ),
      };
    }

    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.step]: action.message },
      };

    case 'CLEAR_ERROR': {
      const errors = { ...state.errors };
      delete errors[action.step];
      return { ...state, errors };
    }

    case 'SET_PENDING':
      return { ...state, pendingStep: action.step };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOnboardingReducer() {
  return useReducer(onboardingReducer, initialOnboardingState);
}
