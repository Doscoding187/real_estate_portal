import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Users,
  DollarSign,
  Eye,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Share2,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { LeadPipeline } from '@/components/agent/LeadPipeline';
import { CommissionTracker } from '@/components/agent/CommissionTracker';
import { ShowingsCalendar } from '@/components/agent/ShowingsCalendar';
import { NotificationCenter } from '@/components/agent/NotificationCenter';
import { StatCard } from '@/components/agent/StatCard';
import { PerformanceChart } from '@/components/agent/PerformanceChart';
import { RecentActivity } from '@/components/agent/RecentActivity';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ElementType;
  changeType?: 'positive' | 'negative';
}

export function AgentDashboardOverview() {
  const [activeTab, setActiveTab] = useState('overview');
  const { isAuthenticated, user } = useAuth();

  // Queries
  const { data: stats, isLoading: statsLoading } = trpc.agent.getDashboardStats.useQuery(
    undefined,
    {
      enabled: isAuthenticated && user?.role === 'agent',
      retry: false,
    },
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-gray-100 bg-white shadow-sm px-6 transition-all duration-200">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
            <p className="text-sm text-gray-500">
              Welcome back, {user?.name?.split(' ')[0] || 'Agent'}! Here's your performance summary.
            </p>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6 space-y-8 max-w-[1600px] mx-auto">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <StatCard
              title="Active Listings"
              value={statsLoading ? '—' : (stats?.activeListings ?? 0)}
              icon={Building2}
              // trend={{ value: '12% from last month', positive: true }}
            />
            <StatCard
              title="Leads Received"
              value={statsLoading ? '—' : (stats?.newLeadsThisWeek ?? 0)}
              icon={Users}
              // trend={{ value: '8% from last month', positive: true }}
            />
            <StatCard
              title="Commission Pending"
              value={statsLoading ? '—' : `R ${((stats?.commissionsPending ?? 0) / 100).toLocaleString()}`}
              icon={DollarSign}
              // trend={{ value: '23% from last month', positive: true }}
            />
            <StatCard
              title="Showings Today"
              value={statsLoading ? '—' : (stats?.showingsToday ?? 0)}
              icon={Calendar}
              // trend={{ value: '5% from last month', positive: true }}
            />
          </div>

          {/* Charts and Activity Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <PerformanceChart data={[]} />
            </div>
            <div>
              <RecentActivity />
            </div>
          </div>

          {/* Detailed Sections */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 p-1 bg-white rounded-xl shadow-soft mb-8">
              <TabsTrigger 
                value="overview"
                className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all duration-200"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="leads"
                className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all duration-200"
              >
                Leads Pipeline
              </TabsTrigger>
              <TabsTrigger 
                value="calendar"
                className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all duration-200"
              >
                Calendar
              </TabsTrigger>
              <TabsTrigger 
                value="commission"
                className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all duration-200"
              >
                Commission
              </TabsTrigger>
              <TabsTrigger 
                value="notifications"
                className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all duration-200"
              >
                Notifications
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-soft hover:shadow-hover transition-all duration-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <div className="p-2 bg-blue-50 rounded-xl">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                      </div>
                      Performance Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-gray-400">
                      <p className="text-sm font-medium">No performance metrics available yet</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-soft hover:shadow-hover transition-all duration-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <div className="p-2 bg-purple-50 rounded-xl">
                        <PieChart className="h-5 w-5 text-purple-600" />
                      </div>
                      Lead Sources
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-gray-400">
                      <p className="text-sm font-medium">No lead source data available yet</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="leads" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
              <LeadPipeline />
            </TabsContent>

            <TabsContent value="calendar" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
              <ShowingsCalendar />
            </TabsContent>

            <TabsContent value="commission" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
              <CommissionTracker />
            </TabsContent>

            <TabsContent value="notifications" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
              <NotificationCenter />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
