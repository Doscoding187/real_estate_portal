import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowRight,
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Car,
  CreditCard,
  FileDown,
  HandCoins,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  Play,
  Ruler,
  ShieldCheck,
  Sparkles,
  Star,
  Calculator,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { HouseMeasureIcon } from '@/components/icons/HouseMeasureIcon';
import { formatPriceCompact } from '@/lib/formatPrice';
import { calculateAffordablePrice, calculateMonthlyRepayment, formatSARandShort, SA_PRIME_RATE, SA_PRIME_RATE_LABEL } from '@/lib/bond-calculator';
import type { ImageMedia } from '@/lib/media-logic';
import { agentProfilePhoneError } from '@shared/agentProfilePhone';

type PreviewUnit = {
  id: string | number;
  name: string;
  normalizedType?: string;
  normalizedImage?: string;
  floorPlanAvailable?: boolean;
  publicFacts?: {
    priceFrom?: number | null;
    priceTo?: number | null;
    availableUnits?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    availabilityState?: string | null;
  };
  floorSize?: number | string | null;
  yardSize?: number | string | null;
  parkingLabel?: string | null;
  baseMedia?: { videos?: unknown[]; gallery?: unknown[]; floorPlans?: unknown[] };
  videos?: unknown[];
};

type PreviewGalleryImage = ImageMedia & { index: number };

type BuyabilityEstimate = {
  grossMonthlyIncome: number;
  estimatedBuyingPower: number | null;
  interestRate: number;
  termYears: 20 | 25 | 30;
};

export type DevelopmentInlineLeadRequest = {
  mode: 'brochure' | 'info' | 'viewing';
  ctaLocation: string;
  unitId?: string;
  name: string;
  phone: string;
  affordabilityData: {
    monthlyIncome?: number;
    maxAffordable?: number;
    calculatedAt?: string;
  } | null;
};

type ConceptAmenityGroups = {
  security: string[];
  recreation: string[];
  homeFeatures: string[];
  additional: string[];
};

type DevelopmentDetailPageProps = {
  name: string;
  location: string;
  description?: string | null;
  heroSubtitle?: string | null;
  heroImage?: string | null;
  priceFrom?: number | null;
  priceLabel: string;
  startingPriceLabel: string;
  status: string;
  developmentType: string;
  ownership: string;
  monthlyBondEstimate?: number | null;
  minimumGrossIncome?: number | null;
  amenities: string[];
  amenityGroups: ConceptAmenityGroups;
  developmentDocumentUrl?: string | null;
  galleryImages: PreviewGalleryImage[];
  photoCount: number;
  videoCount: number;
  floorPlanCount: number;
  videoTitle?: string | null;
  videoThumbnailUrl?: string | null;
  videoGalleryIndex: number;
  units: PreviewUnit[];
  developerName: string;
  brochureAvailable: boolean;
  onDevelopmentLeadRequest: (request: DevelopmentInlineLeadRequest) => void;
  locationContent?: ReactNode;
  developerContent?: ReactNode;
  overlayContent?: ReactNode;
  onOpenGallery: (index: number, title: string) => void;
  onOpenUnit: (unit: PreviewUnit) => void;
  onRequestFullAssessment: (grossMonthlyIncome: number, unitId?: string) => void;
  onEnquireUnit: (unit: PreviewUnit) => void;
  onRequestUpdates: (email: string) => void;
  onEnquire: () => void;
};

const IMAGE_CATEGORY_LABELS: Record<string, string> = {
  featured: 'Development',
  general: 'Development overview',
  interior: 'Interior',
  amenities: 'Lifestyle & amenities',
  outdoors: 'Exteriors & outdoors',
  photo: 'Location & views',
  render: 'Aerial & drone',
};

const SECTION_LINKS = [
  { id: 'overview', label: 'Overview' },
  { id: 'available-units', label: 'Homes' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'location', label: 'Location' },
  { id: 'developer', label: 'Developer' },
  { id: 'faq', label: 'FAQs' },
];

const parseAmount = (value: string): number => {
  const amount = Number(value.replace(/[^\d.]/g, ''));
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const formatExactPrice = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || !Number.isFinite(amount) || amount <= 0) {
    return 'Price on request';
  }
  return `R ${Math.round(amount).toLocaleString('en-ZA')}`;
};

const formatMoney = (amount: number): string => `R ${Math.round(amount).toLocaleString('en-ZA')}`;

const unitHasVideo = (unit: PreviewUnit): boolean => {
  const gallery = Array.isArray(unit.baseMedia?.gallery) ? unit.baseMedia.gallery : [];
  return (
    (Array.isArray(unit.videos) && unit.videos.length > 0) ||
    (Array.isArray(unit.baseMedia?.videos) && unit.baseMedia.videos.length > 0) ||
    gallery.some(item =>
      Boolean(item && typeof item === 'object' && 'type' in item && item.type === 'video'),
    )
  );
};

const getPositiveNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(
    String(value)
      .replace(/,/g, '')
      .match(/\d+(?:\.\d+)?/)?.[0],
  );
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getBedroomCount = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const formatArea = (value: unknown): string | null => {
  const area = getPositiveNumber(value);
  if (area === null) return null;
  return `${Number.isInteger(area) ? area : area.toLocaleString('en-ZA', { maximumFractionDigits: 2 })} m²`;
};

const getTitleLines = (value: string): string[] => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length < 3 || value.trim().length < 22) return [value];

  let bestSplit = 1;
  let smallestDifference = Number.POSITIVE_INFINITY;
  for (let splitAt = 1; splitAt < words.length; splitAt += 1) {
    const firstLineLength = words.slice(0, splitAt).join(' ').length;
    const secondLineLength = words.slice(splitAt).join(' ').length;
    const difference = Math.abs(firstLineLength - secondLineLength);
    if (difference < smallestDifference) {
      bestSplit = splitAt;
      smallestDifference = difference;
    }
  }

  return [words.slice(0, bestSplit).join(' '), words.slice(bestSplit).join(' ')];
};

const getBedroomRangeLabel = (units: PreviewUnit[]): string => {
  const bedrooms = units
    .map(unit => getBedroomCount(unit.publicFacts?.bedrooms))
    .filter((count): count is number => count !== null)
    .sort((left, right) => left - right);
  if (!bedrooms.length) return 'Bedroom details on request';

  const minimum = bedrooms[0];
  const maximum = bedrooms[bedrooms.length - 1];
  if (minimum === maximum) {
    return minimum === 0 ? 'Studio' : `${minimum} Bedroom${minimum === 1 ? '' : 's'}`;
  }
  const formatBedroomCount = (count: number) => (count === 0 ? 'Studio' : String(count));
  return `${formatBedroomCount(minimum)}–${formatBedroomCount(maximum)} Bedrooms`;
};

function DevelopmentHomesCarousel({
  units,
  onOpenUnit,
  onEnquireUnit,
  buyability,
  onlyWithinBudget,
  onOnlyWithinBudgetChange,
}: {
  units: PreviewUnit[];
  onOpenUnit: (unit: PreviewUnit) => void;
  onEnquireUnit: (unit: PreviewUnit) => void;
  buyability: BuyabilityEstimate;
  onlyWithinBudget: boolean;
  onOnlyWithinBudgetChange: (enabled: boolean) => void;
}) {
  const [activeBedroomFilter, setActiveBedroomFilter] = useState<number | 'all'>('all');
  const [areaSort, setAreaSort] = useState<'smallest' | 'largest'>('smallest');
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [savedUnitIds, setSavedUnitIds] = useState<Set<string>>(() => new Set());

  const bedroomOptions = useMemo(
    () =>
      [
        ...new Set(
          units.flatMap(unit => {
            const bedrooms = getBedroomCount(unit.publicFacts?.bedrooms);
            return bedrooms === null ? [] : [bedrooms];
          }),
        ),
      ].sort((left, right) => left - right),
    [units],
  );

  const sortedUnits = useMemo(() => {
    const direction = areaSort === 'smallest' ? 1 : -1;
    return [...units].sort((left, right) => {
      const leftArea = getPositiveNumber(left.floorSize);
      const rightArea = getPositiveNumber(right.floorSize);
      if (leftArea !== null && rightArea !== null && leftArea !== rightArea) {
        return (leftArea - rightArea) * direction;
      }
      if (leftArea !== null && rightArea === null) return -1;
      if (leftArea === null && rightArea !== null) return 1;

      const leftPrice = getPositiveNumber(left.publicFacts?.priceFrom);
      const rightPrice = getPositiveNumber(right.publicFacts?.priceFrom);
      if (leftPrice !== null && rightPrice !== null && leftPrice !== rightPrice) {
        return (leftPrice - rightPrice) * direction;
      }
      return left.name.localeCompare(right.name);
    });
  }, [areaSort, units]);

  const bedroomFilteredUnits =
    activeBedroomFilter === 'all'
      ? sortedUnits
      : sortedUnits.filter(
          unit => getBedroomCount(unit.publicFacts?.bedrooms) === activeBedroomFilter,
        );
  const budgetFilteredUnits = onlyWithinBudget
    ? bedroomFilteredUnits.filter(unit => {
        const price = getPositiveNumber(unit.publicFacts?.priceFrom);
        return price !== null && buyability.estimatedBuyingPower !== null && price <= buyability.estimatedBuyingPower;
      })
    : bedroomFilteredUnits;
  const visibleUnits = budgetFilteredUnits;

  const selectBedroomFilter = (filter: number | 'all') => {
    setActiveBedroomFilter(filter);
    carouselApi?.scrollTo(0);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="Filter homes by bedrooms"
        >
          <button
            type="button"
            aria-pressed={activeBedroomFilter === 'all'}
            onClick={() => selectBedroomFilter('all')}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${activeBedroomFilter === 'all' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            All Homes
          </button>
          {bedroomOptions.map(bedrooms => (
            <button
              key={bedrooms}
              type="button"
              aria-pressed={activeBedroomFilter === bedrooms}
              onClick={() => selectBedroomFilter(bedrooms)}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${activeBedroomFilter === bedrooms ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {bedrooms === 0 ? 'Studio' : `${bedrooms} Bedroom${bedrooms === 1 ? '' : 's'}`}
            </button>
          ))}
        </div>
        <label className="flex shrink-0 items-center gap-2 text-[11px] font-medium text-slate-600">
          Sort by
          <select
            value={areaSort}
            onChange={event => {
              setAreaSort(event.target.value as 'smallest' | 'largest');
              carouselApi?.scrollTo(0);
            }}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 outline-none focus:border-blue-400"
          >
            <option value="smallest">Size (smallest first)</option>
            <option value="largest">Size (largest first)</option>
          </select>
        </label>
        <label className={`flex shrink-0 items-center gap-2 text-[11px] font-semibold text-slate-800 ${buyability.grossMonthlyIncome <= 0 ? 'opacity-50' : ''}`}>
          <input
            type="checkbox"
            checked={onlyWithinBudget}
            disabled={buyability.grossMonthlyIncome <= 0}
            onChange={event => onOnlyWithinBudgetChange(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-blue-600"
          />
          Only homes within my budget
        </label>
      </div>

      {onlyWithinBudget && visibleUnits.length === 0 ? (
        <Card className="rounded-2xl border-dashed border-blue-200 bg-blue-50/50 shadow-none">
          <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-700">No listed home types match this estimate and bedroom filter yet.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => onOnlyWithinBudgetChange(false)}>
              Show all homes
            </Button>
          </CardContent>
        </Card>
      ) : (
      <Carousel opts={{ align: 'start', loop: false }} setApi={setCarouselApi} className="w-full">
        <CarouselContent className="-ml-3">
          {visibleUnits.map(unit => {
            const bedrooms = getBedroomCount(unit.publicFacts?.bedrooms);
            const bathrooms = unit.publicFacts?.bathrooms;
            const priceFrom = unit.publicFacts?.priceFrom;
            const priceTo = unit.publicFacts?.priceTo;
            const hasPriceRange =
              getPositiveNumber(priceTo) !== null && Number(priceTo) > Number(priceFrom);
            const availableUnitCount = Number(unit.publicFacts?.availableUnits ?? 0);
            const availabilityLabel =
              unit.publicFacts?.availabilityState === 'sold_out'
                ? 'Sold out'
                : availableUnitCount > 5
                  ? `${availableUnitCount} available`
                  : availableUnitCount > 0
                    ? `Only ${availableUnitCount} left`
                    : null;
            const areaLabel = formatArea(unit.floorSize);
            const yardLabel = formatArea(unit.yardSize);
            const price = getPositiveNumber(priceFrom);
            const monthlyBond = price === null
              ? null
              : calculateMonthlyRepayment(price, buyability.interestRate, buyability.termYears);
            const grossRequired = monthlyBond === null
              ? null
              : Math.round(monthlyBond * BUYABILITY_GROSS_REPAYMENT_MULTIPLE);
            const budgetStatus = grossRequired === null || buyability.grossMonthlyIncome <= 0
              ? null
              : buyability.grossMonthlyIncome >= grossRequired
                ? 'Within budget'
                : buyability.grossMonthlyIncome * 1.1 >= grossRequired
                  ? 'A stretch'
                  : 'Above range';
            const unitKey = String(unit.id);
            const isSaved = savedUnitIds.has(unitKey);

            return (
              <CarouselItem key={unit.id} className="basis-[86%] pl-3 sm:basis-1/2 xl:basis-1/3">
                <Card className="group flex h-full flex-col overflow-hidden rounded-2xl border-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="relative aspect-[4/2.8] overflow-hidden bg-slate-100">
                    {unit.normalizedImage ? (
                      <img
                        src={unit.normalizedImage}
                        alt={unit.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-300">
                        <Home className="h-10 w-10" />
                      </div>
                    )}
                    <Badge className="absolute left-2.5 top-2.5 max-w-[72%] truncate border-0 bg-white/95 text-[9px] font-bold uppercase text-slate-800 shadow-sm hover:bg-white">
                      {unit.normalizedType || 'Home type'}
                    </Badge>
                    <button
                      type="button"
                      aria-label={isSaved ? `Remove ${unit.name} from saved homes` : `Save ${unit.name}`}
                      aria-pressed={isSaved}
                      onClick={() => setSavedUnitIds(current => {
                        const next = new Set(current);
                        if (next.has(unitKey)) next.delete(unitKey);
                        else next.add(unitKey);
                        return next;
                      })}
                      className={`absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md transition hover:scale-105 ${isSaved ? 'text-rose-600' : 'text-slate-600 hover:text-rose-600'}`}
                    >
                      <Heart className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                    </button>
                    {unitHasVideo(unit) ? (
                      <Badge className="absolute bottom-2.5 left-2.5 border-0 bg-blue-600 text-[10px] text-white hover:bg-blue-600">
                        <Play className="mr-1 h-3 w-3 fill-current" /> Video
                      </Badge>
                    ) : null}
                    {availabilityLabel ? (
                      <Badge className={`absolute bottom-2.5 right-2.5 border-0 text-[9px] shadow-sm ${availabilityLabel === 'Sold out' ? 'bg-rose-50 text-rose-700 hover:bg-rose-50' : 'bg-white/95 text-slate-800 hover:bg-white'}`}>
                        {availabilityLabel}
                      </Badge>
                    ) : null}
                  </div>
                  <CardContent className="flex flex-1 flex-col p-3.5">
                    <h3 className="mt-0.5 truncate text-sm font-extrabold text-slate-900">
                      {unit.name}
                    </h3>
                    <p className="mt-1 text-base font-extrabold text-slate-900">
                      {hasPriceRange
                        ? `${formatPriceCompact(Number(priceFrom))} – ${formatPriceCompact(Number(priceTo))}`
                        : formatExactPrice(priceFrom)}
                    </p>
                    {budgetStatus ? (
                      <div className="mt-2">
                        <Badge className={`border-0 text-[9px] font-bold ${budgetStatus === 'Within budget' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : budgetStatus === 'A stretch' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-100'}`}>
                          {budgetStatus}
                        </Badge>
                        {grossRequired !== null ? (
                          <p className="mt-1 text-[10px] text-slate-500">Needs {formatExactPrice(grossRequired)}+ gross monthly income</p>
                        ) : null}
                      </div>
                    ) : monthlyBond !== null ? (
                      <p className="mt-0.5 text-[10px] text-slate-500">Est. {formatExactPrice(monthlyBond)} / month</p>
                    ) : null}
                    <div className="mt-3 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-slate-100 pt-2.5 text-[10px] font-medium text-slate-600">
                      {areaLabel ? (
                        <span className="inline-flex items-center gap-1">
                          <HouseMeasureIcon className="h-3.5 w-3.5 shrink-0" /> {areaLabel}
                        </span>
                      ) : !yardLabel && unit.parkingLabel ? (
                        <span className="inline-flex items-center gap-1" title={unit.parkingLabel}>
                          <Car className="h-3.5 w-3.5 shrink-0" /> {unit.parkingLabel}
                        </span>
                      ) : null}
                      {bedrooms !== null && bedrooms !== undefined ? (
                        <span className="inline-flex items-center gap-1">
                          <BedDouble className="h-3.5 w-3.5 shrink-0" />
                          {bedrooms === 0 ? 'Studio' : bedrooms}
                        </span>
                      ) : null}
                      {bathrooms !== null && bathrooms !== undefined ? (
                        <span className="inline-flex items-center gap-1">
                          <Bath className="h-3.5 w-3.5 shrink-0" /> {bathrooms}
                        </span>
                      ) : null}
                      {yardLabel ? (
                        <span className="inline-flex items-center gap-1">
                          <Ruler className="h-3.5 w-3.5 shrink-0" /> Yard {yardLabel}
                        </span>
                      ) : areaLabel && unit.parkingLabel ? (
                        <span className="inline-flex items-center gap-1" title={unit.parkingLabel}>
                          <Car className="h-3.5 w-3.5 shrink-0" /> {unit.parkingLabel}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-auto grid grid-cols-[auto_1fr] items-center gap-2 pt-3">
                      <button
                        type="button"
                        onClick={() => onOpenUnit(unit)}
                        className="min-h-9 rounded-lg border border-blue-500 px-3 text-[10px] font-bold leading-tight text-blue-700 transition hover:bg-blue-50"
                      >
                        {unit.floorPlanAvailable ? 'Floor plan' : 'View details'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onEnquireUnit(unit)}
                        className="flex min-h-9 min-w-0 items-center justify-between gap-1 text-left text-[10px] font-bold leading-tight text-blue-700 hover:text-blue-900"
                      >
                        <span>Enquire about this home</span><ArrowRight className="h-3.5 w-3.5 shrink-0" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {visibleUnits.length > 1 ? (
          <>
            <CarouselPrevious className="-left-3 hidden border-slate-200 bg-white shadow-md sm:flex" />
            <CarouselNext className="-right-3 hidden border-slate-200 bg-white shadow-md sm:flex" />
          </>
        ) : null}
      </Carousel>
      )}
    </div>
  );
}

function MoneyInput({
  id,
  label,
  description,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold text-slate-800">
        {label}
      </label>
      <div className="mt-2 flex h-12 items-center rounded-xl border border-slate-300 bg-white shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
        <span className="pl-4 text-sm font-semibold text-slate-600">R</span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-full w-full rounded-r-xl border-0 bg-transparent px-2 text-base font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
        />
      </div>
      {description ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}

const BUYABILITY_GROSS_REPAYMENT_MULTIPLE = 3;
const BUYABILITY_RATE_STRESS_OFFSETS = [0, 0.5, 1, 1.5] as const;
const BUYABILITY_BOND_TERMS = [20, 25, 30] as const;

function BuyabilityAssessment({
  name,
  priceFrom,
  units,
  onRequestFullAssessment,
  onEstimateChange,
  onShowHomesWithinBudget,
}: {
  name: string;
  priceFrom?: number | null;
  units: PreviewUnit[];
  onRequestFullAssessment: (grossMonthlyIncome: number, unitId?: string) => void;
  onEstimateChange: (estimate: BuyabilityEstimate) => void;
  onShowHomesWithinBudget: () => void;
}) {
  const [grossIncome, setGrossIncome] = useState('');
  const [rateStressOffset, setRateStressOffset] = useState<number>(0);
  const [baseRateText, setBaseRateText] = useState(String(SA_PRIME_RATE));
  const parsedBaseRate = Number(baseRateText);
  const baseRate =
    baseRateText.trim() !== '' &&
    Number.isFinite(parsedBaseRate) &&
    parsedBaseRate >= 1 &&
    parsedBaseRate <= 30
      ? parsedBaseRate
      : SA_PRIME_RATE;
  const [bondTerm, setBondTerm] = useState<(typeof BUYABILITY_BOND_TERMS)[number]>(30);
  const pricedUnits = useMemo(
    () =>
      units
        .filter(unit => Number(unit.publicFacts?.priceFrom) > 0)
        .sort(
          (left, right) =>
            Number(left.publicFacts?.priceFrom) - Number(right.publicFacts?.priceFrom),
        ),
    [units],
  );
  const [selectedUnitId, setSelectedUnitId] = useState<string>(() =>
    pricedUnits[0] ? String(pricedUnits[0].id) : 'development',
  );
  const selectedUnit =
    pricedUnits.find(unit => String(unit.id) === selectedUnitId) ?? pricedUnits[0] ?? null;
  const selectedPrice = selectedUnit?.publicFacts?.priceFrom ?? priceFrom ?? null;
  const selectedRate = baseRate + rateStressOffset;
  const grossIncomeAmount = parseAmount(grossIncome);
  const monthlyBondEstimate =
    selectedPrice !== null && selectedPrice > 0
      ? calculateMonthlyRepayment(Number(selectedPrice), selectedRate, bondTerm)
      : null;
  const minimumGrossForSelectedHome =
    monthlyBondEstimate !== null
      ? Math.round(monthlyBondEstimate * BUYABILITY_GROSS_REPAYMENT_MULTIPLE)
      : null;
  const estimatedBuyingPower =
    grossIncomeAmount > 0
      ? calculateAffordablePrice(
          grossIncomeAmount / BUYABILITY_GROSS_REPAYMENT_MULTIPLE,
          0,
          selectedRate,
          bondTerm,
        )
      : null;
  const homeFitSummary = pricedUnits.reduce(
    (summary, unit) => {
      const price = getPositiveNumber(unit.publicFacts?.priceFrom);
      if (price === null) return summary;
      const payment = calculateMonthlyRepayment(price, selectedRate, bondTerm);
      const incomeNeeded = payment * BUYABILITY_GROSS_REPAYMENT_MULTIPLE;
      if (grossIncomeAmount >= incomeNeeded) summary.within += 1;
      else if (grossIncomeAmount * 1.1 >= incomeNeeded) summary.stretch += 1;
      return summary;
    },
    { within: 0, stretch: 0 },
  );

  useEffect(() => {
    onEstimateChange({
      grossMonthlyIncome: grossIncomeAmount,
      estimatedBuyingPower,
      interestRate: selectedRate,
      termYears: bondTerm,
    });
  }, [bondTerm, estimatedBuyingPower, grossIncomeAmount, onEstimateChange, selectedRate]);

  const selectedHomeLabel = formatArea(selectedUnit?.floorSize) || selectedUnit?.name || name;

  return (
    <section aria-labelledby="buyability-heading" className="scroll-mt-32">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Badge className="border-0 bg-blue-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-blue-700 hover:bg-blue-50">
          Buyability
        </Badge>
        <h2 id="buyability-heading" className="text-xl font-extrabold tracking-tight text-blue-950 sm:text-2xl">
          Can you afford your new home?
        </h2>
        <p className="text-xs text-slate-600">2 minute check-in · your answers filter the homes below</p>
      </div>

      <Card className="overflow-hidden rounded-[22px] border border-blue-100 shadow-sm">
        <div className="grid md:grid-cols-[1.05fr_1fr]">
          <div className="space-y-5 p-5 sm:p-6">
            <MoneyInput
              id="buyability-gross-income"
              label="Gross monthly household income"
              description="Before deductions. Combine incomes if applying together."
              value={grossIncome}
              onChange={setGrossIncome}
              placeholder="e.g. 50 000"
            />

            <div>
              <label htmlFor="buyability-base-rate" className="text-xs font-semibold text-slate-800">
                Interest rate (% per year)
              </label>
              <input
                id="buyability-base-rate"
                type="number"
                inputMode="decimal"
                min={1}
                max={30}
                step={0.05}
                value={baseRateText}
                onChange={event => setBaseRateText(event.target.value)}
                aria-describedby="buyability-base-rate-note"
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-semibold text-slate-900"
              />
              <p id="buyability-base-rate-note" className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                {SA_PRIME_RATE_LABEL}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-800">Interest rate stress test</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Interest rate stress test">
                {BUYABILITY_RATE_STRESS_OFFSETS.map(offset => {
                  const selected = rateStressOffset === offset;
                  const rate = baseRate + offset;
                  const optionClass = selected
                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                    : 'border-slate-300 bg-white text-slate-800 hover:border-blue-400';
                  return (
                    <button
                      key={offset}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setRateStressOffset(offset)}
                      className={'flex min-h-12 flex-col items-center justify-center rounded-xl border px-2 py-2 transition ' + optionClass}
                      title={offset === 0 ? 'The interest rate above' : 'The interest rate above plus ' + offset.toFixed(1) + ' percentage points'}
                    >
                      <span className="text-xs font-bold leading-tight">{offset === 0 ? 'Rate' : '+' + offset.toFixed(1) + '%'}</span>
                      <span className="mt-0.5 text-[11px] font-semibold leading-tight">{rate.toFixed(2)}%</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-800">Bond term</p>
              <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Bond term">
                {BUYABILITY_BOND_TERMS.map(term => {
                  const selected = bondTerm === term;
                  const optionClass = selected
                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                    : 'border-slate-300 bg-white text-slate-800 hover:border-blue-400';
                  return (
                    <button
                      key={term}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setBondTerm(term)}
                      className={'min-h-12 rounded-xl border px-3 py-2 text-sm font-bold transition ' + optionClass}
                    >
                      {term} years
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col bg-[#0c2254] p-5 text-white sm:p-6">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-blue-200">Selected home</p>
            {pricedUnits.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Select a home type">
                {pricedUnits.map(unit => {
                  const selected = String(unit.id) === String(selectedUnit?.id);
                  const label = formatArea(unit.floorSize) || unit.name;
                  return (
                    <button
                      key={unit.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedUnitId(String(unit.id))}
                      className={`rounded-full border px-3 py-2 text-xs font-bold transition ${selected ? 'border-white bg-white text-blue-950' : 'border-blue-300/70 bg-transparent text-white hover:bg-white/10'}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-xs text-blue-100">Starting price · {formatExactPrice(priceFrom)}</p>
            )}

            <p className="mt-4 text-sm text-blue-100">Estimated monthly bond</p>
            <p className="text-4xl font-extrabold leading-none tracking-tight sm:text-[42px]">
              {monthlyBondEstimate === null ? 'On request' : formatExactPrice(monthlyBondEstimate)}
            </p>
            <p className="mt-1 text-[11px] text-blue-200">
              {selectedHomeLabel} · {formatExactPrice(Number(selectedPrice))} · {selectedRate.toFixed(2)}% · {bondTerm} years · no deposit
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-blue-300/25 pt-3">
              <div>
                <p className="text-[11px] text-blue-200">Gross income required</p>
                <p className="mt-0.5 text-lg font-extrabold">
                  {minimumGrossForSelectedHome === null ? 'On request' : formatExactPrice(minimumGrossForSelectedHome) + '+'}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-blue-200">Your income</p>
                <p className="mt-0.5 text-lg font-extrabold">
                  {grossIncomeAmount > 0 ? formatExactPrice(grossIncomeAmount) : '—'}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-blue-900/80 px-3.5 py-3 text-xs leading-relaxed text-blue-50">
              {grossIncomeAmount > 0
                ? `On ${formatExactPrice(grossIncomeAmount)} a month, you are within budget for ${homeFitSummary.within} of ${pricedUnits.length} home${pricedUnits.length === 1 ? '' : 's'}${homeFitSummary.stretch ? `, a stretch for ${homeFitSummary.stretch}` : ''}.`
                : 'Add your gross household income to see which home types may fit your budget.'}
            </div>

            <Button
              type="button"
              disabled={grossIncomeAmount <= 0}
              onClick={onShowHomesWithinBudget}
              className="mt-4 h-12 w-full rounded-xl bg-orange-500 px-6 text-sm font-extrabold text-blue-950 hover:bg-orange-400 disabled:bg-orange-300"
            >
              Show homes that fit my budget <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <button
              type="button"
              disabled={grossIncomeAmount <= 0}
              onClick={() => onRequestFullAssessment(grossIncomeAmount, selectedUnit ? String(selectedUnit.id) : undefined)}
              className="mt-2 self-center text-[11px] font-semibold text-blue-200 underline decoration-blue-200/50 underline-offset-2 hover:text-white disabled:opacity-50"
            >
              Continue to a full affordability assessment
            </button>
          </div>
        </div>
      </Card>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        Indicative only: this estimate uses the selected home price with no deposit and assumes bond repayments stay within a third of gross income. Lender rates, debts, ownership costs and a full affordability check can change the outcome.
      </p>
    </section>
  );
}

function DevelopmentCostBreakdown({
  units,
  buyability,
}: {
  units: PreviewUnit[];
  buyability: BuyabilityEstimate;
}) {
  const pricedUnits = useMemo(
    () =>
      units
        .filter(unit => getPositiveNumber(unit.publicFacts?.priceFrom) !== null)
        .sort(
          (left, right) =>
            Number(left.publicFacts?.priceFrom) - Number(right.publicFacts?.priceFrom),
        ),
    [units],
  );
  const [selectedUnitId, setSelectedUnitId] = useState<string>(() =>
    pricedUnits[0] ? String(pricedUnits[0].id) : '',
  );
  const selectedUnit = pricedUnits.find(unit => String(unit.id) === selectedUnitId) ?? pricedUnits[0] ?? null;
  const selectedPrice = getPositiveNumber(selectedUnit?.publicFacts?.priceFrom);
  const monthlyBond = selectedPrice === null
    ? null
    : calculateMonthlyRepayment(selectedPrice, buyability.interestRate, buyability.termYears);

  useEffect(() => {
    if (selectedUnit && String(selectedUnit.id) !== selectedUnitId) {
      setSelectedUnitId(String(selectedUnit.id));
    }
  }, [selectedUnit, selectedUnitId]);

  return (
    <section aria-labelledby="development-cost-breakdown-heading" className="scroll-mt-32">
      <div className="mb-3">
        <h2 id="development-cost-breakdown-heading" className="text-lg font-extrabold tracking-tight text-slate-900">
          What you’ll actually pay
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          The monthly bond is calculated for you. Everything else stays pending until the developer confirms it, so nothing is guessed.
        </p>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          {pricedUnits.length > 0 ? (
            <div className="mb-4">
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-1.5">
                <span className="text-xs font-bold text-slate-800">Showing costs for</span>
                <span className="text-[10px] text-slate-500">Choose a home type</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
                {pricedUnits.map(unit => {
                  const selected = String(unit.id) === String(selectedUnit?.id);
                  const homeLabel = formatArea(unit.floorSize) || unit.name;
                  const bedrooms = getBedroomCount(unit.publicFacts?.bedrooms);
                  const bedroomLabel =
                    bedrooms === null ? null : bedrooms === 0 ? 'Studio' : `${bedrooms} bed`;
                  return (
                    <button
                      key={unit.id}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`Show costs for ${unit.name}, ${formatExactPrice(Number(unit.publicFacts?.priceFrom))}`}
                      onClick={() => setSelectedUnitId(String(unit.id))}
                      className={`min-h-11 min-w-0 rounded-xl border px-2.5 py-1.5 text-left transition ${selected ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50/70'}`}
                    >
                      <span className="block truncate text-[11px] font-bold leading-tight sm:text-xs">{homeLabel}</span>
                      <span className={`mt-0.5 block truncate text-[10px] font-semibold leading-tight ${selected ? 'text-blue-100' : 'text-slate-500'}`}>
                        {formatExactPrice(Number(unit.publicFacts?.priceFrom))}
                        {bedroomLabel ? ` · ${bedroomLabel}` : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="mb-5 text-xs text-slate-500">A published home price is needed to calculate a bond estimate.</p>
          )}

          <div className="grid gap-4 md:grid-cols-2 md:gap-5">
            <div className="rounded-2xl border border-blue-200 bg-blue-50/45 p-3.5 sm:p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-blue-950">Monthly</h3>
                <Badge variant="outline" className="border-blue-200 bg-white/80 text-[9px] font-bold text-blue-800">Recurring</Badge>
              </div>
              <div className="divide-y divide-blue-100">
                <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-xs">
                  <span className="text-slate-700">Bond repayment</span>
                  <span className="text-right text-sm font-extrabold text-blue-950">
                    {monthlyBond === null ? 'Price needed' : formatExactPrice(monthlyBond)}
                  </span>
                </div>
                <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-xs">
                  <span className="text-slate-600">Levy</span>
                  <Badge variant="outline" className="border-dashed border-slate-400 bg-white/70 text-[9px] font-semibold text-slate-600">Monthly levy pending</Badge>
                </div>
                <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-xs">
                  <span className="text-slate-600">Rates &amp; taxes</span>
                  <Badge variant="outline" className="border-dashed border-slate-400 bg-white/70 text-[9px] font-semibold text-slate-600">Municipal rates pending</Badge>
                </div>
                <div className="mt-2 flex min-h-10 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-white/80 px-2.5 py-2 text-xs font-extrabold text-slate-900">
                  <span>Total monthly</span>
                  <span className="text-right">
                    {monthlyBond === null ? 'Pending' : `${formatExactPrice(monthlyBond)} + levy & rates`}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/45 p-3.5 sm:p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-amber-950">Once-off</h3>
                <Badge variant="outline" className="border-amber-200 bg-white/80 text-[9px] font-bold text-amber-900">At purchase</Badge>
              </div>
              <div className="divide-y divide-amber-100">
                <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-xs">
                  <span className="text-slate-600">Deposit</span>
                  <span className="text-right font-bold text-slate-900">R 0 (assumed)</span>
                </div>
                <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-xs">
                  <span className="text-slate-600">Bond registration &amp; attorney fees</span>
                  <Badge variant="outline" className="border-dashed border-slate-400 bg-white/70 text-[9px] font-semibold text-slate-600">Estimate pending</Badge>
                </div>
                <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-xs">
                  <span className="text-slate-600">Transfer costs / VAT</span>
                  <Badge variant="outline" className="border-dashed border-slate-400 bg-white/70 text-[9px] font-semibold text-slate-600">Developer to confirm</Badge>
                </div>
                <div className="mt-2 flex min-h-10 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-white/80 px-2.5 py-2 text-xs font-extrabold text-slate-900">
                  <span>Total once-off</span>
                  <Badge variant="outline" className="border-dashed border-slate-400 bg-white text-[9px] font-semibold text-slate-600">Pending developer figures</Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-xl bg-blue-50 px-3.5 py-3 text-xs leading-relaxed text-slate-700 sm:px-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <p>
              <strong className="text-slate-900">Where these numbers come from:</strong> Bond figures are calculated by Property Listify from the published home price at {buyability.interestRate.toFixed(2)}% over {buyability.termYears} years with no deposit. Levies, rates and transfer costs come from the developer and remain pending until confirmed.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function DevelopmentBuyingSteps() {
  const steps = [
    {
      title: 'Enquire',
      description: 'Request the price list or book a viewing.',
    },
    {
      title: 'Check affordability',
      description: 'Use Buyability to see which homes fit.',
    },
    {
      title: 'Reserve',
      description: 'Secure your chosen home with the developer.',
    },
    {
      title: 'Finance & sign',
      description: 'Apply for your bond and sign the sale agreement.',
    },
    {
      title: 'Transfer & move in',
      description: 'Registration, then collect your keys.',
    },
  ];

  return (
    <section aria-labelledby="development-buying-steps-heading">
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <h2 id="development-buying-steps-heading" className="text-base font-extrabold tracking-tight text-slate-900">
            How buying here works
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">Five steps from first enquiry to the keys.</p>
          <ol className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            {steps.map((step, index) => (
              <li key={step.title} className="min-w-0">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-1.5 text-[11px] font-bold leading-tight text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-1 text-[10px] leading-snug text-slate-600">{step.description}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </section>
  );
}

function FinancingPartnerPlacements() {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-900">Finance partners</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Home-loan and bond support</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">
            Preview
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { title: 'Bank partner', icon: Building2 },
            { title: 'Home lender', icon: CreditCard },
            { title: 'Bond originator', icon: Wallet },
          ].map(slot => {
            const Icon = slot.icon;
            return (
              <div
                key={slot.title}
                className="flex min-h-[78px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-blue-200 bg-blue-50/50 px-1.5 py-3 text-center"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700 shadow-sm">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-[9px] font-semibold leading-tight text-slate-600">
                  {slot.title}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
          Partner names and offers appear here only when verified campaigns are active.
        </p>
      </CardContent>
    </Card>
  );
}

function SponsoredFinanceOfferPlacement() {
  return (
    <Card className="overflow-hidden rounded-2xl border-blue-100 shadow-sm">
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-950 to-blue-800 px-4 py-2.5 text-white">
        <span className="text-[10px] font-bold uppercase tracking-wide">Sponsored finance offer</span>
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-semibold">Preview</span>
      </div>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <HandCoins className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-bold text-slate-900">A place for a relevant home-finance offer</p>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
            Shown only when an approved partner campaign is available for this development.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function DevelopmentEnquiryCard({
  name,
  developerName,
  priceFrom,
  units,
  brochureAvailable,
  buyability,
  onRequestLead,
  whatsappHref,
}: {
  name: string;
  developerName: string;
  priceFrom?: number | null;
  units: PreviewUnit[];
  brochureAvailable: boolean;
  buyability: BuyabilityEstimate;
  onRequestLead: (request: DevelopmentInlineLeadRequest) => void;
  whatsappHref?: string | null;
}) {
  const unitOptions = useMemo(
    () =>
      units
        .slice()
        .sort((left, right) => {
          const leftPrice = getPositiveNumber(left.publicFacts?.priceFrom);
          const rightPrice = getPositiveNumber(right.publicFacts?.priceFrom);
          if (leftPrice !== null && rightPrice !== null) return leftPrice - rightPrice;
          if (leftPrice !== null) return -1;
          if (rightPrice !== null) return 1;
          return (getPositiveNumber(left.floorSize) ?? Number.POSITIVE_INFINITY) -
            (getPositiveNumber(right.floorSize) ?? Number.POSITIVE_INFINITY);
        }),
    [units],
  );
  const pricedUnits = useMemo(
    () => unitOptions.filter(unit => getPositiveNumber(unit.publicFacts?.priceFrom) !== null),
    [unitOptions],
  );
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(() =>
    unitOptions[0] ? String(unitOptions[0].id) : null,
  );
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const selectedUnit = unitOptions.find(unit => String(unit.id) === selectedUnitId) ?? null;
  const minimumPrice = pricedUnits.length
    ? getPositiveNumber(pricedUnits[0].publicFacts?.priceFrom)
    : getPositiveNumber(priceFrom);
  const selectedPrice = selectedUnit
    ? getPositiveNumber(selectedUnit.publicFacts?.priceFrom)
    : minimumPrice;
  const monthlyBond = selectedPrice === null
    ? null
    : calculateMonthlyRepayment(selectedPrice, buyability.interestRate, buyability.termYears);

  useEffect(() => {
    if (selectedUnitId && !unitOptions.some(unit => String(unit.id) === selectedUnitId)) {
      setSelectedUnitId(unitOptions[0] ? String(unitOptions[0].id) : null);
    }
  }, [selectedUnitId, unitOptions]);

  const submitLead = (mode: DevelopmentInlineLeadRequest['mode'], ctaLocation: string) => {
    const nameError = fullName.trim() ? undefined : 'Enter your full name.';
    const phoneError = agentProfilePhoneError(mobileNumber) ?? undefined;
    setErrors({ name: nameError, phone: phoneError });
    if (nameError || phoneError) return;

    onRequestLead({
      mode,
      ctaLocation,
      unitId: selectedUnit ? String(selectedUnit.id) : undefined,
      name: fullName.trim(),
      phone: mobileNumber.trim(),
      affordabilityData:
        buyability.grossMonthlyIncome > 0
          ? {
              monthlyIncome: buyability.grossMonthlyIncome,
              maxAffordable: buyability.estimatedBuyingPower ?? undefined,
              calculatedAt: new Date().toISOString(),
            }
          : null,
    });
  };

  const getDetailedOptionLabel = (unit: PreviewUnit) => {
    const area = formatArea(unit.floorSize);
    const matchingAreaCount = area
      ? unitOptions.filter(option => formatArea(option.floorSize) === area).length
      : 0;
    if (area && matchingAreaCount < 2) return area;

    const nameDetail = area
      ? unit.name
          .replace(area, '')
          .replace(/^\s*(?:house|home)\s*[-–:]?\s*/i, '')
          .trim()
      : '';
    const bedrooms = getBedroomCount(unit.publicFacts?.bedrooms);
    const bathrooms = getPositiveNumber(unit.publicFacts?.bathrooms);
    const details = nameDetail ||
      [
        bedrooms === null ? null : `${bedrooms} bed`,
        bathrooms === null ? null : `${bathrooms} bath`,
      ]
        .filter(Boolean)
        .join(' · ');

    return [area, details || unit.name].filter(Boolean).join(' · ');
  };

  const optionLabel = (unit: PreviewUnit, index: number) => {
    const label = getDetailedOptionLabel(unit);
    const duplicateCount = unitOptions.filter(
      option => getDetailedOptionLabel(option) === label,
    ).length;
    if (duplicateCount < 2) return label;

    const duplicateIndex =
      unitOptions
        .slice(0, index)
        .filter(option => getDetailedOptionLabel(option) === label).length + 1;
    return `${label} · Option ${duplicateIndex}`;
  };

  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardContent className="p-3.5 sm:p-4">
        <h2 className="text-sm font-extrabold tracking-tight text-blue-950">
          Interested in {name}?
        </h2>
        <p className="mt-0.5 text-[10px] leading-relaxed text-slate-600">
          Get the price list and book a viewing with the {developerName || 'development'} sales team.
        </p>

        <div className="mt-2.5 rounded-xl bg-blue-50/80 px-3 py-2">
          <p className="text-[10px] text-slate-600">From</p>
          <p className="text-base font-extrabold leading-tight text-blue-950">
            {minimumPrice === null ? 'Price on request' : formatExactPrice(minimumPrice)}
          </p>
          <p className="mt-0.5 text-[9px] text-slate-600">
            Est. {monthlyBond === null ? 'bond on request' : `${formatExactPrice(monthlyBond)} / month`}
            {selectedUnit ? ` · ${optionLabel(selectedUnit, unitOptions.indexOf(selectedUnit))}` : ''}
          </p>
        </div>

        <fieldset className="mt-2.5">
          <legend className="text-[10px] font-bold text-blue-950">
            Which home are you interested in? ({unitOptions.length})
          </legend>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {unitOptions.map((unit, index) => {
              const selected = String(unit.id) === selectedUnitId;
              return (
                <button
                  key={unit.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedUnitId(String(unit.id))}
                  className={`min-h-7 rounded-full border px-2.5 text-[10px] font-bold transition ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-800 hover:border-blue-400'}`}
                >
                  {optionLabel(unit, index)}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={selectedUnitId === null}
              onClick={() => setSelectedUnitId(null)}
              className={`min-h-7 rounded-full border px-2.5 text-[10px] font-bold transition ${selectedUnitId === null ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-800 hover:border-blue-400'}`}
            >
              Not sure yet
            </button>
          </div>
        </fieldset>

        <div className="mt-2.5 space-y-2">
          <div>
            <label htmlFor="development-preview-lead-name" className="text-[10px] font-bold text-blue-950">
              Full name
            </label>
            <input
              id="development-preview-lead-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={event => {
                setFullName(event.target.value);
                if (errors.name) setErrors(current => ({ ...current, name: undefined }));
              }}
              placeholder="Your name"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'development-preview-lead-name-error' : undefined}
              className="mt-1 h-8 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-[11px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            {errors.name ? (
              <p id="development-preview-lead-name-error" className="mt-0.5 text-[9px] text-red-600" role="alert">
                {errors.name}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="development-preview-lead-phone" className="text-[10px] font-bold text-blue-950">
              Mobile number
            </label>
            <input
              id="development-preview-lead-phone"
              type="tel"
              autoComplete="tel"
              value={mobileNumber}
              onChange={event => {
                setMobileNumber(event.target.value);
                if (errors.phone) setErrors(current => ({ ...current, phone: undefined }));
              }}
              placeholder="e.g. 082 123 4567"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'development-preview-lead-phone-error' : undefined}
              className="mt-1 h-8 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-[11px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            {errors.phone ? (
              <p id="development-preview-lead-phone-error" className="mt-0.5 text-[9px] leading-snug text-red-600" role="alert">
                {errors.phone}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-2.5 flex gap-2 rounded-lg bg-emerald-50 px-2.5 py-2 text-[9px] leading-snug text-emerald-900">
          <CheckCircle2 className="mt-px h-3 w-3 shrink-0 text-emerald-700" />
          <p>
            {buyability.grossMonthlyIncome > 0
              ? 'Your BuyAbility result goes with your enquiry. '
              : 'Complete BuyAbility to include your estimate with the enquiry. '}
            {buyability.grossMonthlyIncome > 0
              ? 'Your budget summary is below.'
              : 'You can add your gross income above.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => submitLead('info', 'development_preview_price_list')}
          className="mt-2.5 flex min-h-9 w-full items-center justify-center rounded-lg bg-orange-500 px-4 text-xs font-extrabold text-blue-950 transition hover:bg-orange-400"
        >
          Request price list
        </button>

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => submitLead('viewing', 'development_preview_viewing')}
            className="flex min-h-8 items-center justify-center gap-1 rounded-lg border border-blue-500 px-1.5 text-[9px] font-bold text-blue-700 transition hover:bg-blue-50"
          >
            <CalendarDays className="h-3 w-3 shrink-0" /> Book a viewing
          </button>
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-8 items-center justify-center gap-1 rounded-lg border border-emerald-600 px-1.5 text-[9px] font-bold text-emerald-700 transition hover:bg-emerald-50"
            >
              <MessageCircle className="h-3 w-3 shrink-0" /> WhatsApp
            </a>
          ) : (
            <button
              type="button"
              disabled
              title="A verified WhatsApp contact has not been provided for this development."
              className="flex min-h-8 cursor-not-allowed items-center justify-center gap-1 rounded-lg border border-emerald-600/50 px-1.5 text-[9px] font-bold text-emerald-700/60"
            >
              <MessageCircle className="h-3 w-3 shrink-0" /> WhatsApp
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => submitLead('brochure', 'development_preview_brochure')}
          className="mt-2 flex min-h-7 w-full items-center justify-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-900"
        >
          <FileDown className="h-3 w-3" />
          {brochureAvailable ? 'Download brochure (PDF)' : 'Request brochure'}
        </button>

        <p className="mt-1 text-center text-[9px] leading-relaxed text-slate-500">
          No obligation. We’ll ask for your email and consent before sending your request.
        </p>
      </CardContent>
    </Card>
  );
}

function DevelopmentBudgetSummary({
  units,
  buyability,
}: {
  units: PreviewUnit[];
  buyability: BuyabilityEstimate;
}) {
  const { pricedCount, within, stretch } = useMemo(
    () =>
      units.reduce(
        (summary, unit) => {
          const price = getPositiveNumber(unit.publicFacts?.priceFrom);
          if (price === null) return summary;
          summary.pricedCount += 1;
          if (buyability.grossMonthlyIncome <= 0) return summary;
          const monthlyPayment = calculateMonthlyRepayment(
            price,
            buyability.interestRate,
            buyability.termYears,
          );
          const grossIncomeNeeded = monthlyPayment * 3;
          if (buyability.grossMonthlyIncome >= grossIncomeNeeded) summary.within += 1;
          else if (buyability.grossMonthlyIncome * 1.1 >= grossIncomeNeeded) summary.stretch += 1;
          return summary;
        },
        { pricedCount: 0, within: 0, stretch: 0 },
      ),
    [buyability.grossMonthlyIncome, buyability.interestRate, buyability.termYears, units],
  );

  const scrollToBuyability = () => {
    document.getElementById('buyability-heading')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <Card className="rounded-2xl border-blue-950 bg-[#0c2254] text-white shadow-sm">
      <CardContent className="p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[9px] font-extrabold uppercase tracking-wider text-blue-200">Your budget</p>
          <p className="text-[10px] font-bold text-white">
            {buyability.grossMonthlyIncome > 0
              ? `${formatExactPrice(buyability.grossMonthlyIncome)} / month`
              : 'Not added yet'}
          </p>
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-blue-50">
          {buyability.grossMonthlyIncome > 0
            ? `Within budget for ${within} of ${pricedCount} home ${pricedCount === 1 ? 'type' : 'types'}${stretch > 0 ? `, a stretch for ${stretch}` : ''}.`
            : 'Add your gross household income in BuyAbility to see which home types may fit.'}
        </p>
        <button
          type="button"
          onClick={scrollToBuyability}
          className="mt-2 text-[9px] font-semibold text-blue-100 underline decoration-blue-300/60 underline-offset-2 hover:text-white"
        >
          Adjust in BuyAbility ↑
        </button>
      </CardContent>
    </Card>
  );
}

function DevelopmentUpdatesCard({
  onRequestUpdates,
}: {
  onRequestUpdates: (email: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError('');
    onRequestUpdates(normalizedEmail);
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-blue-100 bg-gradient-to-br from-blue-50 to-white shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
            <Home className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-bold text-slate-900">Register for development updates</p>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
              Hear about new homes, availability and price changes.
            </p>
          </div>
        </div>
        <form className="mt-3 space-y-2" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="development-updates-email">
            Email address
          </label>
          <input
            id="development-updates-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={event => {
              setEmail(event.target.value);
              if (emailError) setEmailError('');
            }}
            placeholder="Your email address"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? 'development-updates-email-error' : undefined}
          />
          {emailError ? (
            <p id="development-updates-email-error" className="text-[10px] text-red-600" role="alert">
              {emailError}
            </p>
          ) : null}
          <Button type="submit" className="h-9 w-full rounded-xl text-xs font-bold">
            Request updates <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </form>
        <p className="mt-2 text-[9px] leading-relaxed text-slate-500">
          This opens our enquiry form so you can review and consent before sending your request.
        </p>
      </CardContent>
    </Card>
  );
}

export function DevelopmentDetailPage({
  name,
  location,
  description,
  heroSubtitle,
  heroImage,
  priceFrom,
  priceLabel,
  startingPriceLabel,
  status,
  developmentType,
  ownership,
  monthlyBondEstimate,
  minimumGrossIncome,
  amenities,
  amenityGroups,
  developmentDocumentUrl,
  galleryImages,
  photoCount,
  videoCount,
  floorPlanCount,
  videoTitle,
  videoThumbnailUrl,
  videoGalleryIndex,
  units,
  developerName,
  brochureAvailable,
  onDevelopmentLeadRequest,
  locationContent,
  developerContent,
  overlayContent,
  onOpenGallery,
  onOpenUnit,
  onEnquireUnit,
  onRequestFullAssessment,
  onRequestUpdates,
  onEnquire,
}: DevelopmentDetailPageProps) {
  const [activeSection, setActiveSection] = useState('overview');
  const [buyabilityEstimate, setBuyabilityEstimate] = useState<BuyabilityEstimate>({
    grossMonthlyIncome: 0,
    estimatedBuyingPower: null,
    // Example rate (SA_PRIME_RATE), not the current prime rate; payload shape unchanged.
    interestRate: SA_PRIME_RATE,
    termYears: 30,
  });
  const [onlyHomesWithinBudget, setOnlyHomesWithinBudget] = useState(false);
  const reportBuyabilityEstimate = useCallback(
    (estimate: BuyabilityEstimate) => setBuyabilityEstimate(estimate),
    [],
  );
  const galleryCount = photoCount + videoCount + floorPlanCount;
  const previewImages = galleryImages.slice(0, 4);
  const bedroomRangeLabel = getBedroomRangeLabel(units);
  const heroStatus = status.toLowerCase() === 'selling' ? 'Now Selling' : status;
  const titleLines = getTitleLines(name);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const showHomesWithinBudget = () => {
    setOnlyHomesWithinBudget(true);
    window.requestAnimationFrame(() => scrollToSection('available-units'));
  };

  useEffect(() => {
    const updateActiveSection = () => {
      const visibleSections = SECTION_LINKS.map(section => ({
        id: section.id,
        element: document.getElementById(section.id),
      })).filter(
        (section): section is { id: string; element: HTMLElement } =>
          section.element !== null && section.element.getBoundingClientRect().top <= 150,
      );
      const current = visibleSections[visibleSections.length - 1];
      setActiveSection(current?.id ?? 'overview');
    };

    window.addEventListener('scroll', updateActiveSection, { passive: true });
    updateActiveSection();
    return () => window.removeEventListener('scroll', updateActiveSection);
  }, []);

  const homeFacts = [
    { label: 'Development type', value: developmentType, icon: Building2 },
    { label: 'Ownership', value: ownership, icon: ShieldCheck },
    { label: 'Home configurations', value: bedroomRangeLabel, icon: BedDouble },
    { label: 'Development stage', value: status, icon: Sparkles },
  ];
  const visibleAmenities = amenities.slice(0, 6);
  const faqItems = [
    {
      question: 'What home configurations are available?',
      answer:
        bedroomRangeLabel === 'Bedroom details on request'
          ? 'Bedroom details have not been published yet. Check the home listings above or contact the sales team for current options.'
          : `Published home configurations range from ${bedroomRangeLabel}. Browse the home cards above for details on each option.`,
    },
    {
      question: 'What is the advertised price range?',
      answer: `The advertised development price range is ${priceLabel}. Prices vary by home type; check the individual home cards for published prices and confirm current pricing with the sales team.`,
    },
    {
      question: 'Which title type is offered?',
      answer:
        ownership && ownership !== '-'
          ? `The published development details list ${ownership}.`
          : 'Title information has not been published yet. Please contact the sales team for details.',
    },
    {
      question: 'What amenities are available?',
      answer: amenities.length
        ? `Published amenities include ${visibleAmenities.join(', ')}${amenities.length > visibleAmenities.length ? `, and ${amenities.length - visibleAmenities.length} more` : ''}. See the lifestyle and development gallery above for photos.`
        : 'Development-wide amenities have not been published yet. Contact the sales team for current details.',
    },
    {
      question: 'Where is the development located?',
      answer:
        location && location !== 'Area to be confirmed'
          ? `The development is listed in ${location}.`
          : 'The development location has not been confirmed in the public listing yet.',
    },
    {
      question: 'How can I check which homes are available?',
      answer:
        'Review the home cards above for published options, then open a home for more details or contact the sales team to confirm current availability.',
    },
  ];

  return (
    <>
      <div className="min-h-screen bg-slate-50 pb-24 md:pb-0">
        <ListingNavbar />

        <div className="mx-auto max-w-7xl px-4 py-3 text-xs text-slate-500">
          Home <ChevronRight className="mx-1 inline h-3 w-3" /> Developments
          <ChevronRight className="mx-1 inline h-3 w-3" />
          <span className="font-semibold text-slate-800">{name}</span>
        </div>

        <section className="relative isolate min-h-[410px] overflow-hidden bg-slate-900 text-white md:min-h-[470px]">
          {heroImage ? (
            <img
              src={heroImage}
              alt={`${name} development`}
              className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
              fetchPriority="high"
            />
          ) : null}
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-slate-950/10" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/10" />
          <div className="mx-auto flex min-h-[410px] max-w-7xl flex-col justify-end px-5 pb-9 pt-8 md:min-h-[470px] md:px-8 md:pb-12">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white/95 sm:text-sm">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {location}
                </span>
                {heroStatus ? (
                  <Badge className="border-0 bg-emerald-500 text-white hover:bg-emerald-500">
                    {heroStatus}
                  </Badge>
                ) : null}
              </div>
              <h1 className="mt-4 max-w-[20ch] text-balance text-4xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-5xl md:text-[3.5rem]">
                {titleLines.map((line, index) => (
                  <span key={`${index}-${line}`} className="block">
                    {line}
                  </span>
                ))}
              </h1>
              {heroSubtitle ? (
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/95 sm:text-base">
                  {heroSubtitle}
                </p>
              ) : null}
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-semibold text-white sm:text-sm">
                <div className="flex items-center gap-2">
                  <Home className="h-7 w-7 shrink-0 text-white/90" />
                  <div>
                    <span className="block text-[10px] font-medium uppercase tracking-wider text-white/65">
                      Starting from
                    </span>
                    <span className="mt-0.5 block text-base sm:text-lg">{startingPriceLabel}</span>
                  </div>
                </div>
                <span className="hidden h-8 w-px bg-white/30 sm:block" />
                <div className="flex items-center gap-2">
                  <BedDouble className="h-7 w-7 shrink-0 text-white/90" />
                  <div>
                    <span className="block text-[10px] font-medium uppercase tracking-wider text-white/65">
                      Bedrooms
                    </span>
                    <span className="mt-0.5 block">{bedroomRangeLabel}</span>
                  </div>
                </div>
                <span className="hidden h-8 w-px bg-white/30 sm:block" />
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-7 w-7 shrink-0 text-white/90" />
                  <div>
                    <span className="block text-[10px] font-medium uppercase tracking-wider text-white/65">
                      Title type
                    </span>
                    <span className="mt-0.5 block">{ownership}</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => scrollToSection('available-units')}
                  className="h-11 rounded-full bg-orange-500 px-8 font-bold text-white shadow-lg hover:bg-orange-600 sm:px-10"
                >
                  View available homes <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                {videoCount > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenGallery(videoGalleryIndex, 'Development video')}
                    className="h-11 rounded-full border-white/70 bg-white/10 px-8 font-bold text-white backdrop-blur-sm hover:bg-white/20 hover:text-white sm:px-10"
                  >
                    <Play className="mr-2 h-4 w-4 fill-current" />
                    {videoTitle || 'Watch development video'}
                  </Button>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenGallery(0, 'Development gallery')}
              className="mt-7 flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/95 px-6 py-2.5 text-xs font-bold text-slate-900 shadow-lg transition hover:bg-white md:absolute md:bottom-8 md:right-[max(2rem,calc((100vw-80rem)/2))] md:mt-0"
            >
              <Home className="h-4 w-4 text-blue-700" />
              View gallery{galleryCount > 0 ? ` (${galleryCount})` : ''}
            </button>
          </div>
        </section>

        <nav
          aria-label="Development sections"
          className="sticky top-16 z-[90] border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur"
        >
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-2 sm:px-4">
            <div className="flex h-full min-w-0 flex-1 items-stretch gap-1 overflow-x-auto">
              {SECTION_LINKS.map(section => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className={`h-full shrink-0 border-b-2 px-4 text-xs font-semibold transition sm:px-5 sm:text-sm ${activeSection === section.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
                >
                  {section.label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {videoCount > 0 ? (
                <button
                  type="button"
                  onClick={() => onOpenGallery(videoGalleryIndex, 'Development video')}
                  className="hidden shrink-0 items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-700 hover:bg-blue-100 md:flex"
                >
                  <Play className="h-3.5 w-3.5 fill-current" /> Watch video
                </button>
              ) : null}
              <Button
                type="button"
                size="sm"
                onClick={onEnquire}
                className="h-9 shrink-0 rounded-full bg-orange-500 px-4 text-[11px] font-bold text-white hover:bg-orange-600 sm:px-5"
              >
                Enquire now <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </nav>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(310px,0.9fr)] lg:gap-7">
            <aside className="order-2 min-w-0 space-y-4 lg:order-2 lg:sticky lg:top-[8.5rem] lg:max-h-[calc(100vh-9.5rem)] lg:self-start lg:overflow-y-auto lg:pb-2">
              <DevelopmentEnquiryCard
                name={name}
                developerName={developerName}
                priceFrom={priceFrom}
                units={units}
                brochureAvailable={brochureAvailable}
                buyability={buyabilityEstimate}
                onRequestLead={onDevelopmentLeadRequest}
              />
              <DevelopmentBudgetSummary units={units} buyability={buyabilityEstimate} />
              <FinancingPartnerPlacements />
              <SponsoredFinanceOfferPlacement />
              <DevelopmentUpdatesCard onRequestUpdates={onRequestUpdates} />
            </aside>

            <main className="order-1 min-w-0 space-y-5 lg:order-1">
              <section id="overview" className="scroll-mt-32">
                <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                        <Star className="h-4 w-4 fill-current" />
                      </span>
                      <h2 className="text-lg font-extrabold tracking-tight text-blue-950">
                        Development at a glance
                      </h2>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 border-b border-slate-200 pb-4 sm:grid-cols-2 lg:grid-cols-4">
                      {homeFacts.map(fact => {
                        const Icon = fact.icon;
                        return (
                          <div key={fact.label} className="flex min-w-0 items-center gap-2.5">
                            <Icon className="h-6 w-6 shrink-0 text-blue-600" />
                            <div className="min-w-0">
                              <p className="text-[10px] text-slate-500">{fact.label}</p>
                              <p className="mt-0.5 truncate text-xs font-bold text-slate-900">
                                {fact.value || 'To be confirmed'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[1.2fr_1fr_1fr] sm:items-center">
                      <div className="min-w-0 px-1 py-1 sm:pr-3">
                        <p className="text-[10px] font-medium text-blue-800">
                          Advertised development price range
                        </p>
                        <p className="mt-0.5 text-xl font-extrabold tracking-tight text-blue-950 sm:text-2xl">
                          {priceLabel}
                        </p>
                      </div>
                      <div className="flex min-w-0 items-center gap-2.5 rounded-xl bg-blue-50 px-3 py-2.5">
                        <Calculator className="h-6 w-6 shrink-0 text-blue-600" />
                        <div className="min-w-0">
                          <p className="text-[10px] text-slate-500">Est. monthly bond</p>
                          <p className="mt-0.5 truncate text-base font-bold text-slate-900">
                            {monthlyBondEstimate === null || monthlyBondEstimate === undefined
                              ? 'On request'
                              : formatSARandShort(monthlyBondEstimate)}
                          </p>
                          {monthlyBondEstimate !== null && monthlyBondEstimate !== undefined ? (
                            <p className="mt-0.5 text-[10px] text-slate-500">{SA_PRIME_RATE_LABEL}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex min-w-0 items-center gap-2.5 rounded-xl bg-blue-50 px-3 py-2.5">
                        <TrendingUp className="h-6 w-6 shrink-0 text-blue-600" />
                        <div className="min-w-0">
                          <p className="text-[10px] text-slate-500">Min. gross income required</p>
                          <p className="mt-0.5 truncate text-base font-bold text-slate-900">
                            {minimumGrossIncome === null || minimumGrossIncome === undefined
                              ? 'On request'
                              : formatSARandShort(minimumGrossIncome)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {description ? (
                <section aria-labelledby="development-description-heading">
                  <Card className="rounded-2xl border-slate-200 shadow-sm">
                    <CardContent className="p-4 sm:p-5">
                      <h2
                        id="development-description-heading"
                        className="text-base font-extrabold tracking-tight text-slate-900"
                      >
                        About {name}
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
                    </CardContent>
                  </Card>
                </section>
              ) : null}

              <BuyabilityAssessment
                name={name}
                priceFrom={priceFrom}
                units={units}
                onRequestFullAssessment={onRequestFullAssessment}
                onEstimateChange={reportBuyabilityEstimate}
                onShowHomesWithinBudget={showHomesWithinBudget}
              />

              <section id="available-units" className="scroll-mt-32">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                      Find your home
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Compare the home types published for {name}.
                    </p>
                  </div>
                  {units.length > 0 ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-200 bg-emerald-50 text-emerald-800"
                    >
                      {units.length} home {units.length === 1 ? 'type' : 'types'}
                    </Badge>
                  ) : null}
                </div>
                {units.length > 0 ? (
                  <DevelopmentHomesCarousel
                    units={units}
                    onOpenUnit={onOpenUnit}
                    onEnquireUnit={onEnquireUnit}
                    buyability={buyabilityEstimate}
                    onlyWithinBudget={onlyHomesWithinBudget}
                    onOnlyWithinBudgetChange={setOnlyHomesWithinBudget}
                  />
                ) : (
                  <Card className="rounded-2xl border-dashed border-slate-300 bg-white shadow-none">
                    <CardContent className="flex items-center gap-3 p-6 text-sm text-slate-600">
                      <Home className="h-5 w-5 text-slate-400" />
                      Home configurations have not been published yet.
                    </CardContent>
                  </Card>
                )}
              </section>

              {units.length > 0 ? (
                <DevelopmentCostBreakdown units={units} buyability={buyabilityEstimate} />
              ) : null}

              {videoCount > 0 ? (
                <section aria-labelledby="development-video-feature-heading">
                  <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
                    <div className="grid md:grid-cols-[minmax(0,1.65fr)_minmax(220px,0.85fr)]">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenGallery(videoGalleryIndex, videoTitle || 'Development video')
                        }
                        aria-label="Play development video"
                        className="group relative aspect-[16/9] overflow-hidden bg-slate-900 text-left md:aspect-auto md:min-h-[220px]"
                      >
                        {videoThumbnailUrl || heroImage ? (
                          <img
                            src={videoThumbnailUrl || heroImage || undefined}
                            alt={`${name} video preview`}
                            loading="lazy"
                            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          />
                        ) : null}
                        <span className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/80 bg-slate-950/35 text-white shadow-lg backdrop-blur-sm transition group-hover:scale-105 group-hover:bg-blue-600">
                            <Play className="ml-1 h-6 w-6 fill-current" />
                          </span>
                        </span>
                        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-slate-950/80 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur-sm">
                          <Play className="h-3 w-3 fill-current" /> Watch development video
                        </span>
                      </button>
                      <div className="flex flex-col justify-center p-5 sm:p-6">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
                          Discover {name.trim().split(/\s+/)[0] || name}
                        </p>
                        <h2
                          id="development-video-feature-heading"
                          className="mt-1.5 text-xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-2xl"
                        >
                          A Lifestyle You’ll Love
                        </h2>
                        <p className="mt-2 text-xs leading-relaxed text-slate-600">
                          Explore the homes, shared spaces and neighbourhood around {name} in this
                          development video.
                        </p>
                        <button
                          type="button"
                          onClick={() => scrollToSection('amenities')}
                          className="mt-3 inline-flex w-fit items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900"
                        >
                          Learn more about the development <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </Card>
                </section>
              ) : null}

              <section id="amenities" className="scroll-mt-32">
                <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                          Lifestyle & development gallery
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Shared spaces, exteriors and development-wide visuals.
                        </p>
                      </div>
                      {galleryCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => onOpenGallery(0, 'Development gallery')}
                          className="flex shrink-0 items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900"
                        >
                          See all {galleryCount} <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                    {previewImages.length > 0 ? (
                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {previewImages.map((image, index) => (
                          <button
                            key={image.url}
                            type="button"
                            onClick={() =>
                              onOpenGallery(
                                image.index,
                                IMAGE_CATEGORY_LABELS[image.category] || 'Development gallery',
                              )
                            }
                            className="group relative aspect-[1.25/1] overflow-hidden rounded-xl bg-slate-100 text-left"
                          >
                            <img
                              src={image.url}
                              alt={IMAGE_CATEGORY_LABELS[image.category] || 'Development photo'}
                              loading="lazy"
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                            <span className="absolute bottom-2 left-2 right-2 truncate text-[10px] font-bold text-white">
                              {IMAGE_CATEGORY_LABELS[image.category] ||
                                `Development photo ${index + 1}`}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                        Development photos will appear here when they are available.
                      </div>
                    )}
                    {amenities.length > 0 ? (
                      <div className="mt-5 grid gap-5 border-t border-slate-100 pt-5 md:grid-cols-3 md:gap-4">
                        {[
                          { title: 'Security', items: amenityGroups.security, tone: 'green' as const },
                          { title: 'Recreation & family', items: amenityGroups.recreation, tone: 'green' as const },
                        ].map(group =>
                          group.items.length > 0 ? (
                            <div key={group.title}>
                              <h3 className="text-sm font-bold text-slate-900">{group.title}</h3>
                              <ul className="mt-2 space-y-1.5">
                                {group.items.map(item => (
                                  <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-slate-700">
                                    <Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${group.tone === 'green' ? 'text-emerald-700' : 'text-blue-600'}`} />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null,
                        )}

                        {amenityGroups.homeFeatures.length > 0 ? (
                          <div className="rounded-2xl bg-blue-50/80 p-4">
                            <h3 className="text-sm font-bold text-slate-900">Inside every home</h3>
                            <ul className="mt-2 space-y-1.5">
                              {amenityGroups.homeFeatures.map(item => (
                                <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-slate-700">
                                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-blue-100 pt-3 text-[11px] text-slate-600">
                              <span>Finishes &amp; fittings</span>
                              {developmentDocumentUrl ? (
                                <a
                                  href={developmentDocumentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-md border border-dashed border-blue-400 bg-white px-2 py-1 font-semibold text-blue-700 hover:bg-blue-50"
                                >
                                  Spec sheet PDF
                                </a>
                              ) : (
                                <span className="rounded-md border border-dashed border-slate-400 bg-white px-2 py-1 font-semibold text-slate-600">
                                  Spec sheet not supplied
                                </span>
                              )}
                            </div>
                          </div>
                        ) : null}

                        {amenityGroups.additional.length > 0 ? (
                          <div className="md:col-span-3">
                            <h3 className="text-xs font-bold text-slate-700">More development features</h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {amenityGroups.additional.map(item => (
                                <span key={item} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600">
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {amenityGroups.security.length === 0 &&
                        amenityGroups.recreation.length === 0 &&
                        amenityGroups.homeFeatures.length === 0 &&
                        amenityGroups.additional.length === 0 ? (
                          <p className="text-xs text-slate-500">Amenity details have not been published yet.</p>
                        ) : null}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </section>

              <section id="location" className="scroll-mt-32 space-y-3">
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                    Location & surroundings
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {location && location !== 'Area to be confirmed'
                      ? `Perfectly located in ${location}.`
                      : 'Explore the surrounding area.'}
                  </p>
                </div>
                {locationContent || (
                  <Card className="rounded-2xl border-slate-200 shadow-sm">
                    <CardContent className="grid gap-4 p-4 sm:p-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-center">
                      <div
                        role="status"
                        className="relative flex h-[170px] flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 px-5 text-center sm:h-[190px]"
                      >
                        <MapPin className="h-7 w-7 text-blue-600" />
                        <p className="mt-2 text-xs font-semibold text-slate-700">
                          Map preview unavailable
                        </p>
                        <span className="absolute bottom-2 left-1/2 max-w-[90%] -translate-x-1/2 truncate rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-slate-700 shadow-sm">
                          {location}
                        </span>
                      </div>
                      <div className="flex items-start gap-3 py-1">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Nearby destinations</p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            Nearby places are not available for this location yet.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </section>

              <DevelopmentBuyingSteps />

              {developerContent ? (
                <section id="developer" className="scroll-mt-32">
                  {developerContent}
                </section>
              ) : null}

              <section id="faq" className="scroll-mt-32">
                <Card className="rounded-2xl border-slate-200 shadow-sm">
                  <CardContent className="p-4 sm:p-5">
                    <div className="mb-2 flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                        <CircleHelp className="h-4 w-4" />
                      </span>
                      <div>
                        <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                          Frequently Asked Questions
                        </h2>
                        <p className="text-xs text-slate-500">
                          Answers based on the details published for this development.
                        </p>
                      </div>
                    </div>
                    <Accordion type="single" collapsible className="mt-2 w-full">
                      {faqItems.map((faq, index) => (
                        <AccordionItem
                          key={faq.question}
                          value={`development-faq-${index}`}
                          className="border-slate-200"
                        >
                          <AccordionTrigger className="py-3 text-left text-sm font-semibold text-slate-800 hover:no-underline">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="pb-3 text-xs leading-relaxed text-slate-600">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </section>
            </main>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Starting from
              </p>
              <p className="truncate text-sm font-extrabold text-slate-900">{startingPriceLabel}</p>
            </div>
            <Button
              type="button"
              onClick={() => scrollToSection('available-units')}
              className="h-10 shrink-0 rounded-full bg-orange-500 px-4 text-xs font-bold text-white hover:bg-orange-600"
            >
              View homes <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
      <Footer />
      {overlayContent}
    </>
  );
}
