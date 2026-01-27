import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Dumbbell, Leaf, Settings, Baby, Check, Sparkles, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import {
  AMENITY_REGISTRY,
  AMENITY_CATEGORIES,
  COMMON_PICK_AMENITIES,
  getAmenitiesByCategory,
  type AmenityCategory,
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
  const { stepData, saveWorkflowStepData } = useDevelopmentWizard();

  // Local state for UI responsiveness
  const [activeTab, setActiveTab] = useState<AmenityCategory>('security');
  const [customAmenityInput, setCustomAmenityInput] = useState('');

  // Derived from stepData for persistence
  const savedData = stepData?.amenities_features || {};
  const selectedAmenities: string[] = savedData.amenities || [];

  // Custom amenities are those in selectedAmenities but NOT in the standard registry
  const customAmenities = selectedAmenities.filter(
    key => !AMENITY_REGISTRY.some(reg => reg.key === key),
  );

  // Persistence handler
  const handleUpdate = useCallback(
    (newAmenities: string[]) => {
      saveWorkflowStepData('amenities_features', {
        ...savedData,
        amenities: newAmenities,
      });
    },
    [savedData, saveWorkflowStepData],
  );

  const toggleAmenity = (key: string) => {
    let newSelection;
    if (selectedAmenities.includes(key)) {
      newSelection = selectedAmenities.filter(k => k !== key);
    } else {
      newSelection = [...selectedAmenities, key];
    }
    handleUpdate(newSelection);
  };

  const getCategoryCount = (category: AmenityCategory) => {
    const categoryAmenities = getAmenitiesByCategory(category);
    return selectedAmenities.filter(key => categoryAmenities.some(a => a.key === key)).length;
  };

  const applyCommonPicks = () => {
    const newAmenities = [...selectedAmenities];
    let addedCount = 0;
    COMMON_PICK_AMENITIES.forEach(key => {
      if (!newAmenities.includes(key)) {
        newAmenities.push(key);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      handleUpdate(newAmenities);
      toast.success(`Added ${addedCount} common amenities`);
    } else {
      toast.info('All common amenities already selected');
    }
  };

  const commonPicksApplied = COMMON_PICK_AMENITIES.every(key => selectedAmenities.includes(key));

  const handleAddCustomAmenity = () => {
    const trimmed = customAmenityInput.trim();
    if (!trimmed) return;

    // Check registry
    const existsInRegistry = AMENITY_REGISTRY.some(
      a => a.label.toLowerCase() === trimmed.toLowerCase(),
    );
    const existsInSelection = selectedAmenities.some(
      a => a.toLowerCase() === trimmed.toLowerCase(),
    );

    if (existsInRegistry) {
      const registryItem = AMENITY_REGISTRY.find(
        a => a.label.toLowerCase() === trimmed.toLowerCase(),
      );
      if (registryItem && !selectedAmenities.includes(registryItem.key)) {
        toggleAmenity(registryItem.key);
        toast.success(`Added standard amenity: ${registryItem.label}`);
        setCustomAmenityInput('');
        return;
      } else {
        toast.error('This amenity is already selected');
        return;
      }
    }

    if (existsInSelection) {
      toast.error('You already added this amenity');
      return;
    }

    // For custom amenities, we just use the name as the key (or a slugified version if preferred, but user said string[])
    // Let's use the raw string to preserve casing for display, but distinct enough.
    // Actually, to keep it clean, let's treat it as a unique string.
    handleUpdate([...selectedAmenities, trimmed]);
    setCustomAmenityInput('');
    toast.success(`Added "${trimmed}"`);
  };

  const handleRemoveCustomAmenity = (name: string) => {
    handleUpdate(selectedAmenities.filter(a => a !== name));
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
              <p className="text-sm text-slate-500">Select as many as apply</p>
            </div>
          </div>
          <Badge
            variant={totalSelected >= 3 ? 'default' : 'secondary'}
            className={totalSelected >= 3 ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {totalSelected >= 3 ? 'Target Met' : 'Suggested: 3+'}
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
            <Button
              size="sm"
              variant="outline"
              onClick={applyCommonPicks}
              className="bg-white border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              Apply All
            </Button>
          </div>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={v => setActiveTab(v as AmenityCategory)}
        className="w-full"
      >
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
                    <Badge
                      variant="secondary"
                      className="h-5 min-w-[1.25rem] px-1 bg-blue-100 text-blue-700 ml-1"
                    >
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
            <TabsContent
              key={category.key}
              value={category.key}
              className="mt-6 animate-in fade-in zoom-in-95 duration-200"
            >
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
                            'flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-slate-50',
                            isSelected ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100',
                          )}
                        >
                          <Checkbox checked={isSelected} className="mt-0.5" />
                          <span
                            className={cn(
                              'text-sm font-medium',
                              isSelected ? 'text-blue-900' : 'text-slate-700',
                            )}
                          >
                            {item.label}
                          </span>
                        </div>
                      );
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
            <Plus className="w-4 h-4" /> Custom Amenities & Features
          </h3>

          <div className="flex gap-2 max-w-lg mb-4">
            <Input
              placeholder="e.g. Helipad, Private Vineyard"
              value={customAmenityInput}
              onChange={e => setCustomAmenityInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCustomAmenity()}
            />
            <Button onClick={handleAddCustomAmenity} disabled={!customAmenityInput.trim()}>
              Add
            </Button>
          </div>

          {customAmenities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {customAmenities.map(name => (
                <Badge
                  key={name}
                  variant="outline"
                  className="pl-2 pr-1 py-1 bg-white border-slate-200 flex items-center gap-2"
                >
                  {name}
                  <button
                    onClick={() => handleRemoveCustomAmenity(name)}
                    className="hover:bg-slate-100 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3 text-slate-400 hover:text-red-500" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
