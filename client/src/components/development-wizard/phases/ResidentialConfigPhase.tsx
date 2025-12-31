import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Building2, Home, Castle, TreePine, Waves, GraduationCap, Users,
  Shield, Check, ArrowRight, ArrowLeft, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  RESIDENTIAL_TYPE_OPTIONS, 
  COMMUNITY_TYPE_OPTIONS,
  SECURITY_FEATURE_OPTIONS,
  getApplicableCommunityTypes,
  type ResidentialType,
  type CommunityType,
  type SecurityFeature,
} from '@/types/wizardTypes';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { toast } from 'sonner';

const RESIDENTIAL_ICONS: Record<ResidentialType, typeof Building2> = {
  apartment: Building2,
  security_estate: Shield,
  freehold: Home,
  mixed_residential: Building2,
  retirement: Users,
  student_accommodation: GraduationCap,
  townhouse_cluster: Castle,
};

export function ResidentialConfigPhase() {
  const { 
    residentialConfig, 
    setResidentialConfig, 
    setPhase 
  } = useDevelopmentWizard();

  const handleResidentialTypeSelect = (type: ResidentialType) => {
    // Clear community types when residential type changes since options differ
    setResidentialConfig({ 
      residentialType: type,
      communityTypes: []
    });
  };

  const handleCommunityTypeToggle = (type: CommunityType) => {
    const current = residentialConfig.communityTypes || [];
    
    // Special case: if selecting 'non_estate', clear all estate types
    if (type === 'non_estate') {
      setResidentialConfig({ communityTypes: ['non_estate'] });
      return;
    }
    
    // If selecting an estate type, remove 'non_estate' if present
    const filtered = current.filter(t => t !== 'non_estate');
    
    if (filtered.includes(type)) {
      setResidentialConfig({ communityTypes: filtered.filter(t => t !== type) });
    } else {
      setResidentialConfig({ communityTypes: [...filtered, type] });
    }
  };

  const handleSecurityFeatureToggle = (feature: SecurityFeature) => {
    const current = residentialConfig.securityFeatures || [];
    
    if (current.includes(feature)) {
      setResidentialConfig({ securityFeatures: current.filter(f => f !== feature) });
    } else {
      setResidentialConfig({ securityFeatures: [...current, feature] });
    }
  };

  const handleBack = () => {
    setPhase(2); // Back to Development Type
  };

  const handleContinue = () => {
    if (!residentialConfig.residentialType) {
      toast.error('Please select a residential development type');
      return;
    }
    
    setPhase(4); // Basic Details (Identity)
  };

  // Show security section if any estate/gated type is selected OR if it's an apartment/townhouse
  const shouldShowSecurity = (residentialConfig.communityTypes?.length || 0) > 0 || 
    ['apartment', 'townhouse'].includes(residentialConfig.residentialType || '');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center md:text-left">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
          Residential Configuration
        </h2>
        <p className="text-slate-600">
          Define the type and structure of your residential development.
        </p>
      </div>

      {/* Step 1A: Residential Development Type */}
      <Card className="border-slate-200/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-slate-900">Development Type</CardTitle>
          <CardDescription>What kind of residential development is this?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {RESIDENTIAL_TYPE_OPTIONS.map((option) => {
              const Icon = RESIDENTIAL_ICONS[option.value];
              const isSelected = residentialConfig.residentialType === option.value;
              
              return (
                <Card
                  key={option.value}
                  className={cn(
                    "cursor-pointer transition-all duration-300 hover:scale-[1.02] relative overflow-hidden group",
                    isSelected 
                      ? "border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 ring-2 ring-blue-500 shadow-md" 
                      : "border-slate-200 hover:border-blue-300 hover:shadow-sm"
                  )}
                  onClick={() => handleResidentialTypeSelect(option.value)}
                >
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className={cn(
                      "p-3 rounded-xl transition-all duration-300 shrink-0",
                      isSelected 
                        ? "bg-gradient-to-br from-blue-500 to-purple-500 text-white" 
                        : "bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600"
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={cn(
                        "font-semibold text-sm truncate",
                        isSelected ? "text-blue-900" : "text-slate-900"
                      )}>
                        {option.label}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {option.description}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <div className="p-1 bg-white rounded-full shadow">
                          <Check className="w-3 h-3 text-blue-600" />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step 1B: Community / Property Type - Only shows after development type is selected */}
      {residentialConfig.residentialType && (
        <Card className="border-slate-200/60 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-slate-900 flex items-center gap-2">
              <Castle className="w-5 h-5 text-purple-600" />
              Property Sub-Type
              <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>
            </CardTitle>
            <CardDescription>
              What specific type of {RESIDENTIAL_TYPE_OPTIONS.find(o => o.value === residentialConfig.residentialType)?.label.toLowerCase() || 'development'} is this?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {getApplicableCommunityTypes(residentialConfig.residentialType || null).map((option) => {
                const isSelected = residentialConfig.communityTypes?.includes(option.value);
                
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                      isSelected 
                        ? "border-purple-500 bg-purple-50" 
                        : "border-slate-200 hover:border-purple-300 hover:bg-purple-50/30"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleCommunityTypeToggle(option.value)}
                      className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                    />
                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        "font-medium text-sm",
                        isSelected ? "text-purple-900" : "text-slate-700"
                      )}>
                        {option.label}
                      </span>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {option.description}
                      </p>
                      {option.triggersEstateProfile && (
                        <p className="text-xs text-purple-600 mt-0.5 font-medium">
                          + Estate Profile
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
            
            {/* Info about Estate Profile */}
            {residentialConfig.communityTypes?.some(t => 
              COMMUNITY_TYPE_OPTIONS.find(o => o.value === t)?.triggersEstateProfile
            ) && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-purple-50 rounded-lg text-sm text-purple-700">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  You'll configure estate-level details (HOA, levies, estate amenities) in a dedicated step.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 1C: Security Features (shown for estates OR apartments) */}
      {shouldShowSecurity && (
        <Card className="border-slate-200/60 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              Security Features
            </CardTitle>
            <CardDescription>
              What security features does this development have? These are filterable attributes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {SECURITY_FEATURE_OPTIONS.map((option) => {
                const isSelected = residentialConfig.securityFeatures?.includes(option.value);
                
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all duration-200",
                      isSelected 
                        ? "border-green-500 bg-green-50 text-green-900" 
                        : "border-slate-200 hover:border-green-300 hover:bg-green-50/30 text-slate-700"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSecurityFeatureToggle(option.value)}
                      className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                    />
                    <span className="font-medium text-sm">
                      {option.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-200">
        <Button
          variant="outline"
          onClick={handleBack}
          className="px-6 h-11 border-slate-300"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          size="lg"
          disabled={!residentialConfig.residentialType}
          className="px-8 h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300"
        >
          Continue to Basic Details
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
