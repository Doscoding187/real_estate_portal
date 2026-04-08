import React, { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { PropertyImageGallery } from '@/components/property/PropertyImageGallery';
import { Breadcrumbs } from '@/components/search/Breadcrumbs';
import { buildPropertyUrl, generateBreadcrumbs } from '@/lib/urlUtils';
import { PropertyContactModal } from '@/components/property/PropertyContactModal';
import { PropertyShareModal } from '@/components/property/PropertyShareModal';
import { BondCalculator } from '@/components/BondCalculator';
import { NearbyLandmarks } from '@/components/property/NearbyLandmarks';
import { SuburbInsights } from '@/components/property/SuburbInsights';
import { LocalityGuide } from '@/components/property/LocalityGuide';
import { PropertyMobileFooter } from '@/components/property/PropertyMobileFooter';
import {
  DeveloperBrandSection,
  DeveloperBrandData,
} from '@/components/property/DeveloperBrandSection';
import { MetaControl } from '@/components/seo/MetaControl';
import { buildBreadcrumbStructuredData, buildPlaceStructuredData } from '@/lib/seo/structuredData';

const amenityIcons: Record<string, any> = {
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

const formatDateLabel = (value: unknown) => {
  if (!value) return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    const fallback = String(value).trim();
    return fallback || null;
  }
  return parsed.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export default function PropertyDetail(props: { propertyId?: number } & any) {
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
  const [isBondCalculatorModalOpen, setIsBondCalculatorModalOpen] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

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

  const { property, images } = data as any;
  const agent = (property as any)?.agent || (data as any)?.agent;

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
    listingType: property.listingType as any,
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

  // Parse Property Specs
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
  }

  let rawPropertyDetails: Record<string, unknown> = {};
  try {
    if ((property as any).propertyDetails) {
      rawPropertyDetails =
        typeof (property as any).propertyDetails === 'string'
          ? JSON.parse((property as any).propertyDetails)
          : (property as any).propertyDetails;
    }
  } catch (error) {
    console.error('Failed to parse property details', error);
  }

  let parsedPropertySettings: Record<string, unknown> = {};
  try {
    if ((property as any).propertySettings) {
      parsedPropertySettings =
        typeof (property as any).propertySettings === 'string'
          ? JSON.parse((property as any).propertySettings)
          : (property as any).propertySettings;
    }
  } catch (e) {
    console.error('Failed to parse property settings', e);
  }

  const mergedDetailSpecs = {
    ...rawPropertyDetails,
    ...parsedPropertySettings,
  } as Record<string, unknown>;

  const specs: PropertySpecs = {
    ownershipType:
      String(
        mergedDetailSpecs.ownershipType ?? parsedPropertySettings.ownershipType ?? '',
      ).trim() || undefined,
    powerBackup:
      String(mergedDetailSpecs.powerBackup ?? parsedPropertySettings.powerBackup ?? '').trim() ||
      undefined,
    securityFeatures: Array.isArray(mergedDetailSpecs.securityFeatures)
      ? (mergedDetailSpecs.securityFeatures as string[])
      : Array.isArray(parsedPropertySettings.securityFeatures)
        ? (parsedPropertySettings.securityFeatures as string[])
        : undefined,
    waterSupply:
      String(mergedDetailSpecs.waterSupply ?? parsedPropertySettings.waterSupply ?? '').trim() ||
      undefined,
    internetAccess:
      String(
        mergedDetailSpecs.internetAccess ??
          mergedDetailSpecs.internetAvailability ??
          parsedPropertySettings.internetAccess ??
          '',
      ).trim() || undefined,
    flooring:
      String(
        mergedDetailSpecs.flooring ??
          mergedDetailSpecs.flooringType ??
          parsedPropertySettings.flooring ??
          '',
      ).trim() || undefined,
    parkingType:
      String(mergedDetailSpecs.parkingType ?? parsedPropertySettings.parkingType ?? '').trim() ||
      undefined,
    petFriendly:
      typeof mergedDetailSpecs.petFriendly === 'boolean'
        ? mergedDetailSpecs.petFriendly
          ? 'yes'
          : 'no'
        : String(
            mergedDetailSpecs.petFriendly ?? parsedPropertySettings.petFriendly ?? '',
          ).trim() || undefined,
    electricitySupply:
      String(
        mergedDetailSpecs.electricitySupply ??
          mergedDetailSpecs.electricitySource ??
          parsedPropertySettings.electricitySupply ??
          '',
      ).trim() || undefined,
    additionalRooms: Array.isArray(mergedDetailSpecs.additionalRooms)
      ? (mergedDetailSpecs.additionalRooms as string[])
      : Array.isArray(parsedPropertySettings.additionalRooms)
        ? (parsedPropertySettings.additionalRooms as string[])
        : undefined,
  };

  const developerBrand = ((property as any).developerBrand ||
    (property as any).developerBrandProfile) as any;
  const normalizedListerType = String((property as any).listerType || '')
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
  const propertyBadges = Array.isArray((specs as any).badges)
    ? (specs as any).badges
        .map(
          (badge: string) => BADGE_TEMPLATES[badge as keyof typeof BADGE_TEMPLATES]?.label || badge,
        )
        .filter(Boolean)
    : [];
  const isDeveloperListing = contactMode === 'developer';
  const listingContextLabel =
    contactMode === 'developer'
      ? 'New Development'
      : contactMode === 'agent'
        ? 'Listed by Agent'
        : contactMode === 'private'
          ? 'Private Listing'
          : null;
  const development = (property as any).development as any;
  const developmentName = String(development?.name || '').trim();
  const developmentHref = developmentName
    ? development?.slug
      ? `/development/${development.slug}`
      : development?.id
        ? `/development/${development.id}`
        : null
    : null;

  const similarProperties = (similarPropertiesData ?? []).filter(p => p.id !== propertyId);
  const propertyImages = (Array.isArray(images) ? images : [])
    .map((image: any) =>
      typeof image?.imageUrl === 'string'
        ? image.imageUrl
        : typeof image?.url === 'string'
          ? image.url
          : '',
    )
    .filter(Boolean);
  const houseSizeM2 = parseStrictNumber(mergedDetailSpecs.houseAreaM2);
  const erfSizeM2 = parseStrictNumber(mergedDetailSpecs.erfSizeM2);
  const unitSizeM2 = parseStrictNumber(mergedDetailSpecs.unitSizeM2);
  const parkingLabel = formatLabel(specs.parkingType);
  const displayPrice = Number(property.price) || 0;
  const displayRepayment = displayPrice > 0 ? Math.round(displayPrice * 0.0095) : 0;
  const directPhone = String(contactIdentity?.phone || '').trim();
  const whatsappNumber = String(contactIdentity?.whatsapp || contactIdentity?.phone || '').trim();
  const directEmail = String(contactIdentity?.email || '').trim();
  const hasPrimaryContactAction = Boolean(
    directPhone || whatsappNumber || directEmail || contactMode !== 'unknown',
  );
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
  ].filter(Boolean) as Array<{ key: string; label: string; value: string; icon: any }>;
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
  ].filter(Boolean) as Array<{ key: string; label: string; value: string; icon: any }>;
  const normalizedListingType = String(property.listingType || '')
    .trim()
    .toLowerCase();
  const isSaleListing = normalizedListingType === 'sale' || normalizedListingType === 'sell';
  const isRentalListing = normalizedListingType === 'rent';
  const isAuctionListing = normalizedListingType === 'auction';
  const leviesAmount = parseStrictNumber(
    (property as any).levies ??
      mergedDetailSpecs.levies ??
      mergedDetailSpecs.leviesHoaOperatingCosts,
  );
  const ratesTaxesAmount = parseStrictNumber(
    (property as any).ratesAndTaxes ??
      mergedDetailSpecs.ratesAndTaxes ??
      mergedDetailSpecs.ratesTaxes,
  );
  const transactionDetailItems = [
    ratesTaxesAmount
      ? {
          key: 'rates-taxes',
          label: 'Rates & Taxes',
          value: formatCurrency(ratesTaxesAmount),
        }
      : null,
    leviesAmount
      ? {
          key: 'levies',
          label: 'Levies / HOA',
          value: formatCurrency(leviesAmount),
        }
      : null,
    isSaleListing && mergedDetailSpecs.negotiable != null
      ? {
          key: 'negotiable',
          label: 'Negotiable',
          value: mergedDetailSpecs.negotiable ? 'Yes' : 'No',
        }
      : null,
    isSaleListing && parseStrictNumber(mergedDetailSpecs.transferCostEstimate)
      ? {
          key: 'transfer-costs',
          label: 'Estimated Transfer Costs',
          value: formatCurrency(Number(mergedDetailSpecs.transferCostEstimate)),
        }
      : null,
    isRentalListing && parseStrictNumber(mergedDetailSpecs.deposit)
      ? {
          key: 'deposit',
          label: 'Deposit',
          value: formatCurrency(Number(mergedDetailSpecs.deposit)),
        }
      : null,
    isRentalListing && String(mergedDetailSpecs.leaseTerms || '').trim()
      ? {
          key: 'lease-terms',
          label: 'Lease Terms',
          value: String(mergedDetailSpecs.leaseTerms).trim(),
        }
      : null,
    isRentalListing && formatDateLabel(mergedDetailSpecs.availableFrom)
      ? {
          key: 'available-from',
          label: 'Available From',
          value: formatDateLabel(mergedDetailSpecs.availableFrom) as string,
        }
      : null,
    isRentalListing && mergedDetailSpecs.utilitiesIncluded != null
      ? {
          key: 'utilities',
          label: 'Utilities Included',
          value: mergedDetailSpecs.utilitiesIncluded ? 'Yes' : 'No',
        }
      : null,
    isAuctionListing && parseStrictNumber(mergedDetailSpecs.reservePrice)
      ? {
          key: 'reserve-price',
          label: 'Reserve Price',
          value: formatCurrency(Number(mergedDetailSpecs.reservePrice)),
        }
      : null,
    isAuctionListing && formatDateLabel(mergedDetailSpecs.auctionDateTime)
      ? {
          key: 'auction-date',
          label: 'Auction Date',
          value: formatDateLabel(mergedDetailSpecs.auctionDateTime) as string,
        }
      : null,
    isAuctionListing && String(mergedDetailSpecs.auctionTermsDocumentUrl || '').trim()
      ? {
          key: 'auction-terms',
          label: 'Auction Terms',
          value: 'Available on request',
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; value: string }>;
  const handleScrollToCalculator = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsBondCalculatorModalOpen(true);
      return;
    }

    document.getElementById('buyability-calculator')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
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
      images: propertyImages,
      address: {
        streetAddress: property.address,
        addressLocality: property.city,
        addressRegion: property.province,
        postalCode: property.zipCode,
        addressCountry: 'ZA',
      },
      geo: {
        latitude: (property as any).latitude,
        longitude: (property as any).longitude,
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

  return (
    <div className="min-h-screen bg-slate-50">
      <MetaControl
        canonicalUrl={canonicalUrl}
        title={seoTitle}
        description={seoDescription}
        image={propertyImages[0]}
        structuredData={propertyStructuredData}
      />
      <ListingNavbar />

      {/* Hero / Header Section */}
      <div className="bg-white border-b border-slate-200 pt-16">
        <div className="container py-6">
          {/* Breadcrumbs */}
          <div className="hidden lg:block mb-4">
            <Breadcrumbs items={breadcrumbItems} />
          </div>

          {/* Top Row: Badges */}
          <div className="flex items-center gap-2 mb-4">
            {property.featured === 1 && (
              <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-0 rounded-md px-3 py-1 font-normal">
                FEATURED
              </Badge>
            )}
            {listingContextLabel ? (
              <Badge
                variant="secondary"
                className={
                  isDeveloperListing
                    ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-md px-3 py-1 font-normal'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-md px-3 py-1 font-normal'
                }
              >
                {listingContextLabel}
              </Badge>
            ) : null}
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

          {/* Desktop Action Buttons */}
          <div className="hidden lg:flex items-center gap-3">
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
            {hasPrimaryContactAction && (
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 h-10"
                onClick={() => setIsContactModalOpen(true)}
              >
                {contactRoleLabel ? `Contact ${contactRoleLabel}` : 'Send Enquiry'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Image Gallery + Property Info Block */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          {/* Left Column - Image Gallery */}
          <div className="lg:col-span-7 relative">
            {/* Mobile Overlay */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.history.back()}
                className="bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-white rounded-full shadow-sm"
              >
                <ChevronRight className="h-5 w-5 rotate-180" />
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleFavoriteClick}
                  className="bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-white rounded-full shadow-sm"
                >
                  <Heart className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleShare}
                  className="bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-white rounded-full shadow-sm"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white">
              <PropertyImageGallery images={images} propertyTitle={property.title} />
            </div>
          </div>

          {/* Mobile Title Section - Below Gallery */}
          <div className="lg:hidden container py-6">
            <h1 className="text-fluid-h2 font-bold text-slate-900 mb-2">{property.title}</h1>
            <div className="flex items-center gap-2 text-slate-500 mb-4">
              <MapPin className="h-4 w-4" />
              <span className="text-base text-slate-500">
                {property.address}, {property.city}, {property.province}
              </span>
            </div>

            <div className="text-fluid-h1 font-bold text-orange-500 mb-2">
              {formatCurrency(displayPrice, { compact: false })}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm mb-4">
              <span className="text-slate-500 font-medium">Estimated Repayment:</span>
              <span className="text-slate-900 font-bold">
                {formatCurrency(displayRepayment, { compact: false })}/Pm
              </span>
              <button
                type="button"
                className="text-blue-500 hover:text-blue-600 font-medium hover:underline ml-1"
                onClick={handleScrollToCalculator}
              >
                Get Pre-Qualified
              </button>
            </div>

            {developmentName && (
              <div className="flex items-center gap-2 text-slate-500 mb-4">
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

            {/* Property Details Icons - Mobile 4 icons */}
            {propertyDetailItems.length > 0 && (
              <div className="flex items-center justify-between gap-2 mb-6">
                {propertyDetailItems.slice(0, 4).map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={item.key} className="flex flex-col items-center gap-1">
                      <div className="bg-orange-50 p-2 rounded-md text-orange-500">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs text-slate-500">{item.label.split(' ')[0]}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Badges */}
            <div className="flex items-center gap-2">
              {property.featured === 1 && (
                <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-0 rounded-md px-3 py-1 font-normal">
                  FEATURED
                </Badge>
              )}
              {listingContextLabel ? (
                <Badge
                  variant="secondary"
                  className={
                    isDeveloperListing
                      ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-md px-3 py-1 font-normal'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-md px-3 py-1 font-normal'
                  }
                >
                  {listingContextLabel}
                </Badge>
              ) : null}
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
          </div>

          {/* Right Column - Property Info */}
          <div className="lg:col-span-5 space-y-12">
            {/* Price Section - Desktop Only */}
            <div className="hidden lg:block">
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
                  onClick={handleScrollToCalculator}
                >
                  Get Pre-Qualified
                </button>
              </div>
            </div>

            {/* Property Details - Desktop Only */}
            {propertyDetailItems.length > 0 && (
              <div className="hidden lg:block">
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
                            {property.area.toLocaleString()} m²
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

            {transactionDetailItems.length > 0 && (
              <div className="hidden lg:block">
                <h3 className="text-fluid-h3 font-bold text-slate-900 mb-4">Transaction Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {transactionDetailItems.map(item => (
                    <div key={item.key} className="flex items-start gap-3">
                      <div className="bg-orange-50 p-2 rounded-md text-orange-500">
                        <Square className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">{item.label}</p>
                        <p className="font-semibold text-slate-900">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Rooms */}
            {specs.additionalRooms && specs.additionalRooms.length > 0 && (
              <div className="mb-6 hidden lg:block">
                <h3 className="text-lg font-medium text-slate-400 mb-3">
                  Additional rooms & Specifications
                </h3>
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
              </div>
            )}

            {/* Amenities */}
            {highlights.length > 0 && (
              <div>
                <h3 className="text-fluid-h3 font-bold text-slate-900 mb-4">
                  Amenities & Features
                </h3>
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
              <Card className="border-slate-200 shadow-sm">
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

            {/* 2.3 Contact Overview */}
            {contactMode !== 'unknown' && (
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-200">
                  <h3 className="text-fluid-h3 font-bold text-slate-900">
                    {contactMode === 'developer'
                      ? 'Developer Contact'
                      : contactMode === 'private'
                        ? 'Seller Contact'
                        : 'Agent Contact'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden border-2 border-slate-200 shrink-0">
                        {contactIdentity?.image ? (
                          <img
                            src={contactIdentity.image}
                            alt={contactIdentity.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-500 font-bold text-xl">
                            {contactIdentity?.name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-lg font-bold text-slate-900">
                          {contactIdentity?.name || 'Listing Contact'}
                        </h4>
                        {listingContextLabel && (
                          <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none rounded-full px-3 py-0.5 text-xs font-medium mt-1">
                            {listingContextLabel}
                          </Badge>
                        )}
                        {contactIdentity?.agency && (
                          <p className="mt-2 text-sm text-slate-500">{contactIdentity.agency}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {developmentHref && contactMode === 'developer' && (
                        <Button
                          variant="outline"
                          className="w-full justify-between h-12 rounded-lg border-slate-200 hover:bg-slate-50 hover:text-slate-900 group"
                          onClick={() => setLocation(developmentHref)}
                        >
                          <span className="font-medium text-slate-700">View Development</span>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between gap-4">
                    <div className="space-y-3">
                      <h4 className="text-lg font-semibold text-slate-900">
                        Enquire about this property
                      </h4>
                      <p className="text-sm text-slate-600">
                        Use the enquiry form to send your interest through the platform.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {whatsappNumber && (
                        <Button
                          variant="outline"
                          className="w-full h-12 rounded-lg border-green-200 text-green-700 hover:bg-green-50"
                          onClick={() =>
                            window.open(
                              `https://wa.me/${whatsappNumber.replace(/[^\d]/g, '')}`,
                              '_blank',
                            )
                          }
                        >
                          WhatsApp {contactRoleLabel || 'Contact'}
                        </Button>
                      )}
                      <Button
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold h-12 rounded-lg shadow-sm"
                        onClick={() => setIsContactModalOpen(true)}
                      >
                        Send Enquiry
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2.4 Developer Brand Section (when property is linked to a brand profile) */}
            {((property as any).developerBrand || (property as any).developerBrandProfile) && (
              <DeveloperBrandSection
                brand={
                  ((property as any).developerBrand ||
                    (property as any).developerBrandProfile) as DeveloperBrandData
                }
              />
            )}

            {/* 2.5 Nearby Landmarks */}
            <NearbyLandmarks property={property} />

            {/* 2.5 Suburb Reviews & Insights */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <SuburbInsights
                  suburbId={Number((property as any).suburbId ?? 0)}
                  suburbName={property.suburb || property.city}
                  isDevelopment={!!property.developmentId}
                />
              </CardContent>
            </Card>

            {/* 2.6 Locality Guide */}
            <LocalityGuide suburb={property.suburb || property.city} city={property.city} />
          </div>

          {/* RIGHT COLUMN (4 columns) */}
          <div className="col-span-12 lg:col-span-4 hidden lg:block">
            {/* Buyability Calculator - Sticky */}
            <div id="buyability-calculator" className="sticky top-24 space-y-4">
              <BondCalculator
                propertyPrice={displayPrice}
                showTransferCosts={true}
                ctaLabel={
                  contactRoleLabel ? `Request Help From ${contactRoleLabel}` : 'Send Enquiry'
                }
                onCtaClick={() => setIsContactModalOpen(true)}
              />

              {/* Disclaimer */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  <strong>Disclaimer:</strong> These calculations are estimates only. Actual bond
                  approval, interest rates, and transfer costs may vary based on individual
                  circumstances and bank policies. Consult with a bond originator or financial
                  advisor for accurate figures.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3 - FULL WIDTH FOOTER - Similar Properties Carousel */}
        {similarProperties.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900">
                Property Listings in {property.suburb || property.city}
              </h3>
              <div className="text-sm font-medium text-blue-600 cursor-pointer hover:underline">
                View All
              </div>
            </div>

            {/* Horizontal Scroll Carousel */}
            <div className="relative -mx-4 px-4 md:mx-0 md:px-0">
              <div className="flex overflow-x-auto gap-4 pb-8 snap-x snap-mandatory scrollbar-hide">
                {similarProperties.map(prop => (
                  <div
                    key={prop.id}
                    onClick={() => setLocation(`/property/${prop.id}`)}
                    className="group cursor-pointer bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all overflow-hidden min-w-[280px] md:min-w-[300px] snap-start"
                  >
                    {/* Image */}
                    <div className="relative h-44 overflow-hidden bg-slate-100">
                      <img
                        src={prop.mainImage || '/placeholder-property.jpg'}
                        alt={prop.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-white/90 text-slate-700 hover:bg-white backdrop-blur-sm shadow-sm border-0 text-xs py-0 h-5">
                          {prop.propertyType}
                        </Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-3 space-y-2">
                      {/* Price */}
                      <p className="text-lg font-bold text-[#005ca8]">
                        R {prop.price.toLocaleString()}
                      </p>

                      {/* Title */}
                      <h4 className="font-semibold text-slate-800 line-clamp-1 text-sm">
                        {prop.title}
                      </h4>

                      {/* Property Details */}
                      <div className="flex items-center gap-3 text-xs text-slate-500">
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
        price={formatCurrency(displayPrice, { compact: false })}
        repayment={`${formatCurrency(displayRepayment, { compact: false })}/Pm`}
        onEmail={() => setIsContactModalOpen(true)}
        onWhatsApp={() =>
          whatsappNumber
            ? window.open(`https://wa.me/${whatsappNumber.replace(/[^\d]/g, '')}`, '_blank')
            : undefined
        }
        canWhatsApp={Boolean(whatsappNumber)}
      />

      {/* Modals */}
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
      />

      <Dialog open={isBondCalculatorModalOpen} onOpenChange={setIsBondCalculatorModalOpen}>
        <DialogContent className="w-[95vw] max-w-md p-0 overflow-hidden">
          <div className="max-h-[85vh] overflow-y-auto p-4 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Get Pre-Qualified</h3>
            <BondCalculator
              propertyPrice={displayPrice}
              showTransferCosts={true}
              ctaLabel={contactRoleLabel ? `Request Help From ${contactRoleLabel}` : 'Send Enquiry'}
              onCtaClick={() => {
                setIsBondCalculatorModalOpen(false);
                setIsContactModalOpen(true);
              }}
            />
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                <strong>Disclaimer:</strong> These calculations are estimates only. Actual bond
                approval, interest rates, and transfer costs may vary based on individual
                circumstances and bank policies.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
