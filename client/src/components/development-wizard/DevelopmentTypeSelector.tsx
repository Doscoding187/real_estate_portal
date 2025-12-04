import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Layers, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DevelopmentTypeSelectorProps {
  onSelect: (type: 'master' | 'phase') => void;
  initialSelection?: 'master' | 'phase' | null;
}

export function DevelopmentTypeSelector({ onSelect, initialSelection = null }: DevelopmentTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<'master' | 'phase' | null>(initialSelection);

  const handleSelect = (type: 'master' | 'phase') => {
    setSelectedType(type);
  };

  const handleContinue = () => {
    if (selectedType) {
      onSelect(selectedType);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          What would you like to add?
        </h2>
        <p className="text-slate-600 text-lg">
          Choose whether you're creating a new development or adding a phase to an existing one
        </p>
      </div>

      {/* Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* New Development Card */}
        <Card
          className={cn(
            "relative p-8 cursor-pointer transition-all duration-300 hover:shadow-2xl border-2",
            selectedType === 'master'
              ? "border-blue-500 bg-blue-50/50 shadow-xl scale-105"
              : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
          )}
          onClick={() => handleSelect('master')}
        >
          {/* Selection Indicator */}
          {selectedType === 'master' && (
            <div className="absolute top-4 right-4">
              <CheckCircle2 className="w-6 h-6 text-blue-600 fill-blue-100" />
            </div>
          )}

          {/* Icon */}
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors",
            selectedType === 'master'
              ? "bg-blue-600"
              : "bg-gradient-to-br from-blue-500 to-indigo-600"
          )}>
            <Building2 className="w-8 h-8 text-white" />
          </div>

          {/* Content */}
          <h3 className="text-2xl font-bold text-slate-800 mb-3">
            New Development
          </h3>
          <p className="text-slate-600 mb-4 leading-relaxed">
            Create a brand new master development from scratch. Perfect for launching a new residential project, estate, or complex.
          </p>

          {/* Features List */}
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">✓</span>
              <span>Full project details and specifications</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">✓</span>
              <span>Location mapping and address setup</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">✓</span>
              <span>Unit types, amenities, and media</span>
            </li>
          </ul>
        </Card>

        {/* New Phase Card */}
        <Card
          className={cn(
            "relative p-8 cursor-pointer transition-all duration-300 hover:shadow-2xl border-2",
            selectedType === 'phase'
              ? "border-purple-500 bg-purple-50/50 shadow-xl scale-105"
              : "border-slate-200 hover:border-purple-300 hover:bg-slate-50"
          )}
          onClick={() => handleSelect('phase')}
        >
          {/* Selection Indicator */}
          {selectedType === 'phase' && (
            <div className="absolute top-4 right-4">
              <CheckCircle2 className="w-6 h-6 text-purple-600 fill-purple-100" />
            </div>
          )}

          {/* Icon */}
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors",
            selectedType === 'phase'
              ? "bg-purple-600"
              : "bg-gradient-to-br from-purple-500 to-pink-600"
          )}>
            <Layers className="w-8 h-8 text-white" />
          </div>

          {/* Content */}
          <h3 className="text-2xl font-bold text-slate-800 mb-3">
            New Phase / Extension
          </h3>
          <p className="text-slate-600 mb-4 leading-relaxed">
            Add a new phase or extension to an existing development. Ideal for expanding your project with additional units or blocks.
          </p>

          {/* Features List */}
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-purple-600 mt-0.5">✓</span>
              <span>Link to existing master development</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 mt-0.5">✓</span>
              <span>Simplified phase-specific details</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 mt-0.5">✓</span>
              <span>Inherits location from parent</span>
            </li>
          </ul>
        </Card>
      </div>

      {/* Continue Button */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={handleContinue}
          disabled={!selectedType}
          size="lg"
          className={cn(
            "px-8 py-6 text-lg font-semibold shadow-lg transition-all duration-300",
            selectedType === 'master' && "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700",
            selectedType === 'phase' && "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700",
            !selectedType && "bg-slate-300"
          )}
        >
          Continue
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
