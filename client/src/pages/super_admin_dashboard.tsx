/* src/pages/admin/super_admin_dashboard.tsx */
import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  CreditCard,
  Home,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Ban,
  Check,
  X,
  FileText,
  Settings,
  Bell,
  LogOut,
  Shield,
  Flag,
  MessageSquare,
  Download,
  RefreshCw,
} from 'lucide-react';

/* -------------------------------------------------------------------------
 * Helper – simple currency formatter (keeps the original behaviour)
 * ----------------------------------------------------------------------- */
const formatCurrency = (value: number) => `R ${value.toLocaleString()}`;

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'agencies'
    | 'subscriptions'
    | 'listings'
    | 'users'
    | 'tickets'
    | 'audit'
    | 'settings'
  >('overview');
  const [selectedDateRange, setSelectedDateRange] = useState('30days');
  const [searchQuery, setSearchQuery] = useState('');

  /* -------------------------------------------------------------------------
   * Mock data – will be swapped with tRPC later
   * ----------------------------------------------------------------------- */
  const stats = {
    totalRevenue: 124_500,
    monthlyRevenue: 45_800,
    activeAgencies: 127,
    pendingApprovals: 8,
    activeListings: 1_847,
    totalUsers: 3_421,
    conversionRate: 12.4,
    churnRate: 3.2,
  };

  const recentAgencies = [
    {
      id: 1,
      name: 'PropCity Estates',
      email: 'info@propcity.co.za',
      status: 'pending',
      tier: 'premium',
      submitted: '2025-11-10',
      documents: 3,
    },
    {
      id: 2,
      name: 'Sandton Properties',
      email: 'contact@sandtonprop.co.za',
      status: 'pending',
      tier: 'basic',
      submitted: '2025-11-09',
      documents: 2,
    },
    {
      id: 3,
      name: 'Cape Realty Group',
      email: 'hello@caperealty.co.za',
      status: 'verified',
      tier: 'enterprise',
      submitted: '2025-11-08',
      documents: 4,
    },
    {
      id: 4,
      name: 'Durban Homes',
      email: 'info@durbanhomes.co.za',
      status: 'pending',
      tier: 'premium',
      submitted: '2025-11-08',
      documents: 3,
    },
    {
      id: 5,
      name: 'JHB Real Estate',
      email: 'sales@jhbre.co.za',
      status: 'verified',
      tier: 'basic',
      submitted: '2025-11-07',
      documents: 2,
    },
  ];

  const pendingListings = [
    {
      id: 1,
      title: '3 Bed House in Waterfall',
      seller: 'PropCity Estates',
      price: 2_950_000,
      submitted: '2 hours ago',
      flags: 0,
      type: 'Agency',
    },
    {
      id: 2,
      title: '2 Bed Apartment Sandton',
      seller: 'John Smith (Owner)',
      price: 1_850_000,
      submitted: '4 hours ago',
      flags: 1,
      type: 'Owner',
    },
    {
      id: 3,
      title: 'Luxury Villa Cape Town',
      seller: 'Cape Realty Group',
      price: 8_500_000,
      submitted: '1 day ago',
      flags: 0,
      type: 'Agency',
    },
    {
      id: 4,
      title: 'Townhouse in Pretoria East',
      seller: 'Development Co.',
      price: 2_200_000,
      submitted: '1 day ago',
      flags: 2,
      type: 'Developer',
    },
  ];

  const subscriptionPlans = [
    {
      tier: 'Basic',
      price: 499,
      listings: 5,
      features: ['5 Active Listings', 'Basic Analytics', 'Email Support'],
      activeUsers: 45,
      revenue: 22_455,
    },
    {
      tier: 'Premium',
      price: 1_299,
      listings: 20,
      features: [
        '20 Active Listings',
        'Advanced Analytics',
        'Priority Support',
        'Featured Listings',
      ],
      activeUsers: 58,
      revenue: 75_342,
    },
    {
      tier: 'Enterprise',
      price: 2_999,
      listings: 100,
      features: [
        'Unlimited Listings',
        'Custom Analytics',
        'Dedicated Support',
        'Premium Placement',
        'API Access',
      ],
      activeUsers: 24,
      revenue: 71_976,
    },
  ];

  const flaggingCriteria = [
    {
      id: 1,
      rule: 'Price 50% below market average',
      severity: 'high',
      autoFlag: true,
    },
    {
      id: 2,
      rule: 'Duplicate images detected',
      severity: 'high',
      autoFlag: true,
    },
    {
      id: 3,
      rule: 'Incomplete property details',
      severity: 'medium',
      autoFlag: false,
    },
    {
      id: 4,
      rule: 'Same seller, 5+ listings in 24hrs',
      severity: 'medium',
      autoFlag: true,
    },
    {
      id: 5,
      rule: 'Contact info in description',
      severity: 'low',
      autoFlag: true,
    },
    {
      id: 6,
      rule: 'Suspicious keywords (scam, urgent)',
      severity: 'high',
      autoFlag: true,
    },
  ];

  const revenueData = [
    { month: 'May', revenue: 38_500 },
    { month: 'Jun', revenue: 42_300 },
    { month: 'Jul', revenue: 39_800 },
    { month: 'Aug', revenue: 45_200 },
    { month: 'Sep', revenue: 43_900 },
    { month: 'Oct', revenue: 47_600 },
    { month: 'Nov', revenue: 45_800 },
  ];

  /* -------------------------------------------------------------------------
   * Render helpers – each section respects the brand colour system
   * ----------------------------------------------------------------------- */
  const renderOverview = () => (
    <div className="space-y-6">
      {/* ---- KPI Cards --------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Monthly Revenue */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-blue-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {formatCurrency(stats.monthlyRevenue)}
          </div>
          <div className="text-sm text-slate-600">Monthly Revenue (MRR)</div>
          <div className="text-xs text-green-600 mt-1">+12.4% from last month</div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <Clock className="h-5 w-5 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.pendingApprovals}</div>
          <div className="text-sm text-slate-600">Pending Approvals</div>
          <div className="text-xs text-orange-500 mt-1">Requires attention</div>
        </div>

        {/* Active Agencies */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.activeAgencies}</div>
          <div className="text-sm text-slate-600">Active Agencies</div>
          <div className="text-xs text-green-600 mt-1">+8 this month</div>
        </div>

        {/* Active Listings */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Home className="h-6 w-6 text-blue-600" />
            </div>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.activeListings}</div>
          <div className="text-sm text-slate-600">Active Listings</div>
          <div className="text-xs text-slate-600 mt-1">Across all agencies</div>
        </div>
      </div>

      {/* ---- Revenue Trend + Subscription Distribution --------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart – gradient bars */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Revenue Trend</h3>
            <select
              value={selectedDateRange}
              onChange={e => setSelectedDateRange(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
            </select>
          </div>

          {/* Bars – gradient from primary blue to accent sky */}
          <div className="h-64 flex items-end space-x-2">
            {revenueData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-gradient-to-t from-blue-600 to-sky-400 rounded-t-lg hover:opacity-90 transition"
                  style={{ height: `${(d.revenue / 50_000) * 100}%` }}
                  title={`R ${d.revenue.toLocaleString()}`}
                />
                <div className="text-xs text-slate-600 mt-2">{d.month}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription distribution – uses primary / sky / indigo bars */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Subscription Distribution</h3>
          <div className="space-y-4">
            {subscriptionPlans.map((plan, i) => {
              const barColor = i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-sky-500' : 'bg-indigo-500';
              const pct = (plan.activeUsers / stats.activeAgencies) * 100;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-900">{plan.tier}</span>
                    <span className="text-sm font-bold text-slate-900">{plan.activeUsers}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {formatCurrency(plan.revenue)} MRR
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-900">Total MRR</span>
            <span className="text-xl font-bold text-green-600">
              {formatCurrency(stats.monthlyRevenue)}
            </span>
          </div>
        </div>
      </div>

      {/* ---- Quick Actions ------------------------------------------------ */}
      <div className="bg-gradient-to-r from-blue-600 to-sky-500 p-6 rounded-xl shadow-sm text-white">
        <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveTab('agencies')}
            className="bg-white/10 hover:bg-white/20 p-4 rounded-lg backdrop-blur transition text-left"
          >
            <Clock className="h-6 w-6 mb-2" />
            <div className="font-semibold">Review Agencies</div>
            <div className="text-sm opacity-90">{stats.pendingApprovals} pending</div>
          </button>

          <button
            onClick={() => setActiveTab('listings')}
            className="bg-white/10 hover:bg-white/20 p-4 rounded-lg backdrop-blur transition text-left"
          >
            <Home className="h-6 w-6 mb-2" />
            <div className="font-semibold">Moderate Listings</div>
            <div className="text-sm opacity-90">{pendingListings.length} to review</div>
          </button>

          <button
            onClick={() => setActiveTab('subscriptions')}
            className="bg-white/10 hover:bg-white/20 p-4 rounded-lg backdrop-blur transition text-left"
          >
            <CreditCard className="h-6 w-6 mb-2" />
            <div className="font-semibold">Manage Plans</div>
            <div className="text-sm opacity-90">{subscriptionPlans.length} active tiers</div>
          </button>

          <button className="bg-white/10 hover:bg-white/20 p-4 rounded-lg backdrop-blur transition text-left">
            <Download className="h-6 w-6 mb-2" />
            <div className="font-semibold">Export Data</div>
            <div className="text-sm opacity-90">Generate reports</div>
          </button>
        </div>
      </div>
    </div>
  );

  /* -------------------------------------------------------------------------
   * Agency Management
   * ----------------------------------------------------------------------- */
  const renderAgencies = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Agency Management</h2>
          <p className="text-slate-600">Review and manage agency registrations</p>
        </div>
        <button className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition">
          <Download className="h-4 w-4 mr-2" />
          Export List
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search agencies..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option>All Status</option>
            <option>Pending</option>
            <option>Verified</option>
            <option>Rejected</option>
            <option>Suspended</option>
          </select>

          <select className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option>All Tiers</option>
            <option>Basic</option>
            <option>Premium</option>
            <option>Enterprise</option>
          </select>

          <button className="flex items-center justify-center px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">
            <Filter className="h-4 w-4 mr-2" />
            More Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                Agency
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                Tier
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                Documents
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                Submitted
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {recentAgencies.map(agency => (
              <tr key={agency.id} className="hover:bg-slate-50 transition">
                {/* Agency column */}
                <td className="px-6 py-4">
                  <div>
                    <div className="font-semibold text-slate-900">{agency.name}</div>
                    <div className="text-sm text-slate-600">{agency.email}</div>
                  </div>
                </td>

                {/* Status column – brand colours */}
                <td className="px-6 py-4">
                  {agency.status === 'pending' ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-500">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </span>
                  ) : agency.status === 'verified' ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                      <XCircle className="h-3 w-3 mr-1" />
                      Rejected
                    </span>
                  )}
                </td>

                {/* Tier column */}
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                      agency.tier === 'basic'
                        ? 'bg-blue-100 text-blue-600'
                        : agency.tier === 'premium'
                          ? 'bg-sky-100 text-sky-600'
                          : 'bg-indigo-100 text-indigo-600'
                    }`}
                  >
                    <Package className="h-3 w-3 mr-1" />
                    {agency.tier}
                  </span>
                </td>

                {/* Document count */}
                <td className="px-6 py-4">
                  <button className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center">
                    <FileText className="h-4 w-4 mr-1" />
                    {agency.documents} files
                  </button>
                </td>

                {/* Submitted date */}
                <td className="px-6 py-4 text-sm text-slate-600">
                  {new Date(agency.submitted).toLocaleDateString()}
                </td>

                {/* Action buttons */}
                <td className="px-6 py-4">
                  {agency.status === 'pending' ? (
                    <div className="flex items-center space-x-2">
                      <button
                        className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition"
                        title="Approve"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition"
                        title="Reject"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <button
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                        title="Suspend"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                      <button className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Verification Checklist – keep the same styling */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center">
          <Shield className="h-5 w-5 mr-2 text-blue-600" />
          Agency Verification Checklist
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: 'FFC Certificate', desc: 'Valid Fidelity Fund Certificate from PPRA' },
            { title: 'Company Registration', desc: 'CIPC registration documents' },
            { title: 'Tax Clearance', desc: 'Valid SARS tax clearance certificate' },
            { title: 'ID Verification', desc: 'Principal agent ID document' },
          ].map((item, i) => (
            <div key={i} className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-slate-900 text-sm">{item.title}</div>
                <div className="text-xs text-slate-600">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /* -------------------------------------------------------------------------
   * Subscriptions
   * ----------------------------------------------------------------------- */
  const renderSubscriptions = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Subscription Management</h2>
          <p className="text-slate-600">Manage pricing tiers and active subscriptions</p>
        </div>
        <button className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition">
          <Package className="h-4 w-4 mr-2" />
          Create New Tier
        </button>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {subscriptionPlans.map((plan, i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow-sm border-2 border-slate-200 hover:border-blue-400 transition overflow-hidden"
          >
            <div
              className={`p-6 ${i === 0 ? 'bg-blue-50' : i === 1 ? 'bg-sky-50' : 'bg-indigo-50'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-slate-900">{plan.tier}</h3>
                <Package
                  className={`h-6 w-6 ${
                    i === 0 ? 'text-blue-600' : i === 1 ? 'text-sky-600' : 'text-indigo-600'
                  }`}
                />
              </div>
              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-slate-900">R {plan.price}</span>
                <span className="text-slate-600 ml-2">/month</span>
              </div>
              <div className="text-sm text-slate-600 mt-1">{plan.listings} active listings</div>
            </div>

            <div className="p-6">
              <div className="space-y-3 mb-6">
                {plan.features.map((f, idx) => (
                  <div key={idx} className="flex items-start">
                    <Check className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
                    <span className="text-sm text-slate-700">{f}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Active Users</span>
                  <span className="font-semibold text-slate-900">{plan.activeUsers}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Monthly Revenue</span>
                  <span className="font-semibold text-green-600">
                    R {plan.revenue.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex space-x-2">
                <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 py-2 rounded-lg font-medium transition text-sm">
                  <Edit className="h-4 w-4 inline mr-1" />
                  Edit
                </button>
                <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 py-2 rounded-lg font-medium transition text-sm">
                  View Users
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Active Subscriptions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">Active Subscriptions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Agency
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Listings Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Next Billing
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[
                {
                  agency: 'PropCity Estates',
                  plan: 'Premium',
                  used: 18,
                  limit: 20,
                  nextBilling: '2025-12-01',
                  status: 'active',
                },
                {
                  agency: 'Cape Realty Group',
                  plan: 'Enterprise',
                  used: 87,
                  limit: 100,
                  nextBilling: '2025-11-25',
                  status: 'active',
                },
                {
                  agency: 'Sandton Properties',
                  plan: 'Basic',
                  used: 5,
                  limit: 5,
                  nextBilling: '2025-11-20',
                  status: 'limit_reached',
                },
                {
                  agency: 'Durban Homes',
                  plan: 'Premium',
                  used: 12,
                  limit: 20,
                  nextBilling: '2025-11-28',
                  status: 'active',
                },
                {
                  agency: 'JHB Real Estate',
                  plan: 'Basic',
                  used: 3,
                  limit: 5,
                  nextBilling: '2025-11-15',
                  status: 'payment_failed',
                },
              ].map((sub, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{sub.agency}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        sub.plan === 'Basic'
                          ? 'bg-blue-100 text-blue-600'
                          : sub.plan === 'Premium'
                            ? 'bg-sky-100 text-sky-600'
                            : 'bg-indigo-100 text-indigo-600'
                      }`}
                    >
                      {sub.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-32 bg-slate-200 rounded-full h-2 mr-3">
                        <div
                          className={`h-2 rounded-full ${
                            sub.used / sub.limit >= 0.9
                              ? 'bg-red-500'
                              : sub.used / sub.limit >= 0.7
                                ? 'bg-orange-500'
                                : 'bg-green-500'
                          }`}
                          style={{ width: `${(sub.used / sub.limit) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-600">
                        {sub.used}/{sub.limit}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(sub.nextBilling).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    {sub.status === 'active' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-600">
                        <Activity className="h-3 w-3 mr-1" />
                        Active
                      </span>
                    ) : sub.status === 'limit_reached' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-600">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Limit Reached
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                        <XCircle className="h-3 w-3 mr-1" />
                        Payment Failed
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                        title="Edit Subscription"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  /* -------------------------------------------------------------------------
   * Listings moderation
   * ----------------------------------------------------------------------- */
  const renderListings = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Property Listing Moderation</h2>
          <p className="text-slate-600">Review and approve property listings</p>
        </div>
        <div className="flex space-x-2">
          <button className="flex items-center bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-2 rounded-lg font-medium transition">
            <Flag className="h-4 w-4 mr-2" />
            Flagging Rules
          </button>
          <button className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Pending Review */}
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-orange-900">{pendingListings.length}</div>
              <div className="text-sm text-orange-700">Pending Review</div>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        {/* Auto‑Flagged */}
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-red-900">3</div>
              <div className="text-sm text-red-700">Auto‑Flagged</div>
            </div>
            <Flag className="h-8 w-8 text-red-500" />
          </div>
        </div>

        {/* Active Listings */}
        <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-900">1,847</div>
              <div className="text-sm text-green-700">Active Listings</div>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        {/* Rejected (7 days) */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-slate-900">156</div>
              <div className="text-sm text-slate-700">Rejected (7 days)</div>
            </div>
            <XCircle className="h-8 w-8 text-slate-500" />
          </div>
        </div>
      </div>

      {/* Pending Listings */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">Pending Approval</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {pendingListings.map(listing => (
            <div key={listing.id} className="p-6 hover:bg-slate-50 transition">
              <div className="flex items-start justify-between">
                {/* Left – image + info */}
                <div className="flex space-x-4 flex-1">
                  <div className="w-32 h-24 bg-slate-200 rounded-lg flex-shrink-0">
                    <img
                      src="/api/placeholder/128/96"
                      alt="Property"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      {/* Title & meta */}
                      <div>
                        <h4 className="font-bold text-slate-900 text-lg mb-1">{listing.title}</h4>
                        <div className="flex items-center space-x-3 text-sm text-slate-600">
                          <span className="flex items-center">
                            <Building2 className="h-4 w-4 mr-1 text-blue-600" />
                            {listing.seller}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1 text-orange-500" />
                            {listing.submitted}
                          </span>
                          {listing.flags > 0 && (
                            <span className="flex items-center text-red-600 font-semibold">
                              <Flag className="h-4 w-4 mr-1" />
                              {listing.flags} flag{listing.flags > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price & source badge */}
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          R {(listing.price / 1_000_000).toFixed(2)}M
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mt-1 ${
                            listing.type === 'Agency'
                              ? 'bg-blue-100 text-blue-600'
                              : listing.type === 'Owner'
                                ? 'bg-green-100 text-green-600'
                                : 'bg-purple-100 text-purple-600'
                          }`}
                        >
                          {listing.type}
                        </span>
                      </div>
                    </div>

                    {/* Auto‑flag details */}
                    {listing.flags > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                        <div className="flex items-start">
                          <AlertTriangle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold text-red-900 text-sm mb-1">
                              Auto‑Flagged Issues:
                            </div>
                            <ul className="text-xs text-red-700 space-y-1">
                              {listing.flags >= 1 && (
                                <li>• Price 45% below market average for area</li>
                              )}
                              {listing.flags >= 2 && (
                                <li>• Incomplete property details (missing sqm, parking)</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex space-x-2">
                      <button className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition text-sm">
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </button>
                      <button className="flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition text-sm">
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </button>
                      <button className="flex items-center bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-2 rounded-lg font-medium transition text-sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View Full Details
                      </button>
                      <button className="flex items-center bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-2 rounded-lg font-medium transition text-sm">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Request Changes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Flagging Rules */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Auto‑Flagging Rules</h3>
            <p className="text-sm text-slate-600">Configure automatic listing flagging criteria</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm">
            Add New Rule
          </button>
        </div>

        <div className="divide-y divide-slate-200">
          {flaggingCriteria.map(rule => (
            <div
              key={rule.id}
              className="p-6 hover:bg-slate-50 transition flex items-center justify-between"
            >
              <div className="flex items-center space-x-4 flex-1">
                <Flag
                  className={`h-5 w-5 ${
                    rule.severity === 'high'
                      ? 'text-red-500'
                      : rule.severity === 'medium'
                        ? 'text-orange-500'
                        : 'text-yellow-500'
                  }`}
                />
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">{rule.rule}</div>
                  <div className="flex items-center space-x-3 text-sm text-slate-600 mt-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        rule.severity === 'high'
                          ? 'bg-red-100 text-red-700'
                          : rule.severity === 'medium'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {rule.severity.toUpperCase()}
                    </span>
                    <span
                      className={`inline-flex items-center ${
                        rule.autoFlag ? 'text-green-600' : 'text-slate-600'
                      }`}
                    >
                      {rule.autoFlag ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Auto‑flag enabled
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Manual review
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Toggle + edit / delete */}
              <div className="flex items-center space-x-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.autoFlag}
                    className="sr-only peer"
                    readOnly
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
                <button
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                  title="Edit rule"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                  title="Delete rule"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /* -------------------------------------------------------------------------
   * Settings (static for now – uses same UI primitives)
   * ----------------------------------------------------------------------- */
  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Platform Settings</h2>
        <p className="text-slate-600">Configure platform settings and integrations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Gateway */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
            Payment Gateway
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Provider</label>
              <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option>Select payment gateway...</option>
                <option>PayFast (Recommended for SA)</option>
                <option>Peach Payments</option>
                <option>PayGate</option>
                <option>Stripe</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Merchant ID</label>
              <input
                type="text"
                placeholder="Enter merchant ID"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">API Key</label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition">
              Test Connection
            </button>
          </div>
        </div>

        {/* Email Configuration */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center">
            <Mail className="h-5 w-5 mr-2 text-blue-600" />
            Email Configuration
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email Service</label>
              <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option>SendGrid</option>
                <option>Mailgun</option>
                <option>AWS SES</option>
                <option>SMTP</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">From Email</label>
              <input
                type="email"
                placeholder="noreply@homefind.za"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">API Key</label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition">
              Send Test Email
            </button>
          </div>
        </div>

        {/* POPIA Compliance */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-blue-600" />
            POPIA Compliance
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <div className="font-semibold text-slate-900 text-sm">Data Retention Period</div>
                <div className="text-xs text-slate-600">Inactive user data</div>
              </div>
              <select className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm">
                <option>12 months</option>
                <option>24 months</option>
                <option>36 months</option>
              </select>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <div className="font-semibold text-slate-900 text-sm">Cookie Consent</div>
                <div className="text-xs text-slate-600">Show consent banner</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked className="sr-only peer" readOnly />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <div className="font-semibold text-slate-900 text-sm">Data Export Requests</div>
                <div className="text-xs text-slate-600">Allow user data downloads</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked className="sr-only peer" readOnly />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center">
            <Settings className="h-5 w-5 mr-2 text-blue-600" />
            Feature Toggles
          </h3>
          <div className="space-y-4">
            {[
              { name: 'Owner Listings', desc: 'Allow "For Sale by Owner"' },
              { name: 'Developer Accounts', desc: 'Allow property developers' },
              { name: 'Virtual Tours', desc: '360° property tours' },
            ].map((feat, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{feat.name}</div>
                  <div className="text-xs text-slate-600">{feat.desc}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  /* -------------------------------------------------------------------------
   * Main render – switch on activeTab
   * ----------------------------------------------------------------------- */
  const renderCurrentTab = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'agencies':
        return renderAgencies();
      case 'subscriptions':
        return renderSubscriptions();
      case 'listings':
        return renderListings();
      case 'users':
        return renderUserManagement?.() ?? null; // placeholder if you add later
      case 'tickets':
        return renderSupportTickets?.() ?? null;
      case 'audit':
        return renderAuditLog?.() ?? null;
      case 'settings':
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  /* -------------------------------------------------------------------------
   * Return – full page layout (still using existing global Navbar)
   * ----------------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top navigation – keeps existing Navbar styling */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-xl font-bold text-slate-900">Super Admin</div>
                <div className="text-xs text-slate-600">HomeFind.za Portal</div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button className="relative p-2 hover:bg-slate-100 rounded-lg transition">
              <Bell className="h-5 w-5 text-slate-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center space-x-3 pl-4 border-l border-slate-200">
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-900">Admin User</div>
                <div className="text-xs text-slate-600">Super Admin</div>
              </div>
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                A
              </div>
              <button className="p-2 hover:bg-slate-100 rounded-lg transition">
                <LogOut className="h-5 w-5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content – left sidebar lives inside DashboardLayout (you can keep the original component
          and just pass the admin‑specific menu as children) */}
      <div className="flex">
        {/* Sidebar – reuse the existing DashboardLayout component; it already has a collapsible sidebar.
            Here we just render the active tab's content. */}
        <aside className="w-64 bg-white border-r border-slate-200 min-h-screen sticky top-[73px]">
          <nav className="p-4 space-y-1">
            {[
              { key: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-5 w-5" /> },
              { key: 'agencies', label: 'Agencies', icon: <Building2 className="h-5 w-5" /> },
              {
                key: 'subscriptions',
                label: 'Subscriptions',
                icon: <CreditCard className="h-5 w-5" />,
              },
              { key: 'listings', label: 'Listings', icon: <Home className="h-5 w-5" /> },
              { key: 'users', label: 'Users', icon: <Users className="h-5 w-5" /> },
              {
                key: 'tickets',
                label: 'Support Tickets',
                icon: <MessageSquare className="h-5 w-5" />,
              },
              { key: 'audit', label: 'Audit Log', icon: <Activity className="h-5 w-5" /> },
              { key: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key as any)}
                className={`flex items-center w-full px-3 py-2 rounded-lg transition ${
                  activeTab === item.key
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                <span className="ml-3">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-auto p-6">{renderCurrentTab()}</main>
      </div>
    </div>
  );
}
