import React from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Home, Building2, Layers, Trees, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ClassificationPhase() {
  const { 
    classification, 
    setClassification, 
    setPhase, 
    validatePhase 
  } = useDevelopmentWizard();

  const handleNext = () => {
    const { isValid, errors } = validatePhase(2);
    if (isValid) {
      setPhase(3);
    } else {
      errors.forEach(e => toast.error(e));
    }
  };

  const types = [
    { id: 'residential', label: 'Residential', icon: Home, desc: 'Apartments, houses, or complexes' },
    { id: 'commercial', label: 'Commercial', icon: Building2, desc: 'Office parks, retail, or industrial' },
    { id: 'mixed', label: 'Mixed Use', icon: Layers, desc: 'Combination of residential and commercial' },
    { id: 'land', label: 'Vacant Land', icon: Trees, desc: 'Plots, erven, or farm land' },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="text-center md:text-left">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Classification</h2>
        <p className="text-slate-600">Define the type and structure of your development.</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {types.map((type) => {
            const Icon = type.icon;
            const isSelected = classification.type === type.id;
            return (
              <Card 
                key={type.id}
                className={cn(
                  "cursor-pointer transition-all duration-300 hover:scale-105 relative overflow-hidden group",
                  isSelected 
                    ? "border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 ring-2 ring-blue-500 shadow-lg" 
                    : "border-slate-200 hover:border-blue-300 hover:shadow-md"
                )}
                onClick={() => setClassification({ type: type.id as any })}
              >
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <div className={cn(
                    "p-4 rounded-xl transition-all duration-300",
                    isSelected 
                      ? "bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-md" 
                      : "bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600"
                  )}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className={cn(
                      "font-semibold text-base",
                      isSelected ? "text-blue-900" : "text-slate-900"
                    )}>
                      {type.label}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{type.desc}</p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <div className="p-1 bg-white rounded-full shadow-md">
                        <Check className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-slate-200/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-slate-900">Additional Details</CardTitle>
            <CardDescription className="text-slate-600">Specific details about the ownership and zoning.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Sub-Type</Label>
              <Select 
                value={classification.subType} 
                onValueChange={(val) => setClassification({ subType: val })}
              >
                <SelectTrigger className="h-11 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20">
                  <SelectValue placeholder="Select specific type" />
                </SelectTrigger>
                <SelectContent>
                  {classification.type === 'residential' && (
                    <>
                      <SelectItem value="apartment">Apartment Block</SelectItem>
                      <SelectItem value="estate">Security Estate</SelectItem>
                      <SelectItem value="townhouse">Townhouse Complex</SelectItem>
                      <SelectItem value="retirement">Retirement Village</SelectItem>
                    </>
                  )}
                  {classification.type === 'commercial' && (
                    <>
                      <SelectItem value="office">Office Park</SelectItem>
                      <SelectItem value="retail">Retail Centre</SelectItem>
                      <SelectItem value="industrial">Industrial Park</SelectItem>
                    </>
                  )}
                  {classification.type === 'mixed' && (
                    <>
                      <SelectItem value="urban">Urban Precinct</SelectItem>
                      <SelectItem value="lifestyle">Lifestyle Centre</SelectItem>
                    </>
                  )}
                  {classification.type === 'land' && (
                    <>
                      <SelectItem value="residential-land">Residential Plots</SelectItem>
                      <SelectItem value="commercial-land">Commercial Land</SelectItem>
                      <SelectItem value="farm">Farm / Agricultural</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Ownership Type</Label>
              <Select 
                value={classification.ownership} 
                onValueChange={(val: any) => setClassification({ ownership: val })}
              >
                <SelectTrigger className="h-11 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20">
                  <SelectValue placeholder="Select ownership model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sectional-title">Sectional Title</SelectItem>
                  <SelectItem value="full-title">Full Title / Freehold</SelectItem>
                  <SelectItem value="leasehold">Leasehold</SelectItem>
                  <SelectItem value="life-rights">Life Rights</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between pt-8 mt-8 border-t border-slate-200">
        <Button 
          variant="outline" 
          onClick={() => setPhase(1)}
          className="px-6 h-11 border-slate-300"
        >
          Back
        </Button>
        <Button 
          onClick={handleNext} 
          size="lg" 
          className="px-8 h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300"
        >
          Continue to Overview
        </Button>
      </div>
    </div>
  );
}