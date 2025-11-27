import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
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
  MessageSquare,
  Bell,
  BarChart3,
  Settings,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { LeadPipeline } from '@/components/agent/LeadPipeline';
import { ShowingsCalendar } from '@/components/agent/ShowingsCalendar';
import { CommissionTracker } from '@/components/agent/CommissionTracker';
import { NotificationCenter } from '@/components/agent/NotificationCenter';

export default function EnhancedAgentDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Queries
  const { data: stats, isLoading: statsLoading } = trpc.agent.getDashboardStats.useQuery(
    undefined,
    {
      enabled: isAuthenticated && user?.role === 'agent',
      retry: false,
    },
  );

  // Show loading spinner while auth is being checked
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated or not agent
  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }

  if (user?.role !== 'agent') {
    setLocation('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Agent CRM Dashboard</h1>
              <p className="text-muted-foreground">Manage leads, showings, and commissions</p>
            </div>
            <Badge variant="secondary" className="ml-2">
              Enhanced CRM
            </Badge>
          </div>

          {/* Notification Center */}
          <NotificationCenter />
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Home className="h-4 w-4" />
                Active Listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '—' : (stats?.activeListings ?? 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                New Leads (7d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '—' : (stats?.newLeadsThisWeek ?? 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Showings Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '—' : (stats?.showingsToday ?? 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Offers In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '—' : (stats?.offersInProgress ?? 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Pending Commissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading
                  ? '—'
                  : `R ${((stats?.commissionsPending ?? 0) / 100).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Lead Pipeline
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="commissions" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Commissions
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setActiveTab('pipeline')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Manage Lead Pipeline
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setActiveTab('calendar')}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Showing
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setActiveTab('commissions')}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    View Commissions
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No recent activity</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Lead Pipeline Tab */}
          <TabsContent value="pipeline" className="space-y-4">
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

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Advanced analytics coming soon...</p>
                  <p className="text-sm mt-2">
                    Track conversion rates, lead sources, and performance metrics
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dashboard Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Notifications</label>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="email-leads" defaultChecked />
                    <label htmlFor="email-leads" className="text-sm">
                      New lead assignments
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="email-offers" defaultChecked />
                    <label htmlFor="email-offers" className="text-sm">
                      New offers received
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="email-showings" defaultChecked />
                    <label htmlFor="email-showings" className="text-sm">
                      Showing notifications
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Dashboard Preferences</label>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="compact-view" />
                    <label htmlFor="compact-view" className="text-sm">
                      Compact view
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="auto-refresh" defaultChecked />
                    <label htmlFor="auto-refresh" className="text-sm">
                      Auto-refresh data
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
