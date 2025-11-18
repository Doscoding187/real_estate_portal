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
  addBadge: (badge: ListingBadge) => void;
  removeBadge: (badge: ListingBadge) => void;

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
