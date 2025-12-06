import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LocationMapPicker, LocationData } from '@/components/location/LocationMapPicker';
import { useFieldValidation } from '@/hooks/useFieldValidation';
import { InlineError } from '@/components/ui/InlineError';
import {
  Building2,
  MapPin,
  Info,
  Star,
  AlertTriangle,
  Sparkles,
  X,
  CheckCircle2,
  Image as ImageIcon,
  Video,
  Upload,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

// Development Amenities Options
const DEVELOPMENT_AMENITIES = [
  'Swimming Pool',
  'Clubhouse',
  'Jogging Trails',
  'Parks',
  'Braai Areas',
  'Security Features',
  'Fibre Ready',
  '24/7 Security',
  'CCTV Surveillance',
  'Access Control',
  'Gym / Fitness Center',
  'Playground',
  'Garden',
];

export function DevelopmentDetailsStep() {
  const {
    developmentData,
    setDevelopmentData,
    setLocation,
    addAmenity,
    removeAmenity,
    addHighlight,
    removeHighlight,
  } = useDevelopmentWizard();

  const [manualOverride, setManualOverride] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);
  const [newHighlight, setNewHighlight] = useState('');

  // Validation context
  const validationContext = {
    currentStep: 1,
  };

  // Field validation
  const nameValidation = useFieldValidation({
    field: 'developmentName',
    value: developmentData.name,
    context: validationContext,
    trigger: 'blur',
  });

  const handleLocationSelect = useCallback(
    (locationData: LocationData) => {
      if (!manualOverride) {
        setLocation({
          latitude: locationData.latitude.toString(),
          longitude: locationData.longitude.toString(),
          gpsAccuracy: locationData.formattedAddress ? 'accurate' : 'approximate',
          address: locationData.address || '',
          suburb: locationData.suburb || '',
          city: locationData.city || '',
          province: locationData.province || '',
          postalCode: locationData.postalCode || '',
        });

        setGeocodingError(null);
        toast.success('Address populated from map location');
      }
    },
    [manualOverride, setLocation]
  );

  const handleManualEdit = useCallback(() => {
    setManualOverride(true);
    toast.info('Manual mode enabled. Move the pin to update address again.');
  }, []);

  const handleAddHighlight = () => {
    if (newHighlight.trim() && developmentData.highlights.length < 5) {
      addHighlight(newHighlight.trim());
      setNewHighlight('');
      toast.success('Highlight added');
    } else if (developmentData.highlights.length >= 5) {
      toast.error('Maximum 5 highlights allowed');
    }
  };

  const toggleAmenity = (amenity: string) => {
    if (developmentData.amenities.includes(amenity)) {
      removeAmenity(amenity);
    } else {
      addAmenity(amenity);
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Information Section */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">Basic Information</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="developmentName" className="text-slate-700">
              Development Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="developmentName"
              placeholder="e.g., Eye of Africa, Waterfall Estate (minimum 5 characters)"
              value={developmentData.name}
              onChange={(e) => {
                setDevelopmentData({ name: e.target.value });
                nameValidation.clearError();
              }}
              onBlur={nameValidation.onBlur}
              className="mt-1"
              aria-invalid={!!nameValidation.error}
              aria-describedby={nameValidation.error ? 'developmentName-error' : undefined}
            />
            <InlineError
              error={nameValidation.error}
              show={!!nameValidation.error}
              size="sm"
            />
          </div>

          <div>
            <Label htmlFor="status" className="text-slate-700">
              Development Status <span className="text-red-500">*</span>
            </Label>
            <Select
              value={developmentData.status}
              onValueChange={(value: any) => setDevelopmentData({ status: value })}
            >
              <SelectTrigger id="status" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="now-selling">✅ Now Selling</SelectItem>
                <SelectItem value="launching-soon">🚀 Launching Soon</SelectItem>
                <SelectItem value="under-construction">🏗️ Under Construction</SelectItem>
                <SelectItem value="ready-to-move">🏠 Ready to Move</SelectItem>
                <SelectItem value="sold-out">⛔ Sold Out</SelectItem>
                <SelectItem value="phase-completed">📊 Phase Completed</SelectItem>
                <SelectItem value="new-phase-launching">🎉 New Phase Launching</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">
              Current availability status of your development
            </p>
          </div>

          <div>
            <Label htmlFor="completionDate" className="text-slate-700">
              Expected Completion Date (Optional)
            </Label>
            <Input
              id="completionDate"
              type="date"
              value={developmentData.completionDate || ''}
              onChange={(e) => setDevelopmentData({ completionDate: e.target.value })}
              className="mt-1 max-w-xs"
            />
          </div>

          <div>
            <Label htmlFor="developerName" className="text-slate-700">
              Developer Name <span className="text-xs text-slate-500">(Auto-filled - Read Only)</span>
            </Label>
            <Input
              id="developerName"
              value={developmentData.developerName}
              disabled
              className="mt-1 bg-slate-50 cursor-not-allowed"
            />
          </div>

          <div>
            <Label htmlFor="rating" className="text-slate-700">
              Rating <span className="text-xs text-slate-500">(Auto-calculated - Read Only)</span>
            </Label>
            <div className="relative mt-1">
              <Star className="absolute left-3 top-2.5 h-4 w-4 text-amber-400 fill-amber-400" />
              <Input
                id="rating"
                type="number"
                value={developmentData.rating || 0}
                disabled
                className="pl-9 bg-slate-50 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              System-computed rating based on reviews and track record
            </p>
          </div>

          <div>
            <Label htmlFor="description" className="text-slate-700">
              Project Description
            </Label>
            <Textarea
              id="description"
              placeholder="Describe your development project, its unique features, target market, and what makes it special..."
              value={developmentData.description}
              onChange={(e) => setDevelopmentData({ description: e.target.value })}
              rows={5}
              className="mt-1 resize-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              Provide a detailed description that will help potential buyers understand your development
            </p>
          </div>
        </div>
      </Card>

      {/* Location Section */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-800">Location</h3>
          </div>
          {developmentData.location.gpsAccuracy && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                developmentData.location.gpsAccuracy === 'accurate'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-orange-50 text-orange-700 border border-orange-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                GPS: {developmentData.location.gpsAccuracy === 'accurate' ? 'Accurate' : 'Approximate'}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Interactive Map */}
          <div className="mb-6">
            <LocationMapPicker
              initialLat={
                developmentData.location.latitude ? parseFloat(developmentData.location.latitude) : -26.2041
              }
              initialLng={
                developmentData.location.longitude ? parseFloat(developmentData.location.longitude) : 28.0473
              }
              onLocationSelect={handleLocationSelect}
              onGeocodingError={setGeocodingError}
            />
            {geocodingError && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{geocodingError}</AlertDescription>
              </Alert>
            )}
          </div>

          <div>
            <Label htmlFor="address" className="text-slate-700">
              Street Address{' '}
              {!manualOverride && (
                <span className="text-xs text-slate-500">(Auto-filled from map or enter manually)</span>
              )}
            </Label>
            <Input
              id="address"
              placeholder="Enter street address or use map"
              value={developmentData.location.address}
              onChange={(e) => {
                setLocation({ address: e.target.value });
                handleManualEdit();
              }}
              className="mt-1"
              disabled={developmentData.location.noOfficialStreet}
            />
          </div>

          {/* No Official Street Toggle */}
          <div className="flex items-start space-x-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <Checkbox
              id="no-official-street"
              checked={developmentData.location.noOfficialStreet}
              onCheckedChange={(checked) => {
                setLocation({ noOfficialStreet: checked as boolean });
                if (checked) {
                  setLocation({ address: '' });
                  toast.info('Street address validation disabled for new developments');
                }
              }}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label htmlFor="no-official-street" className="text-sm font-medium text-slate-700 cursor-pointer">
                No official street address yet
              </Label>
              <p className="text-xs text-slate-600 mt-1">
                Enable this for new developments that don't have an assigned street address. GPS coordinates will be
                used for location.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="suburb" className="text-slate-700">
                Suburb
              </Label>
              <Input
                id="suburb"
                placeholder="e.g., Sandton"
                value={developmentData.location.suburb || ''}
                onChange={(e) => setLocation({ suburb: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="city" className="text-slate-700">
                City <span className="text-red-500">*</span>
              </Label>
              <Input
                id="city"
                placeholder="e.g., Johannesburg"
                value={developmentData.location.city}
                onChange={(e) => setLocation({ city: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="province" className="text-slate-700">
                Province <span className="text-red-500">*</span>
              </Label>
              <Select
                value={developmentData.location.province}
                onValueChange={(value) => setLocation({ province: value })}
              >
                <SelectTrigger id="province" className="mt-1">
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gauteng">Gauteng</SelectItem>
                  <SelectItem value="Western Cape">Western Cape</SelectItem>
                  <SelectItem value="KwaZulu-Natal">KwaZulu-Natal</SelectItem>
                  <SelectItem value="Eastern Cape">Eastern Cape</SelectItem>
                  <SelectItem value="Free State">Free State</SelectItem>
                  <SelectItem value="Limpopo">Limpopo</SelectItem>
                  <SelectItem value="Mpumalanga">Mpumalanga</SelectItem>
                  <SelectItem value="North West">North West</SelectItem>
                  <SelectItem value="Northern Cape">Northern Cape</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="postalCode" className="text-slate-700">
                Postal Code
              </Label>
              <Input
                id="postalCode"
                placeholder="e.g., 2196"
                value={developmentData.location.postalCode || ''}
                onChange={(e) => setLocation({ postalCode: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Development Amenities Section */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-bold text-slate-800">Development Amenities</h3>
          </div>
          <Badge variant="secondary" className="bg-purple-50 text-purple-700">
            {developmentData.amenities.length} selected
          </Badge>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          Select shared amenities available to all residents. These will be inherited by all unit types.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {DEVELOPMENT_AMENITIES.map((amenity) => (
            <div
              key={amenity}
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${
                developmentData.amenities.includes(amenity)
                  ? 'bg-purple-50 border-purple-300 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-purple-200 hover:bg-purple-50/50'
              }`}
              onClick={() => toggleAmenity(amenity)}
            >
              <Checkbox
                id={amenity}
                checked={developmentData.amenities.includes(amenity)}
                onCheckedChange={() => toggleAmenity(amenity)}
                className="border-slate-300 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
              />
              <Label htmlFor={amenity} className="text-sm font-normal cursor-pointer text-slate-700 leading-tight">
                {amenity}
              </Label>
            </div>
          ))}
        </div>
      </Card>

      {/* Development Highlights Section */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-800">Development Highlights</h3>
          </div>
          <span className="text-xs text-slate-500">{developmentData.highlights.length}/5</span>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          Add up to 5 key selling points that differentiate your development (e.g., "2 min from schools", "Close to
          Mall of the South")
        </p>

        {/* Existing Highlights */}
        {developmentData.highlights.length > 0 && (
          <div className="space-y-2 mb-3">
            {developmentData.highlights.map((highlight, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-100"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-slate-700">{highlight}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeHighlight(index)}
                  className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Highlight */}
        {developmentData.highlights.length < 5 && (
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Walking distance to schools, Near Gautrain station"
              value={newHighlight}
              onChange={(e) => setNewHighlight(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddHighlight();
                }
              }}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={handleAddHighlight}
              disabled={!newHighlight.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 px-6"
            >
              Add
            </Button>
          </div>
        )}
      </Card>

      {/* Development Media Section - Placeholder */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">Development Media</h3>
        </div>

        <div className="space-y-6">
          {/* Hero Image */}
          <div>
            <Label className="text-slate-700 mb-2 block">Hero Image</Label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600">Click to upload hero image</p>
              <p className="text-xs text-slate-500 mt-1">Recommended: 1920x1080px</p>
            </div>
          </div>

          {/* Development Photos */}
          <div>
            <Label className="text-slate-700 mb-2 block">Development Photos</Label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
              <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600">Click to upload photos or drag & drop</p>
              <p className="text-xs text-slate-500 mt-1">Multiple images supported</p>
            </div>
          </div>

          {/* Development Videos */}
          <div>
            <Label className="text-slate-700 mb-2 block">Development Videos</Label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
              <Video className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600">Click to upload videos or enter URLs</p>
              <p className="text-xs text-slate-500 mt-1">Video files or YouTube/Vimeo links</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-2 text-sm text-slate-500 px-2">
        <Info className="w-4 h-4" />
        <p>
          <span className="text-red-500">*</span> Required fields
        </p>
      </div>
    </div>
  );
}
