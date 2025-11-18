/**
 * Step 3: Basic Information & Property Details
 *
 * Collects title, description, and property-specific fields
 */

import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';
import type { PropertyType } from '@/../../shared/listing-types';

const BasicInfoStep: React.FC = () => {
  const store: any = useListingWizardStore();
  const title = store.title;
  const description = store.description;
  const propertyType = store.propertyType;
  const propertyDetails = store.propertyDetails || {};
  const setTitle = store.setTitle;
  const setDescription = store.setDescription;
  const updatePropertyDetail = store.updatePropertyDetail;

  const renderPropertyFields = () => {
    if (!propertyType) return null;

    switch (propertyType) {
      case 'apartment':
        return <ApartmentFields details={propertyDetails} updateDetail={updatePropertyDetail} />;
      case 'house':
        return <HouseFields details={propertyDetails} updateDetail={updatePropertyDetail} />;
      case 'farm':
        return <FarmFields details={propertyDetails} updateDetail={updatePropertyDetail} />;
      case 'land':
        return <LandFields details={propertyDetails} updateDetail={updatePropertyDetail} />;
      case 'commercial':
        return <CommercialFields details={propertyDetails} updateDetail={updatePropertyDetail} />;
      case 'shared_living':
        return <SharedLivingFields details={propertyDetails} updateDetail={updatePropertyDetail} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 py-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Property Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g., Luxury 3-Bedroom Apartment in Cape Town CBD"
          className="text-lg"
          maxLength={255}
        />
        <p className="text-xs text-gray-500">{title.length}/255 characters (minimum 10 required)</p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">
          Property Description <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Provide a detailed description of your property..."
          className="min-h-[150px]"
          maxLength={5000}
        />
        <p className="text-xs text-gray-500">
          {description.length}/5000 characters (minimum 50 required)
        </p>
      </div>

      {/* Property-Specific Fields */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Property Details</h3>
        {renderPropertyFields()}
      </Card>

      {/* Amenities & Features */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Lifestyle & Amenities</h3>
        <p className="text-gray-600 mb-4">
          Select features that appeal to a buyer's desired way of living.
        </p>

        <AmenitiesFeaturesFields details={propertyDetails} updateDetail={updatePropertyDetail} />
      </Card>

      {/* Additional Rooms & Specifications */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Additional Rooms & Specifications</h3>
        <p className="text-gray-600 mb-4">Select predefined rooms or add custom specifications.</p>

        <AdditionalRoomsSpecsFields details={propertyDetails} updateDetail={updatePropertyDetail} />
      </Card>
    </div>
  );
};

// Apartment Fields Component
const ApartmentFields: React.FC<{ details: any; updateDetail: any }> = ({
  details,
  updateDetail,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <Label>Property Setting *</Label>
      <Select
        value={details.propertySettings}
        onValueChange={v => updateDetail('propertySettings', v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="sectional_title">Sectional Title</SelectItem>
          <SelectItem value="freehold">Freehold</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div>
      <Label>Bedrooms *</Label>
      <Input
        type="number"
        value={details.bedrooms || ''}
        onChange={e => updateDetail('bedrooms', parseInt(e.target.value))}
        min="0"
      />
    </div>

    <div>
      <Label>Bathrooms *</Label>
      <Input
        type="number"
        value={details.bathrooms || ''}
        onChange={e => updateDetail('bathrooms', parseInt(e.target.value))}
        min="0"
        step="0.5"
      />
    </div>

    <div>
      <Label>Unit Size (m²) *</Label>
      <Input
        type="number"
        value={details.unitSizeM2 || ''}
        onChange={e => updateDetail('unitSizeM2', parseInt(e.target.value))}
        min="0"
      />
    </div>

    <div>
      <Label>Floor Number</Label>
      <Input
        type="number"
        value={details.floorNumber || ''}
        onChange={e => updateDetail('floorNumber', parseInt(e.target.value))}
        min="0"
      />
    </div>

    <div>
      <Label>Monthly Levies (R)</Label>
      <Input
        type="number"
        value={details.levies || ''}
        onChange={e => updateDetail('levies', parseInt(e.target.value))}
        min="0"
      />
    </div>

    <div>
      <Label>Rates & Taxes (R)</Label>
      <Input
        type="number"
        value={details.ratesTaxes || ''}
        onChange={e => updateDetail('ratesTaxes', parseInt(e.target.value))}
        min="0"
      />
    </div>

    <div>
      <Label>Parking Type</Label>
      <Select value={details.parkingType} onValueChange={v => updateDetail('parkingType', v)}>
        <SelectTrigger>
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="open">Open Parking</SelectItem>
          <SelectItem value="covered">Covered Parking</SelectItem>
          <SelectItem value="garage">Garage</SelectItem>
          <SelectItem value="none">None</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div className="flex items-center space-x-2">
      <Checkbox
        checked={details.balcony || false}
        onCheckedChange={v => updateDetail('balcony', v)}
      />
      <Label>Has Balcony</Label>
    </div>

    <div className="flex items-center space-x-2">
      <Checkbox
        checked={details.petFriendly || false}
        onCheckedChange={v => updateDetail('petFriendly', v)}
      />
      <Label>Pet Friendly</Label>
    </div>
  </div>
);

// House Fields Component
const HouseFields: React.FC<{ details: any; updateDetail: any }> = ({ details, updateDetail }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <Label>Bedrooms *</Label>
      <Input
        type="number"
        value={details.bedrooms || ''}
        onChange={e => updateDetail('bedrooms', parseInt(e.target.value))}
        min="0"
      />
    </div>

    <div>
      <Label>Bathrooms *</Label>
      <Input
        type="number"
        value={details.bathrooms || ''}
        onChange={e => updateDetail('bathrooms', parseInt(e.target.value))}
        min="0"
        step="0.5"
      />
    </div>

    <div>
      <Label>Erf Size (m²) *</Label>
      <Input
        type="number"
        value={details.erfSizeM2 || ''}
        onChange={e => updateDetail('erfSizeM2', parseInt(e.target.value))}
        min="0"
      />
    </div>

    <div>
      <Label>House Area (m²) *</Label>
      <Input
        type="number"
        value={details.houseAreaM2 || ''}
        onChange={e => updateDetail('houseAreaM2', parseInt(e.target.value))}
        min="0"
      />
    </div>

    <div>
      <Label>Garages</Label>
      <Input
        type="number"
        value={details.garages || ''}
        onChange={e => updateDetail('garages', parseInt(e.target.value))}
        min="0"
      />
    </div>

    <div>
      <Label>Parking Spaces</Label>
      <Input
        type="number"
        value={details.parkingCount || ''}
        onChange={e => updateDetail('parkingCount', parseInt(e.target.value))}
        min="0"
      />
    </div>

    <div>
      <Label>Rates & Taxes (R)</Label>
      <Input
        type="number"
        value={details.ratesTaxes || ''}
        onChange={e => updateDetail('ratesTaxes', parseInt(e.target.value))}
        min="0"
      />
    </div>

    <div>
      <Label>Security Type</Label>
      <Select value={details.security} onValueChange={v => updateDetail('security', v)}>
        <SelectTrigger>
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="alarm">Alarm System</SelectItem>
          <SelectItem value="electric_fence">Electric Fence</SelectItem>
          <SelectItem value="security_estate">Security Estate</SelectItem>
          <SelectItem value="none">None</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div className="flex items-center space-x-2">
      <Checkbox
        checked={details.garden || false}
        onCheckedChange={v => updateDetail('garden', v)}
      />
      <Label>Has Garden</Label>
    </div>

    <div className="flex items-center space-x-2">
      <Checkbox checked={details.pool || false} onCheckedChange={v => updateDetail('pool', v)} />
      <Label>Has Pool</Label>
    </div>

    <div className="flex items-center space-x-2">
      <Checkbox
        checked={details.boundaryWalls || false}
        onCheckedChange={v => updateDetail('boundaryWalls', v)}
      />
      <Label>Boundary Walls</Label>
    </div>
  </div>
);

// Farm Fields Component (simplified for brevity)
const FarmFields: React.FC<{ details: any; updateDetail: any }> = ({ details, updateDetail }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <Label>Land Size (Hectares) *</Label>
      <Input
        type="number"
        value={details.landSizeHa || ''}
        onChange={e => updateDetail('landSizeHa', parseFloat(e.target.value))}
        min="0"
        step="0.1"
      />
    </div>
    <div>
      <Label>Zoning (Agricultural)</Label>
      <Input
        value={details.zoningAgricultural || ''}
        onChange={e => updateDetail('zoningAgricultural', e.target.value)}
      />
    </div>
    <div className="flex items-center space-x-2">
      <Checkbox
        checked={details.residenceIncluded || false}
        onCheckedChange={v => updateDetail('residenceIncluded', v)}
      />
      <Label>Residence Included</Label>
    </div>
  </div>
);

// Land Fields Component
const LandFields: React.FC<{ details: any; updateDetail: any }> = ({ details, updateDetail }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <Label>Land Size (m² or Ha) *</Label>
      <Input
        type="number"
        value={details.landSizeM2OrHa || ''}
        onChange={e => updateDetail('landSizeM2OrHa', parseFloat(e.target.value))}
        min="0"
      />
    </div>
    <div>
      <Label>Zoning</Label>
      <Select value={details.zoning} onValueChange={v => updateDetail('zoning', v)}>
        <SelectTrigger>
          <SelectValue placeholder="Select..." />
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
  </div>
);

// Commercial Fields Component
const CommercialFields: React.FC<{ details: any; updateDetail: any }> = ({
  details,
  updateDetail,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <Label>Subtype *</Label>
      <Select value={details.subtype} onValueChange={v => updateDetail('subtype', v)}>
        <SelectTrigger>
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="office">Office</SelectItem>
          <SelectItem value="retail">Retail</SelectItem>
          <SelectItem value="industrial">Industrial</SelectItem>
          <SelectItem value="warehouse">Warehouse</SelectItem>
          <SelectItem value="mixed">Mixed Use</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div>
      <Label>Floor Area (m²) *</Label>
      <Input
        type="number"
        value={details.floorAreaM2 || ''}
        onChange={e => updateDetail('floorAreaM2', parseInt(e.target.value))}
        min="0"
      />
    </div>
    <div>
      <Label>Parking Bays</Label>
      <Input
        type="number"
        value={details.parkingBays || ''}
        onChange={e => updateDetail('parkingBays', parseInt(e.target.value))}
        min="0"
      />
    </div>
  </div>
);

// Shared Living Fields Component
const SharedLivingFields: React.FC<{ details: any; updateDetail: any }> = ({
  details,
  updateDetail,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <Label>Rooms Available *</Label>
      <Input
        type="number"
        value={details.roomsAvailable || ''}
        onChange={e => updateDetail('roomsAvailable', parseInt(e.target.value))}
        min="1"
      />
    </div>
    <div>
      <Label>Bathroom Type *</Label>
      <Select
        value={details.bathroomTypePerRoom}
        onValueChange={v => updateDetail('bathroomTypePerRoom', v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="shared">Shared</SelectItem>
          <SelectItem value="private">Private per Room</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="flex items-center space-x-2">
      <Checkbox
        checked={details.furnished || false}
        onCheckedChange={v => updateDetail('furnished', v)}
      />
      <Label>Furnished</Label>
    </div>
    <div className="flex items-center space-x-2">
      <Checkbox
        checked={details.internetIncluded || false}
        onCheckedChange={v => updateDetail('internetIncluded', v)}
      />
      <Label>Internet Included</Label>
    </div>
  </div>
);

// Amenities & Features Fields Component
const AmenitiesFeaturesFields: React.FC<{ details: any; updateDetail: any }> = ({
  details,
  updateDetail,
}) => {
  // Define amenities & features options
  const amenitiesOptions = [
    { id: 'waterfront', label: 'Waterfront' },
    { id: 'mountainView', label: 'Mountain View' },
    { id: 'cityView', label: 'City View' },
    { id: 'gatedCommunity', label: 'Gated Community' },
    { id: 'swimmingPool', label: 'Swimming Pool' },
    { id: 'garden', label: 'Garden' },
    { id: 'smartHome', label: 'Smart Home' },
    { id: 'fullyFurnished', label: 'Fully Furnished' },
    { id: 'renovated', label: 'Renovated' },
    { id: 'energyEfficient', label: 'Energy Efficient' },
    { id: 'gym', label: 'Gym' },
    { id: 'braaiArea', label: 'Braai Area' },
    { id: 'joggingTrails', label: 'Jogging Trails' },
    { id: 'kidsPlayArea', label: 'Kids Play Area' },
    { id: 'balcony', label: 'Balcony' },
    { id: 'openPlanLiving', label: 'Open Plan Living' },
    { id: 'builtInCupboards', label: 'Built-in Cupboards' },
    { id: 'ensuiteBathroom', label: 'Ensuite Bathroom' },
  ];

  // Handle checkbox change
  const handleAmenityChange = (amenityId: string, checked: boolean) => {
    // Get current amenities array or initialize as empty array
    const currentAmenities = details.amenitiesFeatures || [];

    if (checked) {
      // Add amenity if checked
      updateDetail('amenitiesFeatures', [...currentAmenities, amenityId]);
    } else {
      // Remove amenity if unchecked
      updateDetail(
        'amenitiesFeatures',
        currentAmenities.filter((id: string) => id !== amenityId),
      );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {amenitiesOptions.map(amenity => (
        <div key={amenity.id} className="flex items-center space-x-2">
          <Checkbox
            id={amenity.id}
            checked={(details.amenitiesFeatures || []).includes(amenity.id)}
            onCheckedChange={checked => handleAmenityChange(amenity.id, !!checked)}
          />
          <Label htmlFor={amenity.id} className="text-sm">
            {amenity.label}
          </Label>
        </div>
      ))}
    </div>
  );
};

// Additional Rooms & Specifications Fields Component
const AdditionalRoomsSpecsFields: React.FC<{ details: any; updateDetail: any }> = ({
  details,
  updateDetail,
}) => {
  // Define common additional rooms & specs options
  const commonOptions = [
    { id: 'scullery', label: 'Scullery' },
    { id: 'walkInCloset', label: 'Walk-in Closet' },
    { id: 'homeOffice', label: 'Home Office' },
    { id: 'pantry', label: 'Pantry' },
    { id: 'braaiBalcony', label: 'Braai Balcony' },
    { id: 'utilityRoom', label: 'Utility Room' },
    { id: 'laundryRoom', label: 'Laundry Room' },
    { id: 'study', label: 'Study' },
    { id: 'storeroom', label: 'Storeroom' },
    { id: 'guestToilet', label: 'Guest Toilet' },
    { id: 'powderRoom', label: 'Powder Room' },
    { id: 'mediaRoom', label: 'Media Room' },
  ];

  // Handle checkbox change for predefined options
  const handleOptionChange = (optionId: string, checked: boolean) => {
    // Get current additional rooms array or initialize as empty array
    const currentRooms = details.additionalRoomsSpecs || [];

    if (checked) {
      // Add option if checked
      updateDetail('additionalRoomsSpecs', [...currentRooms, optionId]);
    } else {
      // Remove option if unchecked
      updateDetail(
        'additionalRoomsSpecs',
        currentRooms.filter((id: string) => id !== optionId),
      );
    }
  };

  // Handle custom input change
  const [customInput, setCustomInput] = React.useState('');

  const addCustomRoom = () => {
    if (customInput.trim()) {
      // Get current additional rooms array or initialize as empty array
      const currentRooms = details.additionalRoomsSpecs || [];

      // Add custom room if it doesn't already exist
      if (!currentRooms.includes(customInput.trim())) {
        updateDetail('additionalRoomsSpecs', [...currentRooms, customInput.trim()]);
        setCustomInput('');
      }
    }
  };

  // Handle removal of custom rooms
  const removeCustomRoom = (room: string) => {
    const currentRooms = details.additionalRoomsSpecs || [];
    updateDetail(
      'additionalRoomsSpecs',
      currentRooms.filter((r: string) => r !== room),
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {commonOptions.map(option => (
          <div key={option.id} className="flex items-center space-x-2">
            <Checkbox
              id={`room-${option.id}`}
              checked={(details.additionalRoomsSpecs || []).includes(option.id)}
              onCheckedChange={checked => handleOptionChange(option.id, !!checked)}
            />
            <Label htmlFor={`room-${option.id}`} className="text-sm">
              {option.label}
            </Label>
          </div>
        ))}
      </div>

      {/* Custom Room Input */}
      <div className="pt-4 border-t border-gray-200">
        <Label className="block mb-2">Add Custom Room/Specification</Label>
        <div className="flex gap-2">
          <Input
            placeholder="e.g., Wine Cellar, Rooftop Terrace, etc."
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustomRoom()}
          />
          <Button onClick={addCustomRoom} size="sm">
            Add
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Press Enter or click "Add" to include custom rooms/specifications
        </p>
      </div>

      {/* Selected Rooms Display */}
      {details.additionalRoomsSpecs && details.additionalRoomsSpecs.length > 0 && (
        <div className="pt-4">
          <Label className="block mb-2">Selected Rooms & Specifications</Label>
          <div className="flex flex-wrap gap-2">
            {details.additionalRoomsSpecs.map((room: string) => (
              <Badge key={room} variant="secondary" className="flex items-center gap-1">
                {room}
                <button
                  onClick={() => removeCustomRoom(room)}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Guide for Agents */}
      <div className="pt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">📋 Guide for Agents</h4>
        <ul className="text-blue-800 text-sm list-disc list-inside space-y-1">
          <li>
            <strong>Scullery:</strong> A small room or area used for washing dishes and cleaning
            utensils
          </li>
          <li>
            <strong>Walk-in Closet:</strong> A closet large enough to walk into, often with built-in
            storage
          </li>
          <li>
            <strong>Home Office:</strong> A dedicated room or area for working from home
          </li>
          <li>
            <strong>Pantry:</strong> A small storage room for food, dishes, and kitchen supplies
          </li>
          <li>
            <strong>Braai Balcony:</strong> A balcony with a built-in braai (barbecue) area
          </li>
          <li>
            <strong>Utility Room:</strong> A room for housing utilities like washing machine, dryer,
            etc.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default BasicInfoStep;
