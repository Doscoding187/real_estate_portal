import { useLocation, useParams } from 'wouter';
import { useEffect, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ListingNavbar } from '@/components/ListingNavbar';
import { MediaLightbox } from '@/components/MediaLightbox';
import { DevelopmentGallery } from '@/components/DevelopmentGallery';
import { DeveloperOverview } from '@/components/development/DeveloperOverview';
import { DevelopmentLeadDialog } from '@/components/development/DevelopmentLeadDialog';
import { StatCard } from '@/components/development/StatCard';
import { SectionNav } from '@/components/development/SectionNav';
import { DevelopmentOverviewCard } from '@/components/DevelopmentOverviewCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import {
  Building2,
  Home,
  Check,
  Download,
  Mail,
  Maximize,
  Loader2,
  Award,
  Globe,
  Briefcase,
  ArrowUpRight,
  Layers,
  Zap,
  Shield,
  Dumbbell,
  Leaf,
  Settings,
  Baby,
  LayoutGrid,
  Droplets,
  Wifi,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { NearbyLandmarks } from '@/components/property/NearbyLandmarks';
import { SuburbInsights } from '@/components/property/SuburbInsights';
import { LocalityGuide } from '@/components/property/LocalityGuide';
import { MetaControl } from '@/components/seo/MetaControl';
import { Breadcrumbs } from '@/components/search/Breadcrumbs';
import { Footer } from '@/components/Footer';
import { HouseMeasureIcon } from '@/components/icons/HouseMeasureIcon';
import {
  AMENITY_CATEGORIES,
  AMENITY_REGISTRY,
  type AmenityCategory,
} from '@/config/amenityRegistry';
import {
  getDevelopmentHeroMedia,
  buildDevelopmentGalleryImages,
  getGalleryStartIndex,
  getDevelopmentAmenityTileImage,
  getDevelopmentOutdoorsTileImage,
  getDevelopmentViewGalleryTileImage,
  type DevelopmentMedia,
} from '@/lib/media-logic';
import { resolveMediaUrl } from '@/lib/mediaUtils';
import { formatPriceCompact } from '@/lib/formatPrice';
import {
  calculateAffordablePrice,
  calculateMonthlyRepayment,
  formatSARandShort,
  SA_PRIME_RATE,
} from '@/lib/bond-calculator';
import { trackCTAClick, trackFunnelStep } from '@/lib/analytics/advertiseTracking';
import {
  getDevelopmentUnitMedia,
  getDevelopmentUnitRouteKey,
} from '@/lib/developmentUnitSelectors';
import { calculateInventorySummary, calculatePriceFrom } from '../../../shared/developmentDerived';

type AmenityTabKey = AmenityCategory | 'other';

const AMENITY_CATEGORY_ICONS: Record<AmenityTabKey, typeof Shield> = {
  security: Shield,
  lifestyle: Dumbbell,
  sustainability: Leaf,
  convenience: Settings,
  family: Baby,
  other: CheckCircle2,
};

export const formatDevelopmentDetailLabel = (value?: string) => {
  if (!value) return '—';
  return value
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatLabel = formatDevelopmentDetailLabel;

export function getDevelopmentDetailAmenityLabel(key: string) {
  const match = AMENITY_REGISTRY.find(item => item.key === key);
  return match?.label ?? formatLabel(key);
}

export function buildDevelopmentDetailAmenityGroups(list: string[]) {
  const groups: Record<AmenityTabKey, { key: string; label: string }[]> = {
    security: [],
    lifestyle: [],
    sustainability: [],
    convenience: [],
    family: [],
    other: [],
  };
  const seen = new Set<string>();

  list.forEach(raw => {
    const key = String(raw ?? '').trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    const match = AMENITY_REGISTRY.find(item => item.key === key);
    const category = (match?.category ?? 'other') as AmenityTabKey;
    groups[category].push({ key, label: getDevelopmentDetailAmenityLabel(key) });
  });

  return groups;
}

const toDevelopmentDetailStringList = (value: unknown): string[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .flatMap(item => toDevelopmentDetailStringList(item))
      .map(item => item.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))
    ) {
      try {
        return toDevelopmentDetailStringList(JSON.parse(trimmed));
      } catch {
        return [trimmed];
      }
    }

    return [trimmed];
  }

  if (typeof value === 'object') {
    const label =
      (value as { label?: unknown; title?: unknown; name?: unknown; value?: unknown }).label ??
      (value as { label?: unknown; title?: unknown; name?: unknown; value?: unknown }).title ??
      (value as { label?: unknown; title?: unknown; name?: unknown; value?: unknown }).name ??
      (value as { label?: unknown; title?: unknown; name?: unknown; value?: unknown }).value;
    return toDevelopmentDetailStringList(label);
  }

  return [];
};

export function getDevelopmentDetailHighlights(dev: any): string[] {
  const rawHighlights = [
    dev?.highlights,
    dev?.developmentData?.highlights,
    dev?.marketingSummary?.keySellingPoints,
    dev?.marketingSummary?.highlights,
    dev?.stepData?.marketing_summary?.keySellingPoints,
    dev?.stepData?.marketing_summary?.highlights,
  ];
  const seen = new Set<string>();

  return rawHighlights
    .flatMap(toDevelopmentDetailStringList)
    .filter(highlight => {
      const key = highlight.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

const inferOwnership = (structuralType: string, defaultType?: string) => {
  if (defaultType) return defaultType;
  const t = (structuralType || '').toLowerCase();
  const isHouse = /house|duplex|simplex|townhouse|freestanding|cluster/.test(t);
  return isHouse ? 'Freehold' : 'Sectional Title';
};

const parseNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const isPresentSize = (value: unknown): boolean => {
  const parsed = parseNumber(value);
  return parsed !== null && parsed > 0;
};

const formatSizeValue = (value: unknown): string | null => {
  const parsed = parseNumber(value);
  if (parsed === null) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed !== '' && !Number.isNaN(Number(trimmed))) {
      if (trimmed.includes('.')) {
        return trimmed.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
      }
      return trimmed;
    }
  }

  return Number.isInteger(parsed) ? `${parsed}` : `${parsed}`;
};

const formatBathValue = (value: unknown): string | null => {
  const parsed = parseNumber(value);
  if (parsed === null) return null;
  return Number.isInteger(parsed) ? `${parsed}` : `${parsed}`;
};

const formatExactRand = (value: unknown): string | null => {
  const parsed = parseNumber(value);
  if (parsed === null || parsed <= 0) return null;
  return `R ${Math.round(parsed).toLocaleString('en-ZA')}`;
};

const formatParkingLabel = (parking?: string | number, parkingBays?: number): string | null => {
  const parkingValue = parking ?? undefined;
  const baysValue = parseNumber(parkingBays);

  if (typeof parkingValue === 'string') {
    const trimmed = parkingValue.trim();
    if (trimmed === '' || trimmed === 'none' || trimmed === '0') {
      return baysValue && baysValue > 0 ? `${baysValue} Bay${baysValue === 1 ? '' : 's'}` : null;
    }
    if (/^\d+$/.test(trimmed)) {
      const bays = Number(trimmed);
      return bays > 0 ? `${bays} Bay${bays === 1 ? '' : 's'}` : null;
    }
    const normalized = trimmed.replace(/[_-]+/g, ' ');
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  return baysValue && baysValue > 0 ? `${baysValue} Bay${baysValue === 1 ? '' : 's'}` : null;
};

const DEFAULT_DEPOSIT_PERCENTAGE = 0;
const DEFAULT_BOND_TERM_YEARS = 20;
const QUICK_QUALIFICATION_PAYMENT_RATIO = 3;

type DevelopmentDetailTransactionType = 'sale' | 'rent' | 'auction';

const toSharedDevelopmentTransactionType = (
  transactionType: DevelopmentDetailTransactionType,
): 'for_sale' | 'for_rent' | 'auction' => {
  if (transactionType === 'rent') return 'for_rent';
  if (transactionType === 'auction') return 'auction';
  return 'for_sale';
};

const toPositiveNumber = (value: unknown): number | null => {
  const parsed = parseNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
};

export function normalizeDevelopmentDetailTransactionType(
  value: unknown,
): DevelopmentDetailTransactionType {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (normalized === 'rent' || normalized === 'for_rent' || normalized === 'to_rent') {
    return 'rent';
  }
  if (normalized === 'auction' || normalized === 'on_auction') return 'auction';
  return 'sale';
}

export function getDevelopmentDetailUnitPricingContext(
  unit: Record<string, unknown>,
  fallbackTransactionType: unknown,
) {
  const transactionType = normalizeDevelopmentDetailTransactionType(
    unit.transactionType ?? fallbackTransactionType,
  );

  if (transactionType === 'rent') {
    const priceRange = calculatePriceFrom(unit, 'for_rent');
    const priceFrom = priceRange.priceFrom > 0 ? priceRange.priceFrom : null;
    const priceTo = priceRange.priceTo;
    return {
      transactionType,
      priceFrom,
      priceTo,
      priceLabel: 'Rent from',
      snapshotLabel: 'Rental Snapshot',
      repaymentLabel: 'Monthly rent',
      incomeLabel: 'Qualifying income',
      paymentAmount: priceFrom,
      usesBondEstimate: false,
    };
  }

  if (transactionType === 'auction') {
    const priceRange = calculatePriceFrom(unit, 'auction');
    const priceFrom = priceRange.priceFrom > 0 ? priceRange.priceFrom : null;
    const priceTo = toPositiveNumber(unit.reservePrice) ?? priceFrom;
    const paymentAmount =
      priceFrom !== null
        ? calculateMonthlyRepayment(priceFrom, SA_PRIME_RATE, DEFAULT_BOND_TERM_YEARS)
        : null;
    return {
      transactionType,
      priceFrom,
      priceTo,
      priceLabel: 'Starting bid',
      snapshotLabel: 'Auction Snapshot',
      repaymentLabel: 'Est. bond repayment',
      incomeLabel: 'Indicative income',
      paymentAmount,
      usesBondEstimate: true,
    };
  }

  const priceRange = calculatePriceFrom(unit, toSharedDevelopmentTransactionType(transactionType));
  const priceFrom = priceRange.priceFrom > 0 ? priceRange.priceFrom : null;
  const priceTo = priceRange.priceTo;
  const paymentAmount =
    priceFrom !== null
      ? calculateMonthlyRepayment(priceFrom, SA_PRIME_RATE, DEFAULT_BOND_TERM_YEARS)
      : null;
  return {
    transactionType,
    priceFrom,
    priceTo,
    priceLabel: 'Price from',
    snapshotLabel: 'Ownership Snapshot',
    repaymentLabel: 'Repayment from',
    incomeLabel: 'Qualifying income',
    paymentAmount,
    usesBondEstimate: true,
  };
}

export function getDevelopmentDetailPricingContext(
  development: Record<string, unknown>,
  units: Array<Record<string, unknown>> = [],
) {
  const transactionType = normalizeDevelopmentDetailTransactionType(development.transactionType);
  const unitRanges = units
    .map(unit => getDevelopmentDetailUnitPricingContext(unit, transactionType))
    .filter(context => context.priceFrom !== null || context.priceTo !== null);
  const unitPriceValues = unitRanges
    .flatMap(context => [context.priceFrom, context.priceTo])
    .filter((value): value is number => typeof value === 'number' && value > 0);

  const developmentFallback =
    transactionType === 'rent'
      ? getDevelopmentDetailUnitPricingContext(
          {
            monthlyRentFrom: development.monthlyRentFrom,
            monthlyRentTo: development.monthlyRentTo,
          },
          transactionType,
        )
      : transactionType === 'auction'
        ? getDevelopmentDetailUnitPricingContext(
            {
              startingBid: development.startingBidFrom,
              reservePrice: development.reservePriceFrom,
            },
            transactionType,
          )
        : getDevelopmentDetailUnitPricingContext(
            {
              basePriceFrom: development.priceFrom,
              basePriceTo: development.priceTo,
            },
            transactionType,
          );

  const priceFrom =
    (unitPriceValues.length > 0 ? Math.min(...unitPriceValues) : null) ??
    developmentFallback.priceFrom ??
    0;
  const priceTo =
    (unitPriceValues.length > 0 ? Math.max(...unitPriceValues) : null) ??
    developmentFallback.priceTo ??
    undefined;
  const priceToDisplay = priceTo && priceTo > priceFrom ? priceTo : undefined;
  const paymentAmount =
    transactionType === 'rent'
      ? priceFrom
      : priceFrom > 0
        ? calculateMonthlyRepayment(priceFrom, SA_PRIME_RATE, DEFAULT_BOND_TERM_YEARS)
        : 0;

  return {
    transactionType,
    priceFrom,
    priceTo: priceToDisplay,
    paymentAmount,
    minimumIncome: Math.round(paymentAmount * QUICK_QUALIFICATION_PAYMENT_RATIO),
    priceLabel:
      transactionType === 'rent'
        ? 'Rent From'
        : transactionType === 'auction'
          ? 'Starting Bid'
          : 'Price From',
    repaymentLabel:
      transactionType === 'rent'
        ? 'Monthly Rent'
        : transactionType === 'auction'
          ? 'Est. Bond Repayment'
          : 'Est. Repayment',
    incomeLabel: transactionType === 'auction' ? 'Indicative Income' : 'Qualifying Income',
    repaymentSuffix: ' / month',
    estimationNote:
      transactionType === 'rent'
        ? 'Rental fit is estimated from monthly rent and household income.'
        : transactionType === 'auction'
          ? 'Bond estimate is indicative and based on the starting bid.'
          : 'Estimated using a 20-year bond term and standard prime lending rate.',
  };
}

type DevelopmentDetailCommercialPackItem = {
  label: string;
  value: string;
};

type DevelopmentDetailCommercialPackProofItem = {
  label: string;
  value: string;
  isReady: boolean;
};

export type DevelopmentDetailCommercialPack = {
  eyebrow: string;
  title: string;
  summary: string;
  items: DevelopmentDetailCommercialPackItem[];
  proofItems: DevelopmentDetailCommercialPackProofItem[];
  primaryActionLabel: string;
  secondaryActionLabel: string;
};

type DevelopmentDetailTransactionJourneyStep = {
  label: string;
  detail: string;
};

export type DevelopmentDetailTransactionJourney = {
  eyebrow: string;
  title: string;
  summary: string;
  steps: DevelopmentDetailTransactionJourneyStep[];
};

type DevelopmentDetailTrustPreviewItem = {
  label: string;
  value: string;
  isReady: boolean;
};

export type DevelopmentDetailTrustPreview = {
  eyebrow: string;
  title: string;
  summary: string;
  items: DevelopmentDetailTrustPreviewItem[];
};

const getInventoryTotals = (
  development: Record<string, unknown>,
  units: Array<Record<string, unknown>>,
): { total: number; available: number } => {
  const totals = units.reduce<{ total: number; available: number }>(
    (acc, unit) => {
      const summary = calculateInventorySummary(unit);
      acc.total += summary.total;
      acc.available += summary.available;
      return acc;
    },
    { total: 0, available: 0 },
  );

  if (totals.total > 0) return totals;

  const summary = calculateInventorySummary({
    totalUnits: development.totalUnits,
    availableUnits:
      development.availableUnits !== undefined && development.availableUnits !== null
        ? development.availableUnits
        : development.totalUnits,
  });

  return {
    total: summary.total,
    available: summary.available,
  };
};

const formatCommercialPackPriceRange = (priceFrom: number, priceTo?: number) => {
  if (!Number.isFinite(priceFrom) || priceFrom <= 0) return 'On request';
  if (priceTo && priceTo > priceFrom) {
    return `${formatSARandShort(priceFrom)} - ${formatSARandShort(priceTo)}`;
  }
  return formatSARandShort(priceFrom);
};

const firstPositiveUnitValue = (units: Array<Record<string, unknown>>, keys: string[]) => {
  for (const unit of units) {
    for (const key of keys) {
      const value = toPositiveNumber(unit[key]);
      if (value !== null) return value;
    }
  }
  return null;
};

const firstUnitStringValue = (units: Array<Record<string, unknown>>, keys: string[]) => {
  for (const unit of units) {
    for (const key of keys) {
      const value = String(unit[key] || '').trim();
      if (value) return value;
    }
  }
  return null;
};

const formatCommercialPackDate = (value: unknown) => {
  const rawValue = String(value || '').trim();
  if (!rawValue) return null;

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const getAuctionWindowLabel = (units: Array<Record<string, unknown>>) => {
  const start = firstUnitStringValue(units, ['auctionStartDate']);
  const end = firstUnitStringValue(units, ['auctionEndDate']);
  const startLabel = formatCommercialPackDate(start);
  const endLabel = formatCommercialPackDate(end);

  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
  if (startLabel) return `Starts ${startLabel}`;
  return null;
};

export function getDevelopmentDetailCommercialPack(
  development: Record<string, unknown>,
  units: Array<Record<string, unknown>> = [],
  options: { hasBrochure?: boolean } = {},
): DevelopmentDetailCommercialPack {
  const pricing = getDevelopmentDetailPricingContext(development, units);
  const inventory = getInventoryTotals(development, units);
  const unitTypeCount = units.length;
  const priceRange = formatCommercialPackPriceRange(pricing.priceFrom, pricing.priceTo);
  const documentLabel = options.hasBrochure ? 'Pack available' : 'Pack request available';

  if (pricing.transactionType === 'rent') {
    const deposit = firstPositiveUnitValue(units, ['depositRequired', 'depositAmount']);
    const leaseTerm = firstUnitStringValue(units, ['leaseTerm', 'leaseTerms']);
    const furnished = units.some(unit => Boolean(unit.isFurnished));
    const availableFromLabel = formatCommercialPackDate(firstUnitStringValue(units, ['availableFrom']));
    const hasRentRange = pricing.priceFrom > 0;
    const hasAvailability = inventory.total > 0;
    const leaseSignals = [
      deposit ? `deposit from ${formatSARandShort(deposit)}` : null,
      leaseTerm || null,
      furnished ? 'furnished options' : null,
      availableFromLabel ? `available from ${availableFromLabel}` : null,
    ].filter((item): item is string => !!item);

    return {
      eyebrow: 'Rental Pack',
      title: 'Lease path at a glance',
      summary:
        'Rental pricing, availability, lease signals, and enquiry steps are packaged for renters before they contact the leasing team.',
      primaryActionLabel: 'Check Rental Fit',
      secondaryActionLabel: options.hasBrochure ? 'Download Rental Pack' : 'Request Rental Pack',
      items: [
        { label: 'Rent', value: `${pricing.priceLabel} ${priceRange}` },
        {
          label: 'Availability',
          value:
            inventory.total > 0
              ? `${inventory.available} of ${inventory.total} rentals available`
              : 'Rental availability on request',
        },
        {
          label: 'Lease signals',
          value: leaseSignals.length > 0 ? leaseSignals.join(' · ') : 'Lease details on request',
        },
        {
          label: 'Renter readiness',
          value: 'Rental fit check and leasing-team enquiry available',
        },
        { label: 'Documents', value: documentLabel },
      ],
      proofItems: [
        {
          label: 'Monthly rent package',
          value: hasRentRange ? `${priceRange} monthly range published` : 'Monthly rent on request',
          isReady: hasRentRange,
        },
        {
          label: 'Lease terms packaged',
          value: leaseTerm || 'Lease term still request-led',
          isReady: Boolean(leaseTerm),
        },
        {
          label: 'Deposit expectation',
          value: deposit ? `Deposit from ${formatSARandShort(deposit)}` : 'Deposit to confirm',
          isReady: Boolean(deposit),
        },
        {
          label: 'Rental availability',
          value: hasAvailability
            ? `${inventory.available} rentals ready to enquire`
            : 'Rental stock to confirm',
          isReady: hasAvailability,
        },
        {
          label: 'Renter next step',
          value: 'Rental fit and leasing-team lead context ready',
          isReady: true,
        },
      ],
    };
  }

  if (pricing.transactionType === 'auction') {
    const auctionStatus = units
      .map(unit => String(unit.auctionStatus || '').trim())
      .find(Boolean);
    const reserve =
      firstPositiveUnitValue(units, ['reservePrice']) ?? toPositiveNumber(development.reservePriceFrom);
    const auctionWindow = getAuctionWindowLabel(units);
    const hasBidGuidance = pricing.priceFrom > 0;
    const hasAvailability = inventory.total > 0;
    const auctionSignals = [
      auctionStatus ? formatDevelopmentDetailLabel(auctionStatus) : 'Auction timing on request',
      reserve ? `reserve guidance from ${formatSARandShort(reserve)}` : null,
      auctionWindow ? `auction window ${auctionWindow}` : null,
    ].filter((item): item is string => !!item);

    return {
      eyebrow: 'Auction Pack',
      title: 'Bidder path at a glance',
      summary:
        'Auction pricing, registration state, bidder readiness, and document signals are packaged before a bidder registers interest.',
      primaryActionLabel: 'Check Bidder Readiness',
      secondaryActionLabel: options.hasBrochure ? 'Download Auction Pack' : 'Request Auction Pack',
      items: [
        { label: 'Bid guidance', value: `${pricing.priceLabel} ${priceRange}` },
        {
          label: 'Auction status',
          value: auctionSignals.join(' · '),
        },
        {
          label: 'Lots',
          value:
            inventory.total > 0
              ? `${inventory.available} of ${inventory.total} lots open`
              : 'Lot availability on request',
        },
        {
          label: 'Bidder readiness',
          value: 'Bidder readiness check and auction-team enquiry available',
        },
        { label: 'Documents', value: documentLabel },
      ],
      proofItems: [
        {
          label: 'Starting bid package',
          value: hasBidGuidance ? `${priceRange} bid guidance published` : 'Starting bid on request',
          isReady: hasBidGuidance,
        },
        {
          label: 'Auction window',
          value: auctionWindow || 'Auction window to confirm',
          isReady: Boolean(auctionWindow),
        },
        {
          label: 'Reserve strategy',
          value: reserve
            ? `Reserve guidance from ${formatSARandShort(reserve)}`
            : 'Reserve guidance to confirm',
          isReady: Boolean(reserve),
        },
        {
          label: 'Registration lifecycle',
          value: auctionStatus
            ? formatDevelopmentDetailLabel(auctionStatus)
            : 'Registration status to confirm',
          isReady: Boolean(auctionStatus),
        },
        {
          label: 'Bidder next step',
          value: 'Bidder readiness and auction-team lead context ready',
          isReady: true,
        },
        {
          label: 'Legal pack',
          value: options.hasBrochure ? 'Auction documents available' : 'Auction documents request-led',
          isReady: Boolean(options.hasBrochure),
        },
        {
          label: 'Lot urgency',
          value: hasAvailability ? `${inventory.available} lots open for interest` : 'Lot status to confirm',
          isReady: hasAvailability,
        },
      ],
    };
  }

  const ownership = String(development.ownershipType || '').trim();
  const hasPrice = pricing.priceFrom > 0;
  const hasAvailability = inventory.total > 0;

  return {
    eyebrow: 'Buyer Pack',
    title: 'Sales path at a glance',
    summary:
      'Sales pricing, inventory, buyer readiness, and document signals are packaged so buyers know what to do next.',
    primaryActionLabel: 'Start Qualification',
    secondaryActionLabel: options.hasBrochure ? 'Download Brochure' : 'Request Brochure',
    items: [
      { label: 'Pricing', value: `${pricing.priceLabel} ${priceRange}` },
      {
        label: 'Availability',
        value:
          inventory.total > 0
            ? `${inventory.available} of ${inventory.total} homes available`
            : 'Availability on request',
      },
      {
        label: 'Buyer readiness',
        value: 'Affordability check and sales-team enquiry available',
      },
      {
        label: 'Ownership',
        value: ownership ? formatDevelopmentDetailLabel(ownership) : 'Ownership details on request',
      },
      { label: 'Documents', value: documentLabel },
    ],
    proofItems: [
      {
        label: 'Price package',
        value: hasPrice ? `${priceRange} sales range published` : 'Pricing on request',
        isReady: hasPrice,
      },
      {
        label: 'Inventory package',
        value: hasAvailability
          ? `${inventory.available} homes ready to enquire`
          : 'Inventory to confirm',
        isReady: hasAvailability,
      },
      {
        label: 'Ownership signal',
        value: ownership ? formatDevelopmentDetailLabel(ownership) : 'Ownership details on request',
        isReady: Boolean(ownership),
      },
      {
        label: 'Buyer next step',
        value: 'Qualification and sales-team lead context ready',
        isReady: true,
      },
    ],
  };
}

export function getDevelopmentDetailTransactionJourney(
  development: Record<string, unknown>,
  units: Array<Record<string, unknown>> = [],
  options: { hasBrochure?: boolean } = {},
): DevelopmentDetailTransactionJourney {
  const pricing = getDevelopmentDetailPricingContext(development, units);
  const inventory = getInventoryTotals(development, units);
  const documentReadyLabel = options.hasBrochure ? 'document pack' : 'document request';

  if (pricing.transactionType === 'rent') {
    const leaseTerm = firstUnitStringValue(units, ['leaseTerm', 'leaseTerms']);
    const deposit = firstPositiveUnitValue(units, ['depositRequired', 'depositAmount']);
    const availability =
      inventory.total > 0
        ? `${inventory.available} rental homes currently available`
        : 'rental availability confirmed by the leasing team';

    return {
      eyebrow: 'Rental journey',
      title: 'From rental fit to lease follow-up',
      summary:
        'This rental path shows renters what happens after they review the pack, without forcing a sales-style buying journey.',
      steps: [
        {
          label: 'Review lease package',
          detail: `${availability}; ${leaseTerm || 'lease term to confirm'}; ${
            deposit ? `deposit from ${formatSARandShort(deposit)}` : 'deposit to confirm'
          }.`,
        },
        {
          label: 'Check rental fit',
          detail: 'Estimate monthly rent fit before sharing renter details with the leasing team.',
        },
        {
          label: 'Request rental pack',
          detail: `Use the ${documentReadyLabel} path for lease terms, costs, and unit-specific details.`,
        },
        {
          label: 'Leasing team follow-up',
          detail: 'A leasing consultant can confirm application documents, viewing options, and next available homes.',
        },
      ],
    };
  }

  if (pricing.transactionType === 'auction') {
    const auctionStatus = firstUnitStringValue(units, ['auctionStatus']);
    const auctionWindow = getAuctionWindowLabel(units);
    const reserve =
      firstPositiveUnitValue(units, ['reservePrice']) ?? toPositiveNumber(development.reservePriceFrom);

    return {
      eyebrow: 'Auction journey',
      title: 'From bidder readiness to auction registration',
      summary:
        'This auction path separates bidder preparation from normal sales enquiry, so bidders understand timing, registration, and documents before they act.',
      steps: [
        {
          label: 'Review bid package',
          detail: `${auctionWindow || 'Auction window to confirm'}; ${
            reserve ? `reserve guidance from ${formatSARandShort(reserve)}` : 'reserve guidance to confirm'
          }.`,
        },
        {
          label: 'Check bidder readiness',
          detail: 'Estimate bidding capacity before registering auction interest or requesting documents.',
        },
        {
          label: 'Request auction pack',
          detail: `Use the ${documentReadyLabel} path for legal pack, bidder rules, FICA, and deposit guidance.`,
        },
        {
          label: 'Auction team follow-up',
          detail: `Auction team confirms ${
            auctionStatus ? formatDevelopmentDetailLabel(auctionStatus).toLowerCase() : 'registration status'
          }, documents, and next bidder steps.`,
        },
      ],
    };
  }

  const ownership = String(development.ownershipType || '').trim();

  return {
    eyebrow: 'Buyer journey',
    title: 'From qualification to sales follow-up',
    summary:
      'This sales path helps buyers understand the next steps from affordability to unit-specific enquiry.',
    steps: [
      {
        label: 'Review buyer package',
        detail: `${inventory.total > 0 ? `${inventory.available} homes currently available` : 'Inventory confirmed by the sales team'}; ${
          ownership ? `${formatDevelopmentDetailLabel(ownership)} ownership` : 'ownership details to confirm'
        }.`,
      },
      {
        label: 'Start qualification',
        detail: 'Estimate affordability before sharing buyer details with the sales team.',
      },
      {
        label: 'Request brochure',
        detail: `Use the ${documentReadyLabel} path for plans, costs, and launch information.`,
      },
      {
        label: 'Sales team follow-up',
        detail: 'A sales consultant can confirm availability, incentives, viewings, and reservation next steps.',
      },
    ],
  };
}

export function getDevelopmentDetailTrustPreview(
  development: Record<string, unknown>,
  units: Array<Record<string, unknown>> = [],
  options: { hasBrochure?: boolean; isVerified?: boolean } = {},
): DevelopmentDetailTrustPreview {
  const pricing = getDevelopmentDetailPricingContext(development, units);
  const levy = toPositiveNumber(development.monthlyLevyFrom);
  const rates = toPositiveNumber(development.ratesFrom);
  const ownership = String(development.ownershipType || '').trim();
  const costSignals = [
    levy ? `levies from ${formatSARandShort(levy)}` : null,
    rates ? `rates from ${formatSARandShort(rates)}` : null,
  ].filter((item): item is string => !!item);

  if (pricing.transactionType === 'rent') {
    return {
      eyebrow: 'Rental trust preview',
      title: 'Lease documents and cost context',
      summary:
        'Key renter trust signals are grouped before enquiry so renters can understand documents, costs, and leasing review expectations.',
      items: [
        {
          label: 'Rental pack',
          value: options.hasBrochure ? 'Rental pack available before enquiry' : 'Rental pack request available',
          isReady: Boolean(options.hasBrochure),
        },
        {
          label: 'Developer profile',
          value: options.isVerified ? 'Verified developer profile' : 'Developer profile displayed',
          isReady: true,
        },
        {
          label: 'Lease cost context',
          value: costSignals.length > 0 ? costSignals.join(' · ') : 'Lease costs confirmed by leasing team',
          isReady: costSignals.length > 0,
        },
        {
          label: 'Leasing review',
          value: 'Proof of income, deposit readiness, and lease documents are confirmed by the leasing team.',
          isReady: true,
        },
      ],
    };
  }

  if (pricing.transactionType === 'auction') {
    return {
      eyebrow: 'Auction trust preview',
      title: 'Bidder documents and auction rules',
      summary:
        'Key bidder trust signals are grouped before registration so bidders can understand legal pack, costs, and auction review expectations.',
      items: [
        {
          label: 'Legal pack',
          value: options.hasBrochure ? 'Auction legal pack available before enquiry' : 'Auction legal pack request available',
          isReady: Boolean(options.hasBrochure),
        },
        {
          label: 'Developer profile',
          value: options.isVerified ? 'Verified developer profile' : 'Developer profile displayed',
          isReady: true,
        },
        {
          label: 'Cost context',
          value: costSignals.length > 0 ? costSignals.join(' · ') : 'Auction costs confirmed by auction team',
          isReady: costSignals.length > 0,
        },
        {
          label: 'Bidder review',
          value: 'FICA, deposit proof, proof of funds, and auction terms are confirmed by the auction team.',
          isReady: true,
        },
      ],
    };
  }

  return {
    eyebrow: 'Buyer trust preview',
    title: 'Buyer documents and ownership context',
    summary:
      'Key buyer trust signals are grouped before enquiry so buyers can understand documents, ownership, and cost expectations.',
    items: [
      {
        label: 'Brochure',
        value: options.hasBrochure ? 'Brochure available before enquiry' : 'Brochure request available',
        isReady: Boolean(options.hasBrochure),
      },
      {
        label: 'Developer profile',
        value: options.isVerified ? 'Verified developer profile' : 'Developer profile displayed',
        isReady: true,
      },
      {
        label: 'Ownership context',
        value: ownership ? formatDevelopmentDetailLabel(ownership) : 'Ownership details confirmed by sales team',
        isReady: Boolean(ownership),
      },
      {
        label: 'Buyer cost context',
        value: costSignals.length > 0 ? costSignals.join(' · ') : 'Buyer costs confirmed by sales team',
        isReady: costSignals.length > 0,
      },
    ],
  };
}

export function getDevelopmentDetailLeadUnitContext(
  unit: Record<string, unknown> | null | undefined,
  fallbackTransactionType: unknown,
) {
  if (!unit) return null;

  const pricing = getDevelopmentDetailUnitPricingContext(unit, fallbackTransactionType);
  const unitPriceFrom =
    pricing.priceFrom !== null && pricing.priceFrom > 0 ? pricing.priceFrom : undefined;

  return {
    unitId: getDevelopmentUnitRouteKey(unit),
    unitName: typeof unit.name === 'string' && unit.name.trim() ? unit.name.trim() : undefined,
    unitPriceFrom,
    unitPriceLabel: pricing.priceLabel,
    transactionType: pricing.transactionType,
    unitBedrooms:
      Number.isFinite(Number(unit.bedrooms)) && Number(unit.bedrooms) >= 0
        ? Number(unit.bedrooms)
        : undefined,
    unitBathrooms:
      Number.isFinite(Number(unit.bathrooms)) && Number(unit.bathrooms) >= 0
        ? Number(unit.bathrooms)
        : undefined,
  };
}

const resolveDocumentUrl = (item: unknown): string | null => {
  if (typeof item === 'string') {
    const trimmed = item.trim();
    return trimmed ? resolveMediaUrl(trimmed) : null;
  }

  if (!item || typeof item !== 'object') return null;

  const doc = item as { url?: string; href?: string; src?: string; key?: string };
  const candidate = doc.url ?? doc.href ?? doc.src ?? doc.key ?? null;
  return typeof candidate === 'string' && candidate.trim() ? resolveMediaUrl(candidate) : null;
};

const toMediaArray = (value: unknown): any[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [trimmed];
    } catch {
      return [trimmed];
    }
  }
  return [];
};

export function getDevelopmentDetailMediaBuckets(dev: any) {
  const media = dev?.media && typeof dev.media === 'object' ? dev.media : {};

  return {
    images: toMediaArray(media.photos ?? media.images ?? dev?.images),
    videos: toMediaArray(media.videos ?? dev?.videos),
    floorPlans: toMediaArray(media.floorPlans ?? dev?.floorPlans),
    brochures: toMediaArray(media.documents ?? media.brochures ?? dev?.brochures),
  };
}

const resolveUnitFloorPlanUrl = (unit: any): string | null => {
  const floorPlans = Array.isArray(unit?.baseMedia?.floorPlans) ? unit.baseMedia.floorPlans : [];
  for (const item of floorPlans) {
    const url = resolveDocumentUrl(item);
    if (url) return url;
  }
  return null;
};

const pluralizeUnitCount = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;

export const getDevelopmentDetailUnitAvailabilityState = (
  unit: any,
  transactionType: unknown = 'sale',
) => {
  const normalizedTransactionType = normalizeDevelopmentDetailTransactionType(transactionType);
  const inventory = calculateInventorySummary(unit ?? {});
  const availableUnits = inventory.available;
  const totalUnits = inventory.total;

  if (normalizedTransactionType === 'auction') {
    const auctionStatus = String(unit?.auctionStatus || '')
      .trim()
      .toLowerCase();

    if (auctionStatus === 'registration_open') {
      return {
        label: 'Registration open',
        className: 'border-blue-200 bg-blue-50 text-blue-700',
        primaryLabel: 'Register Auction Interest',
      };
    }

    if (auctionStatus === 'active') {
      return {
        label: 'Auction active',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        primaryLabel: 'Register Auction Interest',
      };
    }

    if (auctionStatus === 'sold') {
      return {
        label: 'Sold at auction',
        className: 'border-slate-200 bg-slate-100 text-slate-700',
        primaryLabel: 'Request Auction Outcome',
      };
    }

    if (auctionStatus === 'passed_in') {
      return {
        label: 'Passed in',
        className: 'border-amber-200 bg-amber-50 text-amber-700',
        primaryLabel: 'Request Auction Details',
      };
    }

    if (auctionStatus === 'withdrawn') {
      return {
        label: 'Withdrawn',
        className: 'border-slate-200 bg-slate-100 text-slate-600',
        primaryLabel: 'Request Auction Details',
      };
    }
  }

  if (totalUnits > 0 && availableUnits <= 0) {
    if (normalizedTransactionType === 'rent') {
      return {
        label: 'Fully let',
        className: 'border-rose-200 bg-rose-50 text-rose-700',
        primaryLabel: 'Join Rental Waitlist',
      };
    }

    if (normalizedTransactionType === 'auction') {
      return {
        label: 'Auction closed',
        className: 'border-rose-200 bg-rose-50 text-rose-700',
        primaryLabel: 'Register Interest',
      };
    }

    return {
      label: 'Sold out',
      className: 'border-rose-200 bg-rose-50 text-rose-700',
      primaryLabel: 'Join Waitlist',
    };
  }

  if (availableUnits > 0 && availableUnits <= 5) {
    if (normalizedTransactionType === 'rent') {
      return {
        label: `Only ${pluralizeUnitCount(availableUnits, 'rental', 'rentals')} left`,
        className: 'border-amber-200 bg-amber-50 text-amber-700',
        primaryLabel: 'Request Rental Details',
      };
    }

    if (normalizedTransactionType === 'auction') {
      return {
        label: `Only ${pluralizeUnitCount(availableUnits, 'lot', 'lots')} open`,
        className: 'border-amber-200 bg-amber-50 text-amber-700',
        primaryLabel: 'Register Auction Interest',
      };
    }

    return {
      label: `Only ${availableUnits} left`,
      className: 'border-amber-200 bg-amber-50 text-amber-700',
      primaryLabel: 'Request Callback',
    };
  }

  if (availableUnits > 5) {
    if (normalizedTransactionType === 'rent') {
      return {
        label: `${availableUnits} rentals available`,
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        primaryLabel: 'Request Rental Details',
      };
    }

    if (normalizedTransactionType === 'auction') {
      return {
        label: `${availableUnits} lots open`,
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        primaryLabel: 'Register Auction Interest',
      };
    }

    return {
      label: `${availableUnits} available`,
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      primaryLabel: 'Request Callback',
    };
  }

  return null;
};

type UnitTypeCarouselProps = {
  units: any[];
  transactionType: unknown;
  onRequestCallback: (unit: any) => void;
  onRequestInformation: (unit: any) => void;
  onOpenFloorPlan: (unit: any) => void;
};

function UnitTypeCarousel({
  units,
  transactionType,
  onRequestCallback,
  onRequestInformation,
  onOpenFloorPlan,
}: UnitTypeCarouselProps) {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [snapCount, setSnapCount] = useState(0);

  useEffect(() => {
    if (!api) return;

    const update = () => {
      setSelectedIndex(api.selectedScrollSnap());
      setSnapCount(api.scrollSnapList().length);
    };

    update();
    api.on('select', update);
    api.on('reInit', update);

    return () => {
      api.off('select', update);
      api.off('reInit', update);
    };
  }, [api]);

  if (units.length === 0) return null;

  return (
    <div className="relative w-full">
      <Carousel
        opts={{
          align: 'start',
          loop: true,
        }}
        setApi={setApi}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {units.map(unit => {
            const unitPricing = getDevelopmentDetailUnitPricingContext(unit, transactionType);
            const unitPriceFrom = unitPricing.priceFrom ?? 0;
            const unitPriceTo = unitPricing.priceTo;
            const availability = getDevelopmentDetailUnitAvailabilityState(
              unit,
              unitPricing.transactionType,
            );
            const exactPriceFrom = formatExactRand(unitPriceFrom) || 'Price on request';
            const exactPriceTo =
              typeof unitPriceTo === 'number' && unitPriceTo > unitPriceFrom
                ? formatExactRand(unitPriceTo)
                : null;
            const estimatedRepayment = unitPricing.paymentAmount
              ? Math.round(unitPricing.paymentAmount)
              : null;
            const qualifyingIncome =
              estimatedRepayment !== null
                ? Math.round(estimatedRepayment * QUICK_QUALIFICATION_PAYMENT_RATIO)
                : null;
            const secondaryActionLabel = 'View Plan & Details';

            return (
              <CarouselItem
                key={unit.id}
                className="pl-4 md:basis-[74%] lg:basis-[54%] xl:basis-[43%]"
              >
                <Card className="flex h-full flex-col overflow-hidden border-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="group relative w-full overflow-hidden bg-slate-200 aspect-[4/2.65]">
                    <img
                      src={unit.normalizedImage}
                      alt={unit.normalizedType}
                      onError={e => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (!target.src.includes('placeholder')) {
                          target.src = '/assets/placeholder-home.jpg';
                        }
                      }}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {unit.normalizedOwnership ? (
                      <div className="absolute left-3 top-3">
                        <span className="rounded-full border border-white/70 bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
                          {unit.normalizedOwnership}
                        </span>
                      </div>
                    ) : null}
                    {availability ? (
                      <div className="absolute right-3 top-3">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm ${availability.className}`}
                        >
                          {availability.label}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <CardContent className="flex flex-1 flex-col space-y-3 p-3.5">
                    <div className="space-y-1.5">
                      <div className="min-w-0">
                        <h4 className="truncate text-[11px] font-bold leading-tight text-slate-900">
                          {unit.name}
                        </h4>
                        <p className="mt-1 truncate text-[13px] font-bold text-slate-900">
                          {exactPriceTo ? `${exactPriceFrom} - ${exactPriceTo}` : exactPriceFrom}
                        </p>
                      </div>
                      {estimatedRepayment ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            {unitPricing.snapshotLabel}
                          </p>
                          <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px]">
                            <span className="truncate text-slate-600">
                              {unitPricing.repaymentLabel}
                            </span>
                            <span className="truncate font-semibold text-slate-900">
                              {formatExactRand(estimatedRepayment)} / month
                            </span>
                          </div>
                          {qualifyingIncome ? (
                            <div className="mt-1 flex items-center justify-between gap-2 text-[10px]">
                              <span className="truncate text-slate-600">
                                {unitPricing.incomeLabel}
                              </span>
                              <span className="truncate font-semibold text-slate-900">
                                {formatExactRand(qualifyingIncome)} / month
                              </span>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-2 pt-0.5">
                      <Button
                        className="h-9 px-2 text-[11px] font-semibold text-white bg-orange-500 hover:bg-orange-600"
                        onClick={() => onRequestCallback(unit)}
                      >
                        {availability?.primaryLabel || 'Request Callback'}
                      </Button>
                      <Button
                        variant="outline"
                        className="h-9 border-blue-200 px-2 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
                        onClick={() => onOpenFloorPlan(unit)}
                      >
                        {secondaryActionLabel}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <div className="hidden md:block">
          <CarouselPrevious className="absolute -left-4 top-1/2 -translate-y-1/2 bg-white shadow-md border-slate-200" />
          <CarouselNext className="absolute -right-4 top-1/2 -translate-y-1/2 bg-white shadow-md border-slate-200" />
        </div>
      </Carousel>

      {snapCount > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: snapCount }).map((_, idx) => {
            const isActive = idx === selectedIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => api?.scrollTo(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  isActive ? 'w-6 bg-blue-600' : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

type QuickQualificationState = {
  tone: 'success' | 'warning' | 'muted';
  buyingPower: number;
  comfortFloor: number;
  headline: string;
  body: string;
};

type DevelopmentActionPanelProps = {
  developmentName: string;
  transactionType: unknown;
  inputId: string;
  quickIncome: string;
  onQuickIncomeChange: (value: string) => void;
  quickDeposit: string;
  onQuickDepositChange: (value: string) => void;
  quickQualification: QuickQualificationState | null;
  brochureUrl: string | null;
  unitTypeCount: number;
  onStartQualification: () => void;
  onDownloadBrochure: () => void;
  onContactSales: () => void;
};

export function getDevelopmentDetailActionPanelCopy(
  transactionType: unknown,
  unitTypeCount: number,
  hasBrochure: boolean,
) {
  const normalizedTransactionType = normalizeDevelopmentDetailTransactionType(transactionType);
  const safeUnitTypeCount = Math.max(0, Number(unitTypeCount) || 0);

  if (normalizedTransactionType === 'rent') {
    return {
      headline: 'Check rental fit and request lease details.',
      qualificationTitle: 'Rental Fit Check',
      qualificationHelp: 'Enter your monthly household income',
      depositLabel: 'Optional deposit or upfront amount',
      depositPlaceholder: 'Optional deposit',
      primaryActionLabel: 'Check Rental Fit',
      brochureActionLabel: hasBrochure ? 'Download Rental Pack' : 'Request Rental Pack',
      contactActionLabel: 'Contact Leasing Team',
      trustSignals: [
        'Rental fit estimate available',
        'No obligation to enquire',
        `${safeUnitTypeCount} rental unit types available`,
      ],
    };
  }

  if (normalizedTransactionType === 'auction') {
    return {
      headline: 'Check bidder readiness and request auction details.',
      qualificationTitle: 'Bidder Readiness Check',
      qualificationHelp: 'Enter your monthly household income',
      depositLabel: 'Available deposit or cash contribution',
      depositPlaceholder: 'Deposit or cash contribution',
      primaryActionLabel: 'Check Bidder Readiness',
      brochureActionLabel: hasBrochure ? 'Download Auction Pack' : 'Request Auction Pack',
      contactActionLabel: 'Contact Auction Team',
      trustSignals: [
        'Bidder readiness estimate available',
        'Auction interest stays obligation-free',
        `${safeUnitTypeCount} auction unit types available`,
      ],
    };
  }

  return {
    headline: 'Check affordability and take the next step.',
    qualificationTitle: 'Quick Qualification Check',
    qualificationHelp: 'Enter your monthly household income',
    depositLabel: 'Optional deposit',
    depositPlaceholder: 'Optional deposit',
    primaryActionLabel: 'Start Full Qualification',
    brochureActionLabel: hasBrochure ? 'Download Brochure' : 'Request Brochure',
    contactActionLabel: 'Contact Sales Team',
    trustSignals: [
      'Free pre-qualification available',
      'No obligation to enquire',
      `${safeUnitTypeCount} unit types available`,
    ],
  };
}

function DevelopmentActionPanel({
  developmentName,
  transactionType,
  inputId,
  quickIncome,
  onQuickIncomeChange,
  quickDeposit,
  onQuickDepositChange,
  quickQualification,
  brochureUrl,
  unitTypeCount,
  onStartQualification,
  onDownloadBrochure,
  onContactSales,
}: DevelopmentActionPanelProps) {
  const copy = getDevelopmentDetailActionPanelCopy(
    transactionType,
    unitTypeCount,
    Boolean(brochureUrl),
  );

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <CardContent className="p-0">
        <div className="bg-slate-950 px-5 py-5 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-200">
            Interested in {developmentName}?
          </p>
          <h3 className="mt-2 text-lg font-bold">{copy.headline}</h3>
        </div>

        <div className="space-y-4 p-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {copy.qualificationTitle}
                </p>
                <p className="mt-1 text-xs text-slate-600">{copy.qualificationHelp}</p>
              </div>
              <Badge
                variant="outline"
                className="border-orange-200 bg-orange-50 text-[11px] text-orange-700"
              >
                60 sec
              </Badge>
            </div>

            <div className="mt-3">
              <label htmlFor={inputId} className="sr-only">
                Monthly household income
              </label>
              <div className="flex rounded-xl border border-slate-200 bg-white shadow-sm">
                <span className="flex items-center px-3 text-sm font-semibold text-slate-500">
                  R
                </span>
                <input
                  id={inputId}
                  type="text"
                  inputMode="numeric"
                  placeholder="45 000"
                  value={quickIncome}
                  onChange={e => onQuickIncomeChange(e.target.value)}
                  className="h-11 w-full rounded-r-xl border-0 bg-transparent px-0 pr-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="mt-3">
              <label htmlFor={`${inputId}-deposit`} className="sr-only">
                {copy.depositLabel}
              </label>
              <div className="flex rounded-xl border border-slate-200 bg-white shadow-sm">
                <span className="flex items-center px-3 text-sm font-semibold text-slate-500">
                  R
                </span>
                <input
                  id={`${inputId}-deposit`}
                  type="text"
                  inputMode="numeric"
                  placeholder={copy.depositPlaceholder}
                  value={quickDeposit}
                  onChange={e => onQuickDepositChange(e.target.value)}
                  className="h-10 w-full rounded-r-xl border-0 bg-transparent px-0 pr-3 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">{copy.depositLabel}</p>
            </div>

            {quickQualification ? (
              <div
                className={`mt-3 rounded-xl border p-3 ${
                  quickQualification.tone === 'success'
                    ? 'border-emerald-200 bg-emerald-50'
                    : quickQualification.tone === 'warning'
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-slate-200 bg-white'
                }`}
              >
                <p className="text-xs font-semibold text-slate-900">
                  {quickQualification.headline}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                  {quickQualification.body}
                </p>
              </div>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Button
              className="h-10 bg-orange-500 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
              onClick={onStartQualification}
            >
              {copy.primaryActionLabel}
            </Button>
            <Button
              variant="outline"
              className="h-10 border-blue-200 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              onClick={onDownloadBrochure}
            >
              {copy.brochureActionLabel}
            </Button>
            <Button
              variant="ghost"
              className="h-9 text-xs font-medium text-slate-600 hover:text-slate-900"
              onClick={onContactSales}
            >
              {copy.contactActionLabel}
            </Button>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-[11px] text-slate-600">
            {copy.trustSignals.map(signal => (
              <div key={signal} className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                {signal}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DevelopmentDetail() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxTitle, setLightboxTitle] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [quickIncome, setQuickIncome] = useState('');
  const [quickDeposit, setQuickDeposit] = useState('');
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [leadDialogMode, setLeadDialogMode] = useState<
    'brochure' | 'contact' | 'qualification' | 'info'
  >('qualification');
  const [leadDialogLocation, setLeadDialogLocation] = useState('unknown');
  const [activeLeadUnit, setActiveLeadUnit] = useState<any | null>(null);
  const [activeAmenityTab, setActiveAmenityTab] = useState<AmenityTabKey | ''>('');
  const amenityTabsRef = useRef<HTMLDivElement | null>(null);
  const [canScrollAmenityLeft, setCanScrollAmenityLeft] = useState(false);
  const [canScrollAmenityRight, setCanScrollAmenityRight] = useState(false);
  const heroSentinelRef = useRef<HTMLDivElement | null>(null);
  const [showQuickNav, setShowQuickNav] = useState(false);

  // Parse helpers
  const parseJSON = (val: any) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  const normalizeAmenities = (input: unknown): string[] => {
    if (!input) return [];
    if (Array.isArray(input)) return input.map(item => String(item ?? '').trim()).filter(Boolean);
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed))
          return parsed.map(item => String(item ?? '').trim()).filter(Boolean);
      } catch {
        // fall through to comma-separated support
      }
      return trimmed
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
    }
    if (typeof input === 'object') {
      const obj = input as { amenities?: unknown; items?: unknown };
      const list = obj.amenities ?? obj.items;
      if (Array.isArray(list)) {
        return list.map(item => String(item ?? '').trim()).filter(Boolean);
      }
    }
    return [];
  };

  // Lightbox handler
  const openLightbox = (index: number, title: string) => {
    setLightboxIndex(index);
    setLightboxTitle(title);
    setLightboxOpen(true);
  };

  const openLeadDialog = (
    mode: 'brochure' | 'contact' | 'qualification' | 'info',
    ctaLocation: string,
    unit: any | null = null,
  ) => {
    setLeadDialogMode(mode);
    setLeadDialogLocation(ctaLocation);
    setActiveLeadUnit(unit);
    setLeadDialogOpen(true);
    trackCTAClick({
      ctaLabel:
        mode === 'brochure'
          ? 'Download Brochure'
          : mode === 'contact'
            ? 'Contact Sales Team'
            : mode === 'qualification'
              ? 'Start Qualification'
              : 'Request Information',
      ctaLocation,
      ctaHref: typeof window !== 'undefined' ? window.location.href : '',
    });
  };

  const navigateToQualification = (ctaLocation: string) => {
    const params = new URLSearchParams();
    if (parsedQuickIncome > 0) params.set('income', `${parsedQuickIncome}`);
    if (quickDepositAmount > 0) params.set('deposit', `${quickDepositAmount}`);
    const query = params.toString() ? `?${params.toString()}` : '';
    trackCTAClick({
      ctaLabel: 'Check If You Qualify',
      ctaLocation,
      ctaHref:
        typeof window !== 'undefined'
          ? `${window.location.origin}/development/${slug}/qualification${query}`
          : `/development/${slug}/qualification${query}`,
    });
    trackFunnelStep({
      funnel: 'development_detail',
      step: 'qualification_entry',
      action: 'start',
      path: ctaLocation,
    });
    setLocation(`/development/${slug}/qualification${query}`);
  };

  const handleUnitCallback = (unit: any) => {
    openLeadDialog('contact', `unit_card_${unit.id}_callback`, unit);
  };

  const handleUnitInformation = (unit: any) => {
    openLeadDialog('info', `unit_card_${unit.id}_info`, unit);
  };

  const handleUnitFloorPlan = (unit: any) => {
    trackCTAClick({
      ctaLabel: 'View Plan & Details',
      ctaLocation: `unit_card_${unit.id}_floor_plan`,
      ctaHref:
        typeof window !== 'undefined'
          ? `${window.location.origin}/development/${slug || ''}/unit/${getDevelopmentUnitRouteKey(unit)}`
          : `/development/${slug || ''}/unit/${getDevelopmentUnitRouteKey(unit)}`,
    });
    setLocation(`/development/${slug || ''}/unit/${getDevelopmentUnitRouteKey(unit)}`);
  };

  // Fetch real development by slug or ID
  const { data: dev, isLoading } = trpc.developer.getPublicDevelopmentBySlug.useQuery(
    { slugOrId: slug || '' },
    { enabled: !!slug },
  );

  console.log('[DevelopmentDetail] dev =', dev);
  console.log('[DevelopmentDetail] dev.developer =', dev?.developer);
  console.log('[DevelopmentDetail] dev.publisher =', (dev as any)?.publisher);
  console.log('[DevelopmentDetail] dev.brandProfile =', (dev as any)?.brandProfile);

  // Fetch other developments from same developer
  const { data: allDevelopments } = trpc.developer.listPublicDevelopments.useQuery(
    { limit: 50 },
    { enabled: !!dev?.id },
  );

  const amenityList = normalizeAmenities(dev?.amenities);
  const amenityGroups = buildDevelopmentDetailAmenityGroups(amenityList);
  const amenityTabs = [
    ...AMENITY_CATEGORIES.map(category => ({
      key: category.key,
      label: category.label,
      count: amenityGroups[category.key]?.length ?? 0,
      icon: AMENITY_CATEGORY_ICONS[category.key],
    })).filter(tab => tab.count > 0),
    ...(amenityGroups.other.length > 0
      ? [
          {
            key: 'other' as AmenityTabKey,
            label: 'Other',
            count: amenityGroups.other.length,
            icon: AMENITY_CATEGORY_ICONS.other,
          },
        ]
      : []),
  ];
  const amenityTabKeys = amenityTabs.map(tab => tab.key);

  useEffect(() => {
    if (amenityTabKeys.length === 0) return;
    if (!amenityTabKeys.includes(activeAmenityTab as AmenityTabKey)) {
      setActiveAmenityTab(amenityTabKeys[0]);
    }
  }, [activeAmenityTab, amenityTabKeys]);

  useEffect(() => {
    const container = amenityTabsRef.current;
    if (!container) return;

    const updateScrollState = () => {
      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      setCanScrollAmenityLeft(container.scrollLeft > 0);
      setCanScrollAmenityRight(container.scrollLeft < maxScrollLeft - 1);
    };

    updateScrollState();

    const handleResize = () => updateScrollState();
    const handleScroll = () => updateScrollState();

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [amenityTabs.length]);

  useEffect(() => {
    const container = amenityTabsRef.current;
    if (!container) return;
    const activeTab = container.querySelector('[data-state="active"]') as HTMLElement | null;
    if (!activeTab) return;

    window.requestAnimationFrame(() => {
      activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
  }, [activeAmenityTab]);

  useEffect(() => {
    const sentinel = heroSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        setShowQuickNav(entry ? !entry.isIntersecting : false);
      },
      { root: null, threshold: 0 },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!dev) {
    return (
      <div className="min-h-screen bg-slate-50">
        <ListingNavbar />
        <div className="container mx-auto px-4 pt-24 pb-12 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Development Not Found</h2>
            <p className="text-gray-600 mt-2">
              The development you are looking for does not exist or has been removed.
            </p>
            <Button className="mt-4" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Get unit type label
  const getUnitTypeLabel = (unitTypes: any[]) => {
    if (!unitTypes || unitTypes.length === 0) return '-';
    if (unitTypes.length === 1) {
      const name = unitTypes[0]?.name;
      return name ? String(name) : '1 Unit Type';
    }
    return `${unitTypes.length} Types`;
  };

  const parseOwnershipTypes = (value: unknown): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
      } catch {
        return [value];
      }
    }
    return [];
  };

  const getOwnershipLabel = (devData: any, estate: any) => {
    if (devData?.ownershipType) return formatLabel(devData.ownershipType);
    const ownershipTypes = parseOwnershipTypes(devData?.ownershipTypes);
    if (ownershipTypes.length === 1) return formatLabel(ownershipTypes[0]);
    if (ownershipTypes.length > 1) return 'Multiple';
    if (estate?.ownershipType) return formatLabel(estate.ownershipType);
    return '-';
  };

  // 1. RAW DATA EXTRACTION
  const mediaBuckets = getDevelopmentDetailMediaBuckets(dev);
  const rawImages = mediaBuckets.images;
  const rawVideos = mediaBuckets.videos;
  const rawFloorPlans = mediaBuckets.floorPlans;

  // 2. NORMALIZE TO CANONICAL TYPES
  // Convert DB format to our typed ImageMedia/VideoMedia
  const normalizeImage = (img: any): any => {
    // Using any temporarily to bridge types, verified below
    if (typeof img === 'string') {
      return { url: resolveMediaUrl(img), category: 'featured' };
    }

    const candidate = img?.url ?? img?.key ?? img?.src ?? null;
    return {
      url: typeof candidate === 'string' ? resolveMediaUrl(candidate) : null,
      category: img?.category || 'general',
      isPrimary: img?.isPrimary,
    };
  };

  const normalizeVideo = (v: any) => (typeof v === 'string' ? { url: v } : v);
  const normalizeFloorPlan = (fp: any) => {
    if (typeof fp === 'string') {
      return { url: resolveMediaUrl(fp) };
    }
    const candidate = fp?.url ?? fp?.key ?? fp?.src ?? null;
    return { url: typeof candidate === 'string' ? resolveMediaUrl(candidate) : null };
  };

  const normalizedImages = rawImages.map(normalizeImage);
  const normalizedVideos = rawVideos.map(normalizeVideo);
  const normalizedFloorPlans = rawFloorPlans
    .map(normalizeFloorPlan)
    .filter((fp: any) => typeof fp?.url === 'string' && fp.url.length > 0);

  // Create the Data Object
  const mediaData: DevelopmentMedia = {
    featuredImage: normalizedImages.find((img: any) => img.isPrimary) || normalizedImages[0],
    images: normalizedImages,
    videos: normalizedVideos,
  };

  // 3. APPLY CANONICAL LOGIC (Pure Decisions)
  // 3. APPLY CANONICAL LOGIC (Pure Decisions)
  const heroMedia = getDevelopmentHeroMedia(mediaData);
  const galleryImages = buildDevelopmentGalleryImages(mediaData);

  // Bento Tiles
  const amenityTile = getDevelopmentAmenityTileImage(mediaData);
  const outdoorTile = getDevelopmentOutdoorsTileImage(mediaData);
  const viewGalleryTile = getDevelopmentViewGalleryTileImage(mediaData);

  // Missing declaration restoration
  const floorPlans: any[] = normalizedFloorPlans;
  const amenities = amenityList;
  const units = dev.unitTypes || [];

  // Parse estateSpecs for ownership type
  const estateSpecs = (() => {
    if (!dev.estateSpecs) return {};
    if (typeof dev.estateSpecs === 'object') return dev.estateSpecs;
    try {
      return JSON.parse(dev.estateSpecs);
    } catch (e) {
      return {};
    }
  })();

  // Calculate sales metrics from unit types
  const fallbackSales = (() => {
    const unitTypes = dev.unitTypes || [];
    const totals = unitTypes.reduce(
      (acc: any, u: any) => {
        const summary = calculateInventorySummary(u);
        acc.total += summary.total;
        acc.available += summary.available;
        acc.reserved += summary.reserved;
        return acc;
      },
      { total: 0, available: 0, reserved: 0 },
    );

    let totalUnits = totals.total;
    let availableUnits = totals.available;
    let reservedUnits = totals.reserved;

    if (totalUnits <= 0) {
      totalUnits = Number(dev.totalUnits || 0);
      availableUnits = Number(
        dev.availableUnits !== undefined && dev.availableUnits !== null
          ? dev.availableUnits
          : totalUnits,
      );
      reservedUnits = Number((dev as any).reservedUnits || 0);
    }

    const summary = calculateInventorySummary({
      totalUnits,
      availableUnits,
      reservedUnits,
    });

    return {
      soldPct: summary.soldPct,
      total: summary.total,
      available: summary.available,
      reserved: summary.reserved,
      sold: summary.sold,
    };
  })();
  const salesFromApi = dev.salesMetrics
    ? {
        soldPct: dev.salesMetrics.soldPct,
        total: dev.salesMetrics.totalUnits ?? dev.salesMetrics.total ?? 0,
        available: dev.salesMetrics.availableUnits ?? dev.salesMetrics.available ?? 0,
        reserved: dev.salesMetrics.reservedUnits ?? dev.salesMetrics.reserved ?? 0,
        sold: dev.salesMetrics.soldUnits ?? dev.salesMetrics.sold ?? 0,
      }
    : null;
  const sales = salesFromApi ?? fallbackSales;

  // ✅ Prefer publisher / brand profile over legacy developer
  const publisher =
    (dev as any).publisher ||
    (dev as any).brandProfile ||
    (dev as any).developerBrandProfile ||
    null;

  // ... (Update development object)
  const unifiedMediaRaw = [
    ...galleryImages.map(img => ({ url: img.url, type: 'image' as const })),
    ...normalizedVideos
      .map((video: any) => ({ url: video?.url, type: 'video' as const }))
      .filter(item => !!item.url),
    ...floorPlans.map((fp: any) => ({ url: fp?.url, type: 'image' as const })),
  ];
  const unifiedMedia = (() => {
    const seen = new Set<string>();
    return unifiedMediaRaw.filter(item => {
      if (!item?.url) return false;
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  })();

  const findUnifiedMediaIndex = (urls: string[]) => {
    if (urls.length === 0) return 0;
    const index = unifiedMedia.findIndex(item => urls.includes(item.url));
    return index === -1 ? 0 : index;
  };

  const galleryIndices = {
    general: 0,
    amenities: getGalleryStartIndex(galleryImages, 'amenities'),
    outdoors: getGalleryStartIndex(galleryImages, 'outdoors'),
    videos: findUnifiedMediaIndex(
      normalizedVideos.map((video: any) => video?.url).filter((url): url is string => !!url),
    ),
    floorPlans: findUnifiedMediaIndex(
      floorPlans.map((plan: any) => plan?.url).filter((url): url is string => !!url),
    ),
  };

  const development = {
    // ... existing fields ...
    id: dev.id,
    name: dev.name,

    // ✅ Publisher-first developer identity
    developer: publisher?.name || dev.developer?.name || 'Unknown Developer',
    developerLogo: publisher?.logoUrl || publisher?.logo || dev.developer?.logo || null,
    developerDescription:
      publisher?.description ||
      dev.developer?.description ||
      'Professional property developer committed to quality and excellence.',
    developerWebsite: publisher?.websiteUrl || publisher?.website || dev.developer?.website || null,
    developerSlug: publisher?.slug || dev.developer?.slug || null,

    location: `${dev.suburb ? dev.suburb + ', ' : ''}${dev.city}`,
    address: dev.address || '',
    description: dev.description || '',
    completionDate: dev.completionDate ? new Date(dev.completionDate).toLocaleDateString() : null,
    totalUnits: dev.totalUnits || 0,
    availableUnits: dev.availableUnits || 0,
    startingPrice: Number(dev.priceFrom) || 0,
    developmentType: dev.developmentType || 'residential',
    status: dev.status,

    // Media Props
    heroMedia: heroMedia,
    galleryImages: galleryImages,

    // Tiles
    amenityTile: amenityTile,
    outdoorTile: outdoorTile,
    viewGalleryTile: viewGalleryTile,

    // Counts & Lists
    totalPhotos: galleryImages.length,
    totalVideos: normalizedVideos.length,
    videoList: normalizedVideos,
    floorPlans: floorPlans, // Kept separate for now

    indices: galleryIndices,
    amenities: amenities,
    isVerified: Boolean(
      (dev.developerDisplay as any)?.isVerified ||
        publisher?.isVerified ||
        publisher?.verified ||
        dev.developer?.isVerified ||
        dev.developer?.verified,
    ),

    // CRITICAL: Ensure we rely on unitTypes, not mixed sources
    units: units.map((u: any) => {
      const rawOwnership = u.ownershipType;
      const estateOwnership = (estateSpecs as any)?.ownershipType;
      const structural = u.structuralType || u.type;
      const inferred = inferOwnership(structural);
      const finalLabel = formatLabel(rawOwnership || estateOwnership || inferred);

      return {
        ...u,
        normalizedImage: getDevelopmentUnitMedia(u, {
          fallbackImageUrl: heroMedia?.type === 'image' ? heroMedia.image?.url : undefined,
        }).primaryImageUrl,
        normalizedOwnership: finalLabel,
        normalizedType: formatLabel(u.structuralType || u.type || 'Apartment'),
        floorSize: u.unitSize,
        landSize: u.erfSize || u.yardSize,
      };
    }),

    unifiedMedia: unifiedMedia,
  };

  const brochureUrl = (() => {
    const brochureItems = mediaBuckets.brochures;
    for (const item of brochureItems) {
      const url = resolveDocumentUrl(item);
      if (url) return url;
    }
    return null;
  })();

  const detailPricing = getDevelopmentDetailPricingContext(dev, development.units || []);
  const commercialPack = getDevelopmentDetailCommercialPack(dev, development.units || [], {
    hasBrochure: !!brochureUrl,
  });
  const transactionJourney = getDevelopmentDetailTransactionJourney(dev, development.units || [], {
    hasBrochure: !!brochureUrl,
  });
  const trustPreview = getDevelopmentDetailTrustPreview(dev, development.units || [], {
    hasBrochure: !!brochureUrl,
    isVerified: development.isVerified,
  });
  const developmentHighlights = getDevelopmentDetailHighlights(dev);
  const derivedPriceFrom = detailPricing.priceFrom;
  const priceToDisplay = detailPricing.priceTo;
  const estimatedRepaymentFrom = detailPricing.paymentAmount;
  const minimumIncomeRequired = detailPricing.minimumIncome;

  const normalizedStatus = dev.status ? formatLabel(dev.status) : 'Now Selling';
  const normalizedCompletionDate = development.completionDate || 'Completion TBC';

  const parsedQuickIncome = Number(quickIncome.replace(/[^\d.]/g, ''));
  const parsedQuickDeposit = Number(quickDeposit.replace(/[^\d.]/g, ''));
  const hasQuickIncome = Number.isFinite(parsedQuickIncome) && parsedQuickIncome > 0;
  const quickDepositAmount =
    Number.isFinite(parsedQuickDeposit) && parsedQuickDeposit > 0 ? parsedQuickDeposit : 0;
  const quickQualification: QuickQualificationState | null = (() => {
    if (!hasQuickIncome) return null;

    const maxMonthlyRepayment = parsedQuickIncome / QUICK_QUALIFICATION_PAYMENT_RATIO;
    const baseAffordable = Math.round(
      calculateAffordablePrice(
        maxMonthlyRepayment,
        DEFAULT_DEPOSIT_PERCENTAGE,
        SA_PRIME_RATE,
        DEFAULT_BOND_TERM_YEARS,
      ),
    );
    const maxAffordable = Math.round(baseAffordable + quickDepositAmount);
    const comparisonCapacity =
      detailPricing.transactionType === 'rent' ? maxMonthlyRepayment : maxAffordable;
    const comfortFloor = Math.max(Math.round(comparisonCapacity * 0.85), 0);
    const qualifies = comparisonCapacity >= derivedPriceFrom;
    const nearQualify = !qualifies && comparisonCapacity >= derivedPriceFrom * 0.9;
    const depositNote =
      quickDepositAmount > 0 ? ` Includes ${formatSARandShort(quickDepositAmount)} deposit.` : '';
    const priceNoun =
      detailPricing.transactionType === 'rent'
        ? 'rental homes'
        : detailPricing.transactionType === 'auction'
          ? 'auction units'
          : 'homes';
    const capacityLabel =
      detailPricing.transactionType === 'rent' ? 'monthly rent capacity' : 'buying power';
    const startLabel =
      detailPricing.transactionType === 'rent'
        ? 'rent starts from'
        : detailPricing.transactionType === 'auction'
          ? 'bidding starts from'
          : 'homes here start from';

    if (qualifies) {
      return {
        tone: 'success' as const,
        buyingPower: comparisonCapacity,
        comfortFloor,
        headline: `You likely qualify for ${priceNoun} in ${development.name}`,
        body: `Estimated ${capacityLabel} up to ${formatSARandShort(comparisonCapacity)}. ${startLabel.charAt(0).toUpperCase() + startLabel.slice(1)} ${formatSARandShort(derivedPriceFrom)}.${depositNote}`,
      };
    }

    if (nearQualify) {
      return {
        tone: 'warning' as const,
        buyingPower: comparisonCapacity,
        comfortFloor,
        headline: 'You may be close to qualifying',
        body: `Estimated ${capacityLabel} is around ${formatSARandShort(comparisonCapacity)}. A higher qualifying income or joint application could improve fit.${depositNote}`,
      };
    }

    return {
      tone: 'muted' as const,
      buyingPower: comparisonCapacity,
      comfortFloor,
      headline: 'This development may be above your current range',
      body: `Estimated ${capacityLabel} is around ${formatSARandShort(comparisonCapacity)}. Start full qualification to explore next-best options.${depositNote}`,
    };
  })();

  const relatedPublicDevelopments = ((allDevelopments || []) as any[]).filter((entry: any) => {
    if (!entry || Number(entry.id) === Number(dev.id)) return false;

    const entryBrandId = Number(entry.developerBrandProfileId || entry.brandProfileId || 0);
    if (
      (dev as any).developerBrandProfileId &&
      entryBrandId === Number((dev as any).developerBrandProfileId)
    ) {
      return true;
    }

    if (dev.developer?.id && Number(entry.developerId || 0) === Number(dev.developer.id)) {
      return true;
    }

    if (entry.builderName && entry.builderName === development.developer) {
      return true;
    }

    return false;
  });

  const developerProjectCount =
    relatedPublicDevelopments.length > 0 ? relatedPublicDevelopments.length + 1 : null;

  return (
    <>
      <MetaControl
        title={`${development.name} | ${development.developer}`}
        description={development.description}
        image={
          development.heroMedia.type === 'image' ? development.heroMedia.image?.url : undefined
        }
      />

      <div className="min-h-screen bg-slate-50 pb-32 md:pb-20">
        <ListingNavbar />

        <div className="pt-24 pb-4 container max-w-7xl mx-auto px-4">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: development.location, href: '#' },
              { label: development.name, href: `/development/${development.id}` },
            ]}
          />
        </div>

        {/* Gallery Section - CRITICAL: Isolated container with overflow control */}
        <div className="w-full bg-white border-b border-slate-200">
          <div className="container max-w-7xl mx-auto px-4 py-4">
            {/* IMPORTANT: Wrapper to contain gallery overflow */}
            <div className="relative w-full overflow-hidden">
              <DevelopmentGallery
                featuredMedia={development.heroMedia}
                amenityTileImage={development.amenityTile}
                outdoorsTileImage={development.outdoorTile}
                viewGalleryTileImage={development.viewGalleryTile}
                totalPhotos={development.totalPhotos}
                totalVideos={development.totalVideos}
                videoList={development.videoList}
                floorPlans={development.floorPlans}
                indices={development.indices}
                onOpenLightbox={(index, title) => openLightbox(index, title)}
              />
            </div>
          </div>
        </div>

        <div ref={heroSentinelRef} className="h-px w-full" aria-hidden />

        {/* Quick Info Section - ABOVE SectionNav */}
        <div className="w-full bg-white border-b border-slate-200">
          <div className="container max-w-7xl mx-auto px-4 py-6">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-6">
                {/* Quick Stats */}
                <section id="overview" className="w-full">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard
                      icon={Home}
                      label="Type"
                      value={formatLabel(dev.developmentType)}
                      color="blue"
                    />
                    <StatCard icon={Check} label="Status" value={normalizedStatus} color="green" />
                    <StatCard
                      icon={Home}
                      label="Ownership"
                      value={getOwnershipLabel(dev, estateSpecs)}
                      color="purple"
                    />
                    <StatCard
                      icon={LayoutGrid}
                      label="Unit Types"
                      value={getUnitTypeLabel(dev.unitTypes || [])}
                      color="orange"
                    />
                  </div>
                </section>

                {/* Overview Card */}
                <DevelopmentOverviewCard
                  priceFrom={derivedPriceFrom}
                  priceTo={priceToDisplay}
                  monthlyRepayment={estimatedRepaymentFrom}
                  minimumIncome={minimumIncomeRequired}
                  priceLabel={detailPricing.priceLabel}
                  repaymentLabel={detailPricing.repaymentLabel}
                  incomeLabel={detailPricing.incomeLabel}
                  repaymentSuffix={detailPricing.repaymentSuffix}
                  estimationNote={detailPricing.estimationNote}
                  completionDate={normalizedCompletionDate}
                  constructionStatus={normalizedStatus}
                  salesMetrics={sales}
                />

                <div className="lg:hidden">
                  <DevelopmentActionPanel
                    developmentName={development.name}
                    transactionType={detailPricing.transactionType}
                    inputId="hero-quick-income"
                    quickIncome={quickIncome}
                    onQuickIncomeChange={setQuickIncome}
                    quickDeposit={quickDeposit}
                    onQuickDepositChange={setQuickDeposit}
                    quickQualification={quickQualification}
                    brochureUrl={brochureUrl}
                    unitTypeCount={dev.unitTypes?.length || 0}
                    onStartQualification={() => navigateToQualification('hero_action_panel')}
                    onDownloadBrochure={() => openLeadDialog('brochure', 'hero_action_panel')}
                    onContactSales={() => openLeadDialog('contact', 'hero_action_panel')}
                  />
                </div>
              </div>

              {/* Right Column - Conversion Action Panel */}
              <div className="hidden w-full lg:w-[360px] h-full self-stretch space-y-4">
                <Card className="shadow-sm border-slate-200 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="bg-slate-950 px-5 py-5 text-white">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-200">
                        Interested in {development.name}?
                      </p>
                      <h3 className="mt-2 text-xl font-bold">
                        Check fit, get the brochure, or talk to sales.
                      </h3>
                      <p className="mt-2 text-sm text-slate-300">
                        Check affordability, request the brochure, or contact the sales team.
                      </p>
                    </div>

                    <div className="space-y-5 p-5">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                              Quick Qualification Check
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              Enter your monthly household income
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-orange-200 bg-orange-50 text-orange-700"
                          >
                            60 sec
                          </Badge>
                        </div>

                        <div className="mt-4">
                          <label htmlFor="quick-income" className="sr-only">
                            Monthly household income
                          </label>
                          <div className="flex rounded-xl border border-slate-200 bg-white shadow-sm">
                            <span className="flex items-center px-3 text-sm font-semibold text-slate-500">
                              R
                            </span>
                            <input
                              id="quick-income"
                              type="text"
                              inputMode="numeric"
                              placeholder="45 000"
                              value={quickIncome}
                              onChange={e => setQuickIncome(e.target.value)}
                              className="h-12 w-full rounded-r-xl border-0 bg-transparent px-0 pr-3 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                            />
                          </div>
                        </div>

                        {quickQualification ? (
                          <div
                            className={`mt-4 rounded-xl border p-4 ${
                              quickQualification.tone === 'success'
                                ? 'border-emerald-200 bg-emerald-50'
                                : quickQualification.tone === 'warning'
                                  ? 'border-amber-200 bg-amber-50'
                                  : 'border-slate-200 bg-white'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`mt-0.5 rounded-full p-1.5 ${
                                  quickQualification.tone === 'success'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : quickQualification.tone === 'warning'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm font-semibold text-slate-900">
                                  {quickQualification.headline}
                                </p>
                                <p className="text-sm text-slate-600">{quickQualification.body}</p>
                                <p className="text-xs font-medium text-slate-500">
                                  Estimated affordability range{' '}
                                  {formatSARandShort(quickQualification.comfortFloor)} -{' '}
                                  {formatSARandShort(quickQualification.buyingPower)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white p-4">
                            <p className="text-sm font-medium text-slate-700">
                              Check whether{' '}
                              {detailPricing.transactionType === 'rent'
                                ? 'rentals'
                                : detailPricing.transactionType === 'auction'
                                  ? 'auction units'
                                  : 'homes'}{' '}
                              from {formatSARandShort(derivedPriceFrom)} fit your income.
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Estimated with a 10% deposit and a 20-year bond term.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        <Button
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white h-11 text-sm font-semibold shadow-sm"
                          onClick={() => navigateToQualification('hero_action_panel')}
                        >
                          <ArrowUpRight className="mr-2 h-4 w-4" />
                          Check If You Qualify
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full h-11 border-blue-200 text-blue-700 hover:bg-blue-50 text-sm font-medium"
                          onClick={() => openLeadDialog('brochure', 'hero_action_panel')}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          {brochureUrl ? 'Download Brochure' : 'Request Brochure'}
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full h-11 border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium"
                          onClick={() => openLeadDialog('contact', 'hero_action_panel')}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Contact Sales Team
                        </Button>
                      </div>

                      <div className="grid gap-2 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Free pre-qualification available
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          No obligation to enquire
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          {dev.unitTypes?.length || 0} unit types available
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200">
                  <CardContent className="p-3 h-full flex flex-col">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                        {development.developerLogo ? (
                          <img
                            src={development.developerLogo}
                            alt={development.developer}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Building2 className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-900 truncate">
                          {development.developer}
                        </p>
                        {development.isVerified && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Award className="w-3 h-3 text-orange-500 flex-shrink-0" />
                            <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide">
                              Verified Developer
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 mb-2 leading-relaxed line-clamp-2">
                      {development.developerDescription}
                    </p>

                    {development.developerWebsite && (
                      <a
                        href={development.developerWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline mb-3"
                      >
                        <Globe className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">Visit Website</span>
                      </a>
                    )}

                    <Separator className="bg-slate-100 my-2" />

                    {(() => {
                      const otherProjects = relatedPublicDevelopments.slice(0, 3);

                      if (otherProjects.length === 0) return null;

                      return (
                        <div>
                          <p className="text-[10px] font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <Briefcase className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            Other Projects
                          </p>
                          <div className="space-y-1 pl-1 border-l-2 border-slate-100">
                            {otherProjects.map((project: any) => (
                              <a
                                key={project.id}
                                href={`/development/${project.slug}`}
                                className="text-xs text-slate-600 pl-2 hover:text-blue-600 transition-colors block truncate"
                              >
                                {project.name}
                              </a>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    <Button
                      variant="link"
                      className="p-0 h-auto text-blue-600 mt-auto pt-2 text-xs font-medium"
                    >
                      View Developer Profile →
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {showQuickNav && <div className="h-16" aria-hidden />}

        {/* Section Navigation - Fixed only after hero */}
        <div
          className={`bg-white border-b border-slate-200 shadow-sm h-16 ${
            showQuickNav ? 'fixed top-0 left-0 right-0 z-[999]' : 'relative'
          }`}
        >
          <div className="container max-w-7xl mx-auto h-16 flex items-center">
            <SectionNav />
          </div>
        </div>

        {/* Main Content Area - BELOW SectionNav */}
        <div className="w-full py-8">
          <div className="container max-w-7xl mx-auto px-4">
            {/* CRITICAL: Grid with proper gap, no negative margins */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
              {/* Main Content Column - No nested containers */}
              <main className="w-full min-w-0 space-y-8">
                {/* About Section */}
                <section className="w-full">
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                      <CardTitle className="font-bold text-slate-900">
                        About {development.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div
                        className={`text-slate-600 leading-relaxed whitespace-pre-line overflow-hidden transition-all duration-300 ${isExpanded ? '' : 'line-clamp-6'}`}
                      >
                        {development.description ||
                          'Experience luxury living in this exclusive new development. Providing state-of-the-art amenities and modern architectural design, this is the perfect place to call home.'}
                      </div>
                      <Button
                        variant="link"
                        className="p-0 h-auto text-blue-600 font-medium mt-4 hover:text-blue-700"
                        onClick={() => setIsExpanded(!isExpanded)}
                      >
                        {isExpanded ? 'Show Less' : 'Read Full Description'}
                      </Button>
                    </CardContent>
                  </Card>
                </section>

                <Separator className="bg-slate-200" />

                {developmentHighlights.length > 0 && (
                  <>
                    <section id="market-highlights" className="w-full">
                      <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                          <CardTitle className="font-bold text-slate-900">
                            Market Highlights
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {developmentHighlights.slice(0, 8).map(highlight => (
                              <div
                                key={highlight}
                                className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
                              >
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                <span className="text-sm font-medium leading-6 text-slate-700">
                                  {highlight}
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </section>

                    <Separator className="bg-slate-200" />
                  </>
                )}

                <section id="commercial-pack" className="w-full">
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                            {commercialPack.eyebrow}
                          </p>
                          <CardTitle className="mt-2 font-bold text-slate-900">
                            {commercialPack.title}
                          </CardTitle>
                        </div>
                        <Badge
                          variant="outline"
                          className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700"
                        >
                          Market ready signals
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <p className="max-w-3xl text-sm leading-6 text-slate-600">
                        {commercialPack.summary}
                      </p>

                      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {commercialPack.items.map(item => (
                          <div
                            key={`${item.label}-${item.value}`}
                            className="rounded-lg border border-slate-200 bg-white px-4 py-3"
                          >
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                              {item.label}
                            </p>
                            <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Package proof
                        </p>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {commercialPack.proofItems.map(item => (
                            <div
                              key={`${item.label}-${item.value}`}
                              className="flex items-start gap-3 rounded-md bg-white px-3 py-3"
                            >
                              <CheckCircle2
                                className={`mt-0.5 h-4 w-4 shrink-0 ${
                                  item.isReady ? 'text-emerald-600' : 'text-slate-400'
                                }`}
                              />
                              <div>
                                <p className="text-sm font-semibold text-slate-800">
                                  {item.label}
                                </p>
                                <p className="mt-0.5 text-xs leading-5 text-slate-600">
                                  {item.value}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                        <Button
                          className="bg-orange-500 text-white hover:bg-orange-600"
                          onClick={() => navigateToQualification('commercial_pack')}
                        >
                          <ArrowUpRight className="mr-2 h-4 w-4" />
                          {commercialPack.primaryActionLabel}
                        </Button>
                        <Button
                          variant="outline"
                          className="border-blue-200 text-blue-700 hover:bg-blue-50"
                          onClick={() => openLeadDialog('brochure', 'commercial_pack')}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          {commercialPack.secondaryActionLabel}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </section>

                <Separator className="bg-slate-200" />

                <section id="transaction-journey" className="w-full">
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                        {transactionJourney.eyebrow}
                      </p>
                      <CardTitle className="mt-2 font-bold text-slate-900">
                        {transactionJourney.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <p className="max-w-3xl text-sm leading-6 text-slate-600">
                        {transactionJourney.summary}
                      </p>

                      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
                        {transactionJourney.steps.map((step, index) => (
                          <div
                            key={`${step.label}-${index}`}
                            className="rounded-lg border border-slate-200 bg-white px-4 py-4"
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                                {index + 1}
                              </span>
                              <p className="text-sm font-semibold text-slate-900">{step.label}</p>
                            </div>
                            <p className="mt-3 text-xs leading-5 text-slate-600">{step.detail}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </section>

                <Separator className="bg-slate-200" />

                <section id="trust-preview" className="w-full">
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                        {trustPreview.eyebrow}
                      </p>
                      <CardTitle className="mt-2 font-bold text-slate-900">
                        {trustPreview.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <p className="max-w-3xl text-sm leading-6 text-slate-600">
                        {trustPreview.summary}
                      </p>

                      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {trustPreview.items.map(item => (
                          <div
                            key={`${item.label}-${item.value}`}
                            className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
                          >
                            <CheckCircle2
                              className={`mt-0.5 h-4 w-4 shrink-0 ${
                                item.isReady ? 'text-emerald-600' : 'text-slate-400'
                              }`}
                            />
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                              <p className="mt-1 text-xs leading-5 text-slate-600">
                                {item.value}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </section>

                <Separator className="bg-slate-200" />

                {/* Floor Plans Section - CRITICAL: Carousel overflow contained */}
                <section id="available-units" className="w-full">
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-slate-900">Available Units</h3>
                  </div>

                  {(() => {
                    // Use the normalized units from the development object
                    const allUnits = development.units || [];
                    const normalizedUnits = allUnits.map((u: any) => {
                      const bed = Number(u.bedrooms);
                      const hasBedroom = Number.isFinite(bed) && bed >= 0;
                      const bedroomKey = hasBedroom ? bed.toString() : 'other';
                      const bedroomLabel = hasBedroom ? `${bed}` : 'Other';
                      return {
                        ...u,
                        bedroomKey,
                        bedroomLabel,
                      };
                    });

                    if (normalizedUnits.length === 0) {
                      return (
                        <div className="w-full text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                          <Home className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                          <p className="text-slate-500 font-medium">
                            Detailed unit configurations coming soon.
                          </p>
                          <p className="text-xs text-slate-400">
                            Contact the developer for floor plans.
                          </p>
                        </div>
                      );
                    }

                    const bedroomGroups = new Map<string, { label: string; units: any[] }>();
                    normalizedUnits.forEach((u: any) => {
                      const key = u.bedroomKey;
                      if (!bedroomGroups.has(key)) {
                        bedroomGroups.set(key, {
                          label:
                            key === 'other'
                              ? 'Other / Studio / Unknown'
                              : `${u.bedroomLabel} Bedroom`,
                          units: [],
                        });
                      }
                      bedroomGroups.get(key)!.units.push(u);
                    });
                    const orderedKeys = Array.from(bedroomGroups.keys()).sort((a, b) => {
                      if (a === 'other') return 1;
                      if (b === 'other') return -1;
                      return Number(a) - Number(b);
                    });
                    const defaultTab = orderedKeys[0] || 'other';

                    return (
                      <Tabs defaultValue={defaultTab} className="w-full">
                        <TabsList className="bg-transparent p-0 flex flex-wrap gap-2 h-auto mb-6 justify-start">
                          {orderedKeys.map((key: string) => {
                            const unitsInGroup = bedroomGroups.get(key)?.units || [];
                            const types = Array.from(
                              new Set(unitsInGroup.map((u: any) => u.normalizedType)),
                            );

                            // Smart Group Labeling
                            let label = 'Apartments';
                            const lowerTypes = types.map((t: any) => t.toLowerCase());
                            if (
                              lowerTypes.every(
                                t =>
                                  t.includes('house') ||
                                  t.includes('simplex') ||
                                  t.includes('duplex'),
                              )
                            )
                              label = 'Houses';
                            else if (types.length === 1) label = `${types[0]}s`;

                            return (
                              <TabsTrigger
                                key={key}
                                value={key}
                                className="rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 shadow-sm transition-all"
                              >
                                {key === 'other' ? (
                                  'Other / Studio / Unknown'
                                ) : (
                                  <>
                                    {key} Bedroom{' '}
                                    <span className="ml-1 opacity-70 font-normal">{label}</span>
                                  </>
                                )}
                              </TabsTrigger>
                            );
                          })}
                        </TabsList>

                        {orderedKeys.map((key: string) => (
                          <TabsContent
                            key={key}
                            value={key}
                            className="mt-0 focus-visible:outline-none"
                          >
                            <UnitTypeCarousel
                              units={bedroomGroups.get(key)?.units || []}
                              transactionType={detailPricing.transactionType}
                              onRequestCallback={handleUnitCallback}
                              onRequestInformation={handleUnitInformation}
                              onOpenFloorPlan={handleUnitFloorPlan}
                            />
                          </TabsContent>
                        ))}
                      </Tabs>
                    );
                  })()}
                </section>

                {/* Specifications */}
                {(() => {
                  const hasEstateSpecs =
                    estateSpecs.ownershipType || estateSpecs.powerBackup || estateSpecs.waterSupply;

                  const specs: Array<{ icon: any; label: string; value: string }> = [];

                  if (hasEstateSpecs) {
                    if (estateSpecs.ownershipType) {
                      specs.push({
                        icon: Home,
                        label: 'Ownership Type',
                        value: formatLabel(estateSpecs.ownershipType),
                      });
                    }
                    if (estateSpecs.powerBackup && estateSpecs.powerBackup !== 'none') {
                      specs.push({
                        icon: Zap,
                        label: 'Power Backup',
                        value: formatLabel(estateSpecs.powerBackup),
                      });
                    }
                    if (estateSpecs.securityFeatures?.length > 0) {
                      const secCount = estateSpecs.securityFeatures.length;
                      specs.push({
                        icon: Shield,
                        label: 'Security',
                        value:
                          secCount > 2
                            ? `${secCount} Features`
                            : estateSpecs.securityFeatures.map(formatLabel).join(', '),
                      });
                    }
                    if (estateSpecs.waterSupply) {
                      specs.push({
                        icon: Droplets,
                        label: 'Water Supply',
                        value: formatLabel(estateSpecs.waterSupply),
                      });
                    }
                    if (estateSpecs.internetAccess && estateSpecs.internetAccess !== 'none') {
                      specs.push({
                        icon: Wifi,
                        label: 'Internet',
                        value: formatLabel(estateSpecs.internetAccess),
                      });
                    }
                    if (estateSpecs.flooring) {
                      specs.push({
                        icon: Layers,
                        label: 'Flooring',
                        value: formatLabel(estateSpecs.flooring),
                      });
                    }
                    if (estateSpecs.parkingType && estateSpecs.parkingType !== 'none') {
                      specs.push({
                        icon: Car,
                        label: 'Parking',
                        value: formatLabel(estateSpecs.parkingType),
                      });
                    }
                    if (estateSpecs.petFriendly) {
                      specs.push({
                        icon: CheckCircle2,
                        label: 'Pet Friendly',
                        value: formatLabel(estateSpecs.petFriendly),
                      });
                    }
                    if (estateSpecs.electricitySupply) {
                      specs.push({
                        icon: Zap,
                        label: 'Electricity',
                        value: formatLabel(estateSpecs.electricitySupply),
                      });
                    }
                  }

                  if (specs.length === 0) return null;

                  return (
                    <section id="specifications" className="w-full">
                      <Card className="shadow-sm border border-slate-200 bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                          <CardTitle className="font-bold text-slate-900">
                            Development Specifications
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {specs.map((spec, index) => {
                              const IconComponent = spec.icon;
                              return (
                                <div
                                  key={index}
                                  className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg"
                                >
                                  <IconComponent className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm text-slate-500">{spec.label}</p>
                                    <p className="font-semibold text-slate-900 capitalize">
                                      {spec.value}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </section>
                  );
                })()}

                {/* Amenities */}
                {development.amenities.length > 0 && (
                  <>
                    <Separator className="bg-slate-200" />
                    <section id="amenities" className="w-full">
                      <div className="mb-6">
                        <h3 className="text-2xl font-bold text-slate-900">Lifestyle & Features</h3>
                      </div>

                      <Tabs
                        value={activeAmenityTab as string}
                        onValueChange={value => setActiveAmenityTab(value as AmenityTabKey)}
                        className="w-full"
                      >
                        <div className="relative">
                          {canScrollAmenityLeft && (
                            <button
                              type="button"
                              aria-label="Scroll tabs left"
                              onClick={() =>
                                amenityTabsRef.current?.scrollBy({ left: -220, behavior: 'smooth' })
                              }
                              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full border border-slate-200 bg-white/90 text-slate-600 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                              <ChevronLeft className="h-4 w-4 mx-auto" />
                            </button>
                          )}
                          {canScrollAmenityRight && (
                            <button
                              type="button"
                              aria-label="Scroll tabs right"
                              onClick={() =>
                                amenityTabsRef.current?.scrollBy({ left: 220, behavior: 'smooth' })
                              }
                              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full border border-slate-200 bg-white/90 text-slate-600 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                              <ChevronRight className="h-4 w-4 mx-auto" />
                            </button>
                          )}

                          <div ref={amenityTabsRef} className="overflow-x-auto scrollbar-hide pb-2">
                            <TabsList className="bg-transparent p-0 h-auto inline-flex w-max flex-nowrap gap-2">
                              {amenityTabs.map(tab => {
                                const Icon = tab.icon || CheckCircle2;
                                const isActive = tab.key === activeAmenityTab;
                                return (
                                  <TabsTrigger
                                    key={tab.key}
                                    value={tab.key}
                                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm border ${
                                      isActive
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    <Icon className="h-4 w-4" />
                                    <span>{tab.label}</span>
                                    <Badge
                                      variant="secondary"
                                      className={`ml-1 h-5 px-1.5 ${
                                        isActive
                                          ? 'bg-white/15 text-white'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {tab.count}
                                    </Badge>
                                  </TabsTrigger>
                                );
                              })}
                            </TabsList>
                          </div>
                        </div>

                        {amenityTabs.map(tab => (
                          <TabsContent key={tab.key} value={tab.key} className="mt-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {(amenityGroups[tab.key] || []).map(item => (
                                <div
                                  key={item.key}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                >
                                  {item.label}
                                </div>
                              ))}
                            </div>
                          </TabsContent>
                        ))}
                      </Tabs>
                    </section>
                  </>
                )}

                <Separator className="bg-slate-200" />

                {/* Developer Overview */}
                <section id="developer" className="w-full">
                  <DeveloperOverview
                    developerName={development.developer}
                    developerLogo={development.developerLogo}
                    developerDescription={development.developerDescription}
                    developerWebsite={development.developerWebsite}
                    developerSlug={development.developerSlug}
                    headOfficeLocation={(publisher as any)?.headOfficeLocation || null}
                    projectCount={developerProjectCount}
                    foundedYear={(publisher as any)?.foundedYear || null}
                    isVerified={development.isVerified}
                  />
                </section>

                <Separator className="bg-slate-200" />

                {/* Location Section */}
                <section id="location" className="w-full space-y-6">
                  <NearbyLandmarks
                    property={{
                      id: dev.id,
                      title: dev.name,
                      latitude: dev.latitude || '0',
                      longitude: dev.longitude || '0',
                    }}
                  />

                  <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6">
                      <SuburbInsights
                        suburbId={dev.suburbId || 0}
                        suburbName={dev.suburb || dev.city}
                        isDevelopment={true}
                      />
                    </CardContent>
                  </Card>

                  <LocalityGuide
                    suburb={dev.suburb || dev.city}
                    city={dev.city}
                    province={dev.province}
                  />
                </section>
              </main>

              {/* Sidebar - CRITICAL: Proper sticky positioning */}
              <aside className="hidden w-full space-y-4 self-stretch lg:block lg:w-[360px]">
                <div
                  className="sticky self-start space-y-4"
                  style={{ top: showQuickNav ? 64 : 96 }}
                >
                  <DevelopmentActionPanel
                    developmentName={development.name}
                    transactionType={detailPricing.transactionType}
                    inputId="sidebar-quick-income"
                    quickIncome={quickIncome}
                    onQuickIncomeChange={setQuickIncome}
                    quickDeposit={quickDeposit}
                    onQuickDepositChange={setQuickDeposit}
                    quickQualification={quickQualification}
                    brochureUrl={brochureUrl}
                    unitTypeCount={dev.unitTypes?.length || 0}
                    onStartQualification={() => navigateToQualification('sidebar_interest_card')}
                    onDownloadBrochure={() => openLeadDialog('brochure', 'sidebar_interest_card')}
                    onContactSales={() => openLeadDialog('contact', 'sidebar_interest_card')}
                  />
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {detailPricing.priceLabel}
            </p>
            <p className="truncate text-base font-bold text-slate-900">
              {priceToDisplay
                ? `${formatPriceCompact(derivedPriceFrom)} - ${formatPriceCompact(priceToDisplay)}`
                : formatPriceCompact(derivedPriceFrom)}
            </p>
          </div>
          <div className="grid flex-1 grid-cols-3 gap-2">
            <Button
              size="sm"
              className="h-10 bg-orange-500 px-2 text-xs font-semibold text-white hover:bg-orange-600"
              onClick={() => navigateToQualification('mobile_sticky')}
            >
              Qualify
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-10 px-2 text-xs font-semibold"
              onClick={() => openLeadDialog('brochure', 'mobile_sticky')}
            >
              Brochure
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-10 px-2 text-xs font-semibold"
              onClick={() => openLeadDialog('contact', 'mobile_sticky')}
            >
              Contact
            </Button>
          </div>
        </div>
      </div>

      {/* Footer - Outside main container */}
      <Footer />

      <DevelopmentLeadDialog
        open={leadDialogOpen}
        onOpenChange={open => {
          setLeadDialogOpen(open);
          if (!open) setActiveLeadUnit(null);
        }}
        mode={leadDialogMode}
        ctaLocation={leadDialogLocation}
        transactionType={detailPricing.transactionType}
        development={{
          id: development.id,
          name: development.name,
          developerBrandProfileId: (dev as any).developerBrandProfileId ?? publisher?.id ?? null,
          brochureUrl,
        }}
        unitContext={
          activeLeadUnit
            ? getDevelopmentDetailLeadUnitContext(activeLeadUnit, detailPricing.transactionType)
            : null
        }
        affordabilityData={
          quickQualification
            ? {
                monthlyIncome: hasQuickIncome ? parsedQuickIncome : undefined,
                availableDeposit: quickDepositAmount > 0 ? quickDepositAmount : undefined,
                maxAffordable: quickQualification.buyingPower,
                calculatedAt: new Date().toISOString(),
              }
            : null
        }
      />

      {/* Lightbox - Portal */}
      <MediaLightbox
        media={development.unifiedMedia}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        title={lightboxTitle}
      />
    </>
  );
}
