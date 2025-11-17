/**
 * Step 1: Action Selection
 *
 * User selects: Sell / Rent / Auction
 */

import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card } from '@/components/ui/card';
import { Building2, Home, Gavel, Check } from 'lucide-react';
import type { ListingAction } from '@/../../shared/listing-types';

const ACTION_OPTIONS: {
  value: ListingAction;
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
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
    icon: <Building2 className="w-8 h-8" />,
    description: 'List your property for rent',
    color: 'green',
  },
  {
    value: 'auction',
    label: 'Auction',
    icon: <Gavel className="w-8 h-8" />,
    description: 'List your property for auction',
    color: 'purple',
  },
];

const ActionStep: React.FC = () => {
  const { action, setAction } = useListingWizardStore();

  const handleSelect = (value: ListingAction) => {
    setAction(value);
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
              className={`relative cursor-pointer transition-all duration-300 hover:shadow-lg ${
                isSelected
                  ? `border-2 border-${option.color}-500 shadow-lg`
                  : 'border-2 border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className={`absolute top-4 right-4 bg-${option.color}-500 rounded-full p-1`}>
                  <Check className="w-5 h-5 text-white" />
                </div>
              )}

              <div className="p-8 flex flex-col items-center text-center space-y-4">
                {/* Icon */}
                <div
                  className={`p-4 rounded-full transition-all ${
                    isSelected
                      ? `bg-${option.color}-100 text-${option.color}-600`
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {option.icon}
                </div>

                {/* Label */}
                <h3
                  className={`text-2xl font-bold transition-colors ${
                    isSelected ? `text-${option.color}-600` : 'text-gray-900'
                  }`}
                >
                  {option.label}
                </h3>

                {/* Description */}
                <p className="text-gray-600 text-sm">{option.description}</p>

                {/* Additional Info */}
                <div className="pt-4 border-t border-gray-200 w-full">
                  <ul className="text-left text-sm text-gray-600 space-y-2">
                    {option.value === 'sell' && (
                      <>
                        <li>• Set asking price</li>
                        <li>• Negotiable options</li>
                        <li>• Transfer cost estimates</li>
                      </>
                    )}
                    {option.value === 'rent' && (
                      <>
                        <li>• Monthly rental price</li>
                        <li>• Deposit & lease terms</li>
                        <li>• Availability date</li>
                      </>
                    )}
                    {option.value === 'auction' && (
                      <>
                        <li>• Starting bid amount</li>
                        <li>• Reserve price</li>
                        <li>• Auction date & time</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

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
