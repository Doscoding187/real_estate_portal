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
