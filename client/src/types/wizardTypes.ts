/**
 * Development Listing Wizard Type Definitions
 * 
 * These are canonical types used throughout the wizard.
 * All string values should use these types, not arbitrary strings.
 */

// =============================================================================
// PHASE NAVIGATION (Keyed, not numeric)
// =============================================================================

export type WizardPhase =
  | 'developmentType'
  | 'residentialConfig'
  | 'identity'
  | 'location'
  | 'estateProfile'
  | 'amenities'
  | 'media'
  | 'units'
  | 'pricing'
  | 'publish';

// Phase labels for UI
export const PHASE_LABELS: Record<WizardPhase, string> = {
  developmentType: 'Development Type',
  residentialConfig: 'Configuration',
  identity: 'Identity',
  location: 'Location',
  estateProfile: 'Estate Profile',
  amenities: 'Amenities',
  media: 'Media',
  units: 'Unit Types',
  pricing: 'Pricing',
  publish: 'Publish',
};

// =============================================================================
// DEVELOPMENT TYPE (Top-Level Category)
// =============================================================================

export type DevelopmentType = 'residential' | 'mixed_use' | 'land' | 'commercial';

export const DEVELOPMENT_TYPE_OPTIONS: { value: DevelopmentType; label: string; description: string; enabled: boolean }[] = [
  { 
    value: 'residential', 
    label: 'Residential Development', 
    description: 'Apartments, townhouses, estates, retirement villages',
    enabled: true 
  },
  { 
    value: 'mixed_use', 
    label: 'Mixed-Use Development', 
    description: 'Residential & commercial in one development',
    enabled: true 
  },
  { 
    value: 'land', 
    label: 'Land Development', 
    description: 'Serviced plots, vacant land, plot + build',
    enabled: true 
  },
  { 
    value: 'commercial', 
    label: 'Commercial Development', 
    description: 'Offices, retail, industrial, mixed commercial',
    enabled: true 
  },
];

// =============================================================================
// RESIDENTIAL CONFIGURATION
// =============================================================================

export type ResidentialType =
  | 'apartment'
  | 'townhouse'
  | 'freehold'
  | 'mixed_residential'
  | 'retirement'
  | 'student_accommodation';

export const RESIDENTIAL_TYPE_OPTIONS: { value: ResidentialType; label: string; description: string }[] = [
  { value: 'apartment', label: 'Apartment / Flat Development', description: 'Multi-storey residential blocks' },
  { value: 'townhouse', label: 'Security Estate Developments', description: 'Gated estates with security features' },
  { value: 'freehold', label: 'Freehold Housing Development', description: 'Standalone houses on individual plots' },
  { value: 'mixed_residential', label: 'Mixed Residential', description: 'Combination of unit types' },
  { value: 'retirement', label: 'Retirement Development', description: 'Age-restricted living facilities' },
  { value: 'student_accommodation', label: 'Student Accommodation', description: 'Purpose-built student housing' },
];

// =============================================================================
// COMMUNITY / ESTATE TYPES (Multi-Select)
// =============================================================================

export type CommunityType =
  | 'security_estate'
  | 'gated_community'
  | 'golf_estate'
  | 'eco_estate'
  | 'waterfront_estate'
  | 'lifestyle_estate'
  | 'retirement_village'
  | 'non_estate';

export const COMMUNITY_TYPE_OPTIONS: { value: CommunityType; label: string; description: string; triggersEstateProfile: boolean }[] = [
  { value: 'security_estate', label: 'Security Estate', description: 'Secured perimeter with access control', triggersEstateProfile: true },
  { value: 'gated_community', label: 'Gated Community', description: 'Controlled access, shared amenities', triggersEstateProfile: true },
  { value: 'golf_estate', label: 'Golf Estate', description: 'Built around a golf course', triggersEstateProfile: true },
  { value: 'eco_estate', label: 'Eco Estate', description: 'Environmentally focused development', triggersEstateProfile: true },
  { value: 'waterfront_estate', label: 'Waterfront Estate', description: 'Located on water (dam, river, sea)', triggersEstateProfile: true },
  { value: 'lifestyle_estate', label: 'Lifestyle Estate', description: 'Premium amenities and lifestyle focus', triggersEstateProfile: true },
  { value: 'retirement_village', label: 'Retirement Village', description: 'Age-restricted with care facilities', triggersEstateProfile: true },
  { value: 'non_estate', label: 'Non-Estate Development', description: 'Standard development, no estate structure', triggersEstateProfile: false },
];

// Mapping: Which community types are applicable for each residential type
export const RESIDENTIAL_TO_COMMUNITY_MAP: Record<ResidentialType, CommunityType[]> = {
  apartment: ['gated_community', 'lifestyle_estate', 'non_estate'],
  townhouse: ['security_estate', 'gated_community', 'golf_estate', 'eco_estate', 'waterfront_estate', 'lifestyle_estate'],
  freehold: ['security_estate', 'gated_community', 'golf_estate', 'eco_estate', 'waterfront_estate', 'lifestyle_estate', 'non_estate'],
  mixed_residential: ['security_estate', 'gated_community', 'golf_estate', 'eco_estate', 'waterfront_estate', 'lifestyle_estate', 'non_estate'],
  retirement: ['retirement_village'],
  student_accommodation: ['non_estate'],
};

// Helper to get filtered community options based on residential type
export const getApplicableCommunityTypes = (residentialType: ResidentialType | null): typeof COMMUNITY_TYPE_OPTIONS => {
  if (!residentialType) return COMMUNITY_TYPE_OPTIONS;
  
  const applicableValues = RESIDENTIAL_TO_COMMUNITY_MAP[residentialType] || [];
  return COMMUNITY_TYPE_OPTIONS.filter(opt => applicableValues.includes(opt.value));
};

// Helper to check if estate profile should be shown
export const shouldShowEstateProfile = (communityTypes: CommunityType[]): boolean => {
  return communityTypes.some(type => 
    COMMUNITY_TYPE_OPTIONS.find(opt => opt.value === type)?.triggersEstateProfile ?? false
  );
};

// =============================================================================
// SECURITY FEATURES (Independent of Estate - usable by apartments)
// =============================================================================

export type SecurityFeature =
  | 'access_controlled'
  | 'guarded_entrance'
  | 'security_24h'
  | 'biometric_access'
  | 'cctv'
  | 'electric_fencing'
  | 'boom_gate'
  | 'intercom'
  | 'panic_buttons';

export const SECURITY_FEATURE_OPTIONS: { value: SecurityFeature; label: string }[] = [
  { value: 'access_controlled', label: 'Access Controlled' },
  { value: 'guarded_entrance', label: 'Guarded Entrance' },
  { value: 'security_24h', label: '24/7 Security' },
  { value: 'biometric_access', label: 'Biometric Access' },
  { value: 'cctv', label: 'CCTV Surveillance' },
  { value: 'electric_fencing', label: 'Electric Fencing' },
  { value: 'boom_gate', label: 'Boom Gate' },
  { value: 'intercom', label: 'Intercom System' },
  { value: 'panic_buttons', label: 'Panic Buttons' },
];

// =============================================================================
// DEVELOPMENT STATUS
// =============================================================================

export type DevelopmentStatus = 'planning' | 'construction' | 'near_completion' | 'completed';

export const DEVELOPMENT_STATUS_OPTIONS: { value: DevelopmentStatus; label: string }[] = [
  { value: 'planning', label: 'Planning Phase' },
  { value: 'construction', label: 'Under Construction' },
  { value: 'near_completion', label: 'Near Completion' },
  { value: 'completed', label: 'Completed' },
];

// =============================================================================
// OWNERSHIP TYPES
// =============================================================================

export type OwnershipType = 'full_title' | 'sectional_title' | 'leasehold' | 'life_rights';

export const OWNERSHIP_TYPE_OPTIONS: { value: OwnershipType; label: string; description: string }[] = [
  { value: 'full_title', label: 'Full Title / Freehold', description: 'Outright ownership of land and building' },
  { value: 'sectional_title', label: 'Sectional Title', description: 'Ownership of a section within a scheme' },
  { value: 'leasehold', label: 'Leasehold', description: 'Long-term lease, not ownership' },
  { value: 'life_rights', label: 'Life Rights', description: 'Right to occupy for lifetime' },
];

// =============================================================================
// LAND DEVELOPMENT CONFIGURATION
// =============================================================================

export type LandType =
  | 'serviced_plots'
  | 'vacant_land'
  | 'plot_and_plan'
  | 'agricultural'
  | 'small_holdings'
  | 'industrial_land';

export const LAND_TYPE_OPTIONS: { value: LandType; label: string; description: string }[] = [
  { value: 'serviced_plots', label: 'Serviced Plots', description: 'Plots with water, electricity, and roads' },
  { value: 'vacant_land', label: 'Vacant Land', description: 'Undeveloped land for sale' },
  { value: 'plot_and_plan', label: 'Plot + Plan', description: 'Land with approved building plans' },
  { value: 'agricultural', label: 'Agricultural Land', description: 'Farm land, smallholdings' },
  { value: 'small_holdings', label: 'Small Holdings', description: 'Lifestyle plots, rural residential' },
  { value: 'industrial_land', label: 'Industrial Land', description: 'Zoned for industrial use' },
];

// =============================================================================
// COMMERCIAL DEVELOPMENT CONFIGURATION
// =============================================================================

export type CommercialType =
  | 'office_development'
  | 'retail_centre'
  | 'industrial_park'
  | 'warehouse'
  | 'mixed_commercial'
  | 'hospitality';

export const COMMERCIAL_TYPE_OPTIONS: { value: CommercialType; label: string; description: string }[] = [
  { value: 'office_development', label: 'Office Development', description: 'Office parks, business centres' },
  { value: 'retail_centre', label: 'Retail Centre', description: 'Shopping centres, retail strips' },
  { value: 'industrial_park', label: 'Industrial Park', description: 'Industrial units for lease/sale' },
  { value: 'warehouse', label: 'Warehouse / Logistics', description: 'Distribution centres, warehouses' },
  { value: 'mixed_commercial', label: 'Mixed Commercial', description: 'Retail + office combination' },
  { value: 'hospitality', label: 'Hospitality', description: 'Hotels, lodges, B&Bs' },
];
