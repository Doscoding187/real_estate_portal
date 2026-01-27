import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, X, Package } from 'lucide-react';
import type { UnitType } from '@/hooks/useDevelopmentWizard';

interface ExtrasTabProps {
  formData: Partial<UnitType>;
  updateFormData: (updates: Partial<UnitType>) => void;
}

interface UpgradePack {
  id: string;
  name: string;
  description: string;
  price?: number;
}

export function ExtrasTab({ formData, updateFormData }: ExtrasTabProps) {
  const [upgradePacks, setUpgradePacks] = useState<UpgradePack[]>(formData.upgradePacks || []);

  const addUpgradePack = () => {
    const newPack: UpgradePack = {
      id: `upgrade-${Date.now()}`,
      name: '',
      description: '',
      price: undefined,
    };
    const updated = [...upgradePacks, newPack];
    setUpgradePacks(updated);
    updateFormData({ upgradePacks: updated });
  };

  const updateUpgradePack = (id: string, field: keyof UpgradePack, value: any) => {
    const updated = upgradePacks.map(pack => (pack.id === id ? { ...pack, [field]: value } : pack));
    setUpgradePacks(updated);
    updateFormData({ upgradePacks: updated });
  };

  const removeUpgradePack = (id: string) => {
    const updated = upgradePacks.filter(pack => pack.id !== id);
    setUpgradePacks(updated);
    updateFormData({ upgradePacks: updated });
  };

  return (
    <div className="space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <p className="text-sm text-purple-900">
          <strong>Optional Extras & Upgrade Packs:</strong> Add upgrades and optional features that
          buyers can add to this unit type. These will appear as add-on options in the public
          listing.
        </p>
      </div>

      {/* Upgrade Packs List */}
      <div className="space-y-4">
        {upgradePacks.map((pack, index) => (
          <Card
            key={pack.id}
            className="p-6 bg-gradient-to-br from-white to-slate-50 border-slate-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-600" />
                <h4 className="font-semibold text-slate-900">Upgrade Pack #{index + 1}</h4>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeUpgradePack(pack.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor={`pack-name-${pack.id}`} className="text-sm font-medium">
                  Upgrade Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`pack-name-${pack.id}`}
                  placeholder="e.g., Solar Upgrade, Premium Kitchen Pack"
                  value={pack.name}
                  onChange={e => updateUpgradePack(pack.id, 'name', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor={`pack-description-${pack.id}`} className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id={`pack-description-${pack.id}`}
                  placeholder="Describe what's included in this upgrade..."
                  value={pack.description}
                  onChange={e => updateUpgradePack(pack.id, 'description', e.target.value)}
                  className="mt-1 h-20"
                />
              </div>

              <div>
                <Label htmlFor={`pack-price-${pack.id}`} className="text-sm font-medium">
                  Price (R) - Optional
                </Label>
                <Input
                  id={`pack-price-${pack.id}`}
                  type="number"
                  min="0"
                  placeholder="e.g., 18000"
                  value={pack.price || ''}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    updateUpgradePack(pack.id, 'price', isNaN(val) ? undefined : val);
                  }}
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Leave empty if price varies or is on request
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add New Upgrade Pack Button */}
      <Button
        variant="outline"
        onClick={addUpgradePack}
        className="w-full border-dashed border-2 border-purple-300 hover:border-purple-400 hover:bg-purple-50"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Upgrade Pack
      </Button>

      {/* Examples Card */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-white border-blue-200">
        <h4 className="font-semibold text-slate-900 mb-3">Example Upgrade Packs:</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center p-2 bg-white rounded border border-slate-200">
            <div>
              <p className="font-medium text-slate-900">Solar Upgrade</p>
              <p className="text-xs text-slate-600">5kW solar system with inverter</p>
            </div>
            <span className="text-green-600 font-semibold">+ R18,000</span>
          </div>

          <div className="flex justify-between items-center p-2 bg-white rounded border border-slate-200">
            <div>
              <p className="font-medium text-slate-900">Premium Kitchen Pack</p>
              <p className="text-xs text-slate-600">Upgraded appliances and finishes</p>
            </div>
            <span className="text-green-600 font-semibold">+ R12,000</span>
          </div>

          <div className="flex justify-between items-center p-2 bg-white rounded border border-slate-200">
            <div>
              <p className="font-medium text-slate-900">Double Carport</p>
              <p className="text-xs text-slate-600">Additional covered parking bay</p>
            </div>
            <span className="text-green-600 font-semibold">+ R30,000</span>
          </div>

          <div className="flex justify-between items-center p-2 bg-white rounded border border-slate-200">
            <div>
              <p className="font-medium text-slate-900">Patio Tiling Option</p>
              <p className="text-xs text-slate-600">Tiled outdoor entertainment area</p>
            </div>
            <span className="text-green-600 font-semibold">+ R4,500</span>
          </div>
        </div>
      </Card>

      {/* Summary */}
      {upgradePacks.length > 0 && (
        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Total Upgrade Packs:</span>
            <span className="font-semibold text-slate-900">{upgradePacks.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-slate-600">Total Optional Value:</span>
            <span className="font-semibold text-green-600">
              R{upgradePacks.reduce((sum, pack) => sum + (pack.price || 0), 0).toLocaleString()}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
