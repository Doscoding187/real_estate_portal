import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Download,
} from 'lucide-react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';

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

const RevenueCenterPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [dateRange, setDateRange] = useState('90'); // days
  const [commissionPage, setCommissionPage] = useState(1);
  const [commissionStatus, setCommissionStatus] = useState<string>('all');

  // Calculate date range
  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange));
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  };

  // Fetch revenue analytics
  const { data: revenueData, isLoading: revenueLoading } = trpc.admin.getRevenueAnalytics.useQuery(
    getDateRange(),
  );

  // Fetch revenue by period for charts
  const { data: periodData, isLoading: periodLoading } = trpc.admin.getRevenueByPeriod.useQuery({
    period: 'monthly',
    months: 6,
  });

  // Fetch commission breakdown
  const { data: commissionData, isLoading: commissionsLoading } =
    trpc.admin.getCommissionBreakdown.useQuery({
      page: commissionPage,
      limit: 10,
      status: commissionStatus === 'all' ? undefined : (commissionStatus as any),
    });

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format number
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-ZA').format(num);
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700">Paid</Badge>;
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-700">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/admin/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-slate-800">Revenue Center</h1>
            <p className="text-slate-500">Track and analyze platform revenue streams</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px] bg-white/50">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="bg-white/50">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          icon={<DollarSign className="h-6 w-6 text-blue-600" />}
          value={revenueLoading ? '...' : formatCurrency(revenueData?.totalRevenue || 0)}
          label="Total Revenue"
          change={`Last ${dateRange} days`}
          color="bg-blue-100"
          trend="up"
        />
        <StatCard
          icon={<CheckCircle className="h-6 w-6 text-green-600" />}
          value={revenueLoading ? '...' : formatCurrency(revenueData?.commissionRevenue || 0)}
          label="Commission Revenue"
          change={`${revenueData?.totalCommissions || 0} commissions`}
          color="bg-green-100"
          trend="up"
        />
        <StatCard
          icon={<CreditCard className="h-6 w-6 text-purple-600" />}
          value={revenueLoading ? '...' : formatCurrency(revenueData?.subscriptionRevenue || 0)}
          label="Subscription Revenue"
          change={`${revenueData?.activeSubscriptions || 0} active subscriptions`}
          color="bg-purple-100"
          trend="up"
        />
        <StatCard
          icon={<Clock className="h-6 w-6 text-amber-600" />}
          value={revenueLoading ? '...' : formatCurrency(revenueData?.pendingRevenue || 0)}
          label="Pending Revenue"
          change={`${revenueData?.totalInvoices || 0} invoices`}
          color="bg-amber-100"
        />
      </div>

      {/* Revenue Chart */}
      <GlassCard className="mb-6 border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] py-6">
        <CardHeader>
          <CardTitle className="text-slate-800">Revenue Trends</CardTitle>
        </CardHeader>
        <CardContent>
          {periodLoading ? (
            <div className="h-[300px] flex items-center justify-center text-slate-500">
              Loading chart data...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={periodData || []}>
                <defs>
                  <linearGradient id="totalRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis dataKey="period" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="totalRevenue"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                  fill="url(#totalRevenue)"
                  name="Total Revenue"
                />
                <Line
                  type="monotone"
                  dataKey="commissionRevenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 3 }}
                  name="Commissions"
                />
                <Line
                  type="monotone"
                  dataKey="subscriptionRevenue"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', r: 3 }}
                  name="Subscriptions"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </GlassCard>

      {/* Commission Breakdown */}
      <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] py-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-slate-800">Commission Breakdown</CardTitle>
          <Select value={commissionStatus} onValueChange={setCommissionStatus}>
            <SelectTrigger className="w-[150px] bg-white/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {commissionsLoading ? (
            <div className="py-12 text-center text-slate-500">Loading commissions...</div>
          ) : !commissionData?.commissions?.length ? (
            <div className="py-12 text-center text-slate-500">No commissions found.</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-200">
                    <TableHead className="text-slate-500">Agent</TableHead>
                    <TableHead className="text-slate-500">Property</TableHead>
                    <TableHead className="text-slate-500">Type</TableHead>
                    <TableHead className="text-slate-500">Amount</TableHead>
                    <TableHead className="text-slate-500">Status</TableHead>
                    <TableHead className="text-slate-500">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissionData.commissions.map((commission: any) => (
                    <TableRow
                      key={commission.id}
                      className="hover:bg-white/40 border-slate-100 transition-colors"
                    >
                      <TableCell className="font-medium text-slate-700">
                        {commission.agent?.displayName ||
                          `${commission.agent?.firstName} ${commission.agent?.lastName}` ||
                          'N/A'}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {commission.property?.title || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {commission.transactionType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-800">
                        {formatCurrency(commission.amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(commission.status)}</TableCell>
                      <TableCell className="text-slate-600">
                        {new Date(commission.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {commissionData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-slate-500">
                    Showing {(commissionPage - 1) * 10 + 1} to{' '}
                    {Math.min(commissionPage * 10, commissionData.pagination.total)} of{' '}
                    {commissionData.pagination.total} commissions
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCommissionPage(p => Math.max(1, p - 1))}
                      disabled={commissionPage === 1}
                      className="bg-white/50"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCommissionPage(p =>
                          Math.min(commissionData.pagination.totalPages, p + 1),
                        )
                      }
                      disabled={commissionPage === commissionData.pagination.totalPages}
                      className="bg-white/50"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </GlassCard>
    </div>
  );
};

export default RevenueCenterPage;
