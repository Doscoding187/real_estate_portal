import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  X,
  Sparkles,
  FileText,
  Calendar,
  Plus,
  Waves,
  Dumbbell,
  Shield,
  Car,
  Users,
  Wind,
  Wifi,
  Building,
  Home,
  Wrench,
  CheckCircle2,
} from 'lucide-react';
import { useState } from 'react';
import { useFieldValidation } from '@/hooks/useFieldValidation';
import { InlineError } from '@/components/ui/InlineError';

// Master Amenity List - Property24/SquareYards Standard
const MASTER_AMENITIES = [
  { icon: Waves, label: 'Swimming Pool', category: 'leisure' },
  { icon: Dumbbell, label: 'Gym / Fitness Center', category: 'leisure' },
  { icon: Shield, label: '24/7 Security', category: 'security' },
  { icon: Shield, label: 'CCTV Surveillance', category: 'security' },
  { icon: Shield, label: 'Access Control', category: 'security' },
  { icon: Shield, label: 'Biometric Entry', category: 'security' },
  { icon: Car, label: 'Covered Parking', category: 'parking' },
  { icon: Car, label: 'Visitor Parking', category: 'parking' },
  { icon: Car, label: 'Underground Parking', category: 'parking' },
  { icon: Users, label: 'Playground', category: 'family' },
  { icon: Users, label: 'Crèche / Daycare', category: 'family' },
  { icon: Home, label: 'Garden / Park', category: 'outdoor' },
  { icon: Home, label: 'Rooftop Terrace', category: 'outdoor' },
  { icon: Home, label: 'Braai Area', category: 'outdoor' },
  { icon: Building, label: 'Clubhouse', category: 'social' },
  { icon: Building, label: 'Function Room', category: 'social' },
  { icon: Building, label: 'Concierge Service', category: 'services' },
  { icon: Wind, label: 'Backup Power / Generator', category: 'utilities' },
  { icon: Wind, label: 'Solar Power', category: 'utilities' },
  { icon: Wifi, label: 'Fiber Internet Ready', category: 'utilities' },
  { icon: Building, label: 'Elevator / Lift', category: 'building' },
  { icon: Users, label: 'Pet Friendly', category: 'lifestyle' },
  { icon: Waves, label: 'Spa / Sauna', category: 'leisure' },
  { icon: Users, label: 'Tennis Court', category: 'leisure' },
  { icon: Wifi, label: 'Smart Home Ready', category: 'technology' },
];

// Specifications Options
const SPECIFICATIONS = {
  walls: [
    'Painted Walls',
    'Plastered & Painted',
    'Feature Walls',
    'Textured Finish',
    'Wallpaper Ready',
  ],
  flooring: [
    'Tiled Throughout',
    'Vinyl Flooring',
    'Laminate Flooring',
    'Engineered Wood',
    'Porcelain Tiles',
    'Concrete Screed',
  ],
  kitchen: [
    'Gas Stove Connection',
    'Electric Stove Connection',
    'Built-in Cupboards',
    'Granite Countertops',
    'Quartz Countertops',
    'Plumbing for Appliances',
    'Extractor Fan',
  ],
  bathrooms: [
    'Shower Only',
    'Bath & Shower',
    'Bathtub',
    'Premium Fittings',
    'Standard Fittings',
    'Wall-mounted Toilet',
    'Built-in Medicine Cabinet',
  ],
  structure: [
    'Concrete Frame',
    'Brick & Mortar',
    'Steel Frame',
    'Double-brick Walls',
    'Insulated Roof',
    'Aluminum Windows',
    'UPVC Windows',
  ],
};

export function HighlightsStep() {
  const {
    description,
    amenities,
    highlights,
    completionDate,
    specifications,
    setDescription,
    setAmenities,
    setHighlights,
    setCompletionDate,
    setSpecifications,
  } = useDevelopmentWizard();

  const [newHighlight, setNewHighlight] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Validation
  const descriptionValidation = useFieldValidation({
    field: 'description',
    value: description,
    context: { currentStep: 3 },
    trigger: 'blur',
  });

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(MASTER_AMENITIES.map(a => a.category)))];

  // Filter amenities by category
  const filteredAmenities =
    selectedCategory === 'all'
      ? MASTER_AMENITIES
      : MASTER_AMENITIES.filter(a => a.category === selectedCategory);

  const toggleAmenity = (amenity: string) => {
    if (amenities.includes(amenity)) {
      setAmenities(amenities.filter(a => a !== amenity));
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
    setHighlights(highlights.filter(h => h !== highlight));
  };

  const toggleSpecification = (category: keyof typeof specifications, item: string) => {
    const current = specifications[category] || [];
    const updated = current.includes(item) ? current.filter(i => i !== item) : [...current, item];
    setSpecifications({ ...specifications, [category]: updated });
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">Development Description</h3>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-slate-700">
            About the Development <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="description"
            placeholder="Describe the development, its location, unique selling points, and what makes it special (minimum 50 characters)..."
            value={description}
            onChange={e => {
              setDescription(e.target.value);
              descriptionValidation.clearError();
            }}
            onBlur={descriptionValidation.onBlur}
            rows={6}
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
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="completionDate" className="text-slate-700">
            Expected Completion Date (Optional)
          </Label>
          <Input
            id="completionDate"
            type="date"
            value={completionDate || ''}
            onChange={e => setCompletionDate(e.target.value)}
            className="max-w-xs"
          />
        </div>
      </Card>

      {/* Master Amenities List */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-bold text-slate-800">Development Amenities</h3>
          </div>
          <Badge variant="secondary" className="bg-purple-50 text-purple-700">
            {amenities.length} selected
          </Badge>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-slate-200">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Amenities Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredAmenities.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${
                amenities.includes(label)
                  ? 'bg-purple-50 border-purple-300 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-purple-200 hover:bg-purple-50/50'
              }`}
              onClick={() => toggleAmenity(label)}
            >
              <Checkbox
                id={label}
                checked={amenities.includes(label)}
                onCheckedChange={() => toggleAmenity(label)}
                className="border-slate-300 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
              />
              <Icon className="w-4 h-4 text-purple-600 flex-shrink-0" />
              <Label
                htmlFor={label}
                className="text-sm font-normal cursor-pointer text-slate-700 leading-tight"
              >
                {label}
              </Label>
            </div>
          ))}
        </div>

        {/* Custom Highlights */}
        <div className="space-y-3 pt-6 mt-6 border-t border-slate-200">
          <Label htmlFor="highlights" className="text-slate-700 font-medium">
            Additional Highlights (Optional)
          </Label>
          <p className="text-xs text-slate-500">
            Add unique features not listed above (e.g., "North-East Facing", "Near Top Schools")
          </p>
          <div className="flex gap-2">
            <Input
              id="highlights"
              placeholder="e.g., Ocean Views, Walking Distance to Mall"
              value={newHighlight}
              onChange={e => setNewHighlight(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addHighlight())}
            />
            <button
              type="button"
              onClick={addHighlight}
              disabled={!newHighlight.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          {highlights.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {highlights.map((highlight, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                >
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
      </Card>

      {/* Specifications Section */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wrench className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-bold text-slate-800">Specifications & Finishes</h3>
        </div>
        <p className="text-sm text-slate-600 mb-6">
          Select the standard finishes and specifications included in units
        </p>

        {/* Walls */}
        <div className="space-y-4 mb-6">
          <Label className="text-slate-700 font-semibold flex items-center gap-2">
            <Home className="w-4 h-4 text-blue-600" />
            Walls & Paintwork
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {SPECIFICATIONS.walls.map(item => (
              <div
                key={item}
                className={`flex items-center space-x-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  specifications.walls?.includes(item)
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white border-slate-200 hover:border-blue-200'
                }`}
                onClick={() => toggleSpecification('walls', item)}
              >
                <Checkbox
                  id={`walls-${item}`}
                  checked={specifications.walls?.includes(item) || false}
                  onCheckedChange={() => toggleSpecification('walls', item)}
                  className="border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <Label htmlFor={`walls-${item}`} className="text-sm cursor-pointer text-slate-700">
                  {item}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Flooring */}
        <div className="space-y-4 mb-6">
          <Label className="text-slate-700 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Flooring
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {SPECIFICATIONS.flooring.map(item => (
              <div
                key={item}
                className={`flex items-center space-x-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  specifications.flooring?.includes(item)
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-white border-slate-200 hover:border-emerald-200'
                }`}
                onClick={() => toggleSpecification('flooring', item)}
              >
                <Checkbox
                  id={`flooring-${item}`}
                  checked={specifications.flooring?.includes(item) || false}
                  onCheckedChange={() => toggleSpecification('flooring', item)}
                  className="border-slate-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                />
                <Label
                  htmlFor={`flooring-${item}`}
                  className="text-sm cursor-pointer text-slate-700"
                >
                  {item}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Kitchen */}
        <div className="space-y-4 mb-6">
          <Label className="text-slate-700 font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            Kitchen Finishes
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {SPECIFICATIONS.kitchen.map(item => (
              <div
                key={item}
                className={`flex items-center space-x-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  specifications.kitchen?.includes(item)
                    ? 'bg-amber-50 border-amber-300'
                    : 'bg-white border-slate-200 hover:border-amber-200'
                }`}
                onClick={() => toggleSpecification('kitchen', item)}
              >
                <Checkbox
                  id={`kitchen-${item}`}
                  checked={specifications.kitchen?.includes(item) || false}
                  onCheckedChange={() => toggleSpecification('kitchen', item)}
                  className="border-slate-300 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                />
                <Label
                  htmlFor={`kitchen-${item}`}
                  className="text-sm cursor-pointer text-slate-700"
                >
                  {item}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Bathrooms */}
        <div className="space-y-4 mb-6">
          <Label className="text-slate-700 font-semibold flex items-center gap-2">
            <Waves className="w-4 h-4 text-cyan-600" />
            Bathroom Finishes
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {SPECIFICATIONS.bathrooms.map(item => (
              <div
                key={item}
                className={`flex items-center space-x-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  specifications.bathrooms?.includes(item)
                    ? 'bg-cyan-50 border-cyan-300'
                    : 'bg-white border-slate-200 hover:border-cyan-200'
                }`}
                onClick={() => toggleSpecification('bathrooms', item)}
              >
                <Checkbox
                  id={`bathrooms-${item}`}
                  checked={specifications.bathrooms?.includes(item) || false}
                  onCheckedChange={() => toggleSpecification('bathrooms', item)}
                  className="border-slate-300 data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-600"
                />
                <Label
                  htmlFor={`bathrooms-${item}`}
                  className="text-sm cursor-pointer text-slate-700"
                >
                  {item}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Structure */}
        <div className="space-y-4">
          <Label className="text-slate-700 font-semibold flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-600" />
            Building Structure
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {SPECIFICATIONS.structure.map(item => (
              <div
                key={item}
                className={`flex items-center space-x-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  specifications.structure?.includes(item)
                    ? 'bg-slate-100 border-slate-400'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => toggleSpecification('structure', item)}
              >
                <Checkbox
                  id={`structure-${item}`}
                  checked={specifications.structure?.includes(item) || false}
                  onCheckedChange={() => toggleSpecification('structure', item)}
                  className="border-slate-300 data-[state=checked]:bg-slate-700 data-[state=checked]:border-slate-700"
                />
                <Label
                  htmlFor={`structure-${item}`}
                  className="text-sm cursor-pointer text-slate-700"
                >
                  {item}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="flex items-start gap-2 text-sm text-slate-500 px-2 bg-orange-50 p-4 rounded-lg border border-orange-100">
        <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-600" />
        <div>
          <p className="font-medium text-orange-900 mb-1">Amenities & Specifications Tips:</p>
          <ul className="text-xs text-orange-800 space-y-1">
            <li>• Select all amenities that enhance your development's appeal</li>
            <li>• Specifications help buyers understand the quality and finish standards</li>
            <li>• More details = higher buyer confidence and faster sales</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
