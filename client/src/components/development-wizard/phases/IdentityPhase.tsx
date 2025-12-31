import React, { useRef } from 'react';
import { useDevelopmentWizard, type MediaItem } from '@/hooks/useDevelopmentWizard';
import { useWizardNavigation } from '@/hooks/useWizardNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, X, Image as ImageIcon, MapPin, Building2, ArrowLeft, ArrowRight } from 'lucide-react';
import { LocationMapPicker, type LocationData } from '@/components/location/LocationMapPicker';

export function IdentityPhase() {
  const { 
    developmentData, 
    setIdentity, 
    addMedia, 
    removeMedia, 
    setPrimaryImage,
    setPhase, 
    validatePhase 
  } = useDevelopmentWizard();
  
  const navigation = useWizardNavigation();



  const handleLocationSelect = (data: LocationData) => {
    setIdentity({
      location: {
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
    const { isValid, errors } = validatePhase(4); // Phase 4: Basic Details
    if (isValid) {
      // Skip to Estate Profile (5) or Amenities (6) based on config
      if (navigation.shouldShowEstateProfile) {
        setPhase(5);
      } else {
        setPhase(6); // Skip to Amenities
      }
    } else {
      errors.forEach(e => toast.error(e));
    }
  };
  
  const handleBack = () => {
    setPhase(3); // Back to Configuration
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-4xl mx-auto">
      <div className="space-y-6">
        {/* Basic Info & Location */}
        <div className="space-y-6">
          
          {/* Basic Information Card */}
          <Card className="border-slate-200/60 shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardContent className="pt-6 space-y-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg text-slate-900">Development Details</h3>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                  Development Name <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Sunset Heights" 
                  value={developmentData.name}
                  onChange={(e) => setIdentity({ name: e.target.value })}
                  className="h-11 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nature" className="text-sm font-medium text-slate-700">
                  Nature of Development
                </Label>
                <Select 
                  value={developmentData.nature} 
                  onValueChange={(val: any) => setIdentity({ nature: val })}
                >
                  <SelectTrigger className="h-11 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New Development</SelectItem>
                    <SelectItem value="phase">New Phase of Existing</SelectItem>
                    <SelectItem value="extension">Extension / Redevelopment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="Describe the vision and lifestyle..." 
                  className="min-h-[120px]"
                  value={developmentData.description}
                  onChange={(e) => setIdentity({ description: e.target.value })}
                />
              </div>

              {/* Project Status Section */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="font-medium text-slate-700 mb-4">Project Overview</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectStatus" className="text-sm font-medium text-slate-700">
                      Project Status
                    </Label>
                    <Select 
                      value={developmentData.projectStatus} 
                      onValueChange={(val: any) => setIdentity({ projectStatus: val })}
                    >
                      <SelectTrigger className="h-11 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pre_launch">Pre-Launch</SelectItem>
                        <SelectItem value="under_construction">Under Construction</SelectItem>
                        <SelectItem value="nearing_completion">Nearing Completion</SelectItem>
                        <SelectItem value="ready_to_move">Ready to Move</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="possessionDate" className="text-sm font-medium text-slate-700">
                      Expected Possession
                    </Label>
                    <Input 
                      id="possessionDate"
                      type="month"
                      value={developmentData.possessionDate || ''}
                      onChange={(e) => setIdentity({ possessionDate: e.target.value })}
                      className="h-11 border-slate-200"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalUnits" className="text-sm font-medium text-slate-700">
                      Total Units
                    </Label>
                    <Input 
                      id="totalUnits"
                      type="number"
                      placeholder="e.g. 120"
                      value={developmentData.totalUnits || ''}
                      onChange={(e) => setIdentity({ totalUnits: parseInt(e.target.value) || undefined })}
                      className="h-11 border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalArea" className="text-sm font-medium text-slate-700">
                      Development Area (m²)
                    </Label>
                    <Input 
                      id="totalArea"
                      type="number"
                      placeholder="e.g. 25000"
                      value={developmentData.totalDevelopmentArea || ''}
                      onChange={(e) => setIdentity({ totalDevelopmentArea: parseInt(e.target.value) || undefined })}
                      className="h-11 border-slate-200"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Card */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-lg">Location</h3>
              </div>

              <div className="grid gap-2">
                <Label className="text-sm font-medium text-slate-700">Pin Drop Location</Label>
                <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                  <LocationMapPicker 
                    initialLat={developmentData.location.latitude ? parseFloat(developmentData.location.latitude) : undefined}
                    initialLng={developmentData.location.longitude ? parseFloat(developmentData.location.longitude) : undefined}
                    onLocationSelect={handleLocationSelect}
                    onGeocodingError={(err) => toast.error(err)}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">Street Address <span className="text-red-500">*</span></Label>
                <Input 
                  id="address" 
                  placeholder="123 Main Road" 
                  value={developmentData.location.address}
                  onChange={(e) => setIdentity({ location: { address: e.target.value } })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                  <Input 
                    id="city" 
                    placeholder="Cape Town" 
                    value={developmentData.location.city}
                    onChange={(e) => setIdentity({ location: { city: e.target.value } })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="province">Province</Label>
                  <Select 
                    value={developmentData.location.province} 
                    onValueChange={(val) => setIdentity({ location: { province: val } })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Province" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Western Cape">Western Cape</SelectItem>
                      <SelectItem value="Gauteng">Gauteng</SelectItem>
                      <SelectItem value="KwaZulu-Natal">KwaZulu-Natal</SelectItem>
                      <SelectItem value="Eastern Cape">Eastern Cape</SelectItem>
                      {/* Add others as needed */}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
          {navigation.shouldShowEstateProfile ? 'Continue to Estate Profile' : 'Continue to Amenities'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}