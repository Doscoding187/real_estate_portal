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
  Calendar,
  CheckCircle,
  TrendingUp,
  Play,
  MessageSquare,
  Clock,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Target,
  Video,
  Home,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ElementType;
  changeType?: 'positive' | 'negative';
}

function QuickStatCard({ title, value, icon: Icon, trend }: { title: string; value: string | number; icon: React.ElementType; trend?: { value: string; positive: boolean } }) {
  return (
    <Card className="shadow-soft hover:shadow-hover transition-all duration-300 border-gray-100">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {trend && (
              <p className={cn('text-xs font-medium mt-2 flex items-center gap-1', trend.positive ? 'text-green-600' : 'text-red-600')}>
                <TrendingUp className={cn('h-3 w-3', !trend.positive && 'rotate-180')} />
                {trend.value}
              </p>
            )}
          </div>
          <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AgentDashboardOverview() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();

  // Queries
  const { data: stats, isLoading: statsLoading } = trpc.agent.getDashboardStats.useQuery(
    undefined,
    {
      enabled: isAuthenticated && user?.role === 'agent',
      retry: false,
    }
  );

  // Mock data for today's snapshot (replace with real queries)
  const todaysAppointments = [
    { id: 1, time: '10:00 AM', title: 'Property Viewing - Cape Town Villa', client: 'John Smith', type: 'showing' },
    { id: 2, time: '2:00 PM', title: 'Client Meeting - Investment Portfolio', client: 'Sarah Williams', type: 'meeting' },
    { id: 3, time: '4:30 PM', title: 'Property Inspection - Sandton Apartment', client: 'Mike Davis', type: 'inspection' },
  ];

  const newLeads = [
    { id: 1, name: 'Alice Johnson', property: 'Luxury Villa in Camps Bay', time: '30 min ago', budget: 'R 15M - R 20M' },
    { id: 2, name: 'Robert Chen', property: 'Modern Apartment in Sandton', time: '1 hour ago', budget: 'R 3M - R 5M' },
  ];

  const tasksToday = [
    { id: 1, task: 'Follow up with Sarah about offer', completed: false, priority: 'high' },
    { id: 2, task: 'Upload new photos for Waterfront listing', completed: true, priority: 'medium' },
    { id: 3, task: 'Prepare market analysis report', completed: false, priority: 'high' },
    { id: 4, task: 'Schedule viewing for Sandton property', completed: true, priority: 'low' },
  ];

  const exploreVideos = [
    { id: 1, title: '360° Virtual Tour - Luxury Villa', views: 2345, engagement: 87, thumbnail: '/assets/video1.jpg' },
    { id: 2, title: 'Cape Town Waterfront Apartment', views: 1823, engagement: 92, thumbnail: '/assets/video2.jpg' },
  ];

  const activeListingsPerformance = [
    { id: 1, title: 'Luxury Villa in Camps Bay', views: 456, enquiries: 12, price: 'R 25M' },
    { id: 2, title: 'Modern Sandton Apartment', views: 234, enquiries: 8, price: 'R 4.5M' },
  ];

  const alerts = [
    { id: 1, type: 'opportunity', message: 'Your Camps Bay listing has 3 new enquiries', action: 'View Enquiries' },
    { id: 2, type: 'recommendation', message: 'Boost your visibility - Upload more Explore videos', action: 'Upload Now' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="p-6 space-y-6 max-w-[1800px] mx-auto">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white shadow-hover">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name?.split(' ')[0] || 'Agent'}! 👋</h1>
              <p className="text-blue-100">Here's what's happening with your business today.</p>
            </div>
            <div className="hidden md:block">
              <div className="text-right">
                <p className="text-sm text-blue-100">Today's Date</p>
                <p className="text-lg font-semibold">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <QuickStatCard
            title="Active Listings"
            value={statsLoading ? '—' : stats?.activeListings ?? 0}
            icon={Building2}
            trend={{ value: '+12% this month', positive: true }}
          />
          <QuickStatCard
            title="New Leads This Week"
            value={statsLoading ? '—' : stats?.newLeadsThisWeek ?? 0}
            icon={Users}
            trend={{ value: '+8 new today', positive: true }}
          />
          <QuickStatCard
            title="Showings Today"
            value={statsLoading ? '—' : stats?.showingsToday ?? todaysAppointments.length}
            icon={Calendar}
          />
          <QuickStatCard
            title="Commission Pending"
            value={statsLoading ? '—' : `R ${((stats?.commissionsPending ?? 0) / 100).toLocaleString()}`}
            icon={DollarSign}
            trend={{ value: '+R 45k this week', positive: true }}
          />
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - 2/3 width */}
          <div className="xl:col-span-2 space-y-6">
            {/* Today's Appointments & Showings */}
            <Card className="shadow-soft hover:shadow-hover transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-purple-50 rounded-xl">
                      <Calendar className="h-5 w-5 text-purple-600" />
                    </div>
                    Today's Schedule
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700" onClick={() => setLocation('/agent/productivity')}>
                    View Calendar <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {todaysAppointments.map((apt) => (
                    <div key={apt.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                      <div className="flex-shrink-0 w-20 text-center">
                        <p className="text-sm font-semibold text-gray-900">{apt.time}</p>
                      </div>
                      <div className="h-10 w-1 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{apt.title}</p>
                        <p className="text-sm text-gray-500">with {apt.client}</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                        {apt.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* New Leads */}
            <Card className="shadow-soft hover:shadow-hover transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-green-50 rounded-xl">
                      <Users className="h-5 w-5 text-green-600" />
                    </div>
                    New Leads
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700" onClick={() => setLocation('/agent/leads')}>
                    View All <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {newLeads.map((lead) => (
                    <div key={lead.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                      <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {lead.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{lead.name}</p>
                        <p className="text-sm text-gray-600">{lead.property}</p>
                        <p className="text-xs text-gray-500 mt-1">Budget: {lead.budget}</p>
                      </div>
                      <p className="text-xs text-gray-400">{lead.time}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Active Listings Performance */}
            <Card className="shadow-soft hover:shadow-hover transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-orange-50 rounded-xl">
                      <Home className="h-5 w-5 text-orange-600" />
                    </div>
                    Active Listings Performance
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700" onClick={() => setLocation('/agent/listings')}>
                    View All <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeListingsPerformance.map((listing) => (
                    <div key={listing.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{listing.title}</p>
                        <p className="text-lg font-bold text-blue-600 mt-1">{listing.price}</p>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="text-gray-500">Views</p>
                          <p className="font-semibold text-gray-900">{listing.views}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-500">Enquiries</p>
                          <p className="font-semibold text-green-600">{listing.enquiries}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            {/* Tasks Due Today */}
            <Card className="shadow-soft hover:shadow-hover transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-yellow-50 rounded-xl">
                    <CheckCircle className="h-5 w-5 text-yellow-600" />
                  </div>
                  Tasks Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tasksToday.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className={cn('h-5 w-5 rounded border-2 flex items-center justify-center', task.completed ? 'bg-green-500 border-green-500' : 'border-gray-300')}>
                        {task.completed && <CheckCircle className="h-4 w-4 text-white" />}
                      </div>
                      <p className={cn('text-sm flex-1', task.completed ? 'text-gray-400 line-through' : 'text-gray-900')}>
                        {task.task}
                      </p>
                      {task.priority === 'high' && !task.completed && (
                        <Badge className="bg-red-100 text-red-700 text-xs">High</Badge>
                      )}
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="w-full mt-4 text-blue-600" onClick={() => setLocation('/agent/productivity')}>
                  View All Tasks
                </Button>
              </CardContent>
            </Card>

            {/* Explore Video Performance */}
            <Card className="shadow-soft hover:shadow-hover transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-pink-50 rounded-xl">
                    <Video className="h-5 w-5 text-pink-600" />
                  </div>
                  Explore Videos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {exploreVideos.map((video) => (
                    <div key={video.id} className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg flex items-center justify-center">
                          <Play className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-gray-900">{video.title}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" /> {video.views}
                            </span>
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" /> {video.engagement}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="w-full mt-4 text-blue-600" onClick={() => setLocation('/agent/marketing')}>
                  Upload More Videos
                </Button>
              </CardContent>
            </Card>

            {/* Alerts & Recommendations */}
            <Card className="shadow-soft hover:shadow-hover transition-all duration-300 border-2 border-blue-100">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 rounded-xl">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                  </div>
                  Alerts & Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="p-4 bg-blue-50 rounded-xl">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 font-medium">{alert.message}</p>
                          <Button variant="link" className="p-0 h-auto text-blue-600 text-sm mt-2">
                            {alert.action} <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Messages */}
            <Card className="shadow-soft hover:shadow-hover transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 rounded-xl">
                      <MessageSquare className="h-5 w-5 text-indigo-600" />
                    </div>
                    Messages
                  </CardTitle>
                  <Badge className="bg-red-500 text-white">2</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 text-center py-4">2 unread messages</p>
                <Button variant="ghost" size="sm" className="w-full text-blue-600" onClick={() => setLocation('/agent/leads')}>
                  View Messages
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
