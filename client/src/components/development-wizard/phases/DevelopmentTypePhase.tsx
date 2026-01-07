import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, TreePine, Briefcase, Layers, ArrowRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  DEVELOPMENT_TYPE_OPTIONS, 
  type DevelopmentType 
} from '@/types/wizardTypes';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { toast } from 'sonner';

const ICONS: Record<DevelopmentType, typeof Building2> = {
  residential: Building2,
  mixed_use: Layers,
  land: TreePine,
  commercial: Briefcase,
};

export function DevelopmentTypePhase() {
  const { developmentType, setDevelopmentType, setPhase } = useDevelopmentWizard();

  // Auto-select Residential as strict default
  React.useEffect(() => {
    if (!developmentType) {
      setDevelopmentType('residential');
    }
  }, [developmentType, setDevelopmentType]);

  const handleSelect = (type: DevelopmentType) => {
    const option = DEVELOPMENT_TYPE_OPTIONS.find(o => o.value === type);
    
    if (!option?.enabled) {
      toast.info(`${option?.label} is coming soon!`);
      return;
    }
    
    setDevelopmentType(type);
  };

  const handleContinue = () => {
    if (!developmentType) {
      toast.error('Please select a development type');
      return;
    }
    
    const option = DEVELOPMENT_TYPE_OPTIONS.find(o => o.value === developmentType);
    if (!option?.enabled) {
      toast.error('This development type is not yet available');
      return;
    }
    
    // Navigate to next phase (residentialConfig for residential)
    setPhase(3); // Configuration
  };

  const handleBack = () => {
    setPhase(1); // Back to Representation
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
          What type of development are you listing?
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Select the category that best describes your development. 
          This will configure the wizard to show relevant options.
        </p>
      </div>

      {/* Development Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {DEVELOPMENT_TYPE_OPTIONS.map((option) => {
          const Icon = ICONS[option.value];
          const isSelected = developmentType === option.value;
          const isDisabled = !option.enabled;
          
          return (
            <Card
              key={option.value}
              className={cn(
                "relative cursor-pointer transition-all duration-300 overflow-hidden group",
                isSelected 
                  ? "border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 ring-2 ring-blue-500 shadow-lg" 
                  : isDisabled
                    ? "border-slate-200 bg-slate-50/50 opacity-60"
                    : "border-slate-200 hover:border-blue-300 hover:shadow-md hover:scale-[1.02]"
              )}
              onClick={() => handleSelect(option.value)}
            >
              {/* Coming Soon Badge */}
              {isDisabled && (
                <div className="absolute top-3 right-3 z-10">
                  <Badge variant="secondary" className="bg-slate-200 text-slate-600 text-xs">
                    <Lock className="w-3 h-3 mr-1" />
                    Coming Soon
                  </Badge>
                </div>
              )}
              
              <CardContent className="p-8 flex flex-col items-center text-center">
                {/* Icon */}
                <div className={cn(
                  "p-5 rounded-2xl transition-all duration-300 mb-5",
                  isSelected 
                    ? "bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-md" 
                    : isDisabled
                      ? "bg-slate-100 text-slate-400"
                      : "bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600"
                )}>
                  <Icon className="w-10 h-10" />
                </div>
                
                {/* Title */}
                <h3 className={cn(
                  "font-bold text-lg mb-2",
                  isSelected ? "text-blue-900" : isDisabled ? "text-slate-400" : "text-slate-900"
                )}>
                  {option.label}
                </h3>
                
                {/* Description */}
                <p className={cn(
                  "text-sm leading-relaxed",
                  isDisabled ? "text-slate-400" : "text-slate-600"
                )}>
                  {option.description}
                </p>

                {/* Selected Indicator */}
                {isSelected && (
                  <div className="mt-4 text-blue-600 font-medium text-sm flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                    Selected
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6 max-w-lg mx-auto">
        <Button 
          variant="outline"
          onClick={handleBack}
          className="px-6 h-12 border-slate-300"
        >
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!developmentType || !DEVELOPMENT_TYPE_OPTIONS.find(o => o.value === developmentType)?.enabled}
          size="lg"
          className="px-10 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300"
        >
          Continue
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
