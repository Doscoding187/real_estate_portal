import React, { useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  TrendingUp,
  MousePointer,
  Users,
  DollarSign,
  Eye,
  BarChart2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Badge } from '@/components/ui/badge';

const CampaignInsights: React.FC = () => {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/admin/marketing/campaign/:id');
  const campaignId = params?.id ? parseInt(params.id) : 0;
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  const { data, isLoading } = trpc.marketing.getCampaignAnalytics.useQuery(
    {
      campaignId,
      dateRange,
    },
    {
      enabled: !!campaignId,
    },
  );

  if (isLoading) {
    return <div className="p-8 flex justify-center">Loading analytics...</div>;
  }

  if (!data) {
    return <div className="p-8">Campaign not found</div>;
  }

  const { summary, dailyData, channelPerformance, campaign } = data;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/admin/marketing')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{campaign.campaignName}</h1>
              <Badge
                variant={campaign.status === 'active' ? 'default' : 'secondary'}
                className="capitalize"
              >
                {campaign.status}
              </Badge>
            </div>
            <p className="text-slate-500 capitalize">
              {campaign.campaignType?.replace('_', ' ')} Campaign
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">Export Report</Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Spend</p>
              <h3 className="text-2xl font-bold text-slate-900">R {summary.spend}</h3>
              <p className="text-xs text-emerald-600 flex items-center mt-1">
                <TrendingUp className="w-3 h-3 mr-1" /> +12% vs last period
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Impressions</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {summary.impressions.toLocaleString()}
              </h3>
              <p className="text-xs text-emerald-600 flex items-center mt-1">
                <TrendingUp className="w-3 h-3 mr-1" /> +5% vs last period
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-full">
              <Eye className="w-6 h-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Clicks (CTR {summary.ctr}%)</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {summary.clicks.toLocaleString()}
              </h3>
              <p className="text-xs text-slate-500 mt-1">CPC: R {summary.cpc}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-full">
              <MousePointer className="w-6 h-6 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Leads Generated</p>
              <h3 className="text-2xl font-bold text-slate-900">{summary.leads}</h3>
              <p className="text-xs text-slate-500 mt-1">CPL: R {summary.cpl}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-full">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Performance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Performance Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={str =>
                      new Date(str).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })
                    }
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="impressions"
                    stroke="#8884d8"
                    fillOpacity={1}
                    fill="url(#colorImpressions)"
                    name="Impressions"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="clicks"
                    stroke="#82ca9d"
                    fillOpacity={1}
                    fill="url(#colorClicks)"
                    name="Clicks"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Channel Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Channel Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={60} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Impressions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-3">
              {channelPerformance.map((channel, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-600">{channel.name}</span>
                  <span className="font-medium">
                    {((channel.value / summary.impressions) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CampaignInsights;
