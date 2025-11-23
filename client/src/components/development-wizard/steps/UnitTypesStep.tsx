import { useDevelopmentWizard, type UnitType } from '@/hooks/useDevelopmentWizard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, GripVertical, Layers, DollarSign } from 'lucide-react';
import { useState } from 'react';

export function UnitTypesStep() {
  const { unitTypes, addUnitType, updateUnitType, removeUnitType } = useDevelopmentWizard();
  
  const [newUnit, setNewUnit] = useState({
    bedrooms: 2,
    label: '',
    priceFrom: 0,
    availableUnits: 0,
  });

  const handleAddUnit = () => {
    if (newUnit.label && newUnit.priceFrom > 0) {
      addUnitType(newUnit);
      setNewUnit({
        bedrooms: newUnit.bedrooms + 1,
        label: '',
        priceFrom: 0,
        availableUnits: 0,
      });
    }
  };

  const formatPrice = (value: string) => {
    const number = parseFloat(value.replace(/[^0-9.]/g, ''));
    return isNaN(number) ? 0 : number;
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
                <div className="flex items-center gap-4">
                  <GripVertical className="h-5 w-5 text-slate-400 cursor-move" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Bedrooms</Label>
                      <Input
                        type="number"
                        min="0"
                        value={unit.bedrooms}
                        onChange={(e) =>
                          updateUnitType(unit.id, { bedrooms: parseInt(e.target.value) })
                        }
                        className="h-9"
                      />
                    </div>

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
                        onChange={(e) =>
                          updateUnitType(unit.id, { priceFrom: parseFloat(e.target.value) })
                        }
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Available Units</Label>
                      <Input
                        type="number"
                        min="0"
                        value={unit.availableUnits}
                        onChange={(e) =>
                          updateUnitType(unit.id, { availableUnits: parseInt(e.target.value) })
                        }
                        className="h-9"
                      />
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeUnitType(unit.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-2 text-sm text-slate-600 pl-9">
                  From{' '}
                  <span className="font-semibold text-slate-900">
                    R{unit.priceFrom.toLocaleString()}
                  </span>
                  {' '}- {unit.availableUnits} units available
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

          <Button 
            onClick={handleAddUnit} 
            className="w-full bg-blue-600 hover:bg-blue-700" 
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
