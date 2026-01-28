import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

interface Step7Props {
  data: any;
  campaignId: number;
  onBack: () => void;
  onNext: () => void;
}

const Step7Review: React.FC<Step7Props> = ({ data, campaignId, onBack, onNext }) => {
  const [, setLocation] = useLocation();

  const handleSaveDraft = async () => {
    toast.success('Campaign saved as draft');
    setLocation('/admin/marketing');
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Review Campaign</h2>
        <p className="text-slate-500">
          Review your campaign settings before proceeding to payment.
        </p>
      </div>

      <div className="space-y-4">
        {/* Campaign Details */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">
                  {data.campaignName || 'Untitled Campaign'}
                </h3>
                <p className="text-slate-500 capitalize">
                  {data.campaignType?.replace('_', ' ') || 'Not set'}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">
                {data.status || 'Draft'}
              </Badge>
            </div>
            <p className="text-sm text-slate-600">{data.description}</p>
          </CardContent>
        </Card>

        {/* Target & Audience */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold">Targeting</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500 block">Locations</span>
                <span className="font-medium">
                  {data.targeting?.locationTargeting?.join(', ') || 'All Locations'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Property Types</span>
                <span className="font-medium">
                  {data.targeting?.propertyType?.join(', ') || 'All Types'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget & Schedule */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold">Budget & Schedule</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500 block">Budget</span>
                <span className="font-medium">
                  R {data.budget?.budgetAmount || '0.00'} ({data.budget?.budgetType || 'Daily'})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Schedule</span>
                <span className="font-medium">
                  {data.schedule?.startDate
                    ? new Date(data.schedule.startDate).toLocaleDateString()
                    : 'Not set'}
                  {data.schedule?.endDate
                    ? ` - ${new Date(data.schedule.endDate).toLocaleDateString()}`
                    : ' (Ongoing)'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Channels */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold">Channels</h3>
            <div className="flex flex-wrap gap-2">
              {data.channels?.filter((c: any) => c.enabled).length > 0 ? (
                data.channels
                  .filter((c: any) => c.enabled)
                  .map((channel: any) => (
                    <Badge key={channel.type} className="bg-blue-100 text-blue-700 capitalize">
                      {channel.type}
                    </Badge>
                  ))
              ) : (
                <span className="text-sm text-slate-500">No channels selected</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleSaveDraft}>
            Save Draft
          </Button>
          <Button onClick={onNext} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Rocket className="w-4 h-4 mr-2" />
            Proceed to Payment
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Step7Review;
