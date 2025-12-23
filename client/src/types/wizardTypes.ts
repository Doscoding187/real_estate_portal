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
// RESIDENTIAL CONFIGURATION (Primary Development Type)
// =============================================================================

export type ResidentialType =
  | 'apartment'
  | 'security_estate'
  | 'freehold'
  | 'mixed_residential'
  | 'retirement'
  | 'student_accommodation'
  | 'townhouse_cluster';

export const RESIDENTIAL_TYPE_OPTIONS: { value: ResidentialType; label: string; description: string }[] = [
  { value: 'apartment', label: 'Apartment & Flat Development', description: 'Multi-storey residential, sectional title' },
  { value: 'security_estate', label: 'Security Estate Development', description: 'Controlled access, estate governance' },
  { value: 'freehold', label: 'Freehold Housing Development', description: 'Standalone homes, erf ownership' },
  { value: 'mixed_residential', label: 'Mixed Residential Development', description: 'Multiple residential forms in one project' },
  { value: 'retirement', label: 'Retirement Development', description: 'Age-restricted, services-driven' },
  { value: 'student_accommodation', label: 'Student Accommodation', description: 'Purpose-built student living' },
  { value: 'townhouse_cluster', label: 'Townhouse / Cluster Development', description: 'Attached or semi-detached units' },
];

// =============================================================================
// COMMUNITY / PROPERTY SUB-TYPES (Secondary Selection per Development Type)
// =============================================================================

export type CommunityType =
  // Apartment & Flat Types
  | 'apartment_block'
  | 'flat_development'
  | 'penthouse_development'
  | 'loft_apartments'
  | 'studio_apartment_development'
  | 'walk_up_complex'
  | 'high_rise_tower'
  | 'mid_rise_complex'
  | 'mixed_apartment_complex'
  // Security Estate Types
  | 'security_estate_general'
  | 'golf_estate'
  | 'equestrian_estate'
  | 'country_estate'
  | 'lifestyle_estate'
  | 'eco_estate'
  | 'game_estate'
  | 'nature_estate'
  | 'coastal_security_estate'
  | 'mountain_estate'
  | 'residential_estate'
  // Freehold Housing Types
  | 'freehold_housing_development'
  | 'residential_township'
  | 'housing_estate_non_security'
  | 'suburban_housing_development'
  | 'cluster_housing_freehold'
  | 'infill_housing_development'
  | 'turnkey_housing_development'
  // Mixed Residential Types
  | 'mixed_residential_development'
  | 'integrated_residential_development'
  | 'live_work_precinct'
  | 'residential_lifestyle_precinct'
  // Retirement Types
  | 'retirement_village'
  | 'lifestyle_retirement_estate'
  | 'assisted_living_development'
  | 'frail_care_facility'
  | 'ccrc'
  | 'senior_living_apartments'
  // Student Accommodation Types
  | 'pbsa'
  | 'student_residence'
  | 'student_apartment_complex'
  | 'private_student_village'
  | 'campus_adjacent_housing'
  // Townhouse / Cluster Types
  | 'townhouse_development'
  | 'cluster_development'
  | 'gated_townhouse_complex'
  | 'simplex_complex'
  | 'duplex_complex'
  // Generic fallback
  | 'non_estate';

export const COMMUNITY_TYPE_OPTIONS: { value: CommunityType; label: string; description: string; triggersEstateProfile: boolean }[] = [
  // Apartment & Flat Types
  { value: 'apartment_block', label: 'Apartment Block', description: 'Standard apartment building', triggersEstateProfile: false },
  { value: 'flat_development', label: 'Flat Development', description: 'Multi-unit flat complex', triggersEstateProfile: false },
  { value: 'penthouse_development', label: 'Penthouse Development', description: 'Luxury top-floor units', triggersEstateProfile: false },
  { value: 'loft_apartments', label: 'Loft Apartments', description: 'Open-plan industrial style', triggersEstateProfile: false },
  { value: 'studio_apartment_development', label: 'Studio Apartment Development', description: 'Compact single-room units', triggersEstateProfile: false },
  { value: 'walk_up_complex', label: 'Walk-up Apartment Complex', description: 'Low-rise without elevator', triggersEstateProfile: false },
  { value: 'high_rise_tower', label: 'High-rise Residential Tower', description: '10+ storey building', triggersEstateProfile: false },
  { value: 'mid_rise_complex', label: 'Mid-rise Apartment Complex', description: '4-9 storey building', triggersEstateProfile: false },
  { value: 'mixed_apartment_complex', label: 'Mixed Apartment Complex', description: 'Studio/1/2/3 bed mix', triggersEstateProfile: false },
  // Security Estate Types
  { value: 'security_estate_general', label: 'Security Estate', description: 'Secured perimeter with access control', triggersEstateProfile: true },
  { value: 'golf_estate', label: 'Golf Estate', description: 'Built around a golf course', triggersEstateProfile: true },
  { value: 'equestrian_estate', label: 'Equestrian Estate', description: 'Horse-friendly with stables', triggersEstateProfile: true },
  { value: 'country_estate', label: 'Country Estate', description: 'Rural setting with large plots', triggersEstateProfile: true },
  { value: 'lifestyle_estate', label: 'Lifestyle Estate', description: 'Premium amenities focus', triggersEstateProfile: true },
  { value: 'eco_estate', label: 'Eco Estate', description: 'Environmentally focused', triggersEstateProfile: true },
  { value: 'game_estate', label: 'Game Estate', description: 'Wildlife and game reserve', triggersEstateProfile: true },
  { value: 'nature_estate', label: 'Nature Estate', description: 'Natural environment preserved', triggersEstateProfile: true },
  { value: 'coastal_security_estate', label: 'Coastal Security Estate', description: 'Beachfront or coastal location', triggersEstateProfile: true },
  { value: 'mountain_estate', label: 'Mountain Estate', description: 'Mountain or hillside location', triggersEstateProfile: true },
  { value: 'residential_estate', label: 'Residential Estate (General)', description: 'Generic security estate', triggersEstateProfile: true },
  // Freehold Housing Types
  { value: 'freehold_housing_development', label: 'Freehold Housing Development', description: 'Standalone homes on erven', triggersEstateProfile: false },
  { value: 'residential_township', label: 'Residential Township', description: 'Large-scale housing development', triggersEstateProfile: false },
  { value: 'housing_estate_non_security', label: 'Housing Estate (Non-Security)', description: 'Open access housing estate', triggersEstateProfile: false },
  { value: 'suburban_housing_development', label: 'Suburban Housing Development', description: 'Suburban family homes', triggersEstateProfile: false },
  { value: 'cluster_housing_freehold', label: 'Cluster Housing (Freehold)', description: 'Freehold clusters', triggersEstateProfile: false },
  { value: 'infill_housing_development', label: 'Infill Housing Development', description: 'Urban densification projects', triggersEstateProfile: false },
  { value: 'turnkey_housing_development', label: 'Turnkey Housing Development', description: 'Ready-to-occupy homes', triggersEstateProfile: false },
  // Mixed Residential Types
  { value: 'mixed_residential_development', label: 'Mixed Residential Development', description: 'Multiple unit types', triggersEstateProfile: false },
  { value: 'integrated_residential_development', label: 'Integrated Residential Development', description: 'Diverse housing integration', triggersEstateProfile: false },
  { value: 'live_work_precinct', label: 'Live-Work Precinct', description: 'Residential with workspace', triggersEstateProfile: false },
  { value: 'residential_lifestyle_precinct', label: 'Residential Lifestyle Precinct', description: 'Amenity-focused living', triggersEstateProfile: false },
  // Retirement Types
  { value: 'retirement_village', label: 'Retirement Village', description: 'Traditional retirement community', triggersEstateProfile: true },
  { value: 'lifestyle_retirement_estate', label: 'Lifestyle Retirement Estate', description: 'Active adult community', triggersEstateProfile: true },
  { value: 'assisted_living_development', label: 'Assisted Living Development', description: 'Support services included', triggersEstateProfile: true },
  { value: 'frail_care_facility', label: 'Frail Care Facility', description: 'Full nursing care', triggersEstateProfile: true },
  { value: 'ccrc', label: 'Continuing Care Retirement Community', description: 'Multi-level care campus', triggersEstateProfile: true },
  { value: 'senior_living_apartments', label: 'Senior Living Apartments', description: 'Age-restricted apartments', triggersEstateProfile: true },
  // Student Accommodation Types
  { value: 'pbsa', label: 'Purpose-Built Student Accommodation', description: 'PBSA standard', triggersEstateProfile: false },
  { value: 'student_residence', label: 'Student Residence', description: 'Traditional student dorms', triggersEstateProfile: false },
  { value: 'student_apartment_complex', label: 'Student Apartment Complex', description: 'Self-catering units', triggersEstateProfile: false },
  { value: 'private_student_village', label: 'Private Student Village', description: 'Campus-style living', triggersEstateProfile: false },
  { value: 'campus_adjacent_housing', label: 'Campus-Adjacent Housing', description: 'Near university location', triggersEstateProfile: false },
  // Townhouse / Cluster Types
  { value: 'townhouse_development', label: 'Townhouse Development', description: 'Multi-storey attached homes', triggersEstateProfile: false },
  { value: 'cluster_development', label: 'Cluster Development', description: 'Grouped sectional title homes', triggersEstateProfile: false },
  { value: 'gated_townhouse_complex', label: 'Gated Townhouse Complex', description: 'Secure townhouse estate', triggersEstateProfile: true },
  { value: 'simplex_complex', label: 'Simplex Complex', description: 'Single-level attached units', triggersEstateProfile: false },
  { value: 'duplex_complex', label: 'Duplex Complex', description: 'Two-unit attached homes', triggersEstateProfile: false },
  // Generic
  { value: 'non_estate', label: 'Non-Estate Development', description: 'Standard development', triggersEstateProfile: false },
];

// Mapping: Which community types are applicable for each residential type
export const RESIDENTIAL_TO_COMMUNITY_MAP: Record<ResidentialType, CommunityType[]> = {
  apartment: [
    'apartment_block', 'flat_development', 'penthouse_development', 'loft_apartments',
    'studio_apartment_development', 'walk_up_complex', 'high_rise_tower', 'mid_rise_complex',
    'mixed_apartment_complex'
  ],
  security_estate: [
    'security_estate_general', 'golf_estate', 'equestrian_estate', 'country_estate',
    'lifestyle_estate', 'eco_estate', 'game_estate', 'nature_estate',
    'coastal_security_estate', 'mountain_estate', 'residential_estate'
  ],
  freehold: [
    'freehold_housing_development', 'residential_township', 'housing_estate_non_security',
    'suburban_housing_development', 'cluster_housing_freehold', 'infill_housing_development',
    'turnkey_housing_development'
  ],
  mixed_residential: [
    'mixed_residential_development', 'integrated_residential_development',
    'live_work_precinct', 'residential_lifestyle_precinct'
  ],
  retirement: [
    'retirement_village', 'lifestyle_retirement_estate', 'assisted_living_development',
    'frail_care_facility', 'ccrc', 'senior_living_apartments'
  ],
  student_accommodation: [
    'pbsa', 'student_residence', 'student_apartment_complex',
    'private_student_village', 'campus_adjacent_housing'
  ],
  townhouse_cluster: [
    'townhouse_development', 'cluster_development', 'gated_townhouse_complex',
    'simplex_complex', 'duplex_complex'
  ],
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
