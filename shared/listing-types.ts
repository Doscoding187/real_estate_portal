/**
 * Smart Listing Wizard - TypeScript Types
 *
 * Comprehensive type definitions for the listing creation wizard
 */

// Step 1: Action Types
export type ListingAction = 'sell' | 'rent' | 'auction';

// Listing Badges
export type ListingBadge =
  | 'ready_to_move'
  | 'under_construction'
  | 'off_plan'
  | 'move_in_ready'
  | 'fixer_upper'
  | 'renovated'
  | 'water_rights'
  | 'going_concern'
  | 'game_fenced'
  | 'irrigation'
  | 'organic_certified'
  | 'export_quality';

// Step 2: Property Types
export type PropertyType = 'apartment' | 'house' | 'farm' | 'land' | 'commercial' | 'shared_living';

// Property-specific field types
export interface ApartmentFields {
  propertySettings: 'sectional_title' | 'freehold';
  bedrooms: number;
  bathrooms: number;
  unitSizeM2: number;
  floorNumber?: number;
  levies?: number;
  ratesTaxes?: number;
  parkingType?: 'open' | 'covered' | 'garage' | 'none';
  balcony?: boolean;
  petFriendly?: boolean;
  amenities?: ('pool' | 'gym' | 'lift' | 'security' | '24hr_security' | 'concierge' | 'fiber')[];
  amenitiesFeatures?: string[];
}

export interface HouseFields {
  bedrooms: number;
  bathrooms: number;
  erfSizeM2: number;
  houseAreaM2: number;
  garages?: number;
  parkingCount?: number;
  garden?: boolean;
  pool?: boolean;
  boundaryWalls?: boolean;
  security?: 'alarm' | 'electric_fence' | 'security_estate' | 'none';
  ratesTaxes?: number;
  amenitiesFeatures?: string[];
}

export interface FarmFields {
  landSizeHa: number;
  zoningAgricultural?: string;
  waterSources?: ('borehole' | 'dam' | 'river' | 'municipal')[];
  irrigation?: 'drip' | 'pivot' | 'flood' | 'none';
  infrastructure?: ('roads' | 'fencing' | 'buildings' | 'sheds')[];
  staffQuarters?: boolean;
  farmSuitability?: ('crops' | 'livestock' | 'game' | 'vineyards' | 'orchards')[];
  residenceIncluded?: boolean;
  amenitiesFeatures?: string[];
}

export interface LandFields {
  landSizeM2OrHa: number;
  zoning?: 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'mixed';
  servicesAvailable?: ('water' | 'electricity' | 'sewer' | 'fiber')[];
  topography?: 'flat' | 'sloped' | 'mixed';
  developmentRights?: string;
  boundaryFences?: boolean;
  amenitiesFeatures?: string[];
}

export interface CommercialFields {
  subtype: 'office' | 'retail' | 'industrial' | 'warehouse' | 'mixed';
  floorAreaM2: number;
  parkingBays?: number;
  loadingBays?: number;
  powerSupply?: '3_phase' | 'single_phase' | 'generator';
  zoningBusinessUse?: string;
  amenitiesCommercial?: ('reception' | 'kitchen' | 'boardroom' | 'server_room')[];
  pricePerM2?: number;
  amenitiesFeatures?: string[];
}

export interface SharedLivingFields {
  roomsAvailable: number;
  bathroomTypePerRoom: 'shared' | 'private';
  kitchenType?: 'shared' | 'private' | 'none';
  occupancyType?: 'students' | 'professionals' | 'mixed';
  furnished?: boolean;
  internetIncluded?: boolean;
  depositRequired?: number;
  amenitiesFeatures?: string[];
}

// New interfaces for the additional requirements
export type PropertySetting =
  | 'apartment'
  | 'house'
  | 'farm'
  | 'land'
  | 'commercial'
  | 'shared_living'
  | 'sectional_title'
  | 'freehold'
  | 'estate_living'
  | 'complex'
  | 'gated_community';

export type ParkingType = 'open' | 'covered' | 'garage' | 'none';

export type AdditionalRoom =
  | 'pantry'
  | 'laundry_room'
  | 'study'
  | 'storeroom'
  | 'walk_in_closet'
  | 'utility_room'
  | string; // For custom room names

export type Amenity =
  | 'pool'
  | 'gym'
  | 'clubhouse'
  | 'braai_area'
  | 'kids_play_area'
  | 'elevator'
  | 'garden'
  | 'backup_power'
  | 'fibre_ready'
  | 'parking_bay'
  | 'access_control'
  | 'cctv'
  | 'electric_fence'
  | 'security_guard_house'
  | 'borehole';

// 12-Item Standard Set
export type OwnershipType =
  | 'sectional_title'
  | 'freehold'
  | 'estate_living'
  | 'complex'
  | 'gated_community';

export type PowerBackup = 'solar_system' | 'inverter_battery' | 'generator' | 'none';

export type ElectricitySource = 'prepaid' | 'municipal' | 'eskom' | 'solar_supplemented';

export type SecurityLevel =
  | '24_hour_security'
  | 'cctv'
  | 'access_control'
  | 'security_patrol'
  | 'electric_fence'
  | 'standard';

export type InternetAvailability = 'fibre_ready' | 'adsl' | 'lte_wireless' | '5g' | 'none';

export type WaterSupply = 'municipal' | 'prepaid' | 'borehole' | 'water_storage' | 'backup_tanks';

export type Furnishing = 'unfurnished' | 'semi_furnished' | 'fully_furnished';

export type FlooringTypeLegacy =
  | 'tiles'
  | 'laminated_wood'
  | 'vinyl'
  | 'carpet'
  | 'hardwood'
  | 'polished_concrete';

export type WaterHeating =
  | 'electric_geyser'
  | 'solar_geyser'
  | 'gas_water_heater'
  | 'heat_pump'
  | 'hybrid_system';

// Extended property details interface
export interface ExtendedPropertyDetails {
  // Basic property details
  propertySetting: PropertySetting;
  bedrooms?: number;
  bathrooms?: number;
  parkingType?: ParkingType;
  unitSizeM2?: number;
  floorNumber?: number;

  // Additional rooms
  additionalRooms?: AdditionalRoom[];

  // Amenities
  amenities?: Amenity[];

  // Amenities & Features
  amenitiesFeatures?: string[];

  // 12-Item Standard Set
  ownershipType?: OwnershipType;
  powerBackup?: PowerBackup;
  ratesTaxes?: number;
  electricitySource?: ElectricitySource;
  securityLevel?: SecurityLevel;
  petFriendly?: boolean;
  internetAvailability?: InternetAvailability;
  waterSupply?: WaterSupply;
  furnishing?: Furnishing;
  flooringType?: FlooringTypeLegacy;
  leviesHoaOperatingCosts?: number;
  waterHeating?: WaterHeating;
}

// Union type for all property details
export type PropertyDetails =
  | ApartmentFields
  | HouseFields
  | FarmFields
  | LandFields
  | CommercialFields
  | SharedLivingFields
  | ExtendedPropertyDetails;

// Step 3: Pricing Fields
export interface SellPricing {
  askingPrice: number;
  negotiable: boolean;
  transferCostEstimate?: number;
}

export interface RentPricing {
  monthlyRent: number;
  deposit: number;
  leaseTerms?: string;
  availableFrom?: Date;
  utilitiesIncluded: boolean;
}

export interface AuctionPricing {
  startingBid: number;
  reservePrice?: number;
  auctionDateTime: Date;
  auctionTermsDocumentUrl?: string;
}

export type PricingFields = SellPricing | RentPricing | AuctionPricing;

// Basic Information Fields (Step 4)
export interface BasicInformation {
  // Universal fields
  title: string;
  description: string;
  province: string;
  city: string;
  suburb?: string;
  streetAddress: string;
  
  // Transaction-specific fields (already in pricing, but some additional ones)
  availabilityStatus?: string;
  leaseTerm?: string;
  occupationDate?: Date;
  depositAmount?: number;
  auctionVenue?: string;
  
  // Property highlights (4 per type) - stored in propertyDetails
  // These are defined in the property-specific interfaces above
  
  // Status-specific fields (based on badge)
  noticePeriod?: string;
  currentRentalIncome?: number;
  completionDate?: Date;
  developerName?: string;
  unitTypes?: string;
  developmentName?: string;
  propertyCategory?: string;
  landSizeUnit?: string;
  possessionStatus?: string;
  leaseExpiryDate?: string;
  propertyAge?: number;
}

// Additional Information Fields (Step 4 - New)
// Additional Information Fields (Step 4 - New Redesign)
export type FurnishingStatus = 'unfurnished' | 'semi_furnished' | 'fully_furnished';
export type FlooringType = 'tile' | 'carpet' | 'wood' | 'laminate' | 'concrete' | 'other';
export type PetPolicy = 'allowed' | 'cats_only' | 'no_pets' | 'by_arrangement';
export type RoofType = 'tile' | 'metal' | 'slate' | 'thatch' | 'concrete' | 'other';
export type WallType = 'brick' | 'plaster' | 'wood' | 'stone' | 'concrete' | 'other';
export type WindowType = 'steel' | 'aluminium' | 'wood' | 'pvc' | 'other';
export type SecurityFeature = 'alarm' | 'electric_fence' | 'beams' | 'cctv' | '24hr_guard' | 'access_control';
export type OutdoorFeature = 'pool' | 'garden' | 'braai_area' | 'patio' | 'balcony' | 'deck';

export type CommercialGrade = 'a_grade' | 'b_grade' | 'c_grade' | 'premium';
export type AirConditioning = 'central' | 'split_units' | 'evaporative' | 'none';
export type InternetAccess = 'fibre' | 'adsl' | 'lte' | '5g' | 'satellite' | 'none';
export type TruckAccess = 'superlink' | 'rigid' | 'small_truck' | 'none';

export type IrrigationType = 'pivot' | 'drip' | 'flood' | 'micro' | 'none';
export type FarmWaterSource = 'borehole' | 'river' | 'dam' | 'municipal' | 'rainwater';
export type FarmFencing = 'game' | 'cattle' | 'electric' | 'barbed_wire' | 'mesh' | 'none';
export type FarmTopography = 'flat' | 'sloped' | 'hilly' | 'mountainous' | 'mixed';

export type HouseRule = 'no_smoking' | 'no_overnight_guests' | 'quiet_hours' | 'no_parties' | 'clean_up_after_self';
export type BillIncluded = 'water' | 'electricity' | 'wifi' | 'cleaning' | 'gas';

export interface AdditionalInformation {
  // Residential (House / Apartment)
  furnishingStatus?: FurnishingStatus;
  flooring?: FlooringType;
  petPolicy?: PetPolicy;
  roofType?: RoofType;
  wallType?: WallType;
  windowType?: WindowType;
  securityFeatures?: SecurityFeature[];
  outdoorFeatures?: OutdoorFeature[];

  // Commercial / Industrial
  grade?: CommercialGrade;
  airConditioning?: AirConditioning;
  internetAccess?: InternetAccess;
  loadingDocks?: number;
  truckAccess?: TruckAccess;
  parkingRatio?: number; // Bays per 100m²

  // Farm
  arableLandHa?: number;
  grazingLandHa?: number;
  irrigationType?: IrrigationType;
  waterSources?: FarmWaterSource[];
  fencing?: FarmFencing;
  topography?: FarmTopography;

  // Shared Living
  houseRules?: HouseRule[];
  billsIncluded?: BillIncluded[];
  minimumStayMonths?: number;
  
  // Legacy / Other (Keep generic if needed or remove if fully replacing)
  amenitiesFeatures?: string[];
}


// Step 4: Location
export interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  suburb?: string;
  province: string;
  postalCode?: string;
  placeId?: string; // Google Maps Place ID
}

// Step 5: Media
export type MediaType = 'image' | 'video' | 'floorplan' | 'pdf';

export interface MediaFile {
  id?: string;
  file?: File;
  url: string;
  type: MediaType;
  fileName?: string;
  fileSize?: number;
  thumbnailUrl?: string;
  previewUrl?: string;
  width?: number;
  height?: number;
  duration?: number; // for videos
  orientation?: 'vertical' | 'horizontal' | 'square';
  displayOrder: number;
  isPrimary: boolean;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  fileData?: string; // Base64 encoded file data for persistence
}

export interface MediaUploadLimits {
  maxImages: number;
  maxVideos: number;
  maxFloorplans: number;
  maxPdfs: number;
  maxImageSizeMB: number;
  maxVideoSizeMB: number;
  maxVideoDurationSeconds: number;
}

// Validation error types
export interface ValidationError {
  field: string;
  message: string;
}

// Full wizard state
export interface ListingWizardState {
  // Progress
  currentStep: number;
  completedSteps: number[];

  // Step 1: Action
  action?: ListingAction;

  // Step 1.5: Listing Badges (new step)
  badges?: ListingBadge[];

  // Step 2: Property Type
  propertyType?: PropertyType;

  // Step 3: Basic Info
  title: string;
  description: string;
  basicInfo?: Partial<BasicInformation>;

  // Step 4: Additional Information (NEW)
  additionalInfo?: AdditionalInformation;

  // Step 5: Pricing
  pricing?: PricingFields;

  // Property Details
  propertyDetails?: Partial<PropertyDetails>;

  // Step 4: Location
  location?: LocationData;

  // Step 5: Media
  media: MediaFile[];
  mainMediaId?: string;
  displayMediaType?: 'image' | 'video';

  // Validation
  errors: ValidationError[];
  isValid: boolean;

  // Status
  status: 'draft' | 'preview' | 'submitting' | 'submitted';

  // Metadata
  id?: number; // if editing existing listing
  createdAt?: Date;
  updatedAt?: Date;
}

// API Request/Response types
export interface CreateListingRequest {
  action: ListingAction;
  propertyType: PropertyType;
  title: string;
  description: string;
  pricing: PricingFields;
  propertyDetails: Partial<PropertyDetails>;
  location: LocationData;
  mediaIds: string[]; // IDs of uploaded media (S3 keys)
  mainMediaId?: string;
  status?: 'draft' | 'pending_review';
}

export interface UpdateListingRequest extends Partial<CreateListingRequest> {
  id: number;
}

export interface ListingResponse {
  id: number;
  slug: string;
  status: string;
  canonicalUrl: string;
  createdAt: string;
  publishedAt?: string;
}

// Media upload types
export interface MediaUploadRequest {
  file: File;
  listingId?: number;
  type: MediaType;
}

export interface MediaUploadResponse {
  id: number;
  url: string;
  thumbnailUrl?: string;
  processingStatus: string;
}

// Analytics types
export interface ListingAnalytics {
  totalViews: number;
  uniqueVisitors: number;
  totalLeads: number;
  contactFormLeads: number;
  whatsappClicks: number;
  phoneReveals: number;
  bookingViewingRequests: number;
  totalFavorites: number;
  totalShares: number;
  conversionRate: number;
  viewsByDay: { [date: string]: number };
  trafficSources: {
    direct: number;
    organic: number;
    social: number;
    referral: number;
    email: number;
    paid: number;
  };
}

// Lead types
export type LeadType =
  | 'contact_form'
  | 'whatsapp_click'
  | 'phone_reveal'
  | 'book_viewing'
  | 'make_offer'
  | 'request_info';

export interface ListingLead {
  id: number;
  listingId: number;
  name: string;
  email?: string;
  phone?: string;
  message?: string;
  leadType: LeadType;
  source?: string;
  status:
    | 'new'
    | 'contacted'
    | 'qualified'
    | 'viewing_scheduled'
    | 'offer_made'
    | 'converted'
    | 'lost';
  createdAt: string;
}

// Approval workflow types
export type ApprovalStatus = 'pending' | 'reviewing' | 'approved' | 'rejected';

export interface ApprovalQueueItem {
  id: number;
  listingId: number;
  submittedBy: number;
  submittedAt: string;
  status: ApprovalStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  reviewedBy?: number;
  reviewedAt?: string;
  reviewNotes?: string;
  rejectionReason?: string;
}

// Wizard form validation schemas (for Zod)
export const VALIDATION_RULES = {
  title: {
    minLength: 10,
    maxLength: 255,
  },
  description: {
    minLength: 50,
    maxLength: 5000,
  },
  price: {
    min: 1000,
    max: 1000000000,
  },
  area: {
    min: 1,
    max: 1000000,
  },
  video: {
    maxSizeMB: 50,
    maxDurationSeconds: 180,
    requiredOrientation: 'vertical',
  },
  image: {
    maxSizeMB: 5,
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
  },
} as const;

// Property type templates (for UI)
export const PROPERTY_TYPE_TEMPLATES: Record<
  PropertyType,
  {
    label: string;
    icon: string;
    description: string;
    requiredFields: string[];
  }
> = {
  apartment: {
    label: 'Apartment',
    icon: 'Building2',
    description: 'Flats, units, and sectional title properties',
    requiredFields: ['bedrooms', 'bathrooms', 'unitSizeM2', 'propertySettings'],
  },
  house: {
    label: 'House',
    icon: 'Home',
    description: 'Freestanding homes with land',
    requiredFields: ['bedrooms', 'bathrooms', 'erfSizeM2', 'houseAreaM2'],
  },
  farm: {
    label: 'Farm',
    icon: 'Wheat',
    description: 'Agricultural properties and farms',
    requiredFields: ['landSizeHa', 'farmSuitability'],
  },
  land: {
    label: 'Land/Plot',
    icon: 'Map',
    description: 'Vacant land and development plots',
    requiredFields: ['landSizeM2OrHa', 'zoning'],
  },
  commercial: {
    label: 'Commercial',
    icon: 'Store',
    description: 'Office, retail, industrial properties',
    requiredFields: ['subtype', 'floorAreaM2'],
  },
  shared_living: {
    label: 'Shared Living',
    icon: 'Users',
    description: 'Student accommodation, co-living spaces',
    requiredFields: ['roomsAvailable', 'bathroomTypePerRoom'],
  },
};

// Badge templates (for UI)
export const BADGE_TEMPLATES: Record<
  ListingBadge,
  {
    label: string;
    description: string;
    icon?: string;
    color?: string;
  }
> = {
  ready_to_move: {
    label: 'Ready to Move',
    description: 'Property is ready for immediate occupancy',
  },
  under_construction: {
    label: 'Under Construction',
    description: 'Property is currently under construction',
  },
  off_plan: {
    label: 'Off-Plan',
    description: 'Property is being sold from architectural plans',
  },
  move_in_ready: {
    label: 'Move-in Ready',
    description: 'Property is fully finished and ready for occupancy',
  },
  fixer_upper: {
    label: 'Fixer-Upper',
    description: 'Property needs renovation or repair work',
  },
  renovated: {
    label: 'Renovated',
    description: 'Recently updated with modern finishes',
    icon: 'sparkles',
    color: 'purple',
  },
  water_rights: {
    label: 'Water Rights',
    description: 'Registered water rights included',
    icon: 'droplets',
    color: 'blue',
  },
  going_concern: {
    label: 'Going Concern',
    description: 'Sold as an operational business',
    icon: 'briefcase',
    color: 'green',
  },
  game_fenced: {
    label: 'Game Fenced',
    description: 'Fully fenced for game farming',
    icon: 'fence',
    color: 'orange',
  },
  irrigation: {
    label: 'Irrigation',
    description: 'Established irrigation infrastructure',
    icon: 'sprout',
    color: 'cyan',
  },
  organic_certified: {
    label: 'Organic Certified',
    description: 'Certified organic production',
    icon: 'leaf',
    color: 'green',
  },
  export_quality: {
    label: 'Export Quality',
    description: 'Produces export-grade commodities',
    icon: 'globe',
    color: 'indigo',
  },
};
