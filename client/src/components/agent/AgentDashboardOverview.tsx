import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Home,
  Calendar,
  DollarSign,
  TrendingUp,
  Phone,
  Mail,
  Eye,
  MapPin,
  Bed,
  Square,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Share2,
  ExternalLink,
  AlertCircle,
  BarChart3,
  PieChart,
  Activity,
} from 'lucide-react';
import { LeadPipeline } from '@/components/agent/LeadPipeline';
import { CommissionTracker } from '@/components/agent/CommissionTracker';
import { ShowingsCalendar } from '@/components/agent/ShowingsCalendar';
import { NotificationCenter } from '@/components/agent/NotificationCenter';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  color?: string;
}

function StatCard({ title, value, change, icon, color = 'primary' }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className="text-xs text-muted-foreground mt-1">
            <span className={change.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
              {change}
            </span>{' '}
            from last period
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function AgentDashboardOverview() {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data - replace with actual data from your API
  const stats = {
    activeListings: 12,
    newLeadsThisWeek: 24,
    showingsToday: 8,
    offersInProgress: 5,
    commissionsPending: 1250000, // in cents
    totalViews: 1240,
    conversionRate: 12.4,
    avgResponseTime: '2.4h',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Agent Dashboard</h1>
        <Badge variant="secondary">Agent</Badge>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Listings"
          value={stats.activeListings}
          icon={<Home className="h-4 w-4" />}
        />
        <StatCard
          title="New Leads (7d)"
          value={stats.newLeadsThisWeek}
          change="+12% from last week"
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          title="Showings Today"
          value={stats.showingsToday}
          icon={<Calendar className="h-4 w-4" />}
        />
        <StatCard
          title="Pending Commissions"
          value={`R ${(stats.commissionsPending / 100).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          change="+8% from last month"
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leads">Leads Pipeline</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Performance Metrics */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Performance chart visualization</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Your performance metrics will appear here
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Views</span>
                    <span className="font-semibold">{stats.totalViews.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Conversion Rate</span>
                    <span className="font-semibold">{stats.conversionRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Avg. Response Time</span>
                    <span className="font-semibold">{stats.avgResponseTime}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Listing
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Create Lead
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Showing
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Leads Pipeline Tab */}
        <TabsContent value="leads" className="space-y-4">
          <LeadPipeline />
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <ShowingsCalendar />
        </TabsContent>

        {/* Commissions Tab */}
        <TabsContent value="commissions" className="space-y-4">
          <CommissionTracker />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <NotificationCenter />
        </TabsContent>
      </Tabs>
    </div>
  );
}