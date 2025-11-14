import React from 'react';
import { Users, Home, CreditCard, Activity, DollarSign } from 'lucide-react';
import StatCard from '../components/common/StatCard';
import RevenueChart from '../components/common/RevenueChart';
import Button from '../components/common/Button';

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
        <h1 className="text-2xl font-bold text-slate-900">
          Dashboard Overview
        </h1>
        <p className="text-slate-600">
          Welcome back! Here's what's happening today.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {keyMetrics.map((metric, index) => (
          <StatCard key={index} {...metric} />
        ))}
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 card p-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900">
              Revenue Overview
            </h2>
            <Button variant="secondary" size="sm">
              View Report
            </Button>
          </div>
          <RevenueChart />
        </div>

        {/* Recent Activity */}
        <div className="card p-3">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            Recent Activity
          </h2>
          <div className="space-y-3">
            {recentActivity.map(activity => (
              <div key={activity.id} className="flex items-start">
                <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
                <div className="ml-2">
                  <p className="text-sm font-medium text-slate-900">
                    {activity.user}
                  </p>
                  <p className="text-sm text-slate-600">{activity.action}</p>
                  <p className="text-xs text-slate-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
