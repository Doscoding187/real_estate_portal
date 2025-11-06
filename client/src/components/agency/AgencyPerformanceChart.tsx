import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';

interface AgencyPerformanceChartProps {
  data: Array<{
    month: string;
    listings: number;
    leads: number;
    sales: number;
  }>;
  isLoading?: boolean;
}

export function AgencyPerformanceChart({ data, isLoading }: AgencyPerformanceChartProps) {
  if (isLoading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-muted-foreground">No performance data available</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Performance Overview (Last 6 Months)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip
              formatter={(value, name) => [
                value,
                typeof name === 'string' ? name.charAt(0).toUpperCase() + name.slice(1) : name,
              ]}
              labelFormatter={label => `Month: ${label}`}
            />
            <Bar dataKey="listings" stackId="a" fill="#3b82f6" name="Listings" />
            <Bar dataKey="leads" stackId="a" fill="#10b981" name="Leads" />
            <Bar dataKey="sales" stackId="a" fill="#f59e0b" name="Sales" />
          </BarChart>
        </ResponsiveContainer>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {data.reduce((sum, item) => sum + item.listings, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Listings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {data.reduce((sum, item) => sum + item.leads, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Leads</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {data.reduce((sum, item) => sum + item.sales, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Sales</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
