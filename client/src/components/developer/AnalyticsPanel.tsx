import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Eye, MousePointerClick } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import {
  LineChart,
  Line,
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
} from 'recharts';

const trafficData = [
  { month: 'Jan', views: 2400, clicks: 1200 },
  { month: 'Feb', views: 3200, clicks: 1600 },
  { month: 'Mar', views: 2800, clicks: 1400 },
  { month: 'Apr', views: 3900, clicks: 2100 },
  { month: 'May', views: 4200, clicks: 2400 },
  { month: 'Jun', views: 5100, clicks: 2900 },
];

const developmentData = [
  { name: 'Sunset Heights', leads: 127 },
  { name: 'Riverside Gardens', leads: 89 },
  { name: 'Ocean View Villas', leads: 156 },
  { name: 'Mountain Peak', leads: 64 },
  { name: 'City Center Lofts', leads: 42 },
];

const sourceData = [
  { name: 'Direct', value: 35, color: 'hsl(var(--chart-1))' },
  { name: 'Search', value: 30, color: 'hsl(var(--chart-2))' },
  { name: 'Social', value: 20, color: 'hsl(var(--chart-3))' },
  { name: 'Referral', value: 15, color: 'hsl(var(--chart-4))' },
];

const AnalyticsPanel: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Analytics</h1>
        <p className="text-muted-foreground">
          Track your development performance and marketing metrics
        </p>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Views"
          value="45,231"
          change="+18.2% from last month"
          changeType="positive"
          icon={Eye}
        />
        <MetricCard
          title="Click-through Rate"
          value="12.4%"
          change="+2.3% from last month"
          changeType="positive"
          icon={MousePointerClick}
        />
        <MetricCard
          title="Total Leads"
          value="478"
          change="+24.1% from last month"
          changeType="positive"
          icon={Users}
        />
        <MetricCard
          title="Conversion Rate"
          value="8.9%"
          change="+1.2% from last month"
          changeType="positive"
          icon={TrendingUp}
        />
      </div>

      {/* Traffic Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Traffic Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={trafficData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="views"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                name="Views"
              />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="hsl(var(--chart-3))"
                strokeWidth={2}
                name="Clicks"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Development Performance and Traffic Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Leads by Development</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={developmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="leads" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {sourceData.map(source => (
                <div key={source.name} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: source.color }} />
                  <span className="text-sm text-muted-foreground">
                    {source.name}: {source.value}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
