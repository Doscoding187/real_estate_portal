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
    <div className="py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Listing Badges</h2>
        <p className="text-gray-600 text-sm">
          Select one badge to highlight a special feature of your property (optional).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {badgeTypes.map((badge: ListingBadge) => {
          const template = BADGE_TEMPLATES[badge];
          const isSelected = badges.includes(badge);

          return (
            <Card
              key={badge}
              onClick={() => handleSelectBadge(badge)}
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

              <div className="p-4 flex flex-col items-center text-center space-y-3">
                {/* Badge Preview */}
                <Badge
                  variant="secondary"
                  className={`text-sm font-medium ${isSelected ? 'bg-blue-100 text-blue-700' : ''}`}
                >
                  {template.label}
                </Badge>

                {/* Label */}
                <h3
                  className={`text-lg font-bold transition-colors ${
                    isSelected ? 'text-blue-600' : 'text-gray-900'
                  }`}
                >
                  {template.label}
                </h3>

                {/* Description */}
                <p className="text-gray-600 text-sm">{template.description}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Selected Badge Confirmation */}
      {badges.length > 0 && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-900 flex items-center gap-2">
            <Check className="w-5 h-5" />
            Selected Badge: {BADGE_TEMPLATES[badges[0]].label}
          </h4>
          <p className="text-green-800 text-sm mt-1">{BADGE_TEMPLATES[badges[0]].description}</p>
        </div>
      )}
    </div>
  );
};

export default BadgesStep;
