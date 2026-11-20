// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  SortableMediaGrid,
  type MediaItem as GridMediaItem,
} from '@/components/media/SortableMediaGrid';
import { useDevelopmentWizard, type UnitType, type MediaItem } from '@/hooks/useDevelopmentWizard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/_core/hooks/useAuth';
import { usePublisherContext } from '@/hooks/usePublisherContext';
import {
  Trash2,
  Plus,
  Edit2,
  BedDouble,
  Bath,
  Car,
  Home,
  DollarSign,
  Image,
  BarChart3,
  ArrowLeft,
  ArrowRight,
  Upload,
  X,
  FileImage,
  Layers,
  Sparkles,
  AlertCircle,
  Copy,
  Maximize,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { HouseMeasureIcon } from '@/components/icons/HouseMeasureIcon';
import { IMAGE_TYPES, PDF_TYPE, floorPlanRejection, rejectionMessage, sizeHint } from '@/lib/wizardMedia';
import {
  HOME_TYPES,
  UNIT_OWNERSHIP_HINT,
  UNIT_OWNERSHIP_OPTIONS,
  applyAutoNames,
  classificationFor,
  duplicateUnitType,
  homeTypeById,
  homeTypeOf,
  houseTypeCard,
  isReadyNow,
  missingFactMessage,
  needsUnitOwnership,
  suggestUnitName,
  withReadyNow,
} from '@/lib/wizardHouseTypes';

// -- CONSTANTS --

const PARKING_TYPE_OPTIONS = [
  { value: 'none', label: 'No Parking' },
  { value: 'open', label: 'Open Bay' },
  { value: 'covered', label: 'Covered Bay' },
  { value: 'carport', label: 'Carport' },
  { value: 'garage', label: 'Garage' },
];

const GARAGE_LAYOUT_OPTIONS = [
  { value: 'side-by-side', label: 'Side-by-Side' },
  { value: 'tandem', label: 'Tandem' },
];

const UNIT_FEATURE_CATEGORIES = {
  kitchen: [
    'Built-in Oven',
    'Gas Hob',
    'Extractor Fan',
    'Granite Tops',
    'Island',
    'Pantry',
    'Scullery',
    'Dishwasher Ready',
  ],
  bathroom: [
    'En-suite',
    'Full Bathroom',
    'Guest Toilet',
    'Double Vanity',
    'Shower',
    'Bathtub',
    'Heated Rails',
  ],
  flooring: ['Porcelain Tiles', 'Laminate', 'Vinyl', 'Carpets', 'Engineered Wood', 'Screed'],
  storage: ['Built-in Cupboards', 'Walk-in Closet', 'Linen Cupboard', 'Storeroom'],
  climate: ['AC Ready', 'Ceiling Fans', 'Underfloor Heating', 'Fireplace'],
  outdoor: ['Balcony', 'Patio', 'Private Garden', 'Built-in Braai', 'Rooftop Terrace'],
  security: ['Security Gate', 'Burglar Bars', 'Intercom', 'Alarm System'],
  other: ['Fibre Ready', 'Prepaid Electricity', 'Solar Geyser', 'Inverter Ready', 'Pet Friendly'],
};

const UNIT_CATEGORY_OPTIONS = [
  { value: 'house', label: 'House' },
  { value: 'apartment', label: 'Apartment' },
] as const;

const UNIT_SUBTYPE_OPTIONS = {
  house: [
    {
      value: 'freestanding-house',
      label: 'Freestanding House',
      structuralType: 'freestanding-house',
    },
    { value: 'simplex', label: 'Simplex', structuralType: 'simplex' },
    { value: 'duplex', label: 'Duplex', structuralType: 'duplex' },
    { value: 'semi-detached', label: 'Semi-Detached', structuralType: 'townhouse' },
    { value: 'townhouse', label: 'Townhouse', structuralType: 'townhouse' },
    { value: 'plot-and-plan', label: 'Plot & Plan', structuralType: 'plot-and-plan' },
  ],
  apartment: [
    { value: 'studio', label: 'Studio', structuralType: 'studio' },
    { value: 'apartment', label: 'Apartment', structuralType: 'apartment' },
    { value: 'loft', label: 'Loft', structuralType: 'apartment' },
    { value: 'penthouse', label: 'Penthouse', structuralType: 'penthouse' },
  ],
} as const;

const STRUCTURAL_TYPE_TO_CLASSIFICATION: Record<
  string,
  { unitCategory: 'house' | 'apartment'; unitSubType: string }
> = {
  apartment: { unitCategory: 'apartment', unitSubType: 'apartment' },
  studio: { unitCategory: 'apartment', unitSubType: 'studio' },
  penthouse: { unitCategory: 'apartment', unitSubType: 'penthouse' },
  'freestanding-house': { unitCategory: 'house', unitSubType: 'freestanding-house' },
  simplex: { unitCategory: 'house', unitSubType: 'simplex' },
  duplex: { unitCategory: 'house', unitSubType: 'duplex' },
  townhouse: { unitCategory: 'house', unitSubType: 'townhouse' },
  'plot-and-plan': { unitCategory: 'house', unitSubType: 'plot-and-plan' },
};

const SUBTYPE_META = [...UNIT_SUBTYPE_OPTIONS.house, ...UNIT_SUBTYPE_OPTIONS.apartment].reduce(
  (acc, item) => {
    acc[item.value] = item;
    return acc;
  },
  {} as Record<string, (typeof UNIT_SUBTYPE_OPTIONS.house)[number]>,
);

const toStructuralType = (unitSubType: string | undefined): string => {
  if (!unitSubType) return 'apartment';
  return SUBTYPE_META[unitSubType]?.structuralType ?? 'apartment';
};

const toSubtypeLabel = (unitSubType: string | undefined): string => {
  if (!unitSubType) return 'Unspecified';
  return SUBTYPE_META[unitSubType]?.label ?? unitSubType;
};

const inferClassification = (
  unit: any,
): { unitCategory: 'house' | 'apartment'; unitSubType: string } => {
  const explicitCategory = unit?.unitCategory;
  const explicitSubType = unit?.unitSubType;
  if (
    (explicitCategory === 'house' || explicitCategory === 'apartment') &&
    typeof explicitSubType === 'string' &&
    explicitSubType.trim().length > 0
  ) {
    return { unitCategory: explicitCategory, unitSubType: explicitSubType };
  }

  const rawSpecs = unit?.specifications;
  const specs =
    rawSpecs && typeof rawSpecs === 'string'
      ? (() => {
          try {
            return JSON.parse(rawSpecs);
          } catch {
            return null;
          }
        })()
      : rawSpecs;
  const classification = specs?.classification;
  if (
    (classification?.category === 'house' || classification?.category === 'apartment') &&
    typeof classification?.subType === 'string' &&
    classification.subType.trim().length > 0
  ) {
    return { unitCategory: classification.category, unitSubType: classification.subType };
  }

  const structuralType = String(unit?.structuralType || '')
    .trim()
    .toLowerCase();
  if (STRUCTURAL_TYPE_TO_CLASSIFICATION[structuralType]) {
    return STRUCTURAL_TYPE_TO_CLASSIFICATION[structuralType];
  }

  return { unitCategory: 'apartment', unitSubType: 'apartment' };
};

export function UnitTypesPhase() {
  const {
    unitTypes,
    addUnitType,
    updateUnitType,
    removeUnitType,
    validatePhase,
    unitTypeDraft,
    setUnitTypeDraft,
    saveWorkflowStepData,
    getWizardData,
  } = useDevelopmentWizard();
  // One development = one transaction (from the start screen). Ownership is asked per
  // house type only when the development ownership is "Varies by house type".
  const askUnitOwnership = needsUnitOwnership((getWizardData?.() as any)?.ownershipTypes);
  const transactionType = useDevelopmentWizard(
    state => state.transactionType ?? state.developmentData?.transactionType,
  );
  const isRental = transactionType === 'for_rent';
  const isAuction = transactionType === 'auction';
  const editingDevelopmentId = useDevelopmentWizard(state => state.editingId);
  const { user } = useAuth();
  const { context: publisherContext } = usePublisherContext();
  const isCuratedPublisherMode =
    user?.role === 'super_admin' && publisherContext?.mode === 'platform_curator';

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');

  // Form State
  const [formData, setFormData] = useState<
    Partial<UnitType> & {
      // UI-specific parking state
      parkingKind?: 'none' | 'open' | 'covered' | 'carport' | 'garage';
      garageLayout?: 'side-by-side' | 'tandem';
      soldUnitsHistorical?: number;
    nameAuto?: boolean;
    readyNow?: boolean;
    priceToExplicit?: boolean;
    }
  >({
    name: '',
    description: '',
    // Facts start empty and stay required: pre-filled values would be published by accident.
    bedrooms: undefined,
    bathrooms: undefined,
    parkingKind: undefined,
    parkingBays: undefined,
    garageLayout: undefined,

    unitSize: 0,
    yardSize: 0,
    ...classificationFor('freestanding'),
    nameAuto: true,
    readyNow: false,
    ownershipType: undefined,
    priceToExplicit: false,

    // Refactored Pricing
    priceFrom: 0, // Base Price
    priceTo: 0, // Calculated Max
    extras: [], // { label, price }
    monthlyRentFrom: 0,
    monthlyRentTo: undefined,
    depositRequired: undefined,
    leaseTerm: '',
    isFurnished: false,
    startingBid: undefined,
    reservePrice: undefined,
    auctionStartDate: undefined,
    auctionEndDate: undefined,
    auctionStatus: 'scheduled',

    // Removed: transferCosts, levies, rates (Global now)

    totalUnits: 0,
    availableUnits: 0,
    reservedUnits: 0,
    soldUnitsHistorical: 0,
    availabilityNotProvided: isCuratedPublisherMode,
    features: {
      kitchen: [],
      bathroom: [],
      flooring: [],
      storage: [],
      climate: [],
      outdoor: [],
      security: [],
      other: [],
    },
  });

  const [unitGallery, setUnitGallery] = useState<MediaItem[]>([]);
  const [floorPlanImages, setFloorPlanImages] = useState<MediaItem[]>([]);
  // Rejected files stay visible under the section until the next good upload there.
  const [mediaErrors, setMediaErrors] = useState<{ gallery?: string[]; floorPlans?: string[] }>({});

  // Name is auto-suggested ("{size} m² {beds}-bedroom {home type}") until the publisher edits it.
  useEffect(() => {
    if (!isDialogOpen || formData.nameAuto === false) return;
    const suggested = suggestUnitName(
      {
        unitSize: formData.unitSize,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        homeType: homeTypeOf(formData),
      },
      unitTypes.filter(u => u.id !== editingId),
      // Identical twins are numbered in list order; a new type goes last.
      editingId
        ? unitTypes.slice(
            0,
            Math.max(
              0,
              unitTypes.findIndex(u => u.id === editingId),
            ),
          )
        : unitTypes,
    );
    if (suggested && suggested !== formData.name) {
      setFormData(p => ({ ...p, name: suggested }));
    }
  }, [
    isDialogOpen,
    formData.nameAuto,
    formData.unitSize,
    formData.bedrooms,
    formData.bathrooms,
    formData.unitCategory,
    formData.unitSubType,
    formData.name,
    unitTypes,
    editingId,
  ]);
  const reserveMediaUpload = trpc.developer.reserveMediaUpload.useMutation();
  const confirmMediaUpload = trpc.developer.confirmMediaUpload.useMutation();
  const presignCuratedUpload = trpc.upload.presign.useMutation();

  // Auto-Save Draft (Only when adding new unit)
  useEffect(() => {
    if (isDialogOpen && !editingId) {
      const timer = setTimeout(() => {
        setUnitTypeDraft({
          ...formData,
          baseMedia: {
            gallery: unitGallery,
            floorPlans: floorPlanImages,
            renders: [],
          },
        });
      }, 500); // Debounce 500ms
      return () => clearTimeout(timer);
    }
  }, [formData, unitGallery, floorPlanImages, isDialogOpen, editingId, setUnitTypeDraft]);

  // Reset Logic
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      bedrooms: undefined,
      bathrooms: undefined,
      parkingKind: undefined,
      parkingBays: undefined,
      garageLayout: undefined,
      unitSize: 0,
      yardSize: 0,
      ...classificationFor('freestanding'),
      nameAuto: true,
      readyNow: false,
      ownershipType: undefined,
      priceToExplicit: false,

      priceFrom: 0,
      priceTo: 0,
      extras: [],
      monthlyRentFrom: 0,
      monthlyRentTo: undefined,
      depositRequired: undefined,
      leaseTerm: '',
      isFurnished: false,
      startingBid: undefined,
      reservePrice: undefined,
      auctionStartDate: undefined,
      auctionEndDate: undefined,
      auctionStatus: 'scheduled',
      // removed global financials
      totalUnits: 0,
      availableUnits: 0,
      reservedUnits: 0,
      soldUnitsHistorical: 0,
      availabilityNotProvided: isCuratedPublisherMode,
      features: {
        kitchen: [],
        bathroom: [],
        flooring: [],
        storage: [],
        climate: [],
        outdoor: [],
        security: [],
        other: [],
      },
    });
    setUnitGallery([]);
    setFloorPlanImages([]);
    setEditingId(null);
    setActiveTab('basic');
  };

  const handleOpenDialog = (unit?: UnitType) => {
    if (unit) {
      setEditingId(unit.id);
      const classification = inferClassification(unit);

      // --- Hydrate Parking UI State ---
      let pKind: any = 'none';
      let pBays = unit.parkingBays ?? (unit as any).parking_bays ?? 0;
      let pLayout: any = undefined;

      const pType = unit.parkingType || (unit as any).parking_type;

      if (pType === 'carport') pKind = 'carport';
      else if (pType === 'garage') pKind = 'garage';
      else if (pType === 'open') pKind = 'open';
      else if (pType === 'covered') pKind = 'covered';
      else if (pType === 'none' || !pType) pKind = 'none';

      // Support legacy layout values stored in parkingType
      if (pType === 'tandem' || pType === 'side-by-side') {
        pKind = 'garage';
        pLayout = pType;
      }

      if (pKind !== 'none' && (!pBays || pBays < 1)) {
        pBays = 1;
      }

      const isFurnishedValue =
        typeof (unit as any).isFurnished === 'boolean' ? (unit as any).isFurnished : false;
      const depositValueRaw = (unit as any).depositRequired ?? (unit as any).deposit;
      const depositValue = depositValueRaw == null ? undefined : Number(depositValueRaw);
      const monthlyRentToRaw = (unit as any).monthlyRentTo;
      const monthlyRentToValue = monthlyRentToRaw == null ? undefined : Number(monthlyRentToRaw);
      const startingBidRaw = (unit as any).startingBid;
      const startingBidValue = startingBidRaw == null ? undefined : Number(startingBidRaw);
      const reservePriceRaw = (unit as any).reservePrice;
      const reservePriceValue = reservePriceRaw == null ? undefined : Number(reservePriceRaw);
      const auctionStartDateValue = formatDateTimeLocal((unit as any).auctionStartDate);
      const auctionEndDateValue = formatDateTimeLocal((unit as any).auctionEndDate);
      const auctionStatusValue = (unit as any).auctionStatus ?? 'scheduled';
      const totalFromUnit = Math.max(0, Number((unit as any).totalUnits ?? 0));
      const availableFromUnit = Math.max(0, Number((unit as any).availableUnits ?? 0));
      const reservedFromUnit = Math.max(0, Number((unit as any).reservedUnits ?? 0));
      const soldHistorical = Math.max(totalFromUnit - availableFromUnit - reservedFromUnit, 0);
      const canonicalSaleFrom = Number((unit as any).basePriceFrom ?? (unit as any).priceFrom ?? 0);
      const canonicalSaleToRaw = (unit as any).basePriceTo ?? (unit as any).priceTo;
      const canonicalSaleTo = canonicalSaleToRaw == null ? 0 : Number(canonicalSaleToRaw);

      setFormData({
        ...unit,
        priceFrom: canonicalSaleFrom,
        priceTo: canonicalSaleTo,
        unitCategory: classification.unitCategory,
        unitSubType: classification.unitSubType,
        structuralType: toStructuralType(classification.unitSubType),
        parkingKind: pKind,
        parkingBays: pBays,
        garageLayout: pLayout,
        monthlyRentFrom: (unit as any).monthlyRentFrom ?? (unit as any).monthlyRent ?? 0,
        monthlyRentTo: monthlyRentToValue,
        depositRequired: depositValue,
        leaseTerm: (unit as any).leaseTerm ?? '',
        isFurnished: isFurnishedValue,
        startingBid: startingBidValue,
        reservePrice: reservePriceValue,
        auctionStartDate: auctionStartDateValue,
        auctionEndDate: auctionEndDateValue,
        auctionStatus: auctionStatusValue,
        soldUnitsHistorical: soldHistorical,
        availabilityNotProvided: Boolean((unit as any).availabilityNotProvided),
        nameAuto: (unit as any).nameAuto === true,
        readyNow: isReadyNow(unit),
        // A "price to" that is not just base + extras was typed by the publisher.
        priceToExplicit:
          canonicalSaleTo > canonicalSaleFrom &&
          canonicalSaleTo !==
            canonicalSaleFrom +
              (unit.extras || []).reduce((s: number, x: any) => s + (Number(x?.price) || 0), 0),
        extras: unit.extras || [],
        features: unit.features || {
          kitchen: [],
          bathroom: [],
          flooring: [],
          storage: [],
          climate: [],
          outdoor: [],
          security: [],
          other: [],
        },
      });
      setUnitGallery(unit.baseMedia?.gallery || []);
      setFloorPlanImages(unit.baseMedia?.floorPlans || []);
    } else {
      // Check for Draft
      if (unitTypeDraft) {
        toast.info('Resumed your unsaved unit type', {
          icon: <Sparkles className="w-4 h-4 text-blue-500" />,
        });
        const classification = inferClassification(unitTypeDraft);
        const draftTotal = Math.max(0, Number((unitTypeDraft as any).totalUnits ?? 0));
        const draftAvailable = Math.max(0, Number((unitTypeDraft as any).availableUnits ?? 0));
        const draftReserved = Math.max(0, Number((unitTypeDraft as any).reservedUnits ?? 0));
        const draftSoldHistorical =
          typeof (unitTypeDraft as any).soldUnitsHistorical === 'number'
            ? Math.max(0, Number((unitTypeDraft as any).soldUnitsHistorical))
            : Math.max(draftTotal - draftAvailable - draftReserved, 0);
        setFormData({
          ...unitTypeDraft,
          unitCategory: classification.unitCategory,
          unitSubType: classification.unitSubType,
          structuralType: toStructuralType(classification.unitSubType),
          soldUnitsHistorical: draftSoldHistorical,
          features: unitTypeDraft.features || {
            kitchen: [],
            bathroom: [],
            flooring: [],
            storage: [],
            climate: [],
            outdoor: [],
            security: [],
            other: [],
          },
        });
        setUnitGallery(unitTypeDraft.baseMedia?.gallery || []);
        setFloorPlanImages(unitTypeDraft.baseMedia?.floorPlans || []);
        setEditingId(null);
      } else {
        resetForm();
      }
    }
    setMediaErrors({});
    setIsDialogOpen(true);
  };

  const handleDiscardDraft = () => {
    setUnitTypeDraft(null);
    resetForm();
    toast.success('Draft discarded');
  };

  /** Duplicate copies the house type straight into the list (new id, "(copy)" suffix); Edit refines it. */
  const handleDuplicate = (unit: UnitType) => {
    const copy = duplicateUnitType(unit as any, `unit-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`);
    const next = applyAutoNames([...unitTypes, { ...copy, displayOrder: unitTypes.length }]);
    saveWorkflowStepData('unit_types', { unitTypes: next });
    toast.success(`Duplicated as "${copy.name}". Edit it to change the details.`);
  };

  const handleRemove = (id: string) => {
    const next = applyAutoNames(unitTypes.filter(u => u.id !== id));
    saveWorkflowStepData('unit_types', { unitTypes: next });
  };

  // --- LOGIC HANDLERS ---

  const handleFeatureToggle = (category: keyof typeof UNIT_FEATURE_CATEGORIES, item: string) => {
    setFormData(prev => {
      const current = prev.features?.[category] || [];
      const newFeatures = current.includes(item)
        ? current.filter(i => i !== item)
        : [...current, item];

      return {
        ...prev,
        features: { ...prev.features, [category]: newFeatures } as any,
      };
    });
  };

  const toOptionalNumber = (raw: string): number | undefined => {
    const v = raw.trim();
    return v === '' ? undefined : Number(v);
  };

  const handleOptionalNumberChange = (
    field: 'monthlyRentTo' | 'depositRequired',
    value: string,
  ) => {
    const parsed = toOptionalNumber(value);
    const nextValue = parsed === undefined || Number.isFinite(parsed) ? parsed : undefined;
    setFormData(prev => ({ ...prev, [field]: nextValue }));
  };

  const formatDateTimeLocal = (value: unknown): string | undefined => {
    if (!value) return undefined;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      if (trimmed.includes('T')) return trimmed.slice(0, 16);
      if (trimmed.includes(' ')) return trimmed.replace(' ', 'T').slice(0, 16);
      return trimmed;
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(
        value.getHours(),
      )}:${pad(value.getMinutes())}`;
    }
    return undefined;
  };

  const handleSave = (addAnother = false) => {
    // Validation
    // Facts first (the suggested name comes from them); nothing is pre-filled.
    const missingFact = missingFactMessage(formData);
    if (missingFact) return toast.error(missingFact);
    if (!formData.name) return toast.error('House type name is required');
    if (!formData.description) return toast.error('Description is required');
    if (!formData.unitCategory) return toast.error('Home type is required');
    if (!formData.unitSubType) return toast.error('Home type is required');
    if (formData.unitCategory === 'house' && (!formData.yardSize || formData.yardSize <= 0)) {
      toast.warning('Erf/Garden size is recommended for house unit types');
    }
    if (isAuction) {
      if (!formData.startingBid || formData.startingBid <= 0)
        return toast.error('Starting bid is required');
      if (!formData.auctionStartDate) return toast.error('Auction start date is required');
      if (!formData.auctionEndDate) return toast.error('Auction end date is required');

      const start = new Date(formData.auctionStartDate);
      const end = new Date(formData.auctionEndDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return toast.error('Auction dates must be valid');
      }
      if (end <= start) {
        return toast.error('Auction end date must be after start date');
      }
      if (start < new Date()) {
        return toast.error('Auction start date cannot be in the past');
      }
      if (
        formData.reservePrice != null &&
        formData.reservePrice > 0 &&
        formData.reservePrice < formData.startingBid
      ) {
        return toast.error('Reserve price cannot be lower than starting bid');
      }
    } else if (isRental) {
      if (!formData.monthlyRentFrom || formData.monthlyRentFrom <= 0)
        return toast.error('Monthly Rent is required');
    } else {
      if (!formData.priceFrom) return toast.error('Price from is required');
      if (
        formData.priceToExplicit &&
        Number(formData.priceTo) > 0 &&
        Number(formData.priceTo) < Number(formData.priceFrom)
      ) {
        return toast.error('Price to cannot be lower than price from');
      }
    }
    if (askUnitOwnership && !formData.ownershipType) {
      return toast.error('Choose the ownership for this house type');
    }

    const availabilityNotProvided =
      isCuratedPublisherMode && Boolean(formData.availabilityNotProvided);
    const availableUnits = availabilityNotProvided
      ? undefined
      : Math.max(0, Number(formData.availableUnits || 0));
    const reservedUnits = availabilityNotProvided
      ? undefined
      : Math.max(0, Number(formData.reservedUnits || 0));
    const soldUnitsHistorical = availabilityNotProvided
      ? undefined
      : Math.max(0, Number(formData.soldUnitsHistorical || 0));
    const totalUnits = availabilityNotProvided
      ? undefined
      : (availableUnits || 0) + (reservedUnits || 0) + (soldUnitsHistorical || 0);

    const isSale = !isRental && !isAuction;

    // Calculate Max Price (Base + Extras) - Sale Only
    const basePrice = isSale ? formData.priceFrom || 0 : 0;
    const extrasTotal = isSale
      ? (formData.extras || []).reduce((acc, curr) => acc + (Number(curr.price) || 0), 0)
      : 0;
    // "Price to" typed by the publisher wins; otherwise base + extras (as before).
    const explicitPriceTo =
      isSale && formData.priceToExplicit && Number(formData.priceTo) > basePrice
        ? Number(formData.priceTo)
        : null;
    const calculatedPriceTo = explicitPriceTo ?? (extrasTotal > 0 ? basePrice + extrasTotal : null);

    const monthlyRentFrom = Number(formData.monthlyRentFrom || 0);
    const monthlyRentTo =
      formData.monthlyRentTo && formData.monthlyRentTo > 0
        ? Number(formData.monthlyRentTo)
        : undefined;
    const depositRequired =
      typeof formData.depositRequired === 'number' && Number.isFinite(formData.depositRequired)
        ? formData.depositRequired
        : undefined;

    const parkingKind = formData.parkingKind || 'none';
    const parkingBays = parkingKind === 'none' ? 0 : formData.parkingBays || 1;
    const unitSubType = String(formData.unitSubType || '');
    const unitCategory = formData.unitCategory === 'house' ? 'house' : 'apartment';
    const structuralType = toStructuralType(unitSubType);
    const existingSpecifications =
      formData.specifications && typeof formData.specifications === 'object'
        ? formData.specifications
        : {};
    const normalizedYardSize =
      formData.yardSize != null && Number(formData.yardSize) > 0
        ? Number(formData.yardSize)
        : undefined;

    const newUnitBase: any = {
      ...formData,
      ownershipType: askUnitOwnership ? formData.ownershipType : undefined,
      nameAuto: formData.nameAuto !== false,
      // CRITICAL: Always ensure ID is present for persistence
      id: editingId || `unit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      // Legacy-shaped form fields are mirrored deliberately on explicit save;
      // canonical base fields remain the persistence authority.
      basePriceFrom: isSale ? basePrice : undefined,
      basePriceTo: isSale ? calculatedPriceTo : null,
      priceFrom: isSale ? basePrice : 0,
      priceTo: isSale ? calculatedPriceTo : null,
      monthlyRentFrom: isRental ? monthlyRentFrom : undefined,
      monthlyRentTo: isRental ? monthlyRentTo : undefined,
      depositRequired: isRental ? depositRequired : formData.depositRequired,
      leaseTerm: isRental ? formData.leaseTerm || undefined : undefined,
      isFurnished: isRental ? Boolean(formData.isFurnished) : undefined,
      startingBid: isAuction ? formData.startingBid : undefined,
      reservePrice: isAuction ? formData.reservePrice : undefined,
      auctionStartDate: isAuction ? formData.auctionStartDate || undefined : undefined,
      auctionEndDate: isAuction ? formData.auctionEndDate || undefined : undefined,
      auctionStatus: isAuction ? formData.auctionStatus || 'scheduled' : undefined,

      // Explicit Parking Save
      parkingBays: parkingBays,
      parkingType: parkingKind === 'none' ? null : parkingKind,
      unitCategory,
      unitSubType,
      structuralType,
      yardSize: normalizedYardSize,
      totalUnits,
      availableUnits,
      reservedUnits,
      soldUnitsHistorical,
      availabilityNotProvided,

      features: formData.features,
      baseMedia: {
        gallery: unitGallery,
        floorPlans: floorPlanImages,
        renders: [],
      },
      specifications: {
        ...existingSpecifications,
        builtInFeatures: existingSpecifications.builtInFeatures || {},
        finishes: existingSpecifications.finishes || {},
        electrical: existingSpecifications.electrical || { prepaidElectricity: false },
        classification: {
          category: unitCategory,
          subType: unitSubType,
        },
      }, // Legacy stub
      amenities: { standard: [], additional: [] }, // Legacy stub
      displayOrder: editingId
        ? unitTypes.find(u => u.id === editingId)?.displayOrder || 0
        : unitTypes.length,
      isActive: true,
      updatedAt: new Date(),
      createdAt: editingId ? undefined : new Date(),
    };
    const newUnit = withReadyNow(newUnitBase, formData.readyNow === true);

    if (editingId) {
      const nextUnits = applyAutoNames(
        unitTypes.map(u => (u.id === editingId ? { ...u, ...newUnit } : u)),
      );
      saveWorkflowStepData('unit_types', { unitTypes: nextUnits });
      toast.success('House type updated');
    } else {
      const nextUnits = applyAutoNames([...unitTypes, newUnit]);
      saveWorkflowStepData('unit_types', { unitTypes: nextUnits });

      setUnitTypeDraft(null); // Clear draft
      toast.success('House type added');
    }

    if (addAnother) {
      // Small delay to reset properly
      setTimeout(() => {
        resetForm();
        setUnitTypeDraft(null); // Ensure draft is cleared for next one
        setFormData(prev => ({ ...prev, name: '' }));
        setActiveTab('basic');
      }, 100);
    } else {
      setIsDialogOpen(false);
    }
  };

  const handleMediaUpload = async (allFiles: File[], category: 'gallery' | 'floorPlans') => {
    // Same checks and caps as the development Media step (15 MB photos, 25 MB PDFs);
    // rejections stay under the section until the next good upload.
    const problems: string[] = [];
    const files: File[] = [];
    for (const file of allFiles) {
      const problem =
        category === 'gallery' ? rejectionMessage(file, 'image') : floorPlanRejection(file);
      if (problem) problems.push(problem);
      else files.push(file);
    }
    setMediaErrors(prev => ({ ...prev, [category]: problems.length ? problems : undefined }));
    if (files.length === 0) return;
    try {
      for (const file of files) {
        let mediaUrl: string;
        let storageKey: string;
        let fileName: string;
        let fileSize: number;
        let uploadReceipt: string | undefined;

        if (isCuratedPublisherMode) {
          const target = await presignCuratedUpload.mutateAsync({
            filename: file.name,
            contentType: file.type,
          });
          const uploadResponse = await fetch(target.url, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          });
          if (!uploadResponse.ok) {
            throw new Error(`Upload failed with status ${uploadResponse.status}.`);
          }
          mediaUrl = target.publicUrl;
          storageKey = target.key;
          fileName = file.name;
          fileSize = file.size;
        } else {
          const persistedUnitId =
            editingId && !editingId.startsWith('unit-') ? editingId : undefined;
          const reservation = await reserveMediaUpload.mutateAsync({
            filename: file.name,
            contentType: file.type,
            category: category === 'gallery' ? 'unit_gallery' : 'unit_floorplan',
            ...(editingDevelopmentId ? { developmentId: editingDevelopmentId } : {}),
            ...(persistedUnitId ? { unitId: persistedUnitId } : {}),
          });
          const uploadResponse = await fetch(reservation.uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          });
          if (!uploadResponse.ok) {
            throw new Error(`Upload failed with status ${uploadResponse.status}.`);
          }
          const confirmed = await confirmMediaUpload.mutateAsync({
            uploadReceipt: reservation.uploadReceipt,
          });
          mediaUrl = confirmed.url;
          storageKey = confirmed.key;
          fileName = confirmed.fileName;
          fileSize = confirmed.fileSize;
          uploadReceipt = confirmed.uploadReceipt;
        }

        const newItem: MediaItem = {
          id: `u-${Date.now()}-${Math.random()}`,
          url: mediaUrl,
          type: category === 'floorPlans' && file.type === 'application/pdf' ? 'pdf' : 'image',
          category: category === 'gallery' ? 'photo' : 'floorplan',
          isPrimary: category === 'gallery' && unitGallery.length === 0,
          displayOrder: 0,
          fileName,
          fileSize,
          storageKey,
          ...(uploadReceipt ? { uploadReceipt } : {}),
        };

        if (category === 'gallery') setUnitGallery(prev => [...prev, newItem]);
        else setFloorPlanImages(prev => [...prev, newItem]);
      }
      toast.success('Upload complete');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unit media upload failed.');
    }
  };

  // --- RENDERERS ---
  const renderSalePricingUI = () => (
    <div className="space-y-8 max-w-3xl">
      {/* Section 1: Base Price & Extras */}
      <div className="space-y-6">
        <Label className="text-base font-semibold text-slate-900 border-b pb-2 block">
          1. Unit Pricing Strategy
        </Label>

        <div className="space-y-6">
          {/* Base Price */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div className="space-y-3 max-w-sm">
              <Label className="text-slate-900 font-medium">Price from</Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                    R
                  </span>
                  <Input
                    className="pl-8 h-11 text-lg font-semibold text-slate-900"
                    type="number"
                    placeholder="0"
                    value={formData.priceFrom || ''}
                    onFocus={e => e.target.select()}
                    onChange={e => setFormData(p => ({ ...p, priceFrom: +e.target.value }))}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                The price of the house excluding any optional extras.
              </p>
              <Label className="text-slate-900 font-medium">
                Price to <span className="text-xs font-normal text-slate-500">(optional)</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                  R
                </span>
                <Input
                  className="pl-8 h-11"
                  type="number"
                  placeholder="Only if the price varies"
                  aria-label="Price to"
                  value={formData.priceToExplicit && formData.priceTo ? formData.priceTo : ''}
                  onFocus={e => e.target.select()}
                  onChange={e => {
                    const v = e.target.value;
                    setFormData(p => ({
                      ...p,
                      priceTo: v === '' ? 0 : +v,
                      priceToExplicit: v !== '',
                    }));
                  }}
                />
              </div>
            </div>
          </div>

          {/* Optional Extras */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Optional Extras / Upgrades</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setFormData(p => ({
                    ...p,
                    extras: [...(p.extras || []), { label: '', price: 0 }],
                  }))
                }
              >
                <Plus className="w-3 h-3 mr-1" /> Add Extra
              </Button>
            </div>

            {(formData.extras?.length || 0) === 0 ? (
              <div className="text-center p-6 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                <p className="text-sm text-slate-400">No optional extras added.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.extras!.map((extra, idx) => (
                  <div
                    key={idx}
                    className="flex gap-3 items-center animate-in slide-in-from-left-2 fade-in"
                  >
                    <Input
                      placeholder="Item Label (e.g. Pool, AC)"
                      value={extra.label}
                      onChange={e => {
                        const newExtras = [...(formData.extras || [])];
                        newExtras[idx].label = e.target.value;
                        setFormData(p => ({ ...p, extras: newExtras }));
                      }}
                      className="flex-1"
                    />
                    <div className="relative w-32">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                        R
                      </span>
                      <Input
                        type="number"
                        placeholder="Price"
                        value={extra.price === 0 ? '' : extra.price}
                        onChange={e => {
                          const newExtras = [...(formData.extras || [])];
                          newExtras[idx].price = +e.target.value;
                          setFormData(p => ({ ...p, extras: newExtras }));
                        }}
                        className="pl-6"
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-400 hover:text-red-500 hover:bg-red-50"
                      onClick={() => {
                        const newExtras = (formData.extras || []).filter((_, i) => i !== idx);
                        setFormData(p => ({ ...p, extras: newExtras }));
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <p className="text-sm text-slate-500">
                    Max Potential Price:{' '}
                    <strong className="text-slate-900">
                      R{' '}
                      {(
                        (formData.priceFrom || 0) +
                        (formData.extras || []).reduce((s, x) => s + (x.price || 0), 0)
                      ).toLocaleString()}
                    </strong>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Global Financials (Informational) */}
      <div className="space-y-4 opacity-75">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Label className="text-base font-semibold text-slate-900">2. Monthly Costs</Label>
          <Badge variant="secondary" className="font-normal text-xs">
            Configured globally
          </Badge>
        </div>
        <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-500">
          Rates, Taxes, and Levies are now configured at the Development level (Overview Phase).
          They will apply to all units unless specific overrides are built later.
        </div>
      </div>
    </div>
  );

  const renderRentalPricingUI = () => (
    <div className="space-y-8 max-w-3xl">
      <div className="space-y-6">
        <Label className="text-base font-semibold text-slate-900 border-b pb-2 block">
          1. Monthly Rent
        </Label>
        <p className="text-sm text-slate-500 -mt-2">Per month, per unit type</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>
              Monthly Rent From <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                R
              </span>
              <Input
                className="pl-8"
                type="number"
                placeholder="0"
                value={formData.monthlyRentFrom || ''}
                onFocus={e => e.target.select()}
                onChange={e =>
                  setFormData(p => ({
                    ...p,
                    monthlyRentFrom: +e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Monthly Rent To (Optional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                R
              </span>
              <Input
                className="pl-8"
                type="number"
                placeholder="0"
                value={formData.monthlyRentTo ?? ''}
                onFocus={e => e.target.select()}
                onChange={e => handleOptionalNumberChange('monthlyRentTo', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Label className="text-base font-semibold text-slate-900 border-b pb-2 block">
          2. Lease Details
        </Label>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Deposit (Optional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                R
              </span>
              <Input
                className="pl-8"
                type="number"
                placeholder="0"
                value={formData.depositRequired ?? ''}
                onFocus={e => e.target.select()}
                onChange={e => handleOptionalNumberChange('depositRequired', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Lease Term (Optional)</Label>
            <Input
              placeholder="e.g. 12 months"
              value={formData.leaseTerm || ''}
              onChange={e => setFormData(p => ({ ...p, leaseTerm: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-base font-semibold text-slate-900 border-b pb-2 block">
          3. Rental Flags
        </Label>
        <div className="flex flex-col md:flex-row gap-4 pt-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={!!formData.isFurnished}
              onCheckedChange={checked =>
                setFormData(p => ({ ...p, isFurnished: checked === true }))
              }
            />
            <Label className="text-sm font-normal">Furnished</Label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAuctionPricingUI = () => (
    <div className="space-y-8 max-w-3xl">
      {/* Section 1: Auction Dates */}
      <div className="space-y-6">
        <Label className="text-base font-semibold text-slate-900 border-b pb-2 block">
          1. Auction Timeline
        </Label>
        <p className="text-sm text-slate-500 -mt-2">
          Set when bidding opens and closes for this unit type
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>
              Auction Start Date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="datetime-local"
              value={formData.auctionStartDate ?? ''}
              onChange={e => setFormData(p => ({ ...p, auctionStartDate: e.target.value }))}
            />
            <p className="text-xs text-slate-500">When bidding opens</p>
          </div>

          <div className="space-y-2">
            <Label>
              Auction End Date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="datetime-local"
              value={formData.auctionEndDate ?? ''}
              onChange={e => setFormData(p => ({ ...p, auctionEndDate: e.target.value }))}
            />
            <p className="text-xs text-slate-500">Bidding closes (hammer falls)</p>
          </div>
        </div>
      </div>

      {/* Section 2: Pricing */}
      <div className="space-y-6">
        <Label className="text-base font-semibold text-slate-900 border-b pb-2 block">
          2. Auction Pricing
        </Label>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>
              Starting Bid <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                R
              </span>
              <Input
                className="pl-8"
                type="number"
                placeholder="0"
                value={formData.startingBid ?? ''}
                onFocus={e => e.target.select()}
                onChange={e => {
                  const parsed = toOptionalNumber(e.target.value);
                  setFormData(p => ({
                    ...p,
                    startingBid:
                      parsed === undefined || Number.isFinite(parsed) ? parsed : undefined,
                  }));
                }}
              />
            </div>
            <p className="text-xs text-slate-500">Per unit type</p>
          </div>

          <div className="space-y-2">
            <Label>Reserve Price (Optional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                R
              </span>
              <Input
                className="pl-8"
                type="number"
                placeholder="0"
                value={formData.reservePrice ?? ''}
                onChange={e => {
                  const v = e.target.value;
                  setFormData(p => ({
                    ...p,
                    reservePrice: v === '' ? undefined : Number(v),
                  }));
                }}
              />
            </div>
            <p className="text-xs text-slate-500">
              Minimum acceptable price (not shown to bidders)
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: Auction Status */}
      <div className="space-y-2">
        <Label className="text-base font-semibold text-slate-900 border-b pb-2 block">
          3. Auction Status
        </Label>
        <RadioGroup
          value={formData.auctionStatus || 'scheduled'}
          onValueChange={v => setFormData(p => ({ ...p, auctionStatus: v as any }))}
          className="space-y-2"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="scheduled" id="auction-status-scheduled" />
            <Label htmlFor="auction-status-scheduled">Scheduled (auction pending)</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="active" id="auction-status-active" />
            <Label htmlFor="auction-status-active">Active (accepting bids)</Label>
          </div>
        </RadioGroup>
        <p className="text-xs text-slate-500 mt-2">
          Status will update automatically when auction starts/ends
        </p>
      </div>
    </div>
  );

  const subtypeOptions =
    UNIT_SUBTYPE_OPTIONS[(formData.unitCategory as 'house' | 'apartment') || 'apartment'];
  const isHouseUnit = formData.unitCategory === 'house';
  const stockAvailableUnits = Math.max(0, Number(formData.availableUnits || 0));
  const stockReservedUnits = Math.max(0, Number(formData.reservedUnits || 0));
  const stockSoldHistoricalUnits = Math.max(0, Number(formData.soldUnitsHistorical || 0));
  const stockTotalUnits = stockAvailableUnits + stockReservedUnits + stockSoldHistoricalUnits;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">House types</h2>
          <p className="mt-2 text-sm text-slate-600">
            One card per house type, with its own photos and floor plans. Prices exclude optional
            extras.
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-blue-700 text-white hover:bg-blue-800"
        >
          <Plus className="w-4 h-4 mr-2" /> Add house type
        </Button>
      </div>

      {unitTypes.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-300 py-12 text-center">
          <div className="flex justify-center mb-4">
            <Layers className="w-12 h-12 text-slate-300" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No house types yet</h3>
          <p className="text-slate-500 mb-6">
            Add your first house type to start{' '}
            {isAuction ? 'auctioning' : isRental ? 'leasing' : 'selling'}.
          </p>
          <Button onClick={() => handleOpenDialog()} variant="outline">
            Add house type
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="house-type-cards">
          {unitTypes.map(unit => {
            const card = houseTypeCard(unit, transactionType ?? 'for_sale');
            return (
              <div
                key={unit.id}
                data-testid="house-type-card"
                className="overflow-hidden rounded-lg border border-slate-200 bg-white transition-all hover:-translate-y-px hover:shadow-md"
              >
                {card.coverUrl ? (
                  <img
                    src={card.coverUrl}
                    alt={`${card.name}, photo`}
                    className="block h-[150px] w-full object-cover"
                  />
                ) : (
                  <div className="flex h-[150px] w-full items-center justify-center bg-slate-100 text-slate-400">
                    <Image className="w-8 h-8" aria-hidden="true" />
                  </div>
                )}
                <div className="flex flex-col gap-2 p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-base font-bold text-slate-900">{card.name}</div>
                    <div className="whitespace-nowrap font-bold text-slate-900">
                      {card.priceText || '---'}
                    </div>
                  </div>
                  <div className="text-[13px] text-slate-700">{card.facts}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {card.tags.map((tag, i) => (
                      <span
                        key={tag}
                        className={cn(
                          'inline-flex h-5 items-center rounded px-2 text-[11px] font-semibold',
                          i === 0
                            ? 'bg-blue-50 text-blue-900'
                            : tag === 'Ready now'
                              ? 'bg-green-100 text-green-900'
                              : 'bg-slate-100 text-slate-700',
                        )}
                      >
                        {tag}
                      </span>
                    ))}
                    <span className="inline-flex h-5 items-center rounded bg-slate-100 px-2 text-[11px] font-semibold text-slate-700">
                      {card.mediaText}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Button variant="outline" onClick={() => handleOpenDialog(unit)}>
                      Edit
                    </Button>
                    <Button variant="ghost" onClick={() => handleDuplicate(unit)}>
                      Duplicate
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto text-red-500 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove ${card.name}`}
                      onClick={() => handleRemove(unit.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-4xl h-[75vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>{editingId ? 'Edit house type' : 'Add house type'}</DialogTitle>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="px-6 py-2 bg-slate-50 border-b">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="stock">Stock</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <TabsContent value="basic" className="mt-0 space-y-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>
                      House type name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.name}
                      aria-label="House type name"
                      onChange={e =>
                        setFormData(p => ({ ...p, name: e.target.value, nameAuto: false }))
                      }
                      placeholder="Suggested from the size, bedrooms and home type"
                    />
                    <p className="text-xs text-slate-500">
                      {formData.nameAuto !== false ? (
                        'Suggested from the size, bedrooms and home type. Edit it to use your own name.'
                      ) : (
                        <button
                          type="button"
                          className="text-blue-700 underline"
                          onClick={() => setFormData(p => ({ ...p, nameAuto: true }))}
                        >
                          Use the suggested name
                        </button>
                      )}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Description <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      value={formData.description}
                      onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                      placeholder="Highlight unique features..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>
                        Home type <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={homeTypeOf(formData)}
                        onValueChange={v =>
                          setFormData(p => ({ ...p, ...classificationFor(v as any) }))
                        }
                      >
                        <SelectTrigger aria-label="Home type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HOME_TYPES.map(o => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {askUnitOwnership && (
                      <div className="space-y-2">
                        <Label>
                          Ownership <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={(formData.ownershipType as string) || ''}
                          onValueChange={v => setFormData(p => ({ ...p, ownershipType: v as any }))}
                        >
                          <SelectTrigger aria-label="Ownership">
                            <SelectValue placeholder="Choose ownership" />
                          </SelectTrigger>
                          <SelectContent>
                            {UNIT_OWNERSHIP_OPTIONS.map(o => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500">{UNIT_OWNERSHIP_HINT}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>
                        Bedrooms <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.bedrooms?.toString() ?? ''}
                        onValueChange={v => setFormData(p => ({ ...p, bedrooms: parseFloat(v) }))}
                      >
                        <SelectTrigger aria-label="Bedrooms">
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Studio</SelectItem>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="5">5+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Bathrooms <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.bathrooms?.toString() ?? ''}
                        onValueChange={v => setFormData(p => ({ ...p, bathrooms: parseFloat(v) }))}
                      >
                        <SelectTrigger aria-label="Bathrooms">
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="1.5">1.5</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="2.5">2.5</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="3.5">3.5</SelectItem>
                          <SelectItem value="4">4+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Parking Type <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.parkingKind || ''}
                        onValueChange={v => {
                          const kind = v as any;
                          setFormData(p => ({
                            ...p,
                            parkingKind: kind,
                            // No parking means 0 bays; otherwise the publisher types the number.
                            parkingBays: kind === 'none' ? 0 : p.parkingBays || undefined,
                            garageLayout: kind === 'garage' ? p.garageLayout : undefined,
                          }));
                        }}
                      >
                        <SelectTrigger aria-label="Parking type">
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          {PARKING_TYPE_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.parkingKind !== 'none' && (
                      <div className="space-y-2">
                        <Label>
                          Parking Bays <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          aria-label="Parking bays"
                          placeholder="How many?"
                          value={formData.parkingBays ?? ''}
                          disabled={!formData.parkingKind}
                          min={1}
                          onFocus={e => e.target.select()}
                          onChange={e => {
                            const raw = e.target.value;
                            const n = raw === '' ? undefined : Number(raw);
                            setFormData(p => ({
                              ...p,
                              parkingBays: Number.isFinite(n as any) ? (n as number) : undefined,
                            }));
                          }}
                        />
                      </div>
                    )}

                    {/* Conditional Garage Layout */}
                    {formData.parkingKind === 'garage' && (formData.parkingBays || 0) >= 2 && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                        <Label>Garage Layout</Label>
                        <Select
                          value={formData.garageLayout || ''}
                          onValueChange={v => setFormData(p => ({ ...p, garageLayout: v as any }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select layout..." />
                          </SelectTrigger>
                          <SelectContent>
                            {GARAGE_LAYOUT_OPTIONS.map(o => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label>
                        Unit Size (m2) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        placeholder="e.g. 70"
                        value={formData.unitSize || ''}
                        onFocus={e => e.target.select()}
                        onChange={e =>
                          setFormData(p => ({
                            ...p,
                            unitSize: +e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        {isHouseUnit ? 'Erf/Garden Size (m2)' : 'Erf/Plot Size (m2)'}{' '}
                        <span className="text-amber-600 text-xs font-normal">
                          {isHouseUnit ? '(Recommended)' : '(Optional)'}
                        </span>
                      </Label>
                      <Input
                        type="number"
                        placeholder="m²"
                        value={formData.yardSize || ''}
                        onFocus={e => e.target.select()}
                        onChange={e => setFormData(p => ({ ...p, yardSize: +e.target.value }))}
                      />
                      <p className="text-xs text-slate-500">
                        {isHouseUnit
                          ? 'Recommended for house unit types to improve matching and filters.'
                          : 'Optional for apartment unit types where erf or garden is not applicable.'}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="pricing" className="mt-0 space-y-6">
                {isAuction
                  ? renderAuctionPricingUI()
                  : isRental
                    ? renderRentalPricingUI()
                    : renderSalePricingUI()}
              </TabsContent>

              <TabsContent value="media" className="mt-0 space-y-8">
                {/* Unit Gallery - Full Width */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium flex items-center gap-2">
                      <Image className="w-4 h-4" /> Unit Gallery
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => document.getElementById('unit-gallery-upload')?.click()}
                    >
                      <Upload className="w-3 h-3 mr-2" /> Upload Photos
                    </Button>
                  </div>

                  <input
                    id="unit-gallery-upload"
                    type="file"
                    className="hidden"
                    multiple
                    accept={IMAGE_TYPES.join(',')}
                    data-testid="house-gallery-input"
                    onChange={e => {
                      const picked = e.target.files ? Array.from(e.target.files) : [];
                      e.target.value = '';
                      if (picked.length) handleMediaUpload(picked, 'gallery');
                    }}
                  />
                  <p className="text-xs text-slate-500">{sizeHint('image')}</p>
                  {mediaErrors.gallery?.length ? (
                    <div role="alert" data-testid="house-gallery-error" className="text-xs text-red-700">
                      {mediaErrors.gallery.map(m => (
                        <p key={m}>{m}</p>
                      ))}
                    </div>
                  ) : null}

                  <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200 min-h-[200px]">
                    {unitGallery.length === 0 ? (
                      <div
                        className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:bg-slate-50 cursor-pointer transition-colors flex flex-col items-center justify-center h-full"
                        onClick={() => document.getElementById('unit-gallery-upload')?.click()}
                      >
                        <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                          <Image className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-900">
                          Click to upload unit photos
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Drag and drop reordering enabled
                        </p>
                      </div>
                    ) : (
                      <SortableMediaGrid
                        media={unitGallery.map(
                          (img, idx) =>
                            ({
                              id: img.id,
                              url: img.url,
                              type: 'image',
                              category: 'photo',
                              fileName: img.fileName,
                              isPrimary: idx === 0, // First item is primary
                              displayOrder: idx,
                            }) as GridMediaItem,
                        )}
                        onReorder={reordered => {
                          setUnitGallery(
                            reordered.map(
                              (r, i) => {
                                const existing = unitGallery.find(item => item.id === r.id);
                                return {
                                  ...existing,
                                  id: r.id,
                                  url: r.url,
                                  type: 'image',
                                  category: 'photo',
                                  isPrimary: i === 0,
                                  displayOrder: i,
                                  fileName: r.fileName,
                                } as MediaItem;
                              },
                            ),
                          );
                        }}
                        onRemove={id => setUnitGallery(p => p.filter(i => i.id !== id))}
                        onSetPrimary={id => {
                          // Move to front
                          setUnitGallery(prev => {
                            const item = prev.find(i => i.id === id);
                            if (!item) return prev;
                            const others = prev.filter(i => i.id !== id);
                            return [item, ...others];
                          });
                        }}
                        className="grid-cols-2 md:grid-cols-4 lg:grid-cols-5"
                      />
                    )}
                  </div>
                </div>

                {/* Floor Plans - Full Width */}
                <div className="space-y-4 pt-6 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium flex items-center gap-2">
                      <Layers className="w-4 h-4" /> Floor Plans
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => document.getElementById('floorplan-upload')?.click()}
                    >
                      <Upload className="w-3 h-3 mr-2" /> Upload Floor Plans
                    </Button>
                  </div>

                  <input
                    id="floorplan-upload"
                    type="file"
                    className="hidden"
                    multiple
                    accept={[...IMAGE_TYPES, PDF_TYPE].join(',')}
                    data-testid="house-floorplan-input"
                    onChange={e => {
                      const picked = e.target.files ? Array.from(e.target.files) : [];
                      e.target.value = '';
                      if (picked.length) handleMediaUpload(picked, 'floorPlans');
                    }}
                  />
                  <p className="text-xs text-slate-500">
                    Pictures ({sizeHint('image')}) or PDF (up to 25 MB)
                  </p>
                  {mediaErrors.floorPlans?.length ? (
                    <div
                      role="alert"
                      data-testid="house-floorplan-error"
                      className="text-xs text-red-700"
                    >
                      {mediaErrors.floorPlans.map(m => (
                        <p key={m}>{m}</p>
                      ))}
                    </div>
                  ) : null}

                  <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200">
                    {floorPlanImages.length === 0 ? (
                      <div
                        className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => document.getElementById('floorplan-upload')?.click()}
                      >
                        <p className="text-sm text-slate-600">Click to upload PDF/Images</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {floorPlanImages.map(d => (
                          <div
                            key={d.id}
                            className="relative group flex items-start p-3 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all"
                          >
                            <div className="p-2 bg-blue-50 text-blue-600 rounded mr-3">
                              <FileImage className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {d.fileName || 'Floor Plan'}
                              </p>
                              <p className="text-xs text-slate-500 uppercase">
                                {d.type === 'pdf' ? 'PDF Document' : 'Image File'}
                              </p>
                            </div>
                            <button
                              onClick={() => setFloorPlanImages(p => p.filter(i => i.id !== d.id))}
                              className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="features" className="mt-0 space-y-6">
                <div className="space-y-6">
                  {Object.entries(UNIT_FEATURE_CATEGORIES).map(([catKey, items]) => {
                    const cat = catKey as keyof typeof formData.features;
                    const currentFeatures = formData.features?.[cat] || [];
                    const customItems = currentFeatures.filter(f => !items.includes(f));

                    return (
                      <Card key={catKey} className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-slate-50/50 border-b flex flex-row items-center justify-between">
                          <CardTitle className="text-sm capitalize text-slate-700">
                            {catKey}
                          </CardTitle>
                          {currentFeatures.length > 0 && (
                            <Badge variant="secondary" className="font-normal text-xs">
                              {currentFeatures.length} selected
                            </Badge>
                          )}
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {items.map(item => (
                              <div key={item} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${catKey}-${item}`}
                                  checked={currentFeatures.includes(item)}
                                  onCheckedChange={() => handleFeatureToggle(cat as any, item)}
                                />
                                <Label
                                  htmlFor={`${catKey}-${item}`}
                                  className="text-sm font-normal cursor-pointer select-none"
                                >
                                  {item}
                                </Label>
                              </div>
                            ))}
                          </div>

                          {customItems.length > 0 && (
                            <div className="space-y-2 pt-4 border-t border-slate-100">
                              <Label className="text-xs text-slate-500 uppercase tracking-wider">
                                Custom additions
                              </Label>
                              <div className="flex flex-wrap gap-2">
                                {customItems.map(item => (
                                  <div
                                    key={item}
                                    className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm border border-blue-100"
                                  >
                                    <span>{item}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleFeatureToggle(cat as any, item)}
                                      className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2 items-center pt-2">
                            <Input
                              placeholder={`Add other ${catKey} feature...`}
                              className="h-9 text-sm max-w-sm"
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const target = e.currentTarget;
                                  const val = target.value.trim();
                                  if (val && !currentFeatures.includes(val)) {
                                    handleFeatureToggle(cat as any, val);
                                    target.value = '';
                                  }
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-9 px-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                              onClick={e => {
                                const input = e.currentTarget
                                  .previousElementSibling as HTMLInputElement;
                                const val = input.value.trim();
                                if (val && !currentFeatures.includes(val)) {
                                  handleFeatureToggle(cat as any, val);
                                  input.value = '';
                                }
                              }}
                            >
                              <Plus className="w-4 h-4 mr-1" /> Add
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="stock" className="mt-0 space-y-6">
                <div className="p-6 bg-slate-50/50 border rounded-xl space-y-8">
                  <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-800">
                    <Checkbox
                      aria-label="Ready now"
                      checked={Boolean(formData.readyNow)}
                      onCheckedChange={checked =>
                        setFormData(p => ({ ...p, readyNow: checked === true }))
                      }
                    />
                    <span>
                      <strong>Ready now</strong>: homes of this type can be moved into today (the
                      development may still be building other types).
                    </span>
                  </label>
                  {isCuratedPublisherMode && (
                    <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <Checkbox
                        checked={Boolean(formData.availabilityNotProvided)}
                        onCheckedChange={checked =>
                          setFormData(p => ({ ...p, availabilityNotProvided: Boolean(checked) }))
                        }
                      />
                      <span>
                        Availability counts are not in the supplied source. Keep them unknown until
                        the developer confirms current stock.
                      </span>
                    </label>
                  )}
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-green-600">Available Units</Label>
                      <Input
                        type="number"
                        className="border-green-200 focus:border-green-500"
                        disabled={isCuratedPublisherMode && Boolean(formData.availabilityNotProvided)}
                        value={formData.availableUnits || ''}
                        onFocus={e => e.target.select()}
                        onChange={e =>
                          setFormData(p => ({ ...p, availableUnits: +e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-blue-600">Reserved / Under Offer</Label>
                      <Input
                        type="number"
                        className="border-blue-200 focus:border-blue-500"
                        disabled={isCuratedPublisherMode && Boolean(formData.availabilityNotProvided)}
                        value={formData.reservedUnits || ''}
                        onFocus={e => e.target.select()}
                        onChange={e => setFormData(p => ({ ...p, reservedUnits: +e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600">Sold Units (Historical)</Label>
                      <Input
                        type="number"
                        className="border-slate-300 focus:border-slate-500"
                        disabled={isCuratedPublisherMode && Boolean(formData.availabilityNotProvided)}
                        value={formData.soldUnitsHistorical || ''}
                        onFocus={e => e.target.select()}
                        onChange={e =>
                          setFormData(p => ({ ...p, soldUnitsHistorical: +e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex gap-4 items-end">
                      <div className="space-y-2 flex-1">
                        <Label>Total Units (Auto-Calculated)</Label>
                        <Input
                          type="number"
                          value={
                            isCuratedPublisherMode && formData.availabilityNotProvided
                              ? ''
                              : stockTotalUnits
                          }
                          disabled
                          className="font-semibold"
                        />
                        <p className="text-xs text-slate-500">
                          {isCuratedPublisherMode && formData.availabilityNotProvided
                            ? 'Availability has not been verified.'
                            : `Available ${stockAvailableUnits} + Reserved ${stockReservedUnits} + Sold ${stockSoldHistoricalUnits} = Total ${stockTotalUnits}`}
                        </p>
                      </div>
                      <div className="flex-1">
                        <div
                          className={cn(
                            'p-3 rounded-lg text-center font-bold border',
                            isCuratedPublisherMode && formData.availabilityNotProvided
                              ? 'bg-slate-50 border-slate-200 text-slate-700'
                              : stockAvailableUnits > 0
                                ? 'bg-green-50 border-green-200 text-green-700'
                                : 'bg-red-50 border-red-200 text-red-700',
                          )}
                        >
                          {isCuratedPublisherMode && formData.availabilityNotProvided
                            ? 'COUNTS NOT SUPPLIED'
                            : stockAvailableUnits > 0
                              ? 'AVAILABLE'
                              : 'SOLD OUT / LISTING'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>

            {/* Footer Actions - Tab Navigation */}
            {(() => {
              const TABS = ['basic', 'pricing', 'media', 'features', 'stock'];
              const TAB_LABELS: Record<string, string> = {
                basic: 'Basic Info',
                pricing: 'Pricing',
                media: 'Media',
                features: 'Features',
                stock: 'Stock',
              };
              const currentIndex = TABS.indexOf(activeTab);
              const isFirstTab = currentIndex === 0;
              const isLastTab = currentIndex === TABS.length - 1;
              const nextTabLabel = !isLastTab ? TAB_LABELS[TABS[currentIndex + 1]] : '';
              const prevTabLabel = !isFirstTab ? TAB_LABELS[TABS[currentIndex - 1]] : '';

              return (
                <div className="p-4 border-t bg-slate-50 flex justify-between items-center">
                  {/* Left: Cancel */}
                  <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>

                  {/* Right: Back + Next/Save */}
                  <div className="flex gap-2">
                    {/* Back button - hidden on first tab */}
                    {!isFirstTab && (
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab(TABS[currentIndex - 1])}
                      >
                        ← {prevTabLabel}
                      </Button>
                    )}

                    {/* Next or Save button */}
                    {!isLastTab ? (
                      <Button
                        onClick={() => setActiveTab(TABS[currentIndex + 1])}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                      >
                        Next: {nextTabLabel} →
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        {!editingId && (
                          <Button variant="outline" onClick={() => handleSave(true)}>
                            Save & Add Another
                          </Button>
                        )}
                        <Button
                          onClick={() => handleSave(false)}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                        >
                          {editingId ? 'Update Unit Type' : 'Save Unit Type'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
