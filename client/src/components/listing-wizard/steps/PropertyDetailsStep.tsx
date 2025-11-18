/**
 * Step 4: Property Details
 *
 * Collect structured property details including bedrooms, bathrooms, parking, unit size, etc.
 */

import React, { useState, useEffect } from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import type {
  PropertySetting,
  ParkingType,
  AdditionalRoom,
  Amenity,
  OwnershipType,
  PowerBackup,
  ElectricitySource,
  SecurityLevel,
  InternetAvailability,
  WaterSupply,
  Furnishing,
  FlooringType,
  WaterHeating,
} from '@/../../shared/listing-types';

const PropertyDetailsStep: React.FC = () => {
  const store: any = useListingWizardStore();
  const propertyType = store.propertyType;
  const propertyDetails = store.propertyDetails || {};
  const setPropertyDetails = store.setPropertyDetails;
  const updatePropertyDetail = store.updatePropertyDetail;

  // Form state
  const [additionalRoomInput, setAdditionalRoomInput] = useState('');
  const [customAmenityInput, setCustomAmenityInput] = useState('');

  // Initialize with default values if not set
  useEffect(() => {
    if (!propertyDetails.propertySetting && propertyType) {
      updatePropertyDetail('propertySetting', propertyType);
    }
  }, [propertyType, propertyDetails.propertySetting, updatePropertyDetail]);

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    updatePropertyDetail(field, value);
  };

  // Handle checkbox changes
  const handleCheckboxChange = (field: string, checked: boolean) => {
    updatePropertyDetail(field, checked);
  };

  // Handle array changes (additional rooms, amenities)
  const handleArrayChange = (field: string, value: string, action: 'add' | 'remove') => {
    const currentArray = propertyDetails[field] || [];

    if (action === 'add') {
      if (!currentArray.includes(value)) {
        updatePropertyDetail(field, [...currentArray, value]);
      }
    } else {
      updatePropertyDetail(
        field,
        currentArray.filter((item: string) => item !== value),
      );
    }
  };

  // Add custom additional room
  const addCustomRoom = () => {
    if (additionalRoomInput.trim()) {
      handleArrayChange('additionalRooms', additionalRoomInput.trim(), 'add');
      setAdditionalRoomInput('');
    }
  };

  // Add custom amenity
  const addCustomAmenity = () => {
    if (customAmenityInput.trim()) {
      handleArrayChange('amenities', customAmenityInput.trim(), 'add');
      setCustomAmenityInput('');
    }
  };

  // Predefined options
  const propertySettings: { value: PropertySetting; label: string }[] = [
    { value: 'apartment', label: 'Apartment' },
    { value: 'house', label: 'House' },
    { value: 'farm', label: 'Farm' },
    { value: 'land', label: 'Land/Plot' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'shared_living', label: 'Shared Living' },
  ];

  const parkingTypes: { value: ParkingType; label: string }[] = [
    { value: 'open', label: 'Open' },
    { value: 'covered', label: 'Covered' },
    { value: 'garage', label: 'Garage' },
    { value: 'none', label: 'None' },
  ];

  const additionalRoomOptions: AdditionalRoom[] = [
    'pantry',
    'laundry_room',
    'study',
    'storeroom',
    'walk_in_closet',
    'utility_room',
  ];

  const amenityOptions: Amenity[] = [
    'pool',
    'gym',
    'clubhouse',
    'braai_area',
    'kids_play_area',
    'elevator',
    'garden',
    'backup_power',
    'fibre_ready',
    'parking_bay',
    'access_control',
    'cctv',
    'electric_fence',
    'security_guard_house',
    'borehole',
  ];

  // 12-Item Standard Set options
  const ownershipTypes: { value: OwnershipType; label: string }[] = [
    { value: 'sectional_title', label: 'Sectional Title' },
    { value: 'freehold', label: 'Freehold' },
    { value: 'estate_living', label: 'Estate Living' },
    { value: 'complex', label: 'Complex' },
    { value: 'gated_community', label: 'Gated Community' },
  ];

  const powerBackupOptions: { value: PowerBackup; label: string }[] = [
    { value: 'solar_system', label: 'Solar System' },
    { value: 'inverter_battery', label: 'Inverter + Battery' },
    { value: 'generator', label: 'Generator' },
    { value: 'none', label: 'None' },
  ];

  const electricitySourceOptions: { value: ElectricitySource; label: string }[] = [
    { value: 'prepaid', label: 'Prepaid' },
    { value: 'municipal', label: 'Municipal' },
    { value: 'eskom', label: 'Eskom' },
    { value: 'solar_supplemented', label: 'Solar Supplemented' },
  ];

  const securityLevelOptions: { value: SecurityLevel; label: string }[] = [
    { value: '24_hour_security', label: '24-Hour Security' },
    { value: 'cctv', label: 'CCTV' },
    { value: 'access_control', label: 'Access Control' },
    { value: 'security_patrol', label: 'Security Patrol' },
    { value: 'electric_fence', label: 'Electric Fence' },
    { value: 'standard', label: 'Standard' },
  ];

  const internetAvailabilityOptions: { value: InternetAvailability; label: string }[] = [
    { value: 'fibre_ready', label: 'Fibre Ready' },
    { value: 'adsl', label: 'ADSL' },
    { value: 'lte_wireless', label: 'LTE / Wireless' },
    { value: '5g', label: '5G' },
    { value: 'none', label: 'None' },
  ];

  const waterSupplyOptions: { value: WaterSupply; label: string }[] = [
    { value: 'municipal', label: 'Municipal' },
    { value: 'prepaid', label: 'Prepaid' },
    { value: 'borehole', label: 'Borehole' },
    { value: 'water_storage', label: 'Water Storage (JoJo)' },
    { value: 'backup_tanks', label: 'Backup Tanks' },
  ];

  const furnishingOptions: { value: Furnishing; label: string }[] = [
    { value: 'unfurnished', label: 'Unfurnished' },
    { value: 'semi_furnished', label: 'Semi-Furnished' },
    { value: 'fully_furnished', label: 'Fully Furnished' },
  ];

  const flooringTypeOptions: { value: FlooringType; label: string }[] = [
    { value: 'tiles', label: 'Tiles' },
    { value: 'laminated_wood', label: 'Laminated Wood' },
    { value: 'vinyl', label: 'Vinyl' },
    { value: 'carpet', label: 'Carpet' },
    { value: 'hardwood', label: 'Hardwood' },
    { value: 'polished_concrete', label: 'Polished Concrete' },
  ];

  const waterHeatingOptions: { value: WaterHeating; label: string }[] = [
    { value: 'electric_geyser', label: 'Electric Geyser' },
    { value: 'solar_geyser', label: 'Solar Geyser' },
    { value: 'gas_water_heater', label: 'Gas Water Heater' },
    { value: 'heat_pump', label: 'Heat Pump' },
    { value: 'hybrid_system', label: 'Hybrid System' },
  ];

  return (
    <div className="py-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Property Details</h2>
        <p className="text-gray-600">
          Provide detailed information about your property to help potential buyers or renters
          understand what you're offering.
        </p>
      </div>

      {/* Basic Property Details */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Property Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Property Setting */}
            <div className="space-y-2">
              <Label htmlFor="propertySetting">Property Setting</Label>
              <Select
                value={propertyDetails.propertySetting || ''}
                onValueChange={value => handleInputChange('propertySetting', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property setting" />
                </SelectTrigger>
                <SelectContent>
                  {propertySettings.map(setting => (
                    <SelectItem key={setting.value} value={setting.value}>
                      {setting.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bedrooms */}
            <div className="space-y-2">
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                type="number"
                min="0"
                value={propertyDetails.bedrooms || ''}
                onChange={e => handleInputChange('bedrooms', parseInt(e.target.value) || 0)}
              />
            </div>

            {/* Bathrooms */}
            <div className="space-y-2">
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                min="0"
                step="0.5"
                value={propertyDetails.bathrooms || ''}
                onChange={e => handleInputChange('bathrooms', parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Parking Type */}
            <div className="space-y-2">
              <Label htmlFor="parkingType">Parking Type</Label>
              <Select
                value={propertyDetails.parkingType || ''}
                onValueChange={value => handleInputChange('parkingType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parking type" />
                </SelectTrigger>
                <SelectContent>
                  {parkingTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Unit Size */}
            <div className="space-y-2">
              <Label htmlFor="unitSizeM2">Unit Size (m²)</Label>
              <Input
                id="unitSizeM2"
                type="number"
                min="0"
                value={propertyDetails.unitSizeM2 || ''}
                onChange={e => handleInputChange('unitSizeM2', parseInt(e.target.value) || 0)}
              />
            </div>

            {/* Floor Number */}
            <div className="space-y-2">
              <Label htmlFor="floorNumber">Floor Number</Label>
              <Input
                id="floorNumber"
                type="number"
                min="0"
                value={propertyDetails.floorNumber || ''}
                onChange={e => handleInputChange('floorNumber', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Pet Friendly */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="petFriendly"
              checked={!!propertyDetails.petFriendly}
              onCheckedChange={checked => handleCheckboxChange('petFriendly', !!checked)}
            />
            <Label htmlFor="petFriendly">Pet Friendly</Label>
          </div>
        </CardContent>
      </Card>

      {/* Additional Rooms */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Rooms & Specifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 text-sm">
            Select additional rooms that are part of your property or add custom room names.
          </p>

          {/* Predefined Room Options */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {additionalRoomOptions.map(room => (
              <div key={room} className="flex items-center space-x-2">
                <Checkbox
                  id={`room-${room}`}
                  checked={(propertyDetails.additionalRooms || []).includes(room)}
                  onCheckedChange={checked =>
                    handleArrayChange('additionalRooms', room, checked ? 'add' : 'remove')
                  }
                />
                <Label htmlFor={`room-${room}`} className="text-sm capitalize">
                  {room.replace(/_/g, ' ')}
                </Label>
              </div>
            ))}
          </div>

          {/* Custom Room Input */}
          <div className="flex gap-2 mt-4">
            <Input
              placeholder="Add custom room (e.g., home office, wine cellar)"
              value={additionalRoomInput}
              onChange={e => setAdditionalRoomInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustomRoom()}
            />
            <Button onClick={addCustomRoom} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {/* Selected Rooms Display */}
          {(propertyDetails.additionalRooms || []).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {(propertyDetails.additionalRooms || []).map((room: string) => (
                <Badge key={room} variant="secondary" className="flex items-center gap-1">
                  {room.replace(/_/g, ' ')}
                  <button
                    onClick={() => handleArrayChange('additionalRooms', room, 'remove')}
                    className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Amenities & Features */}
      <Card>
        <CardHeader>
          <CardTitle>Amenities & Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 text-sm">
            Select amenities available in your property or complex, or add custom amenities.
          </p>

          {/* Predefined Amenity Options */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {amenityOptions.map(amenity => (
              <div key={amenity} className="flex items-center space-x-2">
                <Checkbox
                  id={`amenity-${amenity}`}
                  checked={(propertyDetails.amenities || []).includes(amenity)}
                  onCheckedChange={checked =>
                    handleArrayChange('amenities', amenity, checked ? 'add' : 'remove')
                  }
                />
                <Label htmlFor={`amenity-${amenity}`} className="text-sm capitalize">
                  {amenity.replace(/_/g, ' ')}
                </Label>
              </div>
            ))}
          </div>

          {/* Custom Amenity Input */}
          <div className="flex gap-2 mt-4">
            <Input
              placeholder="Add custom amenity (e.g., tennis court, rooftop terrace)"
              value={customAmenityInput}
              onChange={e => setCustomAmenityInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustomAmenity()}
            />
            <Button onClick={addCustomAmenity} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {/* Selected Amenities Display */}
          {(propertyDetails.amenities || []).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {(propertyDetails.amenities || []).map((amenity: string) => (
                <Badge key={amenity} variant="secondary" className="flex items-center gap-1">
                  {amenity.replace(/_/g, ' ')}
                  <button
                    onClick={() => handleArrayChange('amenities', amenity, 'remove')}
                    className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 12-Item Standard Set */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Property Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-gray-600 text-sm">
            Provide standardized property information to help buyers make informed decisions.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ownership Type */}
            <div className="space-y-2">
              <Label htmlFor="ownershipType">Ownership Type</Label>
              <Select
                value={propertyDetails.ownershipType || ''}
                onValueChange={value => handleInputChange('ownershipType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ownership type" />
                </SelectTrigger>
                <SelectContent>
                  {ownershipTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Power Backup */}
            <div className="space-y-2">
              <Label htmlFor="powerBackup">Power Backup</Label>
              <Select
                value={propertyDetails.powerBackup || ''}
                onValueChange={value => handleInputChange('powerBackup', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select power backup" />
                </SelectTrigger>
                <SelectContent>
                  {powerBackupOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rates & Taxes */}
            <div className="space-y-2">
              <Label htmlFor="ratesTaxes">Rates & Taxes (ZAR/month)</Label>
              <Input
                id="ratesTaxes"
                type="number"
                min="0"
                value={propertyDetails.ratesTaxes || ''}
                onChange={e => handleInputChange('ratesTaxes', parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Electricity Source */}
            <div className="space-y-2">
              <Label htmlFor="electricitySource">Electricity Source</Label>
              <Select
                value={propertyDetails.electricitySource || ''}
                onValueChange={value => handleInputChange('electricitySource', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select electricity source" />
                </SelectTrigger>
                <SelectContent>
                  {electricitySourceOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Security Level */}
            <div className="space-y-2">
              <Label htmlFor="securityLevel">Security Level</Label>
              <Select
                value={propertyDetails.securityLevel || ''}
                onValueChange={value => handleInputChange('securityLevel', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select security level" />
                </SelectTrigger>
                <SelectContent>
                  {securityLevelOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Internet Availability */}
            <div className="space-y-2">
              <Label htmlFor="internetAvailability">Internet Availability</Label>
              <Select
                value={propertyDetails.internetAvailability || ''}
                onValueChange={value => handleInputChange('internetAvailability', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select internet availability" />
                </SelectTrigger>
                <SelectContent>
                  {internetAvailabilityOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Water Supply */}
            <div className="space-y-2">
              <Label htmlFor="waterSupply">Water Supply</Label>
              <Select
                value={propertyDetails.waterSupply || ''}
                onValueChange={value => handleInputChange('waterSupply', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select water supply" />
                </SelectTrigger>
                <SelectContent>
                  {waterSupplyOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Furnishing */}
            <div className="space-y-2">
              <Label htmlFor="furnishing">Furnishing</Label>
              <Select
                value={propertyDetails.furnishing || ''}
                onValueChange={value => handleInputChange('furnishing', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select furnishing" />
                </SelectTrigger>
                <SelectContent>
                  {furnishingOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Flooring Type */}
            <div className="space-y-2">
              <Label htmlFor="flooringType">Flooring Type</Label>
              <Select
                value={propertyDetails.flooringType || ''}
                onValueChange={value => handleInputChange('flooringType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select flooring type" />
                </SelectTrigger>
                <SelectContent>
                  {flooringTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Levies/HOA/Operating Costs */}
            <div className="space-y-2">
              <Label htmlFor="leviesHoaOperatingCosts">
                {propertyDetails.propertySetting === 'apartment' ||
                propertyDetails.propertySetting === 'shared_living'
                  ? 'Levies (ZAR/month)'
                  : propertyDetails.propertySetting === 'house'
                    ? 'HOA Fees (ZAR/month)'
                    : 'Operating Costs (ZAR/month)'}
              </Label>
              <Input
                id="leviesHoaOperatingCosts"
                type="number"
                min="0"
                value={propertyDetails.leviesHoaOperatingCosts || ''}
                onChange={e =>
                  handleInputChange('leviesHoaOperatingCosts', parseFloat(e.target.value) || 0)
                }
              />
            </div>

            {/* Water Heating */}
            <div className="space-y-2">
              <Label htmlFor="waterHeating">Water Heating</Label>
              <Select
                value={propertyDetails.waterHeating || ''}
                onValueChange={value => handleInputChange('waterHeating', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select water heating" />
                </SelectTrigger>
                <SelectContent>
                  {waterHeatingOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyDetailsStep;
