import type { RouterOutputs } from '@/lib/trpc';

export type SharedLivingPreviewCard = RouterOutputs['sharedLiving']['search']['items'][number];
export type SharedLivingPreviewDetail = RouterOutputs['sharedLiving']['detail'];

const media = (url: string, caption: string, isCover = false) => ({ url, caption, isCover });

const cottageImage = '/properties/property-detail-preview-v1/living-kitchen.webp';
const roomImage = '/properties/property-detail-preview-v1/principal-suite.webp';
const studyImage = '/properties/property-detail-preview-v1/study.webp';
const sharedRoomImage = '/properties/property-detail-preview-v1/principal-suite.webp';
const residenceImage = '/properties/property-detail-preview-v1/hero-exterior.webp';

function previewListing(input: {
  id: number;
  placeId: number;
  slug: string;
  placeSlug: string;
  residenceName: string;
  residenceDescription: string;
  placeKind: SharedLivingPreviewDetail['placeKind'];
  label: string;
  description: string;
  accommodationType: SharedLivingPreviewCard['accommodationType'];
  marketTag: SharedLivingPreviewCard['marketTag'];
  rentAmountMinor: number;
  rentBasis: SharedLivingPreviewCard['rentBasis'];
  availableFrom: string;
  occupancyCount: number;
  furnishedState: SharedLivingPreviewCard['furnishedState'];
  bathroomAccess: SharedLivingPreviewCard['bathroomAccess'];
  locationLabel: string;
  image: string;
  extraImages: string[];
  spaceFacilities: string[];
  sharedFacilities: string[];
}) {
  const images = [
    media(input.image, `${input.label} interior`, true),
    ...input.extraImages.map((url, index) => media(url, `${input.label} view ${index + 2}`)),
  ];
  const card: SharedLivingPreviewCard = {
    id: input.id,
    placeId: input.placeId,
    slug: input.slug,
    placeSlug: input.placeSlug,
    residenceName: input.residenceName,
    label: input.label,
    description: input.description,
    accommodationType: input.accommodationType,
    marketTag: input.marketTag,
    rentAmountMinor: input.rentAmountMinor,
    rentUnknown: false,
    rentBasis: input.rentBasis,
    availableFrom: input.availableFrom,
    availabilityStatus: 'available',
    furnishedState: input.furnishedState,
    bathroomAccess: input.bathroomAccess,
    occupancyCount: input.occupancyCount,
    locationLabel: input.locationLabel,
    images: images.map(({ url, caption, isCover }) => ({ url, caption, isCover })),
  };

  const detail: SharedLivingPreviewDetail = {
    id: input.id,
    placeId: input.placeId,
    slug: input.slug,
    placeSlug: input.placeSlug,
    residenceName: input.residenceName,
    residenceDescription: input.residenceDescription,
    placeKind: input.placeKind,
    label: input.label,
    description: input.description,
    accommodationType: input.accommodationType,
    marketTag: input.marketTag,
    availabilityStatus: 'available',
    occupancyCount: input.occupancyCount,
    furnishedState: input.furnishedState,
    bathroomAccess: input.bathroomAccess,
    parkingBays: 1,
    rentAmountMinor: input.rentAmountMinor,
    rentUnknown: false,
    rentBasis: input.rentBasis,
    availableFrom: input.availableFrom,
    bills: { electricity: 'included', water: 'included', wifi: 'to_be_confirmed' },
    spaceFacilities: input.spaceFacilities,
    sharedFacilities: input.sharedFacilities,
    locationLabel: input.locationLabel,
    images,
    residenceImages: [media(residenceImage, `${input.residenceName} exterior`, true)],
  };

  return { card, detail };
}

/** Fictional, local-only examples for the PR preview; never returned by search or enquiry APIs. */
export const SHARED_LIVING_PREVIEW_FIXTURES = [
  previewListing({
    id: -901,
    placeId: -901,
    slug: 'preview-randburg-garden-cottage',
    placeSlug: 'preview-acacia-cottage',
    residenceName: 'Acacia Garden Home',
    residenceDescription:
      'A fictional example home used to demonstrate how residence details accompany an accommodation space.',
    placeKind: 'house',
    label: 'Private garden cottage',
    description:
      'A self-contained garden cottage with a bright living area, kitchenette and private entrance. The image and listing details are illustrative preview content.',
    accommodationType: 'garden_cottage',
    marketTag: 'independent_micro',
    rentAmountMinor: 720000,
    rentBasis: 'per_space',
    availableFrom: '2026-12-01',
    occupancyCount: 2,
    furnishedState: 'furnished',
    bathroomAccess: 'own',
    locationLabel: 'Randburg, Johannesburg · example area',
    image: cottageImage,
    extraImages: [studyImage, residenceImage],
    spaceFacilities: ['kitchenette', 'private_entrance', 'private_bathroom', 'secure_parking'],
    sharedFacilities: ['garden', 'laundry', 'security'],
  }),
  previewListing({
    id: -902,
    placeId: -902,
    slug: 'preview-rosebank-private-room',
    placeSlug: 'preview-rosebank-home',
    residenceName: 'Rosebank Shared Home',
    residenceDescription:
      'A fictional example home used to demonstrate shared facilities separately from private room features.',
    placeKind: 'house',
    label: 'Furnished private room',
    description:
      'A furnished private bedroom in a shared home, with access to the shared kitchen and garden. The image and listing details are illustrative preview content.',
    accommodationType: 'private_room',
    marketTag: 'room_share',
    rentAmountMinor: 430000,
    rentBasis: 'per_space',
    availableFrom: '2026-12-01',
    occupancyCount: 1,
    furnishedState: 'furnished',
    bathroomAccess: 'shared',
    locationLabel: 'Rosebank, Johannesburg · example area',
    image: roomImage,
    extraImages: [cottageImage, studyImage],
    spaceFacilities: ['bed', 'wardrobe', 'desk'],
    sharedFacilities: ['shared_kitchen', 'garden', 'laundry', 'wifi'],
  }),
  previewListing({
    id: -903,
    placeId: -903,
    slug: 'preview-morningside-student-single',
    placeSlug: 'preview-morningside-student-residence',
    residenceName: 'Morningside Student Residence · preview',
    residenceDescription:
      'A fictional student residence example. This does not represent an accredited institution or verified campus relationship.',
    placeKind: 'student_residence',
    label: 'Student single room',
    description:
      'A furnished single-occupancy room with a desk and access to shared study and kitchen spaces. Campus links and funding eligibility are not asserted in this preview.',
    accommodationType: 'private_room',
    marketTag: 'student',
    rentAmountMinor: 650000,
    rentBasis: 'per_space',
    availableFrom: '2027-01-01',
    occupancyCount: 1,
    furnishedState: 'furnished',
    bathroomAccess: 'shared',
    locationLabel: 'Morningside, Johannesburg · example area',
    image: studyImage,
    extraImages: [roomImage, residenceImage],
    spaceFacilities: ['bed', 'desk', 'wardrobe'],
    sharedFacilities: ['study_area', 'shared_kitchen', 'security', 'wifi'],
  }),
  previewListing({
    id: -904,
    placeId: -903,
    slug: 'preview-morningside-student-shared',
    placeSlug: 'preview-morningside-student-residence',
    residenceName: 'Morningside Student Residence · preview',
    residenceDescription:
      'This second fictional space shares the same example residence as the single room, while keeping its own rent and occupancy.',
    placeKind: 'student_residence',
    label: 'Student shared room',
    description:
      'A shared student room with two separate sleeping spaces and access to the residence study area. Rent is shown per person. All content is illustrative preview data.',
    accommodationType: 'shared_room',
    marketTag: 'student',
    rentAmountMinor: 350000,
    rentBasis: 'per_person',
    availableFrom: '2027-01-01',
    occupancyCount: 2,
    furnishedState: 'furnished',
    bathroomAccess: 'shared',
    locationLabel: 'Morningside, Johannesburg · example area',
    image: sharedRoomImage,
    extraImages: [studyImage, roomImage],
    spaceFacilities: ['bed', 'desk', 'wardrobe'],
    sharedFacilities: ['study_area', 'shared_kitchen', 'security', 'wifi'],
  }),
] as const;

export const isSharedLivingPreviewEnabled = import.meta.env.DEV || __VERCEL_ENV__ === 'preview';
