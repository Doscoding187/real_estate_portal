import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Search, Home, Building2, User, Building } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface Step2Props {
  data: any;
  updateData: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
  campaignId: number;
}

const Step2Target: React.FC<Step2Props> = ({ data, updateData, onNext, onBack, campaignId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [targetType, setTargetType] = useState<string>(data.targetType || 'listing');

  const updateCampaignMutation = trpc.marketing.updateCampaign.useMutation();

  const handleNext = async () => {
    try {
      await updateCampaignMutation.mutateAsync({
        campaignId,
        data: {
          // Update will be handled when we have actual target selection
        },
      });
      onNext();
    } catch (error) {
      console.error('Failed to update campaign target');
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">What are you promoting?</h2>
        <p className="text-slate-500">Select the type of content you want to boost.</p>
      </div>

      <div className="space-y-6">
        <RadioGroup
          value={targetType}
          onValueChange={val => {
            setTargetType(val);
            updateData({ targetType: val });
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label
              className={`cursor-pointer border rounded-xl p-4 transition-all hover:border-blue-500 ${
                targetType === 'listing'
                  ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value="listing" id="listing" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-slate-900">Property Listing</span>
                  </div>
                  <p className="text-sm text-slate-500">
                    Promote a specific property for sale or rent
                  </p>
                </div>
              </div>
            </label>

            <label
              className={`cursor-pointer border rounded-xl p-4 transition-all hover:border-blue-500 ${
                targetType === 'development'
                  ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value="development" id="development" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-slate-900">Development Project</span>
                  </div>
                  <p className="text-sm text-slate-500">Promote an entire development</p>
                </div>
              </div>
            </label>

            <label
              className={`cursor-pointer border rounded-xl p-4 transition-all hover:border-blue-500 ${
                targetType === 'agent_profile'
                  ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value="agent_profile" id="agent_profile" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-slate-900">Agent Profile</span>
                  </div>
                  <p className="text-sm text-slate-500">Highlight a specific agent</p>
                </div>
              </div>
            </label>

            <label
              className={`cursor-pointer border rounded-xl p-4 transition-all hover:border-blue-500 ${
                targetType === 'agency_page'
                  ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value="agency_page" id="agency_page" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Building className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-slate-900">Agency Page</span>
                  </div>
                  <p className="text-sm text-slate-500">Promote your agency brand</p>
                </div>
              </div>
            </label>
          </div>
        </RadioGroup>

        {targetType && (
          <div className="space-y-3 pt-4 border-t">
            <Label>Search for {targetType.replace('_', ' ')}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={`Search ${targetType.replace('_', ' ')}...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-sm text-slate-500">
              Note: Full search integration coming soon. For now, you can proceed to configure your
              campaign.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 min-w-[120px]">
          Next Step
        </Button>
      </div>
    </div>
  );
};

export default Step2Target;
