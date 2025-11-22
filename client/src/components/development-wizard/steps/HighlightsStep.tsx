import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useState } from 'react';

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
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Development Highlights</h2>
        <p className="text-slate-600">Describe your development and its key features</p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">
          Description <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="description"
          placeholder="Describe the development, its location, and what makes it special..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
        />
        <p className="text-sm text-slate-500">{description.length} characters</p>
      </div>

      {/* Development Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="totalUnits">Total Units in Development</Label>
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
          <Label htmlFor="completionDate">Expected Completion Date</Label>
          <Input
            id="completionDate"
            type="date"
            value={completionDate || ''}
            onChange={(e) => setCompletionDate(e.target.value)}
          />
        </div>
      </div>

      {/* Amenities */}
      <div className="space-y-3">
        <Label>Amenities & Features</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {commonAmenities.map((amenity) => (
            <div key={amenity} className="flex items-center space-x-2">
              <Checkbox
                id={amenity}
                checked={amenities.includes(amenity)}
                onCheckedChange={() => toggleAmenity(amenity)}
              />
              <Label
                htmlFor={amenity}
                className="text-sm font-normal cursor-pointer"
              >
                {amenity}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Highlights */}
      <div className="space-y-3">
        <Label htmlFor="highlights">Additional Highlights</Label>
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
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add
          </button>
        </div>

        {highlights.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {highlights.map((highlight, index) => (
              <Badge key={index} variant="secondary" className="px-3 py-1">
                {highlight}
                <button
                  onClick={() => removeHighlight(highlight)}
                  className="ml-2 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-200">
        <p className="text-sm text-slate-600">
          Highlight what makes your development unique and attractive to buyers
        </p>
      </div>
    </div>
  );
}
