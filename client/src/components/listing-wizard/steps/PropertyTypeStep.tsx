/**
 * Step 2: Physical property type selection.
 *
 * The live authoring choices come from the shared taxonomy authority. Legacy
 * and deferred public values remain readable elsewhere but are not offered as
 * new manual inventory until their consumer journey is coherent.
 */

import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card } from '@/components/ui/card';
import { Check, Building2, Home, Wheat } from 'lucide-react';
import type { ListingAction, PropertyType } from '@/../../shared/listing-types';
import {
  getAuthorablePropertyTypes,
  getPropertyTypeDefinition,
  type ActiveManualPropertyType,
  type PropertyListingIntent,
} from '@shared/property-taxonomy';
import { listingActionToIntent } from '@/../../shared/listing-types';
import { useFieldValidation } from '@/hooks/useFieldValidation';
import { InlineError } from '@/components/ui/InlineError';

const ICON_MAP: Record<string, React.ElementType> = {
  Building2,
  Home,
  Wheat,
};

const PropertyTypeStep: React.FC = () => {
  const store: any = useListingWizardStore();
  const action: ListingAction | undefined = store.action;
  const propertyType: PropertyType | undefined = store.propertyType;
  const setPropertyType = store.setPropertyType;
  const selectedIntent = listingActionToIntent(action) as PropertyListingIntent | undefined;
  const optionRefs = React.useRef<Array<HTMLDivElement | null>>([]);

  const propertyTypeValidation = useFieldValidation({
    field: 'propertyType',
    value: propertyType,
    context: { action, currentStep: 2 },
    trigger: 'submit',
  });

  const options = getAuthorablePropertyTypes(selectedIntent) as ActiveManualPropertyType[];

  const handleSelect = (value: ActiveManualPropertyType) => {
    setPropertyType(value);
    propertyTypeValidation.clearError();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    let nextIndex: number | undefined;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % options.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + options.length) % options.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = options.length - 1;
    }

    if (nextIndex !== undefined) {
      event.preventDefault();
      handleSelect(options[nextIndex]);
      optionRefs.current[nextIndex]?.focus();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(options[index]);
    }
  };

  return (
    <div className="py-8">
      <div className="mb-6">
        <h2 id="property-type-heading" className="text-2xl font-bold text-gray-900">
          What kind of property are you listing?
        </h2>
        <p className="mt-2 text-gray-600">
          Choose the closest match. We&apos;ll tailor the next questions to your property.
        </p>
      </div>

      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        role="radiogroup"
        aria-labelledby="property-type-heading"
        aria-required="true"
      >
        {options.map((type, index) => {
          const definition = getPropertyTypeDefinition(type)!;
          const IconComponent = ICON_MAP[definition.icon];
          const isSelected = propertyType === type;

          return (
            <Card
              key={type}
              ref={element => {
                optionRefs.current[index] = element;
              }}
              onClick={() => handleSelect(type)}
              onKeyDown={event => handleKeyDown(event, index)}
              role="radio"
              aria-checked={isSelected}
              aria-describedby={`property-type-${type}-description`}
              tabIndex={isSelected || (!propertyType && index === 0) ? 0 : -1}
              className={`relative cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                isSelected
                  ? 'border-2 border-blue-500 shadow-lg bg-gradient-to-br from-blue-50 to-white'
                  : 'border-2 border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 bg-blue-500 rounded-full p-1">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              <div className="p-6 flex items-center gap-4">
                <div
                  className={`flex-shrink-0 p-3 rounded-xl transition-all ${
                    isSelected ? 'bg-blue-100' : 'bg-gray-100'
                  }`}
                >
                  {IconComponent ? (
                    <IconComponent
                      className={`w-8 h-8 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}
                    />
                  ) : null}
                </div>

                <div className="flex-1 min-w-0">
                  <h3
                    className={`text-lg font-bold transition-colors ${
                      isSelected ? 'text-blue-600' : 'text-gray-900'
                    }`}
                  >
                    {definition.label}
                  </h3>
                  <p
                    id={`property-type-${type}-description`}
                    className="text-gray-600 text-sm mt-0.5"
                  >
                    {definition.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {propertyTypeValidation.error && (
        <div className="mt-6">
          <InlineError error={propertyTypeValidation.error} show={!!propertyTypeValidation.error} />
        </div>
      )}
    </div>
  );
};

export default PropertyTypeStep;
