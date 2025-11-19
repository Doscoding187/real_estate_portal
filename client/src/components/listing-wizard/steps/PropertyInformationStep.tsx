/**
 * Step 4: Property Information (Merged from BasicInfo + PropertyDetails)
 * Collects title, description, and all property-specific fields
 */

import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Home, FileText, Bed, Bath, Car, Maximize2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { PropertyType } from '@/../../shared/listing-types';

const PropertyInformationStep: React.FC = () => {
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
      {/* Title & Description Section */}
      <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <FileText className="h-5 w-5" />
            Listing Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-semibold">
              Property Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Luxury 3-Bedroom Apartment in Cape Town CBD"
              className="text-lg border-blue-200 focus:border-blue-400 focus:ring-blue-400"
              maxLength={255}
            />
            <p className="text-xs text-gray-500">{title.length}/255 characters (minimum 10 required)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold">
              Property Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide a detailed description of your property..."
              className="min-h-[150px] border-blue-200 focus:border-blue-400 focus:ring-blue-400"
              maxLength={5000}
            />
            <p className="text-xs text-gray-500">
              {description.length}/5000 characters (minimum 50 required)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Property-Specific Fields */}
      <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Home className="h-5 w-5" />
            Property Specifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderPropertyFields()}
        </CardContent>
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
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Bed className="h-4 w-4 text-purple-600" />
        Bedrooms *
      </Label>
      <Input
        type="number"
        value={details.bedrooms || ''}
        onChange={e => updateDetail('bedrooms', parseInt(e.target.value))}
        min="0"
        className="border-purple-200 focus:border-purple-400"
      />
    </div>

    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Bath className="h-4 w-4 text-purple-600" />
        Bathrooms *
      </Label>
      <Input
        type="number"
        value={details.bathrooms || ''}
        onChange={e => updateDetail('bathrooms', parseInt(e.target.value))}
        min="0"
        step="0.5"
        className="border-purple-200 focus:border-purple-400"
      />
    </div>

    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Maximize2 className="h-4 w-4 text-purple-600" />
        Unit Size (m²) *
      </Label>
      <Input
        type="number"
        value={details.unitSizeM2 || ''}
        onChange={e => updateDetail('unitSizeM2', parseInt(e.target.value))}
        min="0"
        className="border-purple-200 focus:border-purple-400"
      />
    </div>

    <div className="space-y-2">
      <Label>Floor Number</Label>
      <Input
        type="number"
        value={details.floorNumber || ''}
        onChange={e => updateDetail('floorNumber', parseInt(e.target.value))}
        min="0"
        className="border-purple-200 focus:border-purple-400"
      />
    </div>

    <div className="space-y-2">
      <Label>Monthly Levies (R)</Label>
      <Input
        type="number"
        value={details.levies || ''}
        onChange={e => updateDetail('levies', parseInt(e.target.value))}
        min="0"
        className="border-purple-200 focus:border-purple-400"
      />
    </div>

    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Car className="h-4 w-4 text-purple-600" />
        Parking Type
      </Label>
      <Select value={details.parkingType} onValueChange={v => updateDetail('parkingType', v)}>
        <SelectTrigger className="border-purple-200 focus:border-purple-400">
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

    <div className="flex items-center space-x-2 col-span-2">
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
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Bed className="h-4 w-4 text-purple-600" />
        Bedrooms *
      </Label>
      <Input
        type="number"
        value={details.bedrooms || ''}
        onChange={e => updateDetail('bedrooms', parseInt(e.target.value))}
        min="0"
        className="border-purple-200 focus:border-purple-400"
      />
    </div>

    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Bath className="h-4 w-4 text-purple-600" />
        Bathrooms *
      </Label>
      <Input
        type="number"
        value={details.bathrooms || ''}
        onChange={e => updateDetail('bathrooms', parseInt(e.target.value))}
        min="0"
        step="0.5"
        className="border-purple-200 focus:border-purple-400"
      />
    </div>

    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Maximize2 className="h-4 w-4 text-purple-600" />
        Erf Size (m²) *
      </Label>
      <Input
        type="number"
        value={details.erfSizeM2 || ''}
        onChange={e => updateDetail('erfSizeM2', parseInt(e.target.value))}
        min="0"
        className="border-purple-200 focus:border-purple-400"
      />
    </div>

    <div className="space-y-2">
      <Label>House Area (m²) *</Label>
      <Input
        type="number"
        value={details.houseAreaM2 || ''}
        onChange={e => updateDetail('houseAreaM2', parseInt(e.target.value))}
        min="0"
        className="border-purple-200 focus:border-purple-400"
      />
    </div>

    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Car className="h-4 w-4 text-purple-600" />
        Garages
      </Label>
      <Input
        type="number"
        value={details.garages || ''}
        onChange={e => updateDetail('garages', parseInt(e.target.value))}
        min="0"
        className="border-purple-200 focus:border-purple-400"
      />
    </div>

    <div className="space-y-2">
      <Label>Parking Spaces</Label>
      <Input
        type="number"
        value={details.parkingCount || ''}
        onChange={e => updateDetail('parkingCount', parseInt(e.target.value))}
        min="0"
        className="border-purple-200 focus:border-purple-400"
      />
    </div>

    <div className="flex items-center space-x-2">
      <Checkbox checked={details.garden || false} onCheckedChange={v => updateDetail('garden', v)} />
      <Label>Has Garden</Label>
    </div>

    <div className="flex items-center space-x-2">
      <Checkbox checked={details.pool || false} onCheckedChange={v => updateDetail('pool', v)} />
      <Label>Has Pool</Label>
    </div>
  </div>
);

// Farm Fields Component
const FarmFields: React.FC<{ details: any; updateDetail: any }> = ({ details, updateDetail }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label>Land Size (Hectares) *</Label>
      <Input
        type="number"
        value={details.landSizeHa || ''}
        onChange={e => updateDetail('landSizeHa', parseFloat(e.target.value))}
        min="0"
        step="0.1"
        className="border-purple-200 focus:border-purple-400"
      />
    </div>
    <div className="space-y-2">
      <Label>Zoning (Agricultural)</Label>
      <Input
        value={details.zoningAgricultural || ''}
        onChange={e => updateDetail('zoningAgricultural', e.target.value)}
        className="border-purple-200 focus:border-purple-400"
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
    <div className="space-y-2">
      <Label>Land Size (m² or Ha) *</Label>
      <Input
        type="number"
        value={details.landSizeM2OrHa || ''}
        onChange={e => updateDetail('landSizeM2OrHa', parseFloat(e.target.value))}
        min="0"
        className="border-purple-200 focus:border-purple-400"
      />
    </div>
    <div className="space-y-2">
      <Label>Zoning</Label>
      <Select value={details.zoning} onValueChange={v => updateDetail('zoning', v)}>
        <SelectTrigger className="border-purple-200 focus:border-purple-400">
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
    <div className="space-y-2">
      <Label>Subtype *</Label>
      <Select value={details.subtype} onValueChange={v => updateDetail('subtype', v)}>
        <SelectTrigger className="border-purple-200 focus:border-purple-400">
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
    <div className="space-y-2">
      <Label>Floor Area (m²) *</Label>
      <Input
        type="number"
        value={details.floorAreaM2 || ''}
        onChange={e => updateDetail('floorAreaM2', parseInt(e.target.value))}
        min="0"
        className="border-purple-200 focus:border-purple-400"
      />
    </div>
    <div className="space-y-2">
      <Label>Parking Bays</Label>
      <Input
        type="number"
        value={details.parkingBays || ''}
        onChange={e => updateDetail('parkingBays', parseInt(e.target.value))}
        min="0"
        className="border-purple-200 focus:border-purple-400"
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
    <div className="space-y-2">
      <Label>Rooms Available *</Label>
      <Input
        type="number"
        value={details.roomsAvailable || ''}
        onChange={e => updateDetail('roomsAvailable', parseInt(e.target.value))}
        min="1"
        className="border-purple-200 focus:border-purple-400"
      />
    </div>
    <div className="space-y-2">
      <Label>Bathroom Type *</Label>
      <Select
        value={details.bathroomTypePerRoom}
        onValueChange={v => updateDetail('bathroomTypePerRoom', v)}
      >
        <SelectTrigger className="border-purple-200 focus:border-purple-400">
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

export default PropertyInformationStep;
