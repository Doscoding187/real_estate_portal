import React, { useState } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleCheckBig,
  Droplets,
  GitCompareArrows,
  Heart,
  House,
  Home,
  MapPin,
  MessageCircle,
  PawPrint,
  ReceiptText,
  Share2,
  ShieldCheck,
  SunMedium,
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
import { PROPERTY_FACT_ICONS } from '@/components/icons/propertyFactIcons';
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
import { PurchaseUnderstandingPanel } from '@/components/property/PurchaseUnderstandingPanel';
import { MarketInsightsPanel } from '@/components/property/MarketInsightsPanel';
import { PropertyAgentProfileCard } from '@/components/property/PropertyAgentProfileCard';
import { CanYouAffordPanel } from '@/components/property/CanYouAffordPanel';
import {
  DeveloperBrandSection,
  type DeveloperBrandData,
} from '@/components/property/DeveloperBrandSection';
import { MetaControl } from '@/components/seo/MetaControl';
import { buildBreadcrumbStructuredData, buildPlaceStructuredData } from '@/lib/seo/structuredData';
import { isCanonicalPlaceId } from '@shared/placeAuthority';
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
  canonicalPlaceId?: string | null;
  address?: string;
  publicAddress?: string | null;
  zipCode?: string;
  price?: number | string;
  propertyType?: string;
  bedrooms?: number | string;
  bathrooms?: number | string;
  internalAreaM2?: number | string;
  area?: number | string;
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

const detailIcons: Record<PublicPropertyDetailIcon, React.ElementType> = {
  area: PROPERTY_FACT_ICONS.residentialSize,
  floorSize: PROPERTY_FACT_ICONS.residentialSize,
  yardSize: PROPERTY_FACT_ICONS.landSize,
  landSize: PROPERTY_FACT_ICONS.landSize,
  bedrooms: PROPERTY_FACT_ICONS.bedrooms,
  bathrooms: PROPERTY_FACT_ICONS.bathrooms,
  parking: PROPERTY_FACT_ICONS.parking,
  property: House,
  electricity: Zap,
  water: Droplets,
  backupPower: SunMedium,
  sewerage: Waves,
  security: ShieldCheck,
  internet: Wifi,
  cost: ReceiptText,
  pets: PawPrint,
  calendar: CalendarDays,
  lease: ReceiptText,
  utilities: Zap,
  furnishing: Home,
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
  variant: 'hero' | 'checks' | 'context' | 'contextInline';
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
              <p
                className="truncate text-sm font-extrabold leading-tight text-slate-950"
                title={`${item.label}: ${item.value}`}
              >
                {item.compactValue || item.value}
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

  if (variant === 'contextInline') {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {facts.map(item => {
          const Icon = detailIcons[item.icon];
          return (
            <div
              key={item.key}
              title={`${item.label}: ${item.value}`}
              className="inline-flex min-w-0 items-center gap-1.5 border-r border-slate-200 pr-4 last:border-r-0 last:pr-0"
            >
              <Icon className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
              <span className="whitespace-nowrap text-xs text-slate-500">{item.label}</span>
              <span className={cn('whitespace-nowrap text-xs font-bold', textForStatus(item))}>
                {item.compactValue || item.value}
              </span>
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
  const [activeComparableIndex, setActiveComparableIndex] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [contactInitialMessage, setContactInitialMessage] = useState('');
  const [contactIntent, setContactIntent] = useState<'enquiry' | 'whatsapp'>('enquiry');
  const [contactRequestType, setContactRequestType] = useState<'enquiry' | 'viewing_request'>(
    'enquiry',
  );
  const [isStickyNavVisible, setIsStickyNavVisible] = useState(false);
  const overviewSectionRef = React.useRef<HTMLElement>(null);
  const recordedViewKeyRef = React.useRef<string | null>(null);

  const { data, error, isLoading, isFetching, refetch } = trpc.properties.getById.useQuery(
    { id: propertyId },
    { enabled: propertyId > 0 },
  );
  const publicIdentityForAgent = data?.property?.publicIdentity;
  const listedAgentId = Number(publicIdentityForAgent?.agentId || 0);
  const listedAgentSlug = String(publicIdentityForAgent?.agentSlug || '').trim();
  const listedAgentRouteQuery = trpc.agent.getPublicProfileRouteById.useQuery(
    { agentId: listedAgentId || 1 },
    {
      enabled: publicIdentityForAgent?.role === 'agent' && !listedAgentSlug && listedAgentId > 0,
      retry: false,
      staleTime: 300000,
    },
  );
  const resolvedAgentSlug = listedAgentSlug || listedAgentRouteQuery.data?.slug || '';
  const publicAgentProfileQuery = trpc.agent.getPublicProfileBySlug.useQuery(
    { slug: resolvedAgentSlug || 'not-found' },
    {
      enabled: publicIdentityForAgent?.role === 'agent' && Boolean(resolvedAgentSlug),
      retry: false,
      staleTime: 300000,
    },
  );
  const publicAgentInventoryQuery = trpc.agent.getPublicInventoryPageForAgent.useQuery(
    { slug: resolvedAgentSlug || 'not-found', limit: 6, sort: 'newest' },
    {
      enabled: publicIdentityForAgent?.role === 'agent' && Boolean(resolvedAgentSlug),
      retry: false,
      staleTime: 300000,
    },
  );
  const { data: favorites = [] } = trpc.properties.getFavorites.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: similarPropertiesData } = trpc.properties.getRelatedPublicInventory.useQuery(
    { propertyId },
    { enabled: propertyId > 0 && Boolean(data?.property) },
  );
  const detailPlaceId = isCanonicalPlaceId(data?.property?.canonicalPlaceId)
    ? data.property.canonicalPlaceId
    : '';
  const canonicalPlaceQuery = trpc.placeAuthority.resolveSearchPlace.useQuery(
    { placeId: detailPlaceId },
    { enabled: Boolean(detailPlaceId) },
  );
  // Market insights come from the listing's own place guide (null for places without one).
  const marketGuideQuery = trpc.placeAuthority.getPlaceGuide.useQuery(
    { canonicalPlaceId: detailPlaceId },
    { enabled: Boolean(detailPlaceId), retry: false, staleTime: 300000 },
  );

  const utils = trpc.useUtils();
  const setFavoriteMutation = trpc.properties.setFavorite.useMutation({
    onSuccess: result => {
      void utils.properties.getFavorites.invalidate();
      toast.success(
        result.saved ? 'Property saved to your homes.' : 'Property removed from saved homes.',
      );
    },
    onError: () => toast.error('Unable to update saved homes. Please try again.'),
  });
  const recordViewMutation = trpc.properties.recordView.useMutation();

  React.useEffect(() => {
    if (propertyId <= 0 || !data?.property) return;
    const viewKey = `${isAuthenticated ? 'authenticated' : 'guest'}:${propertyId}`;
    if (recordedViewKeyRef.current === viewKey) return;
    recordedViewKeyRef.current = viewKey;

    if (isAuthenticated) {
      recordViewMutation.mutate({ propertyId });
      return;
    }
    addViewedProperty(propertyId);
  }, [propertyId, isAuthenticated, data?.property, addViewedProperty, recordViewMutation.mutate]);

  React.useEffect(() => {
    let frameId: number | null = null;
    const updateStickyVisibility = () => {
      frameId = null;
      const overview = overviewSectionRef.current;
      const shouldShow = Boolean(overview) && (overview?.getBoundingClientRect().bottom || 0) <= 80;
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
    if (setFavoriteMutation.isPending) return;
    setFavoriteMutation.mutate({ propertyId, saved: !isFavorite });
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
  const enquiryLabel = isRentalListing ? 'Send rental enquiry' : 'Send enquiry';
  const isCompared = isInComparison(propertyId);
  const description = property.description || '';
  const shouldTruncate = description.length > 360;
  const displayDescription =
    showFullDescription || !shouldTruncate ? description : `${description.slice(0, 360)}…`;
  const canonicalPath = buildPropertyUrl(propertyId, property.title);
  const canonicalUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${canonicalPath}` : canonicalPath;
  const canonicalPlace = canonicalPlaceQuery.data;
  const canonicalPlaceLabel = canonicalPlace?.label;
  const marketGuide = marketGuideQuery.data ?? null;
  const displayAddress =
    presentation.location.precision === 'exact' && typeof property.publicAddress === 'string'
      ? property.publicAddress.trim()
      : '';
  const displayLocationLabel =
    displayAddress || canonicalPlaceLabel || 'Location available on enquiry';
  const displayLocation = { ...presentation.location, label: displayLocationLabel };
  const breadcrumbItems = generateBreadcrumbs(
    {
      listingType: property.listingType as SearchFilters['listingType'],
      canonicalPlaceId: property.canonicalPlaceId || undefined,
    },
    canonicalPlaceLabel,
  );
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

  const similarListingsHref = isCanonicalPlaceId(property.canonicalPlaceId)
    ? buildCanonicalSearchUrl({
        canonicalPlaceId: property.canonicalPlaceId,
        ...(property.propertyType ? { propertyType: String(property.propertyType) } : {}),
        ...(property.listingType ? { listingType: String(property.listingType) } : {}),
      })
    : null;
  const similarProperties = similarPropertiesData ?? [];
  const currentBedrooms = Number(property.bedrooms || 0);
  const currentBathrooms = Number(property.bathrooms || 0);
  const currentArea = Number(property.internalAreaM2 ?? property.area ?? 0);
  const currentPrice = Number(property.price || 0);
  const rankedSimilarProperties = [...similarProperties]
    .map((candidate, index) => {
      const candidatePrice = Number(candidate.price || 0);
      const candidateBedrooms = Number(candidate.bedrooms || 0);
      const candidateBathrooms = Number(candidate.bathrooms || 0);
      const candidateArea = Number(candidate.internalAreaM2 ?? candidate.area ?? 0);
      let score = index / 1000;
      if (currentPrice > 0 && candidatePrice > 0)
        score += Math.abs(Math.log(candidatePrice / currentPrice)) * 20;
      if (currentBedrooms > 0 && candidateBedrooms > 0)
        score += Math.abs(candidateBedrooms - currentBedrooms) * 24;
      if (currentBathrooms > 0 && candidateBathrooms > 0)
        score += Math.abs(candidateBathrooms - currentBathrooms) * 12;
      if (currentArea > 0 && candidateArea > 0)
        score += Math.abs(Math.log(candidateArea / currentArea)) * 18;
      return { property: candidate, score };
    })
    .sort((left, right) => left.score - right.score)
    .slice(0, 4)
    .map(({ property: candidate }) => candidate);
  const currentPerSquareMetre = currentArea > 0 && currentPrice > 0 ? currentPrice / currentArea : 0;
  const safeComparableIndex = Math.min(
    activeComparableIndex,
    Math.max(rankedSimilarProperties.length - 1, 0),
  );
  const activeComparable = rankedSimilarProperties[safeComparableIndex];
  const activeComparablePrice = Number(activeComparable?.price || 0);
  const activeComparableArea = Number(
    activeComparable?.internalAreaM2 ?? activeComparable?.area ?? 0,
  );
  const activeComparablePerSquareMetre =
    activeComparableArea > 0 && activeComparablePrice > 0
      ? activeComparablePrice / activeComparableArea
      : 0;
  const activePriceDifferencePercent =
    activeComparablePerSquareMetre > 0 && currentPerSquareMetre > 0
      ? Math.round((currentPerSquareMetre / activeComparablePerSquareMetre - 1) * 100)
      : null;
  const comparableAskingPrices = rankedSimilarProperties
    .map(candidate => Number(candidate.price || 0))
    .filter(value => value > 0);
  const averageComparableAskingPrice = comparableAskingPrices.length
    ? comparableAskingPrices.reduce((sum, value) => sum + value, 0) / comparableAskingPrices.length
    : 0;

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
  const handleOpenStandardEnquiry = () =>
    openContactModal(
      isRentalListing
        ? {
            initialMessage: `Hi, I'm interested in renting ${property.title}. Please share more information about this home.`,
          }
        : undefined,
    );
  const handleRequestViewing = () =>
    openContactModal({
      initialMessage: `Hi, I'd like to request a viewing for ${property.title}. Please contact me to discuss a suitable time.`,
      requestType: 'viewing_request',
    });
  const handleWhatsAppContact = () =>
    openContactModal({
      initialMessage: `Hi, I'm interested in ${isRentalListing ? `renting ${property.title}` : property.title}. Please share more information.`,
      intent: 'whatsapp',
    });
  const scrollToSection = (sectionId: string) =>
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const sectionNavItems = [
    { id: 'overview', label: 'Overview' },
    {
      id: 'property-essentials',
      label: 'Property essentials',
      enabled: isRentalListing && presentation.buyerChecks.length > 0,
    },
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
        description.trim() || canonicalPlaceLabel || undefined,
      url: canonicalUrl,
      images: propertyImageUrls,
      address: {
        // A public-area centroid is useful in the interface, but Schema.org
        // treats a Place geo value as an exact assertion. Do not publish it as
        // the home's geolocation unless the listing explicitly permits exact
        // public location.
        streetAddress: displayAddress || undefined,
        addressLocality: canonicalPlaceLabel,
        addressRegion: canonicalPlace?.provinceName,
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
                  disabled={setFavoriteMutation.isPending}
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
            className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.08)] lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,1fr)]"
          >
            <div className="min-w-0">
              <PropertyImageGallery
                images={propertyGalleryImages}
                propertyTitle={property.title}
                joinedToSummary
                overlayActions={
                  <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={event => {
                        event.stopPropagation();
                        handleFavoriteClick();
                      }}
                      aria-label={isFavorite ? 'Remove from saved homes' : 'Save property'}
                      aria-pressed={isFavorite}
                      className="h-8 min-w-0 rounded-full border border-white/25 bg-slate-950/75 px-2 text-xs text-white shadow-sm backdrop-blur hover:bg-slate-950/90 hover:text-white sm:px-2.5"
                    >
                      <Heart
                        className="mr-1 h-3.5 w-3.5 shrink-0"
                        fill={isFavorite ? 'currentColor' : 'none'}
                      />
                      <span className="max-[360px]:hidden">Save</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={event => {
                        event.stopPropagation();
                        setIsShareModalOpen(true);
                      }}
                      aria-label="Share property"
                      className="h-8 min-w-0 rounded-full border border-white/25 bg-slate-950/75 px-2 text-xs text-white shadow-sm backdrop-blur hover:bg-slate-950/90 hover:text-white sm:px-2.5"
                    >
                      <Share2 className="mr-1 h-3.5 w-3.5 shrink-0" />
                      <span className="max-[360px]:hidden">Share</span>
                    </Button>
                    {!isRentalListing && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={event => {
                          event.stopPropagation();
                          handleToggleComparison();
                        }}
                        aria-label={
                          isCompared ? 'Remove property from comparison' : 'Compare property'
                        }
                        aria-pressed={isCompared}
                        className="h-8 min-w-0 rounded-full border border-white/25 bg-slate-950/75 px-2 text-xs text-white shadow-sm backdrop-blur hover:bg-slate-950/90 hover:text-white sm:px-2.5"
                      >
                        <GitCompareArrows className="mr-1 h-3.5 w-3.5 shrink-0" />
                        <span className="max-[360px]:hidden">
                          {isCompared ? 'Compared' : 'Compare'}
                        </span>
                      </Button>
                    )}
                  </div>
                }
                videos={propertyMedia
                  .filter(item => item.mediaType === 'video')
                  .map(item => ({
                    id: item.id,
                    url: item.url,
                    label: item.presentationLabel,
                    thumbnailUrl: item.thumbnailUrl,
                    previewUrl: item.previewUrl,
                  }))}
                hasVirtualTour={presentation.media.hasVirtualTour}
                hasFloorPlan={presentation.media.floorPlanCount > 0}
                onOpenVirtualTour={() => scrollToSection('virtual-tour')}
                onOpenFloorPlan={() => scrollToSection('floor-plans')}
              />
            </div>

            <aside
              aria-label={isRentalListing ? 'Rental decision summary' : 'Property decision summary'}
              className="border-t border-slate-200 lg:border-l lg:border-t-0"
            >
              <div className="h-full bg-white">
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

                  {isRentalListing && presentation.rentalEssentials.length > 0 ? (
                    <section
                      className="border-t border-slate-200 pt-5"
                      aria-labelledby="rental-essentials-heading"
                    >
                      <div className="mb-4 flex items-end justify-between gap-3">
                        <h2
                          id="rental-essentials-heading"
                          className="text-sm font-extrabold text-slate-950"
                        >
                          Rental essentials
                        </h2>
                        <p className="text-[10px] font-medium text-slate-500">
                          {presentation.rentalEssentials.length} tenancy facts
                        </p>
                      </div>
                      <DetailFactGrid facts={presentation.rentalEssentials} variant="checks" />
                    </section>
                  ) : !isRentalListing && presentation.buyerChecks.length > 0 ? (
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
                  ) : null}

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
                        {!whatsappNumber && (
                          <Button
                            className="h-11 min-w-0 bg-blue-600 px-2 font-semibold text-white hover:bg-blue-700"
                            onClick={handleOpenStandardEnquiry}
                          >
                            {enquiryLabel}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          className="h-11 min-w-0 border-blue-200 px-2 text-blue-700 hover:bg-blue-50"
                          onClick={handleRequestViewing}
                        >
                          <CalendarDays className="mr-1.5 h-4 w-4 shrink-0" />
                          <span className="truncate">Request a viewing</span>
                        </Button>
                      </div>
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
                      {!whatsappNumber && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={handleOpenStandardEnquiry}
                        >
                          {enquiryLabel}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-200 text-blue-700 hover:bg-blue-50"
                        onClick={handleRequestViewing}
                      >
                        <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
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
              {!isRentalListing && (
                <PurchaseUnderstandingPanel
                  price={property.price}
                  runningCosts={presentation.runningCosts}
                />
              )}

              {!isRentalListing && (
                <CanYouAffordPanel
                  price={property.price}
                  runningCosts={presentation.runningCosts}
                  onShareWithAgent={message =>
                    openContactModal({
                      initialMessage: `${message} ${canonicalUrl}`,
                      intent: 'whatsapp',
                    })
                  }
                />
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
                    <DetailFactGrid facts={presentation.propertyContext} variant="contextInline" />
                  </div>
                </section>
              )}

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

              {isRentalListing && presentation.buyerChecks.length > 0 && (
                <section
                  id="property-essentials"
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                  aria-labelledby="property-essentials-heading"
                >
                  <h2 id="property-essentials-heading" className="text-lg font-bold text-slate-950">
                    Property essentials
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Services and policies supplied with this rental listing.
                  </p>
                  <div className="mt-5">
                    <DetailFactGrid facts={presentation.buyerChecks} variant="context" />
                  </div>
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
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {presentation.featureGroups.map(group => {
                      const groupIcons: Record<string, React.ElementType> = {
                        living: Home,
                        kitchen: House,
                        outdoor: SunMedium,
                        other: Building2,
                        resilience: Wifi,
                        security: ShieldCheck,
                        highlights: CircleCheckBig,
                      };
                      const GroupIcon = groupIcons[group.key] || Home;
                      return (
                        <article
                          key={group.key}
                          className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                              <GroupIcon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <h3 className="text-sm font-bold text-slate-800">{group.title}</h3>
                          </div>
                          <ul className="mt-3 space-y-2">
                            {group.items.map(item => (
                              <li
                                key={item.key}
                                className="flex items-start gap-2 text-sm text-slate-600"
                              >
                                <CircleCheckBig
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
                                  aria-hidden="true"
                                />
                                <span>{item.label}</span>
                              </li>
                            ))}
                          </ul>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              {!isRentalListing && detailPlaceId && (marketGuideQuery.isLoading || marketGuide) && (
                <MarketInsightsPanel
                  placeName={marketGuide?.place.name || canonicalPlaceLabel || 'this area'}
                  guide={marketGuide}
                  loading={marketGuideQuery.isLoading}
                />
              )}

              {contactMode === 'agent' && agentProfileHref && (
                <PropertyAgentProfileCard
                  href={agentProfileHref}
                  name={publicAgentProfileQuery.data?.displayName || contactName}
                  role={
                    publicAgentProfileQuery.data?.role === 'principal_agent'
                      ? 'Principal Property Practitioner'
                      : publicAgentProfileQuery.data?.role === 'broker'
                        ? 'Property Broker'
                        : contactRoleLabel || 'Property practitioner'
                  }
                  agency={publicAgentProfileQuery.data?.agency?.name || contactOrganization}
                  image={publicAgentProfileQuery.data?.profileImage || contactImage}
                  bio={publicAgentProfileQuery.data?.bio}
                  yearsExperience={publicAgentProfileQuery.data?.yearsExperience}
                  isVerified={publicAgentProfileQuery.data?.isVerified === 1}
                  activeListings={publicAgentInventoryQuery.data?.items.length}
                  listingsMayContinue={publicAgentInventoryQuery.data?.nextCursor != null}
                  listingsLoading={
                    listedAgentRouteQuery.isLoading || publicAgentInventoryQuery.isLoading
                  }
                />
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
                  location={displayLocation}
                  propertyTitle={property.title}
                />
              </section>

              {activeComparable && (
                <section
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                  aria-labelledby="related-heading"
                >
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 id="related-heading" className="text-lg font-bold text-slate-950">
                        {canonicalPlaceLabel
                          ? `How it compares in ${canonicalPlaceLabel}`
                          : 'How it compares nearby'}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Compare this home with the closest matching listing.
                      </p>
                    </div>
                    {similarListingsHref && (
                      <Button
                        asChild
                        variant="outline"
                        className="border-blue-200 text-blue-700 hover:bg-blue-50"
                      >
                        <Link href={similarListingsHref}>View all matching listings</Link>
                      </Button>
                    )}
                  </div>

                  <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
                    <PropertyComparisonCard
                      id={property.id}
                      title={
                        property.propertyType
                          ? `This ${property.propertyType.toLowerCase()}`
                          : 'This home'
                      }
                      image={propertyGalleryImages[0]?.imageUrl}
                      price={currentPrice}
                      bedrooms={currentBedrooms}
                      bathrooms={currentBathrooms}
                      area={currentArea}
                      isCurrent
                      isRental={isRentalListing}
                    />
                    <PropertyComparisonCard
                      key={activeComparable.id}
                      id={Number(activeComparable.id)}
                      href={activeComparable.href}
                      title={activeComparable.title}
                      image={activeComparable.image || activeComparable.images[0]?.url}
                      price={activeComparablePrice}
                      bedrooms={Number(activeComparable.bedrooms || 0)}
                      bathrooms={Number(activeComparable.bathrooms || 0)}
                      area={activeComparableArea}
                      isCurrent={false}
                      isRental={isRentalListing}
                    />

                    <article className="min-w-[210px] max-w-[230px] flex-1 snap-start rounded-xl border border-blue-100 bg-blue-50/70 p-3">
                      <h3 className="text-xs font-extrabold text-slate-900">
                        How this home stacks up
                      </h3>
                      <div className="mt-2 space-y-2 text-[11px]">
                        {!isRentalListing &&
                          currentPerSquareMetre > 0 &&
                          activeComparablePerSquareMetre > 0 && (
                            <div>
                              <p className="font-semibold text-slate-500">Price per m²</p>
                              <p className="mt-0.5 font-bold text-slate-900">
                                {formatCurrency(currentPerSquareMetre)} vs{' '}
                                {formatCurrency(activeComparablePerSquareMetre)}
                              </p>
                              {activePriceDifferencePercent !== null && (
                                <p
                                  className={`mt-0.5 font-semibold ${activePriceDifferencePercent <= 0 ? 'text-emerald-700' : 'text-orange-700'}`}
                                >
                                  {activePriceDifferencePercent === 0
                                    ? 'In line with this listing'
                                    : `${Math.abs(activePriceDifferencePercent)}% ${activePriceDifferencePercent < 0 ? 'lower' : 'higher'} per m²`}
                                </p>
                              )}
                            </div>
                          )}
                        {currentArea > 0 && activeComparableArea > 0 && (
                          <ComparisonFact
                            label="Size"
                            value={`${currentArea.toLocaleString('en-ZA')} vs ${activeComparableArea.toLocaleString('en-ZA')} m²`}
                          />
                        )}
                        {averageComparableAskingPrice > 0 && (
                          <div className="border-t border-blue-100 pt-2">
                            <p className="font-semibold text-slate-500">
                              Avg. asking price of similar listings
                            </p>
                            <p className="mt-0.5 font-extrabold text-slate-900">
                              {formatCurrency(averageComparableAskingPrice)}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              From {comparableAskingPrices.length} similar listings
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-1 border-t border-blue-100 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-blue-200 px-2 text-[11px] text-blue-700 hover:bg-white"
                          disabled={rankedSimilarProperties.length < 2}
                          onClick={() =>
                            setActiveComparableIndex(
                              index =>
                                (index - 1 + rankedSimilarProperties.length) %
                                rankedSimilarProperties.length,
                            )
                          }
                        >
                          <ArrowLeft className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Previous
                        </Button>
                        <span className="text-[10px] font-semibold text-slate-500">
                          {safeComparableIndex + 1}/{rankedSimilarProperties.length}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-blue-200 px-2 text-[11px] text-blue-700 hover:bg-white"
                          disabled={rankedSimilarProperties.length < 2}
                          onClick={() =>
                            setActiveComparableIndex(
                              index => (index + 1) % rankedSimilarProperties.length,
                            )
                          }
                        >
                          Next <ChevronRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </article>
                  </div>
                </section>
              )}
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
                    {whatsappNumber ? (
                      <Button
                        variant="outline"
                        className="h-11 w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        onClick={handleWhatsAppContact}
                      >
                        <MessageCircle className="mr-1.5 h-4 w-4 shrink-0" />
                        {whatsappActionLabel}
                      </Button>
                    ) : (
                      <Button
                        className="h-11 w-full bg-blue-600 hover:bg-blue-700"
                        onClick={handleOpenStandardEnquiry}
                      >
                        {enquiryLabel}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="h-11 w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={handleRequestViewing}
                    >
                      <CalendarDays className="mr-1.5 h-4 w-4 shrink-0" />
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

        </div>

        {hasPrimaryContactAction && isStickyNavVisible && (
          <aside
            aria-label="Property enquiry actions"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-12px_32px_rgba(15,23,42,0.12)] backdrop-blur-md lg:hidden"
          >
            <div className="mx-auto grid max-w-lg grid-cols-2 items-center gap-2">
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
              {!whatsappNumber && (
                <Button
                  className="h-11 min-w-0 bg-blue-600 px-2 text-xs hover:bg-blue-700"
                  onClick={handleOpenStandardEnquiry}
                >
                  Enquire
                </Button>
              )}
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
              : enquiryLabel
        }
        successMessage={
          contactIntent === 'whatsapp'
            ? `Your enquiry has been saved and delivered to ${contactName}. WhatsApp will open only after authorized custody is confirmed.`
            : contactRequestType === 'viewing_request'
              ? `Your viewing request has been saved and delivered to ${contactName}. This is not a confirmed appointment; the representative can contact you to arrange a suitable time.`
              : `Your ${isRentalListing ? 'rental ' : ''}enquiry has been saved and delivered to ${contactName}.`
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

function PropertyComparisonCard({
  id,
  href,
  title,
  image,
  price,
  bedrooms,
  bathrooms,
  area,
  isCurrent,
  isRental,
}: {
  id: number;
  href?: string;
  title: string;
  image?: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  isCurrent: boolean;
  isRental: boolean;
}) {
  const pricePerSquareMetre = price > 0 && area > 0 ? price / area : 0;
  const cardClassName = `group min-w-[210px] max-w-[230px] flex-1 snap-start overflow-hidden rounded-xl bg-white transition hover:-translate-y-0.5 hover:shadow-md ${
    isCurrent ? 'border-2 border-blue-600' : 'border border-slate-200 hover:border-blue-200'
  }`;
  const content = (
    <>
      <div className="relative h-28 overflow-hidden bg-slate-100">
        {image ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <Home className="h-6 w-6" aria-hidden="true" />
          </div>
        )}
        {isCurrent && (
          <span className="absolute bottom-2 left-2 rounded-full bg-blue-700 px-2.5 py-1 text-[10px] font-bold text-white">
            This home
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-1 text-xs font-bold text-slate-800">{title}</h3>
        <p className="mt-0.5 truncate text-base font-extrabold text-slate-950">
          {price > 0
            ? `${formatCurrency(price)}${isRental ? ' / month' : ''}`
            : 'Price on request'}
        </p>
        <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2 text-[11px]">
          {area > 0 && <ComparisonFact label="Size" value={`${area.toLocaleString('en-ZA')} m²`} />}
          {(bedrooms > 0 || bathrooms > 0) && (
            <ComparisonFact
              label="Beds · baths"
              value={`${bedrooms > 0 ? bedrooms : '—'} · ${bathrooms > 0 ? bathrooms : '—'}`}
            />
          )}
          {!isRental && pricePerSquareMetre > 0 && (
            <ComparisonFact label="Price per m²" value={formatCurrency(pricePerSquareMetre)} />
          )}
        </div>
      </div>
    </>
  );

  return isCurrent ? (
    <article className={cardClassName} aria-label="Current property comparison">
      {content}
    </article>
  ) : (
    <Link href={href || `/property/${id}`} aria-label={`Open ${title}`} className={cardClassName}>
      {content}
    </Link>
  );
}

function ComparisonFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2 text-slate-600">
      <span>{label}</span>
      <span className="shrink-0 text-right font-bold text-slate-900">{value}</span>
    </div>
  );
}
