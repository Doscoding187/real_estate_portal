import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { MapPin, Users, DollarSign, Home } from 'lucide-react';

interface Step3Props {
  data: any;
  updateData: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
  campaignId: number;
}

const BUYER_PROFILES = [
  'First Time Buyer',
  'Investor',
  'Family',
  'Retiree',
  'Young Professional',
  'Luxury Buyer',
];

const PROPERTY_TYPES = ['Apartment', 'House', 'Villa', 'Townhouse', 'Land', 'Commercial', 'Farm'];

const Step3Targeting: React.FC<Step3Props> = ({ data, updateData, onNext, onBack, campaignId }) => {
  const [targeting, setTargeting] = useState({
    locations: data.locations || [],
    buyerProfiles: data.buyerProfiles || [],
    minPrice: data.minPrice || '',
    maxPrice: data.maxPrice || '',
    propertyTypes: data.propertyTypes || [],
  });

  const updateTargetingMutation = trpc.marketing.updateTargeting.useMutation();

  const handleLocationAdd = (location: string) => {
    if (location && !targeting.locations.includes(location)) {
      setTargeting({ ...targeting, locations: [...targeting.locations, location] });
    }
  };

  const handleLocationRemove = (location: string) => {
    setTargeting({
      ...targeting,
      locations: targeting.locations.filter((l: string) => l !== location),
    });
  };

  const toggleBuyerProfile = (profile: string) => {
    const profiles = targeting.buyerProfiles.includes(profile)
      ? targeting.buyerProfiles.filter((p: string) => p !== profile)
      : [...targeting.buyerProfiles, profile];
    setTargeting({ ...targeting, buyerProfiles: profiles });
  };

  const togglePropertyType = (type: string) => {
    const types = targeting.propertyTypes.includes(type)
      ? targeting.propertyTypes.filter((t: string) => t !== type)
      : [...targeting.propertyTypes, type];
    setTargeting({ ...targeting, propertyTypes: types });
  };

  const handleNext = async () => {
    try {
      await updateTargetingMutation.mutateAsync({
        campaignId,
        targeting: {
          locationTargeting: targeting.locations,
          buyerProfile: targeting.buyerProfiles,
          priceRange: {
            min: targeting.minPrice ? parseFloat(targeting.minPrice) : null,
            max: targeting.maxPrice ? parseFloat(targeting.maxPrice) : null,
          },
          propertyType: targeting.propertyTypes,
        },
      });
      updateData(targeting);
      onNext();
    } catch (error) {
      console.error('Failed to update targeting');
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">Target Your Audience</h2>
        <p className="text-slate-500">Define who should see your campaign</p>
      </div>

      <div className="space-y-6">
        {/* Location Targeting */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            Location Targeting
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter city or province..."
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleLocationAdd((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={e => {
                const input = e.currentTarget.previousSibling as HTMLInputElement;
                handleLocationAdd(input.value);
                input.value = '';
              }}
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {targeting.locations.map((location: string) => (
              <div
                key={location}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2"
              >
                {location}
                <button
                  onClick={() => handleLocationRemove(location)}
                  className="hover:text-blue-900"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">Leave empty to target all locations</p>
        </div>

        {/* Buyer Profiles */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Buyer Profiles
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {BUYER_PROFILES.map(profile => (
              <div key={profile} className="flex items-center space-x-2">
                <Checkbox
                  id={profile}
                  checked={targeting.buyerProfiles.includes(profile)}
                  onCheckedChange={() => toggleBuyerProfile(profile)}
                />
                <label htmlFor={profile} className="text-sm cursor-pointer">
                  {profile}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-600" />
            Price Range
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                type="number"
                placeholder="Min Price"
                value={targeting.minPrice}
                onChange={e => setTargeting({ ...targeting, minPrice: e.target.value })}
              />
            </div>
            <div>
              <Input
                type="number"
                placeholder="Max Price"
                value={targeting.maxPrice}
                onChange={e => setTargeting({ ...targeting, maxPrice: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">Leave empty for no price restrictions</p>
        </div>

        {/* Property Types */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Home className="w-4 h-4 text-blue-600" />
            Property Types
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PROPERTY_TYPES.map(type => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={type}
                  checked={targeting.propertyTypes.includes(type)}
                  onCheckedChange={() => togglePropertyType(type)}
                />
                <label htmlFor={type} className="text-sm cursor-pointer">
                  {type}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={updateTargetingMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
        >
          {updateTargetingMutation.isPending ? 'Saving...' : 'Next Step'}
        </Button>
      </div>
    </div>
  );
};

export default Step3Targeting;
