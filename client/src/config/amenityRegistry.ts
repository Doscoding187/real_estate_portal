/**
 * Centralized Amenity Registry
 * 
 * South Africa-appropriate, production-grade amenities matrix.
 * Powers faceted search, SEO landing pages, and buyer intent matching.
 * 
 * Categories: Security, Lifestyle, Sustainability, Convenience, Family
 */

export type AmenityCategory = 'security' | 'lifestyle' | 'sustainability' | 'convenience' | 'family';

export interface AmenityDefinition {
  key: string;
  label: string;
  category: AmenityCategory;
  icon?: string; // Lucide icon name
  tier?: 'core' | 'enhanced' | 'premium'; // For filtering/display grouping
}

export const AMENITY_REGISTRY: AmenityDefinition[] = [
  // ==========================================================================
  // SECURITY & ACCESS
  // Estate/development controlled features - Most developments select 3–5 here
  // ==========================================================================
  // Core (very common)
  { key: 'security_24h', label: '24-Hour Security', category: 'security', icon: 'Shield', tier: 'core' },
  { key: 'access_control', label: 'Access Control', category: 'security', icon: 'KeyRound', tier: 'core' },
  { key: 'guard_house', label: 'Guard House', category: 'security', icon: 'Building2', tier: 'core' },
  { key: 'perimeter_fencing', label: 'Perimeter Fencing', category: 'security', icon: 'Fence', tier: 'core' },
  { key: 'electric_fencing', label: 'Electric Fencing', category: 'security', icon: 'Zap', tier: 'core' },
  { key: 'cctv', label: 'CCTV Surveillance', category: 'security', icon: 'Camera', tier: 'core' },
  { key: 'controlled_gate', label: 'Controlled Gate Access', category: 'security', icon: 'DoorClosed', tier: 'core' },
  // Enhanced / Estate-grade
  { key: 'biometric_access', label: 'Biometric Access', category: 'security', icon: 'Fingerprint', tier: 'enhanced' },
  { key: 'boom_gates', label: 'Boom Gates', category: 'security', icon: 'TrafficCone', tier: 'enhanced' },
  { key: 'security_patrol', label: 'On-Site Security Patrols', category: 'security', icon: 'ShieldCheck', tier: 'enhanced' },
  { key: 'visitor_management', label: 'Visitor Access Management', category: 'security', icon: 'Users', tier: 'enhanced' },
  { key: 'intercom_access', label: 'Intercom Access System', category: 'security', icon: 'Phone', tier: 'enhanced' },
  // High-end / Premium
  { key: 'license_plate_recognition', label: 'License Plate Recognition', category: 'security', icon: 'ScanLine', tier: 'premium' },
  { key: 'facial_recognition', label: 'Facial Recognition Access', category: 'security', icon: 'ScanFace', tier: 'premium' },
  { key: 'secure_boundary_walls', label: 'Secure Boundary Walls', category: 'security', icon: 'Square', tier: 'premium' },
  { key: 'panic_button', label: 'Panic Button System', category: 'security', icon: 'AlertCircle', tier: 'enhanced' },

  // ==========================================================================
  // LIFESTYLE & RECREATION
  // Shared leisure and wellness amenities
  // ==========================================================================
  // Outdoor
  { key: 'swimming_pool', label: 'Swimming Pool', category: 'lifestyle', icon: 'Waves', tier: 'core' },
  { key: 'braai_area', label: 'Communal Braai Area', category: 'lifestyle', icon: 'Flame', tier: 'core' },
  { key: 'landscaped_gardens', label: 'Landscaped Gardens', category: 'lifestyle', icon: 'Flower2', tier: 'core' },
  { key: 'walking_trails', label: 'Walking Trails', category: 'lifestyle', icon: 'Footprints', tier: 'core' },
  { key: 'running_paths', label: 'Running Paths', category: 'lifestyle', icon: 'Route', tier: 'core' },
  { key: 'outdoor_gym', label: 'Outdoor Gym', category: 'lifestyle', icon: 'Dumbbell', tier: 'enhanced' },
  { key: 'picnic_areas', label: 'Picnic Areas', category: 'lifestyle', icon: 'Tent', tier: 'core' },
  // Sport & Fitness
  { key: 'gym', label: 'Gym / Fitness Centre', category: 'lifestyle', icon: 'Dumbbell', tier: 'core' },
  { key: 'tennis_court', label: 'Tennis Court', category: 'lifestyle', icon: 'CircleDot', tier: 'enhanced' },
  { key: 'padel_court', label: 'Padel Court', category: 'lifestyle', icon: 'Gamepad2', tier: 'premium' },
  { key: 'squash_court', label: 'Squash Court', category: 'lifestyle', icon: 'Square', tier: 'enhanced' },
  { key: 'sports_field', label: 'Sports Field', category: 'lifestyle', icon: 'Trophy', tier: 'enhanced' },
  { key: 'multi_purpose_court', label: 'Multi-Purpose Court', category: 'lifestyle', icon: 'LayoutGrid', tier: 'enhanced' },
  // Social
  { key: 'clubhouse', label: 'Clubhouse', category: 'lifestyle', icon: 'Home', tier: 'core' },
  { key: 'residents_lounge', label: "Residents' Lounge", category: 'lifestyle', icon: 'Sofa', tier: 'enhanced' },
  { key: 'entertainment_area', label: 'Entertainment Area', category: 'lifestyle', icon: 'PartyPopper', tier: 'enhanced' },
  { key: 'coffee_kiosk', label: 'Coffee Kiosk / Café', category: 'lifestyle', icon: 'Coffee', tier: 'premium' },
  { key: 'games_room', label: 'Games Room', category: 'lifestyle', icon: 'Gamepad2', tier: 'enhanced' },
  { key: 'rooftop_deck', label: 'Rooftop Deck', category: 'lifestyle', icon: 'Building', tier: 'premium' },

  // ==========================================================================
  // SUSTAINABILITY
  // Eco-friendly and energy features - Important for SEO & buyer trust
  // ==========================================================================
  // Energy
  { key: 'solar_panels', label: 'Solar Panels', category: 'sustainability', icon: 'Sun', tier: 'core' },
  { key: 'solar_geysers', label: 'Solar Geysers', category: 'sustainability', icon: 'Thermometer', tier: 'core' },
  { key: 'backup_power', label: 'Backup Power (Generator)', category: 'sustainability', icon: 'BatteryFull', tier: 'core' },
  { key: 'loadshedding_backup', label: 'Load-Shedding Backup', category: 'sustainability', icon: 'PlugZap', tier: 'core' },
  { key: 'energy_efficient_lighting', label: 'Energy-Efficient Lighting', category: 'sustainability', icon: 'Lightbulb', tier: 'core' },
  { key: 'inverter_system', label: 'Inverter System', category: 'sustainability', icon: 'Power', tier: 'enhanced' },
  // Water
  { key: 'borehole', label: 'Borehole', category: 'sustainability', icon: 'Droplets', tier: 'core' },
  { key: 'water_tanks', label: 'Water Tanks', category: 'sustainability', icon: 'Container', tier: 'core' },
  { key: 'greywater_recycling', label: 'Greywater Recycling', category: 'sustainability', icon: 'Recycle', tier: 'enhanced' },
  { key: 'rainwater_harvesting', label: 'Rainwater Harvesting', category: 'sustainability', icon: 'CloudRain', tier: 'enhanced' },
  { key: 'water_wise_landscaping', label: 'Water-Wise Landscaping', category: 'sustainability', icon: 'Leaf', tier: 'core' },
  // Environmental
  { key: 'eco_friendly_design', label: 'Eco-Friendly Design', category: 'sustainability', icon: 'TreeDeciduous', tier: 'core' },
  { key: 'indigenous_gardens', label: 'Indigenous Gardens', category: 'sustainability', icon: 'Flower', tier: 'core' },
  { key: 'waste_recycling', label: 'Waste Recycling Facilities', category: 'sustainability', icon: 'Trash2', tier: 'core' },

  // ==========================================================================
  // CONVENIENCE
  // Practical, daily-living features
  // ==========================================================================
  // Connectivity
  { key: 'fibre_ready', label: 'Fibre-Ready', category: 'convenience', icon: 'Wifi', tier: 'core' },
  { key: 'high_speed_internet', label: 'High-Speed Internet', category: 'convenience', icon: 'Router', tier: 'core' },
  { key: 'communal_wifi', label: 'Communal Wi-Fi Areas', category: 'convenience', icon: 'WifiHigh', tier: 'enhanced' },
  // Services
  { key: 'onsite_management', label: 'On-Site Management', category: 'convenience', icon: 'UserCog', tier: 'core' },
  { key: 'maintenance_services', label: 'Maintenance Services', category: 'convenience', icon: 'Wrench', tier: 'core' },
  { key: 'concierge', label: 'Concierge / Reception', category: 'convenience', icon: 'UserCheck', tier: 'enhanced' },
  { key: 'cleaning_services', label: 'Cleaning Services', category: 'convenience', icon: 'Sparkles', tier: 'enhanced' },
  { key: 'laundry_facilities', label: 'Laundry Facilities', category: 'convenience', icon: 'Shirt', tier: 'core' },
  // Mobility & Access
  { key: 'visitor_parking', label: 'Visitor Parking', category: 'convenience', icon: 'Car', tier: 'core' },
  { key: 'covered_parking', label: 'Covered Parking', category: 'convenience', icon: 'Warehouse', tier: 'core' },
  { key: 'car_wash_bay', label: 'Car Wash Bay', category: 'convenience', icon: 'Droplet', tier: 'enhanced' },
  { key: 'ev_charging', label: 'Electric Vehicle Charging', category: 'convenience', icon: 'PlugZap', tier: 'premium' },
  { key: 'shuttle_service', label: 'Shuttle Service', category: 'convenience', icon: 'Bus', tier: 'enhanced' },
  { key: 'wheelchair_access', label: 'Wheelchair Accessible', category: 'convenience', icon: 'Accessibility', tier: 'core' },
  { key: 'lift', label: 'Lift / Elevator', category: 'convenience', icon: 'ArrowUpDown', tier: 'core' },
  // Retail / Work
  { key: 'convenience_store', label: 'Convenience Store', category: 'convenience', icon: 'Store', tier: 'premium' },
  { key: 'coworking_space', label: 'Co-Working Space', category: 'convenience', icon: 'Laptop', tier: 'enhanced' },
  { key: 'business_centre', label: 'Business Centre', category: 'convenience', icon: 'Briefcase', tier: 'premium' },

  // ==========================================================================
  // FAMILY FRIENDLY
  // Strong emotional & lifestyle drivers
  // ==========================================================================
  // Children
  { key: 'playground', label: "Children's Play Area", category: 'family', icon: 'Baby', tier: 'core' },
  { key: 'jungle_gym', label: 'Jungle Gym', category: 'family', icon: 'TreePine', tier: 'core' },
  { key: 'splash_pad', label: 'Splash Pad', category: 'family', icon: 'Droplet', tier: 'enhanced' },
  { key: 'play_park', label: 'Play Park', category: 'family', icon: 'Laugh', tier: 'core' },
  // Education & Care
  { key: 'creche', label: 'Crèche / Daycare', category: 'family', icon: 'GraduationCap', tier: 'enhanced' },
  { key: 'aftercare', label: 'Aftercare Facilities', category: 'family', icon: 'BookOpen', tier: 'enhanced' },
  { key: 'homework_centre', label: 'Homework Centre', category: 'family', icon: 'PenTool', tier: 'enhanced' },
  // Community
  { key: 'pet_friendly', label: 'Pet-Friendly', category: 'family', icon: 'Dog', tier: 'core' },
  { key: 'dog_park', label: 'Dog Park', category: 'family', icon: 'PawPrint', tier: 'enhanced' },
  { key: 'safe_walking_areas', label: 'Safe Walking Areas', category: 'family', icon: 'Footprints', tier: 'core' },
  { key: 'traffic_calmed_roads', label: 'Traffic-Calmed Roads', category: 'family', icon: 'Car', tier: 'core' },
  // Health & Safety
  { key: 'medical_room', label: 'On-Site Medical Room', category: 'family', icon: 'Stethoscope', tier: 'enhanced' },
  { key: 'frail_care', label: 'Frail Care Facilities', category: 'family', icon: 'HeartHandshake', tier: 'enhanced' },
  { key: 'assisted_living_support', label: 'Assisted Living Support', category: 'family', icon: 'HandHeart', tier: 'enhanced' },
];

// =============================================================================
// COMMON PICKS - Auto-suggest for high conversion
// =============================================================================
export const COMMON_PICK_AMENITIES = [
  'security_24h',
  'access_control',
  'fibre_ready',
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export const getAmenitiesByCategory = (category: AmenityCategory): AmenityDefinition[] =>
  AMENITY_REGISTRY.filter(a => a.category === category);

export const getAmenityByKey = (key: string): AmenityDefinition | undefined =>
  AMENITY_REGISTRY.find(a => a.key === key);

export const getAmenityLabel = (key: string): string =>
  getAmenityByKey(key)?.label ?? key;

export const getAmenitiesByTier = (tier: 'core' | 'enhanced' | 'premium'): AmenityDefinition[] =>
  AMENITY_REGISTRY.filter(a => a.tier === tier);

export const AMENITY_CATEGORIES: { key: AmenityCategory; label: string; description: string }[] = [
  { key: 'security', label: 'Security & Access', description: 'Safety, access control, and perimeter features' },
  { key: 'lifestyle', label: 'Lifestyle & Recreation', description: 'Leisure, wellness, and social amenities' },
  { key: 'sustainability', label: 'Sustainability', description: 'Eco-friendly, energy, and water features' },
  { key: 'convenience', label: 'Convenience', description: 'Connectivity, services, and practical features' },
  { key: 'family', label: 'Family Friendly', description: 'Features for children, pets, and community' },
];
