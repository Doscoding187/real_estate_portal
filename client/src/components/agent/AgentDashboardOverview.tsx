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

  return (
    <div className="flex min-h-screen bg-background">
      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, John! Here's your performance summary.
            </p>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <StatCard
              title="Active Listings"
              value={24}
              icon={Building2}
              trend={{ value: '12% from last month', positive: true }}
            />
            <StatCard
              title="Leads Received"
              value={156}
              icon={Users}
              trend={{ value: '8% from last month', positive: true }}
            />
            <StatCard
              title="Commission Earned"
              value="$45,200"
              icon={DollarSign}
              trend={{ value: '23% from last month', positive: true }}
            />
            <StatCard
              title="Profile Views"
              value="3,420"
              icon={Eye}
              trend={{ value: '5% from last month', positive: true }}
            />
          </div>

          {/* Charts and Activity Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <PerformanceChart />
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
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Performance Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Conversion Rate</span>
                        <span className="font-medium">24.8%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Avg. Deal Size</span>
                        <span className="font-medium">$425,000</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Response Time</span>
                        <span className="font-medium">2.3 hours</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Client Satisfaction</span>
                        <span className="font-medium">4.8/5.0</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Lead Sources
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span>Website</span>
                        </div>
                        <span className="font-medium">35%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span>Referrals</span>
                        </div>
                        <span className="font-medium">28%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <span>Social Media</span>
                        </div>
                        <span className="font-medium">22%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                          <span>Direct</span>
                        </div>
                        <span className="font-medium">15%</span>
                      </div>
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
