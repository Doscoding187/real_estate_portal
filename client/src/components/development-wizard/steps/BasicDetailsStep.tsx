import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, MapPin, Info, Star, Eye, EyeOff, AlertTriangle } from 'lucide-react';
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
    status,
    rating,
    setDevelopmentName,
    setAddress,
    setCity,
    setProvince,
    setSuburb,
    setPostalCode,
    setLatitude,
    setLongitude,
    setStatus,
    setRating,
  } = useDevelopmentWizard();

  const [showMap, setShowMap] = useState(true);
  const [manualOverride, setManualOverride] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);

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

        if (locationData.address) setAddress(locationData.address);
        if (locationData.suburb) setSuburb(locationData.suburb);
        if (locationData.city) setCity(locationData.city);
        if (locationData.province) setProvince(locationData.province);
        if (locationData.postalCode) setPostalCode(locationData.postalCode);

        setGeocodingError(null);
        toast.success('Address populated from map location');
      }
    },
    [manualOverride, setAddress, setCity, setProvince, setSuburb, setPostalCode, setLatitude, setLongitude]
  );

  const handleManualEdit = useCallback(() => {
    setManualOverride(true);
    toast.info('Manual mode enabled. Move the pin to update address again.');
  }, []);

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
                <SelectItem value="pre-launch">Pre-Launch</SelectItem>
                <SelectItem value="launching-soon">Launching Soon</SelectItem>
                <SelectItem value="now-selling">Now Selling</SelectItem>
                <SelectItem value="sold-out">Sold Out</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">
              Current availability status of your development
            </p>
          </div>

          <div>
            <Label htmlFor="rating" className="text-slate-700">Rating (Optional)</Label>
            <div className="relative mt-1">
              <Star className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                placeholder="e.g., 4.3"
                value={rating || ''}
                onChange={(e) => setRating(parseFloat(e.target.value))}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Average rating out of 5.0 (if applicable)
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
          <Button variant="ghost" size="sm" onClick={() => setShowMap(!showMap)}>
            {showMap ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showMap ? 'Hide Map' : 'Show Map'}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="address" className="text-slate-700">
              Street Address <span className="text-red-500">*</span>
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

      <div className="flex items-center gap-2 text-sm text-slate-500 px-2">
        <Info className="w-4 h-4" />
        <p><span className="text-red-500">*</span> Required fields</p>
      </div>
    </div>
  );
}
