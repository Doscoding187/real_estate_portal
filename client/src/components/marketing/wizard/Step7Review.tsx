import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Rocket } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useNavigate } from 'wouter';

interface Step7Props {
  data: any;
  campaignId: number;
  onBack: () => void;
}

const Step7Review: React.FC<Step7Props> = ({ data, campaignId, onBack }) => {
  const navigate = useNavigate();
  const updateCampaignMutation = trpc.marketing.updateCampaign.useMutation();

  const handleLaunch = async () => {
    try {
      await updateCampaignMutation.mutateAsync({
        campaignId,
        data: {
          status: 'active',
        },
      });
      toast.success('Campaign launched successfully!');
      navigate('/admin/marketing');
    } catch (error) {
      toast.error('Failed to launch campaign');
    }
  };

  const handleSaveDraft = async () => {
    toast.success('Campaign saved as draft');
    navigate('/admin/marketing');
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Review & Launch</h2>
        <p className="text-slate-500">Review your campaign settings before launching.</p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Campaign Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Name:</span>
                  <span className="font-medium">{data.campaignName || 'Untitled Campaign'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Type:</span>
                  <Badge variant="outline" className="capitalize">
                    {data.campaignType?.replace('_', ' ') || 'Not set'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target:</span>
                  <span className="font-medium capitalize">{data.targetType?.replace('_', ' ') || 'Not set'}</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-slate-900 mb-2">Budget & Schedule</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Budget Type:</span>
                  <span className="font-medium capitalize">{data.budgetType || 'Daily'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <span className="font-medium">R {data.budgetAmount || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Billing Method:</span>
                  <span className="font-medium uppercase">{data.billingMethod || 'PPC'}</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-slate-900 mb-2">Channels</h3>
              <div className="flex flex-wrap gap-2">
                {data.channels?.filter((c: any) => c.enabled).length > 0 ? (
                  data.channels.filter((c: any) => c.enabled).map((channel: any) => (
                    <Badge key={channel.type} className="bg-blue-100 text-blue-700 capitalize">
                      {channel.type}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">No channels selected</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Ready to launch?</strong> Your campaign will start running immediately and will be visible across the selected channels.
          </p>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleSaveDraft}>
            Save as Draft
          </Button>
          <Button onClick={handleLaunch} className="bg-emerald-600 hover:bg-emerald-700 min-w-[140px]">
            <Rocket className="w-4 h-4 mr-2" />
            Launch Campaign
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Step7Review;
