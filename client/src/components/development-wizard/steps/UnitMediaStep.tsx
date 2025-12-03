import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import type { UnitMediaItem } from '@/hooks/useDevelopmentWizard';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MediaUploadZone } from '@/components/media/MediaUploadZone';
import { SortableMediaGrid } from '@/components/media/SortableMediaGrid';
import {
  Home,
  Bed,
  Bath,
  Image as ImageIcon,
  Layout,
  Camera,
  Building,
  Info,
  Maximize,
} from 'lucide-react';
import { useState, useCallback } from 'react';

export function UnitMediaStep() {
  const { unitTypes, addUnitMedia, removeUnitMedia } = useDevelopmentWizard();
  const [activeUnitId, setActiveUnitId] = useState<string>(
    unitTypes[0]?.id || ''
  );

  // Find active unit
  const activeUnit = unitTypes.find((u) => u.id === activeUnitId);
  
  // Handle file uploads for each category
  const handleUpload = useCallback(
    (files: File[], category: 'floorPlans' | 'interior' | 'exterior') => {
      if (!activeUnitId) return;
      
      files.forEach((file) => {
        const url = URL.createObjectURL(file);
        const type: 'image' | 'pdf' = file.type === 'application/pdf' ? 'pdf' : 'image';
        
        addUnitMedia(activeUnitId, category, {
          file,
          url,
          type,
          fileName: file.name,
        });
      });
    },
    [activeUnitId, addUnitMedia]
  );
  
  // Handle media removal
  const handleRemove = useCallback(
    (mediaId: string, category: 'floorPlans' | 'interior' | 'exterior') => {
      if (!activeUnitId) return;
      removeUnitMedia(activeUnitId, category, mediaId);
    },
    [activeUnitId, removeUnitMedia]
  );
  
  // Get media counts
  const getMediaCount = (category: 'floorPlans' | 'interior' | 'exterior') => {
    return activeUnit?.unitMedia?.[category]?.length || 0;
  };

  if (unitTypes.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-bold text-slate-800">
              Unit-Specific Media
            </h3>
          </div>
          <div className="text-center py-12">
            <Home className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No Units Configured
            </h3>
            <p className="text-slate-600 mb-4">
              Please add unit configurations in Step 2 first
            </p>
            <p className="text-sm text-slate-500">
              You need to configure at least one unit type before uploading
              unit-specific media.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <ImageIcon className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-bold text-slate-800">
              Unit-Specific Media
            </h3>
          </div>
          <p className="text-slate-600">
            Upload media for each unit type: floor plans, interior photos, and
            exterior views
          </p>
        </div>

        {/* Unit Type Tabs */}
        <Tabs
          value={activeUnitId}
          onValueChange={(v) => setActiveUnitId(v)}
          className="w-full"
        >
          <TabsList className="w-full flex-wrap h-auto gap-2 bg-slate-100 p-2 mb-6">
            {unitTypes.map((unit) => (
              <TabsTrigger
                key={unit.id}
                value={unit.id}
                className="flex-1 min-w-[200px] data-[state=active]:bg-white data-[state=active]:shadow-md"
              >
                <div className="flex items-center gap-2 py-1">
                  <Home className="w-4 h-4" />
                  <div className="text-left">
                    <p className="font-semibold text-sm">{unit.label}</p>
                    <p className="text-xs text-slate-600">
                      {unit.bedrooms} Bed • {unit.bathrooms} Bath
                    </p>
                  </div>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Content for each unit */}
          {unitTypes.map((unit) => (
            <TabsContent key={unit.id} value={unit.id} className="mt-0">
              {activeUnit && (
                <div className="space-y-6">
                  {/* Unit Info Header */}
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 mb-2">
                          {activeUnit.label}
                        </h4>
                        <div className="flex gap-2 mb-2 flex-wrap">
                          <Badge className="bg-blue-100 text-blue-700 text-xs">
                            {activeUnit.ownershipType
                              .split('-')
                              .map(
                                (w) => w.charAt(0).toUpperCase() + w.slice(1)
                              )
                              .join(' ')}
                          </Badge>
                          <Badge className="bg-purple-100 text-purple-700 text-xs">
                            {activeUnit.structuralType
                              .split('-')
                              .map(
                                (w) => w.charAt(0).toUpperCase() + w.slice(1)
                              )
                              .join(' ')}
                          </Badge>
                        </div>
                        <div className="flex gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Bed className="w-4 h-4" />
                            <span>{activeUnit.bedrooms} Bedrooms</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Bath className="w-4 h-4" />
                            <span>{activeUnit.bathrooms} Bathrooms</span>
                          </div>
                          {activeUnit.unitSize && (
                            <div className="flex items-center gap-1">
                              <Maximize className="w-4 h-4" />
                              <span>{activeUnit.unitSize}m²</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-600">Price</p>
                        <p className="text-lg font-bold text-purple-700">
                          R{activeUnit.priceFrom.toLocaleString()}
                          {activeUnit.priceTo &&
                            ` - R${activeUnit.priceTo.toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Floor Plans Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layout className="w-5 h-5 text-indigo-600" />
                        <h4 className="font-semibold text-slate-800">
                          Floor Plans
                        </h4>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {getMediaCount('floorPlans')} uploaded
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      Upload detailed floor plans for this unit configuration
                    </p>
                    <MediaUploadZone
                      onUpload={(files) => handleUpload(files, 'floorPlans')}
                      maxFiles={5}
                      maxSizeMB={5}
                      acceptedTypes={['image/*', 'application/pdf']}
                      existingMediaCount={getMediaCount('floorPlans')}
                    />
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Tip:</strong> Upload clear, labeled floor plans
                        showing room dimensions and layout. PDF and high-res
                        images work best.
                      </p>
                    </div>
                  </div>

                  {/* Interior Photos Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Camera className="w-5 h-5 text-pink-600" />
                        <h4 className="font-semibold text-slate-800">
                          Interior Photos
                        </h4>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {getMediaCount('interior')} uploaded
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      Showcase the interior: living areas, bedrooms, kitchen,
                      bathrooms
                    </p>
                    <MediaUploadZone
                      onUpload={(files) => handleUpload(files, 'interior')}
                      maxFiles={20}
                      maxSizeMB={5}
                      acceptedTypes={['image/*']}
                      existingMediaCount={getMediaCount('interior')}
                    />
                  </div>

                  {/* Exterior Photos Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building className="w-5 h-5 text-emerald-600" />
                        <h4 className="font-semibold text-slate-800">
                          Exterior Photos
                        </h4>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {getMediaCount('exterior')} uploaded
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      Show the exterior view, balconies, garden (if applicable)
                    </p>
                    <MediaUploadZone
                      onUpload={(files) => handleUpload(files, 'exterior')}
                      maxFiles={10}
                      maxSizeMB={5}
                      acceptedTypes={['image/*']}
                      existingMediaCount={getMediaCount('exterior')}
                    />
                    {activeUnit.yardSize && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800">
                          <strong>Garden/Yard:</strong> This unit has a{' '}
                          {activeUnit.yardSize}m² outdoor space. Be sure to
                          photograph it!
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Stats Summary */}
                  <div className="grid grid-cols-3 gap-3 mt-6">
                    <div className="text-center p-3 bg-indigo-50 rounded-lg">
                      <p className="text-2xl font-bold text-indigo-600">
                        {getMediaCount('floorPlans')}
                      </p>
                      <p className="text-xs text-slate-600">Floor Plans</p>
                    </div>
                    <div className="text-center p-3 bg-pink-50 rounded-lg">
                      <p className="text-2xl font-bold text-pink-600">
                        {getMediaCount('interior')}
                      </p>
                      <p className="text-xs text-slate-600">Interior</p>
                    </div>
                    <div className="text-center p-3 bg-emerald-50 rounded-lg">
                      <p className="text-2xl font-bold text-emerald-600">
                        {getMediaCount('exterior')}
                      </p>
                      <p className="text-xs text-slate-600">Exterior</p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Help Section */}
        <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-purple-900 mb-2">
                Unit Media Best Practices:
              </h4>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>
                  • <strong>Floor Plans:</strong> Upload 1-3 plans per unit
                  (ground floor, first floor, etc.)
                </li>
                <li>
                  • <strong>Interior:</strong> 10-15 photos showing all rooms
                  with good lighting
                </li>
                <li>
                  • <strong>Exterior:</strong> 5-8 photos showing building
                  facade, balconies, gardens
                </li>
                <li>
                  • <strong>Quality:</strong> Use high-resolution images
                  (minimum 1920x1080px)
                </li>
                <li>
                  • <strong>Consistency:</strong> Upload media for all unit
                  types for best results
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
