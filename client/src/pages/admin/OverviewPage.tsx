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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className={`p-2 rounded-full ${color}`}>{icon}</div>
        {trend && (
          <div className="flex items-center">
            {trend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {change && <p className="text-xs text-muted-foreground mt-1">{change}</p>}
      </CardContent>
    </Card>
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
      <Card>
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockRevenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockUserGrowthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
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
        <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
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
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map(activity => (
              <div key={activity.id} className="flex items-start">
                <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-foreground">{activity.user}</p>
                  <p className="text-sm text-muted-foreground">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewPage;
