/**
 * FRONTEND CONTRACT LOCK-IN
 *
 * This file represents the FROZEN contract between Backend and Frontend.
 * All frontend components must import types and enums from HERE, not from server files directly.
 */

// 1. Re-export tRPC Router Type strictly
// We use 'import type' to ensure no server code (DB, Node modules) leaks into client bundle
import type { AppRouter } from '../server/routers';
export type { AppRouter };

// 2. Re-export Domain Enums
// These are the Single Source of Truth for dropdowns, validations, and filters
export * from './db-enums';

// 3. Define Canonical Filterable Fields
// These keys match the AppRouter.properties.search input schema
export const PROPERTY_FILTER_FIELDS = [
  'city',
  'province',
  'suburb',
  'locations',
  'propertyType',
  'listingType',
  'minPrice',
  'maxPrice',
  'minBedrooms',
  'maxBedrooms',
  'minBathrooms',
  'minArea',
  'maxArea',
  'status',
  'amenities',
  'postedBy',
  'bounds',
  'sortOption',
] as const;

export type PropertyFilterField = (typeof PROPERTY_FILTER_FIELDS)[number];
