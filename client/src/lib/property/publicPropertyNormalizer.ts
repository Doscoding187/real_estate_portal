import {
  Bath,
  Bed,
  Building2,
  Car,
  CheckCircle2,
  Droplets,
  Home,
  LandPlot,
  MapPin,
  Maximize,
  Ruler,
  Shield,
  Sparkles,
  Zap,
  Wifi,
  type LucideIcon,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { resolveMediaUrl } from '@/lib/mediaUtils';
import type {
  ImageUrls,
  SearchCardDevelopmentRef,
  SearchCardDeveloperBrandRef,
  SearchCardIdentity,
} from '@/../../shared/types';

export type PropertyFact = {
  key: string;
  label: string;
  value: string;
  shortValue: string;
  icon: LucideIcon;
  priority: number;
};

export type PropertyCardPrice = {
  amount: number;
  label: string;
  qualifier?: 'from' | 'monthly' | 'auction' | 'request';
  listingType?: string;
};

export type PropertyCardLocation = {
  label: string;
  address?: string;
  suburb?: string;
  city?: string;
  province?: string;
};

export type PublicPropertyCard = {
  kind: 'property';
  id: string;
  propertyId?: number;
  sourceListingId?: number;
  href: string;
  title: string;
  location: string;
  address?: string;
  city: string;
  suburb: string;
  province: string;
  price: number;
  priceLabel: string;
  image: string;
  images: ImageUrls[];
  description?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  yardSize?: number;
  propertyType?: string;
  listingType?: string;
  listingSource: 'manual' | 'development';
  listerType?: 'agent' | 'agency' | 'private';
  contactRole: SearchCardIdentity['role'];
  identity: SearchCardIdentity;
  development?: SearchCardDevelopmentRef;
  developerBrand?: SearchCardDeveloperBrandRef;
  highlights: string[];
  badges: string[];
  imageCount: number;
  videoCount: number;
  listedDate?: Date;
  latitude?: number;
  longitude?: number;
  facts: PropertyFact[];
  compactFacts: PropertyFact[];
  sourceType?: string;
};

export type PropertyLike = Record<string, any>;

export type PropertyFeatureSpecCategory =
  | 'cost'
  | 'utility'
  | 'security'
  | 'lifestyle'
  | 'ownership'
  | 'parking';

export type PropertyFeatureSpecItem = {
  key: string;
  label: string;
  value: string;
  icon: LucideIcon;
  priority: number;
  category: PropertyFeatureSpecCategory;
};

const parsePositiveNumber = (value: unknown): number | undefined => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const parseObject = (value: unknown): Record<string, any> => {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
};

const parseArray = (value: unknown): any[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : value.trim() ? [value] : [];
    } catch {
      return value.trim() ? [value] : [];
    }
  }
  return [];
};

const titleCase = (value?: unknown): string => {
  return String(value || '')
    .replace(/[_-]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};

const formatM2 = (value: number) => `${value.toLocaleString('en-ZA')} m²`;

const plural = (value: number, singular: string, shortSingular = singular) => ({
  value: `${value} ${singular}${value === 1 ? '' : 's'}`,
  shortValue: `${value} ${shortSingular}`,
});

const getDetails = (property: PropertyLike) => parseObject(property.propertyDetails);
const getSettings = (property: PropertyLike) => parseObject(property.propertySettings);

const resolveType = (property: PropertyLike) =>
  String(property.propertyType || getDetails(property).propertyType || '').toLowerCase();

const isAbsoluteOrDataUrl = (url: string) =>
  /^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:');

const imageUrlFromItem = (item: unknown): string | undefined => {
  if (!item) return undefined;
  if (typeof item === 'string') return item;
  if (typeof item !== 'object') return undefined;
  const candidate = item as Record<string, any>;
  return (
    candidate.imageUrl ||
    candidate.url ||
    candidate.thumbnailUrl ||
    candidate.processedUrl ||
    candidate.originalUrl ||
    candidate.fileUrl ||
    candidate.key ||
    candidate.src
  );
};

const resolveImageUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  const trimmed = String(url).trim();
  if (!trimmed) return undefined;
  if (isAbsoluteOrDataUrl(trimmed)) return trimmed;
  return resolveMediaUrl(trimmed) || trimmed;
};

const getImageCandidates = (property: PropertyLike): unknown[] => {
  return [
    property.mainImage,
    property.image,
    property.coverImage,
    property.primaryImage,
    ...parseArray(property.images),
    ...parseArray(property.media),
  ];
};

export function getPropertyCardImage(property: PropertyLike): string {
  const candidates = getImageCandidates(property);
  for (const candidate of candidates) {
    const resolved = resolveImageUrl(imageUrlFromItem(candidate));
    if (resolved) return resolved;
  }
  return '/placeholder-property.jpg';
}

export function getPropertyCardPrice(property: PropertyLike): PropertyCardPrice {
  const listingType = String(property.listingType || property.transactionType || property.action || '');
  const amount =
    parsePositiveNumber(property.displayPrice) ||
    parsePositiveNumber(property.price) ||
    parsePositiveNumber(property.askingPrice) ||
    parsePositiveNumber(property.monthlyRent) ||
    parsePositiveNumber(property.startingBid) ||
    parsePositiveNumber(property.pricing?.askingPrice) ||
    parsePositiveNumber(property.pricing?.monthlyRent) ||
    parsePositiveNumber(property.pricing?.startingBid) ||
    0;

  if (amount <= 0) {
    return { amount: 0, label: 'Price on request', qualifier: 'request', listingType };
  }

  if (listingType === 'rent') {
    return {
      amount,
      label: `${formatCurrency(amount)} / month`,
      qualifier: 'monthly',
      listingType,
    };
  }

  if (listingType === 'auction') {
    return {
      amount,
      label: `From ${formatCurrency(amount)}`,
      qualifier: 'auction',
      listingType,
    };
  }

  return { amount, label: formatCurrency(amount), listingType };
}

export function getPropertyCardLocation(property: PropertyLike): PropertyCardLocation {
  const locationObject = parseObject(property.location);
  const suburb = String(property.suburb || locationObject.suburb || '').trim();
  const city = String(property.city || locationObject.city || '').trim();
  const province = String(property.province || locationObject.province || '').trim();
  const address = String(property.address || property.streetAddress || locationObject.address || '').trim();
  const label =
    [suburb, city].filter(Boolean).join(', ') ||
    [city, province].filter(Boolean).join(', ') ||
    address ||
    '-';

  return {
    label,
    address: address || undefined,
    suburb: suburb || undefined,
    city: city || undefined,
    province: province || undefined,
  };
}

export function getPropertyCardBadges(property: PropertyLike): string[] {
  const details = getDetails(property);
  const rawBadges = [
    ...parseArray(property.badges),
    ...parseArray(details.badges),
    property.featured ? 'Featured' : null,
    property.status && !['available', 'published'].includes(String(property.status).toLowerCase())
      ? property.status
      : null,
    property.developmentName || property.development?.name
      ? `Part of ${property.developmentName || property.development?.name}`
      : null,
  ].filter(Boolean);

  return Array.from(new Set(rawBadges.map(badge => titleCase(badge))));
}

export function getPropertyFacts(property: PropertyLike): PropertyFact[] {
  const details = getDetails(property);
  const settings = getSettings(property);
  const type = resolveType(property);
  const facts: PropertyFact[] = [];

  const bedrooms = parsePositiveNumber(property.bedrooms ?? details.bedrooms);
  const bathrooms = parsePositiveNumber(property.bathrooms ?? details.bathrooms);
  const unitSize = parsePositiveNumber(property.unitSizeM2 ?? details.unitSizeM2 ?? property.area);
  const houseSize = parsePositiveNumber(property.houseAreaM2 ?? details.houseAreaM2 ?? property.area);
  const floorSize = parsePositiveNumber(property.floorAreaM2 ?? details.floorAreaM2 ?? property.area);
  const erfSize = parsePositiveNumber(property.erfSizeM2 ?? details.erfSizeM2 ?? property.yardSize);
  const landSize = parsePositiveNumber(
    property.landSizeM2OrHa ?? details.landSizeM2OrHa ?? details.landSizeM2,
  );
  const floorLevel = property.floorLevel ?? details.floorLevel ?? property.floor;
  const parkingCount = parsePositiveNumber(
    property.parkingCount ??
      property.parkingBays ??
      details.parkingCount ??
      details.parkingBays ??
      details.garages,
  );
  const parkingType =
    property.parkingType ??
    details.parkingType ??
    settings.parkingType ??
    details.parking ??
    settings.parking;
  const parkingLabel =
    parkingCount && parkingType
      ? `${parkingCount} ${titleCase(parkingType)}`
      : parkingCount
        ? `${parkingCount} Parking`
        : parkingType
          ? titleCase(parkingType)
          : null;

  const addFact = (
    condition: boolean,
    fact: Omit<PropertyFact, 'shortValue'> & { shortValue?: string },
  ) => {
    if (!condition) return;
    facts.push({ ...fact, shortValue: fact.shortValue || fact.value });
  };

  const isApartment = ['apartment', 'flat'].includes(type);
  const isHouse = ['house', 'villa', 'freestanding', 'cluster_home'].includes(type);
  const isTownhouse = ['townhouse', 'duplex'].includes(type);
  const isLand = ['plot', 'land', 'farm'].includes(type);
  const isCommercial = type === 'commercial';

  if (isApartment) {
    addFact(!!unitSize, {
      key: 'unit-size',
      label: 'Unit Size',
      value: formatM2(unitSize ?? 0),
      icon: Ruler,
      priority: 10,
    });
  } else if (isHouse || isTownhouse) {
    const size = houseSize || unitSize || floorSize;
    addFact(!!size, {
      key: 'house-size',
      label: isTownhouse ? 'Unit Size' : 'House Size',
      value: formatM2(size ?? 0),
      icon: Ruler,
      priority: 10,
    });
  } else if (isLand) {
    const size = landSize || erfSize;
    addFact(!!size, {
      key: 'land-size',
      label: 'Land Size',
      value: formatM2(size ?? 0),
      icon: Maximize,
      priority: 10,
    });
  } else if (isCommercial) {
    const size = floorSize || unitSize;
    addFact(!!size, {
      key: 'floor-size',
      label: 'Floor Size',
      value: formatM2(size ?? 0),
      icon: Ruler,
      priority: 10,
    });
  } else {
    const size = unitSize || houseSize || floorSize || erfSize || landSize;
    addFact(!!size, {
      key: 'size',
      label: 'Size',
      value: formatM2(size ?? 0),
      icon: Ruler,
      priority: 10,
    });
  }

  addFact(!!bedrooms && !isLand && !isCommercial, {
    key: 'bedrooms',
    label: 'Bedrooms',
    icon: Bed,
    priority: 20,
    ...plural(bedrooms!, 'Bedroom', 'Bed'),
  });

  addFact(!!bathrooms && !isLand && !isCommercial, {
    key: 'bathrooms',
    label: 'Bathrooms',
    icon: Bath,
    priority: 30,
    ...plural(bathrooms!, 'Bathroom', 'Bath'),
  });

  addFact(!!erfSize && (isHouse || isTownhouse), {
    key: 'erf-size',
    label: 'Erf Size',
    value: formatM2(erfSize ?? 0),
    icon: Maximize,
    priority: 40,
  });

  addFact(!!parkingLabel && !isLand, {
    key: 'parking',
    label: isCommercial ? 'Parking Bays' : 'Parking',
    value: parkingLabel!,
    icon: Car,
    priority: 50,
  });

  addFact(!!floorLevel && isApartment, {
    key: 'floor-level',
    label: 'Floor Level',
    value: titleCase(floorLevel),
    icon: Building2,
    priority: 55,
  });

  addFact(!!type, {
    key: 'property-type',
    label: 'Property Type',
    value: titleCase(type),
    icon: Building2,
    priority: isLand || isCommercial ? 100 : 60,
  });

  const zoning = property.zoning ?? details.zoning ?? details.zoningBusinessUse ?? details.zoningAgricultural;
  addFact(!!zoning && (isLand || isCommercial), {
    key: 'zoning',
    label: isCommercial ? 'Usage / Zoning' : 'Zoning',
    value: titleCase(zoning),
    icon: Building2,
    priority: 70,
  });

  const servicedStatus = property.servicedStatus ?? details.servicedStatus;
  addFact(!!servicedStatus && isLand, {
    key: 'serviced-status',
    label: 'Serviced',
    value: titleCase(servicedStatus),
    icon: LandPlot,
    priority: 80,
  });

  const roadAccess = property.roadAccess ?? details.roadAccess;
  addFact(!!roadAccess && isLand, {
    key: 'road-access',
    label: 'Road Access',
    value: titleCase(roadAccess),
    icon: MapPin,
    priority: 90,
  });

  return facts.sort((left, right) => left.priority - right.priority);
}

export function getCompactPropertyFacts(property: PropertyLike, limit = 4): PropertyFact[] {
  const facts = getPropertyFacts(property);
  const type = resolveType(property);
  const byKey = new Map(facts.map(fact => [fact.key, fact]));
  const pick = (keys: string[]) => keys.map(key => byKey.get(key)).filter(Boolean) as PropertyFact[];
  const fill = (selected: PropertyFact[]) => {
    const seen = new Set(selected.map(fact => fact.key));
    for (const fact of facts) {
      if (selected.length >= limit) break;
      if (!seen.has(fact.key)) {
        selected.push(fact);
        seen.add(fact.key);
      }
    }
    return selected.slice(0, limit);
  };

  if (['house', 'villa', 'freestanding', 'cluster_home'].includes(type)) {
    return fill(pick(['house-size', 'bedrooms', 'bathrooms', 'erf-size', 'parking']));
  }

  if (['apartment', 'flat'].includes(type)) {
    return fill(pick(['unit-size', 'bedrooms', 'bathrooms', 'parking', 'property-type']));
  }

  if (['townhouse', 'duplex'].includes(type)) {
    return fill(pick(['house-size', 'bedrooms', 'bathrooms', 'erf-size', 'parking']));
  }

  if (['plot', 'land', 'farm'].includes(type)) {
    return fill(pick(['land-size', 'zoning', 'serviced-status', 'road-access', 'property-type']));
  }

  if (type === 'commercial') {
    return fill(pick(['floor-size', 'parking', 'zoning', 'property-type']));
  }

  return facts.slice(0, limit);
}

const isBlankDisplayValue = (value: unknown) =>
  value == null || (typeof value === 'string' && value.trim().length === 0);

const parseBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value !== 'string') return undefined;

  const normalized = value.trim().toLowerCase();
  if (['true', 'yes', 'y', '1', 'allowed'].includes(normalized)) return true;
  if (['false', 'no', 'n', '0', 'none', 'no_pets', 'not_allowed'].includes(normalized)) {
    return false;
  }

  return undefined;
};

const formatFeatureValue = (value: unknown): string | undefined => {
  if (isBlankDisplayValue(value)) return undefined;
  if (Array.isArray(value)) {
    const formatted = value
      .map(item => formatFeatureValue(item))
      .filter((item): item is string => Boolean(item));
    return formatted.length > 0 ? formatted.join(', ') : undefined;
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return titleCase(value);
};

export function getPropertyFeatureSpecs(property: PropertyLike): PropertyFeatureSpecItem[] {
  const details = getDetails(property);
  const settings = getSettings(property);
  const specs: PropertyFeatureSpecItem[] = [];
  const seen = new Set<string>();

  const valueFor = (...keys: string[]) => {
    for (const source of [property, details, settings]) {
      for (const key of keys) {
        const value = source?.[key];
        if (!isBlankDisplayValue(value)) return value;
      }
    }
    return undefined;
  };

  const addSpec = ({
    key,
    label,
    value,
    icon,
    priority,
    category,
  }: PropertyFeatureSpecItem) => {
    if (seen.has(key) || isBlankDisplayValue(value)) return;
    specs.push({ key, label, value, icon, priority, category });
    seen.add(key);
  };

  const addFormattedSpec = ({
    key,
    label,
    rawValue,
    icon,
    priority,
    category,
  }: {
    key: string;
    label: string;
    rawValue: unknown;
    icon: LucideIcon;
    priority: number;
    category: PropertyFeatureSpecCategory;
  }) => {
    const value = formatFeatureValue(rawValue);
    if (!value) return;
    addSpec({ key, label, value, icon, priority, category });
  };

  const levies = parsePositiveNumber(valueFor('levies', 'leviesHoaOperatingCosts'));
  const ratesAndTaxes = parsePositiveNumber(valueFor('ratesAndTaxes', 'ratesTaxes'));
  if (levies) {
    addSpec({
      key: 'levies',
      label: 'Levies',
      value: formatCurrency(levies),
      icon: Building2,
      priority: 10,
      category: 'cost',
    });
  }
  if (ratesAndTaxes) {
    addSpec({
      key: 'rates-and-taxes',
      label: 'Rates & Taxes',
      value: formatCurrency(ratesAndTaxes),
      icon: Building2,
      priority: 20,
      category: 'cost',
    });
  }

  const electricitySupply = valueFor('electricitySupply', 'electricitySource');
  const prepaidElectricity = parseBoolean(valueFor('prepaidElectricity'));
  const electricityValue =
    prepaidElectricity === true
      ? 'Prepaid'
      : prepaidElectricity === false && electricitySupply
        ? formatFeatureValue(electricitySupply)
        : prepaidElectricity === false
          ? 'Municipal Billing'
        : formatFeatureValue(electricitySupply);
  if (electricityValue) {
    addSpec({
      key: 'electricity',
      label: 'Electricity',
      value: electricityValue,
      icon: Zap,
      priority: 30,
      category: 'utility',
    });
  }

  addFormattedSpec({
    key: 'water-supply',
    label: 'Water',
    rawValue: valueFor('waterSupply'),
    icon: Droplets,
    priority: 40,
    category: 'utility',
  });
  addFormattedSpec({
    key: 'power-backup',
    label: 'Power Backup',
    rawValue: valueFor('powerBackup'),
    icon: Zap,
    priority: 50,
    category: 'utility',
  });
  addFormattedSpec({
    key: 'water-backup',
    label: 'Water Backup',
    rawValue: valueFor('waterBackup'),
    icon: Droplets,
    priority: 60,
    category: 'utility',
  });

  const internetAccess = valueFor('internetAccess', 'internetAvailability');
  const fibreReady = parseBoolean(valueFor('fibreReady'));
  const internetValue =
    fibreReady === true
      ? 'Fibre Ready'
      : fibreReady === false
        ? 'No'
        : formatFeatureValue(internetAccess);
  if (internetValue) {
    addSpec({
      key: 'internet-fibre',
      label: 'Internet / Fibre',
      value: internetValue,
      icon: Wifi,
      priority: 70,
      category: 'utility',
    });
  }

  addFormattedSpec({
    key: 'security',
    label: 'Security',
    rawValue: valueFor('security', 'securityLevel'),
    icon: Shield,
    priority: 80,
    category: 'security',
  });
  addFormattedSpec({
    key: 'security-features',
    label: 'Security Features',
    rawValue: valueFor('securityFeatures'),
    icon: Shield,
    priority: 90,
    category: 'security',
  });

  addFormattedSpec({
    key: 'ownership-type',
    label: 'Ownership Type',
    rawValue: valueFor('ownershipType'),
    icon: Home,
    priority: 100,
    category: 'ownership',
  });
  addFormattedSpec({
    key: 'parking-type',
    label: 'Parking Type',
    rawValue: valueFor('parkingType', 'parking'),
    icon: Car,
    priority: 110,
    category: 'parking',
  });

  const parkingCount = parsePositiveNumber(valueFor('parkingCount', 'parkingBays', 'garages'));
  if (parkingCount) {
    addSpec({
      key: 'parking-count',
      label: 'Parking Count',
      value: String(parkingCount),
      icon: Car,
      priority: 120,
      category: 'parking',
    });
  }

  const petFriendly = parseBoolean(valueFor('petFriendly', 'petPolicy'));
  if (petFriendly !== undefined) {
    addSpec({
      key: 'pet-friendly',
      label: 'Pet Friendly',
      value: petFriendly ? 'Yes' : 'No',
      icon: CheckCircle2,
      priority: 130,
      category: 'lifestyle',
    });
  }

  addFormattedSpec({
    key: 'flooring',
    label: 'Flooring',
    rawValue: valueFor('flooring', 'flooringType'),
    icon: Building2,
    priority: 140,
    category: 'lifestyle',
  });
  addFormattedSpec({
    key: 'additional-rooms',
    label: 'Additional Rooms',
    rawValue: valueFor('additionalRooms'),
    icon: Sparkles,
    priority: 150,
    category: 'lifestyle',
  });

  return specs.sort((left, right) => left.priority - right.priority);
}

export function normalizePublicPropertyCard(property: PropertyLike): PublicPropertyCard {
  const price = getPropertyCardPrice(property);
  const location = getPropertyCardLocation(property);
  const facts = getPropertyFacts(property);
  const images = getImageCandidates(property)
    .map(candidate => resolveImageUrl(imageUrlFromItem(candidate)))
    .filter((url): url is string => Boolean(url))
    .map(url => ({ url }));
  const id = String(property.id ?? property.propertyId ?? '');
  const propertyId = parsePositiveNumber(property.propertyId ?? property.id);
  const developerBrand = property.developerBrand || property.developerBrandProfile;
  const agent = property.agent || property.user;
  const contactRole: SearchCardIdentity['role'] = developerBrand
    ? 'developer'
    : property.listerType === 'private'
      ? 'private'
      : 'agent';
  const identityName =
    developerBrand?.brandName ||
    developerBrand?.name ||
    agent?.displayName ||
    agent?.name ||
    [agent?.firstName, agent?.lastName].filter(Boolean).join(' ') ||
    (contactRole === 'private' ? 'Private Seller' : 'Listing Agent');

  return {
    kind: 'property',
    id,
    propertyId,
    sourceListingId: parsePositiveNumber(property.sourceListingId),
    href: property.href || `/property/${id}`,
    title: String(property.title || 'Property listing'),
    location: location.label,
    address: location.address,
    city: location.city || '',
    suburb: location.suburb || '',
    province: location.province || '',
    price: price.amount,
    priceLabel: price.label,
    image: images[0]?.url || getPropertyCardImage(property),
    images,
    description: property.description || undefined,
    bedrooms: parsePositiveNumber(property.bedrooms ?? getDetails(property).bedrooms),
    bathrooms: parsePositiveNumber(property.bathrooms ?? getDetails(property).bathrooms),
    area: parsePositiveNumber(
      property.area ??
        property.unitSizeM2 ??
        property.houseAreaM2 ??
        property.floorAreaM2 ??
        getDetails(property).unitSizeM2 ??
        getDetails(property).houseAreaM2 ??
        getDetails(property).floorAreaM2,
    ),
    yardSize: parsePositiveNumber(
      property.yardSize ??
        property.erfSizeM2 ??
        property.landSizeM2OrHa ??
        getDetails(property).erfSizeM2 ??
        getDetails(property).landSizeM2OrHa,
    ),
    propertyType: property.propertyType || getDetails(property).propertyType || undefined,
    listingType: property.listingType || property.transactionType || property.action || undefined,
    listingSource: property.listingSource === 'development' ? 'development' : 'manual',
    listerType: property.listerType,
    contactRole,
    identity: {
      role: contactRole,
      name: String(identityName || '-'),
      avatarUrl: developerBrand?.logoUrl || agent?.profileImage || agent?.image || agent?.avatar || null,
      phone: developerBrand?.publicContactPhone || agent?.phone || null,
      whatsapp: agent?.whatsapp || agent?.phone || null,
      email: developerBrand?.publicContactEmail || agent?.email || null,
      agentId: parsePositiveNumber(property.agentId ?? agent?.id),
      agencyId: parsePositiveNumber(property.agencyId ?? agent?.agencyId),
      developerBrandProfileId: parsePositiveNumber(
        property.developerBrandProfileId ?? developerBrand?.id,
      ),
    },
    development: property.development
      ? {
          id: property.development.id ?? property.developmentId,
          name: property.development.name ?? null,
          slug: property.development.slug ?? null,
        }
      : property.developmentId || property.developmentName
        ? {
            id: property.developmentId ?? null,
            name: property.developmentName ?? null,
            slug: property.developmentSlug ?? null,
          }
        : undefined,
    developerBrand: developerBrand
      ? {
          id: parsePositiveNumber(developerBrand.id),
          brandName: String(developerBrand.brandName || developerBrand.name || 'Developer'),
          slug: developerBrand.slug || null,
          logoUrl: developerBrand.logoUrl || null,
          publicContactEmail: developerBrand.publicContactEmail || null,
          publicContactPhone: developerBrand.publicContactPhone || null,
        }
      : undefined,
    highlights: [
      ...parseArray(property.highlights),
      ...parseArray(getDetails(property).propertyHighlights),
      ...parseArray(getDetails(property).amenitiesFeatures),
    ]
      .filter(Boolean)
      .map(item => titleCase(item)),
    badges: getPropertyCardBadges(property),
    imageCount: images.length,
    videoCount: parseArray(property.videos).length || parseArray(property.media).filter(m => m?.type === 'video').length,
    listedDate: property.listedDate || property.createdAt || property.updatedAt,
    latitude: parsePositiveNumber(property.latitude),
    longitude: parsePositiveNumber(property.longitude),
    facts,
    compactFacts: getCompactPropertyFacts(property, 4),
    sourceType: property.sourceType,
  };
}
