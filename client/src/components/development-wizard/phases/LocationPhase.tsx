import React from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { useWizardNavigation } from '@/hooks/useWizardNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { MapPin, ArrowLeft, ArrowRight } from 'lucide-react';
import { LocationMapPicker, type LocationData } from '@/components/location/LocationMapPicker';

export function LocationPhase() {
  const { 
    developmentData, 
    setIdentity, 
    setPhase, 
    validatePhase 
  } = useDevelopmentWizard();
  
  const navigation = useWizardNavigation();

  const handleLocationSelect = (data: LocationData) => {
    setIdentity({
      location: {
        ...developmentData.location,
        address: data.address || developmentData.location.address,
        city: data.city || developmentData.location.city,
        province: data.province || developmentData.location.province,
        suburb: data.suburb || developmentData.location.suburb,
        postalCode: data.postalCode || developmentData.location.postalCode,
        latitude: data.latitude.toString(),
        longitude: data.longitude.toString(),
      }
    });
    toast.success('Location updated from map');
  };

  const handleNext = () => {
    const { isValid, errors } = validatePhase(5); // Phase 5: Location
    if (isValid) {
      setPhase(6); // Continue to Amenities
    } else {
      errors.forEach(e => toast.error(e));
    }
  };
  
  const handleBack = () => {
    // If skipping Estate Profile (Step 5 logic in nav), we might need to check.
    // However, Step 5 IS Location now. 
    // Step 4 is Identity using new map.
    // Wait, the new map says:
    // 4: Identity
    // 5: Location (New) AND/OR Estate Profile?
    // Let's check DevelopmentWizard.tsx mapping. 
    // Currently mapped: 5: Estate Profile (conditional).
    // The Spec says Step 5 is Location. Step 6 Amenities.
    // We need to re-align the DevelopmentWizard steps.
    // For now, let's assume this component is strictly for Location.
    // Back goes to Identity (4).
    setPhase(4); 
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <MapPin className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Location & Address</h1>
          <p className="text-slate-600">Where is the development located?</p>
        </div>
      </div>

      <Card className="border-slate-200/60 shadow-sm">
        <CardContent className="pt-6 space-y-6">
          
          {/* Map Section */}
          <div className="space-y-2">
            <Label className="text-base font-medium text-slate-900">Pin Drop Location</Label>
            <p className="text-sm text-slate-500 mb-2">Drag the pin to the exact entrance of the development.</p>
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm h-[400px]">
              <LocationMapPicker 
                initialLat={developmentData.location.latitude ? parseFloat(developmentData.location.latitude) : undefined}
                initialLng={developmentData.location.longitude ? parseFloat(developmentData.location.longitude) : undefined}
                onLocationSelect={handleLocationSelect}
                onGeocodingError={(err) => toast.error(err)}
              />
            </div>
          </div>

          <div className="grid gap-6 pt-4 border-t border-slate-100">
            <div className="space-y-2">
               <Label htmlFor="address">Street Address <span className="text-red-500">*</span></Label>
               <Input 
                 id="address" 
                 placeholder="e.g. 123 Main Road" 
                 value={developmentData.location.address}
                 onChange={(e) => setIdentity({ location: { address: e.target.value } })}
                 className="h-11"
               />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="city">City / Town <span className="text-red-500">*</span></Label>
                <Input 
                  id="city" 
                  placeholder="e.g. Cape Town" 
                  value={developmentData.location.city}
                  onChange={(e) => setIdentity({ location: { city: e.target.value } })}
                  className="h-11"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="suburb">Suburb <span className="text-red-500">*</span></Label>
                <Input 
                  id="suburb" 
                  placeholder="e.g. Sea Point" 
                  value={developmentData.location.suburb || ''}
                  onChange={(e) => setIdentity({ location: { suburb: e.target.value } })}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="province">Province <span className="text-red-500">*</span></Label>
                <Select 
                  value={developmentData.location.province} 
                  onValueChange={(val) => setIdentity({ location: { province: val } })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select Province" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Western Cape">Western Cape</SelectItem>
                    <SelectItem value="Gauteng">Gauteng</SelectItem>
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

              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input 
                  id="postalCode" 
                  placeholder="e.g. 8005" 
                  value={developmentData.location.postalCode || ''}
                  onChange={(e) => setIdentity({ location: { postalCode: e.target.value } })}
                  className="h-11"
                />
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      <div className="flex justify-between pt-8 mt-8 border-t border-slate-200">
        <Button 
          variant="outline"
          onClick={handleBack}
          className="px-6 h-11 border-slate-300"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={handleNext} 
          size="lg" 
          className="px-8 h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300"
        >
          Continue to Amenities
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
