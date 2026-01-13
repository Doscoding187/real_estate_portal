/**
 * Partnership System Enums & Permission Presets
 * Single source of truth for partnership types, visibility, and permissions
 * 
 * LOCKED: 2026-01-13
 * Version: 1.0
 */

// ============================================
// PARTNER TYPES
// ============================================

export const PARTNER_TYPES = [
  'co_developer',
  'joint_venture', 
  'investor',
  'builder',
  'marketing_agency',
  'selling_agency',
] as const;

export type PartnerType = typeof PARTNER_TYPES[number];

// ============================================
// VISIBILITY SCOPES
// ============================================

export const VISIBILITY_SCOPES = [
  'profile_public',   // Appears on their public profile page
  'internal_only',    // Internal dashboard only (analytics, etc.)
  'marketing_only',   // Landing pages, ads, campaigns only
] as const;

export type VisibilityScope = typeof VISIBILITY_SCOPES[number];

// ============================================
// LEAD SOURCE TYPES
// ============================================

export const LEAD_SOURCE_TYPES = [
  'developer_profile',   // Lead came from developer's profile page
  'agency_profile',      // Lead came from agency's profile page
  'development_page',    // Lead came from development landing page
  'campaign',            // Lead came from tracked campaign/ad
] as const;

export type LeadSourceType = typeof LEAD_SOURCE_TYPES[number];

// ============================================
// PERMISSION STRUCTURE
// ============================================

export interface PartnerPermissions {
  version: number;
  view_leads: boolean | 'assigned_only';
  export_leads: boolean;
  view_analytics: boolean | 'campaign_only' | 'limited';
  edit_marketing: boolean;
  edit_pricing: boolean;
  edit_units: boolean;
}

// ============================================
// PERMISSION PRESETS BY PARTNER TYPE
// ============================================

export const PERMISSION_PRESETS: Record<PartnerType, PartnerPermissions> = {
  co_developer: {
    version: 1,
    view_leads: true,
    export_leads: true,
    view_analytics: true,
    edit_marketing: true,
    edit_pricing: true,
    edit_units: true,
  },
  joint_venture: {
    version: 1,
    view_leads: true,
    export_leads: true,
    view_analytics: true,
    edit_marketing: true,
    edit_pricing: false,
    edit_units: false,
  },
  investor: {
    version: 1,
    view_leads: false,
    export_leads: false,
    view_analytics: true,
    edit_marketing: false,
    edit_pricing: false,
    edit_units: false,
  },
  builder: {
    version: 1,
    view_leads: false,
    export_leads: false,
    view_analytics: 'limited',
    edit_marketing: false,
    edit_pricing: false,
    edit_units: true,
  },
  marketing_agency: {
    version: 1,
    view_leads: 'assigned_only',
    export_leads: false,
    view_analytics: 'campaign_only',
    edit_marketing: true,
    edit_pricing: false,
    edit_units: false,
  },
  selling_agency: {
    version: 1,
    view_leads: 'assigned_only',
    export_leads: false,
    view_analytics: 'limited',
    edit_marketing: false,
    edit_pricing: false,
    edit_units: false,
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get default permissions for a partner type
 */
export function getDefaultPermissions(partnerType: PartnerType): PartnerPermissions {
  return { ...PERMISSION_PRESETS[partnerType] };
}

/**
 * Check if a partner type is agency-related
 */
export function isAgencyPartner(partnerType: PartnerType): boolean {
  return partnerType === 'marketing_agency' || partnerType === 'selling_agency';
}

/**
 * Check if a partner type gets development edit access
 */
export function hasEditAccess(partnerType: PartnerType): boolean {
  const perms = PERMISSION_PRESETS[partnerType];
  return perms.edit_marketing || perms.edit_pricing || perms.edit_units;
}
