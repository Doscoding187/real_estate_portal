/**
 * Step 1: Action Selection
 *
 * User selects: Sell / Rent / Auction
 */

import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card } from '@/components/ui/card';
import { Check, Home, Key, Gavel } from 'lucide-react';
import type { ListingAction } from '@/../../shared/listing-types';
import { useFieldValidation } from '@/hooks/useFieldValidation';
import { InlineError } from '@/components/ui/InlineError';

const ACTION_OPTIONS: {
  value: ListingAction;
  label: string;
  icon: JSX.Element;
  description: string;
  color: 'blue' | 'green' | 'purple';
}[] = [
  {
    value: 'sell',
    label: 'Sell',
    icon: <Home className="w-8 h-8" />,
    description: 'List your property for sale',
    color: 'blue',
  },
  {
    value: 'rent',
    label: 'Rent',
    icon: <Key className="w-8 h-8" />,
    description: 'Offer your property for rental',
    color: 'green',
  },
  {
    value: 'auction',
    label: 'Auction',
    icon: <Gavel className="w-8 h-8" />,
    description: 'Sell via auction process',
    color: 'purple',
  },
];

const ActionStep: React.FC = () => {
  const { action, setAction } = useListingWizardStore();

  // Validation
  const actionValidation = useFieldValidation({
    field: 'action',
    value: action,
    context: { currentStep: 1 },
    trigger: 'submit',
  });

  const handleSelect = (value: ListingAction) => {
    setAction(value);
    actionValidation.clearError();
  };

  return (
    <div className="py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ACTION_OPTIONS.map(option => {
          const isSelected = action === option.value;

          return (
            <Card
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`relative cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                isSelected
                  ? `border-2 shadow-xl bg-gradient-to-br ${option.color === 'blue' ? 'from-blue-50 to-blue-100 border-blue-400' : option.color === 'green' ? 'from-green-50 to-green-100 border-green-400' : 'from-purple-50 to-purple-100 border-purple-400'}`
                  : 'border-2 border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div
                  className={`absolute top-4 right-4 rounded-full p-1 shadow-lg ${
                    option.color === 'blue'
                      ? 'bg-blue-500'
                      : option.color === 'green'
                        ? 'bg-green-500'
                        : 'bg-purple-500'
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
                        : option.color === 'green'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-purple-100 text-purple-600'
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
                        : option.color === 'green'
                          ? 'text-green-600'
                          : 'text-purple-600'
                      : 'text-gray-900'
                  }`}
                >
                  {option.label}
                </h3>

                {/* Description */}
                <p className="text-gray-600 text-sm">{option.description}</p>
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

      {/* Info Banner */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">💡 What happens next?</h4>
        <p className="text-blue-800 text-sm">
          After selecting your action, you'll choose the property type and provide relevant details.
          The form will automatically adapt to show the fields you need based on your selection.
        </p>
      </div>
    </div>
  );
};

export default ActionStep;
