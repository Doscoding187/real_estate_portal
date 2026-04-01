import { useState } from 'react';
import { useLocation } from 'wouter';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { agentPageStyles } from '@/components/agent/agentPageStyles';
import { AgentFeatureLockedState } from '@/components/agent/AgentFeatureLockedState';
import { useAgentOnboardingStatus } from '@/hooks/useAgentOnboardingStatus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  TrendingUp,
  Wallet,
  CreditCard,
  Download,
  ArrowUpRight,
  Calendar,
  Award,
  Target,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AgentEarnings() {
  const [, setLocation] = useLocation();
  const { status, isLoading: statusLoading } = useAgentOnboardingStatus({
    requireDashboardUnlocked: true,
  });
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data (replace with real tRPC queries)
  const walletBalance = 45750;
  const pendingCommissions = 125000;
  const upcomingPayouts = 78500;
  const totalEarnedThisMonth = 156000;

  const commissionDeals = [
    {
      id: 1,
      property: 'Luxury Villa - Camps Bay',
      client: 'John Smith',
      salePrice: 25000000,
      commission: 625000,
      commissionRate: 2.5,
      status: 'pending',
      dateClosed: '2024-11-28',
      payoutDate: '2024-12-15',
    },
    {
      id: 2,
      property: 'Modern Apartment - Sandton',
      client: 'Sarah Williams',
      salePrice: 4500000,
      commission: 90000,
      commissionRate: 2.0,
      status: 'paid',
      dateClosed: '2024-11-15',
      payoutDate: '2024-11-30',
    },
    {
      id: 3,
      property: 'Waterfront Penthouse - Cape Town',
      client: 'Mike Davis',
      salePrice: 12000000,
      commission: 240000,
      commissionRate: 2.0,
      status: 'pending',
      dateClosed: '2024-11-25',
      payoutDate: '2024-12-10',
    },
  ];

  const transactions = [
    {
      id: 1,
      type: 'commission',
      description: 'Sandton Apartment Sale',
      amount: 90000,
      date: '2024-11-30',
      status: 'completed',
    },
    {
      id: 2,
      type: 'bonus',
      description: 'Top Performer Bonus - November',
      amount: 15000,
      date: '2024-11-30',
      status: 'completed',
    },
    {
      id: 3,
      type: 'withdrawal',
      description: 'Bank Transfer',
      amount: -50000,
      date: '2024-11-28',
      status: 'completed',
    },
  ];

  const bonuses = [
    { id: 1, name: 'Top Performer - Q4 2024', amount: 25000, status: 'earned', date: '2024-12-31' },
    {
      id: 2,
      name: '10 Listings Milestone',
      amount: 10000,
      status: 'in_progress',
      progress: 7,
      total: 10,
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const earningsLocked =
    !statusLoading && !status?.entitlements?.featureFlags?.hasCommissionTracking;

  return (
    <AgentAppShell>
      <main className={agentPageStyles.container}>
        {statusLoading ? (
          <AgentFeatureLockedState
            title="Preparing your earnings workspace"
            description="We are confirming your onboarding and commission access before loading payout data."
            actionLabel="Loading"
            onAction={() => {}}
            isLoading
          />
        ) : earningsLocked ? (
          <AgentFeatureLockedState
            title="Commission tracking is not unlocked yet"
            description={
              !status?.fullFeaturesUnlocked
                ? 'Finish the remaining onboarding steps to unlock commission tracking and earnings insights.'
                : 'Your current package does not include commission tracking yet.'
            }
            actionLabel={!status?.fullFeaturesUnlocked ? 'Finish setup' : 'Review plan'}
            onAction={() =>
              setLocation(!status?.fullFeaturesUnlocked ? '/agent/setup' : '/agent/settings')
            }
          />
        ) : (
          <>
            {/* Header */}
            <div className={agentPageStyles.header}>
              <div className={agentPageStyles.headingBlock}>
                <h1 className={agentPageStyles.title}>Earnings</h1>
                <p className={agentPageStyles.subtitle}>
                  Track your commissions, payouts, and wallet balance
                </p>
              </div>
              <Button className={agentPageStyles.primaryButton}>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <Card className={cn(agentPageStyles.statCard, 'border-l-4 border-l-emerald-500')}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Wallet Balance</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(walletBalance)}
                      </p>
                      <p className="text-xs text-green-600 font-medium mt-2 flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3" />
                        Available for withdrawal
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-xl">
                      <Wallet className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={cn(agentPageStyles.statCard, 'border-l-4 border-l-[var(--primary)]')}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Pending Commissions</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(pendingCommissions)}
                      </p>
                      <p className="text-xs text-blue-600 font-medium mt-2">
                        3 deals pending payout
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={cn(agentPageStyles.statCard, 'border-l-4 border-l-violet-500')}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Upcoming Payouts</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(upcomingPayouts)}
                      </p>
                      <p className="text-xs text-purple-600 font-medium mt-2">
                        Next payout in 5 days
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-xl">
                      <Calendar className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={cn(agentPageStyles.statCard, 'border-l-4 border-l-amber-500')}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Earned This Month</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(totalEarnedThisMonth)}
                      </p>
                      <p className="text-xs text-green-600 font-medium mt-2 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        +23% from last month
                      </p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-xl">
                      <DollarSign className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList
                className={cn(agentPageStyles.tabsList, 'grid w-full max-w-2xl grid-cols-4')}
              >
                <TabsTrigger value="overview" className={agentPageStyles.tabTrigger}>
                  Overview
                </TabsTrigger>
                <TabsTrigger value="commissions" className={agentPageStyles.tabTrigger}>
                  Commissions
                </TabsTrigger>
                <TabsTrigger value="transactions" className={agentPageStyles.tabTrigger}>
                  Transactions
                </TabsTrigger>
                <TabsTrigger value="bonuses" className={agentPageStyles.tabTrigger}>
                  Bonuses
                </TabsTrigger>
              </TabsList>

              {/* Commission Tracker */}
              <TabsContent value="commissions" className="space-y-4">
                <Card className={agentPageStyles.panel}>
                  <CardHeader>
                    <CardTitle>Commission Tracker</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {commissionDeals.map(deal => (
                        <div
                          key={deal.id}
                          className="rounded-[12px] border border-slate-200/70 bg-[#fbfaf7] p-5 transition-colors hover:bg-slate-50"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-gray-900">{deal.property}</h3>
                              <p className="text-sm text-gray-500">Client: {deal.client}</p>
                            </div>
                            <Badge
                              className={cn(
                                deal.status === 'paid'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700',
                              )}
                            >
                              {deal.status === 'paid' ? 'Paid' : 'Pending'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Sale Price</p>
                              <p className="font-semibold text-gray-900">
                                {formatCurrency(deal.salePrice)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Commission ({deal.commissionRate}%)</p>
                              <p className="font-semibold text-green-600">
                                {formatCurrency(deal.commission)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Date Closed</p>
                              <p className="font-semibold text-gray-900">
                                {new Date(deal.dateClosed).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Payout Date</p>
                              <p className="font-semibold text-blue-600">
                                {new Date(deal.payoutDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Transaction History */}
              <TabsContent value="transactions" className="space-y-4">
                <Card className={agentPageStyles.panel}>
                  <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {transactions.map(txn => (
                        <div
                          key={txn.id}
                          className="flex items-center justify-between rounded-[12px] border border-slate-200/70 bg-[#fbfaf7] p-4 transition-colors hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={cn(
                                'p-3 rounded-xl',
                                txn.type === 'commission' && 'bg-green-100',
                                txn.type === 'bonus' && 'bg-purple-100',
                                txn.type === 'withdrawal' && 'bg-blue-100',
                              )}
                            >
                              {txn.type === 'commission' && (
                                <DollarSign className="h-5 w-5 text-green-600" />
                              )}
                              {txn.type === 'bonus' && (
                                <Award className="h-5 w-5 text-purple-600" />
                              )}
                              {txn.type === 'withdrawal' && (
                                <CreditCard className="h-5 w-5 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{txn.description}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(txn.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={cn(
                                'font-bold text-lg',
                                txn.amount > 0 ? 'text-green-600' : 'text-red-600',
                              )}
                            >
                              {txn.amount > 0 ? '+' : ''}
                              {formatCurrency(txn.amount)}
                            </p>
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              {txn.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Bonuses */}
              <TabsContent value="bonuses" className="space-y-4">
                <Card className={agentPageStyles.panel}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-yellow-600" />
                      Bonuses & Incentives
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {bonuses.map(bonus => (
                        <div
                          key={bonus.id}
                          className="p-5 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-gray-900">{bonus.name}</h3>
                              {bonus.status === 'earned' && (
                                <p className="text-sm text-gray-500">
                                  Payout:{' '}
                                  {bonus.date ? new Date(bonus.date).toLocaleDateString() : '—'}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-orange-600">
                                {formatCurrency(bonus.amount)}
                              </p>
                              {bonus.status === 'earned' ? (
                                <Badge className="bg-green-100 text-green-700 mt-1">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Earned
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-100 text-blue-700 mt-1">
                                  In Progress
                                </Badge>
                              )}
                            </div>
                          </div>
                          {bonus.status === 'in_progress' && bonus.progress && bonus.total && (
                            <div className="mt-3">
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600">Progress</span>
                                <span className="font-semibold text-gray-900">
                                  {bonus.progress} / {bonus.total} listings
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${(bonus.progress / bonus.total) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className={agentPageStyles.panel}>
                    <CardHeader>
                      <CardTitle>Recent Commissions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {commissionDeals.slice(0, 3).map(deal => (
                          <div
                            key={deal.id}
                            className="flex items-center justify-between rounded-[12px] border border-slate-200/70 bg-[#fbfaf7] p-3"
                          >
                            <div>
                              <p className="font-semibold text-sm text-gray-900">{deal.property}</p>
                              <p className="text-xs text-gray-500">{deal.client}</p>
                            </div>
                            <p className="font-bold text-green-600">
                              {formatCurrency(deal.commission)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={agentPageStyles.panel}>
                    <CardHeader>
                      <CardTitle>Wallet Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button className={cn(agentPageStyles.primaryButton, 'w-full justify-start')}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Withdraw Funds
                      </Button>
                      <Button
                        variant="outline"
                        className={cn(agentPageStyles.ghostButton, 'w-full justify-start')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Statement
                      </Button>
                      <Button
                        variant="outline"
                        className={cn(agentPageStyles.ghostButton, 'w-full justify-start')}
                      >
                        <Target className="h-4 w-4 mr-2" />
                        View Earnings Goals
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </AgentAppShell>
  );
}
