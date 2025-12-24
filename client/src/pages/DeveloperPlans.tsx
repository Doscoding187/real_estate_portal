/**
 * Developer Subscription Plans Page
 * Display developer-specific plans with comparison
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Check, X, Gift, Zap, Crown, Building2, Users, 
  TrendingUp, Link, ArrowLeft, Sparkles 
} from 'lucide-react';
import { DeveloperLayout } from '@/components/developer/DeveloperLayout';
import { cn } from '@/lib/utils';
import { SUBSCRIPTION_TIER_LIMITS, type SubscriptionTier } from '../../shared/types';

// Developer-specific plan definitions with SA Rand pricing
const DEVELOPER_PLANS = [
  {
    id: 'free_trial',
    name: 'Free Trial',
    tier: 'free_trial' as SubscriptionTier,
    price: 0,
    priceDisplay: 'Free',
    period: '14 days',
    description: 'Try all features free for 14 days',
    icon: Gift,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-100 text-purple-700',
    borderColor: 'border-purple-500',
    isPopular: true,
    isFree: true,
    features: [
      { label: '1 Development', included: true },
      { label: '50 Leads/month', included: true },
      { label: '1 Team Member', included: true },
      { label: '30 Days Analytics', included: true },
      { label: 'Basic Dashboard', included: true },
      { label: 'CRM Integration', included: false },
      { label: 'Advanced Analytics', included: false },
      { label: 'Bond Calculator', included: false },
    ],
  },
  {
    id: 'basic',
    name: 'Basic',
    tier: 'basic' as SubscriptionTier,
    price: 149900, // R1,499/month in cents
    priceDisplay: 'R1,499',
    period: '/month',
    description: 'For growing developers',
    icon: Zap,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-100 text-blue-700',
    borderColor: 'border-blue-500',
    isPopular: false,
    isFree: false,
    features: [
      { label: '5 Developments', included: true },
      { label: '200 Leads/month', included: true },
      { label: '5 Team Members', included: true },
      { label: '90 Days Analytics', included: true },
      { label: 'Priority Support', included: true },
      { label: 'CRM Integration', included: false },
      { label: 'Advanced Analytics', included: true },
      { label: 'Bond Calculator', included: true },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    tier: 'premium' as SubscriptionTier,
    price: 399900, // R3,999/month in cents
    priceDisplay: 'R3,999',
    period: '/month',
    description: 'For enterprise developers',
    icon: Crown,
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-100 text-amber-700',
    borderColor: 'border-amber-500',
    isPopular: false,
    isFree: false,
    features: [
      { label: 'Unlimited Developments', included: true },
      { label: 'Unlimited Leads', included: true },
      { label: '50 Team Members', included: true },
      { label: '365 Days Analytics', included: true },
      { label: 'Dedicated Account Manager', included: true },
      { label: 'CRM Integration', included: true },
      { label: 'Advanced Analytics', included: true },
      { label: 'Bond Calculator', included: true },
    ],
  },
];

export default function DeveloperPlans() {
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<typeof DEVELOPER_PLANS[0] | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Get current subscription to highlight current plan
  const { data: subscriptionData, refetch } = trpc.developer.getSubscription.useQuery(
    undefined,
    { staleTime: 0 }
  );
  
  // Upgrade mutation
  const upgradeMutation = trpc.developer.upgradeSubscription.useMutation({
    onSuccess: (data) => {
      setShowConfirmDialog(false);
      setSelectedPlan(null);
      refetch();
      // Show success - navigate back to dashboard with success message
      setLocation('/developer/dashboard');
    },
    onError: (error) => {
      alert(`Upgrade failed: ${error.message}`);
    }
  });
  
  const currentTier = subscriptionData?.subscription?.tier;

  const handleSelectPlan = (plan: typeof DEVELOPER_PLANS[0]) => {
    if (plan.tier === currentTier) {
      // Already on this plan
      return;
    }
    
    if (plan.tier === 'free_trial') {
      // Can't downgrade to free trial
      setLocation('/developer/dashboard');
      return;
    }
    
    // Show confirmation dialog for upgrade
    setSelectedPlan(plan);
    setShowConfirmDialog(true);
  };

  const handleConfirmUpgrade = () => {
    if (!selectedPlan) return;
    upgradeMutation.mutate({ tier: selectedPlan.tier });
  };

  return (
    <DeveloperLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
        <Button 
          variant="ghost" 
          className="mb-6" 
          onClick={() => setLocation('/developer/dashboard')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100">
            <Sparkles className="w-3 h-3 mr-1" />
            Developer Plans
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Scale Your Property Development Business
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Choose the perfect plan for your needs. All plans include our core platform features.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {DEVELOPER_PLANS.map((plan) => {
            const PlanIcon = plan.icon;
            const isCurrentPlan = currentTier === plan.tier;
            
            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1",
                  plan.isPopular && "ring-2 ring-purple-500 shadow-xl scale-[1.02]",
                  isCurrentPlan && "ring-2 ring-green-500"
                )}
              >
                {/* Gradient Header */}
                <div className={cn("h-2 bg-gradient-to-r", plan.color)} />
                
                {/* Popular Badge */}
                {plan.isPopular && (
                  <div className="absolute top-6 right-4">
                    <Badge className="bg-purple-600 text-white shadow-lg">
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="absolute top-6 right-4">
                    <Badge className="bg-green-600 text-white shadow-lg">
                      Current Plan
                    </Badge>
                  </div>
                )}

                <div className="p-8">
                  {/* Plan Icon & Name */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className={cn("p-4 rounded-2xl", plan.bgColor)}>
                      <PlanIcon className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
                      <p className="text-sm text-slate-500">{plan.description}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-8">
                    {plan.isFree ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold text-slate-900">Free</span>
                        <span className="text-slate-500">for {plan.period}</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-bold text-slate-900">{plan.priceDisplay}</span>
                        <span className="text-slate-500">{plan.period}</span>
                      </div>
                    )}
                    {plan.isFree && (
                      <p className="text-sm text-purple-600 font-medium mt-2">
                        Then R0/month on Free tier, or upgrade
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li 
                        key={idx} 
                        className={cn(
                          "flex items-center gap-3 text-sm",
                          feature.included ? "text-slate-700" : "text-slate-400"
                        )}
                      >
                        {feature.included ? (
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                            <Check className="w-3 h-3 text-green-600" />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                            <X className="w-3 h-3 text-slate-400" />
                          </div>
                        )}
                        <span className={feature.included ? "font-medium" : "line-through"}>
                          {feature.label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  {isCurrentPlan ? (
                    <Button disabled className="w-full h-12" variant="outline">
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className={cn(
                        "w-full h-12 font-semibold transition-all",
                        plan.isPopular 
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg" 
                          : plan.isFree
                            ? "bg-slate-900 hover:bg-slate-800"
                            : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                      )}
                      onClick={() => handleSelectPlan(plan)}
                    >
                      {plan.isFree ? 'Start Free Trial' : `Upgrade to ${plan.name}`}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        <div className="max-w-4xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-8">
            Compare All Features
          </h2>
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-4 text-slate-700 font-semibold">Feature</th>
                  <th className="text-center p-4 text-purple-700 font-semibold">Free Trial</th>
                  <th className="text-center p-4 text-blue-700 font-semibold">Basic</th>
                  <th className="text-center p-4 text-amber-700 font-semibold">Premium</th>
                </tr>
              </thead>
              <tbody>
                <ComparisonRow label="Developments" values={['1', '5', 'Unlimited']} icon={Building2} />
                <ComparisonRow label="Leads/Month" values={['50', '200', 'Unlimited']} icon={Users} />
                <ComparisonRow label="Team Members" values={['1', '5', '50']} icon={Users} />
                <ComparisonRow label="Analytics Retention" values={['30 days', '90 days', '365 days']} icon={TrendingUp} />
                <ComparisonRow label="CRM Integration" values={[false, false, true]} icon={Link} />
                <ComparisonRow label="Advanced Analytics" values={[false, true, true]} icon={TrendingUp} />
                <ComparisonRow label="Bond Calculator" values={[false, true, true]} icon={Zap} />
                <ComparisonRow label="Priority Support" values={[false, true, true]} icon={Crown} />
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ / Contact */}
        <div className="text-center mt-16 pb-12">
          <p className="text-slate-600 mb-4">
            Need a custom plan for your enterprise? 
          </p>
          <Button 
            variant="outline" 
            className="border-slate-300"
            onClick={() => window.location.href = 'mailto:developers@listify.co.za'}
          >
            Contact Sales
          </Button>
        </div>
      </div>
    </div>

    {/* Upgrade Confirmation Dialog */}
    <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Confirm Upgrade</DialogTitle>
          <DialogDescription>
            You're about to upgrade your subscription.
          </DialogDescription>
        </DialogHeader>
        
        {selectedPlan && (
          <div className="py-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl mb-4">
              <div className={cn("p-3 rounded-xl", selectedPlan.bgColor)}>
                {(() => {
                  const PlanIcon = selectedPlan.icon;
                  return <PlanIcon className="w-6 h-6" />;
                })()}
              </div>
              <div>
                <h4 className="font-bold text-lg">{selectedPlan.name}</h4>
                <p className="text-slate-600">{selectedPlan.priceDisplay}{selectedPlan.period}</p>
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-slate-600">
              <p>✓ Your limits will be upgraded immediately</p>
              <p>✓ All existing data will be preserved</p>
              <p>✓ You can downgrade anytime</p>
            </div>
            
            {!selectedPlan.isFree && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <strong>Note:</strong> Payment integration coming soon. For now, upgrades are activated instantly for testing.
              </div>
            )}
          </div>
        )}
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => setShowConfirmDialog(false)}
            disabled={upgradeMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmUpgrade}
            disabled={upgradeMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {upgradeMutation.isPending ? 'Upgrading...' : 'Confirm Upgrade'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </DeveloperLayout>
  );
}

// Comparison table row component
function ComparisonRow({ 
  label, 
  values, 
  icon: Icon 
}: { 
  label: string; 
  values: (string | boolean)[]; 
  icon: React.ElementType;
}) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="p-4 text-slate-700 font-medium flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-400" />
        {label}
      </td>
      {values.map((value, idx) => (
        <td key={idx} className="p-4 text-center">
          {typeof value === 'boolean' ? (
            value ? (
              <Check className="w-5 h-5 text-green-600 mx-auto" />
            ) : (
              <X className="w-5 h-5 text-slate-300 mx-auto" />
            )
          ) : (
            <span className="font-semibold text-slate-700">{value}</span>
          )}
        </td>
      ))}
    </tr>
  );
}
