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
  PropertyType,
  PricingFields,
  PropertyDetails,
  LocationData,
  MediaFile,
  ValidationError,
  ListingBadge,
} from '../../../shared/listing-types';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';

interface ListingWizardStore extends ListingWizardState {
  // Navigation
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  markStepComplete: (step: number) => void;

  // Step 1: Action
  setAction: (action: ListingAction) => void;

  // Step 1.5: Badges
  setBadges: (badges: ListingBadge[]) => void;

  // Step 2: Property Type
  setPropertyType: (propertyType: PropertyType) => void;

  // Basic Info
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;

  // Step 3: Pricing
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
  setMainMedia: (mediaId: number) => void;
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

export const useListingWizardStore = create<ListingWizardStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Navigation
      goToStep: step => {
        const maxStep = Math.max(...get().completedSteps, get().currentStep);
        if (step <= maxStep + 1) {
          set({ currentStep: step });
        }
      },

      nextStep: () => {
        const current = get().currentStep;
        set({ currentStep: current + 1 });
      },

      prevStep: () => {
        const current = get().currentStep;
        if (current > 1) {
          set({ currentStep: current - 1 });
        }
      },

      markStepComplete: step => {
        const completed = get().completedSteps;
        if (!completed.includes(step)) {
          set({ completedSteps: [...completed, step] });
        }
      },

      // Step 1: Action
      setAction: action => {
        set({ action });
        // Clear pricing when action changes
        set({ pricing: undefined });
      },

      // Step 1.5: Badges
      setBadges: badges => {
        set({ badges });
      },

      // Step 2: Property Type
      setPropertyType: propertyType => {
        set({ propertyType });
        // Clear property details when type changes
        set({ propertyDetails: undefined });
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
          // Step 3 is Listing Badges - no required fields
        }

        if (state.currentStep >= 4) {
          // Step 4 is Property Details - no required fields at step level
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
        set(initialState);
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
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        displayMediaType: state.displayMediaType, // Add this line
        mainMediaId: state.mainMediaId, // Add this line to persist mainMediaId
      }),
    },
  ),
);
