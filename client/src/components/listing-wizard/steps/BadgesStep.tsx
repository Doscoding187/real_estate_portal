/**
 * Step 1.5: Listing Badges Selection
 *
 * User selects optional badges for their listing
 */

import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card } from '@/components/ui/card';
import { Check, Info } from 'lucide-react';
import type { ListingBadge } from '@/../../shared/listing-types';
import { BADGE_TEMPLATES } from '@/../../shared/listing-types';
import { Badge } from '@/components/ui/badge';

const BadgesStep: React.FC = () => {
  const store: any = useListingWizardStore();
  const badges: ListingBadge[] = store.badges || [];
  const setBadges = store.setBadges;

  const handleSelectBadge = (badge: ListingBadge) => {
    // If badge is already selected, remove it (deselect)
    if (badges.includes(badge)) {
      setBadges(badges.filter(b => b !== badge));
    } else {
      // Select only this badge (single selection)
      setBadges([badge]);
    }
  };

  const badgeTypes: ListingBadge[] = [
    'ready_to_move',
    'under_construction',
    'off_plan',
    'move_in_ready',
    'fixer_upper',
    'renovated',
  ];

  return (
    <div className="py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Listing Badges</h2>
        <p className="text-gray-600">
          Select one badge to highlight a special feature of your property. This badge will appear
          on your listing to attract more attention.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {badgeTypes.map((badge: ListingBadge) => {
          const template = BADGE_TEMPLATES[badge];
          const isSelected = badges.includes(badge);

          return (
            <Card
              key={badge}
              onClick={() => handleSelectBadge(badge)}
              className={`relative cursor-pointer transition-all duration-300 hover:shadow-lg ${
                isSelected
                  ? 'border-2 border-blue-500 shadow-lg'
                  : 'border-2 border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4 bg-blue-500 rounded-full p-1">
                  <Check className="w-5 h-5 text-white" />
                </div>
              )}

              <div className="p-6 flex flex-col space-y-4">
                {/* Badge Preview */}
                <div className="flex justify-center">
                  <Badge variant="secondary" className="text-sm font-medium">
                    {template.label}
                  </Badge>
                </div>

                {/* Label */}
                <h3
                  className={`text-xl font-bold text-center transition-colors ${
                    isSelected ? 'text-blue-600' : 'text-gray-900'
                  }`}
                >
                  {template.label}
                </h3>

                {/* Description */}
                <p className="text-gray-600 text-sm text-center min-h-[40px]">
                  {template.description}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Selected Badges Preview */}
      {badges.length > 0 && (
        <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-900 mb-3">✅ Selected Badge</h4>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge: ListingBadge) => (
              <Badge key={badge} variant="default" className="text-sm">
                {BADGE_TEMPLATES[badge].label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">💡 Badge Tips</h4>
            <ul className="text-blue-800 text-sm list-disc list-inside space-y-1">
              <li>Badges help your listing stand out in search results</li>
              <li>Select the badge that best describes your property</li>
              <li>Click on a selected badge to deselect it</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BadgesStep;
