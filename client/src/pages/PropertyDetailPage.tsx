import React, { useState } from 'react';
import { Link, useRoute, useLocation } from 'wouter';
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
import { cn } from '@/lib/utils';
import { formatFullPropertyLocation } from '@/lib/propertyLocationDisplay';
import {
  MapPin,
  Bed,
  Bath,
  ArrowLeft,
  Heart,
  Share2,
  GitCompareArrows,
  CheckCircle2,
  Home,
  ChevronRight,
  Building2,
  Car,
  Wifi,
  Dumbbell,
  Sparkles,
  Trees,
  Shield,
  Zap,
  Droplets,
  Square,
  MessageCircle,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { PropertyImageGallery } from '@/components/property/PropertyImageGallery';
import {
  PropertyMediaTypeSection,
  type PublicPropertyMedia,
} from '@/components/property/PropertyMediaTypeSection';
import { Breadcrumbs } from '@/components/search/Breadcrumbs';
import { buildPropertyUrl, generateBreadcrumbs, type SearchFilters } from '@/lib/urlUtils';
import { buildCanonicalSearchUrl } from '@/lib/searchNavigation';
import { isExplicitRentListing, withRentalPeriod } from '@/lib/rentPresentation';
import { getPropertySearchReturn } from '@/lib/searchReturnState';
import { PropertyContactModal } from '@/components/property/PropertyContactModal';
import { PropertyShareModal } from '@/components/property/PropertyShareModal';
import { NearbyLandmarks } from '@/components/property/NearbyLandmarks';
import {
  DeveloperBrandSection,
  DeveloperBrandData,
} from '@/components/property/DeveloperBrandSection';
import { MetaControl } from '@/components/seo/MetaControl';
import { buildBreadcrumbStructuredData, buildPlaceStructuredData } from '@/lib/seo/structuredData';
import {
  getCompactPropertyFacts,
  getPropertyBuyerChecklist,
  getPropertyFeatureChecklistItems,
  getPropertyFeaturesContextGroups,
  getPropertyRunningCostFacts,
} from '@/lib/property';
import { buildPricingContract, getMoneyFactAmount } from '@/../../shared/pricing-contract';
import { useComparison } from '@/contexts/ComparisonContext';
import type { PublicPropertySupplyIdentity } from '@/../../shared/types';

interface PropertyDetailProps {
  propertyId?: number;
}

interface PropertyImageLike {
  id?: number;
  imageUrl?: string;
  url?: string;
  isPrimary?: number;
  displayOrder?: number;
  mediaType?: 'image' | 'video' | 'floorplan' | 'pdf';
}

interface PropertySpecs {
  ownershipType?: string;
  powerBackup?: string;
  security?: string;
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

interface CanonicalAreaFact {
  status?: string;
  valueM2?: unknown;
  normalizedM2?: unknown;
}

interface CorePropertyInformation {
  internalArea?: CanonicalAreaFact;
  erfArea?: CanonicalAreaFact;
  farmLandArea?: CanonicalAreaFact;
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
  transactionType?: string;
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
  propertyDetails?: string | Record<string, unknown>;
  pricingContract?: unknown;
  developerBrand?: DeveloperBrandLite;
  development?: DevelopmentLite;
  latitude?: number | string;
  longitude?: number | string;
  area?: number;
  internalAreaM2?: number | string | null;
  erfSizeM2?: number | string | null;
  landAreaM2?: number | string | null;
  mainImage?: string;
  media?: PublicPropertyMedia[];
  virtualTour?: {
    provider: 'matterport';
    embedUrl: string;
    displayLabel?: string;
    status: 'active';
  } | null;
  publicIdentity?: PublicPropertySupplyIdentity;
}

interface PropertyDetailResponse {
  property: PropertyPayload;
  images?: PropertyImageLike[];
  media?: PublicPropertyMedia[];
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

const parseStrictNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export default function PropertyDetailPage(props: PropertyDetailProps) {
  const { propertyId: propPropertyId } = props;
  const [, params] = useRoute('/property/:id');
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { addViewedProperty } = useGuestActivity();
  const { isInComparison, addToComparison, removeFromComparison, canAddMore } = useComparison();

  // Use prop if provided, otherwise try to get from route
  const rawId = propPropertyId?.toString() || params?.id || '0';
  const numericId = parseInt(rawId);
  const propertyId = isNaN(numericId) ? 0 : numericId; // For TRPC

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [contactInitialMessage, setContactInitialMessage] = useState('');
  const [contactIntent, setContactIntent] = useState<'enquiry' | 'whatsapp'>('enquiry');
  const [contactRequestType, setContactRequestType] = useState<'enquiry' | 'viewing_request'>(
    'enquiry',
  );

  const { data, error, isLoading, isFetching, refetch } = trpc.properties.getById.useQuery(
    { id: propertyId },
    { enabled: propertyId > 0 },
  );
  const { data: favorites = [] } = trpc.properties.getFavorites.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: similarPropertiesData } = trpc.properties.getRelatedPublicInventory.useQuery(
    { propertyId },
    { enabled: propertyId > 0 && Boolean(data?.property) },
  );

  const utils = trpc.useUtils();
  const toggleFavoriteMutation = trpc.properties.toggleFavorite.useMutation({
    onSuccess: result => {
      void utils.properties.getFavorites.invalidate();
      toast.success(
        result.favorited ? 'Property saved to your homes.' : 'Property removed from saved homes.',
      );
    },
    onError: () => {
      toast.error('Unable to update saved homes. Please try again.');
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
      toast.info('Sign in to save this property to your account.');
      setLocation(
        `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      );
      return;
    }
    if (toggleFavoriteMutation.isPending) return;
    toggleFavoriteMutation.mutate({ propertyId });
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const handleUnavailableReturn = () => {
    if (typeof window !== 'undefined') {
      const rememberedSearch =
        getPropertySearchReturn(window.sessionStorage, 'for-sale') ||
        getPropertySearchReturn(window.sessionStorage, 'to-rent');
      if (rememberedSearch) {
        setLocation(rememberedSearch);
        return;
      }
    }
    setLocation('/property-for-sale');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ListingNavbar />
        <main id="main-content" tabIndex={-1} className="outline-none">
          <div className="flex items-center justify-center py-fluid-xl">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  // A resolver miss is different from a temporary transport failure. Keep the
  // recovery action on the canonical Buy/Rent search root rather than sending
  // the buyer back to the generic home page.
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <ListingNavbar />
        <main id="main-content" tabIndex={-1} className="outline-none">
          <div className="container py-fluid-xl text-center">
            <h2 className="mb-4 text-2xl font-semibold">Property temporarily unavailable</h2>
            <p className="mb-6 text-slate-500">
              We could not load this property right now. Your search is still available.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button onClick={() => void refetch()} disabled={isFetching}>
                {isFetching ? 'Trying again…' : 'Try again'}
              </Button>
              <Button variant="outline" onClick={handleUnavailableReturn}>
                Return to results
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Property not found
  if (!data?.property) {
    return (
      <div className="min-h-screen bg-background">
        <ListingNavbar />
        <main id="main-content" tabIndex={-1} className="outline-none">
          <div className="container py-fluid-xl text-center">
            <h2 className="mb-4 text-2xl font-semibold">Property no longer available</h2>
            <p className="mb-6 text-slate-500">
              This listing may have been removed, unpublished or replaced. Return to your results
              to keep browsing legitimate public inventory.
            </p>
            <Button onClick={handleUnavailableReturn}>Return to results</Button>
          </div>
        </main>
      </div>
    );
  }

  const { property, images, media } = data as PropertyDetailResponse;
  const isFavorite = favorites.some(favorite => Number(favorite.propertyId) === propertyId);

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

  // Public detail has one canonical facts object. The older projection
  // `propertySettings` snapshot remains server-side coherence evidence and is
  // deliberately not serialized to buyers.
  const parsedSpecs = rawPropertyDetails as PropertySpecs;

  const resolvedSecurity =
    String(
      parsedSpecs.security ?? rawPropertyDetails.security ?? rawPropertyDetails.securityLevel ?? '',
    ).trim() || undefined;
  const specs = resolvedSecurity ? { ...parsedSpecs, security: resolvedSecurity } : parsedSpecs;

  const normalizedListingType = String(property.listingType || property.transactionType || '')
    .trim()
    .toLowerCase();
  const isRentalListing = isExplicitRentListing(normalizedListingType);
  const isCompared = isInComparison(propertyId);
  const handleToggleComparison = () => {
    if (isRentalListing) return;
    if (isCompared) {
      removeFromComparison(propertyId);
      toast.success('Property removed from comparison.');
      return;
    }
    if (!canAddMore) {
      toast.info('You can compare up to 4 properties at a time.');
      return;
    }
    if (typeof window !== 'undefined' && document.referrer) {
      try {
        const referrer = new URL(document.referrer);
        if (
          referrer.origin === window.location.origin &&
          referrer.pathname === '/property-for-sale'
        ) {
          window.sessionStorage.setItem(
            'property-comparison-return',
            `${referrer.pathname}${referrer.search}`,
          );
        }
      } catch {
        // Keep comparison usable even when the browser omits a parseable referrer.
      }
    }
    addToComparison(propertyId);
    toast.success('Property added to comparison.');
  };
  const handleReturnToResults = () => {
    const fallback = isRentalListing ? '/property-to-rent' : '/property-for-sale';
    if (typeof window !== 'undefined') {
      const rememberedSearch = getPropertySearchReturn(
        window.sessionStorage,
        isRentalListing ? 'to-rent' : 'for-sale',
      );
      if (rememberedSearch) {
        setLocation(rememberedSearch);
        return;
      }
    }
    if (typeof window === 'undefined' || !document.referrer) {
      setLocation(fallback);
      return;
    }

    try {
      const referrer = new URL(document.referrer);
      if (
        referrer.origin === window.location.origin &&
        referrer.pathname === (isRentalListing ? '/property-to-rent' : '/property-for-sale')
      ) {
        window.history.back();
        return;
      }
    } catch {
      // Use the explicit transaction root when no same-origin search referrer exists.
    }
    setLocation(fallback);
  };
  const publicIdentity = property.publicIdentity;
  const contactMode: PublicPropertySupplyIdentity['role'] | 'unknown' =
    publicIdentity?.role || 'unknown';
  const contactRoleLabel =
    contactMode === 'developer'
      ? 'Developer'
      : contactMode === 'agent'
        ? 'Agent'
        : contactMode === 'agency'
          ? 'Agency'
          : contactMode === 'platform'
            ? 'Property Listify'
            : null;
  const contactIdentity: ContactIdentityLite | undefined = publicIdentity
    ? {
        id:
          publicIdentity.agentId || publicIdentity.agencyId || publicIdentity.cataloguePublisherId,
        agencyId: publicIdentity.agencyId,
        name: publicIdentity.name,
        image: publicIdentity.avatarUrl || publicIdentity.organizationLogoUrl || undefined,
        phone: publicIdentity.phone || undefined,
        whatsapp: publicIdentity.whatsapp || undefined,
        email: publicIdentity.email || undefined,
        agency: publicIdentity.organizationName || undefined,
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

  const similarProperties = similarPropertiesData ?? [];
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
  const similarListingsHref = buildCanonicalSearchUrl(
    Object.fromEntries(similarListingsQuery.entries()),
  );
  const propertyImages = (Array.isArray(images) ? images : []).filter(
    (image): image is PropertyImageLike =>
      Boolean(
        (!image.mediaType || image.mediaType === 'image') &&
        ((typeof image?.imageUrl === 'string' && image.imageUrl) ||
          (typeof image?.url === 'string' && image.url)),
      ),
  );
  const propertyMedia: PublicPropertyMedia[] = (
    Array.isArray(media)
      ? media
      : Array.isArray(property.media)
        ? property.media
        : propertyImages.map(image => ({
            id: image.id,
            url: image.imageUrl || image.url || '',
            mediaType: 'image' as const,
            displayOrder: image.displayOrder,
          }))
  ).filter((item): item is PublicPropertyMedia =>
    Boolean(
      item &&
      typeof item.url === 'string' &&
      item.url &&
      ['image', 'video', 'floorplan', 'pdf'].includes(item.mediaType),
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
  const coreDetails =
    rawPropertyDetails.corePropertyInformation &&
    typeof rawPropertyDetails.corePropertyInformation === 'object'
      ? (rawPropertyDetails.corePropertyInformation as CorePropertyInformation)
      : {};
  const canonicalInternalArea =
    coreDetails.internalArea?.status === 'known'
      ? coreDetails.internalArea.valueM2
      : property.internalAreaM2;
  const canonicalErfArea =
    coreDetails.erfArea?.status === 'known' ? coreDetails.erfArea.valueM2 : property.erfSizeM2;
  const canonicalLandArea =
    coreDetails.farmLandArea?.status === 'known'
      ? coreDetails.farmLandArea.normalizedM2
      : property.landAreaM2;
  const houseSizeM2 = parseStrictNumber(canonicalInternalArea ?? rawPropertyDetails.houseAreaM2);
  const erfSizeM2 = parseStrictNumber(canonicalErfArea ?? rawPropertyDetails.erfSizeM2);
  const unitSizeM2 = parseStrictNumber(canonicalInternalArea ?? rawPropertyDetails.unitSizeM2);
  const landAreaM2 = parseStrictNumber(canonicalLandArea ?? rawPropertyDetails.landAreaM2);
  const displayPrice = Number(property.price) || 0;
  const publicPricingContract = buildPricingContract(
    isRentalListing ? 'rent' : 'sell',
    property as unknown as Record<string, unknown>,
    rawPropertyDetails,
  );
  const rentDepositFact =
    publicPricingContract?.intent === 'rent' ? publicPricingContract.deposit : undefined;
  const rentDepositAmount = getMoneyFactAmount(rentDepositFact);
  const displayLocationLabel = formatFullPropertyLocation({
    address: property.address,
    suburb: property.suburb,
    city: property.city,
    province: property.province,
  });
  const whatsappNumber = String(contactIdentity?.whatsapp || contactIdentity?.phone || '').trim();
  const hasPrimaryContactAction = Boolean(whatsappNumber || contactMode !== 'unknown');
  const contactBadgeLabel =
    contactMode === 'developer'
      ? 'Developer'
      : contactMode === 'agent'
        ? 'Agent'
        : contactMode === 'agency'
          ? 'Agency'
          : contactMode === 'platform'
            ? 'Property Listify managed'
            : null;
  const contactIntro =
    contactMode === 'developer'
      ? 'Your enquiry goes to the authorized team representing this development.'
      : contactMode === 'agency'
        ? 'This property is represented by the agency, even though no individual agent is assigned.'
        : contactMode === 'platform'
          ? 'Property Listify has explicit operational custody of enquiries for this property.'
          : contactMode === 'agent'
            ? 'Your enquiry goes to the authorized agent representing this property.'
            : '';
  const agentAgencyLabel =
    contactMode === 'agent'
      ? String(contactIdentity?.agency || '').trim() || 'Independent agent'
      : '';
  const contactSubline =
    contactMode === 'developer'
      ? developmentName || 'New development listing'
      : contactMode === 'agent'
        ? agentAgencyLabel
        : contactMode === 'agency'
          ? 'Agency-managed listing'
          : contactMode === 'platform'
            ? 'Managed through Property Listify operations'
            : '';
  const propertyDetailItems = getCompactPropertyFacts(property, 4);
  const featureSpecItems = getPropertyBuyerChecklist(property);
  const propertyFeatureChecklistItems = getPropertyFeatureChecklistItems(property).slice(0, 18);
  const propertyFeatureGroups = getPropertyFeaturesContextGroups(property);
  const runningCostItems = getPropertyRunningCostFacts(property);
  const openContactModal = ({
    initialMessage = '',
    intent = 'enquiry',
    requestType = 'enquiry',
  }: {
    initialMessage?: string;
    intent?: 'enquiry' | 'whatsapp';
    requestType?: 'enquiry' | 'viewing_request';
  } = {}) => {
    setContactInitialMessage(initialMessage);
    setContactIntent(intent);
    setContactRequestType(requestType);
    setIsContactModalOpen(true);
  };
  const handleOpenStandardEnquiry = () => {
    openContactModal();
  };
  const handleRequestViewing = () => {
    openContactModal({
      initialMessage: `Hi, I'd like to request a viewing for ${property.title}. Please contact me to discuss a suitable time.`,
      requestType: 'viewing_request',
    });
  };
  const handleWhatsAppContact = () => {
    openContactModal({
      initialMessage: `Hi, I'm interested in ${property.title}. Please share more information.`,
      intent: 'whatsapp',
    });
  };
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
        landAreaM2 ? { name: 'Farm / land size', value: landAreaM2, unitText: 'm2' } : null,
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
  ].filter(item => item.enabled !== false);
  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };
  const agentProfileHref =
    contactMode === 'agent'
      ? publicIdentity?.agentSlug
        ? `/agents/${publicIdentity.agentSlug}`
        : publicIdentity?.agentId
          ? `/agent/profile/${publicIdentity.agentId}`
          : null
      : null;

  return (
    <div className={cn('min-h-screen bg-slate-50', hasPrimaryContactAction && 'pb-24 lg:pb-0')}>
      <MetaControl
        canonicalUrl={canonicalUrl}
        title={seoTitle}
        description={seoDescription}
        image={propertyImageUrls[0]}
        structuredData={propertyStructuredData}
      />
      <ListingNavbar />

      {/* prettier-ignore */}
      <main id="main-content" tabIndex={-1} className="outline-none">
      {/* Hero / Header Section */}
      <div className="bg-white border-b border-slate-200 pt-16">
        <div className="container py-6">
          {/* Breadcrumbs */}
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 -ml-2 text-slate-600 hover:text-blue-600"
              onClick={handleReturnToResults}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to {isRentalListing ? 'rentals' : 'Buy results'}
            </Button>
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
                <span className="text-base text-slate-500">{displayLocationLabel}</span>
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
                disabled={toggleFavoriteMutation.isPending}
                aria-label={isFavorite ? 'Remove from saved homes' : 'Save property'}
                aria-pressed={isFavorite}
                className={`h-10 w-10 border-slate-200 transition-colors ${
                  isFavorite
                    ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-red-500'
                }`}
              >
                <Heart className="h-3.5 w-3.5" fill={isFavorite ? 'currentColor' : 'none'} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleShare}
                aria-label="Share property"
                className="h-10 w-10 border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-blue-600"
              >
                <Share2 className="h-3.5 w-3.5" />
              </Button>
              {!isRentalListing && (
                <Button
                  variant="outline"
                  className="border-slate-200 text-slate-700 hover:bg-slate-50 h-10 px-6"
                  onClick={handleToggleComparison}
                  aria-label={isCompared ? 'Remove property from comparison' : 'Compare property'}
                  aria-pressed={isCompared}
                >
                  <GitCompareArrows className="mr-2 h-3.5 w-3.5" />
                  {isCompared ? 'Remove compare' : 'Compare'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Image Gallery + Property Info Block */}
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12 mb-8">
          {/* Left Column - Image Gallery */}
          <div className="lg:col-span-7">
            <PropertyImageGallery images={propertyGalleryImages} propertyTitle={property.title} />
            <PropertyMediaTypeSection media={propertyMedia} virtualTour={property.virtualTour} />
          </div>

          {/* Right Column - Buyer Decision Panel */}
          <aside
            id="overview"
            className="lg:col-span-5"
            aria-label={
              isRentalListing
                ? 'Rental price and property details'
                : 'Property price and buyer checks'
            }
          >
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
              <div className="space-y-5 p-5 lg:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      {isRentalListing ? 'Monthly rent' : 'Asking price'}
                    </p>
                    <div className="mt-1 text-4xl font-extrabold leading-none tracking-tight text-slate-950">
                      {withRentalPeriod(
                        formatCurrency(displayPrice, { compact: false }),
                        normalizedListingType,
                      )}
                    </div>
                    {publicPricingContract?.intent === 'sale' &&
                      publicPricingContract.negotiability !== 'unknown' && (
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          {publicPricingContract.negotiability === 'negotiable'
                            ? 'Price negotiable'
                            : 'Price not negotiable'}
                        </p>
                      )}
                    {isRentalListing && rentDepositFact && (
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        Deposit:{' '}
                        {rentDepositFact.status === 'known' && rentDepositAmount !== undefined
                          ? formatCurrency(rentDepositAmount)
                          : rentDepositFact.status === 'zero'
                            ? 'R0 (no deposit)'
                            : rentDepositFact.status === 'unknown'
                              ? 'To confirm'
                              : 'Not applicable'}
                      </p>
                    )}
                  </div>
                  {contactBadgeLabel && (
                    <Badge className="shrink-0 border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50">
                      {contactBadgeLabel}
                    </Badge>
                  )}
                </div>

                {propertyDetailItems.length > 0 && (
                  <div className="grid grid-cols-4 gap-2.5">
                    {propertyDetailItems.map(item => {
                      const Icon = item.icon;
                      const displayValue = item.shortValue || item.value;
                      return (
                        <div
                          key={item.key}
                          className="min-w-0 rounded-xl border border-slate-200 bg-white px-2.5 py-3 text-center"
                        >
                          <Icon className="mx-auto mb-1.5 h-4 w-4 text-blue-600" />
                          <p className="truncate text-sm font-extrabold leading-tight text-slate-950">
                            {displayValue}
                          </p>
                          <p className="mt-1 truncate text-[10px] font-medium text-slate-500">
                            {item.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {featureSpecItems.length > 0 && (
                  <div id="features" className="border-t border-slate-200 pt-5">
                    <div className="mb-4 flex items-end justify-between gap-3">
                      <h2 className="text-sm font-extrabold text-slate-950">
                        {isRentalListing ? 'Property details' : 'Key buyer checks'}
                      </h2>
                      <p className="text-xs font-medium text-slate-500">
                        Comfort, utilities and security
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-x-3 gap-y-4">
                      {featureSpecItems.slice(0, 9).map(item => {
                        const Icon = item.icon;
                        const isMissing = item.status === 'missing';
                        return (
                          <div
                            key={item.key}
                            className="grid min-h-[44px] min-w-0 grid-cols-[36px_minmax(0,1fr)] items-start gap-x-2.5"
                          >
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                              <Icon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 pt-0.5 text-left">
                              <p className="truncate text-[10px] font-bold uppercase text-slate-500">
                                {item.label}
                              </p>
                              <p
                                className={`mt-0.5 truncate text-sm font-bold leading-tight ${
                                  isMissing ? 'text-slate-600' : 'text-slate-950'
                                }`}
                                title={item.value}
                              >
                                {item.value}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>

        <div className="sticky top-16 z-30 mb-8 hidden rounded-xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur lg:block">
          <div className="flex flex-wrap items-center gap-2">
            {sectionNavItems.map(item => (
              <button
                key={item.id}
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
                onClick={() => scrollToSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {(specs.ownershipType || runningCostItems.length > 0) && (
          <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {isRentalListing
                    ? 'Rental and property details'
                    : 'Ownership & transaction details'}
                </h2>
                <p className="text-sm text-slate-500">
                  {isRentalListing
                    ? 'Listing-supplied details. Confirm availability and terms before agreeing.'
                    : 'Seller-supplied figures. Confirm details before signing.'}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {specs.ownershipType && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-2 flex items-center gap-2 text-blue-600">
                    <Building2 className="h-4 w-4" />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Ownership type
                    </p>
                  </div>
                  <p className="text-sm font-bold capitalize text-slate-900">
                    {String(specs.ownershipType).replace(/_/g, ' ')}
                  </p>
                </div>
              )}

              {runningCostItems
                .filter(item => item.status !== 'not_applicable')
                .map(item => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.key}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                    >
                      <div className="mb-2 flex items-center gap-2 text-blue-600">
                        <Icon className="h-4 w-4" />
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                          {item.label}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-slate-900">{item.value}</p>
                      {item.note && <p className="mt-1 text-[11px] text-slate-400">{item.note}</p>}
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {/* Full-width separator */}
        <Separator className="my-8" />

        {/* Main Content Area - Two Column Layout (8/4) */}
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT COLUMN (8 columns) */}
          <div className="order-2 col-span-12 space-y-6 lg:order-1 lg:col-span-8">
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

            {/* 2.2 Canonical Features & Context */}
            {propertyFeatureGroups.length > 0 ? (
              <div
                id={featureSpecItems.length === 0 ? 'features' : undefined}
                className="space-y-4"
              >
                {propertyFeatureGroups.map(group => {
                  const GroupIcon =
                    group.key === 'security'
                      ? Shield
                      : group.key === 'utilities'
                        ? Zap
                        : group.key === 'highlights'
                          ? Sparkles
                          : group.key === 'context'
                            ? Home
                            : CheckCircle2;
                  return (
                    <Card key={group.key} className="border-slate-200 shadow-sm">
                      <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
                            <GroupIcon className="h-5 w-5" aria-hidden="true" />
                          </div>
                          <div>
                            <CardTitle className="text-fluid-h3 font-bold text-slate-900">
                              {group.title}
                            </CardTitle>
                            <p className="mt-1 text-sm leading-relaxed text-slate-500">
                              {group.description}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                          {group.items.map(item => (
                            <div
                              key={item.key}
                              className={cn(
                                'flex min-h-[44px] items-center justify-between gap-3 rounded-xl border px-3 py-2.5',
                                group.key === 'highlights' || item.source === 'highlight'
                                  ? 'border-amber-100 bg-amber-50/60'
                                  : 'border-slate-100 bg-slate-50',
                              )}
                            >
                              <span className="text-sm font-semibold leading-snug text-slate-900">
                                {item.label}
                              </span>
                              {item.value && (
                                <span className="shrink-0 text-xs font-medium text-slate-500">
                                  {item.value}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : propertyFeatureChecklistItems.length > 0 ? (
              <Card
                id={featureSpecItems.length === 0 ? 'features' : undefined}
                className="border-slate-200 shadow-sm"
              >
                <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-fluid-h3 font-bold text-slate-900">
                    Property Features &amp; Specifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {propertyFeatureChecklistItems.map(item => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.key}
                          className="flex min-h-[44px] items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5"
                        >
                          <Icon className="h-5 w-5 shrink-0 text-blue-600" />
                          <span className="text-sm font-semibold leading-snug text-slate-900">
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : highlights.length > 0 ? (
              <Card
                id={featureSpecItems.length === 0 ? 'features' : undefined}
                className="border-slate-200 shadow-sm"
              >
                <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-fluid-h3 font-bold text-slate-900">
                    Property Features &amp; Specifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {highlights.map((amenity: string, index: number) => {
                      const IconComponent = amenityIcons[amenity.toLowerCase()] || CheckCircle2;
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
                        >
                          <IconComponent className="h-5 w-5 text-blue-600" />
                          <span className="font-medium capitalize text-slate-700">{amenity}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* 2.5 Developer section (when property is linked to a Catalogue Publisher) */}
            {contactMode === 'developer' && property.developerBrand && (
              <DeveloperBrandSection brand={property.developerBrand as DeveloperBrandData} />
            )}

            {/* 2.6 Location Decision Support */}
            <section id="location" className="space-y-6">
              <NearbyLandmarks
                property={{
                  id: property.id,
                  title: property.title,
                  latitude: property.latitude ?? '',
                  longitude: property.longitude ?? '',
                }}
              />
            </section>
          </div>

          {/* RIGHT COLUMN (4 columns). It comes first on mobile so identity and
              the next action stay close to the price and gallery. */}
          <div className="order-1 col-span-12 lg:order-2 lg:col-span-4">
            <div className="space-y-4 lg:sticky lg:top-24">
              {hasPrimaryContactAction && (
                <div
                  id="contact"
                  className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block"
                >
                  <div className="bg-slate-950 px-5 py-5 text-white">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                      Ready to take the next step?
                    </p>
                    <div className="mt-2 text-2xl font-bold">
                      {withRentalPeriod(
                        formatCurrency(displayPrice, { compact: false }),
                        normalizedListingType,
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 px-5 py-5">
                    <Button
                      className="h-12 w-full bg-orange-500 text-base font-semibold text-white hover:bg-orange-600"
                      onClick={handleOpenStandardEnquiry}
                    >
                      Send enquiry
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 w-full border-slate-200 text-slate-700 hover:bg-slate-50"
                      onClick={handleRequestViewing}
                    >
                      Request a viewing
                    </Button>
                    {whatsappNumber && (
                      <Button
                        variant="outline"
                        className="h-11 w-full border-green-200 text-green-700 hover:bg-green-50 focus-visible:ring-green-500/30"
                        onClick={handleWhatsAppContact}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        WhatsApp {contactRoleLabel || 'representative'}
                      </Button>
                    )}
                    <p className="text-center text-xs leading-relaxed text-slate-500">
                      Property Listify saves the enquiry and confirms its authorized custody before
                      showing success.
                    </p>
                  </div>
                </div>
              )}

              {contactMode !== 'unknown' && (
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="space-y-5 p-5">
                    {contactMode === 'agent' ? (
                      <>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Agent Overview</p>
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
                              <div className="flex h-full w-full items-center justify-center bg-blue-100 text-xl font-bold text-blue-700">
                                {contactIdentity?.name?.charAt(0) || '?'}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              {contactBadgeLabel && (
                                <Badge className="border border-blue-200 bg-blue-50 text-[10px] text-blue-700 hover:bg-blue-50">
                                  {contactBadgeLabel}
                                </Badge>
                              )}
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">
                              {contactIdentity?.name || 'Listing Agent'}
                            </h3>
                            {contactSubline && (
                              <p className="mt-1 text-sm font-medium text-slate-600">
                                {contactSubline}
                              </p>
                            )}
                            <p className="mt-2 text-sm leading-relaxed text-slate-500">
                              {contactIntro}
                            </p>
                          </div>
                        </div>

                        {agentProfileHref && (
                          <a
                            href={agentProfileHref}
                            className="flex h-11 w-full items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                          >
                            View agent profile
                          </a>
                        )}
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {contactMode === 'developer'
                              ? 'Developer representative'
                              : contactMode === 'agency'
                                ? 'Listing agency'
                                : contactMode === 'platform'
                                  ? 'Property Listify operations'
                                  : 'Listing representative'}
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
                                <Badge className="border border-blue-200 bg-blue-50 text-[11px] text-blue-700 hover:bg-blue-50">
                                  {contactBadgeLabel}
                                </Badge>
                              )}
                            </div>
                            {contactSubline && (
                              <p className="mt-1 text-sm font-medium text-slate-600">
                                {contactSubline}
                              </p>
                            )}
                            <p className="mt-2 text-sm leading-relaxed text-slate-500">
                              {contactIntro}
                            </p>
                          </div>
                        </div>

                        {developmentHref && contactMode === 'developer' && (
                          <Button
                            variant="outline"
                            className="h-12 w-full justify-between rounded-lg border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                            onClick={() => setLocation(developmentHref)}
                          >
                            <span className="font-medium text-slate-700">View development</span>
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          </Button>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
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
                  {isRentalListing
                    ? `Explore more rentals in ${property.suburb || property.city}`
                    : `Still comparing? Explore more in ${property.suburb || property.city}`}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {isRentalListing
                    ? 'These rentals match the same area or property type, so you can keep exploring without leaving the marketplace.'
                    : 'These listings match the same area or property type, so you can compare options without leaving the marketplace.'}
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                className="w-full border-slate-300 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-blue-500/30 md:w-auto"
              >
                <Link href={similarListingsHref}>View All Matching Listings</Link>
              </Button>
            </div>

            {/* Horizontal Scroll Carousel */}
            <div className="relative -mx-4 px-4 md:mx-0 md:px-0">
              <div className="flex overflow-x-auto gap-4 pb-8 snap-x snap-mandatory scrollbar-hide">
                {similarProperties.map(prop => (
                  <Link
                    key={prop.id}
                    href={prop.href}
                    aria-label={`Open ${prop.title}`}
                    className="group min-w-[280px] snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-blue-500/30 md:min-w-[320px]"
                  >
                    {/* Image */}
                    <div className="relative h-44 overflow-hidden bg-slate-100">
                      <img
                        src={prop.image || prop.images[0]?.url || '/placeholder-property.jpg'}
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
                            {withRentalPeriod(
                              `R ${prop.price.toLocaleString()}`,
                              normalizedListingType,
                            )}
                          </p>
                          {(prop.suburb || prop.city) && (
                            <p className="mt-1 text-xs text-slate-500">
                              {prop.suburb || prop.city}
                              {prop.suburb && prop.city ? `, ${prop.city}` : ''}
                            </p>
                          )}
                        </div>
                        {!isRentalListing && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">
                            Compare
                          </span>
                        )}
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
                        {(prop.area || prop.internalAreaM2) && (
                          <div className="flex items-center gap-1">
                            <Square className="h-3.5 w-3.5" />
                            <span>{prop.area || prop.internalAreaM2} m²</span>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-100 pt-3 text-sm font-medium text-slate-700 transition group-hover:text-blue-700">
                        Open listing
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {hasPrimaryContactAction && (
        <aside
          aria-label="Property enquiry actions"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pt-3 shadow-[0_-12px_32px_rgba(15,23,42,0.12)] backdrop-blur-md pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden"
        >
          <div className="mx-auto flex max-w-lg items-center gap-2">
            <Button
              className="h-12 min-w-0 flex-1 bg-orange-500 text-sm font-bold text-white hover:bg-orange-600 focus-visible:ring-orange-500/30"
              onClick={handleOpenStandardEnquiry}
            >
              Send enquiry
            </Button>
            <Button
              variant="outline"
              className="h-12 shrink-0 border-slate-200 px-3 text-xs text-slate-700 hover:bg-slate-50 focus-visible:ring-blue-500/30"
              onClick={handleRequestViewing}
              aria-label="Request a viewing"
              title="Request a viewing"
            >
              <CalendarDays className="h-4 w-4" />
              Viewing
            </Button>
            {whatsappNumber && (
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 shrink-0 border-green-200 text-green-700 hover:bg-green-50 focus-visible:ring-green-500/30"
                onClick={handleWhatsAppContact}
                aria-label={`WhatsApp ${contactRoleLabel || 'listing representative'}`}
                title={`WhatsApp ${contactRoleLabel || 'listing representative'}`}
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
            )}
          </div>
        </aside>
      )}

      </main>

      <PropertyContactModal
        isOpen={isContactModalOpen}
        onClose={() => {
          setIsContactModalOpen(false);
          setContactInitialMessage('');
          setContactIntent('enquiry');
          setContactRequestType('enquiry');
        }}
        propertyId={propertyId}
        propertyTitle={property.title}
        agentName={contactIdentity?.name || 'the listing representative'}
        initialMessage={contactInitialMessage}
        source={contactIntent === 'whatsapp' ? 'property_detail_whatsapp' : 'property_detail'}
        intent={contactRequestType}
        submitLabel={
          contactIntent === 'whatsapp'
            ? 'Continue with WhatsApp'
            : contactRequestType === 'viewing_request'
              ? 'Submit viewing request'
              : 'Send enquiry'
        }
        successMessage={
          contactIntent === 'whatsapp'
            ? `Your enquiry has been saved and delivered to ${contactIdentity?.name || 'the listing representative'}. WhatsApp will open only after authorized custody is confirmed.`
            : contactRequestType === 'viewing_request'
              ? `Your viewing request has been saved and delivered to ${contactIdentity?.name || 'the listing representative'}. This is not a confirmed appointment; the representative can contact you to arrange a suitable time.`
              : `Your enquiry has been saved and delivered to ${contactIdentity?.name || 'the listing representative'}.`
        }
        successAction={
          contactIntent === 'whatsapp' && whatsappNumber
            ? {
                type: 'whatsapp',
                phone: whatsappNumber,
                message: contactInitialMessage,
              }
            : undefined
        }
      />

      <PropertyShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        propertyTitle={property.title}
        propertyUrl={window.location.href}
      />

      <footer className="mt-20 bg-slate-900 py-12 text-slate-300">
        <div className="container text-center">
          <p>&copy; {new Date().getFullYear()} Property Listify. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
