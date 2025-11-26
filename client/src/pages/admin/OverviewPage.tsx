import React from 'react';
import {
  Users,
  Home,
  CreditCard,
  Activity,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  trend?: 'up' | 'down';
  color?: string;
  change?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  value,
  label,
  trend,
  color = 'bg-muted',
  change,
}) => {
  return (
    <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] hover:shadow-[0_12px_40px_rgba(8,_112,_184,_0.1)] transition-all py-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className={`p-2 rounded-full ${color}`}>{icon}</div>
        {trend && (
          <div className="flex items-center">
            {trend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-500" />
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        <p className="text-xs text-slate-500">{label}</p>
        {change && <p className="text-xs text-slate-500 mt-1">{change}</p>}
      </CardContent>
    </GlassCard>
  );
};

const RevenueChart: React.FC = () => {
  // Mock data for charts
  const mockRevenueData = [
    { name: 'Jan', revenue: 4000 },
    { name: 'Feb', revenue: 3000 },
    { name: 'Mar', revenue: 2000 },
    { name: 'Apr', revenue: 2780 },
    { name: 'May', revenue: 1890 },
    { name: 'Jun', revenue: 2390 },
  ];

  const mockUserGrowthData = [
    { name: 'Jan', users: 400 },
    { name: 'Feb', users: 600 },
    { name: 'Mar', users: 800 },
    { name: 'Apr', users: 1200 },
    { name: 'May', users: 1500 },
    { name: 'Jun', users: 1800 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] py-6">
        <CardHeader>
          <CardTitle className="text-slate-800">Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockRevenueData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
              <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey="revenue" fill="url(#revenueGradient)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </GlassCard>

      <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] py-6">
        <CardHeader>
          <CardTitle className="text-slate-800">User Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockUserGrowthData}>
              <defs>
                <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
              <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Line
                type="monotone"
                dataKey="users"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', r: 4 }}
                activeDot={{ r: 6, fill: '#8b5cf6' }}
                fill="url(#userGradient)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </GlassCard>
    </div>
  );
};

const OverviewPage: React.FC = () => {
  // Mock data for key metrics
  const keyMetrics = [
    {
      title: 'Total Revenue',
      value: 'R 1,245,680',
      label: 'Total Revenue',
      change: '+12.5%',
      trend: 'up' as const,
      icon: <DollarSign className="h-6 w-6 text-blue-600" />,
      color: 'bg-blue-100',
    },
    {
      title: 'Active Users',
      value: '24,568',
      label: 'Active Users',
      change: '+8.2%',
      trend: 'up' as const,
      icon: <Users className="h-6 w-6 text-green-600" />,
      color: 'bg-green-100',
    },
    {
      title: 'Properties Listed',
      value: '8,421',
      label: 'Properties Listed',
      change: '+3.1%',
      trend: 'up' as const,
      icon: <Home className="h-6 w-6 text-purple-600" />,
      color: 'bg-purple-100',
    },
    {
      title: 'Subscription Revenue',
      value: 'R 345,210',
      label: 'Subscription Revenue',
      change: '+5.7%',
      trend: 'down' as const,
      icon: <CreditCard className="h-6 w-6 text-amber-600" />,
      color: 'bg-amber-100',
    },
  ];

  // Mock data for recent activity
  const recentActivity = [
    {
      id: 1,
      user: 'John Smith',
      action: 'listed a new property',
      time: '2 min ago',
    },
    {
      id: 2,
      user: 'Cape Town Properties',
      action: 'upgraded subscription',
      time: '1 hour ago',
    },
    {
      id: 3,
      user: 'Sarah Johnson',
      action: 'completed profile',
      time: '3 hours ago',
    },
    {
      id: 4,
      user: 'Property Pro',
      action: 'added 5 new listings',
      time: '5 hours ago',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-slate-800">Dashboard Overview</h1>
        <p className="text-slate-500">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {keyMetrics.map((metric, index) => (
          <StatCard key={index} {...metric} />
        ))}
      </div>

      {/* Charts */}
      <RevenueChart />

      {/* Recent Activity */}
      <GlassCard className="mt-6 border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] py-6">
        <CardHeader>
          <CardTitle className="text-slate-800">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map(activity => (
              <div key={activity.id} className="flex items-start">
                <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-slate-800">{activity.user}</p>
                  <p className="text-sm text-slate-500">{activity.action}</p>
                  <p className="text-xs text-slate-400">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </GlassCard>
    </div>
  );
};

export default OverviewPage;
