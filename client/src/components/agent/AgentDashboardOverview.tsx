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
    <div className="flex min-h-screen bg-[#F4F7FA]">
      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white/70 backdrop-blur-sm shadow-sm px-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-800">Dashboard Overview</h1>
            <p className="text-sm text-slate-500">
              Welcome back, {user?.name?.split(' ')[0] || 'Agent'}! Here's your performance summary.
            </p>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6 space-y-6">
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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="leads">Leads Pipeline</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="commission">Commission</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-800">
                      <BarChart3 className="h-5 w-5" />
                      Performance Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No performance metrics available yet</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-800">
                      <PieChart className="h-5 w-5" />
                      Lead Sources
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No lead source data available yet</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="leads">
              <LeadPipeline />
            </TabsContent>

            <TabsContent value="calendar">
              <ShowingsCalendar />
            </TabsContent>

            <TabsContent value="commission">
              <CommissionTracker />
            </TabsContent>

            <TabsContent value="notifications">
              <NotificationCenter />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
