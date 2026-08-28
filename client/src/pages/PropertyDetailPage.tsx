import React, { useState } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  CarFront,
  ChevronRight,
  CircleCheckBig,
  Droplets,
  GitCompareArrows,
  Heart,
  House,
  LandPlot,
  Home,
  MapPin,
  MessageCircle,
  PawPrint,
  ReceiptText,
  Ruler,
  Share2,
  ShieldCheck,
  SunMedium,
  Trees,
  Waves,
  Wifi,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useGuestActivity } from '@/contexts/GuestActivityContext';
import { useComparison } from '@/contexts/ComparisonContext';
import { cn, formatCurrency } from '@/lib/utils';
import { PropertyImageGallery } from '@/components/property/PropertyImageGallery';
import { HouseMeasureIcon } from '@/components/icons/HouseMeasureIcon';
import {
  PropertyMediaTypeSection,
  type PublicPropertyMedia,
  type PublicPropertyVirtualTour,
} from '@/components/property/PropertyMediaTypeSection';
import { Breadcrumbs } from '@/components/search/Breadcrumbs';
import { buildPropertyUrl, generateBreadcrumbs, type SearchFilters } from '@/lib/urlUtils';
import { buildCanonicalSearchUrl } from '@/lib/searchNavigation';
import { getPropertySearchReturn } from '@/lib/searchReturnState';
import { PropertyContactModal } from '@/components/property/PropertyContactModal';
import { PropertyShareModal } from '@/components/property/PropertyShareModal';
import { PropertyLocationOverview } from '@/components/property/PropertyLocationOverview';
import {
  DeveloperBrandSection,
  type DeveloperBrandData,
} from '@/components/property/DeveloperBrandSection';
import { MetaControl } from '@/components/seo/MetaControl';
import { buildBreadcrumbStructuredData, buildPlaceStructuredData } from '@/lib/seo/structuredData';
import type {
  PublicPropertyDetailFact,
  PublicPropertyDetailIcon,
  PublicPropertyDetailPresentation,
} from '@/../../shared/public-property-detail-presentation';
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
  propertyType?: string;
  featured?: number;
  developerBrand?: DeveloperBrandLite;
  development?: DevelopmentLite;
  virtualTour?: PublicPropertyVirtualTour | null;
  publicIdentity?: PublicPropertySupplyIdentity;
  detailPresentation?: PublicPropertyDetailPresentation;
}

interface PropertyDetailResponse {
  property: PropertyPayload;
  images?: PropertyImageLike[];
  media?: PublicPropertyMedia[];
}

type RelatedPropertyFact = {
  key: string;
  label: string;
  Icon: React.ElementType;
};

const detailIcons: Record<PublicPropertyDetailIcon, React.ElementType> = {
  area: Ruler,
  floorSize: HouseMeasureIcon,
  yardSize: LandPlot,
  landSize: Trees,
  bedrooms: BedDouble,
  bathrooms: Bath,
  parking: CarFront,
  property: House,
  electricity: Zap,
  water: Droplets,
  backupPower: SunMedium,
  sewerage: Waves,
  security: ShieldCheck,
  internet: Wifi,
  cost: ReceiptText,
  pets: PawPrint,
  location: MapPin,
  feature: CircleCheckBig,
};

const textForStatus = (item: PublicPropertyDetailFact) =>
  item.status === 'not_supplied' ? 'text-slate-500' : 'text-slate-950';

function DetailFactGrid({
  facts,
  variant,
}: {
  facts: PublicPropertyDetailFact[];
  variant: 'hero' | 'checks' | 'context';
}) {
  if (facts.length === 0) return null;

  if (variant === 'hero') {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {facts.map(item => {
          const Icon = detailIcons[item.icon];
          return (
            <div
              key={item.key}
              className="min-w-0 rounded-xl border border-slate-200 bg-white px-2.5 py-3 text-center"
            >
              <Icon className="mx-auto mb-1.5 h-4 w-4 text-blue-600" aria-hidden="true" />
              <p className="truncate text-sm font-extrabold leading-tight text-slate-950">
                {item.value}
              </p>
              <p className="mt-1 truncate text-[10px] font-medium text-slate-500">{item.label}</p>
            </div>
          );
        })}
      </div>
    );
  }

  if (variant === 'checks') {
    return (
      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        {facts.map(item => {
          const Icon = detailIcons[item.icon];
          return (
            <div
              key={item.key}
              className="grid min-w-0 grid-cols-[21px_minmax(0,1fr)] gap-x-2.5"
              title={`${item.label}: ${item.value}`}
            >
              <span className="mt-0.5 flex h-6 w-5 items-center justify-center text-blue-700">
                <Icon className="h-4 w-4 stroke-[1.9]" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {item.label}
                </p>
                <p
                  className={cn(
                    'mt-0.5 line-clamp-2 text-xs font-bold leading-tight',
                    textForStatus(item),
                  )}
                >
                  {item.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {facts.map(item => {
        const Icon = detailIcons[item.icon];
        return (
          <div key={item.key} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
            <div className="mb-1 flex items-center gap-2 text-blue-600">
              <Icon className="h-4 w-4" aria-hidden="true" />
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {item.label}
              </p>
            </div>
            <p className={cn('text-sm font-bold', textForStatus(item))}>{item.value}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function PropertyDetailPage({ propertyId: propPropertyId }: PropertyDetailProps) {
  const [, params] = useRoute('/property/:id');
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { addViewedProperty } = useGuestActivity();
  const { isInComparison, addToComparison, removeFromComparison, canAddMore } = useComparison();
  const rawId = propPropertyId?.toString() || params?.id || '0';
  const propertyId = Number.parseInt(rawId, 10) || 0;

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [contactInitialMessage, setContactInitialMessage] = useState('');
  const [contactIntent, setContactIntent] = useState<'enquiry' | 'whatsapp'>('enquiry');
  const [contactRequestType, setContactRequestType] = useState<'enquiry' | 'viewing_request'>(
    'enquiry',
  );
  const [isStickyNavVisible, setIsStickyNavVisible] = useState(false);
  const overviewSectionRef = React.useRef<HTMLElement>(null);

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
    onError: () => toast.error('Unable to update saved homes. Please try again.'),
  });

  React.useEffect(() => {
    if (propertyId > 0) addViewedProperty(propertyId);
  }, [propertyId, addViewedProperty]);

  React.useEffect(() => {
    let frameId: number | null = null;
    const updateStickyVisibility = () => {
      frameId = null;
      const overview = overviewSectionRef.current;
      const shouldShow =
        Boolean(overview) &&
        window.innerWidth >= 1024 &&
        (overview?.getBoundingClientRect().bottom || 0) <= 80;
      setIsStickyNavVisible(current => (current === shouldShow ? current : shouldShow));
    };
    const scheduleUpdate = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(updateStickyVisibility);
    };

    scheduleUpdate();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [propertyId, data?.property?.id]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ListingNavbar />
        <main id="main-content" tabIndex={-1} className="outline-none">
          <div className="flex items-center justify-center py-fluid-xl">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          </div>
        </main>
      </div>
    );
  }

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

  if (!data?.property) {
    return (
      <div className="min-h-screen bg-background">
        <ListingNavbar />
        <main id="main-content" tabIndex={-1} className="outline-none">
          <div className="container py-fluid-xl text-center">
            <h2 className="mb-4 text-2xl font-semibold">Property no longer available</h2>
            <p className="mb-6 text-slate-500">
              This listing may have been removed, unpublished or replaced. Return to your results to
              keep browsing legitimate public inventory.
            </p>
            <Button onClick={handleUnavailableReturn}>Return to results</Button>
          </div>
        </main>
      </div>
    );
  }

  const { property, images = [], media = [] } = data as PropertyDetailResponse;
  const presentation = property.detailPresentation;
  if (!presentation) {
    return (
      <div className="min-h-screen bg-background">
        <ListingNavbar />
        <main id="main-content" tabIndex={-1} className="outline-none">
          <div className="container py-fluid-xl text-center">
            <h2 className="mb-4 text-2xl font-semibold">Property temporarily unavailable</h2>
            <p className="mb-6 text-slate-500">
              This approved listing could not be prepared for public viewing. Your search remains
              available.
            </p>
            <Button variant="outline" onClick={handleUnavailableReturn}>
              Return to results
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const isFavorite = favorites.some(favorite => Number(favorite.propertyId) === propertyId);
  const isRentalListing = presentation.listingIntent === 'rent';
  const isCompared = isInComparison(propertyId);
  const description = property.description || '';
  const shouldTruncate = description.length > 360;
  const displayDescription =
    showFullDescription || !shouldTruncate ? description : `${description.slice(0, 360)}…`;
  const canonicalPath = buildPropertyUrl(propertyId, property.title);
  const canonicalUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${canonicalPath}` : canonicalPath;
  const breadcrumbItems = generateBreadcrumbs({
    listingType: property.listingType as SearchFilters['listingType'],
    province: property.province,
    city: property.city,
    suburb: property.suburb,
  });
  const displayLocationLabel = presentation.location.label;
  const propertyImages = images.filter((image): image is PropertyImageLike =>
    Boolean(
      (!image.mediaType || image.mediaType === 'image') &&
      ((typeof image.imageUrl === 'string' && image.imageUrl) ||
        (typeof image.url === 'string' && image.url)),
    ),
  );
  const propertyGalleryImages = propertyImages
    .map((image, index) => ({
      id: image.id ?? index,
      imageUrl: image.imageUrl || image.url || '',
      isPrimary: image.isPrimary,
      displayOrder: image.displayOrder,
    }))
    .filter(image => Boolean(image.imageUrl));
  const propertyImageUrls = propertyGalleryImages.map(image => image.imageUrl);
  const propertyMedia = media.filter((item): item is PublicPropertyMedia =>
    Boolean(item?.url && ['image', 'video', 'floorplan', 'pdf'].includes(item.mediaType)),
  );

  const publicIdentity = property.publicIdentity;
  const contactMode: PublicPropertySupplyIdentity['role'] | 'unknown' =
    publicIdentity?.role || 'unknown';
  const contactName = publicIdentity?.name || 'Listing representative';
  const contactOrganization = publicIdentity?.organizationName || null;
  const contactImage = publicIdentity?.avatarUrl || publicIdentity?.organizationLogoUrl || null;
  const whatsappNumber = String(publicIdentity?.whatsapp || publicIdentity?.phone || '').trim();
  const whatsappActionLabel =
    contactMode === 'agent' ? 'WhatsApp agent' : 'WhatsApp representative';
  const hasPrimaryContactAction = contactMode !== 'unknown';
  const contactRoleLabel =
    contactMode === 'developer'
      ? 'Developer representative'
      : contactMode === 'agent'
        ? 'Property practitioner'
        : contactMode === 'agency'
          ? 'Listing agency'
          : contactMode === 'platform'
            ? 'Property Listify operations'
            : null;
  const contactIntro =
    contactMode === 'developer'
      ? 'Your enquiry is routed to the approved team representing this development.'
      : contactMode === 'agency'
        ? 'Your enquiry is routed to the agency responsible for this listing.'
        : contactMode === 'platform'
          ? 'Property Listify has approved operational custody of enquiries for this property.'
          : 'Your enquiry is routed to the approved representative for this property.';
  const development = property.development;
  const developmentName = String(development?.name || '').trim();
  const developmentHref = developmentName
    ? development?.slug
      ? `/development/${development.slug}`
      : development?.id
        ? `/development/${development.id}`
        : null
    : null;
  const agentProfileHref =
    contactMode === 'agent'
      ? publicIdentity?.agentSlug
        ? `/agents/${publicIdentity.agentSlug}`
        : publicIdentity?.agentId
          ? `/agent/profile/${publicIdentity.agentId}`
          : null
      : null;

  const similarListingsQuery = new URLSearchParams();
  if (property.city) similarListingsQuery.set('city', String(property.city));
  if (property.suburb) similarListingsQuery.set('suburb', String(property.suburb));
  if (property.propertyType)
    similarListingsQuery.set('propertyType', String(property.propertyType));
  if (property.listingType) similarListingsQuery.set('listingType', String(property.listingType));
  const similarListingsHref = buildCanonicalSearchUrl(
    Object.fromEntries(similarListingsQuery.entries()),
  );
  const similarProperties = similarPropertiesData ?? [];

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
        // Returning to the canonical result root remains safe when referrer data is unavailable.
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
    setLocation(fallback);
  };

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
  const handleOpenStandardEnquiry = () => openContactModal();
  const handleRequestViewing = () =>
    openContactModal({
      initialMessage: `Hi, I'd like to request a viewing for ${property.title}. Please contact me to discuss a suitable time.`,
      requestType: 'viewing_request',
    });
  const handleWhatsAppContact = () =>
    openContactModal({
      initialMessage: `Hi, I'm interested in ${property.title}. Please share more information.`,
      intent: 'whatsapp',
    });
  const scrollToSection = (sectionId: string) =>
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const sectionNavItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'features', label: 'Features', enabled: presentation.featureGroups.length > 0 },
    {
      id: 'property-context',
      label: 'Property context',
      enabled: presentation.propertyContext.length > 0,
    },
    { id: 'location', label: 'Location' },
    { id: 'agent', label: 'Representative', enabled: contactMode !== 'unknown' },
    { id: 'floor-plans', label: 'Floor plans', enabled: presentation.media.floorPlanCount > 0 },
    { id: 'documents', label: 'Documents', enabled: presentation.media.documentCount > 0 },
  ].filter(item => item.enabled !== false);

  const propertyStructuredData = [
    buildBreadcrumbStructuredData([
      ...breadcrumbItems,
      { label: property.title || 'Property', href: canonicalPath },
    ]),
    buildPlaceStructuredData({
      name: property.title || 'Property',
      description:
        description.trim() ||
        [property.suburb, property.city, property.province].filter(Boolean).join(', '),
      url: canonicalUrl,
      images: propertyImageUrls,
      address: {
        // A public-area centroid is useful in the interface, but Schema.org
        // treats a Place geo value as an exact assertion. Do not publish it as
        // the home's geolocation unless the listing explicitly permits exact
        // public location.
        streetAddress:
          presentation.location.precision === 'exact' ? presentation.location.label : undefined,
        addressLocality: property.city,
        addressRegion: property.province,
        postalCode: presentation.location.precision === 'exact' ? property.zipCode : undefined,
        addressCountry: 'ZA',
      },
      geo:
        presentation.location.precision === 'exact'
          ? presentation.location.coordinates || undefined
          : undefined,
      additionalProperties: [
        property.propertyType
          ? { name: 'Property Type', value: String(property.propertyType) }
          : null,
        property.listingType ? { name: 'Listing Type', value: String(property.listingType) } : null,
        Number(property.price) > 0
          ? { name: 'Price', value: Number(property.price), unitText: 'ZAR' }
          : null,
      ].filter(Boolean) as Array<{ name: string; value: string | number; unitText?: string }>,
    }),
  ];

  return (
    <div className={cn('min-h-screen bg-slate-50', hasPrimaryContactAction && 'pb-24 lg:pb-0')}>
      <MetaControl
        canonicalUrl={canonicalUrl}
        title={
          property.title ? `${property.title} | Property Listify` : 'Property | Property Listify'
        }
        description={description || displayLocationLabel}
        image={propertyImageUrls[0]}
        structuredData={propertyStructuredData}
      />
      <ListingNavbar />

      <main id="main-content" tabIndex={-1} className="outline-none">
        <header className="border-b border-slate-200 bg-white pt-16">
          <div className="container py-5 sm:py-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-2 mb-1 text-slate-600 hover:text-blue-700"
                  onClick={handleReturnToResults}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to {isRentalListing ? 'rentals' : 'results'}
                </Button>
                <Breadcrumbs items={breadcrumbItems} />
              </div>
              {property.featured === 1 && (
                <Badge className="border border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                  Featured listing
                </Badge>
              )}
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <h1 className="max-w-4xl text-fluid-h2 font-bold tracking-tight text-slate-950">
                  {property.title}
                </h1>
                <div className="mt-2 flex items-center gap-2 text-slate-500">
                  <MapPin className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                  <span className="text-sm sm:text-base">{displayLocationLabel}</span>
                </div>
                {developmentName && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {developmentHref ? (
                      <Link href={developmentHref} className="hover:text-blue-700 hover:underline">
                        Part of {developmentName}
                      </Link>
                    ) : (
                      <span>Part of {developmentName}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFavoriteClick}
                  disabled={toggleFavoriteMutation.isPending}
                  aria-label={isFavorite ? 'Remove from saved homes' : 'Save property'}
                  aria-pressed={isFavorite}
                  className={cn(
                    'text-slate-600 hover:text-blue-700',
                    isFavorite && 'text-red-600 hover:text-red-700',
                  )}
                >
                  <Heart className="mr-1.5 h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsShareModalOpen(true)}
                  aria-label="Share property"
                  className="text-slate-600 hover:text-blue-700"
                >
                  <Share2 className="mr-1.5 h-4 w-4" />
                  Share
                </Button>
                {!isRentalListing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleComparison}
                    aria-label={isCompared ? 'Remove property from comparison' : 'Compare property'}
                    aria-pressed={isCompared}
                    className="text-slate-600 hover:text-blue-700"
                  >
                    <GitCompareArrows className="mr-1.5 h-4 w-4" />
                    {isCompared ? 'Compared' : 'Compare'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="container py-6 sm:py-8">
          <section
            ref={overviewSectionRef}
            id="overview"
            className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(340px,0.9fr)] lg:gap-8"
          >
            <div className="min-w-0">
              <PropertyImageGallery
                images={propertyGalleryImages}
                propertyTitle={property.title}
                videoCount={presentation.media.videoCount}
                hasVirtualTour={presentation.media.hasVirtualTour}
                hasFloorPlan={presentation.media.floorPlanCount > 0}
                onOpenVideos={() => scrollToSection('property-video')}
                onOpenVirtualTour={() => scrollToSection('virtual-tour')}
                onOpenFloorPlan={() => scrollToSection('floor-plans')}
              />
            </div>

            <aside
              aria-label={isRentalListing ? 'Rental decision summary' : 'Property decision summary'}
            >
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
                <div className="space-y-5 p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        {presentation.price.label}
                      </p>
                      <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                        {presentation.price.value}
                      </p>
                      {presentation.price.supportingText && (
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          {presentation.price.supportingText}
                        </p>
                      )}
                    </div>
                    <Badge className="shrink-0 border border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                      {isRentalListing ? 'To rent' : 'For sale'}
                    </Badge>
                  </div>

                  <DetailFactGrid facts={presentation.heroFacts} variant="hero" />

                  {presentation.buyerChecks.length > 0 && (
                    <section
                      className="border-t border-slate-200 pt-5"
                      aria-labelledby="buyer-checks-heading"
                    >
                      <div className="mb-4 flex items-end justify-between gap-3">
                        <h2
                          id="buyer-checks-heading"
                          className="text-sm font-extrabold text-slate-950"
                        >
                          Key buyer checks
                        </h2>
                        <p className="text-[10px] font-medium text-slate-500">
                          {presentation.buyerChecks.length} decision facts
                        </p>
                      </div>
                      <DetailFactGrid facts={presentation.buyerChecks} variant="checks" />
                    </section>
                  )}

                  {hasPrimaryContactAction && (
                    <div className="space-y-2 border-t border-slate-200 pt-5">
                      <div className="grid grid-cols-2 gap-2">
                        {whatsappNumber && (
                          <Button
                            variant="outline"
                            className="h-11 min-w-0 border-emerald-200 px-2 text-emerald-700 hover:bg-emerald-50"
                            onClick={handleWhatsAppContact}
                          >
                            <MessageCircle className="mr-1.5 h-4 w-4 shrink-0" />
                            <span className="truncate">{whatsappActionLabel}</span>
                          </Button>
                        )}
                        <Button
                          className={cn(
                            'h-11 min-w-0 bg-blue-600 px-2 font-semibold text-white hover:bg-blue-700',
                            !whatsappNumber && 'col-span-2',
                          )}
                          onClick={handleOpenStandardEnquiry}
                        >
                          Send enquiry
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        className="h-11 w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                        onClick={handleRequestViewing}
                      >
                        Request a viewing
                      </Button>
                      <p className="text-center text-[11px] leading-relaxed text-slate-500">
                        A viewing request is not a confirmed appointment. The representative can
                        contact you to arrange a suitable time.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </section>

          {isStickyNavVisible && (
            <div className="fixed inset-x-0 top-16 z-30 hidden px-4 lg:block">
              <nav
                className="container rounded-xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur"
                aria-label="Property sections"
              >
                <div className="flex items-center gap-1.5">
                  <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                    {sectionNavItems.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => scrollToSection(item.id)}
                        className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  {hasPrimaryContactAction && (
                    <div className="flex shrink-0 items-center gap-2 border-l border-slate-200 pl-3">
                      <span className="text-sm font-extrabold text-slate-950">
                        {presentation.price.value}
                      </span>
                      {whatsappNumber && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          onClick={handleWhatsAppContact}
                        >
                          <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                          WhatsApp
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={handleOpenStandardEnquiry}
                      >
                        Send enquiry
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-200 text-blue-700 hover:bg-blue-50"
                        onClick={handleRequestViewing}
                      >
                        Request viewing
                      </Button>
                    </div>
                  )}
                </div>
              </nav>
            </div>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-5">
              {description.trim() && (
                <section
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                  aria-labelledby="about-heading"
                >
                  <h2 id="about-heading" className="text-lg font-bold text-slate-950">
                    About this property
                  </h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
                    {displayDescription}
                  </p>
                  {shouldTruncate && (
                    <Button
                      variant="link"
                      className="mt-3 h-auto p-0 text-blue-700"
                      onClick={() => setShowFullDescription(value => !value)}
                    >
                      {showFullDescription ? 'Show less' : 'Show full description'}
                    </Button>
                  )}
                </section>
              )}

              {presentation.featureGroups.length > 0 && (
                <section
                  id="features"
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                  aria-labelledby="features-heading"
                >
                  <h2 id="features-heading" className="text-lg font-bold text-slate-950">
                    Spaces &amp; features
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Grouped around how the property is used, not a flat list of generic tags.
                  </p>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {presentation.featureGroups.map(group => (
                      <div
                        key={group.key}
                        className="min-w-0 border-l border-slate-200 pl-4 first:border-l-0 first:pl-0 sm:first:border-l sm:first:pl-4 xl:first:border-l-0 xl:first:pl-0"
                      >
                        <h3 className="text-sm font-bold text-slate-800">{group.title}</h3>
                        <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                          {group.items.map(item => (
                            <li key={item.key}>{item.label}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {presentation.propertyContext.length > 0 && (
                <section
                  id="property-context"
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                  aria-labelledby="context-heading"
                >
                  <h2 id="context-heading" className="text-lg font-bold text-slate-950">
                    Property context
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    What this property is, kept distinct from its lifestyle features.
                  </p>
                  <div className="mt-5">
                    <DetailFactGrid facts={presentation.propertyContext} variant="context" />
                  </div>
                </section>
              )}

              {presentation.runningCosts.length > 0 && (
                <section
                  id="property-costs"
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                  aria-labelledby="costs-heading"
                >
                  <h2 id="costs-heading" className="text-lg font-bold text-slate-950">
                    Property costs
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Confirmed recurring costs supplied with this listing.
                  </p>
                  <div className="mt-5">
                    <DetailFactGrid facts={presentation.runningCosts} variant="context" />
                  </div>
                </section>
              )}

              <PropertyMediaTypeSection media={propertyMedia} virtualTour={property.virtualTour} />

              {contactMode === 'developer' && property.developerBrand && (
                <DeveloperBrandSection brand={property.developerBrand as DeveloperBrandData} />
              )}

              <section id="location">
                <PropertyLocationOverview
                  location={presentation.location}
                  propertyTitle={property.title}
                />
              </section>
            </div>

            <aside id="agent" className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              {contactMode !== 'unknown' && (
                <section
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  aria-labelledby="listed-by-heading"
                >
                  <p
                    id="listed-by-heading"
                    className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500"
                  >
                    Listed by
                  </p>
                  <div className="mt-4 flex items-start gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-lg font-bold text-blue-700">
                      {contactImage ? (
                        <img
                          src={contactImage}
                          alt={contactName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        contactName.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-bold text-slate-950">{contactName}</h2>
                      {contactRoleLabel && (
                        <p className="mt-1 text-xs text-slate-500">{contactRoleLabel}</p>
                      )}
                      {contactOrganization && (
                        <p className="mt-1 text-xs font-medium text-slate-700">
                          {contactOrganization}
                        </p>
                      )}
                    </div>
                  </div>
                  {agentProfileHref && (
                    <Link
                      href={agentProfileHref}
                      className="mt-4 flex h-10 items-center justify-center rounded-lg border border-blue-200 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      View profile
                    </Link>
                  )}
                  {developmentHref && contactMode === 'developer' && (
                    <Link
                      href={developmentHref}
                      className="mt-4 flex h-10 items-center justify-between rounded-lg border border-blue-200 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      View development <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                </section>
              )}

              {hasPrimaryContactAction && (
                <section
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  aria-labelledby="contact-heading"
                >
                  <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                    <h2 id="contact-heading" className="text-base font-bold text-slate-950">
                      Contact the representative
                    </h2>
                    <p className="mt-1 text-sm leading-5 text-slate-500">{contactIntro}</p>
                  </div>
                  <div className="space-y-2 p-5">
                    <div className="grid grid-cols-2 gap-2">
                      {whatsappNumber && (
                        <Button
                          variant="outline"
                          className="h-11 min-w-0 border-emerald-200 px-2 text-emerald-700 hover:bg-emerald-50"
                          onClick={handleWhatsAppContact}
                        >
                          <MessageCircle className="mr-1.5 h-4 w-4 shrink-0" />
                          <span className="truncate">{whatsappActionLabel}</span>
                        </Button>
                      )}
                      <Button
                        className={cn(
                          'h-11 min-w-0 bg-blue-600 px-2 hover:bg-blue-700',
                          !whatsappNumber && 'col-span-2',
                        )}
                        onClick={handleOpenStandardEnquiry}
                      >
                        Send enquiry
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      className="h-11 w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={handleRequestViewing}
                    >
                      Request a viewing
                    </Button>
                  </div>
                </section>
              )}

              {contactOrganization && (
                <section
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  aria-label="Listing organization"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-blue-600" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-bold text-slate-900">{contactOrganization}</p>
                      <p className="text-xs text-slate-500">
                        Agency identity from the approved public listing.
                      </p>
                    </div>
                  </div>
                </section>
              )}
            </aside>
          </div>

          {similarProperties.length > 0 && (
            <section
              className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              aria-labelledby="related-heading"
            >
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 id="related-heading" className="text-lg font-bold text-slate-950">
                    {isRentalListing
                      ? `Explore more rentals in ${property.suburb || property.city}`
                      : `Still comparing? Explore more in ${property.suburb || property.city}`}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Relevant public alternatives keep the next discovery decision in the
                    marketplace.
                  </p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <Link href={similarListingsHref}>View all matching listings</Link>
                </Button>
              </div>
              <div className="flex snap-x gap-4 overflow-x-auto pb-2">
                {similarProperties.map(prop => {
                  const relatedPrice = Number(prop.price || 0);
                  const relatedFactCandidates: Array<RelatedPropertyFact | null> = [
                    Number(prop.bedrooms) > 0
                      ? { key: 'bedrooms', label: `${Number(prop.bedrooms)} bed`, Icon: BedDouble }
                      : null,
                    Number(prop.bathrooms) > 0
                      ? { key: 'bathrooms', label: `${Number(prop.bathrooms)} bath`, Icon: Bath }
                      : null,
                    Number(prop.internalAreaM2 ?? prop.area) > 0
                      ? {
                          key: 'floor-size',
                          label: `${Number(prop.internalAreaM2 ?? prop.area).toLocaleString('en-ZA')} m²`,
                          Icon: HouseMeasureIcon,
                        }
                      : null,
                  ];
                  const relatedFacts = relatedFactCandidates.filter(
                    (fact): fact is RelatedPropertyFact => Boolean(fact),
                  );
                  return (
                    <Link
                      key={prop.id}
                      href={prop.href}
                      aria-label={`Open ${prop.title}`}
                      className="group min-w-[250px] snap-start overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md sm:min-w-[280px]"
                    >
                      <div className="h-36 overflow-hidden bg-slate-100">
                        {prop.image || prop.images[0]?.url ? (
                          <img
                            src={prop.image || prop.images[0]?.url}
                            alt={prop.title}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            <Home className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-base font-extrabold text-slate-950">
                          {relatedPrice > 0
                            ? `${formatCurrency(relatedPrice)}${isRentalListing ? ' / month' : ''}`
                            : 'Price on request'}
                        </p>
                        <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-slate-800">
                          {prop.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {[prop.suburb, prop.city].filter(Boolean).join(', ')}
                        </p>
                        {relatedFacts.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-600">
                            {relatedFacts.map(({ key, label, Icon }) => (
                              <span key={key} className="inline-flex items-center gap-1.5">
                                <Icon className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                                {label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {hasPrimaryContactAction && (
          <aside
            aria-label="Property enquiry actions"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-12px_32px_rgba(15,23,42,0.12)] backdrop-blur-md lg:hidden"
          >
            <div
              className={cn(
                'mx-auto grid max-w-lg items-center gap-2',
                whatsappNumber ? 'grid-cols-3' : 'grid-cols-2',
              )}
            >
              {whatsappNumber && (
                <Button
                  variant="outline"
                  className="h-11 min-w-0 border-emerald-200 px-2 text-xs text-emerald-700 hover:bg-emerald-50"
                  onClick={handleWhatsAppContact}
                  aria-label={whatsappActionLabel}
                >
                  <MessageCircle className="mr-1 h-4 w-4 shrink-0" />
                  <span className="truncate">WhatsApp</span>
                </Button>
              )}
              <Button
                className="h-11 min-w-0 bg-blue-600 px-2 text-xs hover:bg-blue-700"
                onClick={handleOpenStandardEnquiry}
              >
                Enquire
              </Button>
              <Button
                variant="outline"
                className="h-11 min-w-0 border-blue-200 px-2 text-xs text-blue-700 hover:bg-blue-50"
                onClick={handleRequestViewing}
                aria-label="Request a viewing"
              >
                <CalendarDays className="mr-1 h-4 w-4 shrink-0" />{' '}
                <span className="truncate">Viewing</span>
              </Button>
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
        agentName={contactName}
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
            ? `Your enquiry has been saved and delivered to ${contactName}. WhatsApp will open only after authorized custody is confirmed.`
            : contactRequestType === 'viewing_request'
              ? `Your viewing request has been saved and delivered to ${contactName}. This is not a confirmed appointment; the representative can contact you to arrange a suitable time.`
              : `Your enquiry has been saved and delivered to ${contactName}.`
        }
        successAction={
          contactIntent === 'whatsapp' && whatsappNumber
            ? { type: 'whatsapp', phone: whatsappNumber, message: contactInitialMessage }
            : undefined
        }
      />
      <PropertyShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        propertyTitle={property.title}
        propertyUrl={typeof window !== 'undefined' ? window.location.href : canonicalUrl}
      />
      <footer className="mt-20 bg-slate-950 py-10 text-slate-300">
        <div className="container text-center text-sm">
          © {new Date().getFullYear()} Property Listify. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
