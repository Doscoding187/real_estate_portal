import { useDevelopmentWizard, type UnitType } from '@/hooks/useDevelopmentWizard';
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
import { Card } from '@/components/ui/card';
import {
  Plus,
  Trash2,
  GripVertical,
  Layers,
  Home,
  Building2,
  Upload,
  Link as LinkIcon,
  Info,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function UnitTypesStep() {
  const { unitTypes, addUnitType, updateUnitType, removeUnitType } = useDevelopmentWizard();

  const [newUnit, setNewUnit] = useState<Omit<UnitType, 'id'>>({
    ownershipType: 'sectional-title',
    structuralType: 'apartment',
    bedrooms: 2,
    bathrooms: 2,
    floors: undefined,
    label: '',
    priceFrom: 0,
    priceTo: undefined,
    unitSize: undefined,
    yardSize: undefined,
    availableUnits: 0,
    floorPlanImages: [],
    configDescription: '',
    virtualTourLink: '',
    galleryImages: [],
  });

  const handleAddUnit = () => {
    if (!newUnit.label || newUnit.priceFrom <= 0) {
      toast.error('Please provide a label and price');
      return;
    }

    addUnitType(newUnit);

    // Reset form but keep ownership and structural type
    setNewUnit({
      ownershipType: newUnit.ownershipType,
      structuralType: newUnit.structuralType,
      bedrooms: newUnit.bedrooms + 1,
      bathrooms: newUnit.bathrooms,
      floors: newUnit.floors,
      label: '',
      priceFrom: 0,
      priceTo: undefined,
      unitSize: undefined,
      yardSize: undefined,
      availableUnits: 0,
      floorPlanImages: [],
      configDescription: '',
      virtualTourLink: '',
      galleryImages: [],
    });

    toast.success('Unit configuration added');
  };

  const getOwnershipLabel = (type: UnitType['ownershipType']) => {
    const labels = {
      'full-title': 'Full Title',
      'sectional-title': 'Sectional Title',
      leasehold: 'Leasehold',
      'life-rights': 'Life Rights',
    };
    return labels[type];
  };

  const getStructuralLabel = (type: UnitType['structuralType']) => {
    const labels = {
      apartment: 'Apartment',
      'freestanding-house': 'Freestanding House',
      simplex: 'Simplex',
      duplex: 'Duplex',
      penthouse: 'Penthouse',
      'plot-and-plan': 'Plot & Plan',
      townhouse: 'Townhouse',
      studio: 'Studio',
    };
    return labels[type];
  };

  const isFreestanding = (type: UnitType['structuralType']) => {
    return type === 'freestanding-house' || type === 'townhouse' || type === 'plot-and-plan';
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-bold text-slate-800">Unit Configurations</h3>
        </div>
        <p className="text-slate-600 mb-6">
          Configure the different unit types available in your development with ownership,
          structure, and pricing details
        </p>

        {/* Existing Unit Configurations */}
        {unitTypes.length > 0 && (
          <div className="space-y-4 mb-8">
            <Label className="text-slate-700 font-semibold">
              Configured Unit Types ({unitTypes.length})
            </Label>
            {unitTypes.map(unit => (
              <Card
                key={unit.id}
                className="p-5 border-slate-200 hover:border-blue-300 transition-colors bg-gradient-to-br from-white to-slate-50/50"
              >
                <div className="flex items-start gap-4">
                  <GripVertical className="h-5 w-5 text-slate-400 cursor-move mt-2 flex-shrink-0" />

                  <div className="flex-1 space-y-4">
                    {/* Header with badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        {getOwnershipLabel(unit.ownershipType)}
                      </span>
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                        {getStructuralLabel(unit.structuralType)}
                      </span>
                      {unit.floors && (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                          {unit.floors.replace('-', ' ')}
                        </span>
                      )}
                    </div>

                    {/* Row 1: Ownership & Structural Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Ownership Type</Label>
                        <Select
                          value={unit.ownershipType}
                          onValueChange={value =>
                            updateUnitType(unit.id, {
                              ownershipType: value as UnitType['ownershipType'],
                            })
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full-title">🏡 Full Title</SelectItem>
                            <SelectItem value="sectional-title">🏢 Sectional Title</SelectItem>
                            <SelectItem value="leasehold">📋 Leasehold</SelectItem>
                            <SelectItem value="life-rights">💎 Life Rights</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Structural Type</Label>
                        <Select
                          value={unit.structuralType}
                          onValueChange={value =>
                            updateUnitType(unit.id, {
                              structuralType: value as UnitType['structuralType'],
                            })
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="apartment">🏢 Apartment</SelectItem>
                            <SelectItem value="freestanding-house">
                              🏡 Freestanding House
                            </SelectItem>
                            <SelectItem value="townhouse">🏘️ Townhouse</SelectItem>
                            <SelectItem value="simplex">🏠 Simplex</SelectItem>
                            <SelectItem value="duplex">🏚️ Duplex</SelectItem>
                            <SelectItem value="penthouse">✨ Penthouse</SelectItem>
                            <SelectItem value="plot-and-plan">📐 Plot & Plan</SelectItem>
                            <SelectItem value="studio">🎨 Studio</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Row 2: Bedrooms, Bathrooms, Floors */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Bedrooms</Label>
                        <Input
                          type="number"
                          min="0"
                          value={unit.bedrooms}
                          onChange={e =>
                            updateUnitType(unit.id, { bedrooms: parseInt(e.target.value) || 0 })
                          }
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Bathrooms</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={unit.bathrooms}
                          onChange={e =>
                            updateUnitType(unit.id, { bathrooms: parseFloat(e.target.value) || 0 })
                          }
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Floors</Label>
                        <Select
                          value={unit.floors || ''}
                          onValueChange={value =>
                            updateUnitType(unit.id, {
                              floors: (value as UnitType['floors']) || undefined,
                            })
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single-storey">Single Storey</SelectItem>
                            <SelectItem value="double-storey">Double Storey</SelectItem>
                            <SelectItem value="triplex">Triplex</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Row 3: Label & Pricing */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Unit Label</Label>
                        <Input
                          placeholder="e.g., Type 2A, The Ebony"
                          value={unit.label}
                          onChange={e => updateUnitType(unit.id, { label: e.target.value })}
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Price From (R)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={unit.priceFrom}
                          onChange={e =>
                            updateUnitType(unit.id, { priceFrom: parseFloat(e.target.value) || 0 })
                          }
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Price To (R) - Optional</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="For price range"
                          value={unit.priceTo || ''}
                          onChange={e => {
                            const val = parseFloat(e.target.value);
                            updateUnitType(unit.id, { priceTo: isNaN(val) ? undefined : val });
                          }}
                          className="h-9"
                        />
                      </div>
                    </div>

                    {/* Row 4: Sizes & Available Units */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Unit Size (m²)</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Internal area"
                          value={unit.unitSize || ''}
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            updateUnitType(unit.id, { unitSize: isNaN(val) ? undefined : val });
                          }}
                          className="h-9"
                        />
                      </div>

                      {isFreestanding(unit.structuralType) && (
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">Yard/Garden (m²)</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Outdoor space"
                            value={unit.yardSize || ''}
                            onChange={e => {
                              const val = parseInt(e.target.value);
                              updateUnitType(unit.id, { yardSize: isNaN(val) ? undefined : val });
                            }}
                            className="h-9"
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Available Units</Label>
                        <Input
                          type="number"
                          min="0"
                          value={unit.availableUnits}
                          onChange={e =>
                            updateUnitType(unit.id, {
                              availableUnits: parseInt(e.target.value) || 0,
                            })
                          }
                          className="h-9"
                        />
                      </div>
                    </div>

                    {/* Row 5: Description & Virtual Tour */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">
                          Configuration Description (Optional)
                        </Label>
                        <Textarea
                          placeholder="e.g., Spacious 2-bedroom unit ideal for young families..."
                          value={unit.configDescription || ''}
                          onChange={e =>
                            updateUnitType(unit.id, { configDescription: e.target.value })
                          }
                          className="h-20 resize-none text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">
                          Virtual Tour Link (Optional)
                        </Label>
                        <Input
                          placeholder="Matterport, YouTube, Vimeo URL"
                          value={unit.virtualTourLink || ''}
                          onChange={e =>
                            updateUnitType(unit.id, { virtualTourLink: e.target.value })
                          }
                          className="h-9"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Floor plan uploads available in Media step
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeUnitType(unit.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Summary Footer */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
                    <span className="font-medium text-slate-900">
                      {unit.label || 'Unnamed Config'}
                    </span>
                    <span>•</span>
                    <span>
                      {unit.bedrooms} Bed • {unit.bathrooms} Bath
                    </span>
                    {unit.unitSize && (
                      <>
                        <span>•</span>
                        <span>{unit.unitSize}m²</span>
                      </>
                    )}
                    <span>•</span>
                    <span className="font-semibold text-blue-600">
                      R{unit.priceFrom.toLocaleString()}
                      {unit.priceTo && ` - R${unit.priceTo.toLocaleString()}`}
                    </span>
                    <span>•</span>
                    <span>{unit.availableUnits} units</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Add New Unit Configuration */}
        <div className="p-6 border-2 border-dashed border-slate-300 bg-slate-50/50 rounded-xl">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add New Unit Configuration
          </h3>

          <div className="space-y-4">
            {/* Row 1: Ownership & Structural Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-ownership">
                  Ownership Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={newUnit.ownershipType}
                  onValueChange={value =>
                    setNewUnit({ ...newUnit, ownershipType: value as UnitType['ownershipType'] })
                  }
                >
                  <SelectTrigger id="new-ownership">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-title">
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        <span>Full Title</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="sectional-title">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span>Sectional Title</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="leasehold">
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        <span>Leasehold</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="life-rights">
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        <span>Life Rights</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-structural">
                  Structural Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={newUnit.structuralType}
                  onValueChange={value =>
                    setNewUnit({ ...newUnit, structuralType: value as UnitType['structuralType'] })
                  }
                >
                  <SelectTrigger id="new-structural">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartment">🏢 Apartment</SelectItem>
                    <SelectItem value="freestanding-house">🏡 Freestanding House</SelectItem>
                    <SelectItem value="townhouse">🏘️ Townhouse</SelectItem>
                    <SelectItem value="simplex">🏠 Simplex</SelectItem>
                    <SelectItem value="duplex">🏚️ Duplex</SelectItem>
                    <SelectItem value="penthouse">✨ Penthouse</SelectItem>
                    <SelectItem value="plot-and-plan">📐 Plot & Plan</SelectItem>
                    <SelectItem value="studio">🎨 Studio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Bedrooms, Bathrooms, Floors */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-bedrooms">
                  Bedrooms <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="new-bedrooms"
                  type="number"
                  min="0"
                  value={newUnit.bedrooms}
                  onChange={e =>
                    setNewUnit({ ...newUnit, bedrooms: parseInt(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-bathrooms">
                  Bathrooms <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="new-bathrooms"
                  type="number"
                  min="0"
                  step="0.5"
                  value={newUnit.bathrooms}
                  onChange={e =>
                    setNewUnit({ ...newUnit, bathrooms: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-floors">Floors (Optional)</Label>
                <Select
                  value={newUnit.floors || ''}
                  onValueChange={value =>
                    setNewUnit({ ...newUnit, floors: (value as UnitType['floors']) || undefined })
                  }
                >
                  <SelectTrigger id="new-floors">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single-storey">Single Storey</SelectItem>
                    <SelectItem value="double-storey">Double Storey</SelectItem>
                    <SelectItem value="triplex">Triplex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: Label & Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-label">
                  Unit Label <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="new-label"
                  placeholder="e.g., Type 2A, The Ebony, 2 Bed Apartments"
                  value={newUnit.label}
                  onChange={e => setNewUnit({ ...newUnit, label: e.target.value })}
                />
                <p className="text-xs text-slate-500">Internal naming for this configuration</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-price-from">
                  Price From (R) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="new-price-from"
                  type="number"
                  min="0"
                  placeholder="e.g., 1500000"
                  value={newUnit.priceFrom || ''}
                  onChange={e =>
                    setNewUnit({ ...newUnit, priceFrom: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-price-to">Price To (R) - Optional</Label>
                <Input
                  id="new-price-to"
                  type="number"
                  min="0"
                  placeholder="e.g., 1800000"
                  value={newUnit.priceTo || ''}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setNewUnit({ ...newUnit, priceTo: isNaN(val) ? undefined : val });
                  }}
                />
                <p className="text-xs text-slate-500">For displaying price ranges</p>
              </div>
            </div>

            {/* Row 4: Sizes & Available Units */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-unit-size">Unit Size (m²)</Label>
                <Input
                  id="new-unit-size"
                  type="number"
                  min="0"
                  placeholder="e.g., 85"
                  value={newUnit.unitSize || ''}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    setNewUnit({ ...newUnit, unitSize: isNaN(val) ? undefined : val });
                  }}
                />
                <p className="text-xs text-slate-500">Internal living area</p>
              </div>

              {isFreestanding(newUnit.structuralType) && (
                <div className="space-y-2">
                  <Label htmlFor="new-yard-size">Yard/Garden Size (m²)</Label>
                  <Input
                    id="new-yard-size"
                    type="number"
                    min="0"
                    placeholder="e.g., 250"
                    value={newUnit.yardSize || ''}
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      setNewUnit({ ...newUnit, yardSize: isNaN(val) ? undefined : val });
                    }}
                  />
                  <p className="text-xs text-slate-500">Outdoor space size</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="new-available">
                  Available Units <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="new-available"
                  type="number"
                  min="0"
                  placeholder="e.g., 12"
                  value={newUnit.availableUnits || ''}
                  onChange={e =>
                    setNewUnit({ ...newUnit, availableUnits: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            {/* Row 5: Description & Virtual Tour */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-description">Configuration Description (Optional)</Label>
                <Textarea
                  id="new-description"
                  placeholder="e.g., A spacious 2-bedroom unit ideal for young families. Includes an open-plan kitchen and private garden."
                  value={newUnit.configDescription || ''}
                  onChange={e => setNewUnit({ ...newUnit, configDescription: e.target.value })}
                  className="h-24 resize-none"
                />
                <p className="text-xs text-slate-500">
                  Brief description to help buyers understand this configuration
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-virtual-tour">Virtual Tour Link (Optional)</Label>
                <Input
                  id="new-virtual-tour"
                  placeholder="https://my.matterport.com/... or YouTube link"
                  value={newUnit.virtualTourLink || ''}
                  onChange={e => setNewUnit({ ...newUnit, virtualTourLink: e.target.value })}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Matterport, YouTube, or Vimeo virtual tour link
                </p>
                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-900">
                    <strong>Note:</strong> Floor plan images can be uploaded in the Media step
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={handleAddUnit}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
            disabled={!newUnit.label || newUnit.priceFrom <= 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Unit Configuration
          </Button>
        </div>

        {unitTypes.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-lg border border-slate-200 mt-6">
            <Layers className="w-12 h-12 mx-auto mb-3 text-slate-400" />
            <p className="font-medium">No unit configurations added yet</p>
            <p className="mt-1">Add at least one unit configuration to continue</p>
          </div>
        )}
      </Card>

      <div className="flex items-start gap-2 text-sm text-slate-500 px-2 bg-blue-50 p-4 rounded-lg border border-blue-100">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
        <div>
          <p className="font-medium text-blue-900 mb-1">Professional Configuration Tips:</p>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>
              • <strong>Label:</strong> Use clear naming like "Type 2A", "The Ebony", or "2 Bed
              Luxury Apartments"
            </li>
            <li>
              • <strong>Price Range:</strong> If units vary (e.g., floor level), set both From & To
              prices
            </li>
            <li>
              • <strong>Description:</strong> Highlight who it's ideal for and unique features
            </li>
            <li>
              • <strong>Virtual Tours:</strong> Significantly increase conversion rates
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
