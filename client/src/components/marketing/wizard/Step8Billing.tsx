import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard, Wallet, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

interface Step8BillingProps {
  data: any;
  campaignId: number;
  onBack: () => void;
}

const Step8Billing: React.FC<Step8BillingProps> = ({ data, campaignId, onBack }) => {
  const [, setLocation] = useLocation();
  const [paymentMethod, setPaymentMethod] = useState('saved_card');
  const [isProcessing, setIsProcessing] = useState(false);

  const launchMutation = trpc.marketing.launchCampaign.useMutation();

  const handleLaunch = async () => {
    setIsProcessing(true);
    try {
      await launchMutation.mutateAsync({
        campaignId,
        paymentMethodId: 'mock_pm_123',
      });
      
      toast.success('Campaign launched successfully!');
      // Redirect to marketing dashboard
      setLocation('/admin/marketing');
    } catch (error) {
      console.error('Launch failed:', error);
      toast.error('Failed to launch campaign. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate estimated cost (mock logic based on budget step)
  const budgetAmount = parseFloat(data.budgetAmount || '0');
  const durationDays = 30; // Mock duration
  const estimatedTotal = budgetAmount * durationDays;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between py-2 border-b">
              <span className="text-slate-600">Campaign Type</span>
              <span className="font-medium capitalize">{data.campaignType?.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-slate-600">Budget Type</span>
              <span className="font-medium capitalize">{data.budgetType}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-slate-600">Daily Budget</span>
              <span className="font-medium">R {budgetAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-slate-600">Duration</span>
              <span className="font-medium">{durationDays} Days</span>
            </div>
            <div className="flex justify-between py-4 text-lg font-bold">
              <span>Estimated Total</span>
              <span>R {estimatedTotal.toFixed(2)}</span>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg flex gap-3 text-sm text-blue-700">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>
                You will be billed {data.billingMethod === 'prepaid' ? 'immediately' : 'at the end of each billing cycle'} based on actual performance.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
              <div className={`flex items-center space-x-4 border p-4 rounded-lg cursor-pointer transition-colors ${paymentMethod === 'saved_card' ? 'border-blue-600 bg-blue-50' : 'hover:bg-slate-50'}`}>
                <RadioGroupItem value="saved_card" id="saved_card" />
                <Label htmlFor="saved_card" className="flex-1 cursor-pointer flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-full">
                    <CreditCard className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium">Visa ending in 4242</p>
                    <p className="text-sm text-slate-500">Expires 12/25</p>
                  </div>
                </Label>
              </div>

              <div className={`flex items-center space-x-4 border p-4 rounded-lg cursor-pointer transition-colors ${paymentMethod === 'wallet' ? 'border-blue-600 bg-blue-50' : 'hover:bg-slate-50'}`}>
                <RadioGroupItem value="wallet" id="wallet" />
                <Label htmlFor="wallet" className="flex-1 cursor-pointer flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-full">
                    <Wallet className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium">Account Credits</p>
                    <p className="text-sm text-slate-500">Balance: R 0.00</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            <Button variant="outline" className="w-full mt-4">
              Add New Payment Method
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" onClick={onBack} disabled={isProcessing}>
          Back
        </Button>
        <Button 
            onClick={handleLaunch} 
            disabled={isProcessing}
            className="bg-green-600 hover:bg-green-700 text-white min-w-[150px]"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Launching...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Launch Campaign
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Step8Billing;
