import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, Dumbbell, Leaf, Settings, Baby,
  ArrowRight, ArrowLeft, Check, Info, Sparkles, Plus, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { useWizardNavigation } from '@/hooks/useWizardNavigation';
import { 
  AMENITY_REGISTRY, 
  AMENITY_CATEGORIES, 
  COMMON_PICK_AMENITIES,
  getAmenitiesByCategory,
  getAmenityByKey,
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

  const handleBack = () => {
    // Go back to Estate Profile (4) or Identity (3) based on config
    if (navigation.shouldShowEstateProfile) {
      setPhase(4);
    } else {
      setPhase(3); // Skip back to Identity
    }
  };

  const handleContinue = () => {
    if (selectedAmenities.length < 3) {
      toast.error('Please select at least 3 amenities');
      return;
    }
    
    setPhase(7); // Forward to Overview
  };

  const getCategoryCount = (category: AmenityCategory) => {
    const categoryAmenities = getAmenitiesByCategory(category);
    return selectedAmenities.filter(key => 
      categoryAmenities.some(a => a.key === key)
    ).length;
  };

  // Apply common picks (auto-suggest high-conversion amenities)
  const applyCommonPicks = () => {
    const newAmenities = [...selectedAmenities];
    COMMON_PICK_AMENITIES.forEach(key => {
      if (!newAmenities.includes(key)) {
        newAmenities.push(key);
      }
    });
    setSelectedAmenities(newAmenities);
    toast.success('Added common amenities to your selection');
  };

  const commonPicksApplied = COMMON_PICK_AMENITIES.every(key => selectedAmenities.includes(key));

  // Custom amenity handlers
  const handleAddCustomAmenity = () => {
    const trimmed = customAmenityInput.trim();
    if (!trimmed) return;
    
    // Check if already exists (in registry or custom list)
    const existsInRegistry = AMENITY_REGISTRY.some(a => 
      a.label.toLowerCase() === trimmed.toLowerCase()
    );
    const existsInCustom = customAmenities.some(a => 
      a.toLowerCase() === trimmed.toLowerCase()
    );
    
    if (existsInRegistry) {
      toast.error('This amenity already exists in the list - please select it from the categories');
      return;
    }
    
    if (existsInCustom) {
      toast.error('You have already added this custom amenity');
      return;
    }
    
    // Add to custom list and selected amenities
    const customKey = `custom_${trimmed.toLowerCase().replace(/\s+/g, '_')}`;
    setCustomAmenities([...customAmenities, trimmed]);
    setSelectedAmenities([...selectedAmenities, customKey]);
    setCustomAmenityInput('');
    toast.success(`Added "${trimmed}" to your amenities`);
  };

  const handleRemoveCustomAmenity = (amenityName: string) => {
    const customKey = `custom_${amenityName.toLowerCase().replace(/\s+/g, '_')}`;
    setCustomAmenities(customAmenities.filter(a => a !== amenityName));
    setSelectedAmenities(selectedAmenities.filter(a => a !== customKey));
  };

  const totalSelected = selectedAmenities.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center md:text-left">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
          Development Amenities
        </h2>
        <p className="text-slate-600">
          Select the shared amenities and features your development offers. 
          These are used for search filters and SEO.
        </p>
      </div>

      {/* Selected Count */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Check className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">
              {totalSelected} amenities selected
            </p>
            <p className="text-sm text-slate-500">
              Minimum 3 required
            </p>
          </div>
        </div>
        <Badge 
          variant={totalSelected >= 3 ? "default" : "secondary"}
          className={cn(
            "text-sm px-3 py-1",
            totalSelected >= 3 ? "bg-green-500" : "bg-slate-200"
          )}
        >
          {totalSelected >= 3 ? '✓ Complete' : `${3 - totalSelected} more needed`}
        </Badge>
      </div>

      {/* Quick Picks Button */}
      {!commonPicksApplied && totalSelected < 3 && (
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Quick Start</p>
              <p className="text-sm text-slate-500">
                Add recommended amenities: 24-Hour Security, Access Control, Fibre-Ready
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={applyCommonPicks}
            className="border-amber-300 bg-white hover:bg-amber-50 text-amber-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Apply Common Picks
          </Button>
        </div>
      )}

      {/* Tabs Structure */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AmenityCategory)} className="w-full">
        {/* Category Tabs */}
        <div className="overflow-x-auto -mx-4 px-4 pb-2">
          <TabsList className="inline-flex h-auto bg-slate-100/80 p-1.5 rounded-xl gap-1 min-w-max">
            {AMENITY_CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICONS[category.key];
              const count = getCategoryCount(category.key);
              
              return (
                <TabsTrigger
                  key={category.key}
                  value={category.key}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200",
                    "data-[state=active]:bg-white data-[state=active]:shadow-sm",
                    "text-slate-600 data-[state=active]:text-slate-900"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium text-sm whitespace-nowrap">
                    {category.label}
                  </span>
                  {count > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="h-5 w-5 p-0 flex items-center justify-center text-xs bg-blue-100 text-blue-700"
                    >
                      {count}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Category Content */}
        {AMENITY_CATEGORIES.map((category) => {
          const Icon = CATEGORY_ICONS[category.key];
          const amenities = getAmenitiesByCategory(category.key);
          
          return (
            <TabsContent 
              key={category.key} 
              value={category.key}
              className="mt-6 focus-visible:ring-0"
            >
              <Card className="border-slate-200/60 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-xl",
                      category.key === 'security' && "bg-red-100",
                      category.key === 'lifestyle' && "bg-blue-100",
                      category.key === 'sustainability' && "bg-green-100",
                      category.key === 'convenience' && "bg-orange-100",
                      category.key === 'family' && "bg-pink-100"
                    )}>
                      <Icon className={cn(
                        "w-5 h-5",
                        category.key === 'security' && "text-red-600",
                        category.key === 'lifestyle' && "text-blue-600",
                        category.key === 'sustainability' && "text-green-600",
                        category.key === 'convenience' && "text-orange-600",
                        category.key === 'family' && "text-pink-600"
                      )} />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-slate-900">
                        {category.label}
                      </CardTitle>
                      <CardDescription>
                        {category.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {amenities.map((amenity) => {
                      const isSelected = selectedAmenities.includes(amenity.key);
                      
                      return (
                        <label
                          key={amenity.key}
                          className={cn(
                            "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                            isSelected 
                              ? "border-blue-500 bg-blue-50" 
                              : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleAmenity(amenity.key)}
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                          <span className={cn(
                            "font-medium text-sm",
                            isSelected ? "text-blue-900" : "text-slate-700"
                          )}>
                            {amenity.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {AMENITY_CATEGORIES.map((category) => {
          const Icon = CATEGORY_ICONS[category.key];
          const count = getCategoryCount(category.key);
          
          return (
            <div 
              key={category.key}
              className={cn(
                "flex items-center gap-2 p-3 rounded-lg border",
                count > 0 ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"
              )}
            >
              <Icon className={cn("w-4 h-4", count > 0 ? "text-blue-600" : "text-slate-400")} />
              <span className={cn("text-sm font-medium", count > 0 ? "text-blue-700" : "text-slate-500")}>
                {category.label.split(' ')[0]}: {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Custom Amenity Input */}
      <Card className="border-slate-200/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-600" />
            Add Custom Amenity
          </CardTitle>
          <CardDescription>
            Can't find an amenity in our list? Add your own custom amenity below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="e.g., Helipad, Private Beach Access..."
              value={customAmenityInput}
              onChange={(e) => setCustomAmenityInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomAmenity()}
              className="flex-1"
            />
            <Button
              onClick={handleAddCustomAmenity}
              disabled={!customAmenityInput.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>

          {/* Custom Amenities List */}
          {customAmenities.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {customAmenities.map((amenity) => (
                <Badge
                  key={amenity}
                  variant="secondary"
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200"
                >
                  {amenity}
                  <button
                    onClick={() => handleRemoveCustomAmenity(amenity)}
                    className="p-0.5 hover:bg-green-200 rounded transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
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
          disabled={totalSelected < 3}
          className="px-8 h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50"
        >
          Continue to Overview
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
