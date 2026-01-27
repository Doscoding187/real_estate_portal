import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Rocket, Users, Megaphone, Home, User } from 'lucide-react';

interface Step1Props {
  data: any;
  updateData: (data: any) => void;
  onNext: () => void;
  isLoading: boolean;
}

const CAMPAIGN_TYPES = [
  {
    id: 'listing_boost',
    name: 'Boost Listing',
    description: 'Promote a specific property to get more leads.',
    icon: Home,
  },
  {
    id: 'lead_generation',
    name: 'Lead Generation',
    description: 'Capture leads for your agency or agent profile.',
    icon: Users,
  },
  {
    id: 'brand_awareness',
    name: 'Brand Awareness',
    description: 'Increase visibility for your brand across the platform.',
    icon: Megaphone,
  },
  {
    id: 'development_launch',
    name: 'Development Launch',
    description: 'Promote a new property development project.',
    icon: Rocket,
  },
  {
    id: 'agent_promotion',
    name: 'Agent Promotion',
    description: 'Highlight a specific agent to attract sellers.',
    icon: User,
  },
];

const Step1Details: React.FC<Step1Props> = ({ data, updateData, onNext, isLoading }) => {
  const handleChange = (field: string, value: any) => {
    updateData({ [field]: value });
  };

  const isValid = data.campaignName && data.campaignType;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">Campaign Details</h2>
        <p className="text-slate-500">Start by giving your campaign a name and selecting a goal.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Campaign Name</Label>
          <Input
            id="name"
            placeholder="e.g. Summer Sale Promotion"
            value={data.campaignName || ''}
            onChange={e => handleChange('campaignName', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Campaign Goal</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CAMPAIGN_TYPES.map(type => (
              <div
                key={type.id}
                className={`cursor-pointer border rounded-xl p-4 transition-all hover:border-blue-500 hover:bg-blue-50 ${
                  data.campaignType === type.id
                    ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                    : 'border-slate-200'
                }`}
                onClick={() => handleChange('campaignType', type.id)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${data.campaignType === type.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}
                  >
                    <type.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{type.name}</p>
                    <p className="text-sm text-slate-500 mt-1">{type.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            placeholder="Internal notes about this campaign..."
            value={data.description || ''}
            onChange={e => handleChange('description', e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end pt-6">
        <Button
          onClick={onNext}
          disabled={!isValid || isLoading}
          className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
        >
          {isLoading ? 'Creating...' : 'Next Step'}
        </Button>
      </div>
    </div>
  );
};

export default Step1Details;
