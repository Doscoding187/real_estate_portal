/**
 * Database ENUM Constants
 * Single source of truth for all ENUM values used in:
 * - Drizzle schema
 * - Zod validators
 * - UI select options
 *
 * IMPORTANT: Keep these in sync with production database ENUMs
 * Last verified: 2026-01-13
 */

// ============================================
// UNIT TYPES ENUMS
// ============================================

export const OWNERSHIP_TYPES = [
  'full-title',
  'sectional-title',
  'leasehold',
  'life-rights',
] as const;

export const STRUCTURAL_TYPES = [
  'apartment',
  'freestanding-house',
  'simplex',
  'duplex',
  'penthouse',
  'plot-and-plan',
  'townhouse',
  'studio',
] as const;

export const FLOOR_TYPES = ['single-storey', 'double-storey', 'triplex'] as const;

export const PARKING_TYPES = ['none', '1', '2', 'carport', 'garage'] as const;

// ============================================
// DEVELOPMENT ENUMS
// ============================================

export const DEVELOPMENT_TYPES = [
  'residential',
  'commercial',
  'mixed_use',
  'estate',
  'complex',
] as const;

export const DEVELOPMENT_STATUS = [
  'pre_launch',
  'launching_soon',
  'now_selling',
  'sold_out',
  'completed',
] as const;

export const PROJECT_STATUS = [
  'planning',
  'pre_launch',
  'selling',
  'sold_out',
  'completed',
] as const;

// ============================================
// DEVELOPMENT PHASES ENUMS
// ============================================

export const PHASE_STATUS = ['planning', 'pre_launch', 'selling', 'sold_out', 'completed'] as const;

export const SPEC_TYPES = ['affordable', 'gap', 'luxury', 'custom'] as const;

// ============================================
// UNIT STATUS ENUMS
// ============================================

export const UNIT_STATUS = ['available', 'reserved', 'sold'] as const;

// ============================================
// TYPE EXPORTS (for TypeScript inference)
// ============================================

export type OwnershipType = (typeof OWNERSHIP_TYPES)[number];
export type StructuralType = (typeof STRUCTURAL_TYPES)[number];
export type FloorType = (typeof FLOOR_TYPES)[number];
export type ParkingType = (typeof PARKING_TYPES)[number];
export type DevelopmentType = (typeof DEVELOPMENT_TYPES)[number];
export type DevelopmentStatus = (typeof DEVELOPMENT_STATUS)[number];
export type ProjectStatus = (typeof PROJECT_STATUS)[number];
export type PhaseStatus = (typeof PHASE_STATUS)[number];
export type SpecType = (typeof SPEC_TYPES)[number];
export type UnitStatus = (typeof UNIT_STATUS)[number];
