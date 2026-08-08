// @ts-nocheck
/**
 * Step 1: Listing intent selection
 *
 * User selects: For Sale / To Rent
 */

import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card } from '@/components/ui/card';
import { Check, Home, Key } from 'lucide-react';
import type { ListingIntent } from '@/../../shared/listing-types';
import { listingActionToIntent } from '@/../../shared/listing-types';
import { useFieldValidation } from '@/hooks/useFieldValidation';
import { InlineError } from '@/components/ui/InlineError';

const LISTING_INTENT_OPTIONS: {
  value: ListingIntent;
  label: string;
  icon: JSX.Element;
  description: string;
  color: 'blue' | 'green';
}[] = [
  {
    value: 'sale',
    label: 'For Sale',
    icon: <Home className="w-8 h-8" />,
    description: 'List this property for buyers.',
    color: 'blue',
  },
  {
    value: 'rent',
    label: 'To Rent',
    icon: <Key className="w-8 h-8" />,
    description: 'List this property for prospective tenants.',
    color: 'green',
  },
];

const ActionStep: React.FC = () => {
  const { action, setListingIntent } = useListingWizardStore();
  const selectedIntent = listingActionToIntent(action);
  const optionRefs = React.useRef<Array<HTMLDivElement | null>>([]);

  // Validation
  const actionValidation = useFieldValidation({
    field: 'action',
    value: action,
    context: { currentStep: 1 },
    trigger: 'submit',
  });

  const handleSelect = (value: ListingIntent) => {
    setListingIntent(value);
    actionValidation.clearError();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    let nextIndex: number | undefined;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % LISTING_INTENT_OPTIONS.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + LISTING_INTENT_OPTIONS.length) % LISTING_INTENT_OPTIONS.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = LISTING_INTENT_OPTIONS.length - 1;
    }

    if (nextIndex !== undefined) {
      event.preventDefault();
      const nextOption = LISTING_INTENT_OPTIONS[nextIndex];
      handleSelect(nextOption.value);
      optionRefs.current[nextIndex]?.focus();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(LISTING_INTENT_OPTIONS[index].value);
    }
  };

  return (
    <div className="py-8">
      <div className="mb-6">
        <h2 id="listing-intent-heading" className="text-2xl font-bold text-gray-900">
          What would you like to do with this property?
        </h2>
        <p className="mt-2 text-gray-600">
          Choose the property&apos;s commercial journey. We&apos;ll ask for the right pricing and
          availability details next.
        </p>
      </div>

      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        role="radiogroup"
        aria-labelledby="listing-intent-heading"
        aria-required="true"
      >
        {LISTING_INTENT_OPTIONS.map((option, index) => {
          const isSelected = selectedIntent === option.value;

          return (
            <Card
              key={option.value}
              ref={element => {
                optionRefs.current[index] = element;
              }}
              onClick={() => handleSelect(option.value)}
              onKeyDown={event => handleKeyDown(event, index)}
              role="radio"
              aria-checked={isSelected}
              aria-describedby={`listing-intent-${option.value}-description`}
              tabIndex={isSelected || (!selectedIntent && index === 0) ? 0 : -1}
              className={`relative cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                isSelected
                  ? `border-2 shadow-xl bg-gradient-to-br ${option.color === 'blue' ? 'from-blue-50 to-blue-100 border-blue-400' : 'from-green-50 to-green-100 border-green-400'}`
                  : 'border-2 border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div
                  className={`absolute top-4 right-4 rounded-full p-1 shadow-lg ${
                    option.color === 'blue' ? 'bg-blue-500' : 'bg-green-500'
                  }`}
                >
                  <Check className="w-5 h-5 text-white" />
                </div>
              )}

              <div className="p-8 flex flex-col items-center text-center space-y-4">
                {/* Icon */}
                <div
                  className={`p-4 rounded-full transition-all shadow-md ${
                    isSelected
                      ? option.color === 'blue'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {option.icon}
                </div>

                {/* Label */}
                <h3
                  className={`text-2xl font-bold transition-colors ${
                    isSelected
                      ? option.color === 'blue'
                        ? 'text-blue-600'
                        : 'text-green-600'
                      : 'text-gray-900'
                  }`}
                >
                  {option.label}
                </h3>

                {/* Description */}
                <p
                  id={`listing-intent-${option.value}-description`}
                  className="text-gray-600 text-sm"
                >
                  {option.description}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Validation Error */}
      {actionValidation.error && (
        <div className="mt-6">
          <InlineError error={actionValidation.error} show={!!actionValidation.error} />
        </div>
      )}

      {/* Supporting explanation */}
      <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <p className="text-sm text-blue-800">
          Select one option to continue. You can change this choice later before submitting the
          listing.
        </p>
      </div>
    </div>
  );
};

export default ActionStep;
