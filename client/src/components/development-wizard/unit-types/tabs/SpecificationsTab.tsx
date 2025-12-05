import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X, Info } from 'lucide-react';
import type { UnitType } from '@/hooks/useDevelopmentWizard';

interface SpecificationsTabProps {
  formData: Partial<UnitType>;
  updateFormData: (updates: Partial<UnitType>) => void;
  masterSpecs: Record<string, any>;
}

interface CustomSpec {
  name: string;
  value: string;
}

export function SpecificationsTab({
  formData,
  updateFormData,
  masterSpecs,
}: SpecificationsTabProps) {
  const [customSpecs, setCustomSpecs] = useState<CustomSpec[]>(
    formData.customSpecs || []
  );

  // Specification override toggles
  const [overrides, setOverrides] = useState<Record<string, boolean>>({
    kitchen: false,
    countertops: false,
    flooring: false,
    bathroom: false,
    geyser: false,
    electricity: false,
    security: false,
    ...formData.specOverrides,
  });

  const handleOverrideToggle = (spec: string, enabled: boolean) => {
    setOverrides(prev => ({ ...prev, [spec]: enabled }));
    updateFormData({
      specOverrides: { ...overrides, [spec]: enabled },
    });
  };

  const addCustomSpec = () => {
    const newSpecs = [...customSpecs, { name: '', value: '' }];
    setCustomSpecs(newSpecs);
    updateFormData({ customSpecs: newSpecs });
  };

  const updateCustomSpec = (index: number, field: 'name' | 'value', value: string) => {
    const newSpecs = [...customSpecs];
    newSpecs[index][field] = value;
    setCustomSpecs(newSpecs);
    updateFormData({ customSpecs: newSpecs });
  };

  const removeCustomSpec = (index: number) => {
    const newSpecs = customSpecs.filter((_, i) => i !== index);
    setCustomSpecs(newSpecs);
    updateFormData({ customSpecs: newSpecs });
  };

  return (
    <div className="space-y-6">
      {/* Section A: Inherited Master Specifications */}
      <Card className="p-6 bg-gradient-to-br from-slate-50 to-white border-slate-300">
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">
            Inherited from Development Settings
          </h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <span className="text-slate-600">Kitchen Type:</span>
            <span className="font-medium">{masterSpecs.kitchenType || 'Standard'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="text-slate-600">Countertops:</span>
            <span className="font-medium">{masterSpecs.countertops || 'Granite'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="text-slate-600">Flooring:</span>
            <span className="font-medium">{masterSpecs.flooring || 'Ceramic Tile'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="text-slate-600">Bathroom Finish:</span>
            <span className="font-medium">{masterSpecs.bathroomFinish || 'Standard'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="text-slate-600">Geyser:</span>
            <span className="font-medium">{masterSpecs.geyser || 'Solar'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="text-slate-600">Electricity:</span>
            <span className="font-medium">{masterSpecs.electricity || 'Prepaid'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="text-slate-600">Security:</span>
            <span className="font-medium">{masterSpecs.security || 'Estate Access Control'}</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4">
          These specifications are inherited from the master development. Toggle overrides below to
          customize for this unit type.
        </p>
      </Card>

      {/* Section B: Overrides */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Unit-Specific Overrides</h3>
        <p className="text-sm text-slate-600 mb-4">
          Enable overrides to customize specifications for this unit type
        </p>

        <div className="space-y-4">
          {/* Kitchen Finish Override */}
          <div className="border-b pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                checked={overrides.kitchen}
                onCheckedChange={checked => handleOverrideToggle('kitchen', checked as boolean)}
              />
              <Label className="font-medium">Override Kitchen Finish</Label>
            </div>
            {overrides.kitchen && (
              <Select
                value={formData.kitchenFinish || ''}
                onValueChange={value => updateFormData({ kitchenFinish: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select kitchen finish" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="luxury">Luxury</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Countertop Material Override */}
          <div className="border-b pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                checked={overrides.countertops}
                onCheckedChange={checked => handleOverrideToggle('countertops', checked as boolean)}
              />
              <Label className="font-medium">Override Countertop Material</Label>
            </div>
            {overrides.countertops && (
              <Input
                placeholder="e.g., Quartz, Marble, Granite"
                value={formData.countertopMaterial || ''}
                onChange={e => updateFormData({ countertopMaterial: e.target.value })}
                className="mt-2"
              />
            )}
          </div>

          {/* Flooring Type Override */}
          <div className="border-b pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                checked={overrides.flooring}
                onCheckedChange={checked => handleOverrideToggle('flooring', checked as boolean)}
              />
              <Label className="font-medium">Override Flooring Type</Label>
            </div>
            {overrides.flooring && (
              <Input
                placeholder="e.g., Laminate, Tile, Hardwood"
                value={formData.flooringType || ''}
                onChange={e => updateFormData({ flooringType: e.target.value })}
                className="mt-2"
              />
            )}
          </div>

          {/* Bathroom Fixtures Override */}
          <div className="border-b pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                checked={overrides.bathroom}
                onCheckedChange={checked => handleOverrideToggle('bathroom', checked as boolean)}
              />
              <Label className="font-medium">Override Bathroom Fixtures</Label>
            </div>
            {overrides.bathroom && (
              <Input
                placeholder="e.g., Premium fixtures, Designer taps"
                value={formData.bathroomFixtures || ''}
                onChange={e => updateFormData({ bathroomFixtures: e.target.value })}
                className="mt-2"
              />
            )}
          </div>

          {/* Wall Finish Override */}
          <div className="border-b pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                checked={overrides.wallFinish}
                onCheckedChange={checked => handleOverrideToggle('wallFinish', checked as boolean)}
              />
              <Label className="font-medium">Override Wall Finish</Label>
            </div>
            {overrides.wallFinish && (
              <Input
                placeholder="e.g., Painted, Textured, Wallpaper"
                value={formData.wallFinish || ''}
                onChange={e => updateFormData({ wallFinish: e.target.value })}
                className="mt-2"
              />
            )}
          </div>

          {/* Energy Efficiency Override */}
          <div className="pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                checked={overrides.energyEfficiency}
                onCheckedChange={checked =>
                  handleOverrideToggle('energyEfficiency', checked as boolean)
                }
              />
              <Label className="font-medium">Override Energy Efficiency Features</Label>
            </div>
            {overrides.energyEfficiency && (
              <Input
                placeholder="e.g., Solar panels, LED lighting, Heat pump"
                value={formData.energyEfficiency || ''}
                onChange={e => updateFormData({ energyEfficiency: e.target.value })}
                className="mt-2"
              />
            )}
          </div>
        </div>
      </Card>

      {/* Section C: Custom Specifications */}
      <Card className="p-6 bg-gradient-to-br from-purple-50 to-white border-purple-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Additional Custom Specifications
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          Add any unique specifications for this unit type
        </p>

        <div className="space-y-3">
          {customSpecs.map((spec, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="Field Name (e.g., Smart Home Automation)"
                value={spec.name}
                onChange={e => updateCustomSpec(index, 'name', e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Value (e.g., Optional)"
                value={spec.value}
                onChange={e => updateCustomSpec(index, 'value', e.target.value)}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeCustomSpec(index)}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          onClick={addCustomSpec}
          className="w-full mt-4 border-dashed border-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Specification
        </Button>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-900">
            <strong>Examples:</strong> "Smart Home Automation" → "Optional", "Geyser Size" →
            "200L Solar-Electric Hybrid", "Vanity Type" → "900mm Floating Gloss White"
          </p>
        </div>
      </Card>
    </div>
  );
}
