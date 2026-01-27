import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  MapPin,
  Droplets,
  Zap,
  Trees,
  Tractor,
  Factory,
  FileCheck,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LAND_TYPE_OPTIONS, type LandType } from '@/types/wizardTypes';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { toast } from 'sonner';

// Icons for land types
const LAND_ICONS: Record<LandType, typeof MapPin> = {
  serviced_plots: Droplets,
  vacant_land: Trees,
  plot_and_plan: FileCheck,
  agricultural: Tractor,
  small_holdings: Trees,
  industrial_land: Factory,
};

// Land infrastructure options
const LAND_INFRASTRUCTURE = [
  { key: 'water', label: 'Water Connection', icon: Droplets },
  { key: 'electricity', label: 'Electricity Connection', icon: Zap },
  { key: 'roads', label: 'Tarred Roads', icon: MapPin },
  { key: 'sewerage', label: 'Sewerage System', icon: Droplets },
  { key: 'fibre', label: 'Fibre Ready', icon: Zap },
];

export function LandConfigPhase() {
  const { landConfig, setLandConfig, setPhase } = useDevelopmentWizard();

  const handleTypeSelect = (type: LandType) => {
    setLandConfig({ landType: type });
  };

  const handleInfrastructureToggle = (key: string) => {
    const current = landConfig?.infrastructure || [];
    if (current.includes(key)) {
      setLandConfig({ infrastructure: current.filter(i => i !== key) });
    } else {
      setLandConfig({ infrastructure: [...current, key] });
    }
  };

  const handleContinue = () => {
    if (!landConfig?.landType) {
      toast.error('Please select a land type');
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
          Land Development Configuration
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Select the type of land development and available infrastructure.
        </p>
      </div>

      {/* Land Type Selection */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg text-slate-900">Land Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LAND_TYPE_OPTIONS.map(option => {
            const Icon = LAND_ICONS[option.value];
            const isSelected = landConfig?.landType === option.value;

            return (
              <Card
                key={option.value}
                className={cn(
                  'cursor-pointer transition-all duration-300 hover:shadow-md',
                  isSelected
                    ? 'border-green-500 bg-green-50/50 ring-2 ring-green-500'
                    : 'border-slate-200 hover:border-green-300',
                )}
                onClick={() => handleTypeSelect(option.value)}
              >
                <CardContent className="p-5 flex items-start gap-4">
                  <div
                    className={cn(
                      'p-3 rounded-xl transition-colors',
                      isSelected ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4
                      className={cn(
                        'font-semibold mb-1',
                        isSelected ? 'text-green-900' : 'text-slate-900',
                      )}
                    >
                      {option.label}
                    </h4>
                    <p className="text-sm text-slate-600">{option.description}</p>
                  </div>
                  {isSelected && <div className="w-3 h-3 bg-green-500 rounded-full" />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Infrastructure */}
      <Card className="border-slate-200">
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg text-slate-900 mb-4">Available Infrastructure</h3>
          <p className="text-sm text-slate-600 mb-4">
            Select the services available on the land plots.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {LAND_INFRASTRUCTURE.map(item => {
              const isChecked = landConfig?.infrastructure?.includes(item.key);
              return (
                <label
                  key={item.key}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                    isChecked
                      ? 'border-green-500 bg-green-50'
                      : 'border-slate-200 hover:border-green-300',
                  )}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => handleInfrastructureToggle(item.key)}
                    className="data-[state=checked]:bg-green-600"
                  />
                  <item.icon className="w-4 h-4 text-slate-500" />
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
          className="px-8 h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
