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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Classification</h2>
        <p className="text-slate-500">Define the type and structure of your development.</p>
      </div>

      <div className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {types.map((type) => {
            const Icon = type.icon;
            const isSelected = classification.type === type.id;
            return (
              <Card 
                key={type.id}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:border-blue-400 hover:shadow-md relative overflow-hidden",
                  isSelected ? "border-blue-600 bg-blue-50/30 ring-1 ring-blue-600" : "border-slate-200"
                )}
                onClick={() => setClassification({ type: type.id as any })}
              >
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <div className={cn(
                    "p-3 rounded-full transition-colors",
                    isSelected ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                  )}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{type.label}</h3>
                    <p className="text-xs text-slate-500 mt-1">{type.desc}</p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-3 right-3 text-blue-600">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
            <CardDescription>Specific details about the ownership and zoning.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Sub-Type</Label>
              <Select 
                value={classification.subType} 
                onValueChange={(val) => setClassification({ subType: val })}
              >
                <SelectTrigger>
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
              <Label>Ownership Type</Label>
              <Select 
                value={classification.ownership} 
                onValueChange={(val: any) => setClassification({ ownership: val })}
              >
                <SelectTrigger>
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

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={() => setPhase(1)}>Back</Button>
        <Button onClick={handleNext} size="lg" className="px-8">Continue</Button>
      </div>
    </div>
  );
}