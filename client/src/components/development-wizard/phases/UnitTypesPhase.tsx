import React, { useState, useEffect } from 'react';
import { SortableMediaGrid, type MediaItem as GridMediaItem } from '@/components/media/SortableMediaGrid';
import { useDevelopmentWizard, type UnitType, type MediaItem } from '@/hooks/useDevelopmentWizard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Trash2, Plus, Edit2, BedDouble, Bath, Car, Home, 
  DollarSign, Image, BarChart3, ArrowLeft, ArrowRight,
  Upload, X, FileImage, Layers, Sparkles, AlertCircle, Copy, Maximize
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { HouseMeasureIcon } from '@/components/icons/HouseMeasureIcon';

// -- CONSTANTS --

const PARKING_TYPE_OPTIONS = [
  { value: 'none', label: 'No Parking' },
  { value: 'open_bay', label: 'Open Bay' },
  { value: 'covered_bay', label: 'Covered Bay' },
  { value: 'carport', label: 'Carport' },
  { value: 'single_garage', label: 'Single Garage' },
  { value: 'double_garage', label: 'Double Garage' },
  { value: 'tandem_garage', label: 'Tandem Garage' },
];

const UNIT_FEATURE_CATEGORIES = {
  kitchen: ['Built-in Oven', 'Gas Hob', 'Extractor Fan', 'Granite Tops', 'Island', 'Pantry', 'Scullery', 'Dishwasher Ready'],
  bathroom: ['En-suite', 'Full Bathroom', 'Guest Toilet', 'Double Vanity', 'Shower', 'Bathtub', 'Heated Rails'],
  flooring: ['Porcelain Tiles', 'Laminate', 'Vinyl', 'Carpets', 'Engineered Wood', 'Screed'],
  storage: ['Built-in Cupboards', 'Walk-in Closet', 'Linen Cupboard', 'Storeroom'],
  climate: ['AC Ready', 'Ceiling Fans', 'Underfloor Heating', 'Fireplace'],
  outdoor: ['Balcony', 'Patio', 'Private Garden', 'Built-in Braai', 'Rooftop Terrace'],
  security: ['Security Gate', 'Burglar Bars', 'Intercom', 'Alarm System'],
  other: ['Fibre Ready', 'Prepaid Electricity', 'Solar Geyser', 'Inverter Ready', 'Pet Friendly']
};

export function UnitTypesPhase() {
  const { 
    unitTypes, 
    addUnitType, 
    updateUnitType, 
    removeUnitType, 
    setPhase,
    validatePhase,
    unitTypeDraft,
    setUnitTypeDraft
  } = useDevelopmentWizard();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  
  // Form State
  const [formData, setFormData] = useState<Partial<UnitType>>({
    name: '',
    description: '',
    bedrooms: 1,
    bathrooms: 1,
    parkingType: 'single_garage',
    parkingBays: 1,
    sizeFrom: 0,
    sizeTo: 0,
    yardSize: 0,

    // Refactored Pricing
    priceFrom: 0, // Base Price
    priceTo: 0,   // Calculated Max
    extras: [],   // { label, price }
    
    // Removed: transferCosts, levies, rates (Global now)
    
    totalUnits: 0,
    availableUnits: 0,
    reservedUnits: 0,
    features: {
      kitchen: [], bathroom: [], flooring: [], storage: [], 
      climate: [], outdoor: [], security: [], other: []
    }
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
                    renders: []
                }
            });
        }, 500); // Debounce 500ms
        return () => clearTimeout(timer);
    }
  }, [formData, unitGallery, floorPlanImages, isDialogOpen, editingId, setUnitTypeDraft]);

  // Reset Logic
  const resetForm = () => {
    setFormData({
      name: '', description: '', bedrooms: 1, bathrooms: 1, 
      parkingType: 'single_garage', parkingBays: 1,
      sizeFrom: 0, sizeTo: 0, yardSize: 0,
      priceFrom: 0, priceTo: 0, extras: [],
      // removed global financials
      totalUnits: 0, availableUnits: 0, reservedUnits: 0,
      features: { kitchen: [], bathroom: [], flooring: [], storage: [], climate: [], outdoor: [], security: [], other: [] }
    });
    setUnitGallery([]);
    setFloorPlanImages([]);
    setEditingId(null);
    setActiveTab('basic');
  };

  const handleOpenDialog = (unit?: UnitType) => {
    if (unit) {
      setEditingId(unit.id);
      setFormData({
        ...unit,
        extras: unit.extras || [],
        features: unit.features || { kitchen: [], bathroom: [], flooring: [], storage: [], climate: [], outdoor: [], security: [], other: [] }
      });
      setUnitGallery(unit.baseMedia?.gallery || []);
      setFloorPlanImages(unit.baseMedia?.floorPlans || []);
    } else {
      // Check for Draft
      if (unitTypeDraft) {
          toast.info("Resumed your unsaved unit type", { icon: <Sparkles className="w-4 h-4 text-blue-500"/> });
          setFormData({
              ...unitTypeDraft,
              features: unitTypeDraft.features || { kitchen: [], bathroom: [], flooring: [], storage: [], climate: [], outdoor: [], security: [], other: [] }
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
      toast.success("Draft discarded");
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
        features: { ...prev.features, [category]: newFeatures } as any
      };
    });
  };

  const handleSave = (addAnother = false) => {
    // Validation
    if (!formData.name) return toast.error('Unit Name is required');
    if (!formData.priceFrom) return toast.error('Base Price is required');
    if (!formData.totalUnits && formData.totalUnits !== 0) return toast.error('Total Units is required');

    // Calculate Max Price (Base + Extras)
    const basePrice = formData.priceFrom || 0;
    const extrasTotal = (formData.extras || []).reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
    const calculatedPriceTo = basePrice + extrasTotal;

    const newUnit: any = {
      ...formData,
      priceTo: calculatedPriceTo, // Auto-calculated

      features: formData.features,
      baseMedia: {
        gallery: unitGallery,
        floorPlans: floorPlanImages,
        renders: []
      },
      specifications: { builtInFeatures: {}, finishes: {}, electrical: { prepaidElectricity: false } }, // Legacy stub
      amenities: { standard: [], additional: [] }, // Legacy stub
      displayOrder: editingId ? (unitTypes.find(u => u.id === editingId)?.displayOrder || 0) : unitTypes.length,
      isActive: true,
      updatedAt: new Date(),
      createdAt: editingId ? undefined : new Date()
    };

    if (editingId) {
      updateUnitType(editingId, newUnit);
      toast.success('Unit type updated');
    } else {
      addUnitType(newUnit);
      setUnitTypeDraft(null); // Clear draft on successful creation
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
      // We do NOT clear draft here if we closed, because we want consistency?
      // Wait, if we successfully saved, we SHOULD close and clear.
      // Yes, setUnitTypeDraft(null) above handles it for simple save.
      // AddAnother handles it too.
    }
  };


  const handleMediaUpload = async (files: File[], category: 'gallery' | 'floorPlans') => {
    // Simplified upload logic for brevity in this execution block
    // (In production this would reuse the robust uploader from MediaPhase)
    for (const file of files) {
       const { url, publicUrl } = await presignMutation.mutateAsync({ filename: file.name, contentType: file.type });
       await fetch(url, { method: 'PUT', body: file, headers: {'Content-Type': file.type}});
       
       const newItem: MediaItem = {
           id: `u-${Date.now()}-${Math.random()}`,
           url: publicUrl,
           type: 'image',
           category: category === 'gallery' ? 'photo' : 'floorplan',
           isPrimary: category === 'gallery' && unitGallery.length === 0,
           displayOrder: 0,
           fileName: file.name
       };

       if (category === 'gallery') setUnitGallery(prev => [...prev, newItem]);
       else setFloorPlanImages(prev => [...prev, newItem]);
    }
    toast.success('Upload complete');
  };

  // --- RENDERERS ---

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Unit Types</h2>
          <p className="text-slate-600">Configure your diverse unit mix.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Unit Type
        </Button>
      </div>

      {unitTypes.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-300 py-12 text-center">
            <div className="flex justify-center mb-4"><Layers className="w-12 h-12 text-slate-300"/></div>
            <h3 className="text-lg font-medium text-slate-900">No Unit Types defined</h3>
            <p className="text-slate-500 mb-6">Create your first unit type to start selling.</p>
            <Button onClick={() => handleOpenDialog()} variant="outline">Create Unit Type</Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
           {unitTypes.map(unit => (
              <Card key={unit.id} className="group hover:shadow-lg transition-all border-slate-200">
                  <div className="h-40 bg-slate-100 relative">
                     {unit.baseMedia?.gallery?.[0] ? (
                        <img src={unit.baseMedia.gallery[0].url} className="w-full h-full object-cover" />
                     ) : (
                        <div className="flex items-center justify-center h-full text-slate-400"><Image className="w-8 h-8"/></div>
                     )}
                     <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => handleOpenDialog(unit)}><Edit2 className="w-4 h-4"/></Button>
                        <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => removeUnitType(unit.id)}><Trash2 className="w-4 h-4"/></Button>
                     </div>
                  </div>
                  <CardHeader className="pb-2">
                     <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{unit.name}</CardTitle>
                        <Badge variant="outline" className={cn(unit.availableUnits > 0 ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50")}>
                           {unit.availableUnits > 0 ? `${unit.availableUnits} Avail` : 'Sold Out'}
                        </Badge>
                     </div>
                     <p className="text-sm font-semibold text-blue-600">
                        R {unit.priceFrom?.toLocaleString()} {unit.priceTo > unit.priceFrom && `- R ${unit.priceTo?.toLocaleString()}`}
                     </p>
                  </CardHeader>
                  <CardContent className="text-sm text-slate-600 space-y-1">
                     <div className="flex gap-4">
                        <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5"/> {unit.bedrooms}</span>
                        <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5"/> {unit.bathrooms}</span>
                        <span className="flex items-center gap-1"><HouseMeasureIcon className="w-3.5 h-3.5"/> {unit.sizeFrom}m²</span>
                        {unit.yardSize && unit.yardSize > 0 && (
                           <span className="flex items-center gap-1 text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full text-xs border border-green-100"><Maximize className="w-3 H-3"/> {unit.yardSize}m²</span>
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
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
                       <Label>Unit Type Name <span className="text-red-500">*</span></Label>
                       <Input value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} placeholder="e.g. 2 Bedroom Garden Apartment"/>
                    </div>
                    <div className="space-y-2">
                       <Label>Description</Label>
                       <Textarea value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} placeholder="Highlight unique features..."/>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       <div className="space-y-2">
                          <Label>Bedrooms</Label>
                          <Select 
                              value={formData.bedrooms?.toString()} 
                              onValueChange={v => setFormData(p => ({...p, bedrooms: parseFloat(v)}))} 
                          >
                             <SelectTrigger><SelectValue/></SelectTrigger>
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
                          <Label>Bathrooms</Label>
                          <Select 
                              value={formData.bathrooms?.toString()} 
                              onValueChange={v => setFormData(p => ({...p, bathrooms: parseFloat(v)}))} 
                          >
                             <SelectTrigger><SelectValue/></SelectTrigger>
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
                          <Label>Parking Bays</Label>
                          <Input type="number" value={formData.parkingBays} onFocus={(e) => e.target.select()} onChange={e => setFormData(p => ({...p, parkingBays: +e.target.value}))} />
                       </div>
                       <div className="space-y-2">
                          <Label>Parking Type</Label>
                          <Select value={formData.parkingType} onValueChange={v => setFormData(p => ({...p, parkingType: v as any}))}>
                             <SelectTrigger><SelectValue/></SelectTrigger>
                             <SelectContent>
                                {PARKING_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                             </SelectContent>
                          </Select>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                       <div className="space-y-2">
                          <Label>Unit Size (m²)</Label>
                          <div className="flex gap-2">
                             <Input type="number" placeholder="From" value={formData.sizeFrom} onFocus={(e) => e.target.select()} onChange={e => setFormData(p => ({...p, sizeFrom: +e.target.value}))} />
                             <Input type="number" placeholder="To (Optional)" value={formData.sizeTo} onFocus={(e) => e.target.select()} onChange={e => setFormData(p => ({...p, sizeTo: +e.target.value}))} />
                          </div>
                       </div>
                       <div className="space-y-2">
                          <Label>Erf/Garden Size (Optional)</Label>
                          <Input type="number" placeholder="m²" value={formData.yardSize} onFocus={(e) => e.target.select()} onChange={e => setFormData(p => ({...p, yardSize: +e.target.value}))} />
                       </div>
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="pricing" className="mt-0 space-y-6">
                 <div className="space-y-8 max-w-3xl">
                    
                     {/* Section 1: Base Price & Extras */}
                     <div className="space-y-6">
                        <Label className="text-base font-semibold text-slate-900 border-b pb-2 block">1. Unit Pricing Strategy</Label>
                        
                        <div className="space-y-6">
                           {/* Base Price */}
                           <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                             <div className="space-y-3 max-w-sm">
                                <Label className="text-slate-900 font-medium">Base Price (Starting From)</Label>
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">R</span>
                                      <Input 
                                        className="pl-8 h-11 text-lg font-semibold text-slate-900" 
                                        type="number" 
                                        placeholder="0" 
                                        value={formData.priceFrom} 
                                        onFocus={(e) => e.target.select()} 
                                        onChange={e => setFormData(p => ({...p, priceFrom: +e.target.value}))} 
                                      />
                                  </div>
                                </div>
                                <p className="text-xs text-slate-500">The base cost of the unit excluding any optional extras.</p>
                             </div>
                           </div>

                           {/* Optional Extras */}
                           <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <Label className="text-sm font-medium">Optional Extras / Upgrades</Label>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setFormData(p => ({...p, extras: [...(p.extras || []), { label: '', price: 0 }] }))}
                                >
                                  <Plus className="w-3 H-3 mr-1"/> Add Extra
                                </Button>
                              </div>

                              {(formData.extras?.length || 0) === 0 ? (
                                <div className="text-center p-6 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                                   <p className="text-sm text-slate-400">No optional extras added.</p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                   {formData.extras!.map((extra, idx) => (
                                      <div key={idx} className="flex gap-3 items-center animate-in slide-in-from-left-2 fade-in">
                                         <Input 
                                            placeholder="Item Label (e.g. Pool, AC)" 
                                            value={extra.label} 
                                            onChange={(e) => {
                                               const newExtras = [...(formData.extras || [])];
                                               newExtras[idx].label = e.target.value;
                                               setFormData(p => ({...p, extras: newExtras}));
                                            }}
                                            className="flex-1"
                                         />
                                         <div className="relative w-32">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R</span>
                                            <Input 
                                               type="number" 
                                               placeholder="Price" 
                                               value={extra.price}
                                               onChange={(e) => {
                                                  const newExtras = [...(formData.extras || [])];
                                                  newExtras[idx].price = +e.target.value;
                                                  setFormData(p => ({...p, extras: newExtras}));
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
                                               setFormData(p => ({...p, extras: newExtras}));
                                            }}
                                          >
                                            <Trash2 className="w-4 h-4"/>
                                         </Button>
                                      </div>
                                   ))}
                                   
                                   <div className="flex justify-end pt-2 border-t border-slate-100">
                                      <p className="text-sm text-slate-500">
                                        Max Potential Price: <strong className="text-slate-900">
                                          R {((formData.priceFrom || 0) + (formData.extras || []).reduce((s, x) => s + (x.price || 0), 0)).toLocaleString()}
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
                            <Badge variant="secondary" className="font-normal text-xs">Configured globally</Badge>
                         </div>
                         <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-500">
                            Rates, Taxes, and Levies are now configured at the Development level (Overview Phase). 
                            They will apply to all units unless specific overrides are built later.
                         </div>
                     </div>

                 </div>
              </TabsContent>

              <TabsContent value="media" className="mt-0 space-y-8">
                 {/* Unit Gallery - Full Width */}
                 <div className="space-y-4">
                    <div className="flex justify-between items-center">
                       <h3 className="font-medium flex items-center gap-2"><Image className="w-4 h-4"/> Unit Gallery</h3>
                       <Button size="sm" variant="outline" onClick={() => document.getElementById('unit-gallery-upload')?.click()}>
                          <Upload className="w-3 h-3 mr-2"/> Upload Photos
                       </Button>
                    </div>
                    
                    <input id="unit-gallery-upload" type="file" className="hidden" multiple accept="image/*" onChange={e => e.target.files && handleMediaUpload(Array.from(e.target.files), 'gallery')} />
                    
                    <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200 min-h-[200px]">
                        {unitGallery.length === 0 ? (
                            <div 
                                className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:bg-slate-50 cursor-pointer transition-colors flex flex-col items-center justify-center h-full"
                                onClick={() => document.getElementById('unit-gallery-upload')?.click()}
                            >
                                <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                                    <Image className="w-6 h-6 text-slate-400"/>
                                </div>
                                <p className="text-sm font-medium text-slate-900">Click to upload unit photos</p>
                                <p className="text-xs text-slate-500 mt-1">Drag and drop reordering enabled</p>
                            </div>
                        ) : (
                            <SortableMediaGrid
                                media={unitGallery.map((img, idx) => ({
                                    id: img.id,
                                    url: img.url,
                                    type: 'image',
                                    category: 'photo',
                                    fileName: img.fileName,
                                    isPrimary: idx === 0, // First item is primary
                                    displayOrder: idx
                                } as GridMediaItem))}
                                onReorder={(reordered) => {
                                    setUnitGallery(reordered.map((r, i) => ({
                                        id: r.id,
                                        url: r.url,
                                        type: 'image',
                                        category: 'photo',
                                        isPrimary: i === 0,
                                        displayOrder: i,
                                        fileName: r.fileName
                                    } as MediaItem)));
                                }}
                                onRemove={(id) => setUnitGallery(p => p.filter(i => i.id !== id))}
                                onSetPrimary={(id) => {
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
                       <h3 className="font-medium flex items-center gap-2"><Layers className="w-4 h-4"/> Floor Plans</h3>
                       <Button size="sm" variant="outline" onClick={() => document.getElementById('floorplan-upload')?.click()}>
                          <Upload className="w-3 h-3 mr-2"/> Upload Floor Plans
                       </Button>
                    </div>
                    
                    <input id="floorplan-upload" type="file" className="hidden" multiple accept="image/*,application/pdf" onChange={e => e.target.files && handleMediaUpload(Array.from(e.target.files), 'floorPlans')} />

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
                                 <div key={d.id} className="relative group flex items-start p-3 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded mr-3">
                                        <FileImage className="w-5 h-5"/>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 truncate">{d.fileName || 'Floor Plan'}</p>
                                        <p className="text-xs text-slate-500 uppercase">{d.type === 'pdf' ? 'PDF Document' : 'Image File'}</p>
                                    </div>
                                    <button 
                                        onClick={() => setFloorPlanImages(p => p.filter(i => i.id !== d.id))}
                                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                    >
                                        <X className="w-4 h-4"/>
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
                                <CardTitle className="text-sm capitalize text-slate-700">{catKey}</CardTitle>
                                {currentFeatures.length > 0 && <Badge variant="secondary" className="font-normal text-xs">{currentFeatures.length} selected</Badge>}
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
                                         <Label htmlFor={`${catKey}-${item}`} className="text-sm font-normal cursor-pointer select-none">{item}</Label>
                                      </div>
                                   ))}
                                </div>

                                {customItems.length > 0 && (
                                   <div className="space-y-2 pt-4 border-t border-slate-100">
                                      <Label className="text-xs text-slate-500 uppercase tracking-wider">Custom additions</Label>
                                      <div className="flex flex-wrap gap-2">
                                         {customItems.map(item => (
                                            <div key={item} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm border border-blue-100">
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
                                      onKeyDown={(e) => {
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
                                      onClick={(e) => {
                                         const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                         const val = input.value.trim();
                                         if (val && !currentFeatures.includes(val)) {
                                            handleFeatureToggle(cat as any, val);
                                            input.value = '';
                                         }
                                      }}
                                   >
                                      <Plus className="w-4 h-4 mr-1"/> Add
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
                          <Input type="number" className="border-green-200 focus:border-green-500" value={formData.availableUnits} onFocus={(e) => e.target.select()} onChange={e => setFormData(p => ({...p, availableUnits: +e.target.value}))} />
                       </div>
                       <div className="space-y-2">
                          <Label className="text-blue-600">Reserved / Under Offer</Label>
                          <Input type="number" className="border-blue-200 focus:border-blue-500" value={formData.reservedUnits} onFocus={(e) => e.target.select()} onChange={e => setFormData(p => ({...p, reservedUnits: +e.target.value}))} />
                       </div>
                       <div className="space-y-2">
                          <Label className="text-slate-600">Sold Units (Historical)</Label>
                          <Input type="number" value={ ((formData.totalUnits || 0) - (formData.availableUnits || 0) - (formData.reservedUnits || 0)) } disabled className="bg-slate-100" />
                       </div>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-200">
                       <div className="flex gap-4 items-end">
                          <div className="space-y-2 flex-1">
                             <Label>Total Units (Auto-Calculated Override)</Label>
                             <Input 
                                type="number" 
                                value={formData.totalUnits} 
                                // Auto-calc total if user hasn't manually overridden (simplified here by allowing direct edit)
                                onChange={e => setFormData(p => ({...p, totalUnits: +e.target.value}))} 
                                className="font-semibold"
                             />
                             <p className="text-xs text-slate-500">
                                Normally: Available {formData.availableUnits || 0} + Reserved {formData.reservedUnits || 0} + Sold = Total
                             </p>
                          </div>
                          <div className="flex-1">
                              <div className={cn("p-3 rounded-lg text-center font-bold border", 
                                 (formData.availableUnits || 0) > 0 ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
                              )}>
                                 {(formData.availableUnits || 0) > 0 ? 'AVAILABLE' : 'SOLD OUT / LISTING'}
                              </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </TabsContent>

            </div>

             {/* Footer Actions */}
             <div className="p-4 border-t bg-slate-50 flex justify-between">
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <div className="flex gap-2">
                   {/* Explicit Save Draft for user reassurance (auto-save is also active) */}
                   {activeTab !== 'stock' && (
                      <Button variant="outline" onClick={() => {
                         // Auto-save is active in the wizard - this is just visual feedback
                         toast.success('Draft saved! Your progress is preserved.');
                      }}>
                         Save Draft
                      </Button>
                   )}

                   {activeTab !== 'basic' && <Button variant="outline" onClick={() => {
                      const tabs = ['basic', 'pricing', 'media', 'features', 'stock'];
                      const curr = tabs.indexOf(activeTab);
                      if(curr > 0) setActiveTab(tabs[curr-1]);
                   }}>Previous</Button>}
                   
                   {activeTab !== 'stock' ? (
                      <Button onClick={() => {
                         const tabs = ['basic', 'pricing', 'media', 'features', 'stock'];
                         const curr = tabs.indexOf(activeTab);
                         if(curr < tabs.length - 1) setActiveTab(tabs[curr+1]);
                      }}>Next</Button>
                   ) : (
                      <DialogFooter className="px-6 py-4 border-t bg-slate-50 flex justify-between items-center sm:justify-between">
           <div className="flex gap-2">
              <Button variant="ghost" className="text-slate-500" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              {!editingId && (
                  <Button variant="ghost" className="text-red-400 hover:text-red-500 hover:bg-red-50" onClick={handleDiscardDraft}>
                      Clear Form
                  </Button>
              )}
           </div>
           <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleSave(true)}>Save & Add Another</Button>
              <Button onClick={() => handleSave(false)} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                {editingId ? 'Update Unit Type' : 'Create Unit Type'}
              </Button>
           </div>
        </DialogFooter>
                   )}
                </div>
             </div>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      <div className="flex justify-between pt-8 border-t border-slate-200">
         <Button variant="outline" onClick={() => setPhase(9)} className="px-6 h-11"><ArrowLeft className="w-4 h-4 mr-2"/>Back</Button>
         <Button onClick={() => validatePhase(10) && setPhase(11)} size="lg" className="px-8 h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">Continue to Review & Publish<ArrowRight className="w-4 h-4 ml-2"/></Button>
      </div>

    </div>
  );
}