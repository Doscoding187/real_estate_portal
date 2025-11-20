/**
 * Step 4: Basic Information
 * 
 * Dynamic form that adapts based on:
 * - Transaction Type (sell/rent/auction)
 * - Property Type (apartment/house/farm/land/commercial)
 * - Badge/Status (ready_to_move/occupied/off_plan/under_construction)
 */

import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { MapPin, DollarSign, Home, Calendar, Info } from 'lucide-react';
import type { ListingAction, PropertyType, ListingBadge } from '@/../../shared/listing-types';

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

  // Update handlers
  const updateBasicInfo = (field: string, value: any) => {
    store.setBasicInfo?.({ ...basicInfo, [field]: value }) || 
    store.updatePropertyDetail?.(field, value);
  };

  const updateTitle = (value: string) => store.setTitle(value);
  const updateDescription = (value: string) => store.setDescription(value);

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
              placeholder="e.g., Modern 3-Bedroom Apartment in Sandton"
              className="mt-1"
              maxLength={100}
            />
            <p className="text-xs text-slate-500 mt-1">{title.length}/100 characters</p>
          </div>

          {/* Property Description */}
          <div>
            <Label htmlFor="description" className="text-slate-700">Property Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => updateDescription(e.target.value)}
              placeholder="Describe your property in detail..."
              className="mt-1 min-h-[120px]"
              maxLength={2000}
            />
            <p className="text-xs text-slate-500 mt-1">{description.length}/2000 characters</p>
          </div>
        </div>
      </Card>

      {/* Property Category Selection (for all transactions) */}
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Home className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-slate-800">Property Category</h3>
        </div>

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
      </Card>

      {/* Property Highlights (4 fields per type) */}
      {propertyType && (
        <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Home className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-800">Property Highlights</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Apartment Highlights */}
            {propertyType === 'apartment' && (
              <>
                <div>
                  <Label htmlFor="bedrooms" className="text-slate-700">Bedrooms *</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    value={propertyDetails.bedrooms || ''}
                    onChange={(e) => store.updatePropertyDetail('bedrooms', Number(e.target.value))}
                    placeholder="e.g., 3"
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
                    placeholder="e.g., 2"
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
                    placeholder="e.g., 120"
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
                    placeholder="e.g., 5"
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
                  <Label htmlFor="landSizeHa" className="text-slate-700">Total Land Size (Ha) *</Label>
                  <Input
                    id="landSizeHa"
                    type="number"
                    value={propertyDetails.landSizeHa || ''}
                    onChange={(e) => store.updatePropertyDetail('landSizeHa', Number(e.target.value))}
                    placeholder="e.g., 50"
                    className="mt-1"
                  />
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
                  <Label htmlFor="landSizeM2OrHa" className="text-slate-700">Plot Size (m²) *</Label>
                  <Input
                    id="landSizeM2OrHa"
                    type="number"
                    value={propertyDetails.landSizeM2OrHa || ''}
                    onChange={(e) => store.updatePropertyDetail('landSizeM2OrHa', Number(e.target.value))}
                    placeholder="e.g., 1000"
                    className="mt-1"
                  />
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
                  <Label htmlFor="subtype" className="text-slate-700">Property Use Type *</Label>
                  <Select
                    value={propertyDetails.subtype || ''}
                    onValueChange={(value) => store.updatePropertyDetail('subtype', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select use type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                    </SelectContent>
                  </Select>
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

      {/* Additional Details - Based on Property Category */}
      {basicInfo.propertyCategory && (
        <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-bold text-slate-800">Additional Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Existing Property Fields */}
            {basicInfo.propertyCategory === 'existing' && (
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
                <div>
                  <Label htmlFor="developerName" className="text-slate-700">Developer Name *</Label>
                  <Input
                    id="developerName"
                    value={basicInfo.developerName || ''}
                    onChange={(e) => updateBasicInfo('developerName', e.target.value)}
                    placeholder="e.g., ABC Developments"
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    This will link to registered developers or prompt for registration
                  </p>
                </div>

                <div>
                  <Label htmlFor="developmentName" className="text-slate-700">Development Name *</Label>
                  <Input
                    id="developmentName"
                    value={basicInfo.developmentName || ''}
                    onChange={(e) => updateBasicInfo('developmentName', e.target.value)}
                    placeholder="e.g., Sunset Gardens Estate"
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Select from registered developments or add new
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default BasicInformationStep;
