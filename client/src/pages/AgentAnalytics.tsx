import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Home,
  Calendar,
  Eye,
  Target,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    positive: boolean;
  };
  icon: React.ElementType;
  className?: string;
}

function MetricCard({ title, value, change, icon: Icon, className }: MetricCardProps) {
  return (
    <Card className={cn('shadow-soft hover:shadow-hover transition-all duration-200', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {change && (
              <div className="flex items-center gap-1">
                {change.positive ? (
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-600" />
                )}
                <span
                  className={cn(
                    'text-sm font-medium',
                    change.positive ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {change.value}
                </span>
              </div>
            )}
          </div>
          <div className="p-3 bg-blue-50 rounded-xl">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AgentAnalytics() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch analytics data
  const { data: stats, isLoading } = trpc.agent.getDashboardStats.useQuery();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">
                Track your performance and insights
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Time Range Selector */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                {[
                  { value: '7d', label: '7 Days' },
                  { value: '30d', label: '30 Days' },
                  { value: '90d', label: '90 Days' },
                  { value: '1y', label: '1 Year' },
                ].map(range => (
                  <button
                    key={range.value}
                    onClick={() => setTimeRange(range.value as any)}
                    className={cn(
                      'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                      timeRange === range.value
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-[1600px] mx-auto space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Views"
            value={isLoading ? '—' : '12,458'}
            change={{ value: '+12.5%', positive: true }}
            icon={Eye}
          />
          <MetricCard
            title="Leads Generated"
            value={isLoading ? '—' : (stats?.newLeadsThisWeek ?? 0)}
            change={{ value: '+8.2%', positive: true }}
            icon={Users}
          />
          <MetricCard
            title="Conversion Rate"
            value="24.5%"
            change={{ value: '+3.1%', positive: true }}
            icon={Target}
          />
          <MetricCard
            title="Revenue"
            value="R 485K"
            change={{ value: '+18.7%', positive: true }}
            icon={DollarSign}
          />
        </div>

        {/* Detailed Analytics */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 p-1 bg-white rounded-xl shadow-soft">
            <TabsTrigger value="overview" className="rounded-lg">
              Overview
            </TabsTrigger>
            <TabsTrigger value="listings" className="rounded-lg">
              Listings
            </TabsTrigger>
            <TabsTrigger value="leads" className="rounded-lg">
              Leads
            </TabsTrigger>
            <TabsTrigger value="revenue" className="rounded-lg">
              Revenue
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Chart */}
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Performance Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-xl">
                    <div className="text-center text-gray-400">
                      <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-40" />
                      <p className="text-sm font-medium">Chart visualization coming soon</p>
                      <p className="text-xs mt-1">Performance data over time</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lead Sources */}
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Lead Sources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { source: 'Website', count: 45, percentage: 35, color: 'bg-blue-500' },
                      { source: 'Explore Feed', count: 38, percentage: 30, color: 'bg-purple-500' },
                      { source: 'Agent Profile', count: 25, percentage: 20, color: 'bg-green-500' },
                      { source: 'Referral', count: 19, percentage: 15, color: 'bg-orange-500' },
                    ].map(item => (
                      <div key={item.source} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">{item.source}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">{item.count} leads</span>
                            <span className="font-semibold text-gray-900">{item.percentage}%</span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', item.color)}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Performing Listings */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Top Performing Listings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Property</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Views</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Leads</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Conversion</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          name: '3 Bed Apartment in Sandton',
                          views: 1245,
                          leads: 34,
                          conversion: '2.7%',
                          status: 'Active',
                        },
                        {
                          name: 'Luxury Villa in Camps Bay',
                          views: 892,
                          leads: 28,
                          conversion: '3.1%',
                          status: 'Active',
                        },
                        {
                          name: 'Modern Townhouse in Rosebank',
                          views: 765,
                          leads: 19,
                          conversion: '2.5%',
                          status: 'Active',
                        },
                      ].map((listing, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-medium text-gray-900 text-sm">{listing.name}</p>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{listing.views.toLocaleString()}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{listing.leads}</td>
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium text-green-600">{listing.conversion}</span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {listing.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="listings" className="space-y-6 mt-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Listing Performance Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <Home className="h-12 w-12 mx-auto mb-4 opacity-40" />
                  <p className="font-medium">Detailed listing analytics coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads" className="space-y-6 mt-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Lead Funnel Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-40" />
                  <p className="font-medium">Lead funnel visualization coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6 mt-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Revenue Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-40" />
                  <p className="font-medium">Revenue breakdown coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
