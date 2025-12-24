import React from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Crown, Zap, Gift, Building2, Users, TrendingUp, 
  Check, X, ArrowUpRight, Clock, RefreshCw, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Tier display configuration
const TIER_CONFIG = {
  free_trial: {
    label: 'Free Trial',
    icon: Gift,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    gradient: 'from-purple-500 to-pink-500',
  },
  basic: {
    label: 'Basic',
    icon: Zap,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    gradient: 'from-blue-500 to-cyan-500',
  },
  premium: {
    label: 'Premium',
    icon: Crown,
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    gradient: 'from-amber-500 to-orange-500',
  },
};

export default function BillingPanel() {
  const [, setLocation] = useLocation();
  
  // Fetch subscription data
  const { data: subscriptionData, isLoading, refetch } = trpc.developer.getSubscription.useQuery(
    undefined,
    { staleTime: 0, refetchOnMount: true }
  );

  const subscription = subscriptionData?.subscription;
  const limits = subscription?.limits;
  const usage = subscription?.usage;

  // Calculate days remaining in trial
  const getDaysRemaining = () => {
    if (!subscription?.trialEndsAt) return null;
    const now = new Date();
    const trialEnd = new Date(subscription.trialEndsAt);
    const days = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const daysRemaining = getDaysRemaining();

  // Calculate usage percentages
  const getUsagePercent = (current: number, max: number) => {
    if (max >= 999999) return 0; // Unlimited
    return Math.min((current / max) * 100, 100);
  };

  const isUnlimited = (max: number) => max >= 999999;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardContent className="h-48" />
        </Card>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-12 text-center">
            <Gift className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
            <p className="text-slate-600 mb-4">Start your free trial to access all features</p>
            <Button onClick={() => setLocation('/subscription-plans')} className="bg-blue-600 hover:bg-blue-700">
              <Sparkles className="w-4 h-4 mr-2" />
              Start Free Trial
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tierConfig = TIER_CONFIG[subscription.tier] || TIER_CONFIG.free_trial;
  const TierIcon = tierConfig.icon;

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card className="overflow-hidden">
        <div className={`h-2 bg-gradient-to-r ${tierConfig.gradient}`} />
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-3 rounded-xl", tierConfig.color)}>
                <TierIcon className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  {tierConfig.label}
                  <Badge variant="outline" className={cn("ml-2", tierConfig.color)}>
                    {subscription.status === 'active' ? 'Active' : subscription.status}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  {subscription.tier === 'free_trial' && daysRemaining !== null ? (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Trial expired'}
                    </span>
                  ) : (
                    'Your current subscription plan'
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              {subscription.tier !== 'premium' && (
                <Button 
                  onClick={() => setLocation('/subscription-plans')} 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Upgrade
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage Metrics */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Current Usage
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Developments */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Developments
                  </span>
                  <span className="text-sm font-semibold">
                    {usage?.developmentsCount || 0} / {isUnlimited(limits?.maxDevelopments || 1) ? '∞' : limits?.maxDevelopments}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercent(usage?.developmentsCount || 0, limits?.maxDevelopments || 1)} 
                  className="h-2" 
                />
                {!isUnlimited(limits?.maxDevelopments || 1) && 
                  getUsagePercent(usage?.developmentsCount || 0, limits?.maxDevelopments || 1) >= 80 && (
                  <p className="text-xs text-orange-600 mt-1">Approaching limit</p>
                )}
              </div>

              {/* Leads This Month */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-600" />
                    Leads This Month
                  </span>
                  <span className="text-sm font-semibold">
                    {usage?.leadsThisMonth || 0} / {isUnlimited(limits?.maxLeadsPerMonth || 50) ? '∞' : limits?.maxLeadsPerMonth}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercent(usage?.leadsThisMonth || 0, limits?.maxLeadsPerMonth || 50)} 
                  className="h-2"
                />
              </div>

              {/* Team Members */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    Team Members
                  </span>
                  <span className="text-sm font-semibold">
                    {usage?.teamMembersCount || 0} / {isUnlimited(limits?.maxTeamMembers || 1) ? '∞' : limits?.maxTeamMembers}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercent(usage?.teamMembersCount || 0, limits?.maxTeamMembers || 1)} 
                  className="h-2"
                />
              </div>
            </div>
          </div>

          {/* Features Access */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900">Features</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <FeatureBadge 
                label="CRM Integration" 
                enabled={limits?.crmIntegrationEnabled || false} 
              />
              <FeatureBadge 
                label="Advanced Analytics" 
                enabled={limits?.advancedAnalyticsEnabled || false} 
              />
              <FeatureBadge 
                label="Bond Integration" 
                enabled={limits?.bondIntegrationEnabled || false} 
              />
              <FeatureBadge 
                label={`${limits?.analyticsRetentionDays || 30} Days Analytics`} 
                enabled={true} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Billing History</CardTitle>
          <CardDescription>Your past invoices and payments</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  No invoices yet. Upgrade to a paid plan to see billing history.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Upgrade Prompt for Free Trial */}
      {subscription.tier === 'free_trial' && (
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 mb-1">Ready to grow?</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Upgrade to Basic or Premium to unlock more developments, leads, and premium features.
                </p>
                <Button 
                  onClick={() => setLocation('/subscription-plans')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  View Plans
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Feature badge component
function FeatureBadge({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-2 p-3 rounded-lg text-sm font-medium transition-colors",
      enabled 
        ? "bg-green-50 text-green-700 border border-green-200" 
        : "bg-slate-100 text-slate-500 border border-slate-200"
    )}>
      {enabled ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <X className="w-4 h-4 text-slate-400" />
      )}
      {label}
    </div>
  );
}
