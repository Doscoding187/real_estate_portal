/**
 * Listing Wizard Store - Zustand State Management
 *
 * Manages multi-step wizard state with persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ListingWizardState,
  ListingAction,
  ListingIntent,
  PropertyType,
  PricingFields,
  PropertyDetails,
  LocationData,
  MediaFile,
  ValidationError,
  ListingBadge,
} from '../../../shared/listing-types';
import { listingActionToIntent, listingIntentToAction } from '../../../shared/listing-types';
import {
  retainCorePropertyInformationForType,
  validateCorePropertyInformation,
} from '../../../shared/core-property-information';
import {
  buildFeaturesContextFromWizardState,
} from '../../../shared/features-context';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';

interface ListingWizardStore extends ListingWizardState {
  // Navigation
  goToStep: (step: number) => void;
  nextStep: () => boolean;
  prevStep: () => void;
  markStepComplete: (step: number) => void;
  canAdvanceFromStep: (step: number) => boolean;

  // Step 1: Listing intent (mapped to the legacy action transport field)
  setListingIntent: (intent: ListingIntent) => void;
  setAction: (action: ListingAction) => void;

  // Step 1.5: Badges
  setBadges: (badges: ListingBadge[]) => void;

  // Step 2: Property Type
  setPropertyType: (propertyType: PropertyType) => void;

  // Basic Info
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setBasicInfo: (basicInfo: Partial<any>) => void;

  // Additional Info
  setAdditionalInfo: (additionalInfo: Partial<any>) => void;

  // Step 4: Pricing
  setPricing: (pricing: PricingFields) => void;

  // Property Details
  setPropertyDetails: (details: Partial<PropertyDetails>) => void;
  updatePropertyDetail: <K extends keyof PropertyDetails>(
    key: K,
    value: PropertyDetails[K],
  ) => void;

  // Step 4: Location
  setLocation: (location: LocationData) => void;

  // Step 5: Media
  addMedia: (media: MediaFile) => void;
  removeMedia: (index: number) => void;
  updateMedia: (index: number, updates: Partial<MediaFile>) => void;
  reorderMedia: (fromIndex: number, toIndex: number) => void;
  setMedia: (media: MediaFile[]) => void;
  setMainMedia: (mediaId: string) => void;
  setDisplayMediaType: (type: 'image' | 'video') => void;

  // Validation
  addError: (error: ValidationError) => void;
  removeError: (field: string) => void;
  clearErrors: () => void;
  validate: () => boolean;

  // Form actions
  saveDraft: () => Promise<void>;
  submitForReview: () => Promise<void>;
  reset: () => void;

  // Load existing listing
  loadListing: (listingId: number) => Promise<void>;
}

const initialState: ListingWizardState = {
  currentStep: 1,
  completedSteps: [],
  title: '',
  description: '',
  media: [],
  badges: [],
  errors: [],
  isValid: false,
  status: 'draft',
};

type WizardNavigationState = Pick<
  ListingWizardState,
  | 'action'
  | 'propertyType'
  | 'title'
  | 'description'
  | 'pricing'
  | 'propertyDetails'
  | 'basicInfo'
  | 'location'
  | 'media'
  | 'mainMediaId'
>;

const hasPositiveAmount = (value: unknown): boolean =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const retainFeaturesForState = (
  additionalInfo: unknown,
  propertyDetails: unknown,
  intent: ListingIntent | undefined,
  propertyType: PropertyType | undefined,
) => {
  if (!propertyType) return undefined;
  const context = buildFeaturesContextFromWizardState(
    additionalInfo,
    propertyDetails,
    intent,
    propertyType,
  );
  return { featuresContext: context };
};

/**
 * The wizard shell owns forward-navigation prerequisites. Individual steps
 * still own their detailed validation, but the shell must never let a user
 * bypass a required step by clicking Next or a future progress step.
 */
export const canAdvanceFromStep = (state: WizardNavigationState, step: number): boolean => {
  switch (step) {
    case 1:
      // Auction remains a legacy transport value, not a current Step 1 intent.
      return state.action === 'sell' || state.action === 'rent';
    case 2:
      return Boolean(state.propertyType);
    case 3:
      return (
        state.title.trim().length >= 10 &&
        state.description.trim().length >= 50 &&
        validateCorePropertyInformation(
          listingActionToIntent(state.action),
          state.propertyType,
          state.propertyDetails,
          state.basicInfo,
        ).length === 0
      );
    case 4:
      // Additional information is conditional and may be empty for MVP.
      return true;
    case 5: {
      const pricing = state.pricing as Record<string, unknown> | undefined;
      if (!pricing) return false;
      if (state.action === 'sell') return hasPositiveAmount(pricing.askingPrice);
      if (state.action === 'rent') {
        return hasPositiveAmount(pricing.monthlyRent) && hasPositiveAmount(pricing.deposit);
      }
      // Preserve the legacy auction shape for already-loaded records without
      // making it selectable from the current authoring journey.
      return hasPositiveAmount(pricing.startingBid);
    }
    case 6: {
      const location = state.location;
      return Boolean(
        location &&
        location.address.trim() &&
        location.city.trim() &&
        location.province.trim() &&
        Number.isFinite(location.latitude) &&
        Number.isFinite(location.longitude),
      );
    }
    case 7:
      return state.media.length > 0 && Boolean(state.mainMediaId);
    default:
      return false;
  }
};

export const useListingWizardStore = create<ListingWizardStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Navigation
      goToStep: step => {
        const state = get();
        const current = state.currentStep;

        if (step < 1 || step > 8) return;

        // Backward navigation remains freely available.
        if (step <= current) {
          set({ currentStep: step });
          return;
        }

        const completedPrerequisites = Array.from(
          { length: step - 1 },
          (_, index) => index + 1,
        ).every(prerequisite => state.completedSteps.includes(prerequisite));
        const canOpenCompletedStep = state.completedSteps.includes(step) && completedPrerequisites;
        const canOpenNextStep = step === current + 1 && canAdvanceFromStep(state, current);

        if (canOpenCompletedStep || canOpenNextStep) {
          set({
            currentStep: step,
            completedSteps: canOpenNextStep
              ? Array.from(new Set([...state.completedSteps, current])).sort((a, b) => a - b)
              : state.completedSteps,
          });
        }
      },

      nextStep: () => {
        const state = get();
        const current = state.currentStep;

        if (current >= 8 || !canAdvanceFromStep(state, current)) return false;

        set({
          currentStep: current + 1,
          completedSteps: Array.from(new Set([...state.completedSteps, current])).sort(
            (a, b) => a - b,
          ),
        });
        return true;
      },

      prevStep: () => {
        const current = get().currentStep;
        if (current > 1) {
          set({ currentStep: current - 1 });
        }
      },

      canAdvanceFromStep: step => canAdvanceFromStep(get(), step),

      markStepComplete: step => {
        const completed = get().completedSteps;
        if (!completed.includes(step)) {
          set({ completedSteps: [...completed, step] });
        }
      },

      // Step 1: Listing intent
      setListingIntent: intent => {
        const state = get();
        set({
          action: listingIntentToAction(intent),
          pricing: undefined,
          additionalInfo: retainFeaturesForState(
            state.additionalInfo,
            state.propertyDetails,
            intent,
            state.propertyType,
          ),
        });
      },

      // Legacy/API transport compatibility
      setAction: action => {
        const state = get();
        set({
          action,
          pricing: undefined,
          additionalInfo: retainFeaturesForState(
            state.additionalInfo,
            state.propertyDetails,
            listingActionToIntent(action),
            state.propertyType,
          ),
        });
      },

      // Step 1.5: Badges
      setBadges: badges => {
        set({ badges });
      },

      // Step 2: Property Type
      setPropertyType: propertyType => {
        const state = get();
        if (state.propertyType === propertyType) return;

        const retainedCore = retainCorePropertyInformationForType(
          state.propertyType,
          propertyType,
          state.propertyDetails,
          state.basicInfo,
        );

        set({
          propertyType,
          // Keep only facts whose semantics survive the type change. The
          // canonical Step 3 object owns invalidation; legacy flat fields are
          // never allowed to carry an area or farm fact into another type.
          propertyDetails: retainedCore
            ? ({ corePropertyInformation: retainedCore } as Partial<PropertyDetails>)
            : undefined,
          additionalInfo: retainFeaturesForState(
            state.additionalInfo,
            retainedCore ? { corePropertyInformation: retainedCore } : undefined,
            listingActionToIntent(state.action),
            propertyType,
          ),
          basicInfo: undefined,
          badges: [],
        });
      },

      // Basic Info
      setTitle: title => {
        set({ title });
        get().removeError('title');
      },

      setDescription: description => {
        set({ description });
        get().removeError('description');
      },

      setBasicInfo: basicInfo => {
        set(state => ({
          basicInfo: {
            ...(state.basicInfo || {}),
            ...basicInfo,
          },
        }));
      },

      // Additional Info
      setAdditionalInfo: additionalInfo => {
        set({ additionalInfo });
      },

      // Step 3: Pricing
      setPricing: pricing => {
        set({ pricing });
      },

      // Property Details
      setPropertyDetails: details => {
        set({ propertyDetails: details });
      },

      updatePropertyDetail: (key, value) => {
        const current = get().propertyDetails || {};
        set({
          propertyDetails: {
            ...current,
            [key]: value,
          } as PropertyDetails,
        });
      },

      // Step 4: Location
      setLocation: location => {
        set({ location });
        get().removeError('location');
      },

      // Step 5: Media
      addMedia: media => {
        const currentMedia = get().media;
        set({
          media: [...currentMedia, { ...media, displayOrder: currentMedia.length }],
        });
      },

      removeMedia: index => {
        const currentMedia = get().media;
        const newMedia = currentMedia.filter((_, i) => i !== index);
        // Reorder remaining media
        const reorderedMedia = newMedia.map((m, i) => ({
          ...m,
          displayOrder: i,
        }));
        set({ media: reorderedMedia });
      },

      updateMedia: (index, updates) => {
        const currentMedia = get().media;
        const newMedia = currentMedia.map((m, i) => (i === index ? { ...m, ...updates } : m));
        set({ media: newMedia });
      },

      reorderMedia: (fromIndex, toIndex) => {
        const currentMedia = get().media;
        const newMedia = [...currentMedia];
        const [removed] = newMedia.splice(fromIndex, 1);
        newMedia.splice(toIndex, 0, removed);

        // Update display order
        const reorderedMedia = newMedia.map((m, i) => ({
          ...m,
          displayOrder: i,
        }));

        set({ media: reorderedMedia });
      },

      setMedia: media => {
        set({ media });
      },

      setMainMedia: mediaId => {
        const media = get().media;
        const mainMedia = media.find(m => m.id === mediaId);

        if (mainMedia) {
          // Update all media to mark only one as primary
          const updatedMedia = media.map(m => ({
            ...m,
            isPrimary: m.id === mediaId,
          }));

          set({
            media: updatedMedia,
            mainMediaId: mediaId,
          });
        }
      },

      // Add this function
      setDisplayMediaType: type => {
        set({ displayMediaType: type });
      },

      // Validation
      addError: error => {
        const currentErrors = get().errors;
        // Remove existing error for the same field
        const filteredErrors = currentErrors.filter(e => e.field !== error.field);
        set({
          errors: [...filteredErrors, error],
          isValid: false,
        });
      },

      removeError: field => {
        const currentErrors = get().errors;
        const filteredErrors = currentErrors.filter(e => e.field !== field);
        set({
          errors: filteredErrors,
          isValid: filteredErrors.length === 0,
        });
      },

      clearErrors: () => {
        set({ errors: [], isValid: true });
      },

      validate: () => {
        const state = get();
        const errors: ValidationError[] = [];

        // Validate based on current step
        if (state.currentStep >= 1) {
          if (!state.action) {
            errors.push({ field: 'action', message: 'Please select an action' });
          }
        }

        if (state.currentStep >= 2) {
          if (!state.propertyType) {
            errors.push({ field: 'propertyType', message: 'Please select a property type' });
          }
        }

        if (state.currentStep >= 3) {
          const coreIssues = validateCorePropertyInformation(
            listingActionToIntent(state.action),
            state.propertyType,
            state.propertyDetails,
            state.basicInfo,
          );
          errors.push(
            ...coreIssues.map(issue => ({
              field: `propertyDetails.${issue.field}`,
              message: issue.message,
            })),
          );
        }

        if (state.currentStep >= 4) {
          // Additional Information remains conditional and optional for this
          // bounded core-facts slice.
        }

        if (state.currentStep >= 5) {
          // Step 5 is Basic Information - validate title and description
          if (!state.title || state.title.length < 10) {
            errors.push({ field: 'title', message: 'Title must be at least 10 characters' });
          }
          if (!state.description || state.description.length < 50) {
            errors.push({
              field: 'description',
              message: 'Description must be at least 50 characters',
            });
          }
        }

        if (state.currentStep >= 6) {
          // Step 6 is Pricing Details - validate pricing information
          if (!state.pricing) {
            errors.push({ field: 'pricing', message: 'Please provide pricing information' });
          }
        }

        if (state.currentStep >= 7) {
          // Step 7 is Location - validate location information
          if (!state.location) {
            errors.push({ field: 'location', message: 'Please provide location information' });
          }
        }

        if (state.currentStep >= 8) {
          // Step 8 is Media Upload - validate media requirements
          if (state.media.length === 0) {
            errors.push({ field: 'media', message: 'Please upload at least one image or video' });
          }
          if (!state.mainMediaId) {
            errors.push({ field: 'mainMedia', message: 'Please select a main media item' });
          }
        }

        set({
          errors,
          isValid: errors.length === 0,
        });

        return errors.length === 0;
      },

      // Form actions
      saveDraft: async () => {
        set({ status: 'submitting' });
        try {
          // TODO: Implement API call to save draft
          console.log('Saving draft...', get());
          set({ status: 'draft' });
        } catch (error) {
          console.error('Error saving draft:', error);
          set({ status: 'draft' });
        }
      },

      submitForReview: async () => {
        if (!get().validate()) {
          return;
        }

        set({ status: 'submitting' });

        // The actual TRPC calls will be made in the component
        // This just sets the status to submitted to trigger the redirect
        set({ status: 'submitted' });
      },

      reset: () => {
        set({
          ...initialState,
          action: undefined,
          propertyType: undefined,
          pricing: undefined,
          propertyDetails: undefined,
          location: undefined,
          basicInfo: undefined,
          additionalInfo: undefined,
          mainMediaId: undefined,
        });
        // Clear persisted storage to ensure fresh start
        localStorage.removeItem('listing-wizard-storage');
      },

      loadListing: async listingId => {
        try {
          // TODO: Implement API call to load listing
          console.log('Loading listing:', listingId);
        } catch (error) {
          console.error('Error loading listing:', error);
        }
      },
    }),
    {
      name: 'listing-wizard-storage',
      partialize: state => ({
        // Only persist certain fields
        action: state.action,
        propertyType: state.propertyType,
        title: state.title,
        description: state.description,
        pricing: state.pricing,
        propertyDetails: state.propertyDetails,
        location: state.location,
        media: state.media,
        badges: state.badges,
        basicInfo: state.basicInfo,
        additionalInfo: state.additionalInfo,
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        displayMediaType: state.displayMediaType, // Add this line
        mainMediaId: state.mainMediaId, // Add this line to persist mainMediaId
      }),
    },
  ),
);
