/**
 * Boost Campaign Manager Component
 * Manages boost campaigns for Explore content
 * Requirements: 9.1, 9.4, 9.5
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import {
  TrendingUp,
  DollarSign,
  Eye,
  MousePointerClick,
  Target,
  Play,
  Pause,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { useState } from 'react';

export function BoostCampaignManager() {
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);

  // Fetch campaigns
  const { data: campaigns, isLoading, refetch } = trpc.boostCampaign.getMyCampaigns.useQuery();

  // Mutations
  const deactivateMutation = trpc.boostCampaign.deactivateCampaign.useMutation({
    onSuccess: () => refetch(),
  });

  const reactivateMutation = trpc.boostCampaign.reactivateCampaign.useMutation({
    onSuccess: () => refetch(),
  });

  const handlePause = async (campaignId: number) => {
    await deactivateMutation.mutateAsync({ campaignId });
  };

  const handleResume = async (campaignId: number) => {
    await reactivateMutation.mutateAsync({ campaignId });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="h-48 bg-slate-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Boost Campaigns</CardTitle>
          <CardDescription>Promote your content to reach more viewers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">No active boost campaigns</p>
            <Button>Create Campaign</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Boost Campaigns</h2>
          <p className="text-slate-500">Manage your promoted content</p>
        </div>
        <Button>
          <TrendingUp className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      {/* Campaign List */}
      <div className="grid grid-cols-1 gap-4">
        {campaigns.map(campaign => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            onPause={handlePause}
            onResume={handleResume}
            isSelected={selectedCampaign === campaign.id}
            onSelect={() => setSelectedCampaign(campaign.id)}
          />
        ))}
      </div>
    </div>
  );
}

function CampaignCard({
  campaign,
  onPause,
  onResume,
  isSelected,
  onSelect,
}: {
  campaign: any;
  onPause: (id: number) => void;
  onResume: (id: number) => void;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { data: analytics } = trpc.boostCampaign.getCampaignAnalytics.useQuery({
    campaignId: campaign.id,
  });

  const statusColors = {
    active: 'bg-green-100 text-green-700 border-green-200',
    paused: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    completed: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const budgetPercentage = analytics ? (analytics.spent / analytics.budget) * 100 : 0;

  return (
    <Card className={isSelected ? 'ring-2 ring-emerald-500' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{campaign.campaignName}</CardTitle>
            <Badge className={statusColors[campaign.status as keyof typeof statusColors]}>
              {campaign.status}
            </Badge>
          </div>
          <div className="flex gap-2">
            {campaign.status === 'active' && (
              <Button variant="outline" size="sm" onClick={() => onPause(campaign.id)}>
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
            )}
            {campaign.status === 'paused' && (
              <Button variant="outline" size="sm" onClick={() => onResume(campaign.id)}>
                <Play className="h-4 w-4 mr-1" />
                Resume
              </Button>
            )}
          </div>
        </div>
        <CardDescription className="flex items-center gap-4 mt-2">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {analytics?.daysRemaining || 0} days remaining
          </span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />R{analytics?.spent.toFixed(2) || 0} / R
            {analytics?.budget.toFixed(2) || 0}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {analytics && (
          <div className="space-y-4">
            {/* Budget Progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500">Budget Used</span>
                <span className="font-semibold">{budgetPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    budgetPercentage >= 90
                      ? 'bg-red-500'
                      : budgetPercentage >= 70
                        ? 'bg-yellow-500'
                        : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricBox
                icon={<Eye className="h-4 w-4" />}
                label="Impressions"
                value={analytics.impressions.toLocaleString()}
              />
              <MetricBox
                icon={<MousePointerClick className="h-4 w-4" />}
                label="Clicks"
                value={analytics.clicks.toLocaleString()}
              />
              <MetricBox
                icon={<Target className="h-4 w-4" />}
                label="CTR"
                value={`${analytics.clickThroughRate.toFixed(2)}%`}
              />
              <MetricBox
                icon={<DollarSign className="h-4 w-4" />}
                label="CPC"
                value={`R${analytics.costPerClick.toFixed(2)}`}
              />
            </div>

            {/* Warning for low budget */}
            {budgetPercentage >= 90 && campaign.status === 'active' && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-700">
                  Campaign budget is almost depleted. It will pause automatically when budget is
                  reached.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
      <div className="text-slate-400">{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}
