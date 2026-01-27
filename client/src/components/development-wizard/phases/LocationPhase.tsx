import React, { useEffect, useCallback } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { MapPin } from 'lucide-react';
import { LocationMapPicker, type LocationData } from '@/components/location/LocationMapPicker';
import { WizardData } from '@/lib/types/wizard-workflows';

export function LocationPhase() {
  const { developmentData, setIdentity, saveWorkflowStepData } = useDevelopmentWizard();

  // Helper to sync updates to both Legacy (UI) and Workflow (Validation) stores
  const handleUpdate = useCallback(
    (updates: Partial<typeof developmentData.location>) => {
      // 1. Update Legacy/UI Store (Immediate Feedback)
      setIdentity({
        location: {
          ...developmentData.location,
          ...updates,
        },
      });

      // 2. Update Workflow Store (Persistence & Validation)
      saveWorkflowStepData('location', updates as Partial<WizardData>);
    },
    [developmentData.location, setIdentity, saveWorkflowStepData],
  );

  const handleLocationSelect = (data: LocationData) => {
    const updates = {
      address: data.address || developmentData.location.address,
      city: data.city || developmentData.location.city,
      province: data.province || developmentData.location.province,
      suburb: data.suburb || developmentData.location.suburb,
      postalCode: data.postalCode || developmentData.location.postalCode,
      latitude: data.latitude.toString(),
      longitude: data.longitude.toString(),
    };

    handleUpdate(updates);
    toast.success('Location updated from map');
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
            <p className="text-sm text-slate-500 mb-2">
              Drag the pin to the exact entrance of the development.
            </p>
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm h-[400px]">
              <LocationMapPicker
                initialLat={
                  developmentData.location.latitude
                    ? parseFloat(developmentData.location.latitude)
                    : undefined
                }
                initialLng={
                  developmentData.location.longitude
                    ? parseFloat(developmentData.location.longitude)
                    : undefined
                }
                onLocationSelect={handleLocationSelect}
                onGeocodingError={err => toast.error(err)}
              />
            </div>
            {/* Hidden anchors for lat/lng field focusing */}
            <input
              type="text"
              data-field="location.latitude"
              value={developmentData.location.latitude || ''}
              readOnly
              className="sr-only"
            />
            <input
              type="text"
              data-field="location.longitude"
              value={developmentData.location.longitude || ''}
              readOnly
              className="sr-only"
            />
          </div>

          <div className="grid gap-6 pt-4 border-t border-slate-100">
            <div className="space-y-2">
              <Label htmlFor="address">
                Street Address <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Input
                id="address"
                data-field="location.address"
                placeholder="e.g. 123 Main Road"
                value={developmentData.location.address}
                onChange={e => handleUpdate({ address: e.target.value })}
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="city">City / Town</Label>
                <Input
                  id="city"
                  data-field="location.city"
                  placeholder="e.g. Cape Town"
                  value={developmentData.location.city}
                  onChange={e => handleUpdate({ city: e.target.value })}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="suburb">Suburb</Label>
                <Input
                  id="suburb"
                  data-field="location.suburb"
                  placeholder="e.g. Sea Point"
                  value={developmentData.location.suburb || ''}
                  onChange={e => handleUpdate({ suburb: e.target.value })}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="province">Province</Label>
                <Select
                  value={developmentData.location.province}
                  onValueChange={val => handleUpdate({ province: val })}
                >
                  <SelectTrigger className="h-11" data-field="location.province">
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
                  data-field="location.postalCode"
                  placeholder="e.g. 8005"
                  value={developmentData.location.postalCode || ''}
                  onChange={e => handleUpdate({ postalCode: e.target.value })}
                  className="h-11"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
