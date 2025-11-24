import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface PerformanceChartProps {
  data?: {
    month: string;
    leads: number;
    sales: number;
  }[];
}

export function PerformanceChart({ data = [] }: PerformanceChartProps) {
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Your Monthly Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <p>No performance data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="month"
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="leads"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ strokeWidth: 2, r: 4, fill: 'hsl(var(--background))' }}
                activeDot={{
                  r: 6,
                  stroke: '#3B82F6',
                  strokeWidth: 2,
                  fill: 'hsl(var(--background))',
                }}
                name="Leads Generated"
              />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#16A34A"
                strokeWidth={2}
                dot={{ strokeWidth: 2, r: 4, fill: 'hsl(var(--background))' }}
                activeDot={{
                  r: 6,
                  stroke: '#16A34A',
                  strokeWidth: 2,
                  fill: 'hsl(var(--background))',
                }}
                name="Sales Closed"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
