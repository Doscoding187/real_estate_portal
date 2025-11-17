import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Users, Home, ClipboardList, DollarSign, Eye } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { LeadCard } from '@/components/LeadCard';
import { TaskCard } from '@/components/TaskCard';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const analyticsData = [
  { month: 'Jan', leads: 45 },
  { month: 'Feb', leads: 52 },
  { month: 'Mar', leads: 48 },
  { month: 'Apr', leads: 68 },
  { month: 'May', leads: 72 },
  { month: 'Jun', leads: 85 },
];

export default function Overview() {
  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Sales"
          value="R 23.4M"
          change="+21% from last month"
          changeType="positive"
          icon={DollarSign}
        />
        <MetricCard
          title="Active Developments"
          value="12"
          change="3 new this month"
          changeType="positive"
          icon={Home}
        />
        <MetricCard
          title="Total Leads"
          value="1,234"
          change="+15% from last month"
          changeType="positive"
          icon={Users}
        />
        <MetricCard
          title="Property Views"
          value="10,736"
          change="-3% from last month"
          changeType="negative"
          icon={Eye}
        />
      </div>

      {/* Charts and Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analytics Chart */}
        <Card className="card lg:col-span-2">
          <CardHeader>
            <CardTitle className="typ-h3">Lead Analytics</CardTitle>
            <CardDescription>Monthly lead generation trends</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="leads"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#colorLeads)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tasks Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="typ-h3">My Tasks</h2>
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </div>
          <div className="space-y-3">
            <TaskCard
              title="Obtain survey from broker"
              dueDate="Mar 22"
              status="pending"
              team={[
                'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
                'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
                'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
              ]}
            />
            <TaskCard
              title="Planning and zoning"
              dueDate="Mar 23"
              status="screening"
              team={[
                'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
                'https://api.dicebear.com/7.x/avataaars/svg?seed=5',
              ]}
            />
            <TaskCard
              title="Draft initial site plan"
              dueDate="Apr 7"
              status="preview"
              team={[
                'https://api.dicebear.com/7.x/avataaars/svg?seed=6',
                'https://api.dicebear.com/7.x/avataaars/svg?seed=7',
              ]}
            />
          </div>
        </div>
      </div>

      {/* Recent Leads */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="typ-h3">Recent Leads</h2>
          <Button variant="outline" size="sm">
            View All Leads
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LeadCard
            image="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400"
            title="Sunset Heights Estate"
            type="Luxury Apartments"
            price="R 625,000"
            size="200 m²"
            views="1,927 views"
            status="active"
          />
          <LeadCard
            image="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400"
            title="Riverside Gardens"
            type="Family Residences"
            price="R 1,200,000"
            size="310 m²"
            views="3,081 views"
            status="active"
          />
        </div>
      </div>

      {/* Completed Deals */}
      <Card className="card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="typ-h3">Completed Deals</CardTitle>
            <div className="text-right">
              <p className="text-3xl font-bold">1,081</p>
              <p className="text-sm text-muted-foreground">This month</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="relative">
              <div className="text-center">
                <div className="text-6xl font-bold text-green-600 mb-2">+49%</div>
                <p className="text-muted-foreground">Growth from last month</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
