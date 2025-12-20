/**
 * Step 4: Basic Information
 * 
 * Dynamic form that adapts based on:
 * - Transaction Type (sell/rent/auction)
 * - Property Type (apartment/house/farm/land/commercial)
 * - Badge/Status (ready_to_move/occupied/off_plan/under_construction)
 */

import React, { useState, useEffect } from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { MapPin, DollarSign, Home, Calendar, Info, Check, Award, Store, Building2, Factory, Warehouse, Layers, DoorOpen, GraduationCap, Users, Search, Loader2 } from 'lucide-react';
import type { ListingAction, PropertyType, ListingBadge } from '@/../../shared/listing-types';
import { BADGE_TEMPLATES } from '@/../../shared/listing-types';
import { useFieldValidation } from '@/hooks/useFieldValidation';
import { InlineError } from '@/components/ui/InlineError';
import { trpc } from '@/lib/trpc';
import { useDebounce } from '@/hooks/useDebounce';

// South African provinces
const SA_PROVINCES = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
];

const BasicInformationStep: React.FC = () => {
  const store: any = useListingWizardStore();
  const action: ListingAction | undefined = store.action;
  const propertyType: PropertyType | undefined = store.propertyType;
  const badges: ListingBadge[] = store.badges || [];
  const badge = badges[0]; // Single badge selection

  // Get current values
  const title = store.title || '';
  const description = store.description || '';
  const basicInfo = store.basicInfo || {};
  const pricing = store.pricing || {};
  const propertyDetails = store.propertyDetails || {};

  // Autocomplete state for developers
  const [developerSearchQuery, setDeveloperSearchQuery] = useState('');
  const [showDeveloperDropdown, setShowDeveloperDropdown] = useState(false);
  const debouncedDeveloperQuery = useDebounce(developerSearchQuery, 300);

  // Autocomplete state for developments
  const [developmentSearchQuery, setDevelopmentSearchQuery] = useState('');
  const [showDevelopmentDropdown, setShowDevelopmentDropdown] = useState(false);
  const debouncedDevelopmentQuery = useDebounce(developmentSearchQuery, 300);

  // tRPC queries for autocomplete
  const { data: developers, isLoading: loadingDevelopers } = trpc.developer.searchDevelopers.useQuery(
    { query: debouncedDeveloperQuery },
    { enabled: debouncedDeveloperQuery.length >= 2 }
  );

  const { data: developments, isLoading: loadingDevelopments } = trpc.developer.searchDevelopments.useQuery(
    { 
      query: debouncedDevelopmentQuery,
      developerId: basicInfo.selectedDeveloperId 
    },
    { 
      // Enable query when: user typed 2+ chars OR a developer is selected (for auto-population)
      enabled: debouncedDevelopmentQuery.length >= 2 || !!basicInfo.selectedDeveloperId 
    }
  );

  // Validation context
  const validationContext = {
    action,
    propertyType,
    currentStep: 3,
  };

  // Field validation
  const titleValidation = useFieldValidation({
    field: 'title',
    value: title,
    context: validationContext,
    trigger: 'blur',
  });

  const descriptionValidation = useFieldValidation({
    field: 'description',
    value: description,
    context: validationContext,
    trigger: 'blur',
  });

  // Update handlers
  const updateBasicInfo = (field: string, value: any) => {
    store.setBasicInfo?.({ ...basicInfo, [field]: value }) || 
    store.updatePropertyDetail?.(field, value);
  };

  const updateTitle = (value: string) => {
    store.setTitle(value);
    titleValidation.clearError();
  };

  const updateDescription = (value: string) => {
    store.setDescription(value);
    descriptionValidation.clearError();
  };

  // Helper to check if a badge is selected
  const hasStatus = (...statuses: ListingBadge[]) => {
    return badge && statuses.includes(badge);
  };

  return (
    <div className="py-6 space-y-6">
      {/* Universal Fields Section */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">Property Information</h3>
        </div>

        <div className="space-y-4">
          {/* Property Title */}
          <div>
            <Label htmlFor="title" className="text-slate-700">Property Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => updateTitle(e.target.value)}
              onBlur={titleValidation.onBlur}
              placeholder="Enter property title (minimum 10 characters)"
              className="mt-1"
              maxLength={255}
              aria-invalid={!!titleValidation.error}
              aria-describedby={titleValidation.error ? 'title-error' : undefined}
            />
            <div className="flex items-center justify-between mt-1">
              <InlineError
                error={titleValidation.error}
                show={!!titleValidation.error}
                size="sm"
              />
              <p className="text-xs text-slate-500">{title.length}/255 characters</p>
            </div>
          </div>

          {/* Property Description */}
          <div>
            <Label htmlFor="description" className="text-slate-700">Property Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => updateDescription(e.target.value)}
              onBlur={descriptionValidation.onBlur}
              placeholder="Describe your property in detail (minimum 50 characters)"
              className="mt-1 min-h-[120px]"
              maxLength={5000}
              aria-invalid={!!descriptionValidation.error}
              aria-describedby={descriptionValidation.error ? 'description-error' : undefined}
            />
            <div className="flex items-center justify-between mt-1">
              <InlineError
                error={descriptionValidation.error}
                show={!!descriptionValidation.error}
                size="sm"
              />
              <p className="text-xs text-slate-500">{description.length}/5000 characters</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Property Category Selection */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Home className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-slate-800">
            {propertyType === 'farm' ? 'Farm Type' : propertyType === 'land' ? 'Land Type' : 'Property Category'}
          </h3>
        </div>

        {/* Farm-specific categories */}
        {propertyType === 'farm' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { value: 'crop_farm', label: 'Crop Farm', description: 'Agricultural crop production' },
              { value: 'aquaculture', label: 'Aquaculture', description: 'Fish and aquatic farming' },
              { value: 'livestock_farm', label: 'Livestock Farm', description: 'Animal husbandry and ranching' },
              { value: 'mixed_farm', label: 'Mixed Farm', description: 'Combined crop and livestock' },
              { value: 'game_farm', label: 'Game Farm', description: 'Wildlife and game breeding' },
              { value: 'smallholding', label: 'Smallholding / Lifestyle Farm', description: 'Small-scale or lifestyle farming' },
            ].map((category) => (
              <Card
                key={category.value}
                onClick={() => updateBasicInfo('propertyCategory', category.value)}
                className={`cursor-pointer transition-all p-4 ${
                  basicInfo.propertyCategory === category.value
                    ? 'border-2 border-blue-500 bg-blue-50'
                    : 'border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className={`p-2 rounded-lg ${
                    basicInfo.propertyCategory === category.value ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Home className={`w-6 h-6 ${
                      basicInfo.propertyCategory === category.value ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <h4 className={`font-bold ${
                      basicInfo.propertyCategory === category.value ? 'text-blue-600' : 'text-gray-900'
                    }`}>{category.label}</h4>
                    <p className="text-xs text-gray-600 mt-1">{category.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : propertyType === 'land' ? (
          /* Land-specific categories */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { value: 'residential_land', label: 'Residential Land', description: 'Zoned for residential development' },
              { value: 'estate_plot', label: 'Estate Plot', description: 'Land within a residential estate' },
              { value: 'industrial_land', label: 'Industrial Land', description: 'Zoned for industrial/commercial use' },
            ].map((category) => (
              <Card
                key={category.value}
                onClick={() => updateBasicInfo('propertyCategory', category.value)}
                className={`cursor-pointer transition-all p-4 ${
                  basicInfo.propertyCategory === category.value
                    ? 'border-2 border-blue-500 bg-blue-50'
                    : 'border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className={`p-2 rounded-lg ${
                    basicInfo.propertyCategory === category.value ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Home className={`w-6 h-6 ${
                      basicInfo.propertyCategory === category.value ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <h4 className={`font-bold ${
                      basicInfo.propertyCategory === category.value ? 'text-blue-600' : 'text-gray-900'
                    }`}>{category.label}</h4>
                    <p className="text-xs text-gray-600 mt-1">{category.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : propertyType === 'commercial' ? (
          /* Commercial-specific categories */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { value: 'retail', label: 'Retail', description: 'Shops, malls, and showrooms', icon: Store },
              { value: 'office', label: 'Office', description: 'Office space and business parks', icon: Building2 },
              { value: 'industrial', label: 'Industrial', description: 'Factories and manufacturing', icon: Factory },
              { value: 'warehouse', label: 'Warehouse', description: 'Storage and distribution', icon: Warehouse },
              { value: 'mixed', label: 'Mixed Use', description: 'Combined commercial/residential', icon: Layers },
            ].map((category) => (
              <Card
                key={category.value}
                onClick={() => {
                  updateBasicInfo('propertyCategory', category.value);
                  store.updatePropertyDetail('subtype', category.value);
                }}
                className={`cursor-pointer transition-all p-4 ${
                  basicInfo.propertyCategory === category.value
                    ? 'border-2 border-blue-500 bg-blue-50'
                    : 'border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className={`p-2 rounded-lg ${
                    basicInfo.propertyCategory === category.value ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <category.icon className={`w-6 h-6 ${
                      basicInfo.propertyCategory === category.value ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <h4 className={`font-bold ${
                      basicInfo.propertyCategory === category.value ? 'text-blue-600' : 'text-gray-900'
                    }`}>{category.label}</h4>
                    <p className="text-xs text-gray-600 mt-1">{category.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : propertyType === 'shared_living' ? (
          /* Shared Living rental categories */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { value: 'room_rental', label: 'Room Rental', description: 'Single room in shared accommodation', icon: DoorOpen },
              { value: 'cottage', label: 'Cottage/Granny Flat', description: 'Separate unit on property', icon: Home },
              { value: 'student_accommodation', label: 'Student Accommodation', description: 'Purpose-built student housing', icon: GraduationCap },
              { value: 'co_living', label: 'Co-Living Space', description: 'Modern shared living arrangement', icon: Users },
            ].map((category) => (
              <Card
                key={category.value}
                onClick={() => updateBasicInfo('propertyCategory', category.value)}
                className={`cursor-pointer transition-all p-4 ${
                  basicInfo.propertyCategory === category.value
                    ? 'border-2 border-blue-500 bg-blue-50'
                    : 'border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    basicInfo.propertyCategory === category.value ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <category.icon className={`w-6 h-6 ${
                      basicInfo.propertyCategory === category.value ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <h4 className={`font-bold ${
                      basicInfo.propertyCategory === category.value ? 'text-blue-600' : 'text-gray-900'
                    }`}>{category.label}</h4>
                    <p className="text-sm text-gray-600">{category.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* Standard categories for other properties */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              onClick={() => updateBasicInfo('propertyCategory', 'existing')}
              className={`cursor-pointer transition-all p-4 ${
                basicInfo.propertyCategory === 'existing'
                  ? 'border-2 border-blue-500 bg-blue-50'
                  : 'border-2 border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  basicInfo.propertyCategory === 'existing' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Home className={`w-6 h-6 ${
                    basicInfo.propertyCategory === 'existing' ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                </div>
                <div>
                  <h4 className={`font-bold ${
                    basicInfo.propertyCategory === 'existing' ? 'text-blue-600' : 'text-gray-900'
                  }`}>Existing Property</h4>
                  <p className="text-sm text-gray-600">Previously owned or occupied</p>
                </div>
              </div>
            </Card>

            <Card
              onClick={() => updateBasicInfo('propertyCategory', 'new_development')}
              className={`cursor-pointer transition-all p-4 ${
                basicInfo.propertyCategory === 'new_development'
                  ? 'border-2 border-blue-500 bg-blue-50'
                  : 'border-2 border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  basicInfo.propertyCategory === 'new_development' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Home className={`w-6 h-6 ${
                    basicInfo.propertyCategory === 'new_development' ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                </div>
                <div>
                  <h4 className={`font-bold ${
                    basicInfo.propertyCategory === 'new_development' ? 'text-blue-600' : 'text-gray-900'
                  }`}>New Development</h4>
                  <p className="text-sm text-gray-600">New construction or development</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Card>

      {/* Property Highlights (4 fields per type) */}
      {propertyType !== 'shared_living' && (
      <Card className="p-6 bg-white/50 backdrop-blur-sm border-slate-200/60 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Home className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Property Details</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Apartment Highlights */}
          {(propertyType === 'apartment') && (
            <>
              <div>
                <Label htmlFor="bedrooms" className="text-slate-700">Bedrooms *</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  value={propertyDetails.bedrooms || ''}
                  onChange={(e) => store.updatePropertyDetail('bedrooms', Number(e.target.value))}
                  placeholder="Enter number of bedrooms"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="bathrooms" className="text-slate-700">Bathrooms *</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  value={propertyDetails.bathrooms || ''}
                  onChange={(e) => store.updatePropertyDetail('bathrooms', Number(e.target.value))}
                  placeholder="Enter number of bathrooms"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="unitSizeM2" className="text-slate-700">Unit Size (m²) *</Label>
                <Input
                  id="unitSizeM2"
                  type="number"
                  value={propertyDetails.unitSizeM2 || ''}
                  onChange={(e) => store.updatePropertyDetail('unitSizeM2', Number(e.target.value))}
                  placeholder="Enter unit size in m²"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="floorNumber" className="text-slate-700">Floor Number *</Label>
                <Input
                  id="floorNumber"
                  type="number"
                  value={propertyDetails.floorNumber || ''}
                  onChange={(e) => store.updatePropertyDetail('floorNumber', Number(e.target.value))}
                  placeholder="Enter floor number"
                  className="mt-1"
                />
              </div>
            </>
          )}

          {/* House Highlights */}
            {(propertyType === 'house') && (
              <>
                <div>
                  <Label htmlFor="bedrooms" className="text-slate-700">Bedrooms *</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    value={propertyDetails.bedrooms || ''}
                    onChange={(e) => store.updatePropertyDetail('bedrooms', Number(e.target.value))}
                    placeholder="e.g., 4"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="bathrooms" className="text-slate-700">Bathrooms *</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    value={propertyDetails.bathrooms || ''}
                    onChange={(e) => store.updatePropertyDetail('bathrooms', Number(e.target.value))}
                    placeholder="e.g., 2.5"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="houseAreaM2" className="text-slate-700">House Size (m²) *</Label>
                  <Input
                    id="houseAreaM2"
                    type="number"
                    value={propertyDetails.houseAreaM2 || ''}
                    onChange={(e) => store.updatePropertyDetail('houseAreaM2', Number(e.target.value))}
                    placeholder="e.g., 250"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="erfSizeM2" className="text-slate-700">Yard Size (m²) *</Label>
                  <Input
                    id="erfSizeM2"
                    type="number"
                    value={propertyDetails.erfSizeM2 || ''}
                    onChange={(e) => store.updatePropertyDetail('erfSizeM2', Number(e.target.value))}
                    placeholder="e.g., 500"
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {/* Farm Highlights */}
            {propertyType === 'farm' && (
              <>
                <div>
                  <Label htmlFor="landSizeHa" className="text-slate-700">Total Land Size *</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="landSizeHa"
                      type="number"
                      value={propertyDetails.landSizeHa || ''}
                      onChange={(e) => store.updatePropertyDetail('landSizeHa', Number(e.target.value))}
                      placeholder="e.g., 50"
                      className="w-48"
                    />
                    <Select
                      value={basicInfo.landSizeUnit || 'hectares'}
                      onValueChange={(value) => updateBasicInfo('landSizeUnit', value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="m2">m²</SelectItem>
                        <SelectItem value="acres">Acres</SelectItem>
                        <SelectItem value="hectares">Hectares</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="zoningAgricultural" className="text-slate-700">Zoning Category *</Label>
                  <Input
                    id="zoningAgricultural"
                    value={propertyDetails.zoningAgricultural || ''}
                    onChange={(e) => store.updatePropertyDetail('zoningAgricultural', e.target.value)}
                    placeholder="e.g., Agricultural"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="waterSource" className="text-slate-700">Water Source *</Label>
                  <Select
                    value={propertyDetails.waterSource || ''}
                    onValueChange={(value) => store.updatePropertyDetail('waterSource', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select water source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="borehole">Borehole</SelectItem>
                      <SelectItem value="river">River</SelectItem>
                      <SelectItem value="municipal">Municipal</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="electricitySupply" className="text-slate-700">Electricity Supply *</Label>
                  <Select
                    value={propertyDetails.electricitySupply || ''}
                    onValueChange={(value) => store.updatePropertyDetail('electricitySupply', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select electricity supply" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eskom">Eskom</SelectItem>
                      <SelectItem value="solar">Solar</SelectItem>
                      <SelectItem value="generator">Generator</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Land Highlights */}
            {propertyType === 'land' && (
              <>
                <div>
                  <Label htmlFor="landSizeM2OrHa" className="text-slate-700">Plot Size *</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="landSizeM2OrHa"
                      type="number"
                      value={propertyDetails.landSizeM2OrHa || ''}
                      onChange={(e) => store.updatePropertyDetail('landSizeM2OrHa', Number(e.target.value))}
                      placeholder="e.g., 1000"
                      className="w-48"
                    />
                    <Select
                      value={basicInfo.landSizeUnit || 'm2'}
                      onValueChange={(value) => updateBasicInfo('landSizeUnit', value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="m2">m²</SelectItem>
                        <SelectItem value="acres">Acres</SelectItem>
                        <SelectItem value="hectares">Hectares</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="zoning" className="text-slate-700">Zoning Type *</Label>
                  <Select
                    value={propertyDetails.zoning || ''}
                    onValueChange={(value) => store.updatePropertyDetail('zoning', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select zoning" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                      <SelectItem value="agricultural">Agricultural</SelectItem>
                      <SelectItem value="mixed">Mixed Use</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="servicedStatus" className="text-slate-700">Serviced Status *</Label>
                  <Select
                    value={propertyDetails.servicedStatus || ''}
                    onValueChange={(value) => store.updatePropertyDetail('servicedStatus', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="serviced">Serviced</SelectItem>
                      <SelectItem value="partially_serviced">Partially Serviced</SelectItem>
                      <SelectItem value="unserviced">Unserviced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="roadAccess" className="text-slate-700">Road Access *</Label>
                  <Select
                    value={propertyDetails.roadAccess || ''}
                    onValueChange={(value) => store.updatePropertyDetail('roadAccess', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select road access" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tar">Tar Road</SelectItem>
                      <SelectItem value="gravel">Gravel Road</SelectItem>
                      <SelectItem value="none">No Road Access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Commercial Highlights */}
            {propertyType === 'commercial' && (
              <>
                <div>
                  <Label htmlFor="floorAreaM2" className="text-slate-700">Property Size (m²) *</Label>
                  <Input
                    id="floorAreaM2"
                    type="number"
                    value={propertyDetails.floorAreaM2 || ''}
                    onChange={(e) => store.updatePropertyDetail('floorAreaM2', Number(e.target.value))}
                    placeholder="e.g., 500"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="parkingBays" className="text-slate-700">Parking Availability *</Label>
                  <Input
                    id="parkingBays"
                    type="number"
                    value={propertyDetails.parkingBays || ''}
                    onChange={(e) => store.updatePropertyDetail('parkingBays', Number(e.target.value))}
                    placeholder="e.g., 10"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="floorLevel" className="text-slate-700">Floor Level / Unit Number *</Label>
                  <Input
                    id="floorLevel"
                    value={propertyDetails.floorLevel || ''}
                    onChange={(e) => store.updatePropertyDetail('floorLevel', e.target.value)}
                    placeholder="e.g., Ground Floor or Unit 5"
                    className="mt-1"
                  />
                </div>
              </>
            )}
          </div>
        </Card>
      )}


      {/* Possession Status & Additional Details */}
      {action === 'sell' && (propertyType === 'house' || propertyType === 'apartment') && (
        <Card className="p-6 bg-white/50 backdrop-blur-sm border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Home className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Additional Information</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {basicInfo.propertyCategory === 'resale' && (
              <>
                <div>
                  <Label htmlFor="possessionStatus" className="text-slate-700">Possession Status *</Label>
                  <Select
                    value={basicInfo.possessionStatus || ''}
                    onValueChange={(value) => updateBasicInfo('possessionStatus', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacant">Vacant</SelectItem>
                      <SelectItem value="owner_occupied">Owner Occupied</SelectItem>
                      <SelectItem value="tenant_occupied">Tenant Occupied</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {basicInfo.possessionStatus === 'tenant_occupied' && (
                  <>
                    <div>
                      <Label htmlFor="currentRentalIncome" className="text-slate-700">Current Rental Income (R/month)</Label>
                      <Input
                        id="currentRentalIncome"
                        type="number"
                        value={basicInfo.currentRentalIncome || ''}
                        onChange={(e) => updateBasicInfo('currentRentalIncome', Number(e.target.value))}
                        placeholder="e.g., 12000"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="leaseExpiryDate" className="text-slate-700">Lease Expiry Date</Label>
                      <Input
                        id="leaseExpiryDate"
                        type="date"
                        value={basicInfo.leaseExpiryDate || ''}
                        onChange={(e) => updateBasicInfo('leaseExpiryDate', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="occupancyDate" className="text-slate-700">Available From</Label>
                  <Input
                    id="occupancyDate"
                    type="date"
                    value={basicInfo.occupancyDate || ''}
                    onChange={(e) => updateBasicInfo('occupancyDate', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="propertyAge" className="text-slate-700">Property Age (years)</Label>
                  <Input
                    id="propertyAge"
                    type="number"
                    value={basicInfo.propertyAge || ''}
                    onChange={(e) => updateBasicInfo('propertyAge', Number(e.target.value))}
                    placeholder="e.g., 10"
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {/* New Development Fields */}
            {basicInfo.propertyCategory === 'new_development' && (
              <>
                {/* Developer Name Autocomplete */}
                <div>
                  <Label htmlFor="developerName" className="text-slate-700">Developer Name *</Label>
                  <Popover open={showDeveloperDropdown} onOpenChange={setShowDeveloperDropdown}>
                    <PopoverTrigger asChild>
                      <div className="relative">
                        <Input
                          id="developerName"
                          value={basicInfo.developerName || ''}
                          onChange={(e) => {
                            updateBasicInfo('developerName', e.target.value);
                            setDeveloperSearchQuery(e.target.value);
                            setShowDeveloperDropdown(true);
                            // If user manually changes the developer name, clear the selected IDs
                            // since they're no longer selecting from the autocomplete
                            if (basicInfo.selectedDeveloperId) {
                              updateBasicInfo('selectedDeveloperId', undefined);
                              updateBasicInfo('developmentName', '');
                              updateBasicInfo('selectedDevelopmentId', undefined);
                              setDevelopmentSearchQuery('');
                            }
                          }}
                          onFocus={() => setShowDeveloperDropdown(true)}
                          placeholder="Search for developer..."
                          className="mt-1"
                        />
                        {loadingDevelopers && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                        )}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                      <Command shouldFilter={false}>
                        <CommandList>
                          {developers && developers.length > 0 ? (
                            <CommandGroup heading="Registered Developers">
                              {developers.map((dev: any) => (
                                <CommandItem
                                  key={dev.id}
                                  value={dev.name}
                                  onSelect={() => {
                                    console.log('Selected developer:', dev.name);
                                    // Combine all updates into a single state update to avoid race conditions with stale basicInfo closure
                                    store.setBasicInfo({
                                      ...basicInfo,
                                      developerName: dev.name,
                                      selectedDeveloperId: dev.id,
                                      developmentName: '',
                                      selectedDevelopmentId: undefined
                                    });
                                    setDeveloperSearchQuery(dev.name);
                                    setDevelopmentSearchQuery(''); // Reset development search
                                    setShowDeveloperDropdown(false);
                                    // Auto-open development dropdown after selecting developer
                                    setTimeout(() => setShowDevelopmentDropdown(true), 100);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 w-full">
                                    <Building2 className="w-4 h-4 text-blue-600" />
                                    <div className="flex-1">
                                      <p className="font-medium">{dev.name}</p>
                                      <p className="text-xs text-gray-500">
                                        {dev.city}, {dev.province}
                                      </p>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                      {dev.status}
                                    </Badge>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          ) : debouncedDeveloperQuery.length >= 2 && !loadingDevelopers ? (
                            <CommandEmpty>No developers found. You can still enter a custom name.</CommandEmpty>
                          ) : (
                            <CommandEmpty>Type at least 2 characters to search...</CommandEmpty>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-slate-500 mt-1">
                    Search for registered developers or enter a custom name
                  </p>
                </div>

                {/* Development Name Autocomplete */}
                <div>
                  <Label htmlFor="developmentName" className="text-slate-700">Development Name *</Label>
                  <Popover open={showDevelopmentDropdown} onOpenChange={setShowDevelopmentDropdown}>
                    <PopoverTrigger asChild>
                      <div className="relative">
                        <Input
                          id="developmentName"
                          value={basicInfo.developmentName || ''}
                          onChange={(e) => {
                            updateBasicInfo('developmentName', e.target.value);
                            setDevelopmentSearchQuery(e.target.value);
                            setShowDevelopmentDropdown(true);
                          }}
                          onFocus={() => setShowDevelopmentDropdown(true)}
                          placeholder="Search for development..."
                          className="mt-1"
                        />
                        {loadingDevelopments && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                        )}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                      <Command shouldFilter={false}>
                        <CommandList>
                          {developments && developments.length > 0 ? (
                            <CommandGroup heading={basicInfo.selectedDeveloperId ? "Developer's Developments" : "Published Developments"}>
                              {developments.map((dev: any) => (
                                <CommandItem
                                  key={dev.id}
                                  value={dev.name}
                                  onSelect={() => {
                                    console.log('Selected development:', dev.name);
                                    store.setBasicInfo({
                                      ...basicInfo,
                                      developmentName: dev.name,
                                      selectedDevelopmentId: dev.id
                                    });
                                    setDevelopmentSearchQuery(dev.name);
                                    setShowDevelopmentDropdown(false);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 w-full">
                                    <Home className="w-4 h-4 text-green-600" />
                                    <div className="flex-1">
                                      <p className="font-medium">{dev.name}</p>
                                      <p className="text-xs text-gray-500">
                                        {dev.city}, {dev.province} • {dev.developmentType}
                                      </p>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                      {dev.status}
                                    </Badge>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          ) : (debouncedDevelopmentQuery.length >= 2 || basicInfo.selectedDeveloperId) && !loadingDevelopments ? (
                            <CommandEmpty>
                              {basicInfo.selectedDeveloperId 
                                ? 'No developments found for this developer. You can still enter a custom name.'
                                : 'No developments found. You can still enter a custom name.'}
                            </CommandEmpty>
                          ) : basicInfo.selectedDeveloperId ? (
                            <CommandEmpty>Loading developments for selected developer...</CommandEmpty>
                          ) : (
                            <CommandEmpty>Type at least 2 characters to search...</CommandEmpty>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-slate-500 mt-1">
                    {basicInfo.selectedDeveloperId 
                      ? 'Filtered by selected developer' 
                      : 'Search for developments or enter a custom name'}
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Listing Badges Section - Only for non-farm properties */}
      {basicInfo.propertyCategory && propertyType !== 'farm' && (
        <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-bold text-slate-800">Listing Badge</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Select one badge to highlight a special feature of your property (optional).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(() => {
              // Filter badges based on property type and category
              let availableBadges: ListingBadge[] = [];
              
              // For farms, show farm-specific badges
              if (propertyType === 'farm') {
                availableBadges = ['water_rights', 'going_concern', 'game_fenced', 'irrigation', 'organic_certified', 'export_quality'];
              }
              // For non-farm properties
              else if (basicInfo.propertyCategory === 'existing') {
                availableBadges = ['ready_to_move', 'move_in_ready', 'fixer_upper', 'renovated'];
              } else if (basicInfo.propertyCategory === 'new_development') {
                availableBadges = ['under_construction', 'off_plan'];
              }

              return availableBadges.map((badge) => {
                const template = BADGE_TEMPLATES[badge];
                const isSelected = badges.includes(badge);

                return (
                  <Card
                    key={badge}
                    onClick={() => {
                      // Toggle badge selection (single selection)
                      if (isSelected) {
                        store.setBadges([]);
                      } else {
                        store.setBadges([badge]);
                      }
                    }}
                    className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                      isSelected
                        ? 'border-2 border-blue-500 shadow-lg bg-gradient-to-br from-blue-50 to-white'
                        : 'border-2 border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 bg-blue-500 rounded-full p-1">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}

                    <div className="p-4 flex flex-col items-center text-center space-y-3">
                      {/* Badge Preview */}
                      <Badge
                        variant="secondary"
                        className={`text-sm font-medium ${
                          isSelected ? 'bg-blue-100 text-blue-700' : ''
                        }`}
                      >
                        {template.label}
                      </Badge>

                      {/* Label */}
                      <h3
                        className={`text-lg font-bold transition-colors ${
                          isSelected ? 'text-blue-600' : 'text-gray-900'
                        }`}
                      >
                        {template.label}
                      </h3>

                      {/* Description */}
                      <p className="text-gray-600 text-sm">{template.description}</p>
                    </div>
                  </Card>
                );
              });
            })()}
          </div>

          {/* Selected Badge Confirmation */}
          {badges.length > 0 && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 flex items-center gap-2">
                <Check className="w-5 h-5" />
                Selected Badge: {BADGE_TEMPLATES[badges[0]].label}
              </h4>
              <p className="text-green-800 text-sm mt-1">
                {BADGE_TEMPLATES[badges[0]].description}
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default BasicInformationStep;
