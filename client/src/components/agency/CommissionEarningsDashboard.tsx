import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';

interface CommissionEarningsDashboardProps {
  data: {
    totalEarnings: number;
    paidCommissions: number;
    pendingCommissions: number;
    monthlyBreakdown: Array<{
      month: string;
      earnings: number;
    }>;
  };
  isLoading?: boolean;
}

export function CommissionEarningsDashboard({ data, isLoading }: CommissionEarningsDashboardProps) {
  if (isLoading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Commission & Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="animate-pulse h-8 bg-muted rounded"></div>
            <div className="animate-pulse h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Commission & Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">No commission data available</div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Commission & Earnings Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Earnings Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 border rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-muted-foreground">Total Earnings</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.totalEarnings)}
            </div>
          </div>

          <div className="text-center p-4 border rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-muted-foreground">Paid</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(data.paidCommissions)}
            </div>
          </div>

          <div className="text-center p-4 border rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-muted-foreground">Pending</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(data.pendingCommissions)}
            </div>
          </div>
        </div>

        {/* Earnings Trend Chart */}
        <div className="mb-6">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Monthly Earnings Trend
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.monthlyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={value => `R${value}`} />
              <Tooltip
                formatter={(value: any) => [formatCurrency(value), 'Earnings']}
                labelFormatter={label => `Month: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="earnings"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Status Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Payment Status
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Paid</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{
                        width:
                          data.totalEarnings > 0
                            ? `${(data.paidCommissions / data.totalEarnings) * 100}%`
                            : '0%',
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">
                    {data.totalEarnings > 0
                      ? Math.round((data.paidCommissions / data.totalEarnings) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Pending</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-600 h-2 rounded-full"
                      style={{
                        width:
                          data.totalEarnings > 0
                            ? `${(data.pendingCommissions / data.totalEarnings) * 100}%`
                            : '0%',
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">
                    {data.totalEarnings > 0
                      ? Math.round((data.pendingCommissions / data.totalEarnings) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-3">Monthly Performance</h4>
            <div className="space-y-2">
              {data.monthlyBreakdown.slice(-3).map((month, index) => (
                <div key={month.month} className="flex justify-between items-center">
                  <span className="text-sm">{month.month}</span>
                  <Badge variant={month.earnings > 0 ? 'default' : 'secondary'}>
                    {formatCurrency(month.earnings)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
