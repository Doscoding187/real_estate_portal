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
  } = useDevelopmentWizard();
  const transactionType = useDevelopmentWizard(
    state => state.transactionType ?? state.developmentData?.transactionType,
  );
  const isRental = transactionType === 'for_rent';
  const isAuction = transactionType === 'auction';

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');

  // Form State
  const [formData, setFormData] = useState<
    Partial<UnitType> & {
      // UI-specific parking state
      parkingKind?: 'none' | 'open' | 'covered' | 'carport' | 'garage';
      garageLayout?: 'side-by-side' | 'tandem';
    }
  >({
    name: '',
    description: '',
    bedrooms: 1,
    bathrooms: 1,

    // Initialize with UI defaults, will be hydrated
    parkingKind: 'none',
    parkingBays: 0,
    garageLayout: undefined,

    unitSize: 0,
    yardSize: 0,

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
  const presignMutation = trpc.upload.presign.useMutation();

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
      bedrooms: 1,
      bathrooms: 1,
      parkingKind: 'open',
      parkingBays: 1,
      garageLayout: undefined,
      unitSize: 0,
      yardSize: 0,

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
      const depositValue =
        depositValueRaw == null ? undefined : Number(depositValueRaw);
      const monthlyRentToRaw = (unit as any).monthlyRentTo;
      const monthlyRentToValue =
        monthlyRentToRaw == null ? undefined : Number(monthlyRentToRaw);
      const startingBidRaw = (unit as any).startingBid;
      const startingBidValue = startingBidRaw == null ? undefined : Number(startingBidRaw);
      const reservePriceRaw = (unit as any).reservePrice;
      const reservePriceValue = reservePriceRaw == null ? undefined : Number(reservePriceRaw);
      const auctionStartDateValue = formatDateTimeLocal((unit as any).auctionStartDate);
      const auctionEndDateValue = formatDateTimeLocal((unit as any).auctionEndDate);
      const auctionStatusValue = (unit as any).auctionStatus ?? 'scheduled';

      setFormData({
        ...unit,
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
        setFormData({
          ...unitTypeDraft,
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
    setIsDialogOpen(true);
  };

  const handleDiscardDraft = () => {
    setUnitTypeDraft(null);
    resetForm();
    toast.success('Draft discarded');
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
    const nextValue =
      parsed === undefined || Number.isFinite(parsed) ? parsed : undefined;
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
    if (!formData.name) return toast.error('Unit Name is required');
    if (!formData.description) return toast.error('Description is required');
    if (!formData.bedrooms && formData.bedrooms !== 0)
      return toast.error('Bedrooms are required');
    if (!formData.bathrooms && formData.bathrooms !== 0)
      return toast.error('Bathrooms are required');
    if (!formData.unitSize || formData.unitSize <= 0)
      return toast.error('Unit Size is required');
    if (!formData.yardSize || formData.yardSize <= 0)
      return toast.error('Erf/Garden Size is required');
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
      if (!formData.priceFrom) return toast.error('Base Price is required');
    }
    if (formData.parkingKind !== 'none' && (!formData.parkingBays || formData.parkingBays <= 0))
      return toast.error('Parking Bays are required');
    if (!formData.totalUnits && formData.totalUnits !== 0)
      return toast.error('Total Units is required');

    const isSale = !isRental && !isAuction;

    // Calculate Max Price (Base + Extras) - Sale Only
    const basePrice = isSale ? formData.priceFrom || 0 : 0;
    const extrasTotal = isSale
      ? (formData.extras || []).reduce((acc, curr) => acc + (Number(curr.price) || 0), 0)
      : 0;
    const calculatedPriceTo = basePrice + extrasTotal;

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

    const newUnit: any = {
      ...formData,
      // CRITICAL: Always ensure ID is present for persistence
      id: editingId || `unit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      priceFrom: isSale ? basePrice : 0,
      priceTo: isSale ? calculatedPriceTo : 0, // Auto-calculated
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

      features: formData.features,
      baseMedia: {
        gallery: unitGallery,
        floorPlans: floorPlanImages,
        renders: [],
      },
      specifications: {
        builtInFeatures: {},
        finishes: {},
        electrical: { prepaidElectricity: false },
      }, // Legacy stub
      amenities: { standard: [], additional: [] }, // Legacy stub
      displayOrder: editingId
        ? unitTypes.find(u => u.id === editingId)?.displayOrder || 0
        : unitTypes.length,
      isActive: true,
      updatedAt: new Date(),
      createdAt: editingId ? undefined : new Date(),
    };

    if (editingId) {
      console.log('[UnitTypesPhase] Updating unit (canonical):', editingId);
      const nextUnits = unitTypes.map(u => (u.id === editingId ? { ...u, ...newUnit } : u));
      saveWorkflowStepData('unit_types', { unitTypes: nextUnits });
      toast.success('Unit type updated');
    } else {
      console.log('[UnitTypesPhase] Creating new unit (canonical):', newUnit.id);
      const nextUnits = [...unitTypes, newUnit];
      saveWorkflowStepData('unit_types', { unitTypes: nextUnits });

      setUnitTypeDraft(null); // Clear draft
      toast.success('Unit type created');
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

  const handleMediaUpload = async (files: File[], category: 'gallery' | 'floorPlans') => {
    // Simplified upload logic for brevity in this execution block
    // (In production this would reuse the robust uploader from MediaPhase)
    for (const file of files) {
      const { url, publicUrl } = await presignMutation.mutateAsync({
        filename: file.name,
        contentType: file.type,
      });
      await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });

      const newItem: MediaItem = {
        id: `u-${Date.now()}-${Math.random()}`,
        url: publicUrl,
        type: 'image',
        category: category === 'gallery' ? 'photo' : 'floorplan',
        isPrimary: category === 'gallery' && unitGallery.length === 0,
        displayOrder: 0,
        fileName: file.name,
      };

      if (category === 'gallery') setUnitGallery(prev => [...prev, newItem]);
      else setFloorPlanImages(prev => [...prev, newItem]);
    }
    toast.success('Upload complete');
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
              <Label className="text-slate-900 font-medium">Base Price (Starting From)</Label>
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
                The base cost of the unit excluding any optional extras.
              </p>
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Unit Types</h2>
          <p className="text-slate-600">Configure your diverse unit mix.</p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Unit Type
        </Button>
      </div>

      {unitTypes.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-300 py-12 text-center">
          <div className="flex justify-center mb-4">
            <Layers className="w-12 h-12 text-slate-300" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No Unit Types defined</h3>
          <p className="text-slate-500 mb-6">
            Create your first unit type to start{' '}
            {isAuction ? 'auctioning' : isRental ? 'leasing' : 'selling'}.
          </p>
          <Button onClick={() => handleOpenDialog()} variant="outline">
            Create Unit Type
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {unitTypes.map(unit => (
            <Card key={unit.id} className="group hover:shadow-lg transition-all border-slate-200">
              <div className="h-40 bg-slate-100 relative">
                {unit.baseMedia?.gallery?.[0] ? (
                  <img src={unit.baseMedia.gallery[0].url} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <Image className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => handleOpenDialog(unit)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={() => removeUnitType(unit.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{unit.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      unit.availableUnits > 0
                        ? 'text-green-600 bg-green-50'
                        : 'text-red-600 bg-red-50',
                    )}
                  >
                    {unit.availableUnits > 0 ? `${unit.availableUnits} Avail` : 'Sold Out'}
                  </Badge>
                </div>
                <p className="text-sm font-semibold text-blue-600">
                  {(() => {
                    const rentFrom = Number(
                      (unit as any).monthlyRentFrom ?? (unit as any).monthlyRent ?? 0,
                    );
                    const rentTo = Number((unit as any).monthlyRentTo ?? 0);
                    const auctionStart = Number((unit as any).startingBid ?? 0);
                    const saleFrom = Number(unit.priceFrom ?? 0);
                    const saleTo = Number(unit.priceTo ?? 0);

                    const primaryValue = isRental
                      ? rentFrom
                      : isAuction
                        ? auctionStart
                        : saleFrom;
                    const secondaryValue = isRental ? rentTo : isAuction ? 0 : saleTo;

                    if (!primaryValue || primaryValue <= 0) return '---';

                    return (
                      <>
                        R {primaryValue.toLocaleString()}{' '}
                        {!isAuction &&
                          secondaryValue > primaryValue &&
                          `- R ${secondaryValue.toLocaleString()}`}
                      </>
                    );
                  })()}
                  {isRental && <span className="text-xs text-slate-500"> / month</span>}
                  {isAuction && <span className="text-xs text-slate-500"> starting bid</span>}
                </p>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 space-y-1">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1">
                    <BedDouble className="w-3.5 h-3.5" /> {unit.bedrooms}
                  </span>
                  <span className="flex items-center gap-1">
                    <Bath className="w-3.5 h-3.5" /> {unit.bathrooms}
                  </span>
                  <span className="flex items-center gap-1">
                    <HouseMeasureIcon className="w-3.5 h-3.5" /> {unit.unitSize} m2
                  </span>
                  {unit.yardSize && unit.yardSize > 0 && (
                    <span className="flex items-center gap-1 text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full text-xs border border-green-100">
                      <Maximize className="w-3 h-3" /> {unit.yardSize}m²
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-4xl h-[75vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>{editingId ? 'Edit Unit Type' : 'Add Unit Type'}</DialogTitle>
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
                      Unit Type Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.name}
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. 2 Bedroom Garden Apartment"
                    />
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

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                    <Label>
                      Bedrooms <span className="text-red-500">*</span>
                    </Label>
                      <Select
                        value={formData.bedrooms?.toString() ?? '1'}
                        onValueChange={v => setFormData(p => ({ ...p, bedrooms: parseFloat(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
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
                        value={formData.bathrooms?.toString() ?? '1'}
                        onValueChange={v => setFormData(p => ({ ...p, bathrooms: parseFloat(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
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
                        value={formData.parkingKind || 'none'}
                        onValueChange={v => {
                          const kind = v as any;
                          setFormData(p => ({
                            ...p,
                            parkingKind: kind,
                            // Default logic when switching types
                            parkingBays: kind === 'none' ? 0 : p.parkingBays || 1,
                            garageLayout: kind === 'garage' ? p.garageLayout : undefined,
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
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

                    <div className="space-y-2">
                    <Label>
                      Parking Bays <span className="text-red-500">*</span>
                    </Label>
                      <Input
                        type="number"
                        value={formData.parkingBays ?? ''}
                        disabled={formData.parkingKind === 'none'}
                        min={formData.parkingKind === 'none' ? 0 : 1}
                        onFocus={e => e.target.select()}
                        onChange={e => {
                          const raw = e.target.value;
                          const n = raw === '' ? undefined : Number(raw);
                          setFormData(p => ({
                            ...p,
                            parkingBays:
                              p.parkingKind === 'none'
                                ? 0
                                : Math.max(1, Number.isFinite(n as any) ? (n as number) : 1),
                          }));
                        }}
                      />
                    </div>

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
                      Erf/Garden Size (m2) <span className="text-red-500">*</span>
                    </Label>
                      <Input
                        type="number"
                        placeholder="m²"
                        value={formData.yardSize || ''}
                        onFocus={e => e.target.select()}
                        onChange={e => setFormData(p => ({ ...p, yardSize: +e.target.value }))}
                      />
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
                    accept="image/*"
                    onChange={e =>
                      e.target.files && handleMediaUpload(Array.from(e.target.files), 'gallery')
                    }
                  />

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
                              (r, i) =>
                                ({
                                  id: r.id,
                                  url: r.url,
                                  type: 'image',
                                  category: 'photo',
                                  isPrimary: i === 0,
                                  displayOrder: i,
                                  fileName: r.fileName,
                                }) as MediaItem,
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
                    accept="image/*,application/pdf"
                    onChange={e =>
                      e.target.files && handleMediaUpload(Array.from(e.target.files), 'floorPlans')
                    }
                  />

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
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-green-600">Available Units</Label>
                      <Input
                        type="number"
                        className="border-green-200 focus:border-green-500"
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
                        value={formData.reservedUnits || ''}
                        onFocus={e => e.target.select()}
                        onChange={e => setFormData(p => ({ ...p, reservedUnits: +e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600">Sold Units (Historical)</Label>
                      <Input
                        type="number"
                        value={
                          (formData.totalUnits || 0) -
                          (formData.availableUnits || 0) -
                          (formData.reservedUnits || 0)
                        }
                        disabled
                        className="bg-slate-100"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex gap-4 items-end">
                      <div className="space-y-2 flex-1">
                        <Label>Total Units (Auto-Calculated Override)</Label>
                        <Input
                          type="number"
                          value={formData.totalUnits || ''}
                          // Auto-calc total if user hasn't manually overridden (simplified here by allowing direct edit)
                          onChange={e => setFormData(p => ({ ...p, totalUnits: +e.target.value }))}
                          className="font-semibold"
                        />
                        <p className="text-xs text-slate-500">
                          Normally: Available {formData.availableUnits || 0} + Reserved{' '}
                          {formData.reservedUnits || 0} + Sold = Total
                        </p>
                      </div>
                      <div className="flex-1">
                        <div
                          className={cn(
                            'p-3 rounded-lg text-center font-bold border',
                            (formData.availableUnits || 0) > 0
                              ? 'bg-green-50 border-green-200 text-green-700'
                              : 'bg-red-50 border-red-200 text-red-700',
                          )}
                        >
                          {(formData.availableUnits || 0) > 0 ? 'AVAILABLE' : 'SOLD OUT / LISTING'}
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
