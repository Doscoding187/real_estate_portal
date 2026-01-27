/**
 * Subscription Plans Page
 * Display all plans with comparison and upgrade options
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Zap, Crown, Building2, User, Rocket } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import type { PlanCategory } from '@/shared/subscription-types';

export default function SubscriptionPlans() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<PlanCategory>('agent');

  const { data: plans, isLoading } = trpc.subscription.getPlans.useQuery({
    category: selectedCategory,
  });
  const { data: mySubscription } = trpc.subscription.getMySubscription.useQuery();

  const formatPrice = (priceInCents: number) => {
    return `R${(priceInCents / 100).toLocaleString()}`;
  };

  const getCategoryIcon = (category: PlanCategory) => {
    switch (category) {
      case 'agent':
        return <User className="h-5 w-5" />;
      case 'agency':
        return <Building2 className="h-5 w-5" />;
      case 'developer':
        return <Rocket className="h-5 w-5" />;
    }
  };

  const getPlanIcon = (planName: string) => {
    if (planName.toLowerCase().includes('elite') || planName.toLowerCase().includes('enterprise')) {
      return <Crown className="h-6 w-6" />;
    }
    if (planName.toLowerCase().includes('pro') || planName.toLowerCase().includes('growth')) {
      return <Zap className="h-6 w-6" />;
    }
    return <Check className="h-6 w-6" />;
  };

  const isCurrentPlan = (planId: string) => {
    return mySubscription?.subscription?.plan_id === planId;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="container mx-auto px-4 py-24">
          <div className="text-center">Loading plans...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Choose Your Perfect Plan</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Start with a 14-day free trial of our premium features. No credit card required.
          </p>
        </div>

        {/* Category Tabs */}
        <Tabs
          value={selectedCategory}
          onValueChange={v => setSelectedCategory(v as PlanCategory)}
          className="mb-12"
        >
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
            <TabsTrigger value="agent" className="flex items-center gap-2">
              {getCategoryIcon('agent')}
              <span className="hidden sm:inline">Agents</span>
            </TabsTrigger>
            <TabsTrigger value="agency" className="flex items-center gap-2">
              {getCategoryIcon('agency')}
              <span className="hidden sm:inline">Agencies</span>
            </TabsTrigger>
            <TabsTrigger value="developer" className="flex items-center gap-2">
              {getCategoryIcon('developer')}
              <span className="hidden sm:inline">Developers</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedCategory}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              {plans?.map(plan => (
                <Card
                  key={plan.plan_id}
                  className={`relative overflow-hidden transition-all hover:shadow-xl ${
                    plan.is_trial_plan
                      ? 'border-2 border-blue-500 shadow-lg scale-105'
                      : 'border border-slate-200'
                  }`}
                >
                  {/* Popular Badge */}
                  {plan.is_trial_plan && (
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-blue-600 text-white">Most Popular</Badge>
                    </div>
                  )}

                  <div className="p-6">
                    {/* Plan Icon & Name */}
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`p-3 rounded-lg ${
                          plan.is_trial_plan
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {getPlanIcon(plan.name)}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900">{plan.display_name}</h3>
                        {plan.is_free_plan && <Badge variant="outline">Free</Badge>}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      {plan.is_free_plan ? (
                        <div className="text-3xl font-bold text-slate-900">Free</div>
                      ) : (
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold text-slate-900">
                            {formatPrice(plan.price_zar)}
                          </span>
                          <span className="text-slate-600">/month</span>
                        </div>
                      )}
                      {plan.trial_days > 0 && !plan.is_free_plan && (
                        <div className="text-sm text-blue-600 font-medium mt-1">
                          {plan.trial_days}-day free trial included
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                          <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    {isCurrentPlan(plan.plan_id) ? (
                      <Button disabled className="w-full" variant="outline">
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        className={`w-full ${
                          plan.is_trial_plan
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-slate-900 hover:bg-slate-800'
                        }`}
                        onClick={() => setLocation(`/subscribe?plan=${plan.plan_id}`)}
                      >
                        {plan.is_free_plan
                          ? 'Get Started'
                          : plan.is_trial_plan
                            ? 'Start Free Trial'
                            : 'Subscribe'}
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Trial Info Banner */}
        <div className="max-w-4xl mx-auto mt-12 p-6 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-4">
            <Zap className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Full-Feature Free Trial</h3>
              <p className="text-sm text-blue-800">
                Start with 14 days of our premium tier absolutely free. No credit card required.
                After the trial, you'll be automatically downgraded to the free plan unless you
                choose to upgrade.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
