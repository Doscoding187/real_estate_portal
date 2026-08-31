/**
 * Shared Living is its own accommodation marketplace. These values are kept
 * outside the residential property taxonomy deliberately: a room or small
 * place must never be inferred from a Rent property type.
 */
export const SHARED_LIVING_ACCOMMODATION_TYPES = [
  'private_room',
  'shared_room',
  'en_suite_room',
  'garden_cottage',
  'granny_flat',
  'bachelor_studio',
  'backyard_room',
  'backyard_unit',
  'room_shared_house',
  'room_shared_apartment',
] as const;

export type SharedLivingAccommodationType = (typeof SHARED_LIVING_ACCOMMODATION_TYPES)[number];

export const SHARED_LIVING_MARKET_TAGS = ['room_share', 'independent_micro', 'student'] as const;

export type SharedLivingMarketTag = (typeof SHARED_LIVING_MARKET_TAGS)[number];

export const SHARED_LIVING_PLACE_KINDS = [
  'house',
  'apartment',
  'townhouse',
  'student_residence',
  'other',
] as const;

export type SharedLivingPlaceKind = (typeof SHARED_LIVING_PLACE_KINDS)[number];

export const SHARED_LIVING_SPACE_STATUSES = ['available', 'occupied', 'paused', 'hidden'] as const;

export type SharedLivingSpaceStatus = (typeof SHARED_LIVING_SPACE_STATUSES)[number];

export const SHARED_LIVING_ACCOMMODATION_LABELS: Record<SharedLivingAccommodationType, string> = {
  private_room: 'Private room',
  shared_room: 'Shared room / bed',
  en_suite_room: 'En-suite room',
  garden_cottage: 'Garden cottage',
  granny_flat: 'Granny flat',
  bachelor_studio: 'Bachelor / studio',
  backyard_room: 'Backyard room',
  backyard_unit: 'Backyard flat',
  room_shared_house: 'Room in shared house',
  room_shared_apartment: 'Room in shared apartment',
};

export const SHARED_LIVING_STANDALONE_TYPES = new Set<SharedLivingAccommodationType>([
  'garden_cottage',
  'granny_flat',
  'bachelor_studio',
  'backyard_unit',
]);
