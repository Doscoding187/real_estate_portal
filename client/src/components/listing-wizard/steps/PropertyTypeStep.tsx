/**
 * Step 2: Property Type Selection
 *
 * User selects: Apartment, House, Farm, Land, Commercial, Shared Living
 */

import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card } from '@/components/ui/card';
import { Check } from 'lucide-react';
import type { PropertyType, ListingAction } from '@/../../shared/listing-types';
import { PROPERTY_TYPE_TEMPLATES } from '@/../../shared/listing-types';

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
    <div className="py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTypes.map(type => {
          const template = PROPERTY_TYPE_TEMPLATES[type];
          const isSelected = propertyType === type;

          return (
            <Card
              key={type}
              onClick={() => handleSelect(type)}
              className={`relative cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                isSelected
                  ? 'border-2 border-blue-500 shadow-xl bg-gradient-to-br from-blue-50 to-white'
                  : 'border-2 border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4 bg-blue-500 rounded-full p-1">
                  <Check className="w-5 h-5 text-white" />
                </div>
              )}

              <div className="p-6 flex flex-col space-y-4">
                {/* Icon */}
                <div
                  className={`text-5xl transition-all ${isSelected ? 'scale-110' : 'scale-100'}`}
                >
                  {template.icon}
                </div>

                {/* Label */}
                <h3
                  className={`text-xl font-bold transition-colors ${
                    isSelected ? 'text-blue-600' : 'text-gray-900'
                  }`}
                >
                  {template.label}
                </h3>

                {/* Description */}
                <p className="text-gray-600 text-sm min-h-[40px]">{template.description}</p>

                {/* Required Fields Preview */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">
                    Required Info:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {template.requiredFields.slice(0, 3).map((field: string) => (
                      <span
                        key={field}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                      >
                        {field.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    ))}
                    {template.requiredFields.length > 3 && (
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        +{template.requiredFields.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Property Type Details */}
      {propertyType && (
        <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-900 mb-3">
            ✅ Selected: {PROPERTY_TYPE_TEMPLATES[propertyType].label}
          </h4>
          <p className="text-green-800 text-sm mb-3">
            {PROPERTY_TYPE_TEMPLATES[propertyType].description}
          </p>
          <div className="bg-white rounded p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">You'll be asked to provide:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              {PROPERTY_TYPE_TEMPLATES[propertyType].requiredFields.map((field: string) => (
                <li key={field}>
                  {field
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/([a-z])([0-9])/gi, '$1 $2')
                    .trim()
                    .toLowerCase()
                    .replace(/^./, (str: string) => str.toUpperCase())}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Help Banner */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Choose the Right Type</h4>
        <div className="text-blue-800 text-sm space-y-2">
          <p>
            <strong>Apartment:</strong> Sectional title properties, flats, units in complexes
          </p>
          <p>
            <strong>House:</strong> Freestanding homes with private land
          </p>
          <p>
            <strong>Farm:</strong> Agricultural properties, smallholdings with farming potential
          </p>
          <p>
            <strong>Land/Plot:</strong> Vacant land, development plots, stands
          </p>
          <p>
            <strong>Commercial:</strong> Office spaces, retail, industrial, warehouses
          </p>
          {action === 'rent' && (
            <p>
              <strong>Shared Living:</strong> Student accommodation, co-living, room rentals
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyTypeStep;
