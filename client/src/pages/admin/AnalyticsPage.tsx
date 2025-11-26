import React from 'react';
import {
  Users,
  Building2,
  Home,
  TrendingUp,
  Activity,
  ArrowLeft,
  UserPlus,
  FileText,
} from 'lucide-react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  value,
  label,
  color = 'bg-muted',
}) => {
  return (
    <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] hover:shadow-[0_12px_40px_rgba(8,_112,_184,_0.1)] transition-all py-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className={`p-2 rounded-full ${color}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        <p className="text-xs text-slate-500">{label}</p>
      </CardContent>
    </GlassCard>
  );
};

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'];

const AnalyticsPage: React.FC = () => {
  const [, setLocation] = useLocation();

  const { data: analytics, isLoading } = trpc.admin.getGeneralAnalytics.useQuery();

  // Prepare chart data
  const userDistribution = analytics ? [
    { name: 'Agents', value: analytics.counts.agents },
    { name: 'Agencies', value: analytics.counts.agencies },
    { name: 'End Users', value: analytics.counts.users - analytics.counts.agents - analytics.counts.agencies },
  ] : [];

  const listingStats = analytics ? [
    { name: 'Active', value: analytics.counts.activeListings },
    { name: 'Inactive', value: analytics.counts.listings - analytics.counts.activeListings },
  ] : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/admin/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Platform Analytics</h1>
            <p className="text-slate-500">System-wide performance and usage metrics</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Users className="h-6 w-6 text-blue-600" />}
          value={analytics?.counts.users || 0}
          label="Total Users"
          color="bg-blue-100"
        />
        <StatCard
          icon={<Building2 className="h-6 w-6 text-purple-600" />}
          value={analytics?.counts.agencies || 0}
          label="Registered Agencies"
          color="bg-purple-100"
        />
        <StatCard
          icon={<Home className="h-6 w-6 text-emerald-600" />}
          value={analytics?.counts.listings || 0}
          label="Total Listings"
          color="bg-emerald-100"
        />
        <StatCard
          icon={<Activity className="h-6 w-6 text-amber-600" />}
          value={analytics?.counts.activeListings || 0}
          label="Active Listings"
          color="bg-amber-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Distribution Chart */}
        <GlassCard className="p-6">
          <CardHeader>
            <CardTitle className="text-slate-800">User Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={userDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {userDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </GlassCard>

        {/* Listing Status Chart */}
        <GlassCard className="p-6">
          <CardHeader>
            <CardTitle className="text-slate-800">Listing Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={listingStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                  {listingStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </GlassCard>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <UserPlus className="h-5 w-5 text-blue-500" />
              New Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.recentActivity.users.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium">
                      {user.firstName?.[0] || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">{user.role}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </GlassCard>

        <GlassCard className="p-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <FileText className="h-5 w-5 text-emerald-500" />
              Recent Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.recentActivity.listings.map((listing: any) => (
                <div key={listing.id} className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                      <Home className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{listing.title}</p>
                      <p className="text-xs text-slate-500 capitalize">{listing.propertyType}</p>
                    </div>
                  </div>
                  <Badge variant={listing.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                    {listing.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </GlassCard>
      </div>
    </div>
  );
};

export default AnalyticsPage;
