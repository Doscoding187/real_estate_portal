// @ts-nocheck
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
  const basicInfo = (store as any).basicInfo || {};
  const rawDevelopmentAssociation =
    basicInfo.developmentAssociation ||
    (basicInfo.selectedDevelopmentId || basicInfo.developmentName ? 'linked' : 'none');
  const developmentAssociation =
    rawDevelopmentAssociation === 'linked'
      ? 'link_existing'
      : rawDevelopmentAssociation === 'new'
        ? 'add_new'
        : rawDevelopmentAssociation === 'none'
          ? 'no_link'
          : rawDevelopmentAssociation;
  const propertySetting = additionalInfo.propertySetting;
  const shouldShowComplexEstateAmenities =
    propertyType === 'apartment' ||
    developmentAssociation !== 'no_link' ||
    propertySetting === 'complex' ||
    propertySetting === 'estate_living' ||
    propertySetting === 'gated_community';
  const [tagInputs, setTagInputs] = React.useState<Record<string, string>>({});

  const updateAdditionalInfo = (field: string, value: any) => {
    const nextInfo: Record<string, any> = { [field]: value };

    if (field === 'lifestyleHighlights') {
      nextInfo.propertyHighlights = value;
    }

    store.setAdditionalInfo(nextInfo);
  };

  const getArrayField = (field: string): string[] => {
    const directValue = additionalInfo[field as keyof typeof additionalInfo] as string[] | undefined;
    if (field === 'lifestyleHighlights') {
      if (Array.isArray(directValue) && directValue.length > 0) return directValue;
      return (additionalInfo.propertyHighlights as string[] | undefined) ?? [];
    }
    return directValue || [];
  };

  const handleTagInputChange = (field: string, value: string) => {
    setTagInputs(prev => ({ ...prev, [field]: value }));
  };

  const normalizeTag = (value: string) => value.trim().toLowerCase();

  const getTagIdentityKeys = (
    value: string,
    options: { value: string; label: string; icon?: React.ElementType }[] = [],
  ) => {
    const normalizedValue = normalizeTag(value);
    const keys = new Set([normalizedValue]);

    options.forEach(option => {
      const optionValue = normalizeTag(option.value);
      const optionLabel = normalizeTag(option.label);
      if (optionValue === normalizedValue || optionLabel === normalizedValue) {
        keys.add(optionValue);
        keys.add(optionLabel);
      }
    });

    return keys;
  };

  const addTagValue = (
    field: string,
    value: string,
    options: { value: string; label: string; icon?: React.ElementType }[] = [],
  ) => {
    const cleanedValue = value.trim();
    if (!cleanedValue) return;

    const currentItems = getArrayField(field);
    const nextKeys = getTagIdentityKeys(cleanedValue, options);
    const exists = currentItems.some(item => {
      const itemKeys = getTagIdentityKeys(item, options);
      return [...itemKeys].some(key => nextKeys.has(key));
    });
    if (!exists) {
      updateAdditionalInfo(field, [...currentItems, cleanedValue]);
    }
    setTagInputs(prev => ({ ...prev, [field]: '' }));
  };

  const removeTag = (field: string, tagToRemove: string) => {
    const currentItems = getArrayField(field);
    const newItems = currentItems.filter(item => normalizeTag(item) !== normalizeTag(tagToRemove));
    updateAdditionalInfo(field, newItems);
  };

  const handleKeyDown = (
    field: string,
    options: { value: string; label: string; icon?: React.ElementType }[],
    e: React.KeyboardEvent,
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = tagInputs[field]?.trim();
      if (!value) return;

      const matchingOption = options.find(
        option =>
          normalizeTag(option.label) === normalizeTag(value) ||
          normalizeTag(option.value) === normalizeTag(value),
      );
      addTagValue(field, matchingOption?.value || value, options);
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

  const renderSmartTagInput = (
    field: string,
    label: string,
    placeholder: string,
    icon: React.ElementType | undefined,
    options: { value: string; label: string; icon?: React.ElementType }[],
  ) => {
    const selectedItems = getArrayField(field);
    const query = (tagInputs[field] || '').trim();
    const selectedKeys = new Set(
      selectedItems.flatMap(item => [...getTagIdentityKeys(item, options)]),
    );
    const optionLabelByValue = new Map(options.map(option => [option.value, option.label]));
    const availableOptions = options.filter(option => !selectedKeys.has(normalizeTag(option.value)));
    const suggestedOptions = (query
      ? availableOptions.filter(
          option =>
            normalizeTag(option.label).includes(normalizeTag(query)) ||
            normalizeTag(option.value).includes(normalizeTag(query)),
        )
      : availableOptions
    ).slice(0, query ? 8 : 6);
    const exactOptionMatch = options.some(
      option =>
        normalizeTag(option.label) === normalizeTag(query) ||
        normalizeTag(option.value) === normalizeTag(query),
    );
    const canAddCustom =
      query.length > 0 &&
      !exactOptionMatch &&
      !selectedItems.some(item => {
        const itemKeys = getTagIdentityKeys(item, options);
        const queryKeys = getTagIdentityKeys(query, options);
        return [...itemKeys].some(key => queryKeys.has(key));
      });

    return (
      <div className="space-y-4 col-span-full">
        <Label
          htmlFor={field}
          className="text-slate-700 font-medium text-base flex items-center gap-2"
        >
          {icon && React.createElement(icon, { className: 'w-4 h-4 text-emerald-600' })}
          {label}
        </Label>

        {selectedItems.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedItems.map((item, index) => (
              <div
                key={`${field}-selected-${item}-${index}`}
                className="flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-full text-sm font-medium"
              >
                {optionLabelByValue.get(item) || item}
                <button
                  type="button"
                  onClick={() => removeTag(field, item)}
                  className="ml-1 p-0.5 hover:bg-emerald-200 rounded-full transition-colors"
                  aria-label={`Remove ${optionLabelByValue.get(item) || item}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            id={field}
            value={tagInputs[field] || ''}
            onChange={e => handleTagInputChange(field, e.target.value)}
            onKeyDown={e => handleKeyDown(field, options, e)}
            placeholder={placeholder}
            className="bg-white border-slate-200 focus:ring-emerald-500 rounded-xl"
          />
          <Button
            type="button"
            onClick={() => {
              const value = tagInputs[field]?.trim();
              if (!value) return;
              const matchingOption = options.find(
                option =>
                  normalizeTag(option.label) === normalizeTag(value) ||
                  normalizeTag(option.value) === normalizeTag(value),
              );
              addTagValue(field, matchingOption?.value || value, options);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4"
          >
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {query ? 'Matching Suggestions' : 'Suggested'}
            </p>
            {!query && availableOptions.length > suggestedOptions.length && (
              <p className="text-xs text-slate-500">
                Type to search {availableOptions.length - suggestedOptions.length} more
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {suggestedOptions.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => addTagValue(field, opt.value, options)}
                  className={cn(
                    'rounded-full border px-3 py-2 transition-all duration-200 flex items-center gap-2 text-sm font-medium',
                    'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-600',
                  )}
                >
                  {Icon && (
                    <Icon className="w-4 h-4 text-emerald-600" />
                  )}
                  {opt.label}
                </button>
              );
            })}

            {canAddCustom && (
              <button
                type="button"
                onClick={() => addTagValue(field, query, options)}
                className="rounded-full border border-dashed border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                Add "{query}"
              </button>
            )}

            {suggestedOptions.length === 0 && !canAddCustom && (
              <span className="text-sm text-slate-500">No matching suggestions.</span>
            )}
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
        <h2 className="text-2xl font-bold text-slate-800">Features, Finishes & Specifications</h2>
        <p className="text-slate-500 mt-2">
          Capture the finishes, lifestyle features, and amenities that make this listing easier to
          understand.
        </p>
      </div>

      {/* 1. Setting & Utilities */}
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

          {renderSelect(
            'security',
            'Security',
            [
              { value: 'standard', label: 'Standard Security' },
              { value: 'complex_security', label: 'Complex Security' },
              { value: 'estate_security', label: 'Estate Security' },
              { value: 'paid_security', label: 'Paid Security' },
              { value: 'none', label: 'None' },
            ],
            'Select security',
            Shield,
          )}
        </div>
      </Card>

      {/* 2. Interior Finishes */}
      <Card className="p-6 bg-white/60 backdrop-blur-xl border-slate-200/60 shadow-sm rounded-2xl space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
            <Home className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Interior Finishes</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderSelect(
            'furnishingStatus',
            'Furnishing',
            [
              { value: 'unfurnished', label: 'Unfurnished' },
              { value: 'semi_furnished', label: 'Semi-Furnished' },
              { value: 'fully_furnished', label: 'Fully Furnished' },
            ],
            'Select furnishing',
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
            'kitchenType',
            'Kitchen Style',
            [
              { value: 'open_plan', label: 'Open Plan' },
              { value: 'separate', label: 'Separate Kitchen' },
              { value: 'modern_fitted', label: 'Modern Fitted' },
              { value: 'galley', label: 'Galley Kitchen' },
              { value: 'island', label: 'Kitchen Island' },
              { value: 'shared', label: 'Shared Kitchen' },
            ],
            'Select kitchen style',
            Home,
          )}

          {renderSelect(
            'countertopMaterial',
            'Countertops',
            [
              { value: 'granite', label: 'Granite' },
              { value: 'quartz', label: 'Quartz' },
              { value: 'caesarstone', label: 'Caesarstone' },
              { value: 'marble', label: 'Marble' },
              { value: 'laminate', label: 'Laminate' },
              { value: 'concrete', label: 'Concrete' },
              { value: 'wood', label: 'Wood' },
            ],
            'Select countertops',
            Layers,
          )}

          {renderSelect(
            'builtInCupboards',
            'Built-in Cupboards',
            [
              { value: 'yes', label: 'Yes' },
              { value: 'partial', label: 'Partial' },
              { value: 'no', label: 'No' },
            ],
            'Select cupboards',
            Warehouse,
          )}

          {renderSelect(
            'airConditioning',
            'Air Conditioning',
            [
              { value: 'none', label: 'None' },
              { value: 'split_units', label: 'Split Units' },
              { value: 'central', label: 'Central' },
              { value: 'evaporative', label: 'Evaporative' },
            ],
            'Select air conditioning',
            Lightbulb,
          )}

          {renderSelect(
            'fireplace',
            'Fireplace',
            [
              { value: 'none', label: 'None' },
              { value: 'wood', label: 'Wood Fireplace' },
              { value: 'gas', label: 'Gas Fireplace' },
              { value: 'electric', label: 'Electric Fireplace' },
            ],
            'Select fireplace',
            Flame,
          )}

        </div>
      </Card>

      {/* 3. Additional Rooms & Specs */}
      <Card className="p-6 bg-white/60 backdrop-blur-xl border-slate-200/60 shadow-sm rounded-2xl space-y-6">
        {renderSmartTagInput(
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
            { value: 'Walk-in Closet', label: 'Walk-in Closet', icon: Warehouse },
            { value: 'Guest Toilet', label: 'Guest Toilet', icon: Droplets },
          ],
        )}
      </Card>

      {/* 4. Outdoor Features */}
      <Card className="p-6 bg-white/60 backdrop-blur-xl border-slate-200/60 shadow-sm rounded-2xl space-y-6">
        {renderSmartTagInput(
          'outdoorFeatures',
          'Outdoor Features',
          'Add outdoor feature...',
          Trees,
          [
            { value: 'pool', label: 'Pool', icon: Droplets },
            { value: 'garden', label: 'Garden', icon: Trees },
            { value: 'braai_area', label: 'Braai Area', icon: Flame },
            { value: 'patio', label: 'Patio', icon: Home },
            { value: 'balcony', label: 'Balcony', icon: Building2 },
            { value: 'deck', label: 'Deck', icon: Layers },
            { value: 'entertainment_area', label: 'Entertainment Area', icon: Sofa },
          ],
        )}
      </Card>

      {/* 5. Appliances Included */}
      <Card className="p-6 bg-white/60 backdrop-blur-xl border-slate-200/60 shadow-sm rounded-2xl space-y-6">
        {renderSmartTagInput(
          'appliancesIncluded',
          'Appliances Included',
          'Add appliance...',
          Flame,
          [
            { value: 'stove', label: 'Stove', icon: Flame },
            { value: 'oven', label: 'Oven', icon: Flame },
            { value: 'hob', label: 'Hob', icon: Flame },
            { value: 'extractor', label: 'Extractor Fan', icon: Lightbulb },
            { value: 'dishwasher', label: 'Dishwasher', icon: Droplets },
            { value: 'washing_machine', label: 'Washing Machine', icon: Droplets },
            { value: 'fridge', label: 'Fridge', icon: Warehouse },
            { value: 'microwave', label: 'Microwave', icon: Warehouse },
          ],
        )}
      </Card>

      {/* 6. Lifestyle Highlights */}
      <Card className="p-6 bg-white/60 backdrop-blur-xl border-slate-200/60 shadow-sm rounded-2xl space-y-6">
        {renderSmartTagInput(
          'lifestyleHighlights',
          'Lifestyle Highlights',
          'Add custom highlight...',
          Maximize,
          [
            { value: 'High Ceilings', label: 'High Ceilings', icon: Maximize },
            { value: 'Modern Finishes', label: 'Modern Finishes', icon: Check },
            { value: 'Open Plan', label: 'Open Plan', icon: Maximize },
            { value: 'Natural Light', label: 'Natural Light', icon: Trees },
            { value: 'Newly Renovated', label: 'Newly Renovated', icon: Check },
            { value: 'Move-in Ready', label: 'Move-in Ready', icon: Check },
            { value: 'Private', label: 'Private', icon: Home },
          ],
        )}
      </Card>

      {/* 7. View Highlights */}
      <Card className="p-6 bg-white/60 backdrop-blur-xl border-slate-200/60 shadow-sm rounded-2xl space-y-6">
        {renderSmartTagInput(
          'viewHighlights',
          'View Highlights',
          'Add view highlight...',
          Mountain,
          [
            { value: 'scenic_view', label: 'Scenic View', icon: Mountain },
            { value: 'city_view', label: 'City View', icon: Building2 },
            { value: 'mountain_view', label: 'Mountain View', icon: Mountain },
            { value: 'sea_view', label: 'Sea View', icon: Droplets },
            { value: 'garden_view', label: 'Garden View', icon: Trees },
            { value: 'panoramic_view', label: 'Panoramic View', icon: Maximize },
          ],
        )}
      </Card>

      {/* 8. Location & Nearby Convenience */}
      <Card className="p-6 bg-white/60 backdrop-blur-xl border-slate-200/60 shadow-sm rounded-2xl space-y-6">
        {renderSmartTagInput(
          'locationHighlights',
          'Location & Nearby Convenience',
          'Add nearby convenience...',
          Car,
          [
            { value: 'near_top_schools', label: 'Near Top Schools', icon: CheckCircle2 },
            { value: 'near_shopping_centres', label: 'Near Shopping Centres', icon: Building2 },
            { value: 'easy_highway_access', label: 'Easy Highway Access', icon: Car },
            { value: 'close_to_beach', label: 'Close To Beach', icon: Droplets },
            { value: 'near_restaurants', label: 'Near Restaurants', icon: Home },
            { value: 'close_to_gautrain', label: 'Close To Gautrain', icon: Car },
            { value: 'near_public_transport', label: 'Near Public Transport', icon: Car },
            { value: 'near_hospitals', label: 'Near Hospitals', icon: CheckCircle2 },
            { value: 'near_parks', label: 'Near Parks', icon: Trees },
          ],
        )}
      </Card>

      {/* 9. Accessibility Features */}
      <Card className="p-6 bg-white/60 backdrop-blur-xl border-slate-200/60 shadow-sm rounded-2xl space-y-6">
        {renderSmartTagInput(
          'accessibilityFeatures',
          'Accessibility Features',
          'Add accessibility feature...',
          CheckCircle2,
          [
            { value: 'wheelchair_access', label: 'Wheelchair Access', icon: CheckCircle2 },
            { value: 'step_free_access', label: 'Step-free Access', icon: CheckCircle2 },
            { value: 'lift_access', label: 'Lift Access', icon: Building2 },
            { value: 'wide_doorways', label: 'Wide Doorways', icon: Maximize },
          ],
        )}
      </Card>

      {/* 10. Security Features */}
      <Card className="p-6 bg-white/60 backdrop-blur-xl border-slate-200/60 shadow-sm rounded-2xl space-y-6">
        {renderSmartTagInput(
          'securityFeatures',
          'Security Features',
          'Add security feature...',
          Shield,
          [
            { value: 'alarm', label: 'Alarm System', icon: Shield },
            { value: 'electric_fence', label: 'Electric Fence', icon: Zap },
            { value: 'beams', label: 'Outdoor Beams', icon: Check },
            { value: 'cctv', label: 'CCTV Cameras', icon: Check },
            { value: '24hr_guard', label: '24hr Guard', icon: Shield },
            { value: 'access_control', label: 'Access Control', icon: Check },
            { value: 'intercom', label: 'Intercom', icon: Check },
            { value: 'security_gates', label: 'Security Gates', icon: Shield },
          ],
        )}
      </Card>

      {/* 11. Complex / Estate Amenities */}
      {shouldShowComplexEstateAmenities && (
        <Card className="p-6 bg-white/60 backdrop-blur-xl border-slate-200/60 shadow-sm rounded-2xl space-y-6">
          {renderSmartTagInput(
            'amenitiesFeatures',
            'Complex / Estate Amenities',
            'Add custom amenity...',
            Building2,
            [
              { value: 'Gym', label: 'Gym', icon: Maximize },
              { value: 'Clubhouse', label: 'Clubhouse', icon: Home },
              { value: 'Lift / Elevator', label: 'Lift / Elevator', icon: Building2 },
              { value: 'Kids Play Area', label: 'Kids Play Area', icon: Trees },
              { value: 'Visitor Parking', label: 'Visitor Parking', icon: Car },
              { value: 'Communal Garden', label: 'Communal Garden', icon: Trees },
              { value: 'Concierge', label: 'Concierge', icon: Check },
              { value: 'Rooftop Terrace', label: 'Rooftop Terrace', icon: Building2 },
            ],
          )}
        </Card>
      )}
    </div>
  );
}
