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

type AmenityTabKey = AmenityCategory | 'other';

const AMENITY_CATEGORY_ICONS: Record<AmenityTabKey, typeof Shield> = {
  security: Shield,
  lifestyle: Dumbbell,
  sustainability: Leaf,
  convenience: Settings,
  family: Baby,
  other: CheckCircle2,
};

// --- UNIT HELPERS ---
const getPrimaryUnitImage = (u: any, devHero?: string): string => {
  const bm = u.baseMedia;
  const gallery = Array.isArray(bm?.gallery) ? bm.gallery : Array.isArray(bm) ? bm : [];

  // robust gallery search
  const first =
    gallery.find((x: any) => x?.isPrimary && x?.url)?.url ||
    gallery.find((x: any) => x?.url)?.url ||
    // legacy fields
    u.primaryImageUrl ||
    u.image ||
    u.coverImage ||
    // fallbacks
    devHero ||
    '/assets/placeholder-home.jpg';

  return first;
};

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

const resolveUnitFloorPlanUrl = (unit: any): string | null => {
  const floorPlans = Array.isArray(unit?.baseMedia?.floorPlans) ? unit.baseMedia.floorPlans : [];
  for (const item of floorPlans) {
    const url = resolveDocumentUrl(item);
    if (url) return url;
  }
  return null;
};

const getUnitAvailabilityState = (unit: any) => {
  const availableUnits = Math.max(0, Number(unit?.availableUnits || 0));
  const totalUnits = Math.max(0, Number(unit?.totalUnits || 0));

  if (totalUnits > 0 && availableUnits <= 0) {
    return {
      label: 'Sold out',
      className: 'border-rose-200 bg-rose-50 text-rose-700',
      primaryLabel: 'Join Waitlist',
    };
  }

  if (availableUnits > 0 && availableUnits <= 5) {
    return {
      label: `Only ${availableUnits} left`,
      className: 'border-amber-200 bg-amber-50 text-amber-700',
      primaryLabel: 'Request Callback',
    };
  }

  if (availableUnits > 5) {
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
  brochureAvailable: boolean;
  onRequestCallback: (unit: any) => void;
  onRequestBrochure: (unit: any) => void;
  onOpenFloorPlan: (unit: any) => void;
};

function UnitTypeCarousel({
  units,
  brochureAvailable,
  onRequestCallback,
  onRequestBrochure,
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
            const unitPriceFrom = parseNumber(unit.basePriceFrom) ?? 0;
            const unitPriceTo = parseNumber(unit.basePriceTo);
            const floorPlanUrl = resolveUnitFloorPlanUrl(unit);
            const availability = getUnitAvailabilityState(unit);
            const exactPriceFrom = formatExactRand(unitPriceFrom) || 'Price on request';
            const exactPriceTo =
              unitPriceTo !== null && unitPriceTo > unitPriceFrom
                ? formatExactRand(unitPriceTo)
                : null;
            const estimatedRepayment =
              unitPriceFrom > 0
                ? Math.round(
                    calculateMonthlyRepayment(
                      unitPriceFrom,
                      SA_PRIME_RATE,
                      DEFAULT_BOND_TERM_YEARS,
                    ),
                  )
                : null;
            const qualifyingIncome =
              estimatedRepayment !== null
                ? Math.round(estimatedRepayment * QUICK_QUALIFICATION_PAYMENT_RATIO)
                : null;
            const secondaryActionLabel = floorPlanUrl
              ? 'View Floor Plan'
              : brochureAvailable
                ? 'Get Brochure'
                : 'Request Info';

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
                            Ownership Snapshot
                          </p>
                          <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px]">
                            <span className="truncate text-slate-600">Repayment from</span>
                            <span className="truncate font-semibold text-slate-900">
                              {formatExactRand(estimatedRepayment)} / month
                            </span>
                          </div>
                          {qualifyingIncome ? (
                            <div className="mt-1 flex items-center justify-between gap-2 text-[10px]">
                              <span className="truncate text-slate-600">Qualifying income</span>
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
                        onClick={() => {
                          if (floorPlanUrl) {
                            onOpenFloorPlan(unit);
                            return;
                          }

                          if (brochureAvailable) {
                            onRequestBrochure(unit);
                            return;
                          }

                          onRequestCallback(unit);
                        }}
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

function DevelopmentActionPanel({
  developmentName,
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
  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <CardContent className="p-0">
        <div className="bg-slate-950 px-5 py-5 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-200">
            Interested in {developmentName}?
          </p>
          <h3 className="mt-2 text-lg font-bold">Check affordability and take the next step.</h3>
        </div>

        <div className="space-y-4 p-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Quick Qualification Check
                </p>
                <p className="mt-1 text-xs text-slate-600">Enter your monthly household income</p>
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
                Optional deposit
              </label>
              <div className="flex rounded-xl border border-slate-200 bg-white shadow-sm">
                <span className="flex items-center px-3 text-sm font-semibold text-slate-500">
                  R
                </span>
                <input
                  id={`${inputId}-deposit`}
                  type="text"
                  inputMode="numeric"
                  placeholder="Optional deposit"
                  value={quickDeposit}
                  onChange={e => onQuickDepositChange(e.target.value)}
                  className="h-10 w-full rounded-r-xl border-0 bg-transparent px-0 pr-3 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Optional deposit</p>
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
              Start Full Qualification
            </Button>
            <Button
              variant="outline"
              className="h-10 border-blue-200 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              onClick={onDownloadBrochure}
            >
              {brochureUrl ? 'Download Brochure' : 'Request Brochure'}
            </Button>
            <Button
              variant="ghost"
              className="h-9 text-xs font-medium text-slate-600 hover:text-slate-900"
              onClick={onContactSales}
            >
              Contact Sales Team
            </Button>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-[11px] text-slate-600">
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
              {unitTypeCount} unit types available
            </div>
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
  const [leadDialogMode, setLeadDialogMode] = useState<'brochure' | 'contact' | 'qualification'>(
    'qualification',
  );
  const [leadDialogLocation, setLeadDialogLocation] = useState('unknown');
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

  const openLeadDialog = (mode: 'brochure' | 'contact' | 'qualification', ctaLocation: string) => {
    setLeadDialogMode(mode);
    setLeadDialogLocation(ctaLocation);
    setLeadDialogOpen(true);
    trackCTAClick({
      ctaLabel:
        mode === 'brochure'
          ? 'Download Brochure'
          : mode === 'contact'
            ? 'Contact Sales Team'
            : 'Start Qualification',
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

  const openDocumentUrl = (url: string) => {
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      window.location.href = url;
    }
  };

  const handleUnitCallback = (unit: any) => {
    openLeadDialog('contact', `unit_card_${unit.id}_callback`);
  };

  const handleUnitBrochure = (unit: any) => {
    openLeadDialog('brochure', `unit_card_${unit.id}_brochure`);
  };

  const handleUnitFloorPlan = (unit: any) => {
    const floorPlanUrl = resolveUnitFloorPlanUrl(unit);
    if (!floorPlanUrl) {
      handleUnitBrochure(unit);
      return;
    }

    trackCTAClick({
      ctaLabel: 'View Floor Plan',
      ctaLocation: `unit_card_${unit.id}_floor_plan`,
      ctaHref: floorPlanUrl,
    });
    openDocumentUrl(floorPlanUrl);
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
  const amenityGroups = buildAmenityGroups(amenityList);
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

  // Format label helper
  const formatLabel = (value?: string) => {
    if (!value) return '—';
    return value
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  function getAmenityLabel(key: string) {
    const match = AMENITY_REGISTRY.find(item => item.key === key);
    return match?.label ?? formatLabel(key);
  }

  function buildAmenityGroups(list: string[]) {
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
      groups[category].push({ key, label: getAmenityLabel(key) });
    });

    return groups;
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
  const rawImages = parseJSON(dev.images);
  const rawVideos = parseJSON(dev.videos);
  const rawFloorPlans = parseJSON(dev.floorPlans);

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
        const total = Math.max(0, Number(u.totalUnits || 0));
        const avail = Math.max(0, Number(u.availableUnits || 0));
        const reserved = Math.max(0, Number(u.reservedUnits || 0));
        acc.total += total;
        acc.available += avail;
        acc.reserved += reserved;
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

    if (totalUnits <= 0) return { soldPct: null, total: 0, available: 0, reserved: 0, sold: 0 };

    const clampedReserved = Math.min(Math.max(reservedUnits, 0), totalUnits);
    const clampedAvailable = Math.min(Math.max(availableUnits, 0), totalUnits - clampedReserved);
    const sold = Math.max(totalUnits - clampedAvailable - clampedReserved, 0);
    const soldPct = Math.round((sold / totalUnits) * 100);

    return {
      soldPct,
      total: totalUnits,
      available: clampedAvailable,
      reserved: clampedReserved,
      sold,
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
    isVerified: !!(dev.developerDisplay as any)?.isVerified,

    // CRITICAL: Ensure we rely on unitTypes, not mixed sources
    units: units.map((u: any) => {
      const rawOwnership = u.ownershipType;
      const estateOwnership = (estateSpecs as any)?.ownershipType;
      const structural = u.structuralType || u.type;
      const inferred = inferOwnership(structural);
      const finalLabel = formatLabel(rawOwnership || estateOwnership || inferred);

      return {
        ...u,
        normalizedImage: getPrimaryUnitImage(
          u,
          heroMedia?.type === 'image' ? heroMedia.image?.url : undefined,
        ),
        normalizedOwnership: finalLabel,
        normalizedType: formatLabel(u.structuralType || u.type || 'Apartment'),
        floorSize: u.unitSize,
        landSize: u.erfSize || u.yardSize,
      };
    }),

    unifiedMedia: unifiedMedia,
  };

  const brochureUrl = (() => {
    const brochureItems = Array.isArray((dev as any).brochures) ? (dev as any).brochures : [];
    for (const item of brochureItems) {
      const url = resolveDocumentUrl(item);
      if (url) return url;
    }
    return null;
  })();

  const unitPriceValues = (development.units || [])
    .flatMap((unit: any) => [Number(unit.basePriceFrom || 0), Number(unit.basePriceTo || 0)])
    .filter((value: number) => Number.isFinite(value) && value > 0);

  const derivedPriceFrom =
    (unitPriceValues.length > 0 ? Math.min(...unitPriceValues) : 0) ||
    Number(dev.priceFrom || 0) ||
    development.startingPrice;
  const derivedPriceTo =
    (unitPriceValues.length > 0 ? Math.max(...unitPriceValues) : 0) ||
    Number(dev.priceTo || 0) ||
    undefined;

  const priceToDisplay =
    derivedPriceTo && derivedPriceTo > derivedPriceFrom ? derivedPriceTo : undefined;
  const estimatedRepaymentFrom = calculateMonthlyRepayment(
    derivedPriceFrom,
    SA_PRIME_RATE,
    DEFAULT_BOND_TERM_YEARS,
  );
  const minimumIncomeRequired = Math.round(
    estimatedRepaymentFrom * QUICK_QUALIFICATION_PAYMENT_RATIO,
  );

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
    const comfortFloor = Math.max(Math.round(maxAffordable * 0.85), 0);
    const qualifies = maxAffordable >= derivedPriceFrom;
    const nearQualify = !qualifies && maxAffordable >= derivedPriceFrom * 0.9;
    const depositNote =
      quickDepositAmount > 0 ? ` Includes ${formatSARandShort(quickDepositAmount)} deposit.` : '';

    if (qualifies) {
      return {
        tone: 'success' as const,
        buyingPower: maxAffordable,
        comfortFloor,
        headline: `You likely qualify for homes in ${development.name}`,
        body: `Estimated buying power up to ${formatSARandShort(maxAffordable)}. Homes here start from ${formatSARandShort(derivedPriceFrom)}.${depositNote}`,
      };
    }

    if (nearQualify) {
      return {
        tone: 'warning' as const,
        buyingPower: maxAffordable,
        comfortFloor,
        headline: 'You may be close to qualifying',
        body: `Estimated buying power is around ${formatSARandShort(maxAffordable)}. A higher qualifying income or joint application could improve fit.${depositNote}`,
      };
    }

    return {
      tone: 'muted' as const,
      buyingPower: maxAffordable,
      comfortFloor,
      headline: 'This development may be above your current range',
      body: `Estimated buying power is around ${formatSARandShort(maxAffordable)}. Start full qualification to explore next-best options.${depositNote}`,
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
                  completionDate={normalizedCompletionDate}
                  constructionStatus={normalizedStatus}
                  salesMetrics={sales}
                />

                <div className="lg:hidden">
                  <DevelopmentActionPanel
                    developmentName={development.name}
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
                              Check whether homes from {formatSARandShort(derivedPriceFrom)} fit
                              your income.
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

                {/* Floor Plans Section - CRITICAL: Carousel overflow contained */}
                <section id="units" className="w-full">
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
                              brochureAvailable={!!brochureUrl}
                              onRequestCallback={handleUnitCallback}
                              onRequestBrochure={handleUnitBrochure}
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
              Price From
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
        onOpenChange={setLeadDialogOpen}
        mode={leadDialogMode}
        ctaLocation={leadDialogLocation}
        development={{
          id: development.id,
          name: development.name,
          developerBrandProfileId: (dev as any).developerBrandProfileId ?? publisher?.id ?? null,
          brochureUrl,
        }}
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
