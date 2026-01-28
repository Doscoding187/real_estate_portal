import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  Zap,
  Wifi,
  Shield,
  Droplets,
  Coins,
  Trees,
  Maximize,
  Check,
  CheckCircle2,
  Lightbulb,
  Warehouse,
  Sofa,
  Mountain,
  X,
  Plus,
  Flame,
  Layers,
  Car,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdditionalInformationStep() {
  const store = useListingWizardStore();
  const propertyType = store.propertyType;
  const additionalInfo = store.additionalInfo || {};
  const [tagInputs, setTagInputs] = React.useState<Record<string, string>>({});

  const updateAdditionalInfo = (field: string, value: any) => {
    store.setAdditionalInfo({ ...additionalInfo, [field]: value });
  };

  const toggleArrayItem = (field: string, item: string) => {
    const currentItems = (additionalInfo[field as keyof typeof additionalInfo] as string[]) || [];
    const newItems = currentItems.includes(item)
      ? currentItems.filter(i => i !== item)
      : [...currentItems, item];
    updateAdditionalInfo(field, newItems);
  };

  const handleTagInputChange = (field: string, value: string) => {
    setTagInputs(prev => ({ ...prev, [field]: value }));
  };

  const addTag = (field: string) => {
    const value = tagInputs[field]?.trim();
    if (!value) return;

    const currentItems = (additionalInfo[field as keyof typeof additionalInfo] as string[]) || [];
    // Prevent duplicates (case-insensitive check could be added here if desired)
    if (!currentItems.includes(value)) {
      updateAdditionalInfo(field, [...currentItems, value]);
    }
    setTagInputs(prev => ({ ...prev, [field]: '' }));
  };

  const removeTag = (field: string, tagToRemove: string) => {
    const currentItems = (additionalInfo[field as keyof typeof additionalInfo] as string[]) || [];
    const newItems = currentItems.filter(item => item !== tagToRemove);
    updateAdditionalInfo(field, newItems);
  };

  const handleKeyDown = (field: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(field);
    }
  };

  const renderSelect = (
    field: string,
    label: string,
    options: { value: string; label: string }[],
    placeholder: string,
    icon?: React.ElementType,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={field} className="text-slate-700 font-medium flex items-center gap-2">
        {icon && React.createElement(icon, { className: 'w-4 h-4 text-emerald-600' })}
        {label}
      </Label>
      <Select
        value={(additionalInfo[field as keyof typeof additionalInfo] as string) || ''}
        onValueChange={value => updateAdditionalInfo(field, value)}
      >
        <SelectTrigger
          id={field}
          className="bg-white border-slate-200 focus:ring-emerald-500 rounded-xl"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
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
    options: { value: string; label: string; icon?: React.ElementType }[],
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
          {options.map(opt => {
            const isSelected = selectedItems.includes(opt.value);
            const Icon = opt.icon;
            return (
              <div
                key={opt.value}
                onClick={() => toggleArrayItem(field, opt.value)}
                className={cn(
                  'cursor-pointer rounded-xl border p-3 transition-all duration-200 flex items-center gap-3 group relative overflow-hidden',
                  isSelected
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50 text-slate-600',
                )}
              >
                {isSelected && (
                  <div className="absolute top-0 right-0 w-0 h-0 border-t-[16px] border-r-[16px] border-t-emerald-500 border-r-transparent rotate-90" />
                )}
                {Icon && (
                  <div
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      isSelected
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-slate-100 text-slate-500 group-hover:text-emerald-500',
                    )}
                  >
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

  const renderHybridInput = (
    field: string,
    label: string,
    placeholder: string,
    icon: React.ElementType | undefined,
    options: { value: string; label: string; icon?: React.ElementType }[],
  ) => {
    const currentTags = (additionalInfo[field as keyof typeof additionalInfo] as string[]) || [];

    // Separate tags into "Predefined" (in options) and "Custom" (not in options)
    const predefinedValues = options.map(o => o.value);
    const customTags = currentTags.filter(tag => !predefinedValues.includes(tag));

    return (
      <div className="space-y-4 col-span-full">
        <Label
          htmlFor={field}
          className="text-slate-700 font-medium text-base flex items-center gap-2"
        >
          {icon && React.createElement(icon, { className: 'w-4 h-4 text-emerald-600' })}
          {label}
        </Label>

        {/* Input for Custom Tags */}
        <div className="flex gap-2">
          <Input
            id={field}
            value={tagInputs[field] || ''}
            onChange={e => handleTagInputChange(field, e.target.value)}
            onKeyDown={e => handleKeyDown(field, e)}
            placeholder={placeholder}
            className="bg-white border-slate-200 focus:ring-emerald-500 rounded-xl"
          />
          <Button
            type="button"
            onClick={() => addTag(field)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4"
          >
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>

        {/* Display Custom Tags */}
        {customTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customTags.map((tag, index) => (
              <div
                key={`custom-${tag}-${index}`}
                className="flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-full text-sm font-medium animate-in fade-in zoom-in duration-200"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(field, tag)}
                  className="ml-1 p-0.5 hover:bg-emerald-200 rounded-full transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Predefined Options Grid */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Common Features
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {options.map(opt => {
              const isSelected = currentTags.includes(opt.value);
              const Icon = opt.icon;
              return (
                <div
                  key={opt.value}
                  onClick={() => toggleArrayItem(field, opt.value)}
                  className={cn(
                    'cursor-pointer rounded-xl border p-3 transition-all duration-200 flex items-center gap-3 group relative overflow-hidden',
                    isSelected
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50 text-slate-600',
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-0 right-0 w-0 h-0 border-t-[16px] border-r-[16px] border-t-emerald-500 border-r-transparent rotate-90" />
                  )}
                  {Icon && (
                    <div
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        isSelected
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-slate-100 text-slate-500 group-hover:text-emerald-500',
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  )}
                  <span className="font-medium text-sm">{opt.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderNumberInput = (
    field: string,
    label: string,
    placeholder: string,
    suffix?: string,
    icon?: React.ElementType,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={field} className="text-slate-700 font-medium flex items-center gap-2">
        {icon && React.createElement(icon, { className: 'w-4 h-4 text-emerald-600' })}
        {label}
      </Label>
      <div className="relative">
        <Input
          id={field}
          type="number"
          min="0"
          placeholder={placeholder}
          value={additionalInfo[field as keyof typeof additionalInfo] || ''}
          onChange={e => updateAdditionalInfo(field, Number(e.target.value))}
          className="bg-white border-slate-200 focus:ring-emerald-500 pr-12 rounded-xl"
        />
        {suffix && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400 text-sm">
            {suffix}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="py-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Property Details</h2>
        <p className="text-slate-500 mt-2">
          Add specific features and details to make your listing stand out.
        </p>
      </div>

      {/* 1. Property Highlights */}
      <Card className="p-6 bg-white/60 backdrop-blur-xl border-slate-200/60 shadow-sm rounded-2xl space-y-6">
        {renderHybridInput(
          'propertyHighlights',
          'Property Highlights',
          'Add custom highlight...',
          Maximize,
          [
            { value: 'High Ceilings', label: 'High Ceilings', icon: Maximize },
            { value: 'Modern Finishes', label: 'Modern Finishes', icon: Check },
            { value: 'Open Plan', label: 'Open Plan', icon: Maximize },
            { value: 'Natural Light', label: 'Natural Light', icon: Trees },
            { value: 'Newly Renovated', label: 'Newly Renovated', icon: Check },
            { value: 'Pet Friendly', label: 'Pet Friendly', icon: Trees },
            { value: 'Secure', label: 'Secure', icon: Shield },
            { value: 'Scenic View', label: 'Scenic View', icon: Mountain },
          ],
        )}
      </Card>

      {/* 2. Additional Rooms */}
      <Card className="p-6 bg-white/60 backdrop-blur-xl border-slate-200/60 shadow-sm rounded-2xl space-y-6">
        {renderHybridInput(
          'additionalRooms',
          'Additional Rooms & Specs',
          'Add custom room...',
          Sofa,
          [
            { value: 'Study / Office', label: 'Study / Office', icon: Sofa },
            { value: 'Staff Quarters', label: 'Staff Quarters', icon: Home },
            { value: 'Scullery', label: 'Scullery', icon: Droplets },
            { value: 'Laundry Room', label: 'Laundry Room', icon: Droplets },
            { value: 'Pantry', label: 'Pantry', icon: Warehouse },
            { value: 'Storage Room', label: 'Storage Room', icon: Warehouse },
            { value: 'Gym', label: 'Gym', icon: Maximize },
            { value: 'Entertainment Area', label: 'Entertainment Area', icon: Sofa },
          ],
        )}
      </Card>

      {/* 3. Property Setting & Utilities */}
      <Card className="p-6 bg-white/60 backdrop-blur-xl border-slate-200/60 shadow-sm rounded-2xl space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
            <Building2 className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Setting & Utilities</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderSelect(
            'propertySetting',
            'Property Setting',
            [
              { value: 'gated_community', label: 'Gated Community' },
              { value: 'standalone', label: 'Standalone' },
              { value: 'complex', label: 'Complex' },
              { value: 'estate_living', label: 'Estate Living' },
            ],
            'Select setting',
            Building2,
          )}

          {additionalInfo.propertySetting === 'estate_living' &&
            renderSelect(
              'estateType',
              'Estate Type',
              [
                { value: 'security_estate', label: 'Security Estate' },
                { value: 'golf_estate', label: 'Golf Estate' },
                { value: 'equestrian_estate', label: 'Equestrian Estate' },
                { value: 'country_estate', label: 'Country Estate' },
                { value: 'nature_estate', label: 'Nature Estate' },
                { value: 'eco_estate', label: 'Eco Estate' },
              ],
              'Select estate type',
              Trees,
            )}

          {renderSelect(
            'powerBackup',
            'Power Backup',
            [
              { value: 'none', label: 'None' },
              { value: 'generator', label: 'Generator' },
              { value: 'inverter', label: 'Inverter' },
              { value: 'solar', label: 'Solar' },
              { value: 'ups', label: 'UPS' },
            ],
            'Select backup',
            Zap,
          )}

          {renderSelect(
            'electricitySupply',
            'Electricity Supply',
            [
              { value: 'prepaid', label: 'Prepaid' },
              { value: 'municipality', label: 'Municipality' },
              { value: 'eskom', label: 'Eskom' },
              { value: 'off_grid', label: 'Off-grid' },
            ],
            'Select supply',
            Lightbulb,
          )}

          {renderSelect(
            'waterSupply',
            'Water Supply',
            [
              { value: 'prepaid', label: 'Prepaid' },
              { value: 'municipality', label: 'Municipality' },
              { value: 'borehole', label: 'Borehole' },
            ],
            'Select water',
            Droplets,
          )}

          {renderSelect(
            'waterHeating',
            'Water Heating',
            [
              { value: 'electric_geyser', label: 'Electric Geyser' },
              { value: 'solar_geyser', label: 'Solar Geyser' },
              { value: 'hybrid', label: 'Hybrid' },
            ],
            'Select heating',
            Flame,
          )}

          {renderSelect(
            'internetAccess',
            'Internet Access',
            [
              { value: 'fibre', label: 'Fibre' },
              { value: 'adsl', label: 'ADSL' },
              { value: 'satellite', label: 'Satellite' },
              { value: 'none', label: 'None' },
            ],
            'Select internet',
            Wifi,
          )}
        </div>
      </Card>

      {/* 5. Interior & Exterior Features */}
      <Card className="p-6 bg-white/60 backdrop-blur-xl border-slate-200/60 shadow-sm rounded-2xl space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
            <Home className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Interior & Exterior Features</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderSelect(
            'ownershipType',
            'Ownership Type',
            [
              { value: 'freehold', label: 'Freehold' },
              { value: 'sectional_title', label: 'Sectional Title' },
              { value: 'leasehold', label: 'Leasehold' },
              { value: 'fractional', label: 'Fractional Ownership' },
              { value: 'share_block', label: 'Share Block' },
            ],
            'Select ownership',
            Home,
          )}

          {renderSelect(
            'flooring',
            'Flooring',
            [
              { value: 'tiled', label: 'Tiled' },
              { value: 'laminated', label: 'Laminated' },
              { value: 'carpets', label: 'Carpets' },
              { value: 'wood', label: 'Solid Wood' },
              { value: 'concrete', label: 'Polished Concrete' },
              { value: 'vinyl', label: 'Vinyl' },
            ],
            'Select flooring',
            Layers,
          )}

          {renderSelect(
            'parkingType',
            'Parking Type',
            [
              { value: 'garage', label: 'Garage' },
              { value: 'covered_carport', label: 'Covered Carport' },
              { value: 'open_parking', label: 'Open Parking' },
              { value: 'street', label: 'Street Parking' },
              { value: 'none', label: 'None' },
            ],
            'Select parking',
            Car,
          )}

          {renderSelect(
            'petFriendly',
            'Pet Friendly',
            [
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
              { value: 'cats_only', label: 'Cats Only' },
              { value: 'dogs_only', label: 'Dogs Only' },
              { value: 'with_permission', label: 'With Permission' },
            ],
            'Select policy',
            CheckCircle2,
          )}
        </div>
      </Card>

      {/* 6. Security */}
      <Card className="p-6 bg-white/60 backdrop-blur-xl border-slate-200/60 shadow-sm rounded-2xl space-y-6">
        {renderMultiSelect('securityFeatures', 'Security Features', [
          { value: 'alarm', label: 'Alarm System', icon: Shield },
          { value: 'electric_fence', label: 'Electric Fence', icon: Zap },
          { value: 'beams', label: 'Outdoor Beams', icon: Check },
          { value: 'cctv', label: 'CCTV Cameras', icon: Check },
          { value: '24hr_guard', label: '24hr Guard', icon: Shield },
          { value: 'access_control', label: 'Access Control', icon: Check },
          { value: 'intercom', label: 'Intercom', icon: Check },
          { value: 'security_gates', label: 'Security Gates', icon: Shield },
        ])}
      </Card>
    </div>
  );
}
