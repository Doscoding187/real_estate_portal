import React, { useState, useEffect } from 'react';
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
import { ChevronDown } from 'lucide-react';
import { revenueTrend } from '@/data/mockData';

interface RevenueDataPoint {
  month: string;
  revenue: number;
  formattedRevenue: string;
  percentageChange: number;
}

interface RevenueChartProps {
  className?: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: RevenueDataPoint;
  }>;
  label?: string;
}

const RevenueChart: React.FC<RevenueChartProps> = ({ className = '' }) => {
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('7');
  const [chartData, setChartData] = useState<RevenueDataPoint[]>([]);

  // Convert mock data to chart format
  useEffect(() => {
    const formattedData = revenueTrend.map(item => {
      // Convert "R 45,800" to 45800
      const revenueValue = parseFloat(
        item.revenue.replace('R ', '').replace(',', '')
      );
      return {
        month: `${item.month} ${item.year.toString().slice(2)}`,
        revenue: revenueValue,
        formattedRevenue: item.revenue,
        percentageChange: item.percentageChange,
      };
    });

    // For now, we'll use all data regardless of date range
    // In a real app, we would filter based on date range
    setChartData(formattedData);
  }, []);

  const formatCurrency = (value: number) => {
    return `R ${value.toLocaleString('en-ZA')}`;
  };

  const CustomTooltip: React.FC<TooltipProps> = ({
    active,
    payload,
    label,
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-medium text-slate-900">{label}</p>
          <p className="text-sm text-slate-600">
            Revenue:{' '}
            <span className="font-medium">
              {payload[0].payload.formattedRevenue}
            </span>
          </p>
          <p className="text-sm text-slate-600">
            Change:{' '}
            <span className="font-medium">
              {payload[0].payload.percentageChange > 0 ? '+' : ''}
              {payload[0].payload.percentageChange}%
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`card p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-900">Revenue Trend</h2>
        <div className="relative">
          <select
            className="text-sm border border-slate-300 rounded-lg px-3 py-1 appearance-none bg-white pr-8"
            value={dateRange}
            onChange={e => setDateRange(e.target.value as '7' | '30' | '90')}
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ stroke: '#3b82f6', strokeWidth: 2, r: 4, fill: '#fff' }}
              activeDot={{
                r: 6,
                stroke: '#3b82f6',
                strokeWidth: 2,
                fill: '#fff',
              }}
              name="Revenue"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueChart;
