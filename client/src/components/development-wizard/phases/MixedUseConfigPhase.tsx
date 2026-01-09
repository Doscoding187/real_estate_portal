import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Building2, Store, Home, Layers, ArrowLeft, ArrowRight, 
  Shield, Users, Fence
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  RESIDENTIAL_TYPE_OPTIONS,
  COMMERCIAL_TYPE_OPTIONS,
  COMMUNITY_TYPE_OPTIONS,
  type ResidentialType,
  type CommercialType,
  type CommunityType,
} from '@/types/wizardTypes';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { toast } from 'sonner';

export function MixedUseConfigPhase() {
  const { 
    residentialConfig, 
    setResidentialConfig,
    commercialConfig,
    setCommercialConfig,
    setPhase 
  } = useDevelopmentWizard();

  // Mixed-use specific state
  const [residentialRatio, setResidentialRatio] = useState(70); // % residential
  const [selectedResidentialTypes, setSelectedResidentialTypes] = useState<ResidentialType[]>([]);
  const [selectedCommercialTypes, setSelectedCommercialTypes] = useState<CommercialType[]>([]);

  const handleResidentialTypeToggle = (type: ResidentialType) => {
    setSelectedResidentialTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleCommercialTypeToggle = (type: CommercialType) => {
    setSelectedCommercialTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleCommunityToggle = (type: CommunityType) => {
    const current = residentialConfig.communityTypes || [];
    if (current.includes(type)) {
      setResidentialConfig({ communityTypes: current.filter(t => t !== type) });
    } else {
      setResidentialConfig({ communityTypes: [...current, type] });
    }
  };



  const handleContinue = () => {
    if (selectedResidentialTypes.length === 0) {
      toast.error('Please select at least one residential type');
      return;
    }
    if (selectedCommercialTypes.length === 0) {
      toast.error('Please select at least one commercial type');
      return;
    }
    
    // Store the first selected type as primary (for compatibility)
    setResidentialConfig({ 
      residentialType: selectedResidentialTypes[0] 
    });
    setCommercialConfig({ 
      commercialType: selectedCommercialTypes[0]
    });
    
    setPhase(4); // Identity
  };

  const handleBack = () => {
    setPhase(2); // Development Type
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full mb-4">
          <Layers className="w-5 h-5 text-purple-600" />
          <span className="font-medium text-purple-700">Mixed-Use Development</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
          Configure Your Mixed-Use Development
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Define both residential and commercial components of your development.
        </p>
      </div>

      {/* Ratio Slider */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50/50 to-blue-50/50">
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg text-slate-900 mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-600" />
            Development Mix Ratio
          </h3>
          <div className="space-y-6">
            <div className="flex justify-between text-sm font-medium">
              <div className="flex items-center gap-2 text-blue-600">
                <Home className="w-4 h-4" />
                Residential: {residentialRatio}%
              </div>
              <div className="flex items-center gap-2 text-orange-600">
                <Store className="w-4 h-4" />
                Commercial: {100 - residentialRatio}%
              </div>
            </div>
            <Slider
              value={[residentialRatio]}
              onValueChange={([val]) => setResidentialRatio(val)}
              min={10}
              max={90}
              step={5}
              className="[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-blue-500 [&_[role=slider]]:to-purple-500"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>More Commercial</span>
              <span>Balanced</span>
              <span>More Residential</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Residential Types */}
        <Card className="border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg text-slate-900 mb-4 flex items-center gap-2">
              <Home className="w-5 h-5 text-blue-600" />
              Residential Components
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Select the types of residential units in this development.
            </p>
            <div className="space-y-3">
              {RESIDENTIAL_TYPE_OPTIONS.slice(0, 4).map((option) => {
                const isSelected = selectedResidentialTypes.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      isSelected 
                        ? "border-blue-500 bg-blue-50" 
                        : "border-slate-200 hover:border-blue-300"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleResidentialTypeToggle(option.value)}
                      className="data-[state=checked]:bg-blue-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-slate-500">{option.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Commercial Types */}
        <Card className="border-orange-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg text-slate-900 mb-4 flex items-center gap-2">
              <Store className="w-5 h-5 text-orange-600" />
              Commercial Components
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Select the types of commercial spaces in this development.
            </p>
            <div className="space-y-3">
              {COMMERCIAL_TYPE_OPTIONS.slice(0, 4).map((option) => {
                const isSelected = selectedCommercialTypes.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      isSelected 
                        ? "border-orange-500 bg-orange-50" 
                        : "border-slate-200 hover:border-orange-300"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleCommercialTypeToggle(option.value)}
                      className="data-[state=checked]:bg-orange-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-slate-500">{option.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Community Type */}
      <Card className="border-slate-200">
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg text-slate-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Community Type
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {COMMUNITY_TYPE_OPTIONS.slice(0, 4).map((option) => {
              const isSelected = residentialConfig.communityTypes?.includes(option.value);
              return (
                <label
                  key={option.value}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all text-sm",
                    isSelected 
                      ? "border-purple-500 bg-purple-50" 
                      : "border-slate-200 hover:border-purple-300"
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleCommunityToggle(option.value)}
                    className="data-[state=checked]:bg-purple-600"
                  />
                  <span className="font-medium">{option.label}</span>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>



      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-slate-200">
        <Button 
          variant="outline" 
          onClick={handleBack}
          className="px-6 h-11"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={handleContinue}
          size="lg"
          className="px-8 h-11 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
