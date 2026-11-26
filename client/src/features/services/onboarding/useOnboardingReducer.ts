/**
 * Onboarding wizard state management via useReducer.
 *
 * Feature: services-marketplace-overhaul
 * Requirements: 7.1, 9.3, 9.4, 10.3, 10.4, 13.6
 */

import { useReducer } from 'react';
import { type ServiceCategory } from '../catalog';
import type { CanonicalPlaceSelection } from '@/components/location/CanonicalPlaceSelector';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ServiceRow = {
  id: string;
  recordId?: number;
  code: string;
  displayName: string;
  description: string;
  category: ServiceCategory;
  minPrice: string; // string for input binding, parsed to number on submit
  maxPrice: string;
  currency: 'ZAR';
  isActive: boolean;
};

export type LocationRow = {
  id: string;
  recordId?: number;
  place: CanonicalPlaceSelection | null;
  isPrimary: boolean;
};

export type OnboardingState = {
  currentStep: number; // 1–5, or 6 for completion screen
  // Step 1
  companyName: string;
  businessType: 'independent_professional' | 'registered_company' | 'partnership' | 'other' | null;
  logoUrl: string;
  bio: string;
  // Step 2
  headline: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  websiteTemplate: 'personal_brand' | 'corporate_brand' | 'project_showcase';
  businessYearsInOperation: string;
  operatingHours: string;
  socialLinks: { facebook: string; instagram: string; linkedin: string };
  // Step 3
  services: ServiceRow[];
  // Step 4
  locations: LocationRow[];
  // Step 5
  selectedPlan: 'directory' | 'directory_explore' | 'ecosystem_pro' | null;
  // Meta
  errors: Record<number, string>; // step → error message
  pendingStep: number | null; // which step has a pending mutation
  dirtySteps: Record<number, boolean>;
};

export type OnboardingAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_FIELD'; field: keyof OnboardingState; value: unknown }
  | { type: 'HYDRATE'; value: Partial<OnboardingState> }
  | { type: 'ADD_SERVICE' }
  | { type: 'REMOVE_SERVICE'; id: string }
  | { type: 'UPDATE_SERVICE'; id: string; field: keyof ServiceRow; value: string | boolean }
  | { type: 'ADD_LOCATION' }
  | { type: 'REMOVE_LOCATION'; id: string }
  | {
      type: 'UPDATE_LOCATION';
      id: string;
      field: keyof LocationRow;
      value: string | boolean | CanonicalPlaceSelection | null;
    }
  | { type: 'SET_ERROR'; step: number; message: string }
  | { type: 'CLEAR_ERROR'; step: number }
  | { type: 'SET_PENDING'; step: number | null }
  | { type: 'MARK_STEP_SAVED'; step: number };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeServiceRow(category: ServiceCategory = 'home_improvement'): ServiceRow {
  return {
    id: crypto.randomUUID(),
    code: '',
    displayName: '',
    description: '',
    category,
    minPrice: '',
    maxPrice: '',
    currency: 'ZAR',
    isActive: true,
  };
}

function makeLocationRow(): LocationRow {
  return {
    id: crypto.randomUUID(),
    place: null,
    isPrimary: true,
  };
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export const initialOnboardingState: OnboardingState = {
  currentStep: 1,
  companyName: '',
  businessType: null,
  logoUrl: '',
  bio: '',
  headline: '',
  contactEmail: '',
  contactPhone: '',
  websiteUrl: '',
  websiteTemplate: 'corporate_brand',
  businessYearsInOperation: '',
  operatingHours: '',
  socialLinks: { facebook: '', instagram: '', linkedin: '' },
  services: [makeServiceRow()],
  locations: [makeLocationRow()],
  selectedPlan: null,
  errors: {},
  pendingStep: null,
  dirtySteps: {},
};

export function isOnboardingStatePristine(state: OnboardingState) {
  const hasEditedServiceRows =
    state.services.length !== 1 ||
    state.services[0]?.code !== '' ||
    state.services[0]?.displayName !== '' ||
    state.services[0]?.description !== '' ||
    state.services[0]?.category !== 'home_improvement' ||
    state.services[0]?.minPrice !== '' ||
    state.services[0]?.maxPrice !== '' ||
    state.services[0]?.currency !== 'ZAR' ||
    state.services[0]?.isActive !== true;

  const hasEditedLocationRows =
    state.locations.length !== 1 ||
    state.locations[0]?.place !== null ||
    state.locations[0]?.isPrimary !== true;

  return !(
    state.companyName !== '' ||
    state.businessType !== null ||
    state.logoUrl !== '' ||
    state.bio !== '' ||
    state.headline !== '' ||
    state.contactEmail !== '' ||
    state.contactPhone !== '' ||
    state.websiteUrl !== '' ||
    state.websiteTemplate !== 'corporate_brand' ||
    state.businessYearsInOperation !== '' ||
    state.operatingHours !== '' ||
    Object.values(state.socialLinks).some(Boolean) ||
    state.selectedPlan !== null ||
    hasEditedServiceRows ||
    hasEditedLocationRows
  );
}

export function primaryServiceCategoryFromState(
  state: Pick<OnboardingState, 'services'>,
): ServiceCategory | null {
  return (
    state.services.find(service => service.isActive && service.displayName.trim())?.category ||
    state.services[0]?.category ||
    null
  );
}

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
      {
        const step =
          action.field === 'companyName' ||
          action.field === 'businessType' ||
          action.field === 'logoUrl' ||
          action.field === 'headline' ||
          action.field === 'bio'
            ? 1
            : action.field === 'contactEmail' ||
                action.field === 'contactPhone' ||
                action.field === 'websiteUrl' ||
                action.field === 'businessYearsInOperation' ||
                action.field === 'operatingHours' ||
                action.field === 'socialLinks'
              ? 2
              : action.field === 'websiteTemplate'
                ? 5
                : null;
        return {
          ...state,
          [action.field]: action.value,
          dirtySteps: step ? { ...state.dirtySteps, [step]: true } : state.dirtySteps,
        };
      }

    case 'HYDRATE':
      return {
        ...state,
        ...action.value,
        dirtySteps: {},
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
      return {
        ...state,
        services: [
          ...state.services,
          makeServiceRow(
            state.services.find(service => service.displayName.trim())?.category ||
              state.services[0]?.category,
          ),
        ],
        dirtySteps: { ...state.dirtySteps, 3: true },
      };
    }

    case 'REMOVE_SERVICE': {
      if (state.services.length <= 1) return state;
      const services = state.services.filter(s => s.id !== action.id);
      return {
        ...state,
        services,
        dirtySteps: { ...state.dirtySteps, 3: true },
      };
    }

    case 'UPDATE_SERVICE': {
      const services = state.services.map(s =>
        s.id === action.id ? { ...s, [action.field]: action.value } : s,
      );
      return {
        ...state,
        services,
        dirtySteps: { ...state.dirtySteps, 3: true },
      };
    }

    case 'ADD_LOCATION': {
      if (state.locations.length >= 5) return state;
      return {
        ...state,
        locations: [...state.locations, makeLocationRow()],
        dirtySteps: { ...state.dirtySteps, 4: true },
      };
    }

    case 'REMOVE_LOCATION': {
      if (state.locations.length <= 1) return state;
      return {
        ...state,
        locations: state.locations.filter(l => l.id !== action.id),
        dirtySteps: { ...state.dirtySteps, 4: true },
      };
    }

    case 'UPDATE_LOCATION': {
      return {
        ...state,
        locations: state.locations.map(l =>
          l.id === action.id ? { ...l, [action.field]: action.value } : l,
        ),
        dirtySteps: { ...state.dirtySteps, 4: true },
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

    case 'MARK_STEP_SAVED': {
      const dirtySteps = { ...state.dirtySteps };
      delete dirtySteps[action.step];
      return { ...state, dirtySteps };
    }

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
