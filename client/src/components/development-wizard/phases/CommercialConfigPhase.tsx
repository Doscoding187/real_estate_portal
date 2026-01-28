import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Building,
  Store,
  Factory,
  Warehouse,
  Hotel,
  Layers,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { COMMERCIAL_TYPE_OPTIONS, type CommercialType } from '@/types/wizardTypes';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { toast } from 'sonner';

// Icons for commercial types
const COMMERCIAL_ICONS: Record<CommercialType, typeof Building> = {
  office_development: Building,
  retail_centre: Store,
  industrial_park: Factory,
  warehouse: Warehouse,
  mixed_commercial: Layers,
  hospitality: Hotel,
};

// Commercial features
const COMMERCIAL_FEATURES = [
  { key: 'generator', label: 'Backup Generator' },
  { key: 'fibre', label: 'Fibre Connectivity' },
  { key: 'loading_bay', label: 'Loading Bays' },
  { key: 'parking', label: 'Dedicated Parking' },
  { key: 'security', label: '24/7 Security' },
  { key: 'aircon', label: 'Central Air-Con' },
];

export function CommercialConfigPhase() {
  const { commercialConfig, setCommercialConfig, setPhase } = useDevelopmentWizard();

  const handleTypeSelect = (type: CommercialType) => {
    setCommercialConfig({ commercialType: type });
  };

  const handleFeatureToggle = (key: string) => {
    const current = commercialConfig?.features || [];
    if (current.includes(key)) {
      setCommercialConfig({ features: current.filter(f => f !== key) });
    } else {
      setCommercialConfig({ features: [...current, key] });
    }
  };

  const handleContinue = () => {
    if (!commercialConfig?.commercialType) {
      toast.error('Please select a commercial type');
      return;
    }
    setPhase(4); // Identity
  };

  const handleBack = () => {
    setPhase(2); // Development Type
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
          Commercial Development Configuration
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Select the type of commercial development and key features.
        </p>
      </div>

      {/* Commercial Type Selection */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg text-slate-900">Commercial Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {COMMERCIAL_TYPE_OPTIONS.map(option => {
            const Icon = COMMERCIAL_ICONS[option.value];
            const isSelected = commercialConfig?.commercialType === option.value;

            return (
              <Card
                key={option.value}
                className={cn(
                  'cursor-pointer transition-all duration-300 hover:shadow-md',
                  isSelected
                    ? 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-500'
                    : 'border-slate-200 hover:border-orange-300',
                )}
                onClick={() => handleTypeSelect(option.value)}
              >
                <CardContent className="p-5 flex items-start gap-4">
                  <div
                    className={cn(
                      'p-3 rounded-xl transition-colors',
                      isSelected ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4
                      className={cn(
                        'font-semibold mb-1',
                        isSelected ? 'text-orange-900' : 'text-slate-900',
                      )}
                    >
                      {option.label}
                    </h4>
                    <p className="text-sm text-slate-600">{option.description}</p>
                  </div>
                  {isSelected && <div className="w-3 h-3 bg-orange-500 rounded-full" />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Commercial Features */}
      <Card className="border-slate-200">
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg text-slate-900 mb-4">Development Features</h3>
          <p className="text-sm text-slate-600 mb-4">
            Select the features available in this commercial development.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {COMMERCIAL_FEATURES.map(item => {
              const isChecked = commercialConfig?.features?.includes(item.key);
              return (
                <label
                  key={item.key}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                    isChecked
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-slate-200 hover:border-orange-300',
                  )}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => handleFeatureToggle(item.key)}
                    className="data-[state=checked]:bg-orange-600"
                  />
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-slate-200">
        <Button variant="outline" onClick={handleBack} className="px-6 h-11">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          size="lg"
          className="px-8 h-11 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
