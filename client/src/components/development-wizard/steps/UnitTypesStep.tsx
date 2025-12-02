import { useDevelopmentWizard, type UnitType } from '@/hooks/useDevelopmentWizard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, GripVertical, Layers, DollarSign, Home, Building2 } from 'lucide-react';
import { useState } from 'react';

export function UnitTypesStep() {
  const { unitTypes, addUnitType, updateUnitType, removeUnitType } = useDevelopmentWizard();
  
  const [newUnit, setNewUnit] = useState<Omit<UnitType, 'id'>>({
    propertyType: 'apartment',
    bedrooms: 2,
    label: '',
    priceFrom: 0,
    availableUnits: 0,
    unitSize: undefined,
    yardSize: undefined,
  });

  const handleAddUnit = () => {
    if (newUnit.label && newUnit.priceFrom > 0) {
      addUnitType(newUnit);
      setNewUnit({
        propertyType: newUnit.propertyType,
        bedrooms: newUnit.bedrooms + 1,
        label: '',
        priceFrom: 0,
        availableUnits: 0,
        unitSize: undefined,
        yardSize: undefined,
      });
    }
  };

  const formatPrice = (value: string) => {
    const number = parseFloat(value.replace(/[^0-9.]/g, ''));
    return isNaN(number) ? 0 : number;
  };

  const getPropertyTypeLabel = (type: UnitType['propertyType']) => {
    const labels = {
      'full-title-house': 'Full Title House',
      'apartment': 'Apartment',
      'leasehold': 'Leasehold',
      'penthouse': 'Luxury Penthouse',
      'simplex': 'Simplex',
      'duplex': 'Duplex',
    };
    return labels[type];
  };

  const isFreestanding = (type: UnitType['propertyType']) => {
    return type === 'full-title-house' || type === 'leasehold';
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-bold text-slate-800">Unit Types & Pricing</h3>
        </div>
        <p className="text-slate-600 mb-6">Add the different unit types available in your development</p>

        {/* Existing Unit Types */}
        {unitTypes.length > 0 && (
          <div className="space-y-3 mb-8">
            <Label className="text-slate-700 font-semibold">Configured Unit Types</Label>
            {unitTypes.map((unit) => (
              <Card key={unit.id} className="p-4 border-slate-200 hover:border-blue-300 transition-colors">
                <div className="flex items-start gap-4">
                  <GripVertical className="h-5 w-5 text-slate-400 cursor-move mt-2" />
                  
                  <div className="flex-1 space-y-4">
                    {/* Row 1: Property Type and Bedrooms */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Property Type</Label>
                        <Select
                          value={unit.propertyType}
                          onValueChange={(value) => updateUnitType(unit.id, { propertyType: value as UnitType['propertyType'] })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full-title-house">🏡 Full Title House</SelectItem>
                            <SelectItem value="apartment">🏢 Apartment</SelectItem>
                            <SelectItem value="leasehold">📋 Leasehold</SelectItem>
                            <SelectItem value="penthouse">✨ Luxury Penthouse</SelectItem>
                            <SelectItem value="simplex">🏠 Simplex</SelectItem>
                            <SelectItem value="duplex">🏘️ Duplex</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Bedrooms</Label>
                        <Input
                          type="number"
                          min="0"
                          value={unit.bedrooms}
                          onChange={(e) => updateUnitType(unit.id, { bedrooms: parseInt(e.target.value) })}
                          className="h-9"
                        />
                      </div>
                    </div>

                    {/* Row 2: Label and Price */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Label</Label>
                        <Input
                          placeholder="e.g., 2 Bed Apartments"
                          value={unit.label}
                          onChange={(e) => updateUnitType(unit.id, { label: e.target.value })}
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Price From (R)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={unit.priceFrom}
                          onChange={(e) => updateUnitType(unit.id, { priceFrom: parseFloat(e.target.value) })}
                          className="h-9"
                        />
                      </div>
                    </div>

                    {/* Row 3: Size fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Available Units</Label>
                        <Input
                          type="number"
                          min="0"
                          value={unit.availableUnits}
                          onChange={(e) => updateUnitType(unit.id, { availableUnits: parseInt(e.target.value) })}
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Unit Size (m²)</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="e.g., 120"
                          value={unit.unitSize || ''}
                          onChange={(e) => updateUnitType(unit.id, { unitSize: parseInt(e.target.value) || undefined })}
                          className="h-9"
                        />
                      </div>

                      {isFreestanding(unit.propertyType) && (
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">Yard Size (m²)</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="e.g., 250"
                            value={unit.yardSize || ''}
                            onChange={(e) => updateUnitType(unit.id, { yardSize: parseInt(e.target.value) || undefined })}
                            className="h-9"
                          />
                        </div>
                      )}
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

                <div className="mt-3 text-sm text-slate-600 pl-9 flex items-center gap-4">
                  <span className="font-medium text-blue-600">{getPropertyTypeLabel(unit.propertyType)}</span>
                  <span>•</span>
                  <span>
                    From <span className="font-semibold text-slate-900">R{unit.priceFrom.toLocaleString()}</span>
                  </span>
                  <span>•</span>
                  <span>{unit.availableUnits} units available</span>
                  {unit.unitSize && (
                    <>
                      <span>•</span>
                      <span>{unit.unitSize}m²</span>
                    </>
                  )}
                  {unit.yardSize && (
                    <>
                      <span>•</span>
                      <span>Yard: {unit.yardSize}m²</span>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Add New Unit Type */}
        <div className="p-6 border-2 border-dashed border-slate-300 bg-slate-50/50 rounded-xl">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add New Unit Type
          </h3>
          
          <div className="space-y-4">
            {/* Property Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="new-property-type">
                Property Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={newUnit.propertyType}
                onValueChange={(value) =>
                  setNewUnit({ ...newUnit, propertyType: value as UnitType['propertyType'] })
                }
              >
                <SelectTrigger id="new-property-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-title-house">
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4" />
                      <span>Full Title House (Freestanding)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="apartment">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      <span>Apartment</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="leasehold">
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4" />
                      <span>Leasehold (Freestanding)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="penthouse">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      <span>Luxury Penthouse</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="simplex">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      <span>Simplex</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="duplex">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      <span>Duplex</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                Select the type of property available in this development
              </p>
            </div>

            {/* Row 1: Bedrooms and Label */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-bedrooms">Bedrooms</Label>
                <Input
                  id="new-bedrooms"
                  type="number"
                  min="0"
                  value={newUnit.bedrooms}
                  onChange={(e) =>
                    setNewUnit({ ...newUnit, bedrooms: parseInt(e.target.value) })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-label">
                  Label <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="new-label"
                  placeholder="e.g., 2 Bed Apartments"
                  value={newUnit.label}
                  onChange={(e) => setNewUnit({ ...newUnit, label: e.target.value })}
                />
              </div>
            </div>

            {/* Row 2: Price and Available Units */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-price">
                  Price From (R) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="new-price"
                    type="number"
                    min="0"
                    placeholder="e.g., 1500000"
                    value={newUnit.priceFrom || ''}
                    onChange={(e) =>
                      setNewUnit({ ...newUnit, priceFrom: parseFloat(e.target.value) || 0 })
                    }
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-units">Available Units</Label>
                <Input
                  id="new-units"
                  type="number"
                  min="0"
                  placeholder="e.g., 24"
                  value={newUnit.availableUnits || ''}
                  onChange={(e) =>
                    setNewUnit({ ...newUnit, availableUnits: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            {/* Row 3: Size Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-unit-size">Unit Size (m²)</Label>
                <Input
                  id="new-unit-size"
                  type="number"
                  min="0"
                  placeholder="e.g., 120"
                  value={newUnit.unitSize || ''}
                  onChange={(e) =>
                    setNewUnit({ ...newUnit, unitSize: parseInt(e.target.value) || undefined })
                  }
                />
                <p className="text-xs text-slate-500">Internal size of the unit</p>
              </div>

              {isFreestanding(newUnit.propertyType) && (
                <div className="space-y-2">
                  <Label htmlFor="new-yard-size">Yard/Garden Size (m²)</Label>
                  <Input
                    id="new-yard-size"
                    type="number"
                    min="0"
                    placeholder="e.g., 250"
                    value={newUnit.yardSize || ''}
                    onChange={(e) =>
                      setNewUnit({ ...newUnit, yardSize: parseInt(e.target.value) || undefined })
                    }
                  />
                  <p className="text-xs text-slate-500">Available for freestanding properties</p>
                </div>
              )}
            </div>
          </div>

          <Button 
            onClick={handleAddUnit} 
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700" 
            disabled={!newUnit.label || newUnit.priceFrom <= 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Unit Type
          </Button>
        </div>

        {unitTypes.length === 0 && (
          <div className="text-center py-4 text-slate-500 text-sm">
            <p>No unit types added yet. Add at least one unit type to continue.</p>
          </div>
        )}
      </Card>

      <div className="flex items-center gap-2 text-sm text-slate-500 px-2">
        <Layers className="w-4 h-4" />
        <p>Add all the unit types available in your development (e.g., 1 Bed, 2 Bed, 3 Bed, etc.)</p>
      </div>
    </div>
  );
}
