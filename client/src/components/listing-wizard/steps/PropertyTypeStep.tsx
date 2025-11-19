/**
 * Step 2: Property Type Selection
 *
 * User selects: Apartment, House, Farm, Land, Commercial, Shared Living
 */

import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card } from '@/components/ui/card';
import { Check, Building2, Home, Wheat, Map, Store, Users } from 'lucide-react';
import type { PropertyType, ListingAction } from '@/../../shared/listing-types';
import { PROPERTY_TYPE_TEMPLATES } from '@/../../shared/listing-types';

// Icon map for dynamic rendering
const ICON_MAP: Record<string, React.ElementType> = {
  Building2,
  Home,
  Wheat,
  Map,
  Store,
  Users,
};

const PropertyTypeStep: React.FC = () => {
  const store: any = useListingWizardStore();
  const action: ListingAction | undefined = store.action;
  const propertyType: PropertyType | undefined = store.propertyType;
  const setPropertyType = store.setPropertyType;

  const handleSelect = (value: PropertyType) => {
    setPropertyType(value);
  };

  // Filter property types based on action
  const getFilteredPropertyTypes = (): PropertyType[] => {
    const allTypes = Object.keys(PROPERTY_TYPE_TEMPLATES) as PropertyType[];

    // Shared Living is only available for renting
    if (action && action !== 'rent') {
      return allTypes.filter(type => type !== 'shared_living');
    }

    return allTypes;
  };

  const filteredTypes = getFilteredPropertyTypes();

  return (
    <div className="py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTypes.map(type => {
          const template = PROPERTY_TYPE_TEMPLATES[type];
          const isSelected = propertyType === type;

          return (
            <Card
              key={type}
              onClick={() => handleSelect(type)}
              className={`relative cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
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

              <div className="p-4 flex items-center gap-4">
                {/* Icon */}
                <div
                  className={`flex-shrink-0 p-3 rounded-xl transition-all ${
                    isSelected ? 'bg-blue-100' : 'bg-gray-100'
                  }`}
                >
                  {(() => {
                    const IconComponent = ICON_MAP[template.icon];
                    return IconComponent ? (
                      <IconComponent
                        className={`w-8 h-8 ${
                          isSelected ? 'text-blue-600' : 'text-gray-600'
                        }`}
                      />
                    ) : null;
                  })()}
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0">
                  <h3
                    className={`text-lg font-bold transition-colors ${
                      isSelected ? 'text-blue-600' : 'text-gray-900'
                    }`}
                  >
                    {template.label}
                  </h3>
                  <p className="text-gray-600 text-sm mt-0.5">{template.description}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Confirmation Banner */}
      {propertyType && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-900 flex items-center gap-2">
            <Check className="w-5 h-5" />
            Selected: {PROPERTY_TYPE_TEMPLATES[propertyType].label}
          </h4>
          <p className="text-green-800 text-sm mt-1">
            {PROPERTY_TYPE_TEMPLATES[propertyType].description}
          </p>
        </div>
      )}
    </div>
  );
};

export default PropertyTypeStep;
