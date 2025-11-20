import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Home, 
  Building2, 
  Warehouse, 
  Wheat, 
  Users, 
  Shield, 
  Trees, 
  Wifi, 
  Wind, 
  Zap,
  Droplets,
  Fence,
  Mountain,
  Truck,
  Check,
  Sofa,
  PawPrint,
  Sun,
  Maximize,
  Layers,
  Waves
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdditionalInformationStep() {
  const store = useListingWizardStore();
  const propertyType = store.propertyType;
  const additionalInfo = store.additionalInfo || {};

  const updateAdditionalInfo = (field: string, value: any) => {
    store.setAdditionalInfo({ ...additionalInfo, [field]: value });
  };

  const toggleArrayItem = (field: string, item: string) => {
    const currentItems = (additionalInfo[field as keyof typeof additionalInfo] as string[]) || [];
    const newItems = currentItems.includes(item)
      ? currentItems.filter((i) => i !== item)
      : [...currentItems, item];
    updateAdditionalInfo(field, newItems);
  };

  const renderSelect = (
    field: string, 
    label: string, 
    options: { value: string; label: string }[], 
    placeholder: string
  ) => (
    <div className="space-y-2">
      <Label htmlFor={field} className="text-slate-700 font-medium">{label}</Label>
      <Select
        value={(additionalInfo[field as keyof typeof additionalInfo] as string) || ''}
        onValueChange={(value) => updateAdditionalInfo(field, value)}
      >
        <SelectTrigger id={field} className="bg-white border-slate-200 focus:ring-blue-500">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const renderMultiSelect = (
    field: string,
    label: string,
    options: { value: string; label: string; icon?: React.ElementType }[]
  ) => {
    const selectedItems = (additionalInfo[field as keyof typeof additionalInfo] as string[]) || [];
    
    return (
      <div className="space-y-3 col-span-full">
        <Label className="text-slate-700 font-medium text-base flex items-center gap-2">
          {label}
          <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            Select all that apply
          </span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {options.map((opt) => {
            const isSelected = selectedItems.includes(opt.value);
            const Icon = opt.icon;
            return (
              <div
                key={opt.value}
                onClick={() => toggleArrayItem(field, opt.value)}
                className={cn(
                  "cursor-pointer rounded-xl border p-3 transition-all duration-200 flex items-center gap-3 group relative overflow-hidden",
                  isSelected
                    ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                    : "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-600"
                )}
              >
                {isSelected && (
                  <div className="absolute top-0 right-0 w-0 h-0 border-t-[16px] border-r-[16px] border-t-blue-500 border-r-transparent rotate-90" />
                )}
                {Icon && (
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    isSelected ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500 group-hover:text-blue-500"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                )}
                <span className="font-medium text-sm">{opt.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderNumberInput = (field: string, label: string, placeholder: string, suffix?: string) => (
    <div className="space-y-2">
      <Label htmlFor={field} className="text-slate-700 font-medium">{label}</Label>
      <div className="relative">
        <Input
          id={field}
          type="number"
          min="0"
          placeholder={placeholder}
          value={additionalInfo[field as keyof typeof additionalInfo] || ''}
          onChange={(e) => updateAdditionalInfo(field, Number(e.target.value))}
          className="bg-white border-slate-200 focus:ring-blue-500 pr-12"
        />
        {suffix && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400 text-sm">
            {suffix}
          </div>
        )}
      </div>
    </div>
  );

  // --- Residential Section ---
  const renderResidential = () => (
    <div className="space-y-8">
      <Card className="p-6 bg-white/50 backdrop-blur-sm border-slate-200/60 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
            <Sofa className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Interior Details</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderSelect('furnishingStatus', 'Furnishing Status', [
            { value: 'unfurnished', label: 'Unfurnished' },
            { value: 'semi_furnished', label: 'Semi-Furnished' },
            { value: 'fully_furnished', label: 'Fully Furnished' },
          ], 'Select status')}
          {renderSelect('flooring', 'Flooring Type', [
            { value: 'tile', label: 'Tile' },
            { value: 'carpet', label: 'Carpet' },
            { value: 'wood', label: 'Wood' },
            { value: 'laminate', label: 'Laminate' },
            { value: 'concrete', label: 'Concrete' },
            { value: 'other', label: 'Other' },
          ], 'Select flooring')}
          {renderSelect('petPolicy', 'Pet Policy', [
            { value: 'allowed', label: 'Pets Allowed' },
            { value: 'cats_only', label: 'Cats Only' },
            { value: 'no_pets', label: 'No Pets' },
            { value: 'by_arrangement', label: 'By Arrangement' },
          ], 'Select policy')}
        </div>
      </Card>

      <Card className="p-6 bg-white/50 backdrop-blur-sm border-slate-200/60 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
            <Home className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Exterior Details</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderSelect('roofType', 'Roof Type', [
            { value: 'tile', label: 'Tile' },
            { value: 'metal', label: 'Metal / Zinc' },
            { value: 'slate', label: 'Slate' },
            { value: 'thatch', label: 'Thatch' },
            { value: 'concrete', label: 'Concrete' },
            { value: 'other', label: 'Other' },
          ], 'Select roof')}
          {renderSelect('wallType', 'Wall Type', [
            { value: 'brick', label: 'Brick' },
            { value: 'plaster', label: 'Plaster' },
            { value: 'wood', label: 'Wood' },
            { value: 'stone', label: 'Stone' },
            { value: 'concrete', label: 'Concrete' },
            { value: 'other', label: 'Other' },
          ], 'Select wall')}
          {renderSelect('windowType', 'Window Type', [
            { value: 'aluminium', label: 'Aluminium' },
            { value: 'steel', label: 'Steel' },
            { value: 'wood', label: 'Wood' },
            { value: 'pvc', label: 'PVC' },
            { value: 'other', label: 'Other' },
          ], 'Select window')}
        </div>
      </Card>

      <Card className="p-6 bg-white/50 backdrop-blur-sm border-slate-200/60 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2 bg-green-100 rounded-lg text-green-600">
            <Trees className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Amenities & Features</h3>
        </div>
        <div className="grid grid-cols-1 gap-8">
          {renderMultiSelect('securityFeatures', 'Security Features', [
            { value: 'alarm', label: 'Alarm System', icon: Shield },
            { value: 'electric_fence', label: 'Electric Fence', icon: Zap },
            { value: 'beams', label: 'Outdoor Beams', icon: Sun },
            { value: 'cctv', label: 'CCTV Cameras', icon: Check },
            { value: '24hr_guard', label: '24hr Guard', icon: Shield },
            { value: 'access_control', label: 'Access Control', icon: Check },
          ])}
          {renderMultiSelect('outdoorFeatures', 'Outdoor Features', [
            { value: 'pool', label: 'Swimming Pool', icon: Droplets },
            { value: 'garden', label: 'Garden', icon: Trees },
            { value: 'braai_area', label: 'Braai Area', icon: Sun },
            { value: 'patio', label: 'Patio', icon: Maximize },
            { value: 'balcony', label: 'Balcony', icon: Maximize },
            { value: 'deck', label: 'Deck', icon: Layers },
          ])}
        </div>
      </Card>
    </div>
  );

  // --- Commercial Section ---
  const renderCommercial = () => (
    <div className="space-y-8">
      <Card className="p-6 bg-white/50 backdrop-blur-sm border-slate-200/60 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
            <Building2 className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Building Specifications</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderSelect('grade', 'Building Grade', [
            { value: 'premium', label: 'Premium Grade' },
            { value: 'a_grade', label: 'A-Grade' },
            { value: 'b_grade', label: 'B-Grade' },
            { value: 'c_grade', label: 'C-Grade' },
          ], 'Select grade')}
          {renderSelect('airConditioning', 'Air Conditioning', [
            { value: 'central', label: 'Central AC' },
            { value: 'split_units', label: 'Split Units' },
            { value: 'evaporative', label: 'Evaporative' },
            { value: 'none', label: 'None' },
          ], 'Select AC type')}
          {renderSelect('internetAccess', 'Internet Access', [
            { value: 'fibre', label: 'Fibre' },
            { value: 'lte', label: 'LTE / 5G' },
            { value: 'adsl', label: 'ADSL' },
            { value: 'satellite', label: 'Satellite' },
            { value: 'none', label: 'None' },
          ], 'Select internet')}
        </div>
      </Card>

      <Card className="p-6 bg-white/50 backdrop-blur-sm border-slate-200/60 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
            <Truck className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Logistics & Access</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderNumberInput('loadingDocks', 'Loading Docks', '0', 'docks')}
          {renderSelect('truckAccess', 'Truck Access', [
            { value: 'superlink', label: 'Superlink' },
            { value: 'rigid', label: 'Rigid' },
            { value: 'small_truck', label: 'Small Truck' },
            { value: 'none', label: 'None' },
          ], 'Select access')}
          {renderNumberInput('parkingRatio', 'Parking Ratio', '0', 'bays/100m²')}
        </div>
      </Card>
    </div>
  );

  // --- Farm Section ---
  const renderFarm = () => (
    <div className="space-y-8">
      {propertyType === 'farm' && (
        <Card className="p-6 bg-white/50 backdrop-blur-sm border-slate-200/60 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 bg-green-100 rounded-lg text-green-600">
              <Wheat className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Land Usage</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {renderNumberInput('arableLandHa', 'Arable Land', '0', 'ha')}
            {renderNumberInput('grazingLandHa', 'Grazing Land', '0', 'ha')}
            {renderSelect('irrigationType', 'Irrigation Type', [
              { value: 'pivot', label: 'Center Pivot' },
              { value: 'drip', label: 'Drip' },
              { value: 'flood', label: 'Flood' },
              { value: 'micro', label: 'Micro' },
              { value: 'none', label: 'None' },
            ], 'Select irrigation')}
          </div>
        </Card>
      )}

      <Card className="p-6 bg-white/50 backdrop-blur-sm border-slate-200/60 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
            <Fence className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">
            {propertyType === 'farm' ? 'Infrastructure & Features' : 'Land Features'}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {renderSelect('fencing', 'Fencing Type', [
            { value: 'game', label: 'Game Fencing' },
            { value: 'cattle', label: 'Cattle Fencing' },
            { value: 'electric', label: 'Electric' },
            { value: 'barbed_wire', label: 'Barbed Wire' },
            { value: 'mesh', label: 'Mesh' },
            { value: 'none', label: 'None' },
          ], 'Select fencing')}
          {renderSelect('topography', 'Topography', [
            { value: 'flat', label: 'Flat' },
            { value: 'sloped', label: 'Sloped' },
            { value: 'hilly', label: 'Hilly' },
            { value: 'mountainous', label: 'Mountainous' },
            { value: 'mixed', label: 'Mixed' },
          ], 'Select topography')}
        </div>
        {renderMultiSelect('waterSources', 'Water Sources', [
          { value: 'borehole', label: 'Borehole', icon: Droplets },
          { value: 'river', label: 'River / Stream', icon: Waves },
          { value: 'dam', label: 'Dam', icon: Droplets },
          { value: 'municipal', label: 'Municipal', icon: Building2 },
          { value: 'rainwater', label: 'Rainwater Harvesting', icon: Droplets },
        ])}
      </Card>
    </div>
  );

  // --- Shared Living Section ---
  const renderSharedLiving = () => (
    <div className="space-y-8">
      <Card className="p-6 bg-white/50 backdrop-blur-sm border-slate-200/60 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Living Arrangements</h3>
        </div>
        <div className="grid grid-cols-1 gap-8">
          {renderNumberInput('minimumStayMonths', 'Minimum Stay', '1', 'months')}
          {renderMultiSelect('billsIncluded', 'Bills Included in Rent', [
            { value: 'water', label: 'Water', icon: Droplets },
            { value: 'electricity', label: 'Electricity', icon: Zap },
            { value: 'wifi', label: 'WiFi / Internet', icon: Wifi },
            { value: 'cleaning', label: 'Cleaning Service', icon: Check },
            { value: 'gas', label: 'Gas', icon: Wind },
          ])}
          {renderMultiSelect('houseRules', 'House Rules', [
            { value: 'no_smoking', label: 'No Smoking', icon: Check },
            { value: 'no_overnight_guests', label: 'No Overnight Guests', icon: Users },
            { value: 'quiet_hours', label: 'Quiet Hours', icon: Check },
            { value: 'no_parties', label: 'No Parties', icon: Check },
            { value: 'clean_up_after_self', label: 'Clean Up After Self', icon: Check },
          ])}
        </div>
      </Card>
    </div>
  );

  return (
    <div className="py-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Additional Details</h2>
        <p className="text-slate-500 mt-2">
          Tell us more about the specific features of your property.
        </p>
      </div>

      {/* Dynamic Content based on Property Type */}
      {(propertyType === 'house' || propertyType === 'apartment') && renderResidential()}
      {propertyType === 'commercial' && renderCommercial()}
      {(propertyType === 'farm' || propertyType === 'land') && renderFarm()}
      {propertyType === 'shared_living' && renderSharedLiving()}

      {/* Fallback for unhandled types (shouldn't happen with current types but good for safety) */}
      {!['house', 'apartment', 'commercial', 'farm', 'land', 'shared_living'].includes(propertyType || '') && (
        <Card className="p-8 text-center border-dashed border-2 border-slate-200 bg-slate-50/50">
          <p className="text-slate-500">No additional specific details required for this property type.</p>
        </Card>
      )}
    </div>
  );
}
