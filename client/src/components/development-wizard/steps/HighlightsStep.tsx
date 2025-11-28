import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { X, Sparkles, FileText, Calendar, Plus } from 'lucide-react';
import { useState } from 'react';
import { useFieldValidation } from '@/hooks/useFieldValidation';
import { InlineError } from '@/components/ui/InlineError';

const commonAmenities = [
  'Swimming Pool',
  'Gym / Fitness Center',
  '24/7 Security',
  'Covered Parking',
  'Visitor Parking',
  'Playground',
  'Garden / Park',
  'Clubhouse',
  'Braai Area',
  'Pet Friendly',
  'Backup Power',
  'Fiber Internet',
  'Elevator',
  'Concierge Service',
];

export function HighlightsStep() {
  const {
    description,
    amenities,
    highlights,
    completionDate,
    totalUnits,
    setDescription,
    setAmenities,
    setHighlights,
    setCompletionDate,
    setTotalUnits,
  } = useDevelopmentWizard();

  const [newHighlight, setNewHighlight] = useState('');

  // Validation
  const descriptionValidation = useFieldValidation({
    field: 'description',
    value: description,
    context: { currentStep: 2 },
    trigger: 'blur',
  });

  const totalUnitsValidation = useFieldValidation({
    field: 'totalUnits',
    value: totalUnits,
    context: { currentStep: 2 },
    trigger: 'blur',
  });

  const toggleAmenity = (amenity: string) => {
    if (amenities.includes(amenity)) {
      setAmenities(amenities.filter((a) => a !== amenity));
    } else {
      setAmenities([...amenities, amenity]);
    }
  };

  const addHighlight = () => {
    if (newHighlight.trim() && !highlights.includes(newHighlight.trim())) {
      setHighlights([...highlights, newHighlight.trim()]);
      setNewHighlight('');
    }
  };

  const removeHighlight = (highlight: string) => {
    setHighlights(highlights.filter((h) => h !== highlight));
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">Description</h3>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description" className="text-slate-700">
            About the Development <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="description"
            placeholder="Describe the development, its location, and what makes it special (minimum 50 characters)..."
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              descriptionValidation.clearError();
            }}
            onBlur={descriptionValidation.onBlur}
            rows={5}
            className="resize-none"
            aria-invalid={!!descriptionValidation.error}
          />
          <div className="flex items-center justify-between">
            <InlineError
              error={descriptionValidation.error}
              show={!!descriptionValidation.error}
              size="sm"
            />
            <p className="text-xs text-slate-500">{description.length}/5000 characters</p>
          </div>
          <p className="text-xs text-slate-500 text-right">{description.length} characters</p>
        </div>
      </Card>

      {/* Development Details */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-slate-800">Key Details</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="totalUnits" className="text-slate-700">Total Units in Development</Label>
            <Input
              id="totalUnits"
              type="number"
              min="0"
              placeholder="e.g., 120"
              value={totalUnits || ''}
              onChange={(e) => setTotalUnits(parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="completionDate" className="text-slate-700">Expected Completion Date</Label>
            <Input
              id="completionDate"
              type="date"
              value={completionDate || ''}
              onChange={(e) => setCompletionDate(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Amenities */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-bold text-slate-800">Amenities & Features</h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {commonAmenities.map((amenity) => (
              <div key={amenity} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <Checkbox
                  id={amenity}
                  checked={amenities.includes(amenity)}
                  onCheckedChange={() => toggleAmenity(amenity)}
                  className="border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <Label
                  htmlFor={amenity}
                  className="text-sm font-normal cursor-pointer text-slate-700"
                >
                  {amenity}
                </Label>
              </div>
            ))}
          </div>

          {/* Custom Highlights */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <Label htmlFor="highlights" className="text-slate-700 font-medium">Additional Highlights</Label>
            <div className="flex gap-2">
              <Input
                id="highlights"
                placeholder="e.g., North-East Facing, Near Shopping Mall"
                value={newHighlight}
                onChange={(e) => setNewHighlight(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHighlight())}
              />
              <button
                type="button"
                onClick={addHighlight}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {highlights.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {highlights.map((highlight, index) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100">
                    {highlight}
                    <button
                      onClick={() => removeHighlight(highlight)}
                      className="ml-2 hover:text-red-600 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-2 text-sm text-slate-500 px-2">
        <Sparkles className="w-4 h-4" />
        <p>Highlight what makes your development unique and attractive to buyers</p>
      </div>
    </div>
  );
}
