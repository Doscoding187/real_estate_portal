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
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  FileText,
  Target,
  Users,
  Activity,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
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

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];

const RevenueCenterPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('90'); // days
  const [commissionPage, setCommissionPage] = useState(1);
  const [commissionStatus, setCommissionStatus] = useState<string>('all');
  const [forecastPeriod, setForecastPeriod] = useState<'30_days' | '90_days' | 'quarter' | 'year'>(
    '30_days',
  );

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

  // Queries
  const { data: revenueData, isLoading: revenueLoading } =
    trpc.admin.getRevenueAnalytics.useQuery(getDateRange());

  const { data: periodData, isLoading: periodLoading } = trpc.admin.getRevenueByPeriod.useQuery({
    period: 'monthly',
    months: 6,
  });

  const { data: commissionData, isLoading: commissionsLoading } =
    trpc.admin.getCommissionBreakdown.useQuery({
      page: commissionPage,
      limit: 10,
      status: commissionStatus === 'all' ? undefined : (commissionStatus as any),
    });

  const { data: categoryData, isLoading: categoryLoading } =
    trpc.admin.getRevenueByCategory.useQuery(getDateRange(), {
      enabled: activeTab === 'analytics',
    });

  const { data: ltvData, isLoading: ltvLoading } = trpc.admin.getLTVAnalytics.useQuery(undefined, {
    enabled: activeTab === 'analytics',
  });

  const { data: forecastData, isLoading: forecastLoading } = trpc.admin.getRevenueForecast.useQuery(
    { period: forecastPeriod },
    { enabled: activeTab === 'forecasts' },
  );

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

  // Prepare Pie Chart Data
  const pieChartData = categoryData
    ? [
        ...categoryData.subscriptions.map(s => ({ name: `Sub: ${s.category}`, value: s.revenue })),
        { name: 'Advertising', value: categoryData.advertising.revenue },
      ].filter(item => item.value > 0)
    : [];

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Revenue Center</h1>
            <p className="text-slate-500">Track revenue, commissions, and financial performance</p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px] bg-white/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="60">Last 60 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="180">Last 6 Months</SelectItem>
              <SelectItem value="365">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs
          defaultValue="overview"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="bg-white/50 backdrop-blur-sm border border-white/40 p-1 rounded-xl mb-6">
            <TabsTrigger
              value="overview"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Activity className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <BarChartIcon className="w-4 h-4 mr-2" />
              Analytics & LTV
            </TabsTrigger>
            <TabsTrigger
              value="forecasts"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Target className="w-4 h-4 mr-2" />
              Forecasts
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <FileText className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                value={
                  revenueLoading ? '...' : formatCurrency(revenueData?.subscriptionRevenue || 0)
                }
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
            <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] py-6">
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
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="commissionRevenue"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: '#10b981', r: 3 }}
                        name="Commissions"
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="subscriptionRevenue"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={{ fill: '#8b5cf6', r: 3 }}
                        name="Subscriptions"
                        isAnimationActive={false}
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
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* LTV Metrics */}
              <GlassCard className="col-span-1 md:col-span-3 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Customer Lifetime Value (LTV)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                    <p className="text-sm text-blue-600 font-medium">ARPU (Monthly)</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {ltvLoading ? '...' : formatCurrency(ltvData?.arpu || 0)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Avg. Revenue Per User</p>
                  </div>
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-100">
                    <p className="text-sm text-rose-600 font-medium">Churn Rate</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {ltvLoading ? '...' : `${(ltvData?.churnRate || 0).toFixed(1)}%`}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Monthly cancellations</p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                    <p className="text-sm text-emerald-600 font-medium">Estimated LTV</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {ltvLoading ? '...' : formatCurrency(ltvData?.ltv || 0)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Lifetime Value</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-sm text-slate-600 font-medium">Active Subscribers</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {ltvLoading ? '...' : ltvData?.activeSubscribers || 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Total paying agencies</p>
                  </div>
                </div>
              </GlassCard>

              {/* Revenue Distribution */}
              <GlassCard className="col-span-1 md:col-span-2 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Revenue Distribution</h3>
                <div className="h-[300px] w-full">
                  {categoryLoading ? (
                    <div className="h-full flex items-center justify-center text-slate-500">
                      Loading...
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          isAnimationActive={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </GlassCard>

              {/* Top Performing Plans */}
              <GlassCard className="col-span-1 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Revenue Sources</h3>
                <div className="space-y-4">
                  {categoryData?.subscriptions.map((sub: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-sm font-medium text-slate-700 capitalize">
                          {sub.category} Subs
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">
                        {formatCurrency(sub.revenue)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-slate-400" />
                      <span className="text-sm font-medium text-slate-700">Advertising</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      {formatCurrency(categoryData?.advertising.revenue || 0)}
                    </span>
                  </div>
                </div>
              </GlassCard>
            </div>
          </TabsContent>

          {/* FORECASTS TAB */}
          <TabsContent value="forecasts" className="space-y-6">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Revenue Forecast (AI Powered)
                  </h3>
                  <p className="text-sm text-slate-500">
                    Projected revenue based on historical trends and recurring subscriptions.
                  </p>
                </div>
                <Select value={forecastPeriod} onValueChange={(v: any) => setForecastPeriod(v)}>
                  <SelectTrigger className="w-[150px] bg-white/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30_days">Next 30 Days</SelectItem>
                    <SelectItem value="90_days">Next 90 Days</SelectItem>
                    <SelectItem value="quarter">Next Quarter</SelectItem>
                    <SelectItem value="year">Next Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                <div className="col-span-1 space-y-6">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200">
                    <p className="text-indigo-100 font-medium mb-1">Projected Revenue</p>
                    <h2 className="text-4xl font-bold mb-2">
                      {forecastLoading ? '...' : formatCurrency(forecastData?.predictedAmount || 0)}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-indigo-100 bg-white/10 w-fit px-2 py-1 rounded-lg">
                      <Target className="w-4 h-4" />
                      <span>
                        {((forecastData?.confidenceScore || 0) * 100).toFixed(0)}% Confidence
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-white/50 rounded-lg border border-slate-100">
                      <span className="text-sm text-slate-600">Methodology</span>
                      <Badge variant="outline" className="capitalize">
                        {forecastData?.methodology?.replace('_', ' ') || 'Linear'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white/50 rounded-lg border border-slate-100">
                      <span className="text-sm text-slate-600">Last Updated</span>
                      <span className="text-sm font-medium text-slate-900">
                        {forecastData?.createdAt
                          ? new Date(forecastData.createdAt).toLocaleDateString()
                          : 'Just now'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 h-[300px]">
                  {/* Placeholder for forecast chart visualization */}
                  <div className="h-full w-full bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400">
                    <BarChartIcon className="w-12 h-12 mb-2 opacity-20" />
                    <p>Forecast visualization requires more historical data points.</p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </TabsContent>

          {/* REPORTS TAB */}
          <TabsContent value="reports" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <GlassCard className="p-6 hover:shadow-lg transition-all cursor-pointer group">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Monthly Revenue Report</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Detailed breakdown of all revenue sources, commissions, and subscriptions for the
                  current month.
                </p>
                <Button variant="outline" className="w-full">
                  Download PDF
                </Button>
              </GlassCard>

              <GlassCard className="p-6 hover:shadow-lg transition-all cursor-pointer group">
                <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Subscriber Churn Analysis</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Report on cancelled subscriptions, churn reasons, and retention metrics.
                </p>
                <Button variant="outline" className="w-full">
                  Download CSV
                </Button>
              </GlassCard>

              <GlassCard className="p-6 hover:shadow-lg transition-all cursor-pointer group">
                <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Agent Performance Report</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Commission earnings, transaction volume, and top performing agents.
                </p>
                <Button variant="outline" className="w-full">
                  Download CSV
                </Button>
              </GlassCard>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RevenueCenterPage;
