import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, MapPin, Info, Star, AlertTriangle, TrendingUp, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { useFieldValidation } from '@/hooks/useFieldValidation';
import { InlineError } from '@/components/ui/InlineError';
import { LocationMapPicker, LocationData } from '@/components/location/LocationMapPicker';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export function BasicDetailsStep() {
  const {
    developmentName,
    address,
    city,
    province,
    suburb,
    postalCode,
    latitude,
    longitude,
    gpsAccuracy,
    status,
    rating,
    totalUnits,
    projectSize,
    projectHighlights,
    setDevelopmentName,
    setAddress,
    setCity,
    setProvince,
    setSuburb,
    setPostalCode,
    setLatitude,
    setLongitude,
    setGpsAccuracy,
    setStatus,
    setRating,
    setTotalUnits,
    setProjectSize,
    addProjectHighlight,
    removeProjectHighlight,
  } = useDevelopmentWizard();

  const [manualOverride, setManualOverride] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);
  const [newHighlight, setNewHighlight] = useState('');

  // Validation context
  const validationContext = {
    currentStep: 0,
  };

  // Field validation
  const nameValidation = useFieldValidation({
    field: 'developmentName',
    value: developmentName,
    context: validationContext,
    trigger: 'blur',
  });

  const addressValidation = useFieldValidation({
    field: 'address',
    value: address,
    context: validationContext,
    trigger: 'blur',
  });

  const cityValidation = useFieldValidation({
    field: 'city',
    value: city,
    context: validationContext,
    trigger: 'blur',
  });

  const provinceValidation = useFieldValidation({
    field: 'province',
    value: province,
    context: validationContext,
    trigger: 'blur',
  });

  const handleLocationSelect = useCallback(
    (locationData: LocationData) => {
      if (!manualOverride) {
        setLatitude(locationData.latitude.toString());
        setLongitude(locationData.longitude.toString());
        
        // Set GPS accuracy based on geocoding result quality
        setGpsAccuracy(locationData.formattedAddress ? 'accurate' : 'approximate');

        if (locationData.address) setAddress(locationData.address);
        if (locationData.suburb) setSuburb(locationData.suburb);
        if (locationData.city) setCity(locationData.city);
        if (locationData.province) setProvince(locationData.province);
        if (locationData.postalCode) setPostalCode(locationData.postalCode);

        setGeocodingError(null);
        toast.success('Address populated from map location');
      }
    },
    [manualOverride, setAddress, setCity, setProvince, setSuburb, setPostalCode, setLatitude, setLongitude, setGpsAccuracy]
  );

  const handleManualEdit = useCallback(() => {
    setManualOverride(true);
    toast.info('Manual mode enabled. Move the pin to update address again.');
  }, []);

  const handleAddHighlight = () => {
    if (newHighlight.trim() && projectHighlights.length < 5) {
      addProjectHighlight(newHighlight.trim());
      setNewHighlight('');
      toast.success('Highlight added');
    } else if (projectHighlights.length >= 5) {
      toast.error('Maximum 5 highlights allowed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Development Name & Status */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">Development Information</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="developmentName" className="text-slate-700">
              Development Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="developmentName"
              placeholder="e.g., Eye of Africa, Waterfall Estate (minimum 5 characters)"
              value={developmentName}
              onChange={(e) => {
                setDevelopmentName(e.target.value);
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
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="now-selling">✅ Now Selling</SelectItem>
                <SelectItem value="launching-soon">🚀 Launching Soon</SelectItem>
                <SelectItem value="under-construction">🏗️ Under Construction</SelectItem>
                <SelectItem value="ready-to-move">🏠 Ready to Move</SelectItem>
                <SelectItem value="sold-out">⛔ Sold Out</SelectItem>
                <SelectItem value="phase-1-complete">📊 Phase 1 Complete / Phase 2 Launching</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">
              Current availability status of your development
            </p>
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
                value={rating || 0}
                disabled
                className="pl-9 bg-slate-50 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              System-computed rating based on reviews, track record, and satisfaction
            </p>
          </div>
        </div>
      </Card>

      {/* Location Details */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-800">Location Details</h3>
          </div>
          {gpsAccuracy && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              gpsAccuracy === 'accurate' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-orange-50 text-orange-700 border border-orange-200'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>GPS: {gpsAccuracy === 'accurate' ? 'Accurate' : 'Approximate'}</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Interactive Map - Always Visible */}
          <div className="mb-6">
            <LocationMapPicker
              initialLat={latitude ? parseFloat(latitude) : -26.2041}
              initialLng={longitude ? parseFloat(longitude) : 28.0473}
              onLocationSelect={handleLocationSelect}
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
              Street Address {!manualOverride && <span className="text-xs text-slate-500">(Auto-filled from map or enter manually)</span>}
            </Label>
            <Input
              id="address"
              placeholder="Enter street address or use map"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                addressValidation.clearError();
                handleManualEdit();
              }}
              onBlur={addressValidation.onBlur}
              className="mt-1"
              aria-invalid={!!addressValidation.error}
            />
            <InlineError
              error={addressValidation.error}
              show={!!addressValidation.error}
              size="sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="suburb" className="text-slate-700">Suburb</Label>
              <Input
                id="suburb"
                placeholder="e.g., Sandton"
                value={suburb || ''}
                onChange={(e) => setSuburb(e.target.value)}
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
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  cityValidation.clearError();
                }}
                onBlur={cityValidation.onBlur}
                className="mt-1"
                aria-invalid={!!cityValidation.error}
              />
              <InlineError
                error={cityValidation.error}
                show={!!cityValidation.error}
                size="sm"
              />
            </div>

            <div>
              <Label htmlFor="province" className="text-slate-700">
                Province <span className="text-red-500">*</span>
              </Label>
              <Select
                value={province}
                onValueChange={(value) => {
                  setProvince(value);
                  provinceValidation.clearError();
                }}
              >
                <SelectTrigger
                  id="province"
                  className="mt-1"
                  aria-invalid={!!provinceValidation.error}
                >
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
              <InlineError
                error={provinceValidation.error}
                show={!!provinceValidation.error}
                size="sm"
              />
            </div>

            <div>
              <Label htmlFor="postalCode" className="text-slate-700">Postal Code</Label>
              <Input
                id="postalCode"
                placeholder="e.g., 2196"
                value={postalCode || ''}
                onChange={(e) => setPostalCode(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Project Overview */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-bold text-slate-800">Project Overview</h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="totalUnits" className="text-slate-700">
                Total Number of Units <span className="text-red-500">*</span>
              </Label>
              <Input
                id="totalUnits"
                type="number"
                min="1"
                placeholder="e.g., 250"
                value={totalUnits || ''}
                onChange={(e) => setTotalUnits(parseInt(e.target.value) || 0)}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                Total units available in the entire development
              </p>
            </div>

            <div>
              <Label htmlFor="projectSize" className="text-slate-700">
                Project Size (Acres)
              </Label>
              <Input
                id="projectSize"
                type="number"
                min="0"
                step="0.1"
                placeholder="e.g., 5.15"
                value={projectSize || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setProjectSize(isNaN(val) ? undefined : val);
                }}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                Total land area of the project
              </p>
            </div>
          </div>

          {/* Project Highlights */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-slate-700">
                Key Project Highlights <span className="text-xs text-slate-500">(Maximum 5)</span>
              </Label>
              <span className="text-xs text-slate-500">
                {projectHighlights.length}/5
              </span>
            </div>
            
            {/* Existing Highlights */}
            {projectHighlights.length > 0 && (
              <div className="space-y-2 mb-3">
                {projectHighlights.map((highlight, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-slate-700">{highlight}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProjectHighlight(index)}
                      className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Highlight */}
            {projectHighlights.length < 5 && (
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Air Purification System, Rooftop Gym, Near Gautrain"
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
                  className="bg-blue-600 hover:bg-blue-700 px-6"
                >
                  Add
                </Button>
              </div>
            )}
            
            <p className="text-xs text-slate-500 mt-2">
              Top 5 selling points that differentiate your development (e.g., "24/7 Power Backup", "Fibre-Ready", "Pet Friendly")
            </p>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-2 text-sm text-slate-500 px-2">
        <Info className="w-4 h-4" />
        <p><span className="text-red-500">*</span> Required fields</p>
      </div>
    </div>
  );
}
