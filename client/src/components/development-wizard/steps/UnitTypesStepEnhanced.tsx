import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Layers, Info } from 'lucide-react';
import { useDevelopmentWizard, type UnitType } from '@/hooks/useDevelopmentWizard';
import { UnitTypeCard } from '../unit-types/UnitTypeCard';
import { UnitTypeModal } from '../unit-types/UnitTypeModal';
import { toast } from 'sonner';

export function UnitTypesStepEnhanced() {
  const { unitTypes, addUnitType, updateUnitType, removeUnitType } = useDevelopmentWizard();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitType | null>(null);

  // Master specifications (would come from previous step in real implementation)
  const masterSpecs = {
    kitchenType: 'Standard',
    countertops: 'Granite',
    flooring: 'Ceramic Tile',
    bathroomFinish: 'Standard',
    geyser: 'Solar',
    electricity: 'Prepaid',
    security: 'Estate Access Control',
  };

  const handleAddNew = () => {
    setEditingUnit(null);
    setModalOpen(true);
  };

  const handleEdit = (unit: UnitType) => {
    setEditingUnit(unit);
    setModalOpen(true);
  };

  const handleDuplicate = (unit: UnitType) => {
    const duplicated = {
      ...unit,
      id: `unit-${Date.now()}`,
      label: `${unit.label} (Copy)`,
    };
    addUnitType(duplicated);
    toast.success('Unit type duplicated successfully');
  };

  const handleDelete = (unitId: string) => {
    if (confirm('Are you sure you want to delete this unit type?')) {
      removeUnitType(unitId);
      toast.success('Unit type deleted');
    }
  };

  const handleSave = (unitData: Partial<UnitType>) => {
    if (editingUnit) {
      updateUnitType(editingUnit.id, unitData);
      toast.success('Unit type updated successfully');
    } else {
      const newUnit: UnitType = {
        ...unitData,
        id: `unit-${Date.now()}`,
      } as UnitType;
      addUnitType(newUnit);
      toast.success('Unit type added successfully');
    }
    setModalOpen(false);
    setEditingUnit(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 bg-blue-600 rounded-xl">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Unit Types & Configurations</h2>
            <p className="text-slate-600">
              Define the different unit types available in your development
            </p>
          </div>
        </div>
      </Card>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold mb-1">How Unit Types Work:</p>
          <ul className="list-disc list-inside space-y-1 text-blue-800">
            <li>Each unit type represents a distinct configuration (e.g., 2-bed apartment, 3-bed townhouse)</li>
            <li>Specifications inherit from master development settings by default</li>
            <li>Override specific specs where units differ from the master</li>
            <li>Add unit-specific media, pricing, and optional upgrades</li>
          </ul>
        </div>
      </div>

      {/* Unit Type Cards Grid */}
      {unitTypes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Configured Unit Types ({unitTypes.length})
            </h3>
            <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Unit Type
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unitTypes.map(unit => (
              <UnitTypeCard
                key={unit.id}
                unitType={unit}
                onEdit={() => handleEdit(unit)}
                onDuplicate={() => handleDuplicate(unit)}
                onDelete={() => handleDelete(unit.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {unitTypes.length === 0 && (
        <Card className="p-12 text-center border-2 border-dashed border-slate-300">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Unit Types Yet</h3>
            <p className="text-slate-600 mb-6">
              Start by adding your first unit type configuration. You can add multiple unit types
              with different specifications, pricing, and features.
            </p>
            <Button onClick={handleAddNew} size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Unit Type
            </Button>
          </div>
        </Card>
      )}

      {/* Quick Stats */}
      {unitTypes.length > 0 && (
        <Card className="p-6 bg-gradient-to-br from-slate-50 to-white">
          <h4 className="font-semibold text-slate-900 mb-4">Quick Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-slate-600">Total Unit Types</p>
              <p className="text-2xl font-bold text-blue-600">{unitTypes.length}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Units</p>
              <p className="text-2xl font-bold text-green-600">
                {unitTypes.reduce((sum, unit) => sum + (unit.availableUnits || 0), 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Price Range</p>
              <p className="text-2xl font-bold text-purple-600">
                R{Math.min(...unitTypes.map(u => u.priceFrom)).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Highest Price</p>
              <p className="text-2xl font-bold text-orange-600">
                R
                {Math.max(
                  ...unitTypes.map(u => u.priceTo || u.priceFrom)
                ).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Unit Type Modal */}
      <UnitTypeModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingUnit(null);
        }}
        unitType={editingUnit}
        onSave={handleSave}
        masterSpecs={masterSpecs}
        classification={useDevelopmentWizard.getState().classification}
      />
    </div>
  );
}
