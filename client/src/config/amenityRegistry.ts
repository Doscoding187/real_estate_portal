export type AmenityCategory =
  | 'security'
  | 'lifestyle'
  | 'sustainability'
  | 'convenience'
  | 'family';

export interface AmenityItem {
  key: string;
  label: string;
  category: AmenityCategory;
}

export const AMENITY_CATEGORIES: { key: AmenityCategory; label: string; description: string }[] = [
  {
    key: 'security',
    label: 'Security & Access',
    description: 'Safety and access control features',
  },
  {
    key: 'lifestyle',
    label: 'Lifestyle & Recreation',
    description: 'Fitness, sports, and leisure facilities',
  },
  {
    key: 'sustainability',
    label: 'Sustainability',
    description: 'Eco-friendly and energy-efficient features',
  },
  {
    key: 'convenience',
    label: 'Services & Convenience',
    description: 'Daily comforts and utilities',
  },
  {
    key: 'family',
    label: 'Family & Kids',
    description: 'Child-friendly amenities',
  },
];

export const AMENITY_REGISTRY: AmenityItem[] = [
  // Security
  { key: '24_hour_security', label: '24-Hour Security', category: 'security' },
  { key: 'access_control', label: 'Access Control', category: 'security' },
  { key: 'guard_house', label: 'Guard House', category: 'security' },
  { key: 'perimeter_fencing', label: 'Perimeter Fencing', category: 'security' },
  { key: 'electric_fencing', label: 'Electric Fencing', category: 'security' },
  { key: 'cctv_surveillance', label: 'CCTV Surveillance', category: 'security' },
  { key: 'controlled_gate_access', label: 'Controlled Gate Access', category: 'security' },
  { key: 'biometric_access', label: 'Biometric Access', category: 'security' },
  { key: 'boom_gates', label: 'Boom Gates', category: 'security' },
  { key: 'security_patrols', label: 'On-Site Security Patrols', category: 'security' },
  { key: 'visitor_access', label: 'Visitor Access Management', category: 'security' },
  { key: 'intercom_system', label: 'Intercom Access System', category: 'security' },
  { key: 'license_plate_recognition', label: 'License Plate Recognition', category: 'security' },
  { key: 'facial_recognition', label: 'Facial Recognition Access', category: 'security' },
  { key: 'boundary_walls', label: 'Secure Boundary Walls', category: 'security' },
  { key: 'panic_button', label: 'Panic Button System', category: 'security' },
  { key: 'motion_lighting', label: 'Motion Sensor Lighting', category: 'security' },
  { key: 'security_escort', label: 'Security Escort Service', category: 'security' },
  { key: 'parcel_lockers', label: 'Secure Parcel Delivery Lockers', category: 'security' },

  // Lifestyle
  { key: 'swimming_pool', label: 'Swimming Pool', category: 'lifestyle' },
  { key: 'gym', label: 'Gym / Fitness Centre', category: 'lifestyle' },
  { key: 'clubhouse', label: 'Clubhouse', category: 'lifestyle' },
  { key: 'tennis_courts', label: 'Tennis Courts', category: 'lifestyle' },
  { key: 'squash_courts', label: 'Squash Courts', category: 'lifestyle' },
  { key: 'padel_courts', label: 'Padel Courts', category: 'lifestyle' },
  { key: 'basketball_court', label: 'Basketball Court', category: 'lifestyle' },
  { key: 'jogging_trails', label: 'Jogging / Walking Trails', category: 'lifestyle' },
  { key: 'outdoor_entertainment', label: 'Outdoor Entertainment Area', category: 'lifestyle' },
  { key: 'braai_facilities', label: 'Braai / BBQ Facilities', category: 'lifestyle' },
  { key: 'community_hall', label: 'Community Hall', category: 'lifestyle' },
  { key: 'sauna_steam', label: 'Sauna / Steam Room', category: 'lifestyle' },
  { key: 'spa_facilities', label: 'Spa Facilities', category: 'lifestyle' },
  { key: 'yoga_studio', label: 'Yoga Studio', category: 'lifestyle' },
  { key: 'pet_park', label: 'Pet Park / Dog Run', category: 'lifestyle' },
  { key: 'picnic_areas', label: 'Picnic Areas', category: 'lifestyle' },
  { key: 'outdoor_gym', label: 'Outdoor Gym', category: 'lifestyle' },
  { key: 'bocce_court', label: 'Bocce / Pétanque Court', category: 'lifestyle' },
  { key: 'golf_course', label: 'Golf Course', category: 'lifestyle' },
  { key: 'equestrian_facilities', label: 'Equestrian Facilities', category: 'lifestyle' },
  { key: 'private_beach_access', label: 'Private Beach Access', category: 'lifestyle' },

  // Sustainability
  { key: 'solar_power', label: 'Solar Power / Solar-Ready', category: 'sustainability' },
  { key: 'rainwater_harvesting', label: 'Rainwater Harvesting', category: 'sustainability' },
  { key: 'grey_water_system', label: 'Grey Water System', category: 'sustainability' },
  {
    key: 'energy_efficient_lighting',
    label: 'Energy-Efficient Lighting',
    category: 'sustainability',
  },
  { key: 'recycling_facilities', label: 'Recycling Facilities', category: 'sustainability' },
  { key: 'ev_charging', label: 'EV Charging Stations', category: 'sustainability' },
  { key: 'water_wise_gardens', label: 'Water-Wise Gardens', category: 'sustainability' },
  { key: 'green_building', label: 'Green Building Certification', category: 'sustainability' },
  { key: 'composting', label: 'Composting Facilities', category: 'sustainability' },
  {
    key: 'sustainable_materials',
    label: 'Sustainable Building Materials',
    category: 'sustainability',
  },

  // Convenience
  { key: 'fibre_ready', label: 'Fibre-Ready / High-Speed Internet', category: 'convenience' },
  { key: 'backup_water', label: 'Backup Water Supply', category: 'convenience' },
  { key: 'backup_power', label: 'Backup Generator / Power', category: 'convenience' },
  { key: 'maintenance_team', label: 'On-Site Maintenance Team', category: 'convenience' },
  { key: 'property_management', label: 'Property Management Office', category: 'convenience' },
  { key: 'concierge', label: 'Concierge Service', category: 'convenience' },
  { key: 'shuttle_service', label: 'Shuttle Service', category: 'convenience' },
  { key: 'parcel_collection', label: 'Parcel Collection Point', category: 'convenience' },
  { key: 'car_wash', label: 'Car Wash Bay', category: 'convenience' },
  { key: 'visitor_parking', label: 'Visitor Parking', category: 'convenience' },
  { key: 'covered_parking', label: 'Covered Parking', category: 'convenience' },
  { key: 'undercover_parking', label: 'Undercover Parking', category: 'convenience' },
  { key: 'guest_suites', label: 'Guest Suites / Accommodation', category: 'convenience' },
  { key: 'business_centre', label: 'Business Centre / Co-Working', category: 'convenience' },
  { key: 'meeting_rooms', label: 'Meeting Rooms', category: 'convenience' },
  { key: 'storage_units', label: 'Storage Units Available', category: 'convenience' },

  // Family
  { key: 'childrens_play_area', label: "Children's Play Area", category: 'family' },
  { key: 'splash_pool', label: "Kids' Splash Pool", category: 'family' },
  { key: 'jungle_gym', label: 'Jungle Gym', category: 'family' },
  { key: 'trampoline_park', label: 'Trampoline Park', category: 'family' },
  { key: 'kids_clubhouse', label: "Kids' Clubhouse", category: 'family' },
  { key: 'teen_rec_room', label: 'Teen Recreation Room', category: 'family' },
  { key: 'childcare', label: 'Childcare Facilities', category: 'family' },
  { key: 'nursery_school', label: 'Nursery School / Crèche', category: 'family' },
  { key: 'playground_equipment', label: 'Playground Equipment', category: 'family' },
  { key: 'family_entertainment', label: 'Family Entertainment Area', category: 'family' },
  { key: 'pedestrian_pathways', label: 'Safe Pedestrian Pathways', category: 'family' },
  { key: 'bicycle_routes', label: 'Bicycle-Friendly Routes', category: 'family' },
];

export const COMMON_PICK_AMENITIES = [
  '24_hour_security',
  'access_control',
  'fibre_ready',
  'parking',
  'swimming_pool',
  'pet_friendly_area',
];

export const getAmenitiesByCategory = (category: AmenityCategory) => {
  return AMENITY_REGISTRY.filter(item => item.category === category);
};

export const getAmenityByKey = (key: string) => {
  return AMENITY_REGISTRY.find(item => item.key === key);
};
