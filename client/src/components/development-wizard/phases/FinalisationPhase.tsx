import React, { useMemo, useState } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { usePublisherContext } from '@/hooks/usePublisherContext';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Edit2,
  MapPin,
  Clock,
  Home,
  Layers,
  Image as ImageIcon,
  Upload,
  Share2,
  Calendar,
  Smartphone,
  Monitor,
  Maximize,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { HouseMeasureIcon } from '@/components/icons/HouseMeasureIcon';
import type { OwnershipType } from '@/types/wizardTypes';

type ParkingType = 'none' | 'open' | 'covered' | 'carport' | 'garage';

type UnitTypeV2 = {
  id?: string;
  name: string;
  description?: string;
  bedrooms: number;
  bathrooms: number;
  unitSize?: number;
  yardSize?: number;
  basePriceFrom: number;
  extras?: Array<{ price: number; [key: string]: any }>;
  monthlyRentFrom?: number;
  monthlyRentTo?: number;
  leaseTerm?: string;
  isFurnished?: boolean;
  depositRequired?: number;
  startingBid?: number;
  reservePrice?: number;
  auctionStartDate?: string;
  auctionEndDate?: string;
  auctionStatus?: 'scheduled' | 'active' | 'sold' | 'passed_in' | 'withdrawn';
  features?: {
    kitchen?: string[];
    bathroom?: string[];
    flooring?: string[];
    storage?: string[];
    climate?: string[];
    security?: string[];
    outdoor?: string[];
    other?: string[];
  };
  parkingType: ParkingType;
  parkingBays: number;
  totalUnits?: number;
  availableUnits?: number;
  isActive?: boolean;
  structuralType?: string;
  baseMedia?: any;
};

export function FinalisationPhase() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const { context: publisherContext } = usePublisherContext();
  const store = useDevelopmentWizard();
  const stepAmenitiesRaw = useDevelopmentWizard(
    state => state.stepData?.amenities_features?.amenities,
  );
  const developmentAmenitiesRaw = useDevelopmentWizard(state => state.developmentData?.amenities);
  const selectedAmenitiesRaw = useDevelopmentWizard(state => state.selectedAmenities);

  // Canonical data source (Phase 2I)
  const wizardData = store.getWizardData();
  const isRent = wizardData.transactionType === 'for_rent';
  const isAuction = wizardData.transactionType === 'auction';

  const normalizeAmenitiesPayload = (value: unknown): string[] | undefined => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
      } catch {
        // fall through to treat as plain string
      }
      return [trimmed];
    }
    if (typeof value === 'object') {
      const standard = Array.isArray((value as any).standard) ? (value as any).standard : [];
      const additional = Array.isArray((value as any).additional) ? (value as any).additional : [];
      const merged = [...standard, ...additional].filter(Boolean).map(String);
      return merged.length ? merged : undefined;
    }
    return undefined;
  };

  const stepAmenities = normalizeAmenitiesPayload(stepAmenitiesRaw);
  const developmentAmenities = normalizeAmenitiesPayload(developmentAmenitiesRaw);
  const selectedAmenities = normalizeAmenitiesPayload(selectedAmenitiesRaw);

  // Keep only UI-needed refs
  const {
    classification,
    listingIdentity,
    setPhase,
    reset,
    validateForPublish,
    residentialConfig,
  } = store;

  // Get editingId from store for edit mode detection
  const editingId = (store as any).editingId as number | undefined;

  const reviewAmenities = (() => {
    if (stepAmenities && stepAmenities.length > 0) return stepAmenities;
    if (editingId && developmentAmenities && developmentAmenities.length > 0)
      return developmentAmenities;
    if (selectedAmenities && selectedAmenities.length > 0) return selectedAmenities;
    return stepAmenities ?? developmentAmenities ?? selectedAmenities ?? [];
  })();

  const [showConfirmPublish, setShowConfirmPublish] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'desktop' | 'mobile'>('desktop');

  // Backend mutations
  const createDevelopment = trpc.developer.createDevelopment.useMutation();
  const updateDevelopment = trpc.developer.updateDevelopment.useMutation();
  const publishDevelopment = trpc.developer.publishDevelopment.useMutation();

  // Run validation
  const validationResult = validateForPublish();
  const errors = validationResult?.errors || [];
  const warnings: string[] = []; // Placeholder for future warnings support
  const canPublish = errors.length === 0;

  // Extract images from canonical media state (Phase 2I - Phase 2G canonical shape)
  const extractImages = (): { url: string; category?: string }[] => {
    const images: { url: string; category?: string }[] = [];

    // Hero image first (Phase 2G: heroImage is a string URL)
    const heroUrl = wizardData.heroImage as string | undefined;
    if (heroUrl) images.push({ url: heroUrl, category: 'hero' });

    // Then photos from canonical media (skip hero duplicates)
    const photos = (wizardData.media as any)?.photos ?? [];
    photos.forEach((p: { url: string; category?: string }) => {
      if (p?.url && p.url !== heroUrl) images.push({ url: p.url, category: p.category });
    });

    return images;
  };

  // Extract video URLs from canonical media
  const extractVideoUrls = (): string[] => {
    const videos = (wizardData.media as any)?.videos ?? [];
    return videos
      .map((v: string | { url: string }) => (typeof v === 'string' ? v : v.url))
      .filter(Boolean) as string[];
  };

  // Extract document/brochure URLs from canonical media
  const extractDocumentUrls = (): string[] => {
    const documents = (wizardData.media as any)?.documents ?? [];
    return documents
      .map((d: string | { url: string }) => (typeof d === 'string' ? d : d.url))
      .filter(Boolean) as string[];
  };

  // Helper to normalize strings for Zod (avoids null or empty string errors)
  const asOptionalString = (v: unknown): string | undefined => {
    if (typeof v !== 'string') return undefined;
    const s = v.trim();
    return s.length ? s : undefined;
  };

  const formatDate = (value?: string | Date) => {
    if (!value) return 'TBD';
    if (value instanceof Date) return value.toLocaleDateString();
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'TBD';
    return parsed.toLocaleDateString();
  };

  const normalizeOwnershipType = (value: unknown): OwnershipType | undefined => {
    if (Array.isArray(value)) {
      const first = value.find(v => typeof v === 'string' && v.trim().length > 0);
      return first as OwnershipType | undefined;
    }
    if (typeof value === 'string' && value.trim().length > 0) return value as OwnershipType;
    return undefined;
  };

  // ---------- V2 UNIT TYPES (KILL LEGACY FIELDS AT THE SOURCE) ----------
  const normalizeParkingType = (raw: any): ParkingType => {
    const s = String(raw ?? '')
      .trim()
      .toLowerCase();
    const allowed: ParkingType[] = ['none', 'open', 'covered', 'carport', 'garage'];
    if (allowed.includes(s as ParkingType)) return s as ParkingType;

    // Legacy mappings we’ve seen in your project
    if (s === '' || s === 'null' || s === 'undefined') return 'none';
    if (s === '1' || s === '2') return 'open';
    if (s === 'street') return 'open';
    return 'none';
  };

  const toInt = (v: any, fallback: number) => {
    const n = typeof v === 'number' ? v : Number(String(v ?? '').trim());
    if (!Number.isFinite(n)) return fallback;
    return Math.trunc(n);
  };

  const toNumber = (v: any, fallback: number) => {
    const n = typeof v === 'number' ? v : Number(String(v ?? '').trim());
    if (!Number.isFinite(n)) return fallback;
    return n;
  };

  const normalizeDateString = (value: any): string | undefined => {
    if (!value) return undefined;
    if (typeof value === 'string') return value;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
    return undefined;
  };

  const computeExtrasTotal = (extras: any): number => {
    if (!Array.isArray(extras)) return 0;
    return extras.reduce((sum, e) => {
      const p = toNumber(e?.price, 0);
      return sum + (p > 0 ? p : 0);
    }, 0);
  };

  const computeUnitTotalFrom = (u: any): number => {
    const base = toNumber(u?.basePriceFrom ?? u?.priceFrom, 0);
    const extrasTotal = computeExtrasTotal(u?.extras);
    const total = base + extrasTotal;
    return Number.isFinite(total) ? total : 0;
  };

  const getUnitRentFrom = (u: any): number => {
    return toNumber(u?.monthlyRentFrom ?? u?.monthlyRent ?? 0, 0);
  };

  const getUnitRentTo = (u: any): number => {
    const rentTo = toNumber(u?.monthlyRentTo ?? 0, 0);
    const rentFrom = getUnitRentFrom(u);
    return rentTo > 0 ? rentTo : rentFrom;
  };

  const normalizeUnitTypesV2 = (rawUnits: any[]): UnitTypeV2[] => {
    if (!Array.isArray(rawUnits)) return [];

    return rawUnits.map((u: any) => {
      const basePriceFrom = toNumber(u?.basePriceFrom ?? u?.priceFrom, 0);
      const monthlyRentFrom = toNumber(u?.monthlyRentFrom ?? u?.monthlyRent ?? 0, 0);
      const monthlyRentTo = toNumber(u?.monthlyRentTo ?? 0, 0);
      const startingBid = toNumber(u?.startingBid ?? 0, 0);
      const reservePrice = toNumber(u?.reservePrice ?? 0, 0);
      const auctionStartDate = normalizeDateString(u?.auctionStartDate);
      const auctionEndDate = normalizeDateString(u?.auctionEndDate);
      const auctionStatus = typeof u?.auctionStatus === 'string' ? u.auctionStatus : undefined;

      const parkingBays = Math.max(0, toInt(u?.parkingBays, 0));
      const parkingType = normalizeParkingType(u?.parkingType);

      const unitSizeSource = u?.unitSize ?? u?.floorSize ?? u?.unit_size ?? u?.size;
      const unitSize = unitSizeSource != null ? toInt(unitSizeSource, 0) : undefined;
      const yardSizeSource = u?.yardSize ?? u?.erfSize ?? u?.yard_size ?? u?.landSize;
      const yardSize = yardSizeSource != null ? toInt(yardSizeSource, 0) : undefined;

      const totalUnits = u?.totalUnits != null ? Math.max(0, toInt(u.totalUnits, 0)) : undefined;
      const availableUnits =
        u?.availableUnits != null ? Math.max(0, toInt(u.availableUnits, 0)) : undefined;

      const v2: UnitTypeV2 = {
        id: typeof u?.id === 'string' ? u.id : undefined,
        name: String(u?.name ?? '').trim() || 'Unnamed Unit',
        description: typeof u?.description === 'string' ? u.description : undefined,
        bedrooms: Math.max(0, toInt(u?.bedrooms, 0)),
        bathrooms: Math.max(0, toNumber(u?.bathrooms, 0)),
        unitSize: unitSize && unitSize > 0 ? unitSize : undefined,
        yardSize: yardSize && yardSize > 0 ? yardSize : undefined,
        basePriceFrom: basePriceFrom > 0 ? basePriceFrom : 0,
        extras: Array.isArray(u?.extras) ? u.extras : undefined,
        monthlyRentFrom: monthlyRentFrom > 0 ? monthlyRentFrom : undefined,
        monthlyRentTo: monthlyRentTo > 0 ? monthlyRentTo : undefined,
        leaseTerm: typeof u?.leaseTerm === 'string' ? u.leaseTerm : undefined,
        isFurnished: typeof u?.isFurnished === 'boolean' ? u.isFurnished : undefined,
        depositRequired: u?.depositRequired != null ? toNumber(u.depositRequired, 0) : undefined,
        startingBid: startingBid > 0 ? startingBid : undefined,
        reservePrice: reservePrice > 0 ? reservePrice : undefined,
        auctionStartDate,
        auctionEndDate,
        auctionStatus,
        features: typeof u?.features === 'object' && u?.features ? u.features : undefined,
        parkingType,
        parkingBays: parkingType === 'none' ? 0 : parkingBays,
        totalUnits,
        availableUnits,
        isActive: typeof u?.isActive === 'boolean' ? u.isActive : undefined,
        structuralType: u?.structuralType,
        baseMedia: u?.baseMedia,
      };

      return v2;
    });
  };

  const canonicalUnitTypesRaw = (wizardData.unitTypes ?? []) as any[];
  const isLand = wizardData.developmentType === 'land';

  const canonicalUnitTypesV2: UnitTypeV2[] = useMemo(() => {
    if (isLand) return [];
    return normalizeUnitTypesV2(canonicalUnitTypesRaw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLand, canonicalUnitTypesRaw]);

  const computedDevPriceFromTo = useMemo(() => {
    if (isLand)
      return {
        priceFrom: undefined as number | undefined,
        priceTo: undefined as number | undefined,
      };
    const totals = canonicalUnitTypesRaw.map(computeUnitTotalFrom).filter(n => n > 0);
    if (totals.length === 0) return { priceFrom: undefined, priceTo: undefined };
    return { priceFrom: Math.min(...totals), priceTo: Math.max(...totals) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLand, canonicalUnitTypesRaw]);

  const computedDevRentFromTo = useMemo(() => {
    if (isLand)
      return {
        monthlyRentFrom: undefined as number | undefined,
        monthlyRentTo: undefined as number | undefined,
      };
    const rentRanges = canonicalUnitTypesRaw
      .map(u => {
        const from = getUnitRentFrom(u);
        const to = getUnitRentTo(u);
        const resolvedFrom = from > 0 ? from : to;
        const resolvedTo = to > 0 ? to : from;
        return { from: resolvedFrom, to: resolvedTo };
      })
      .filter(r => r.from > 0 || r.to > 0);

    if (rentRanges.length === 0) return { monthlyRentFrom: undefined, monthlyRentTo: undefined };

    const mins = rentRanges.map(r => r.from).filter(n => n > 0);
    const maxs = rentRanges.map(r => r.to).filter(n => n > 0);

    return {
      monthlyRentFrom: mins.length ? Math.min(...mins) : undefined,
      monthlyRentTo: maxs.length ? Math.max(...maxs) : undefined,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLand, canonicalUnitTypesRaw]);

  const computedDevAuctionRange = useMemo(() => {
    if (isLand)
      return {
        auctionStartDate: undefined as Date | undefined,
        auctionEndDate: undefined as Date | undefined,
        startingBidFrom: undefined as number | undefined,
        reservePriceFrom: undefined as number | undefined,
      };

    const starts = canonicalUnitTypesRaw
      .map(u => (u?.auctionStartDate ? new Date(u.auctionStartDate) : null))
      .filter((d: Date | null) => d && !Number.isNaN(d.getTime())) as Date[];
    const ends = canonicalUnitTypesRaw
      .map(u => (u?.auctionEndDate ? new Date(u.auctionEndDate) : null))
      .filter((d: Date | null) => d && !Number.isNaN(d.getTime())) as Date[];
    const startingBids = canonicalUnitTypesRaw
      .map(u => Number(u?.startingBid ?? 0))
      .filter(n => Number.isFinite(n) && n > 0);
    const reservePrices = canonicalUnitTypesRaw
      .map(u => Number(u?.reservePrice ?? 0))
      .filter(n => Number.isFinite(n) && n > 0);

    return {
      auctionStartDate: starts.length
        ? new Date(Math.min(...starts.map(d => d.getTime())))
        : undefined,
      auctionEndDate: ends.length ? new Date(Math.max(...ends.map(d => d.getTime()))) : undefined,
      startingBidFrom: startingBids.length ? Math.min(...startingBids) : undefined,
      reservePriceFrom: reservePrices.length ? Math.min(...reservePrices) : undefined,
    };
  }, [isLand, canonicalUnitTypesRaw]);

  const handlePublish = async () => {
    const amenitiesPayload = reviewAmenities;

    // SECURITY: Warn if unit types are missing (Mass Deletion Prevention)
    if (!isLand && (wizardData.unitTypes ?? []).length === 0) {
      console.warn('[FinalisationPhase] No unit types in payload');
      const confirm = window.confirm(
        'WARNING: No unit types found in this submission.\n\nSaving now will DELETE ALL existing unit types.\n\nAre you sure you want to continue?',
      );
      if (!confirm) return;
    }

    if (isPublishing) return;
    setIsPublishing(true);

    try {
      const images = extractImages();
      const videos = extractVideoUrls();
      const brochures = extractDocumentUrls();

      // Build features array (includes config prefixes for hydration)
      const features: string[] = [];
      if (residentialConfig?.residentialType)
        features.push(`cfg:res_type:${residentialConfig.residentialType}`);
      residentialConfig?.communityTypes?.forEach(c => features.push(`cfg:comm_type:${c}`));

      // Map security features to config string
      (residentialConfig as { securityFeatures?: string[] })?.securityFeatures?.forEach(
        (s: string) => features.push(`cfg:sec_feat:${s}`),
      );

      if (isAuction && (wizardData as any).auctionType) {
        features.push(`cfg:auction_type:${(wizardData as any).auctionType}`);
      }

      if ((store as { landConfig?: { landType?: string } }).landConfig?.landType)
        features.push(
          `cfg:land_type:${(store as { landConfig: { landType: string } }).landConfig.landType}`,
        );
      (store as { landConfig?: { infrastructure?: string[] } }).landConfig?.infrastructure?.forEach(
        i => features.push(`cfg:infra:${i}`),
      );

      if (
        (store as { commercialConfig?: { commercialType?: string } }).commercialConfig
          ?.commercialType
      )
        features.push(
          `cfg:comm_use:${(store as { commercialConfig: { commercialType: string } }).commercialConfig.commercialType}`,
        );
      (store as { commercialConfig?: { features?: string[] } }).commercialConfig?.features?.forEach(
        f => features.push(`cfg:comm_feat:${f}`),
      );

      // Governance features from canonical wizardData
      if (wizardData.hasGoverningBody !== undefined) {
        features.push(`cfg:hoa:${wizardData.hasGoverningBody}`);
      }
      if ((wizardData as any).governanceType) {
        features.push(`cfg:governance_type:${(wizardData as any).governanceType}`);
      }

      // CONSTRUCT PAYLOAD (Canonical WizardData First)
      const payload: any = {
        // Identity
        name: wizardData.name ?? 'Untitled Development',
      };

      // DEBUG LOG FOR USER
      console.log('[EDIT SAVE] payload.unitTypes[0]:', canonicalUnitTypesV2?.[0]);

      const ownershipSource =
        Array.isArray((wizardData as any).ownershipTypes) &&
        (wizardData as any).ownershipTypes.length > 0
          ? (wizardData as any).ownershipTypes
          : ((wizardData as any).ownershipType ?? (store as any).developmentData?.ownershipType);

      Object.assign(payload, {
        tagline: (wizardData as any).tagline ?? wizardData.subtitle,
        subtitle: wizardData.subtitle ?? (wizardData as any).tagline,
        description: wizardData.description,
        developmentType: (wizardData.developmentType ?? 'residential') as any,
        transactionType: wizardData.transactionType,
        ownershipType: normalizeOwnershipType(ownershipSource),

        // Location
        address: wizardData.location?.address,
        city: wizardData.location?.city || 'Unknown',
        province: wizardData.location?.province || 'Unknown',
        suburb: wizardData.location?.suburb,
        postalCode: wizardData.location?.postalCode,
        latitude: wizardData.location?.latitude,
        longitude: wizardData.location?.longitude,

        // Financials (🔥 FIX: compute from basePriceFrom + extras; stop using legacy priceFrom/priceTo)
        priceFrom: isRent
          ? undefined
          : (computedDevPriceFromTo.priceFrom ?? (wizardData as any).priceFrom),
        priceTo: isRent
          ? undefined
          : (computedDevPriceFromTo.priceTo ?? (wizardData as any).priceTo),
        monthlyRentFrom: isRent
          ? (computedDevRentFromTo.monthlyRentFrom ?? (wizardData as any).monthlyRentFrom)
          : (wizardData as any).monthlyRentFrom,
        monthlyRentTo: isRent
          ? (computedDevRentFromTo.monthlyRentTo ?? (wizardData as any).monthlyRentTo)
          : (wizardData as any).monthlyRentTo,
        auctionStartDate: isAuction
          ? (computedDevAuctionRange.auctionStartDate?.toISOString() ??
            (wizardData as any).auctionStartDate)
          : (wizardData as any).auctionStartDate,
        auctionEndDate: isAuction
          ? (computedDevAuctionRange.auctionEndDate?.toISOString() ??
            (wizardData as any).auctionEndDate)
          : (wizardData as any).auctionEndDate,
        startingBidFrom: isAuction
          ? (computedDevAuctionRange.startingBidFrom ?? (wizardData as any).startingBidFrom)
          : (wizardData as any).startingBidFrom,
        reservePriceFrom: isAuction
          ? (computedDevAuctionRange.reservePriceFrom ?? (wizardData as any).reservePriceFrom)
          : (wizardData as any).reservePriceFrom,
        monthlyLevyFrom: (wizardData as any).monthlyLevyFrom ?? (wizardData as any).levyRange?.min,
        monthlyLevyTo: (wizardData as any).monthlyLevyTo ?? (wizardData as any).levyRange?.max,
        ratesFrom: (wizardData as any).ratesFrom ?? (wizardData as any).rightsAndTaxes?.min,
        ratesTo: (wizardData as any).ratesTo ?? (wizardData as any).rightsAndTaxes?.max,

        // Dates & Status
        completionDate: asOptionalString((wizardData as any).completionDate),
        launchDate: asOptionalString((wizardData as any).launchDate),
        status: wizardData.status as any,

        // Metrics
        totalUnits: (wizardData as any).totalUnits,
        availableUnits: (wizardData as any).availableUnits,
        totalDevelopmentArea: (wizardData as any).totalDevelopmentArea,

        // Stand/Floor Sizes (left as-is; backend can ignore)
        erfSizeFrom: (wizardData as any).erfSizeFrom,
        erfSizeTo: (wizardData as any).erfSizeTo,
        floorSizeFrom: (wizardData as any).floorSizeFrom,
        floorSizeTo: (wizardData as any).floorSizeTo,
        bedroomsFrom: (wizardData as any).bedroomsFrom,
        bedroomsTo: (wizardData as any).bedroomsTo,
        bathroomsFrom: (wizardData as any).bathroomsFrom,
        bathroomsTo: (wizardData as any).bathroomsTo,

        // Features (Booleans)
        petsAllowed: (wizardData as any).petsAllowed,
        fibreReady: (wizardData as any).fibreReady,
        solarReady: (wizardData as any).solarReady,
        waterBackup: (wizardData as any).waterBackup,
        backupPower: (wizardData as any).backupPower,
        gatedCommunity: (wizardData as any).gatedCommunity,
        featured: (wizardData as any).featured,
        isPhasedDevelopment: (wizardData as any).isPhasedDevelopment,

        // Collections
        amenities: amenitiesPayload,
        features,
        highlights: wizardData.highlights ?? [],

        // ✅ FIX: Send ONLY V2 unit types to server (kills legacy leaks)
        unitTypes: canonicalUnitTypesV2,

        // Config Objects (Preserved as JSON)
        estateSpecs:
          (wizardData as any).hasGoverningBody !== undefined || (wizardData as any).governanceType
            ? {
                hasHOA: (wizardData as any).hasGoverningBody,
                governanceType: (wizardData as any).governanceType,
                architecturalGuidelines: (wizardData as any).architecturalGuidelines,
                guidelinesSummary: (wizardData as any).guidelinesSummary,
                levyRange: {
                  min:
                    (wizardData as any).monthlyLevyFrom ?? (wizardData as any).levyRange?.min ?? 0,
                  max: (wizardData as any).monthlyLevyTo ?? (wizardData as any).levyRange?.max ?? 0,
                },
                rightsAndTaxes: {
                  min:
                    (wizardData as any).ratesFrom ?? (wizardData as any).rightsAndTaxes?.min ?? 0,
                  max: (wizardData as any).ratesTo ?? (wizardData as any).rightsAndTaxes?.max ?? 0,
                },
              }
            : undefined,
        residentialConfig: residentialConfig as any,
        landConfig: (store as any).landConfig,
        commercialConfig: (store as any).commercialConfig,
        mixedUseConfig: (store as any).mixedUseConfig,
        specifications: (store as any).specifications,

        // Media
        images: images as any,
        videos,
        brochures,
        media: {
          photos: images,
          videos: videos.map(url => ({ url })),
          brochures: brochures.map(url => ({ url })),
        } as any,

        // SEO
        metaTitle: (wizardData as any).overview?.metaTitle,
        metaDescription: (wizardData as any).overview?.metaDescription,
        keywords: (wizardData as any).overview?.keywords,
      });

      console.log('[FinalisationPhase] Payload Preview:', payload);

      let developmentId: number;

      if (editingId) {
        // UPDATE OPERATION
        console.log('[FinalisationPhase] Executing UPDATE for ID:', editingId);
        await updateDevelopment.mutateAsync({
          id: editingId,
          data: payload,
        });
        developmentId = editingId;
        toast.success('Development saved successfully!');
      } else {
        // CREATE OPERATION
        console.log('[FinalisationPhase] Executing CREATE');

        // Determine if using super admin flow (publisher context) or regular developer endpoint
        const shouldUseSuperAdminFlow = isSuperAdmin && publisherContext?.brandProfileId;

        if (shouldUseSuperAdminFlow) {
          // SUPER ADMIN WITH PUBLISHER CONTEXT: modify payload for brand context and use regular endpoint
          console.log(
            '[FinalisationPhase] Using Super Admin flow with publisher context:',
            publisherContext.brandProfileId,
          );

          const superAdminPayload = {
            ...payload,
            // Ensure brandProfileId is set from publisher context
            brandProfileId: publisherContext.brandProfileId,
            developerBrandProfileId: publisherContext.brandProfileId,
            devOwnerType: 'platform',
          };

          const result = await createDevelopment.mutateAsync(superAdminPayload);
          developmentId = result.development.id;
        } else {
          // REGULAR FLOW: use existing developer endpoint
          console.log('[FinalisationPhase] Using regular developer endpoint');

          // Identity & Branding logic
          const isBrandDevelopment =
            listingIdentity?.identityType === 'brand' ||
            listingIdentity?.identityType === 'marketing_agency';

          const createPayload = {
            ...payload,
            // Identity & Branding
            brandProfileId: isBrandDevelopment
              ? listingIdentity?.developerBrandProfileId
              : undefined,
            marketingBrandProfileId:
              listingIdentity?.identityType === 'marketing_agency'
                ? listingIdentity.marketingBrandProfileId
                : undefined,
            marketingRole: listingIdentity?.marketingRole || 'exclusive',
          };

          const result = await createDevelopment.mutateAsync(createPayload);
          developmentId = result.development.id;
        }
      }

      // Now publish (submit for review)
      console.log('[FinalisationPhase] Publishing development:', developmentId);
      await publishDevelopment.mutateAsync({ id: developmentId });

      setShowConfirmPublish(false);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      toast.success('Development submitted for review!');

      reset();
      navigate(isSuperAdmin ? '/admin/overview' : '/developer/developments');
    } catch (error: any) {
      console.error('[FinalisationPhase] Publish failed:', error);

      const cause = error?.data?.cause ?? error?.shape?.data?.cause;

      const validationErrors = cause?.validationErrors;
      const legacyErrors = cause?.errors;
      const primaryMessage = error?.message || 'Failed to publish development';

      const focusField = (fieldKey: string) => {
        const base = fieldKey.split('[')[0];
        const root = base.split('.')[0];

        const fieldToPhase: Record<string, number> = {
          name: 4,
          developmentName: 4,
          nature: 4,
          status: 4,
          ownershipType: 4,
          transactionType: 4,

          address: 5,
          city: 5,
          province: 5,
          suburb: 5,
          postalCode: 5,
          latitude: 5,
          longitude: 5,
          location: 5,
          'location.address': 5,
          'location.city': 5,
          'location.province': 5,

          media: 9,
          images: 9,
          heroImage: 9,
          'media.heroImage': 9,
          'media.heroImage.url': 9,

          unitTypes: 10,
          parkingType: 10,
          parkingBays: 10,
          bedrooms: 10,
          bathrooms: 10,
          basePriceFrom: 10,
        };

        const targetPhase = fieldToPhase[fieldKey] ?? fieldToPhase[base] ?? fieldToPhase[root];

        if (targetPhase) setPhase(targetPhase);

        setTimeout(() => {
          const el =
            document.querySelector(`[data-field="${fieldKey}"]`) ||
            document.querySelector(`[data-field="${base}"]`) ||
            document.querySelector(`[name="${fieldKey}"]`) ||
            document.querySelector(`[name="${base}"]`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (el as HTMLElement | null)?.focus?.();
        }, 250);
      };

      if (Array.isArray(validationErrors) && validationErrors.length > 0) {
        toast.error(
          <div className="max-w-md">
            <p className="font-semibold mb-2">Cannot publish development:</p>
            <ul className="space-y-1 text-sm">
              {validationErrors.map((err: { field: string; message: string }, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{err.message}</span>
                </li>
              ))}
            </ul>
          </div>,
          { duration: 10000 },
        );

        if (validationErrors[0]?.field) focusField(validationErrors[0].field);
        return;
      }

      if (Array.isArray(legacyErrors) && legacyErrors.length > 0) {
        toast.error(
          <div className="max-w-md">
            <p className="font-semibold mb-2">Cannot publish development:</p>
            <ul className="space-y-1 text-sm">
              {legacyErrors.map((msg: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{msg}</span>
                </li>
              ))}
            </ul>
          </div>,
          { duration: 10000 },
        );
        return;
      }

      toast.error(primaryMessage, {
        description: 'Please check your connection and try again.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Render Section Helper
  const ReviewSection = ({
    title,
    icon: Icon,
    step: _step,
    data,
    onEdit,
  }: {
    title: string;
    icon: any;
    step: number;
    data: React.ReactNode;
    onEdit: () => void;
  }) => (
    <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
      <div className="bg-slate-50 px-4 py-3 flex justify-between items-center border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-500" />
          <h3 className="font-semibold text-sm text-slate-800">{title}</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Edit2 className="w-3 h-3 mr-1" /> Edit
        </Button>
      </div>
      <div className="p-4 text-sm text-slate-600">{data}</div>
    </div>
  );

  const renderUnitPriceLabel = (u: any) => {
    if (isRent) {
      const rentFrom = getUnitRentFrom(u);
      const rentTo = getUnitRentTo(u);
      const value = rentFrom > 0 ? rentFrom : rentTo;
      if (!value || value <= 0) return '---';
      return value.toLocaleString();
    }
    if (isAuction) {
      const startingBid = Number(u?.startingBid ?? 0);
      if (!startingBid || startingBid <= 0) return '---';
      return `${startingBid.toLocaleString()} (starting bid)`;
    }
    const total = computeUnitTotalFrom(u);
    if (!total || total <= 0) return '---';
    return total.toLocaleString();
  };

  const renderUnitSizeLabel = (u: any) => {
    const unitSize = toInt(u?.unitSize, 0);
    if (unitSize > 0) return `${unitSize}m²`;
    return '—';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Review & Publish</h2>
        <p className="text-slate-600">Finalize your listing details before going live.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Col: Validation & Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Validation Dashboard */}
          <Card className={!canPublish ? 'border-red-200 shadow-sm' : 'border-green-200 shadow-sm'}>
            <CardHeader className={!canPublish ? 'bg-red-50/50 pb-4' : 'bg-green-50/50 pb-4'}>
              <div className="flex items-start gap-4">
                <div
                  className={
                    !canPublish
                      ? 'p-2 bg-red-100 rounded-full text-red-600'
                      : 'p-2 bg-green-100 rounded-full text-green-600'
                  }
                >
                  {!canPublish ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <CardTitle className={!canPublish ? 'text-red-900' : 'text-green-900'}>
                    {!canPublish ? 'Action Required' : 'Ready to Publish'}
                  </CardTitle>
                  <CardDescription className={!canPublish ? 'text-red-700' : 'text-green-700'}>
                    {!canPublish
                      ? `Please resolve ${errors.length} error${errors.length > 1 ? 's' : ''} to continue.`
                      : 'All required fields are complete. You can schedule or publish now.'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            {(!canPublish || warnings.length > 0) && (
              <CardContent className="pt-4 space-y-3">
                {errors.map((err, idx) => (
                  <Alert key={`err-${idx}`} variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Missing Requirement</AlertTitle>
                    <AlertDescription>{err}</AlertDescription>
                  </Alert>
                ))}
                {warnings.map((warn: string, idx: number) => (
                  <Alert
                    key={`warn-${idx}`}
                    className="bg-amber-50 border-amber-200 text-amber-800"
                  >
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-900">Recommendation</AlertTitle>
                    <AlertDescription>{warn}</AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            )}
          </Card>

          {/* Detailed Summary */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Listing Details</h3>

            <ReviewSection
              title="Identity & Type"
              icon={Home}
              step={1}
              onEdit={() => setPhase(1)}
              data={
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs uppercase text-slate-400 font-semibold tracking-wider">
                      Name
                    </span>
                    <span className="font-medium text-slate-900">
                      {wizardData.name || 'Untitled'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase text-slate-400 font-semibold tracking-wider">
                      Type
                    </span>
                    <span className="font-medium text-slate-900 capitalize">
                      {classification?.type?.replace('_', ' ')} •{' '}
                      {(wizardData as any).ownershipType || 'N/A'}
                    </span>
                  </div>
                </div>
              }
            />

            <ReviewSection
              title="Location"
              icon={MapPin}
              step={2}
              onEdit={() => setPhase(5)}
              data={
                <div>
                  <span className="block text-xs uppercase text-slate-400 font-semibold tracking-wider">
                    Address
                  </span>
                  <span className="font-medium text-slate-900">
                    {wizardData.location?.address || 'Address not set'}
                  </span>
                  <div className="mt-2 h-24 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-xs text-slate-400">
                    Map Preview
                  </div>
                </div>
              }
            />

            <ReviewSection
              title="Amenities & Features"
              icon={Share2}
              step={6}
              onEdit={() => setPhase(7)}
              data={
                <div className="flex flex-wrap gap-2">
                  {reviewAmenities.map((a: string) => (
                    <Badge key={a} variant="secondary" className="bg-slate-100 text-slate-700">
                      {a}
                    </Badge>
                  ))}
                  {reviewAmenities.length === 0 && (
                    <span className="text-slate-400 italic">No amenities selected</span>
                  )}
                </div>
              }
            />

            <ReviewSection
              title="Marketing & Media"
              icon={ImageIcon}
              step={8}
              onEdit={() => setPhase(9)}
              data={
                <div className="space-y-3">
                  <p className="line-clamp-2 italic text-slate-500">
                    "{wizardData.description || 'No description provided'}"
                  </p>
                  <div className="flex gap-4 text-xs font-medium text-slate-700 border-t pt-2">
                    <span>{wizardData.heroImage ? '✅ Hero Image' : '❌ No Hero'}</span>
                    <span>{(wizardData.media as any)?.photos?.length || 0} Photos</span>
                    <span>{(wizardData.media as any)?.videos?.length || 0} Videos</span>
                    <span>{(wizardData.media as any)?.documents?.length || 0} Docs</span>
                  </div>

                  {((wizardData as any).transferCostsIncluded ||
                    (wizardData as any).reservePriceIncluded) && (
                    <div className="flex gap-2 mt-2 pt-2 border-t">
                      {(wizardData as any).transferCostsIncluded && (
                        <Badge
                          variant="outline"
                          className="text-emerald-700 bg-emerald-50 border-emerald-200"
                        >
                          Transfer Costs Included
                        </Badge>
                      )}
                      {(wizardData as any).reservePriceIncluded && (
                        <Badge
                          variant="outline"
                          className="text-amber-700 bg-amber-50 border-amber-200"
                        >
                          Reserve: R{' '}
                          {(wizardData as any).reservePriceAmount?.toLocaleString() || '---'}
                        </Badge>
                      )}
                    </div>
                  )}

                  {wizardData.highlights && wizardData.highlights.length > 0 && (
                    <div className="pt-3 mt-3 border-t border-slate-100">
                      <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider block mb-2">
                        Key Selling Points
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {wizardData.highlights.map((h: string, i: number) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-[10px] font-normal px-2 py-0.5 bg-slate-100 text-slate-600 border-slate-200"
                          >
                            {h}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              }
            />

            <ReviewSection
              title="Unit Configuration"
              icon={Layers}
              step={9}
              onEdit={() => setPhase(10)}
              data={
                <div className="space-y-2">
                  {(wizardData.unitTypes ?? []).length === 0 ? (
                    <span className="text-red-500 italic">No unit types defined</span>
                  ) : (
                    (wizardData.unitTypes ?? []).map((u: any) => (
                      <div
                        key={u.id}
                        className="flex justify-between items-center bg-slate-50 p-2 rounded"
                      >
                        <span className="font-medium">{u.name}</span>
                        <div className="flex gap-3 text-xs text-slate-500">
                          <span>{u.bedrooms} Bed</span>
                          <span>{u.bathrooms} Bath</span>
                          <span>
                            R {renderUnitPriceLabel(u)}
                            {isRent ? ' / month' : ''}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              (toInt(u?.availableUnits, 0) ?? 0) > 0
                                ? 'text-green-600 border-green-200'
                                : 'text-red-600 border-red-200'
                            }
                          >
                            {toInt(u?.availableUnits, 0)} Avail
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              }
            />
          </div>
        </div>

        {/* Right Col: Preview & Actions */}
        <div className="space-y-6">
          {/* Control Panel */}
          <Card className="sticky top-6 border-slate-200 shadow-md">
            <CardHeader className="bg-slate-50 border-b pb-4">
              <CardTitle className="text-lg">Publishing Controls</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="w-full text-xs">
                  <Calendar className="w-3.5 h-3.5 mr-2" /> Schedule
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => toast.success('Draft saved')}
                >
                  Save Draft
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <Button
                  className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                  disabled={!canPublish}
                  onClick={() => setShowConfirmPublish(true)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Publish Listing
                </Button>
                {!canPublish && (
                  <p className="text-xs text-center text-red-500">
                    Resolve validation errors to publish.
                  </p>
                )}
                <p className="text-xs text-center text-slate-400">
                  By publishing, you agree to our listing terms.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preview Widget */}
          <Card>
            <CardHeader className="pb-2 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium uppercase tracking-wide text-slate-500">
                  Live Preview Mode
                </CardTitle>
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setActivePreviewTab('desktop')}
                    className={`p-1.5 rounded ${
                      activePreviewTab === 'desktop'
                        ? 'bg-white shadow-sm text-blue-600'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActivePreviewTab('mobile')}
                    className={`p-1.5 rounded ${
                      activePreviewTab === 'mobile'
                        ? 'bg-white shadow-sm text-blue-600'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div
                className={`mx-auto bg-slate-100 overflow-hidden transition-all duration-300 ${
                  activePreviewTab === 'mobile'
                    ? 'w-[280px] h-[500px] my-4 rounded-[2rem] border-4 border-slate-800 shadow-xl'
                    : 'w-full h-[400px]'
                }`}
              >
                <div className="bg-white w-full h-full flex flex-col overflow-y-auto">
                  <div className="h-1/3 bg-slate-200 relative">
                    {wizardData.heroImage ? (
                      <img
                        src={wizardData.heroImage as string}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400">
                        <ImageIcon />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                      <h1 className="text-white font-bold text-sm leading-tight">
                        {wizardData.name || 'Development Name'}
                      </h1>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-slate-700 uppercase">
                        From R {renderUnitPriceLabel((wizardData.unitTypes ?? [])[0])}
                        {isRent ? ' / month' : ''}
                      </h3>
                      <p className="text-[10px] text-slate-500 line-clamp-2">
                        {wizardData.description || 'Description...'}
                      </p>
                    </div>

                    {isAuction && (
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-2 text-[10px] text-amber-800">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span className="font-medium text-amber-900">
                            Auction: {formatDate(computedDevAuctionRange.auctionStartDate)} -{' '}
                            {formatDate(computedDevAuctionRange.auctionEndDate)}
                          </span>
                        </div>
                        <p className="text-[10px] text-amber-700 mt-1">
                          Starting from R
                          {computedDevAuctionRange.startingBidFrom
                            ? computedDevAuctionRange.startingBidFrom.toLocaleString()
                            : '---'}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      {(wizardData.unitTypes ?? []).slice(0, 2).map((u: any) => (
                        <div key={u.id} className="bg-slate-50 p-2 rounded border border-slate-100">
                          <div className="text-[10px] font-bold">{u.name}</div>
                          <div className="text-[9px] text-slate-500 flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              {u.bedrooms} Bed &bull; <HouseMeasureIcon className="w-3 h-3" />{' '}
                              {renderUnitSizeLabel(u)}
                            </span>
                            {u.yardSize && u.yardSize > 0 && (
                              <span className="text-green-600 flex items-center gap-0.5">
                                <Maximize className="w-2 h-2" /> {u.yardSize}m²
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmPublish} onOpenChange={setShowConfirmPublish}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Publication</DialogTitle>
            <DialogDescription>
              You are about to make <strong>{wizardData.name}</strong> live to the public. This will
              activate search indexing and notifications.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert className="bg-blue-50 border-blue-200 text-blue-800">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <AlertTitle className="text-blue-900">Passed Validation</AlertTitle>
              <AlertDescription>Your listing meets 100% of the quality standards.</AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmPublish(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isPublishing ? 'Publishing...' : 'Confirm & Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
