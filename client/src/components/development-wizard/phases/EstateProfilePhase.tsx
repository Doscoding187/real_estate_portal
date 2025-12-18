import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Castle, Scale, FileText, TreePine, Waves, Dumbbell, 
  ArrowRight, ArrowLeft, Info, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { toast } from 'sonner';

// Estate-level amenities (different from development amenities)
const ESTATE_AMENITIES = [
  { key: 'clubhouse', label: 'Clubhouse', icon: Castle },
  { key: 'golf_course', label: 'Golf Course', icon: TreePine },
  { key: 'walking_trails', label: 'Walking Trails', icon: TreePine },
  { key: 'private_school', label: 'Private School', icon: FileText },
  { key: 'marina', label: 'Marina', icon: Waves },
  { key: 'nature_reserve', label: 'Nature Reserve', icon: TreePine },
  { key: 'sports_facilities', label: 'Sports Facilities', icon: Dumbbell },
  { key: 'equestrian_centre', label: 'Equestrian Centre', icon: TreePine },
  { key: 'restaurant', label: 'Restaurant / Dining', icon: Castle },
  { key: 'spa_wellness', label: 'Spa & Wellness', icon: Dumbbell },
];

// Estate classification options
const ESTATE_CLASSIFICATIONS = [
  { value: 'golf_estate', label: 'Golf Estate' },
  { value: 'eco_estate', label: 'Eco Estate' },
  { value: 'lifestyle_estate', label: 'Lifestyle Estate' },
  { value: 'security_estate', label: 'Security Estate' },
  { value: 'waterfront_estate', label: 'Waterfront Estate' },
  { value: 'country_estate', label: 'Country Estate' },
  { value: 'retirement_estate', label: 'Retirement Estate' },
];

export function EstateProfilePhase() {
  const { 
    estateProfile, 
    setEstateProfile, 
    setPhase 
  } = useDevelopmentWizard();

  const handleClassificationSelect = (classification: string) => {
    setEstateProfile({ classification });
  };

  const handleHOAToggle = (checked: boolean) => {
    setEstateProfile({ hasHOA: checked });
  };

  const handleLevyChange = (values: number[]) => {
    setEstateProfile({ 
      levyRange: { 
        min: values[0], 
        max: values[1] 
      } 
    });
  };

  const handleGuidelinesToggle = (checked: boolean) => {
    setEstateProfile({ architecturalGuidelines: checked });
  };

  const handleAmenityToggle = (key: string) => {
    const current = estateProfile.estateAmenities || [];
    if (current.includes(key)) {
      setEstateProfile({ estateAmenities: current.filter(a => a !== key) });
    } else {
      setEstateProfile({ estateAmenities: [...current, key] });
    }
  };

  const handleBack = () => {
    setPhase(4); // Back to Location (will be keyed later)
  };

  const handleContinue = () => {
    // Estate profile is optional, but if filled, should have classification
    if (!estateProfile.classification) {
      toast.error('Please select an estate classification');
      return;
    }
    
    setPhase(6); // Forward to Amenities (skipping 5 which was this phase)
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center md:text-left">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-100 rounded-xl">
            <Castle className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
              Estate Profile
            </h2>
            <p className="text-slate-600">
              Configure estate-level details, rules, and shared amenities.
            </p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-100 rounded-xl">
        <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
        <div className="text-sm text-purple-700">
          <strong>Estate-level information</strong> describes the overall estate or community 
          that your development is part of. This is separate from the development's own amenities.
        </div>
      </div>

      {/* Estate Classification */}
      <Card className="border-slate-200/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-slate-900">Estate Classification</CardTitle>
          <CardDescription>How would you classify this estate or community?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ESTATE_CLASSIFICATIONS.map((option) => {
              const isSelected = estateProfile.classification === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => handleClassificationSelect(option.value)}
                  className={cn(
                    "p-4 rounded-xl border-2 text-left transition-all duration-200",
                    isSelected 
                      ? "border-purple-500 bg-purple-50 text-purple-900" 
                      : "border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 text-slate-700"
                  )}
                >
                  <span className="font-medium text-sm flex items-center gap-2">
                    {isSelected && <Check className="w-4 h-4 text-purple-600" />}
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* HOA / Body Corporate */}
      <Card className="border-slate-200/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-slate-900 flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-600" />
            Governance & Levies
          </CardTitle>
          <CardDescription>Does this estate have a governing body?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* HOA Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <Label className="text-base font-medium text-slate-900">
                HOA / Body Corporate
              </Label>
              <p className="text-sm text-slate-500 mt-1">
                Is there a Homeowners Association or Body Corporate?
              </p>
            </div>
            <Switch 
              checked={estateProfile.hasHOA} 
              onCheckedChange={handleHOAToggle}
            />
          </div>

          {/* Levy Range - Only if HOA exists */}
          {estateProfile.hasHOA && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div>
                <Label className="text-sm font-medium text-slate-700">
                  Monthly Levy Range
                </Label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Approximate range for monthly levies
                </p>
              </div>
              
              <div className="px-2">
                <Slider
                  value={[estateProfile.levyRange.min, estateProfile.levyRange.max]}
                  onValueChange={handleLevyChange}
                  min={0}
                  max={20000}
                  step={500}
                  className="w-full"
                />
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">
                  From: <strong className="text-slate-900">{formatCurrency(estateProfile.levyRange.min)}</strong>
                </span>
                <span className="text-slate-600">
                  To: <strong className="text-slate-900">{formatCurrency(estateProfile.levyRange.max)}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Architectural Guidelines */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <Label className="text-base font-medium text-slate-900">
                Architectural Guidelines
              </Label>
              <p className="text-sm text-slate-500 mt-1">
                Are there enforced building and design guidelines?
              </p>
            </div>
            <Switch 
              checked={estateProfile.architecturalGuidelines} 
              onCheckedChange={handleGuidelinesToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Estate Amenities */}
      <Card className="border-slate-200/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-slate-900 flex items-center gap-2">
            <TreePine className="w-5 h-5 text-green-600" />
            Estate Amenities
          </CardTitle>
          <CardDescription>
            What shared facilities does the estate offer? 
            <Badge variant="secondary" className="ml-2 text-xs">Estate-level</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {ESTATE_AMENITIES.map((amenity) => {
              const isSelected = estateProfile.estateAmenities?.includes(amenity.key);
              const Icon = amenity.icon;
              
              return (
                <label
                  key={amenity.key}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 text-center",
                    isSelected 
                      ? "border-green-500 bg-green-50" 
                      : "border-slate-200 hover:border-green-300 hover:bg-green-50/30"
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleAmenityToggle(amenity.key)}
                    className="sr-only"
                  />
                  <Icon className={cn(
                    "w-6 h-6",
                    isSelected ? "text-green-600" : "text-slate-400"
                  )} />
                  <span className={cn(
                    "font-medium text-xs",
                    isSelected ? "text-green-900" : "text-slate-600"
                  )}>
                    {amenity.label}
                  </span>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
          className="px-8 h-11 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-md hover:shadow-lg transition-all duration-300"
        >
          Continue to Amenities
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
