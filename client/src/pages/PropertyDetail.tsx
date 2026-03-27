import React, { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useGuestActivity } from '@/contexts/GuestActivityContext';
import { BADGE_TEMPLATES } from '@/../../shared/listing-types';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import {
  MapPin,
  Bed,
  Bath,
  Maximize,
  Heart,
  Share2,
  CheckCircle2,
  Home,
  ChevronRight,
  Building2,
  Car,
  Wifi,
  Dumbbell,
  Trees,
  Shield,
  Zap,
  Droplets,
  Square,
  Phone,
  Mail,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { PropertyImageGallery } from '@/components/property/PropertyImageGallery';
import { Breadcrumbs } from '@/components/search/Breadcrumbs';
import { buildPropertyUrl, generateBreadcrumbs, type SearchFilters } from '@/lib/urlUtils';
import { PropertyContactModal } from '@/components/property/PropertyContactModal';
import { PropertyShareModal } from '@/components/property/PropertyShareModal';
import { BondCalculator } from '@/components/BondCalculator';
import { NearbyLandmarks } from '@/components/property/NearbyLandmarks';
import { SuburbInsights } from '@/components/property/SuburbInsights';
import { LocalityGuide } from '@/components/property/LocalityGuide';
import { PropertyMobileFooter } from '@/components/property/PropertyMobileFooter';
import {
  PropertyQualificationDrawer,
  PropertyQualificationSnapshot,
} from '@/components/property/PropertyQualificationDrawer';
import {
  DeveloperBrandSection,
  DeveloperBrandData,
} from '@/components/property/DeveloperBrandSection';
import { MetaControl } from '@/components/seo/MetaControl';
import { buildBreadcrumbStructuredData, buildPlaceStructuredData } from '@/lib/seo/structuredData';

interface PropertyDetailProps {
  propertyId?: number;
}

interface PropertyImageLike {
  id?: number;
  imageUrl?: string;
  url?: string;
  isPrimary?: number;
  displayOrder?: number;
}

interface PropertySpecs {
  ownershipType?: string;
  powerBackup?: string;
  securityFeatures?: string[];
  waterSupply?: string;
  internetAccess?: string;
  flooring?: string;
  parkingType?: string;
  petFriendly?: string;
  electricitySupply?: string;
  additionalRooms?: string[];
  badges?: string[];
}

interface DeveloperBrandLite {
  id?: number | string;
  brandName?: string;
  logoUrl?: string;
  publicContactEmail?: string;
  slug?: string;
}

interface DevelopmentLite {
  id?: number | string;
  name?: string;
  slug?: string;
}

interface ContactIdentityLite {
  id?: number | string;
  agencyId?: number | string;
  name?: string;
  image?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  agency?: string;
}

interface PropertyPayload {
  id: number;
  title: string;
  description?: string;
  listingType?: SearchFilters['listingType'] | string;
  province?: string;
  city?: string;
  suburb?: string;
  address?: string;
  zipCode?: string;
  price?: number | string;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  featured?: number;
  amenities?: string | string[];
  features?: string | string[];
  propertySettings?: string | PropertySpecs;
  propertyDetails?: string | Record<string, unknown>;
  developerBrand?: DeveloperBrandLite;
  developerBrandProfile?: DeveloperBrandLite;
  listerType?: string;
  development?: DevelopmentLite;
  developmentId?: number | string;
  developerBrandProfileId?: number | string;
  suburbId?: number | string;
  agentId?: number | string;
  latitude?: number | string;
  longitude?: number | string;
  area?: number;
  mainImage?: string;
  agent?: ContactIdentityLite;
}

interface PropertyDetailResponse {
  property: PropertyPayload;
  images?: PropertyImageLike[];
  agent?: ContactIdentityLite;
}

const amenityIcons: Record<string, LucideIcon> = {
  parking: Car,
  wifi: Wifi,
  gym: Dumbbell,
  garden: Trees,
  security: Shield,
  pool: Droplets,
  electricity: Zap,
};

const formatLabel = (value?: string | null) =>
  String(value || '')
    .replace(/_/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());

const parseStrictNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export default function PropertyDetail(props: PropertyDetailProps) {
  const { propertyId: propPropertyId } = props;
  const [, params] = useRoute('/property/:id');
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { addViewedProperty, addGuestFavorite, removeGuestFavorite, isGuestFavorite } =
    useGuestActivity();

  // Use prop if provided, otherwise try to get from route
  const rawId = propPropertyId?.toString() || params?.id || '0';
  const numericId = parseInt(rawId);
  const propertyId = isNaN(numericId) ? 0 : numericId; // For TRPC

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isQualificationOpen, setIsQualificationOpen] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [qualificationSnapshot, setQualificationSnapshot] =
    useState<PropertyQualificationSnapshot | null>(null);
  const [contactInitialMessage, setContactInitialMessage] = useState('');

  const { data, isLoading } = trpc.properties.getById.useQuery(
    { id: propertyId },
    { enabled: propertyId > 0 },
  );

  // Fetch similar properties
  const { data: similarPropertiesData } = trpc.properties.getAll.useQuery(
    {
      limit: 10,
      city: data?.property?.city,
      propertyType: data?.property?.propertyType,
    },
    {
      enabled: !!data?.property,
    },
  );

  const addFavoriteMutation = trpc.favorites.add.useMutation({
    onSuccess: () => {
      toast.success('Added to favorites');
    },
    onError: () => {
      toast.error('Failed to add to favorites');
    },
  });

  // Track view for guest users - MUST be before conditional returns
  React.useEffect(() => {
    if (propertyId > 0) {
      addViewedProperty(propertyId);
    }
  }, [propertyId, addViewedProperty]);

  const handleFavoriteClick = () => {
    if (!isAuthenticated) {
      // For guest users, use localStorage
      if (isGuestFavorite(propertyId)) {
        removeGuestFavorite(propertyId);
        toast.success('Removed from guest favorites');
      } else {
        addGuestFavorite(propertyId);
        toast.success('Added to guest favorites! Login to save permanently.');
      }
      return;
    }
    addFavoriteMutation.mutate({ propertyId });
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ListingNavbar />
        <div className="flex items-center justify-center py-fluid-xl">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Property not found
  if (!data?.property) {
    return (
      <div className="min-h-screen bg-background">
        <ListingNavbar />
        <div className="container py-fluid-xl text-center">
          <h2 className="text-2xl font-semibold mb-4">Property Not Found</h2>
          <p className="text-slate-500 mb-6">
            The property you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => setLocation('/properties')}>Back to Properties</Button>
        </div>
      </div>
    );
  }

  const { property, images } = data as PropertyDetailResponse;
  const agent = property.agent || (data as PropertyDetailResponse).agent;

  // Safely parse amenities with error handling
  let amenitiesList: string[] = [];
  try {
    if (property.amenities) {
      amenitiesList =
        typeof property.amenities === 'string'
          ? JSON.parse(property.amenities)
          : property.amenities;
    }
  } catch (error) {
    console.error('Error parsing amenities:', error);
    amenitiesList = [];
  }

  // Use highlights if available (from features/amenities)
  let highlights: string[] = [];
  try {
    if (property.features) {
      highlights =
        typeof property.features === 'string' ? JSON.parse(property.features) : property.features;
    } else {
      highlights = amenitiesList;
    }
  } catch (error) {
    console.error('Error parsing features:', error);
    highlights = amenitiesList;
  }

  const description = property.description || '';
  const shouldTruncate = description.length > 300;
  const displayDescription =
    showFullDescription || !shouldTruncate ? description : description.slice(0, 300) + '...';
  const canonicalPath = buildPropertyUrl(propertyId, property.title);
  const canonicalUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${canonicalPath}` : canonicalPath;
  const breadcrumbItems = generateBreadcrumbs({
    listingType: property.listingType as SearchFilters['listingType'],
    province: property.province,
    city: property.city,
    suburb: property.suburb,
  });
  const seoTitle = property.title
    ? `${property.title} | Property Listify`
    : 'Property | Property Listify';
  const seoDescription =
    description.trim() ||
    [property.suburb, property.city, property.province]
      .filter(
        (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0,
      )
      .join(', ');

  let specs: PropertySpecs = {};
  try {
    if (property.propertySettings) {
      specs =
        typeof property.propertySettings === 'string'
          ? JSON.parse(property.propertySettings)
          : property.propertySettings;
    }
  } catch (e) {
    console.error('Failed to parse property settings', e);
  }

  let rawPropertyDetails: Record<string, unknown> = {};
  try {
    if (property.propertyDetails) {
      rawPropertyDetails =
        typeof property.propertyDetails === 'string'
          ? JSON.parse(property.propertyDetails)
          : property.propertyDetails;
    }
  } catch (error) {
    console.error('Failed to parse property details', error);
  }

  const developerBrand = property.developerBrand || property.developerBrandProfile;
  const normalizedListerType = String(property.listerType || '')
    .trim()
    .toLowerCase();
  const hasAgentIdentity = Boolean(agent?.id || agent?.name);
  const hasDeveloperIdentity = Boolean(developerBrand?.id || developerBrand?.brandName);
  const contactMode =
    normalizedListerType === 'private'
      ? 'private'
      : normalizedListerType === 'agent' && hasAgentIdentity
        ? 'agent'
        : hasDeveloperIdentity
          ? 'developer'
          : hasAgentIdentity
            ? 'agent'
            : 'unknown';
  const contactRoleLabel =
    contactMode === 'private'
      ? 'Seller'
      : contactMode === 'developer'
        ? 'Developer'
        : contactMode === 'agent'
          ? 'Agent'
          : null;
  const contactIdentity =
    contactMode === 'agent'
      ? agent
      : contactMode === 'developer'
        ? {
            id: developerBrand?.id,
            agencyId: undefined,
            name: String(developerBrand?.brandName || '').trim(),
            image: developerBrand?.logoUrl,
            phone: undefined,
            whatsapp: undefined,
            email: developerBrand?.publicContactEmail,
            agency: undefined,
          }
        : contactMode === 'private'
          ? {
              id: undefined,
              agencyId: undefined,
              name: 'Private Seller',
              image: undefined,
              phone: undefined,
              whatsapp: undefined,
              email: undefined,
              agency: undefined,
            }
          : undefined;
  const propertyBadges = Array.isArray(specs.badges)
    ? specs.badges
        .map(
          (badge: string) => BADGE_TEMPLATES[badge as keyof typeof BADGE_TEMPLATES]?.label || badge,
        )
        .filter(Boolean)
    : [];
  const development = property.development;
  const developmentName = String(development?.name || '').trim();
  const developmentHref = developmentName
    ? development?.slug
      ? `/development/${development.slug}`
      : development?.id
        ? `/development/${development.id}`
        : null
    : null;

  const similarProperties = (similarPropertiesData ?? []).filter(p => p.id !== propertyId);
  const similarListingsQuery = new URLSearchParams();
  if (property.city) {
    similarListingsQuery.set('city', String(property.city));
  }
  if (property.suburb) {
    similarListingsQuery.set('suburb', String(property.suburb));
  }
  if (property.propertyType) {
    similarListingsQuery.set('propertyType', String(property.propertyType));
  }
  if (property.listingType) {
    similarListingsQuery.set('listingType', String(property.listingType));
  }
  const similarListingsHref = `/properties${
    similarListingsQuery.toString() ? `?${similarListingsQuery.toString()}` : ''
  }`;
  const propertyImages = (Array.isArray(images) ? images : []).filter(
    (image): image is PropertyImageLike =>
      Boolean(
        (typeof image?.imageUrl === 'string' && image.imageUrl) ||
        (typeof image?.url === 'string' && image.url),
      ),
  );
  const propertyImageUrls = propertyImages
    .map(image =>
      typeof image.imageUrl === 'string'
        ? image.imageUrl
        : typeof image.url === 'string'
          ? image.url
          : '',
    )
    .filter(Boolean);
  const propertyGalleryImages = propertyImages
    .map((image, index) => ({
      id: image.id ?? index,
      imageUrl:
        typeof image.imageUrl === 'string'
          ? image.imageUrl
          : typeof image.url === 'string'
            ? image.url
            : '',
      isPrimary: image.isPrimary,
      displayOrder: image.displayOrder,
    }))
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  const houseSizeM2 = parseStrictNumber(rawPropertyDetails.houseAreaM2);
  const erfSizeM2 = parseStrictNumber(rawPropertyDetails.erfSizeM2);
  const unitSizeM2 = parseStrictNumber(rawPropertyDetails.unitSizeM2);
  const parkingLabel = formatLabel(specs.parkingType);
  const displayPrice = Number(property.price) || 0;
  const displayRepayment = displayPrice > 0 ? Math.round(displayPrice * 0.0095) : 0;
  const directPhone = String(contactIdentity?.phone || '').trim();
  const whatsappNumber = String(contactIdentity?.whatsapp || contactIdentity?.phone || '').trim();
  const directEmail = String(contactIdentity?.email || '').trim();
  const hasPrimaryContactAction = Boolean(
    directPhone || whatsappNumber || directEmail || contactMode !== 'unknown',
  );
  const qualificationStatusLabel = qualificationSnapshot
    ? qualificationSnapshot.resultTone === 'success'
      ? 'Likely qualifies'
      : qualificationSnapshot.resultTone === 'warning'
        ? 'Close fit'
        : 'Budget gap'
    : null;
  const affordabilityPayload = qualificationSnapshot
    ? {
        monthlyIncome:
          qualificationSnapshot.monthlyIncome + qualificationSnapshot.coApplicantIncome,
        monthlyExpenses: qualificationSnapshot.monthlyExpenses,
        monthlyDebts: qualificationSnapshot.monthlyDebts,
        availableDeposit: qualificationSnapshot.availableDeposit,
        maxAffordable: qualificationSnapshot.maxAffordable,
        calculatedAt: new Date().toISOString(),
      }
    : undefined;
  const contactBadgeLabel =
    contactMode === 'developer'
      ? 'New Development'
      : contactMode === 'agent'
        ? 'Registered Agent'
        : contactMode === 'private'
          ? 'Owner Listed'
          : null;
  const contactIntro =
    contactMode === 'developer'
      ? 'Reach the development contact for pricing, availability, and next steps.'
      : contactMode === 'private'
        ? 'You are contacting the owner directly through Property Listify.'
        : 'Connect directly with the agent handling this listing.';
  const contactSubline =
    contactMode === 'developer'
      ? developmentName || 'New development listing'
      : contactIdentity?.agency
        ? String(contactIdentity.agency)
        : 'Available through Property Listify';
  const contactAvailabilityItems = [
    whatsappNumber ? 'WhatsApp available' : null,
    directPhone ? 'Call available' : null,
    directEmail ? 'Email available' : null,
  ].filter(Boolean) as string[];
  const hasCoordinates =
    Number.isFinite(Number(property.latitude)) &&
    Number.isFinite(Number(property.longitude)) &&
    Number(property.latitude) !== 0 &&
    Number(property.longitude) !== 0;
  const locationOverviewItems = [
    property.suburb
      ? {
          key: 'suburb',
          label: 'Suburb',
          value: property.suburb,
        }
      : null,
    property.city
      ? {
          key: 'city',
          label: 'City',
          value: property.city,
        }
      : null,
    property.province
      ? {
          key: 'province',
          label: 'Province',
          value: property.province,
        }
      : null,
    {
      key: 'pin',
      label: 'Map Pin',
      value: hasCoordinates ? 'Available' : 'Not Provided',
    },
  ].filter(Boolean) as Array<{ key: string; label: string; value: string }>;
  const propertyDetailItems = [
    property.bedrooms
      ? {
          key: 'bedrooms',
          label: 'Bedrooms',
          value: `${property.bedrooms} Bedroom${property.bedrooms === 1 ? '' : 's'}`,
          icon: Bed,
        }
      : null,
    property.bathrooms
      ? {
          key: 'bathrooms',
          label: 'Bathrooms',
          value: `${property.bathrooms} Bathroom${property.bathrooms === 1 ? '' : 's'}`,
          icon: Bath,
        }
      : null,
    parkingLabel
      ? {
          key: 'parking',
          label: 'Parking',
          value: parkingLabel,
          icon: Car,
        }
      : null,
    houseSizeM2
      ? {
          key: 'house-size',
          label: 'House Size',
          value: `${houseSizeM2.toLocaleString()} m²`,
          icon: Maximize,
        }
      : unitSizeM2
        ? {
            key: 'floor-size',
            label: 'Floor Size',
            value: `${unitSizeM2.toLocaleString()} m²`,
            icon: Maximize,
          }
        : null,
    erfSizeM2
      ? {
          key: 'erf-size',
          label: 'Erf Size',
          value: `${erfSizeM2.toLocaleString()} m²`,
          icon: Home,
        }
      : null,
    property.propertyType
      ? {
          key: 'property-type',
          label: 'Property Type',
          value: formatLabel(property.propertyType),
          icon: Building2,
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; value: string; icon: LucideIcon }>;
  const featureSpecItems = [
    specs.ownershipType
      ? {
          key: 'ownershipType',
          label: 'Ownership Type',
          value: formatLabel(specs.ownershipType),
          icon: Home,
        }
      : null,
    specs.powerBackup
      ? {
          key: 'powerBackup',
          label: 'Power Backup',
          value: formatLabel(specs.powerBackup),
          icon: Zap,
        }
      : null,
    specs.securityFeatures && specs.securityFeatures.length > 0
      ? {
          key: 'security',
          label: 'Security',
          value: specs.securityFeatures.map(feature => formatLabel(feature)).join(', '),
          icon: Shield,
        }
      : null,
    specs.waterSupply
      ? {
          key: 'waterSupply',
          label: 'Water Supply',
          value: formatLabel(specs.waterSupply),
          icon: Droplets,
        }
      : null,
    specs.internetAccess
      ? {
          key: 'internetAccess',
          label: 'Internet',
          value: formatLabel(specs.internetAccess),
          icon: Wifi,
        }
      : null,
    specs.flooring
      ? { key: 'flooring', label: 'Flooring', value: formatLabel(specs.flooring), icon: Building2 }
      : null,
    specs.parkingType
      ? {
          key: 'parkingType',
          label: 'Parking Type',
          value: formatLabel(specs.parkingType),
          icon: Car,
        }
      : null,
    specs.petFriendly
      ? {
          key: 'petFriendly',
          label: 'Pet Friendly',
          value: formatLabel(specs.petFriendly),
          icon: CheckCircle2,
        }
      : null,
    specs.electricitySupply
      ? {
          key: 'electricitySupply',
          label: 'Electricity',
          value: formatLabel(specs.electricitySupply),
          icon: Zap,
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; value: string; icon: LucideIcon }>;
  const openQualification = () => {
    setIsQualificationOpen(true);
  };
  const openContactModal = ({
    initialMessage = '',
    snapshot = null,
  }: {
    initialMessage?: string;
    snapshot?: PropertyQualificationSnapshot | null;
  } = {}) => {
    setContactInitialMessage(initialMessage);
    setQualificationSnapshot(snapshot);
    setIsContactModalOpen(true);
  };
  const handleOpenStandardEnquiry = () => {
    openContactModal();
  };
  const handleWhatsAppContact = (message?: string) => {
    if (!whatsappNumber) return;

    const normalizedNumber = whatsappNumber.replace(/[^\d]/g, '');
    const defaultMessage = `Hi, I'm interested in ${property.title}. Please share more information.`;
    const targetUrl = `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(
      message || defaultMessage,
    )}`;

    window.open(targetUrl, '_blank');
  };
  const handleQualificationToEnquiry = (snapshot: PropertyQualificationSnapshot) => {
    setIsQualificationOpen(false);
    openContactModal({
      initialMessage: snapshot.summaryMessage,
      snapshot,
    });
  };
  const handleQualificationToWhatsApp = (snapshot: PropertyQualificationSnapshot) => {
    setQualificationSnapshot(snapshot);
    setIsQualificationOpen(false);
    handleWhatsAppContact(snapshot.summaryMessage);
  };
  const showLegacyPropertyDetails = false;
  const propertyStructuredData = [
    buildBreadcrumbStructuredData([
      ...breadcrumbItems,
      { label: property.title || 'Property', href: canonicalPath },
    ]),
    buildPlaceStructuredData({
      name: property.title || 'Property',
      description: seoDescription,
      url: canonicalUrl,
      images: propertyImageUrls,
      address: {
        streetAddress: property.address,
        addressLocality: property.city,
        addressRegion: property.province,
        postalCode: property.zipCode,
        addressCountry: 'ZA',
      },
      geo: {
        latitude: property.latitude,
        longitude: property.longitude,
      },
      additionalProperties: [
        property.propertyType
          ? { name: 'Property Type', value: String(property.propertyType) }
          : null,
        property.listingType ? { name: 'Listing Type', value: String(property.listingType) } : null,
        Number(property.price) > 0
          ? { name: 'Price', value: Number(property.price), unitText: 'ZAR' }
          : null,
        Number(property.bedrooms) > 0
          ? { name: 'Bedrooms', value: Number(property.bedrooms) }
          : null,
        Number(property.bathrooms) > 0
          ? { name: 'Bathrooms', value: Number(property.bathrooms) }
          : null,
        houseSizeM2 || unitSizeM2
          ? { name: 'Floor Size', value: houseSizeM2 || unitSizeM2 || 0, unitText: 'm2' }
          : null,
        erfSizeM2 ? { name: 'Erf Size', value: erfSizeM2, unitText: 'm2' } : null,
        specs.ownershipType
          ? { name: 'Ownership Type', value: String(specs.ownershipType).replace(/_/g, ' ') }
          : null,
        specs.parkingType
          ? { name: 'Parking Type', value: String(specs.parkingType).replace(/_/g, ' ') }
          : null,
      ].filter(Boolean) as Array<{ name: string; value: string | number; unitText?: string }>,
    }),
  ];
  const sectionNavItems = [
    { id: 'overview', label: 'Overview' },
    {
      id: 'features',
      label: 'Features',
      enabled: featureSpecItems.length > 0 || highlights.length > 0,
    },
    { id: 'contact', label: 'Contact', enabled: contactMode !== 'unknown' },
    { id: 'location', label: 'Location' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'buyability-calculator', label: 'Calculator' },
  ].filter(item => item.enabled !== false);
  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <MetaControl
        canonicalUrl={canonicalUrl}
        title={seoTitle}
        description={seoDescription}
        image={propertyImageUrls[0]}
        structuredData={propertyStructuredData}
      />
      <ListingNavbar />

      {/* Hero / Header Section */}
      <div className="bg-white border-b border-slate-200 pt-16">
        <div className="container py-6">
          {/* Breadcrumbs */}
          <div className="mb-4">
            <Breadcrumbs items={breadcrumbItems} />
          </div>

          {/* Top Row: Buyer-facing badges */}
          <div className="flex items-center gap-2 mb-4">
            {property.featured === 1 && (
              <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-0 rounded-md px-3 py-1 font-normal">
                FEATURED
              </Badge>
            )}
            {propertyBadges.slice(0, 2).map((badge: string) => (
              <Badge
                key={badge}
                variant="secondary"
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md px-3 py-1 font-normal"
              >
                {badge}
              </Badge>
            ))}
          </div>

          {/* Title Row with Action Buttons */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-1">
            <div className="flex-1">
              <h1 className="text-fluid-h2 font-bold text-slate-900 mb-1">{property.title}</h1>
              <div className="flex items-center gap-2 text-slate-500">
                <MapPin className="h-4 w-4" />
                <span className="text-base text-slate-500">
                  {property.address}, {property.city}, {property.province}
                </span>
              </div>
              {developmentName && (
                <div className="mt-2 flex items-center gap-2 text-slate-500">
                  <Home className="h-4 w-4" />
                  {developmentHref ? (
                    <button
                      type="button"
                      className="text-sm hover:text-blue-600 hover:underline transition-colors truncate"
                      onClick={() => setLocation(developmentHref)}
                      title={developmentName}
                    >
                      Part of {developmentName}
                    </button>
                  ) : (
                    <span className="text-sm truncate" title={developmentName}>
                      Part of {developmentName}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={handleFavoriteClick}
                className="h-10 w-10 border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-red-500"
              >
                <Heart className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleShare}
                className="h-10 w-10 border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-blue-600"
              >
                <Share2 className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                className="border-slate-200 text-slate-700 hover:bg-slate-50 h-10 px-6"
              >
                Shortlist
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-16 z-30 hidden border-b border-slate-200 bg-white/95 backdrop-blur lg:block">
        <div className="container py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {sectionNavItems.map(item => (
              <button
                key={item.id}
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-orange-200 hover:text-orange-600"
                onClick={() => scrollToSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Image Gallery + Property Info Block */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          {/* Left Column - Image Gallery */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white">
              <PropertyImageGallery images={propertyGalleryImages} propertyTitle={property.title} />
            </div>
          </div>

          {/* Right Column - Property Info */}
          <div className="lg:col-span-5 space-y-8">
            {/* Price Section */}
            <div id="overview">
              <div className="text-fluid-h1 font-bold text-orange-500 mb-2">
                {formatCurrency(displayPrice, { compact: false })}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-slate-500 font-medium">Estimated Repayment:</span>
                <span className="text-slate-900 font-bold">
                  {formatCurrency(displayRepayment, { compact: false })}/Pm
                </span>
                <button
                  type="button"
                  className="text-blue-500 hover:text-blue-600 font-medium hover:underline ml-1"
                  onClick={openQualification}
                >
                  Get Pre-Qualified
                </button>
              </div>
            </div>

            {/* Property Details */}
            {propertyDetailItems.length > 0 && (
              <div>
                <h3 className="text-fluid-h3 font-bold text-slate-900 mb-4">Property Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {propertyDetailItems.map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.key} className="flex items-start gap-3">
                        <div className="bg-orange-50 p-2 rounded-md text-orange-500">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-400">{item.label}</p>
                          <p className="font-semibold text-slate-900">{item.value}</p>
                        </div>
                      </div>
                    );
                  })}
                  {showLegacyPropertyDetails && (
                    <>
                      <div className="flex items-start gap-3">
                        <div className="bg-orange-50 p-2 rounded-md text-orange-500">
                          <Maximize className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-400">House Size</p>
                          <p className="font-semibold text-slate-900">
                            {(property.area ?? 0).toLocaleString()} m²
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="bg-orange-50 p-2 rounded-md text-orange-500">
                          <Home className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-400">Erf Size</p>
                          <p className="font-semibold text-slate-900">150 m²</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="bg-orange-50 p-2 rounded-md text-orange-500">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-400">Property Type</p>
                          <p className="font-semibold text-slate-900 capitalize">
                            {property.propertyType}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Full-width separator */}
        <Separator className="my-8" />

        {/* Main Content Area - Two Column Layout (8/4) */}
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT COLUMN (8 columns) */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {/* 2.1 About This Property */}
            {description.trim() && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                  <CardTitle className="text-fluid-h3 font-bold text-slate-900">
                    About This Property
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                    {displayDescription}
                  </p>
                  {shouldTruncate && (
                    <Button
                      variant="link"
                      className="p-0 h-auto text-blue-600 font-medium mt-4"
                      onClick={() => setShowFullDescription(!showFullDescription)}
                    >
                      {showFullDescription ? 'Show Less' : 'Read Full Description'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 2.2 Property Features / Specs Table (Dynamic) */}
            {featureSpecItems.length > 0 && (
              <Card id="features" className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                  <CardTitle className="text-fluid-h3 font-bold text-slate-900">
                    Property Features & Specifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {featureSpecItems.map(item => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.key}
                          className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg"
                        >
                          <Icon className="h-5 w-5 text-orange-500 mt-0.5" />
                          <div>
                            <p className="text-sm text-slate-500">{item.label}</p>
                            <p className="font-semibold text-slate-900" title={item.value}>
                              {item.value}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 2.3 Additional Rooms */}
            {specs.additionalRooms && specs.additionalRooms.length > 0 && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                  <CardTitle className="text-fluid-h3 font-bold text-slate-900">
                    Additional Rooms & Specifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {specs.additionalRooms.map(room => (
                      <Badge
                        key={room}
                        variant="secondary"
                        className="bg-orange-50 text-slate-900 hover:bg-orange-100 border-0 px-4 py-1.5 rounded-full font-medium"
                      >
                        {room}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 2.4 Amenities */}
            {highlights.length > 0 && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                  <CardTitle className="text-fluid-h3 font-bold text-slate-900">
                    Amenities & Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div
                    className={`grid gap-y-3 gap-x-4 ${
                      highlights.length < 4 ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-3'
                    }`}
                  >
                    {highlights.map((amenity: string, index: number) => {
                      const IconComponent = amenityIcons[amenity.toLowerCase()] || CheckCircle2;
                      return (
                        <div key={index} className="flex items-center gap-3">
                          <IconComponent className="h-5 w-5 text-orange-500" />
                          <span className="capitalize text-slate-700 font-medium">{amenity}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 2.5 Developer Brand Section (when property is linked to a brand profile) */}
            {(property.developerBrand || property.developerBrandProfile) && (
              <DeveloperBrandSection
                brand={
                  (property.developerBrand || property.developerBrandProfile) as DeveloperBrandData
                }
              />
            )}

            {/* 2.6 Location Decision Support */}
            <section id="location" className="space-y-6">
              <NearbyLandmarks
                property={{
                  id: property.id,
                  title: property.title,
                  latitude: property.latitude,
                  longitude: property.longitude,
                }}
                overviewItems={locationOverviewItems}
              />
            </section>

            {/* 2.7 Suburb Reviews & Insights */}
            <Card id="reviews" className="border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <SuburbInsights
                  suburbId={Number(property.suburbId ?? 0)}
                  suburbName={property.suburb || property.city || 'Selected area'}
                  isDevelopment={!!property.developmentId}
                />
              </CardContent>
            </Card>

            {/* 2.8 Locality Guide */}
            <LocalityGuide
              suburb={property.suburb || property.city || 'Selected area'}
              city={property.city || property.suburb || 'Selected area'}
              province={property.province}
            />
          </div>

          {/* RIGHT COLUMN (4 columns) */}
          <div className="col-span-12 lg:col-span-4">
            <div className="sticky top-24 space-y-4">
              <div
                id="contact"
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="bg-slate-950 px-5 py-5 text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                    Ready to take the next step?
                  </p>
                  <div className="mt-2 text-2xl font-bold">
                    {formatCurrency(displayPrice, { compact: false })}
                  </div>
                  <p className="mt-1 text-sm text-slate-300">
                    Est. {formatCurrency(displayRepayment, { compact: false })}/Pm
                  </p>
                  {qualificationStatusLabel && (
                    <Badge className="mt-3 border border-orange-300 bg-orange-50 text-[11px] text-orange-700 hover:bg-orange-50">
                      {qualificationStatusLabel}
                    </Badge>
                  )}
                </div>

                <div className="space-y-3 px-5 py-5">
                  <Button
                    className="h-11 w-full bg-orange-500 text-sm font-semibold text-white hover:bg-orange-600"
                    onClick={openQualification}
                  >
                    Check If You Qualify
                  </Button>
                  {whatsappNumber && (
                    <Button
                      variant="outline"
                      className="h-11 w-full border-green-200 text-green-700 hover:bg-green-50"
                      onClick={() => handleWhatsAppContact(qualificationSnapshot?.summaryMessage)}
                    >
                      WhatsApp {contactRoleLabel || 'Contact'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="h-11 w-full border-slate-200 text-slate-700 hover:bg-slate-50"
                    onClick={handleOpenStandardEnquiry}
                  >
                    Send Enquiry
                  </Button>
                  <p className="text-center text-xs leading-relaxed text-slate-500">
                    Start with qualification, then enquire with your affordability context if you
                    want a faster response.
                  </p>
                </div>
              </div>

              {contactMode !== 'unknown' && (
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="space-y-5 p-5">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {contactMode === 'developer'
                          ? 'Developer Contact'
                          : contactMode === 'private'
                            ? 'Seller Contact'
                            : 'Listing Agent'}
                      </p>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                        {contactIdentity?.image ? (
                          <img
                            src={contactIdentity.image}
                            alt={contactIdentity.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-200 text-xl font-bold text-slate-500">
                            {contactIdentity?.name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">
                            {contactIdentity?.name || 'Listing Contact'}
                          </h3>
                          {contactBadgeLabel && (
                            <Badge className="border border-orange-200 bg-orange-50 text-[11px] text-orange-700 hover:bg-orange-50">
                              {contactBadgeLabel}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-600">{contactSubline}</p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">
                          {contactIntro}
                        </p>
                      </div>
                    </div>

                    {contactAvailabilityItems.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {contactAvailabilityItems.map(item => (
                          <span
                            key={item}
                            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="space-y-3">
                      {whatsappNumber && (
                        <button
                          type="button"
                          className="flex w-full items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-left text-sm text-green-800 transition hover:bg-green-100"
                          onClick={() =>
                            handleWhatsAppContact(qualificationSnapshot?.summaryMessage)
                          }
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <MessageCircle className="h-4 w-4" />
                            WhatsApp
                          </span>
                          <span className="truncate pl-4 font-semibold">{whatsappNumber}</span>
                        </button>
                      )}
                      {directPhone && (
                        <a
                          href={`tel:${directPhone}`}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100"
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <Phone className="h-4 w-4" />
                            Call
                          </span>
                          <span className="font-semibold">{directPhone}</span>
                        </a>
                      )}
                      {directEmail && (
                        <a
                          href={`mailto:${directEmail}`}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100"
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <Mail className="h-4 w-4" />
                            Email
                          </span>
                          <span className="ml-4 truncate font-medium">{directEmail}</span>
                        </a>
                      )}
                      {developmentHref && contactMode === 'developer' && (
                        <Button
                          variant="outline"
                          className="h-12 w-full justify-between rounded-lg border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                          onClick={() => setLocation(developmentHref)}
                        >
                          <span className="font-medium text-slate-700">View Development</span>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </Button>
                      )}
                    </div>

                    {qualificationSnapshot && (
                      <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-600">
                          Qualification Status
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {qualificationSnapshot.resultTitle}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Your affordability summary can be carried into your enquiry or WhatsApp
                          message.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div id="buyability-calculator">
                <BondCalculator
                  propertyPrice={displayPrice}
                  showTransferCosts={true}
                  compact={true}
                  ctaLabel="Check If You Qualify"
                  onCtaClick={openQualification}
                />
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-[11px] leading-relaxed text-amber-900">
                  <strong>Disclaimer:</strong> These calculations are estimates only. Actual bond
                  approval, interest rates, and transfer costs may vary based on individual
                  circumstances and bank policies.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3 - FULL WIDTH FOOTER - Similar Properties Carousel */}
        {similarProperties.length > 0 && (
          <div className="mt-12 rounded-[28px] border border-slate-200 bg-slate-50 p-6 md:p-8">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Keep Browsing
                </p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">
                  Still comparing? Explore more in {property.suburb || property.city}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  These listings match the same area or property type, so you can compare options
                  without leaving the marketplace.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full border-slate-300 text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 md:w-auto"
                onClick={() => setLocation(similarListingsHref)}
              >
                View All Matching Listings
              </Button>
            </div>

            {/* Horizontal Scroll Carousel */}
            <div className="relative -mx-4 px-4 md:mx-0 md:px-0">
              <div className="flex overflow-x-auto gap-4 pb-8 snap-x snap-mandatory scrollbar-hide">
                {similarProperties.map(prop => (
                  <div
                    key={prop.id}
                    onClick={() => setLocation(buildPropertyUrl(prop.id, prop.title))}
                    className="group min-w-[280px] cursor-pointer snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg md:min-w-[320px]"
                  >
                    {/* Image */}
                    <div className="relative h-44 overflow-hidden bg-slate-100">
                      <img
                        src={prop.mainImage || '/placeholder-property.jpg'}
                        alt={prop.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                        <Badge className="h-6 border-0 bg-white/90 px-2.5 text-xs text-slate-700 shadow-sm backdrop-blur-sm hover:bg-white">
                          {prop.propertyType}
                        </Badge>
                        {prop.suburb && (
                          <Badge className="h-6 border border-white/20 bg-slate-900/75 px-2.5 text-xs text-white backdrop-blur-sm hover:bg-slate-900/75">
                            {prop.suburb}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-3 p-4">
                      {/* Price */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-bold text-slate-900">
                            R {prop.price.toLocaleString()}
                          </p>
                          {(prop.suburb || prop.city) && (
                            <p className="mt-1 text-xs text-slate-500">
                              {prop.suburb || prop.city}
                              {prop.suburb && prop.city ? `, ${prop.city}` : ''}
                            </p>
                          )}
                        </div>
                        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-700">
                          Compare
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="line-clamp-2 text-sm font-semibold text-slate-800">
                        {prop.title}
                      </h4>

                      {/* Property Details */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        {prop.bedrooms && (
                          <div className="flex items-center gap-1">
                            <Bed className="h-3.5 w-3.5" />
                            <span>{prop.bedrooms}</span>
                          </div>
                        )}
                        {prop.bathrooms && (
                          <div className="flex items-center gap-1">
                            <Bath className="h-3.5 w-3.5" />
                            <span>{prop.bathrooms}</span>
                          </div>
                        )}
                        {prop.area && (
                          <div className="flex items-center gap-1">
                            <Square className="h-3.5 w-3.5" />
                            <span>{prop.area} m²</span>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-100 pt-3 text-sm font-medium text-slate-700 transition group-hover:text-orange-700">
                        Open listing
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Mobile Footer */}
      <PropertyMobileFooter
        agentName={contactIdentity?.name || 'Listing Contact'}
        onQualify={openQualification}
        onEnquire={handleOpenStandardEnquiry}
        onWhatsApp={() => handleWhatsAppContact(qualificationSnapshot?.summaryMessage)}
        canQualify={displayPrice > 0}
        canEnquire={hasPrimaryContactAction}
        canWhatsApp={Boolean(whatsappNumber)}
      />

      {/* Modals */}
      <PropertyQualificationDrawer
        open={isQualificationOpen}
        onOpenChange={setIsQualificationOpen}
        propertyTitle={property.title}
        propertyPrice={displayPrice}
        onProceedToEnquiry={handleQualificationToEnquiry}
        onProceedToWhatsApp={handleQualificationToWhatsApp}
      />

      <PropertyContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        propertyId={propertyId}
        propertyTitle={property.title}
        agentName={contactIdentity?.name || 'Listing Contact'}
        agentPhone={contactIdentity?.phone || undefined}
        agentEmail={contactIdentity?.email || undefined}
        agentId={
          contactIdentity?.id
            ? Number(contactIdentity.id)
            : property?.agentId
              ? Number(property.agentId)
              : undefined
        }
        agencyId={contactIdentity?.agencyId ? Number(contactIdentity.agencyId) : undefined}
        developmentId={
          !agent && property?.developmentId ? Number(property.developmentId) : undefined
        }
        developerBrandProfileId={
          !agent && property?.developerBrandProfileId
            ? Number(property.developerBrandProfileId)
            : undefined
        }
        initialMessage={contactInitialMessage}
        affordabilityData={affordabilityPayload}
      />

      <PropertyShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        propertyTitle={property.title}
        propertyUrl={window.location.href}
      />

      <footer className="bg-slate-900 text-slate-300 py-12 mt-20">
        <div className="container text-center">
          <p>&copy; 2025 Real Estate Portal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
