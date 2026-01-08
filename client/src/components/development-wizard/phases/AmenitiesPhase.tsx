import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, Dumbbell, Leaf, Settings, Baby,
  ArrowRight, ArrowLeft, Check, Sparkles, Plus, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { useWizardNavigation } from '@/hooks/useWizardNavigation';
import { 
  AMENITY_REGISTRY, 
  AMENITY_CATEGORIES, 
  COMMON_PICK_AMENITIES,
  getAmenitiesByCategory,
  type AmenityCategory 
} from '@/config/amenityRegistry';
import { toast } from 'sonner';

// Icons for each category
const CATEGORY_ICONS: Record<AmenityCategory, typeof Shield> = {
  security: Shield,
  lifestyle: Dumbbell,
  sustainability: Leaf,
  convenience: Settings,
  family: Baby,
};

export function AmenitiesPhase() {
  const { 
    selectedAmenities, 
    toggleAmenity,
    setSelectedAmenities,
    setPhase 
  } = useDevelopmentWizard();
  
  const navigation = useWizardNavigation();

  const [activeTab, setActiveTab] = useState<AmenityCategory>('security');
  const [customAmenityInput, setCustomAmenityInput] = useState('');
  const [customAmenities, setCustomAmenities] = useState<string[]>([]);

  // On mount, identify explicitly custom amenities to display in list
  React.useEffect(() => {
    if (selectedAmenities.length > 0 && customAmenities.length === 0) {
      const registryKeys = AMENITY_REGISTRY.map(a => a.key);
      const customKeys = selectedAmenities.filter(k => k.startsWith('custom_'));
      
      const restored = customKeys.map(k => {
          // Attempt to restore readable label. 
          // stored as: custom_private_wine_cellar
          // restore to: Private Wine Cellar
          const raw = k.replace('custom_', '').replace(/_/g, ' ');
          return raw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      });

      if (restored.length > 0) {
        setCustomAmenities(restored);
      }
    }
  }, [selectedAmenities]); // Run once

  const handleBack = () => {
    // Amenities is Step 6
    // Previous is 5 (Location) or 6 (EstateProfile) if incorrectly mapped?
    // Wait, DevelopmentWizard.tsx mapping:
    // 5: LocationPhase
    // 6: EstateProfilePhase (conditional)
    // 7: AmenitiesPhase
    // So if Estate Profile was shown, back to 6. If skipped, back to 5.
    
    if (navigation.shouldShowEstateProfile) {
      setPhase(6);
    } else {
      setPhase(5); // Location
    }
  };

  const handleContinue = () => {
    // Minimum 3
    if (selectedAmenities.length < 3) {
      toast.error('Please select at least 3 amenities');
      return;
    }
    setPhase(8); // Overview (Step 7 in Wizard UI if Amenities is 6... wait numbering shifted)
    // Check DevelopmentWizard.tsx:
    // 7: AmenitiesPhase
    // 8: OverviewPhase
    // So current is 7. Continue to 8.
  };

  const getCategoryCount = (category: AmenityCategory) => {
    const categoryAmenities = getAmenitiesByCategory(category);
    return selectedAmenities.filter(key => 
      categoryAmenities.some(a => a.key === key)
    ).length;
  };

  const applyCommonPicks = () => {
    const newAmenities = [...selectedAmenities];
    COMMON_PICK_AMENITIES.forEach(key => {
      if (!newAmenities.includes(key)) {
        newAmenities.push(key);
      }
    });
    setSelectedAmenities(newAmenities);
    toast.success('Added common amenities');
  };

  const commonPicksApplied = COMMON_PICK_AMENITIES.every(key => selectedAmenities.includes(key));

  const handleAddCustomAmenity = () => {
    const trimmed = customAmenityInput.trim();
    if (!trimmed) return;
    
    // Check registry
    const existsInRegistry = AMENITY_REGISTRY.some(a => a.label.toLowerCase() === trimmed.toLowerCase());
    const existsInCustom = customAmenities.some(a => a.toLowerCase() === trimmed.toLowerCase());
    
    if (existsInRegistry) {
      toast.error('This amenity exists in the standard list');
      return;
    }
    if (existsInCustom) {
      toast.error('You already added this custom amenity');
      return;
    }
    
    const customKey = `custom_${trimmed.toLowerCase().replace(/\s+/g, '_')}`;
    setCustomAmenities([...customAmenities, trimmed]);
    toggleAmenity(customKey); // Add to selection
    setCustomAmenityInput('');
    toast.success(`Added "${trimmed}"`);
  };

  const handleRemoveCustomAmenity = (name: string) => {
    const customKey = `custom_${name.toLowerCase().replace(/\s+/g, '_')}`;
    setCustomAmenities(customAmenities.filter(a => a !== name));
    if (selectedAmenities.includes(customKey)) {
        toggleAmenity(customKey);
    }
  };

  const totalSelected = selectedAmenities.length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-teal-50 rounded-lg">
          <Dumbbell className="w-6 h-6 text-teal-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Amenities & Features</h2>
          <p className="text-slate-600">What lifestyle features does the development offer?</p>
        </div>
      </div>

       {/* Selected Count & Quick Actions */}
       <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex items-center justify-between p-4 bg-blue-50/50 rounded-xl border border-blue-100">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                   <p className="font-medium text-slate-900">{totalSelected} Selected</p>
                   <p className="text-sm text-slate-500">Minimum 3 required</p>
                </div>
             </div>
             <Badge variant={totalSelected >= 3 ? 'default' : 'secondary'} className={totalSelected >= 3 ? "bg-green-600 hover:bg-green-700" : ""}>
               {totalSelected >= 3 ? 'Target Met' : 'Incomplete'}
             </Badge>
          </div>

          {!commonPicksApplied && (
            <div className="flex-1 flex items-center justify-between p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-amber-600">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Quick Start</p>
                    <p className="text-sm text-slate-500">Add popular amenities</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={applyCommonPicks} className="bg-white border-amber-200 text-amber-700 hover:bg-amber-50">
                  Apply All
                </Button>
            </div>
          )}
       </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AmenityCategory)} className="w-full">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-auto inline-flex w-max md:w-full justify-start md:justify-between gap-1">
            {AMENITY_CATEGORIES.map(category => {
               const Icon = CATEGORY_ICONS[category.key];
               const count = getCategoryCount(category.key);
               return (
                 <TabsTrigger 
                    key={category.key} 
                    value={category.key}
                    className="flex items-center gap-2 px-3 py-2 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{category.label}</span>
                    {count > 0 && (
                      <Badge variant="secondary" className="h-5 min-w-[1.25rem] px-1 bg-blue-100 text-blue-700 ml-1">
                        {count}
                      </Badge>
                    )}
                 </TabsTrigger>
               );
            })}
          </TabsList>
        </div>

        {AMENITY_CATEGORIES.map(category => {
           const Icon = CATEGORY_ICONS[category.key];
           return (
             <TabsContent key={category.key} value={category.key} className="mt-6 animate-in fade-in zoom-in-95 duration-200">
                <Card>
                  <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                     <div className="flex items-center gap-2">
                        <Icon className="w-5 h-5 text-slate-500" />
                        <div>
                          <CardTitle className="text-base">{category.label}</CardTitle>
                          <CardDescription>{category.description}</CardDescription>
                        </div>
                     </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {getAmenitiesByCategory(category.key).map(item => {
                           const isSelected = selectedAmenities.includes(item.key);
                           return (
                             <div 
                                key={item.key}
                                onClick={() => toggleAmenity(item.key)}
                                className={cn(
                                  "flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-slate-50",
                                  isSelected ? "border-blue-600 bg-blue-50/50" : "border-slate-100"
                                )}
                             >
                                <Checkbox checked={isSelected} className="mt-0.5" />
                                <span className={cn("text-sm font-medium", isSelected ? "text-blue-900" : "text-slate-700")}>
                                  {item.label}
                                </span>
                             </div>
                           )
                        })}
                     </div>
                  </CardContent>
                </Card>
             </TabsContent>
           );
        })}
      </Tabs>

      <Card className="border-dashed border-slate-300 shadow-none bg-slate-50/50">
         <CardContent className="pt-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
               <Plus className="w-4 h-4" /> Custom Amenities
            </h3>
            
            <div className="flex gap-2 max-w-lg mb-4">
               <Input 
                  placeholder="e.g. Helipad, Private Vineyard" 
                  value={customAmenityInput}
                  onChange={(e) => setCustomAmenityInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomAmenity()}
               />
               <Button onClick={handleAddCustomAmenity} disabled={!customAmenityInput.trim()}>Add</Button>
            </div>

            {customAmenities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                 {customAmenities.map(name => (
                   <Badge key={name} variant="outline" className="pl-2 pr-1 py-1 bg-white border-slate-200 flex items-center gap-2">
                      {name}
                      <button onClick={() => handleRemoveCustomAmenity(name)} className="hover:bg-slate-100 rounded-full p-0.5">
                        <X className="w-3 h-3 text-slate-400 hover:text-red-500" />
                      </button>
                   </Badge>
                 ))}
              </div>
            )}
         </CardContent>
      </Card>

      <div className="flex justify-between pt-8 mt-8 border-t border-slate-200">
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
          disabled={totalSelected < 3}
          size="lg" 
          className="px-8 h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300"
        >
          Continue to Marketing Summary
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
