import React, { useState, useRef } from 'react';
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
import { Trash2, Plus, Edit2, BedDouble, Bath, Car, Ruler, 
  DollarSign, Image, BarChart3, ArrowLeft, ArrowRight,
  Upload, X, FileImage, Layers, Settings, Sparkles, Lightbulb
} from 'lucide-react';
import { MediaUploadZone } from '@/components/media/MediaUploadZone';
import { SortableMediaGrid } from '@/components/media/SortableMediaGrid';
import { UploadProgressList, UploadProgress } from '@/components/media/UploadProgressBar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';

// Parking type options
const PARKING_TYPE_OPTIONS = [
  { value: 'none', label: 'No Parking' },
  { value: 'open_bay', label: 'Open Bay' },
  { value: 'covered_bay', label: 'Covered Bay' },
  { value: 'carport', label: 'Carport' },
  { value: 'single_garage', label: 'Single Garage' },
  { value: 'double_garage', label: 'Double Garage' },
  { value: 'tandem_garage', label: 'Tandem Garage' },
];

// Feature Categories with placeholder examples
const FEATURE_CATEGORIES = [
  { 
    key: 'kitchen', 
    label: 'Kitchen', 
    placeholder: 'e.g. Granite countertops, built-in oven & hob, extractor fan, soft-close cupboards' 
  },
  { 
    key: 'bathroom', 
    label: 'Bathroom', 
    placeholder: 'e.g. Full bathroom with shower, guest toilet, ceramic tiles, chrome fittings' 
  },
  { 
    key: 'flooring', 
    label: 'Flooring', 
    placeholder: 'e.g. Porcelain tiles in living areas, carpet in bedrooms, laminate optional' 
  },
  { 
    key: 'storage', 
    label: 'Storage & Built-ins', 
    placeholder: 'e.g. Built-in wardrobes in all bedrooms, linen cupboard, storeroom' 
  },
  { 
    key: 'security', 
    label: 'Security', 
    placeholder: 'e.g. Alarm pre-wired, burglar bars, security doors, intercom' 
  },
  { 
    key: 'outdoor', 
    label: 'Outdoor', 
    placeholder: 'e.g. Private balcony 8m², covered patio, braai area, small garden' 
  },
  { 
    key: 'other', 
    label: 'Other Features', 
    placeholder: 'e.g. Aircon ready, ceiling fans, double glazing, pet friendly' 
  },
];

// Helper: Get availability status
const getAvailabilityStatus = (total: number, available: number) => {
  if (total === 0) return { label: 'Not Set', color: 'bg-slate-100 text-slate-600' };
  const percent = (available / total) * 100;
  if (available === total) return { label: 'Available', color: 'bg-green-100 text-green-700' };
  if (percent > 50) return { label: 'Selling', color: 'bg-blue-100 text-blue-700' };
  if (percent > 20) return { label: 'Selling Fast', color: 'bg-orange-100 text-orange-700' };
  if (available > 0) return { label: 'Limited', color: 'bg-red-100 text-red-700' };
  return { label: 'Sold Out', color: 'bg-slate-200 text-slate-500' };
};

// Format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-ZA', { 
    style: 'currency', 
    currency: 'ZAR', 
    maximumFractionDigits: 0 
  }).format(value);
};

// Default form data
const getDefaultFormData = (): Partial<UnitType> & { featureSpecs: Record<string, string> } => ({
  name: '',
  description: '',
  bedrooms: 2,
  bathrooms: 1,
  parkingType: 'single_garage',
  parkingBays: 1,
  sizeFrom: 0,
  sizeTo: 0,
  yardSize: 0,
  priceFrom: 0,
  priceTo: 0,
  totalUnits: 0,
  availableUnits: 0,
  reservedUnits: 0,
  featureSpecs: {},
});

export function UnitTypesPhase() {
  const { 
    unitTypes, 
    addUnitType, 
    updateUnitType, 
    removeUnitType, 
    setPhase,
    validatePhase 
  } = useDevelopmentWizard();

  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<Partial<UnitType> & { featureSpecs: Record<string, string> }>(getDefaultFormData());
  
  const [unitGallery, setUnitGallery] = useState<MediaItem[]>([]);
  const [floorPlanImages, setFloorPlanImages] = useState<MediaItem[]>([]);
  
  // Upload Progress State
  const [galleryUploads, setGalleryUploads] = useState<UploadProgress[]>([]);
  const [floorPlanUploads, setFloorPlanUploads] = useState<UploadProgress[]>([]);
  
  const presignMutation = trpc.upload.presign.useMutation();

  // Draft Persistence
  const DRAFT_KEY = 'unitTypeDraft';

  // Save draft to localStorage whenever form changes
  React.useEffect(() => {
    if (isDialogOpen && !editingId) {
      const draftData = {
        formData,
        unitGallery,
        floorPlanImages,
        activeTab,
        timestamp: Date.now()
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    }
  }, [formData, unitGallery, floorPlanImages, activeTab, isDialogOpen, editingId]);

  // Load draft on component mount
  React.useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft && !editingId) {
      try {
        const parsed = JSON.parse(savedDraft);
        // Check if draft is less than 7 days old
        const daysSinceLastEdit = (Date.now() - parsed.timestamp) / (1000 * 60 * 60 * 24);
        if (daysSinceLastEdit < 7) {
          // Show a notification that a draft was found
          toast.info('Draft unit type found. Click "Add Unit Type" to resume.', {
            duration: 5000,
          });
        } else {
          // Clear old draft
          localStorage.removeItem(DRAFT_KEY);
        }
      } catch (error) {
        console.error('Failed to parse draft:', error);
        localStorage.removeItem(DRAFT_KEY);
      }
    }
  }, []);

  // Reset function
  const resetForm = () => {
    setFormData(getDefaultFormData());
    setUnitGallery([]);
    setFloorPlanImages([]);
    setGalleryUploads([]);
    setFloorPlanUploads([]);
    setEditingId(null);
    setActiveTab('basic');
    // Clear draft from localStorage
    localStorage.removeItem(DRAFT_KEY);
  };

  const handleOpenDialog = (unit?: UnitType) => {
    if (unit) {
      setEditingId(unit.id);
      // Extract features from specifications finishes
      const existingFeatures: Record<string, string> = {};
      if (unit.specifications?.finishes) {
        if (unit.specifications.finishes.kitchenFeatures) existingFeatures.kitchen = unit.specifications.finishes.kitchenFeatures;
        if (unit.specifications.finishes.bathroomFeatures) existingFeatures.bathroom = unit.specifications.finishes.bathroomFeatures;
        if (unit.specifications.finishes.flooringTypes) existingFeatures.flooring = unit.specifications.finishes.flooringTypes;
      }
      // Try to extract from amenities.additional as fallback
      if (unit.amenities?.additional?.length) {
        FEATURE_CATEGORIES.forEach(cat => {
          const match = unit.amenities.additional.find(a => a.startsWith(`${cat.key}:`));
          if (match) existingFeatures[cat.key] = match.replace(`${cat.key}:`, '').trim();
        });
      }
      
      setFormData({
        name: unit.name,
        description: unit.description || '',
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        parkingType: unit.parkingType || 'none',
        parkingBays: unit.parkingBays || 0,
        sizeFrom: unit.sizeFrom || unit.unitSize || 0,
        sizeTo: unit.sizeTo || unit.unitSize || 0,
        yardSize: unit.yardSize || 0,
        priceFrom: unit.priceFrom || unit.basePriceFrom || 0,
        priceTo: unit.priceTo || unit.basePriceTo || unit.basePriceFrom || 0,
        totalUnits: unit.totalUnits || 0,
        availableUnits: unit.availableUnits || 0,
        reservedUnits: unit.reservedUnits || 0,
        featureSpecs: existingFeatures,
      });
      setUnitGallery(unit.baseMedia?.gallery || []);
      setFloorPlanImages(unit.baseMedia?.floorPlans || []);
    } else {
      // Opening for new unit - check for saved draft
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          const daysSinceLastEdit = (Date.now() - parsed.timestamp) / (1000 * 60 * 60 * 24);
          if (daysSinceLastEdit < 7) {
            // Restore draft
            setFormData(parsed.formData || getDefaultFormData());
            setUnitGallery(parsed.unitGallery || []);
            setFloorPlanImages(parsed.floorPlanImages || []);
            setActiveTab(parsed.activeTab || 'basic');
            toast.success('Draft restored! Continue where you left off.');
          } else {
            // Draft too old
            resetForm();
          }
        } catch (error) {
          console.error('Failed to restore draft:', error);
          resetForm();
        }
      } else {
        resetForm();
      }
    }
    setIsDialogOpen(true);
  };

  // Robust Media Upload Handler
  const handleMediaUpload = async (files: File[], category: 'gallery' | 'floorPlans') => {
    if (!files || files.length === 0) return;
    
    // Set appropriate state setters
    const setUploads = category === 'gallery' ? setGalleryUploads : setFloorPlanUploads;
    const setMedia = category === 'gallery' ? setUnitGallery : setFloorPlanImages;
    const currentMedia = category === 'gallery' ? unitGallery : floorPlanImages;
    
    // Create upload progress entries
    const newUploads: UploadProgress[] = files.map((file, index) => ({
      id: `upload-${Date.now()}-${index}`,
      fileName: file.name,
      progress: 0,
      status: 'uploading' as const,
    }));
    
    setUploads(prev => [...prev, ...newUploads]);

    // Process each file
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadId = newUploads[i].id;
        const startTime = Date.now();

        try {
            const isImage = file.type.startsWith('image/');
            const mediaType = isImage ? 'image' : 'video'; // Floorplans treated as images usually

            // Progress: 10%
            setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress: 10 } : u));

            // Presign
            const result = await presignMutation.mutateAsync({
                filename: file.name,
                contentType: file.type,
            });

            // Progress: 20%
            setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress: 20 } : u));

            // XHR Upload
            const xhr = new XMLHttpRequest();
            await new Promise<void>((resolve, reject) => {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = 20 + (e.loaded / e.total) * 70; 
                        setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress: Math.round(percentComplete) } : u));
                    }
                });
                xhr.addEventListener('load', () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Status ${xhr.status}`)));
                xhr.addEventListener('error', () => reject(new Error('Network error')));
                xhr.open('PUT', result.url);
                xhr.setRequestHeader('Content-Type', file.type);
                xhr.send(file);
            });

            // Progress: 100%
            setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress: 100, status: 'completed' as const } : u));

            // Add to Media State
            const newItem: MediaItem = {
                id: `media-${Date.now()}-${i}`,
                url: result.publicUrl,
                type: mediaType,
                category: category === 'gallery' ? 'photo' : 'floorplan',
                fileName: file.name,
                isPrimary: currentMedia.length === 0 && i === 0 && category === 'gallery', // First gallery image is primary
                displayOrder: currentMedia.length + i
            };

            setMedia(prev => [...prev, newItem]);

        } catch (error: any) {
            console.error('Upload failed:', error);
            setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, status: 'error' as const, error: error.message } : u));
            toast.error(`Failed to upload ${file.name}`);
        }
    }
  };

  const handleMediaReorder = (items: MediaItem[], category: 'gallery' | 'floorPlans') => {
      const setMedia = category === 'gallery' ? setUnitGallery : setFloorPlanImages;
      // Update display order based on index
      const updated = items.map((item, index) => ({
          ...item,
          displayOrder: index
      }));
      setMedia(updated);
  };

  const handleMediaRemove = (id: string, category: 'gallery' | 'floorPlans') => {
      const setMedia = category === 'gallery' ? setUnitGallery : setFloorPlanImages;
      setMedia(prev => prev.filter(item => item.id !== id));
  };
  
  const handleSetPrimary = (id: string) => {
      setUnitGallery(prev => prev.map(item => ({
          ...item,
          isPrimary: item.id === id
      })));
  };



  const removeMedia = (id: string, setMedia: React.Dispatch<React.SetStateAction<MediaItem[]>>) => {
    setMedia(prev => prev.filter(img => img.id !== id));
  };

  const updateFeatureSpec = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      featureSpecs: { ...prev.featureSpecs, [key]: value }
    }));
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast.error('Please enter a unit type name');
      setActiveTab('basic');
      return;
    }
    if (!formData.priceFrom || formData.priceFrom <= 0) {
      toast.error('Please enter a valid starting price');
      setActiveTab('pricing');
      return;
    }

    // Build specifications from featureSpecs text fields
    const specs = formData.featureSpecs || {};
    const specifications = {
      builtInFeatures: {
        builtInWardrobes: (specs.storage || '').toLowerCase().includes('wardrobe'),
        tiledFlooring: (specs.flooring || '').toLowerCase().includes('tile'),
        graniteCounters: (specs.kitchen || '').toLowerCase().includes('granite'),
      },
      finishes: {
        flooringTypes: specs.flooring || '',
        kitchenFeatures: specs.kitchen || '',
        bathroomFeatures: specs.bathroom || '',
        paintAndWalls: specs.other || '',
      },
      electrical: {
        prepaidElectricity: (specs.energy || '').toLowerCase().includes('prepaid'),
      },
    };

    // Store all feature specs as additional amenities for listing display
    const additionalAmenities = Object.entries(specs)
      .filter(([_, v]) => v.trim())
      .map(([k, v]) => `${k}: ${v}`);

    const unitData: Omit<UnitType, 'id'> = {
      name: formData.name!,
      description: formData.description,
      bedrooms: formData.bedrooms || 0,
      bathrooms: formData.bathrooms || 0,
      parkingType: formData.parkingType || 'none',
      parkingBays: formData.parkingBays || 0,
      sizeFrom: formData.sizeFrom || 0,
      sizeTo: formData.sizeTo || formData.sizeFrom || 0,
      yardSize: formData.yardSize,
      priceFrom: formData.priceFrom!,
      priceTo: formData.priceTo || formData.priceFrom!,
      totalUnits: formData.totalUnits || 0,
      availableUnits: formData.availableUnits || 0,
      reservedUnits: formData.reservedUnits || 0,
      // Legacy fields for compatibility
      basePriceFrom: formData.priceFrom,
      basePriceTo: formData.priceTo || formData.priceFrom,
      unitSize: formData.sizeFrom,
      parking: formData.parkingType === 'none' ? 'none' : 
               formData.parkingType?.includes('garage') ? 'garage' : 
               formData.parkingType === 'carport' ? 'carport' : '1',
      amenities: { standard: [], additional: additionalAmenities },
      specifications,
      baseMedia: {
        gallery: unitGallery,
        floorPlans: floorPlanImages,
        renders: []
      },
      specs: [],
      displayOrder: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (editingId) {
      updateUnitType(editingId, unitData);
      toast.success('Unit type updated');
    } else {
      addUnitType({ ...unitData, id: crypto.randomUUID() } as UnitType);
      toast.success('Unit type added');
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleNext = () => {
    const { isValid, errors } = validatePhase(9);
    if (isValid) {
      setPhase(10); // Go to Publish
    } else {
      errors.forEach(e => toast.error(e));
    }
  };

  const handleBack = () => {
    setPhase(8); // Back to Media
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Unit Types</h2>
          <p className="text-slate-600">
            Define the different types of units available with pricing, features, and floor plans.
          </p>
        </div>
        <Button 
          onClick={() => handleOpenDialog()} 
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300 h-11"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Unit Type
        </Button>
      </div>

      {/* Empty State */}
      {unitTypes.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-300">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-slate-100 rounded-full mb-4">
              <Layers className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Unit Types Yet</h3>
            <p className="text-slate-600 mb-6 max-w-md">
              Add your first unit type with full specifications, pricing, images, and floor plans.
            </p>
            <Button 
              onClick={() => handleOpenDialog()} 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Unit Type
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Unit Type Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {unitTypes.map((unit) => {
            const status = getAvailabilityStatus(unit.totalUnits || 0, unit.availableUnits || 0);
            const soldCount = (unit.totalUnits || 0) - (unit.availableUnits || 0) - (unit.reservedUnits || 0);
            const availPercent = unit.totalUnits ? ((unit.availableUnits || 0) / unit.totalUnits) * 100 : 0;
            const hasImages = (unit.baseMedia?.gallery?.length || 0) + (unit.baseMedia?.floorPlans?.length || 0) > 0;
            
            return (
              <Card key={unit.id} className="group hover:shadow-xl transition-all duration-300 border-slate-200/60 hover:border-blue-300 overflow-hidden">
                {/* Thumbnail */}
                {unit.baseMedia?.gallery?.[0] && (
                  <div className="h-32 overflow-hidden">
                    <img 
                      src={unit.baseMedia.gallery[0].url} 
                      alt={unit.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-2">
                      <CardTitle className="text-lg font-semibold text-slate-900 truncate" title={unit.name}>
                        {unit.name}
                      </CardTitle>
                      {unit.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{unit.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:bg-blue-50" 
                        onClick={() => handleOpenDialog(unit)}
                      >
                        <Edit2 className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:bg-red-50" 
                        onClick={() => removeUnitType(unit.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-700">
                      <div className="p-1.5 bg-blue-50 rounded">
                        <BedDouble className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="font-medium">{unit.bedrooms} Beds</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <div className="p-1.5 bg-blue-50 rounded">
                        <Bath className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="font-medium">{unit.bathrooms} Baths</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <div className="p-1.5 bg-blue-50 rounded">
                        <Car className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="capitalize font-medium text-xs">
                        {PARKING_TYPE_OPTIONS.find(p => p.value === unit.parkingType)?.label || unit.parking || 'None'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <div className="p-1.5 bg-blue-50 rounded">
                        <Ruler className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="font-medium">
                        {unit.sizeFrom === unit.sizeTo || !unit.sizeTo 
                          ? `${unit.sizeFrom || unit.unitSize || 0}m²`
                          : `${unit.sizeFrom}-${unit.sizeTo}m²`
                        }
                      </span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Price Range</p>
                    <p className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {(unit.priceFrom || unit.basePriceFrom) === (unit.priceTo || unit.basePriceTo)
                        ? formatCurrency(unit.priceFrom || unit.basePriceFrom || 0)
                        : `${formatCurrency(unit.priceFrom || unit.basePriceFrom || 0)} - ${formatCurrency(unit.priceTo || unit.basePriceTo || unit.basePriceFrom || 0)}`
                      }
                    </p>
                  </div>

                  {/* Availability */}
                  {unit.totalUnits > 0 && (
                    <div className="pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500 font-medium">Availability</span>
                        <Badge className={cn("text-xs", status.color)}>{status.label}</Badge>
                      </div>
                      <Progress value={availPercent} className="h-2 mb-2" />
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>{unit.availableUnits} available</span>
                        <span>{unit.reservedUnits > 0 ? `${unit.reservedUnits} reserved` : `${soldCount} sold`}</span>
                      </div>
                    </div>
                  )}

                  {/* Media Badge */}
                  {hasImages && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <FileImage className="w-3 h-3" />
                      <span>
                        {unit.baseMedia?.gallery?.length || 0} images, {unit.baseMedia?.floorPlans?.length || 0} floor plans
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-8 mt-8 border-t border-slate-200">
        <Button 
          variant="outline" 
          onClick={handleBack}
          className="px-6 h-11 border-slate-300"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={handleNext} 
          size="lg" 
          className="px-8 h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300"
        >
          Continue to Publish
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* FIXED HEIGHT TABBED DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[750px] h-[600px] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle className="text-xl">{editingId ? 'Edit Unit Type' : 'Add Unit Type'}</DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            {/* Tab Headers */}
            <TabsList className="grid grid-cols-5 w-full bg-slate-100 p-1 mx-6 mt-4 rounded-lg shrink-0" style={{ width: 'calc(100% - 48px)' }}>
              <TabsTrigger value="basic" className="flex items-center gap-1.5 text-xs">
                <BedDouble className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Basic</span>
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center gap-1.5 text-xs">
                <DollarSign className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pricing</span>
              </TabsTrigger>
              <TabsTrigger value="media" className="flex items-center gap-1.5 text-xs">
                <Image className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Media</span>
              </TabsTrigger>
              <TabsTrigger value="features" className="flex items-center gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Features</span>
              </TabsTrigger>
              <TabsTrigger value="stock" className="flex items-center gap-1.5 text-xs">
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Stock</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Content - Scrollable Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Tab 1: Basic Details */}
              <TabsContent value="basic" className="mt-0 space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Unit Type Name *</Label>
                    <Input 
                      id="name" 
                      placeholder="e.g. Type A - 2 Bed Simplex" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Short marketing description..."
                      rows={2}
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="bedrooms">Bedrooms</Label>
                      <Input 
                        id="bedrooms" type="number" min="0" max="10"
                        value={formData.bedrooms}
                        onChange={(e) => setFormData({...formData, bedrooms: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="bathrooms">Bathrooms</Label>
                      <Input 
                        id="bathrooms" type="number" min="0" max="10" step="0.5"
                        value={formData.bathrooms}
                        onChange={(e) => setFormData({...formData, bathrooms: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="parkingType">Parking Type</Label>
                      <Select 
                        value={formData.parkingType} 
                        onValueChange={(val) => setFormData({...formData, parkingType: val as any})}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PARKING_TYPE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="parkingBays">Parking Bays</Label>
                      <Input 
                        id="parkingBays" type="number" min="0" max="4"
                        value={formData.parkingBays}
                        onChange={(e) => setFormData({...formData, parkingBays: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>

                  {/* Size Fields */}
                  <div className="pt-4 border-t border-slate-200">
                    <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-blue-600" />
                      Size Information (m²)
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="sizeFrom">Unit Size From</Label>
                        <Input 
                          id="sizeFrom" type="number" min="0" placeholder="e.g. 65"
                          value={formData.sizeFrom || ''}
                          onChange={(e) => setFormData({...formData, sizeFrom: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="sizeTo">Unit Size To</Label>
                        <Input 
                          id="sizeTo" type="number" min="0" placeholder="Same if fixed"
                          value={formData.sizeTo || ''}
                          onChange={(e) => setFormData({...formData, sizeTo: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="yardSize">Yard/Garden Size</Label>
                        <Input 
                          id="yardSize" type="number" min="0" placeholder="Optional"
                          value={formData.yardSize || ''}
                          onChange={(e) => setFormData({...formData, yardSize: parseInt(e.target.value) || 0})}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Enter internal floor area. Yard size is for townhouses/freehold properties.</p>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 2: Size & Pricing */}
              <TabsContent value="pricing" className="mt-0 space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-blue-600" />
                    Size Range (m²)
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="sizeFrom">From</Label>
                      <Input id="sizeFrom" type="number" min="0"
                        value={formData.sizeFrom || ''}
                        onChange={(e) => setFormData({...formData, sizeFrom: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="sizeTo">To</Label>
                      <Input id="sizeTo" type="number" min="0" placeholder="Same if fixed"
                        value={formData.sizeTo || ''}
                        onChange={(e) => setFormData({...formData, sizeTo: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="yardSize">Yard (optional)</Label>
                      <Input id="yardSize" type="number" min="0" placeholder="Outdoor"
                        value={formData.yardSize || ''}
                        onChange={(e) => setFormData({...formData, yardSize: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    Price Range (ZAR)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="priceFrom">From *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-500">R</span>
                        <Input id="priceFrom" type="number" min="0" className="pl-8"
                          value={formData.priceFrom || ''}
                          onChange={(e) => setFormData({...formData, priceFrom: parseInt(e.target.value) || 0})}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="priceTo">To</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-500">R</span>
                        <Input id="priceTo" type="number" min="0" className="pl-8" placeholder="Same if fixed"
                          value={formData.priceTo || ''}
                          onChange={(e) => setFormData({...formData, priceTo: parseInt(e.target.value) || 0})}
                        />
                      </div>
                    </div>
                  </div>
                  {formData.sizeFrom && formData.priceFrom ? (
                    <p className="text-sm text-slate-500 mt-3">
                      ≈ {formatCurrency(Math.round(formData.priceFrom / formData.sizeFrom))} per m²
                    </p>
                  ) : null}
                </div>
              </TabsContent>

              {/* Tab 3: Media (Images + Floor Plans) */}
              {/* Tab 3: Media (Images + Floor Plans) */}
              <TabsContent value="media" className="mt-0 space-y-6">
                
                {/* Unit Gallery Section */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 flex items-center gap-2 mb-1">
                      <Image className="w-4 h-4 text-blue-600" />
                      Unit Gallery
                    </h4>
                    <p className="text-sm text-slate-500">Upload photos of this specific unit type (e.g. kitchen, bedroom, bathroom).</p>
                  </div>

                  <MediaUploadZone
                    onUpload={(files) => handleMediaUpload(files, 'gallery')}
                    maxFiles={10}
                    maxSizeMB={5}
                    acceptedTypes={['image/*']}
                    existingMediaCount={unitGallery.length}
                    disabled={galleryUploads.some(u => u.status === 'uploading')}
                  />

                  {galleryUploads.length > 0 && (
                    <UploadProgressList
                      uploads={galleryUploads}
                      onCancel={(id) => setGalleryUploads(prev => prev.filter(u => u.id !== id))}
                      onRetry={(id) => setGalleryUploads(prev => prev.filter(u => u.id !== id))} // Simplified retry
                      onRemove={(id) => setGalleryUploads(prev => prev.filter(u => u.id !== id))}
                    />
                  )}

                  {unitGallery.length > 0 && (
                    <SortableMediaGrid
                      media={unitGallery}
                      onReorder={(items) => handleMediaReorder(items, 'gallery')}
                      onRemove={(id) => handleMediaRemove(id, 'gallery')}
                      onSetPrimary={handleSetPrimary}
                    />
                  )}
                </div>

                <div className="h-px bg-slate-200" />

                {/* Floor Plans Section */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 flex items-center gap-2 mb-1">
                      <Layers className="w-4 h-4 text-purple-600" />
                      Floor Plans
                    </h4>
                    <p className="text-sm text-slate-500">Upload 2D or 3D floor plans for this unit layout.</p>
                  </div>

                  <MediaUploadZone
                    onUpload={(files) => handleMediaUpload(files, 'floorPlans')}
                    maxFiles={5}
                    maxSizeMB={5}
                    acceptedTypes={['image/*']}
                    existingMediaCount={floorPlanImages.length}
                    disabled={floorPlanUploads.some(u => u.status === 'uploading')}
                  />

                  {floorPlanUploads.length > 0 && (
                    <UploadProgressList
                      uploads={floorPlanUploads}
                      onCancel={(id) => setFloorPlanUploads(prev => prev.filter(u => u.id !== id))}
                      onRetry={(id) => setFloorPlanUploads(prev => prev.filter(u => u.id !== id))}
                      onRemove={(id) => setFloorPlanUploads(prev => prev.filter(u => u.id !== id))}
                    />
                  )}

                  {floorPlanImages.length > 0 && (
                    <SortableMediaGrid
                      media={floorPlanImages}
                      onReorder={(items) => handleMediaReorder(items, 'floorPlans')}
                      onRemove={(id) => handleMediaRemove(id, 'floorPlans')}
                    />
                  )}
                </div>
              </TabsContent>

              {/* Tab 4: Features & Specs */}
              <TabsContent value="features" className="mt-0 space-y-6">
                <p className="text-sm text-slate-600 mb-4">
                  Add specific features and finishes for this unit type. Click + or press Enter to add each item.
                </p>
                <div className="space-y-6">
                  {FEATURE_CATEGORIES.map((category) => {
                    const categoryFeatures = formData.featureSpecs?.[category.key] 
                      ? formData.featureSpecs[category.key].split('|').filter(f => f.trim()) 
                      : [];
                    const [currentInput, setCurrentInput] = React.useState('');

                    const addFeature = () => {
                      if (!currentInput.trim()) return;
                      const existing = formData.featureSpecs?.[category.key] || '';
                      const updated = existing 
                        ? `${existing}|${currentInput.trim()}` 
                        : currentInput.trim();
                      updateFeatureSpec(category.key, updated);
                      setCurrentInput('');
                    };

                    const removeFeature = (index: number) => {
                      const features = categoryFeatures.filter((_, i) => i !== index);
                      updateFeatureSpec(category.key, features.join('|'));
                    };

                    return (
                      <Card key={category.key} className="border-slate-200/60 shadow-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-medium text-slate-800">
                            {category.label}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Input Section */}
                          <div className="flex gap-2">
                            <Input 
                              placeholder={category.placeholder}
                              value={currentInput}
                              onChange={(e) => setCurrentInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && addFeature()}
                              className="h-10 border-slate-200 focus:border-blue-400 text-sm"
                            />
                            <Button 
                              onClick={addFeature}
                              size="icon"
                              type="button"
                              className="h-10 w-10 bg-blue-600 hover:bg-blue-700 shrink-0"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Features Display */}
                          <div className="flex flex-wrap gap-2 min-h-[60px] content-start bg-gradient-to-br from-slate-50 to-blue-50/20 p-3 rounded-lg border border-dashed border-slate-200">
                            {categoryFeatures.length === 0 && (
                              <div className="w-full text-center py-2">
                                <p className="text-xs text-slate-400">No features added yet</p>
                              </div>
                            )}
                            {categoryFeatures.map((feature, idx) => (
                              <Badge 
                                key={idx}
                                className="pl-2.5 pr-2 py-1.5 bg-white border-slate-300 shadow-sm hover:shadow-md transition-all text-slate-700 text-xs font-medium"
                              >
                                {feature}
                                <button 
                                  onClick={() => removeFeature(idx)}
                                  type="button"
                                  className="ml-1.5 hover:text-red-600 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                <div className="pt-2 text-sm text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <strong>{Object.values(formData.featureSpecs || {}).filter(v => v.trim()).length}</strong> of {FEATURE_CATEGORIES.length} categories have features
                </div>
              </TabsContent>

              {/* Tab 5: Availability */}
              <TabsContent value="stock" className="mt-0 space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-600" />
                    Stock & Availability
                  </h4>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="totalUnits">Total Units</Label>
                      <Input id="totalUnits" type="number" min="0"
                        value={formData.totalUnits || ''}
                        onChange={(e) => setFormData({...formData, totalUnits: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="availableUnits">Available</Label>
                      <Input id="availableUnits" type="number" min="0" max={formData.totalUnits || 0}
                        value={formData.availableUnits || ''}
                        onChange={(e) => setFormData({...formData, availableUnits: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="reservedUnits">Reserved</Label>
                      <Input id="reservedUnits" type="number" min="0"
                        value={formData.reservedUnits || ''}
                        onChange={(e) => setFormData({...formData, reservedUnits: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  
                  {formData.totalUnits && formData.totalUnits > 0 && (
                    <div className="pt-4 mt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600">
                          Sold: {(formData.totalUnits || 0) - (formData.availableUnits || 0) - (formData.reservedUnits || 0)} units
                        </span>
                        <Badge className={cn(
                          getAvailabilityStatus(formData.totalUnits || 0, formData.availableUnits || 0).color
                        )}>
                          {getAvailabilityStatus(formData.totalUnits || 0, formData.availableUnits || 0).label}
                        </Badge>
                      </div>
                      <Progress value={((formData.availableUnits || 0) / (formData.totalUnits || 1)) * 100} className="h-2" />
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>

          {/* Footer - Progressive Navigation */}
          <DialogFooter className="px-6 py-4 border-t shrink-0 gap-2">
            <div className="flex justify-between w-full">
              {/* Back / Cancel Button */}
              {activeTab === 'basic' ? (
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const tabs = ['basic', 'pricing', 'media', 'features', 'stock'];
                    const currentIndex = tabs.indexOf(activeTab);
                    if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1]);
                  }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}

              {/* Next / Submit Button */}
              {activeTab === 'stock' ? (
                <Button 
                  onClick={handleSubmit} 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {editingId ? 'Save Changes' : 'Add Unit Type'}
                </Button>
              ) : (
                <Button 
                  onClick={() => {
                    const tabs = ['basic', 'pricing', 'media', 'features', 'stock'];
                    const tabLabels = {
                      'basic': 'Pricing',
                      'pricing': 'Media',
                      'media': 'Features',
                      'features': 'Stock'
                    };
                    const currentIndex = tabs.indexOf(activeTab);
                    if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1]);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Continue to {activeTab === 'basic' ? 'Pricing' : activeTab === 'pricing' ? 'Media' : activeTab === 'media' ? 'Features' : 'Stock'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}