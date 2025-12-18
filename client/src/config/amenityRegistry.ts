/**
 * Centralized Amenity Registry
 * 
 * All amenities must be selected from this registry.
 * This ensures consistency for SEO, filtering, and analytics.
 */

export type AmenityCategory = 'security' | 'lifestyle' | 'sustainability' | 'convenience' | 'family';

export interface AmenityDefinition {
  key: string;
  label: string;
  category: AmenityCategory;
  icon?: string; // Lucide icon name
}

export const AMENITY_REGISTRY: AmenityDefinition[] = [
  // ==========================================================================
  // SECURITY
  // ==========================================================================
  { key: 'guard_house', label: 'Guard House', category: 'security', icon: 'Shield' },
  { key: 'access_control', label: 'Access Control', category: 'security', icon: 'KeyRound' },
  { key: 'cctv', label: 'CCTV Surveillance', category: 'security', icon: 'Camera' },
  { key: 'electric_fence', label: 'Electric Fencing', category: 'security', icon: 'Zap' },
  { key: 'patrol', label: 'Security Patrol', category: 'security', icon: 'ShieldCheck' },
  { key: 'alarm_system', label: 'Alarm System', category: 'security', icon: 'Bell' },

  // ==========================================================================
  // LIFESTYLE & RECREATION
  // ==========================================================================
  { key: 'swimming_pool', label: 'Swimming Pool', category: 'lifestyle', icon: 'Waves' },
  { key: 'gym', label: 'Gym / Fitness Centre', category: 'lifestyle', icon: 'Dumbbell' },
  { key: 'clubhouse', label: 'Clubhouse', category: 'lifestyle', icon: 'Home' },
  { key: 'tennis_court', label: 'Tennis Court', category: 'lifestyle', icon: 'Circle' },
  { key: 'golf_course', label: 'Golf Course', category: 'lifestyle', icon: 'Flag' },
  { key: 'walking_trails', label: 'Walking / Jogging Trails', category: 'lifestyle', icon: 'Footprints' },
  { key: 'braai_area', label: 'Braai / BBQ Area', category: 'lifestyle', icon: 'Flame' },
  { key: 'spa', label: 'Spa / Wellness Centre', category: 'lifestyle', icon: 'Sparkles' },
  { key: 'games_room', label: 'Games Room', category: 'lifestyle', icon: 'Gamepad2' },
  { key: 'cinema', label: 'Cinema Room', category: 'lifestyle', icon: 'Film' },
  { key: 'rooftop_deck', label: 'Rooftop Deck', category: 'lifestyle', icon: 'Building' },

  // ==========================================================================
  // SUSTAINABILITY
  // ==========================================================================
  { key: 'solar_power', label: 'Solar Power', category: 'sustainability', icon: 'Sun' },
  { key: 'solar_geyser', label: 'Solar Geyser', category: 'sustainability', icon: 'Thermometer' },
  { key: 'rainwater_harvesting', label: 'Rainwater Harvesting', category: 'sustainability', icon: 'CloudRain' },
  { key: 'borehole', label: 'Borehole Water', category: 'sustainability', icon: 'Droplets' },
  { key: 'grey_water', label: 'Grey Water System', category: 'sustainability', icon: 'Recycle' },
  { key: 'led_lighting', label: 'LED Lighting', category: 'sustainability', icon: 'Lightbulb' },
  { key: 'energy_efficient', label: 'Energy Efficient Design', category: 'sustainability', icon: 'Leaf' },
  { key: 'ev_charging', label: 'EV Charging Stations', category: 'sustainability', icon: 'PlugZap' },

  // ==========================================================================
  // CONVENIENCE
  // ==========================================================================
  { key: 'fibre_ready', label: 'Fibre Ready', category: 'convenience', icon: 'Wifi' },
  { key: 'backup_power', label: 'Backup Power / Generator', category: 'convenience', icon: 'BatteryFull' },
  { key: 'inverter', label: 'Inverter System', category: 'convenience', icon: 'Power' },
  { key: 'visitor_parking', label: 'Visitor Parking', category: 'convenience', icon: 'Car' },
  { key: 'covered_parking', label: 'Covered Parking', category: 'convenience', icon: 'Warehouse' },
  { key: 'lift', label: 'Lift / Elevator', category: 'convenience', icon: 'ArrowUpDown' },
  { key: 'concierge', label: 'Concierge Service', category: 'convenience', icon: 'User' },
  { key: 'laundry', label: 'Laundry Facilities', category: 'convenience', icon: 'Shirt' },
  { key: 'storage', label: 'Storage Units', category: 'convenience', icon: 'Package' },
  { key: 'wheelchair_access', label: 'Wheelchair Accessible', category: 'convenience', icon: 'Accessibility' },

  // ==========================================================================
  // FAMILY FRIENDLY
  // ==========================================================================
  { key: 'playground', label: "Children's Playground", category: 'family', icon: 'Baby' },
  { key: 'pet_friendly', label: 'Pet Friendly', category: 'family', icon: 'Dog' },
  { key: 'pet_park', label: 'Pet Park / Dog Run', category: 'family', icon: 'PawPrint' },
  { key: 'creche', label: 'Crèche / Daycare', category: 'family', icon: 'GraduationCap' },
  { key: 'after_school', label: 'After School Care', category: 'family', icon: 'BookOpen' },
  { key: 'splash_pool', label: 'Kids Splash Pool', category: 'family', icon: 'Droplet' },
  { key: 'jungle_gym', label: 'Jungle Gym', category: 'family', icon: 'TreePine' },
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

export const AMENITY_CATEGORIES: { key: AmenityCategory; label: string; description: string }[] = [
  { key: 'security', label: 'Security & Access', description: 'Safety and access control features' },
  { key: 'lifestyle', label: 'Lifestyle & Recreation', description: 'Leisure and entertainment facilities' },
  { key: 'sustainability', label: 'Sustainability', description: 'Eco-friendly and energy features' },
  { key: 'convenience', label: 'Convenience', description: 'Practical features and services' },
  { key: 'family', label: 'Family Friendly', description: 'Features for families and pets' },
];
