import React, { useState } from 'react';
import {
  Download,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  RefreshCw,
  Check,
} from 'lucide-react';
import Button from '../components/common/Button';
import Table from '../components/common/Table';

const RevenueCenterPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('this-month');

  // Revenue stream data
  const revenueStreams = [
    {
      title: 'Subscription Revenue',
      value: 'R 85,200',
      change: '+12.5%',
      trend: 'up' as const,
      description: 'Total MRR from all tiers',
      details: 'Agents: R 32,000 | Agencies: R 45,000 | Developers: R 8,200',
      churn: '2.3%',
    },
    {
      title: 'Advertising Revenue',
      value: 'R 12,400',
      change: '+8.2%',
      trend: 'up' as const,
      description: 'Banner ads, sponsored content',
      details: 'Impressions: 2.4M | CTR: 3.2%',
      topAdvertisers: ['Property24', 'Private Property', 'Re/Max'],
    },
    {
      title: 'Commission Revenue',
      value: 'R 18,600',
      change: '+5.7%',
      trend: 'up' as const,
      description: 'Partner commissions',
      details: 'Avg. commission: R 1,200 per deal',
      partners: ['FNB Property', 'Pam Golding', 'Century 21'],
    },
    {
      title: 'Featured Listings Revenue',
      value: 'R 8,900',
      change: '+22.3%',
      trend: 'up' as const,
      description: 'Paid boosts, premium placements',
      details: 'Active listings: 142 | Avg. revenue: R 62 per listing',
      growth: '+15%',
    },
  ];

  // Revenue streams table data
  const tableData = [
    {
      id: 1,
      streamType: 'Subscription',
      source: 'PropCity Estates',
      amount: 'R 4,200',
      status: 'Active',
      date: '2025-11-01',
    },
    {
      id: 2,
      streamType: 'Advertising',
      source: 'Property24',
      amount: 'R 1,800',
      status: 'Completed',
      date: '2025-11-05',
    },
    {
      id: 3,
      streamType: 'Commission',
      source: 'FNB Property',
      amount: 'R 2,400',
      status: 'Active',
      date: '2025-11-08',
    },
    {
      id: 4,
      streamType: 'Featured',
      source: 'Listing #24589',
      amount: 'R 650',
      status: 'Pending',
      date: '2025-11-10',
    },
    {
      id: 5,
      streamType: 'Subscription',
      source: 'Cape Town Properties',
      amount: 'R 3,800',
      status: 'Active',
      date: '2025-11-02',
    },
  ];

  const tableColumns = [
    { key: 'streamType', title: 'Stream Type', sortable: true },
    { key: 'source', title: 'Source', sortable: true },
    { key: 'amount', title: 'Amount', sortable: true },
    { key: 'status', title: 'Status', sortable: true },
    { key: 'date', title: 'Date', sortable: true },
  ];

  // Payment gateway data
  const paymentGateways = [
    {
      name: 'PayFast',
      connected: true,
      successRate: '98.2%',
      failedPayments: 12,
      refunds: 3,
    },
    {
      name: 'Stripe',
      connected: true,
      successRate: '96.8%',
      failedPayments: 8,
      refunds: 5,
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Revenue Center
            </h1>
            <p className="text-slate-600">
              Single source of truth for ALL revenue streams
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <select
                className="text-sm border border-slate-300 rounded-lg px-3 py-2 appearance-none bg-white pr-8"
                value={dateRange}
                onChange={e => setDateRange(e.target.value)}
              >
                <option value="today">Today</option>
                <option value="this-week">This Week</option>
                <option value="this-month">This Month</option>
                <option value="last-month">Last Month</option>
                <option value="this-quarter">This Quarter</option>
                <option value="this-year">This Year</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
            <Button variant="primary" size="md">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {/* Revenue Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {revenueStreams.map((stream, index) => (
          <div
            key={index}
            className="card p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-slate-600 text-sm font-medium">
                  {stream.title}
                </h3>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stream.value}
                </p>
                <div className="flex items-center mt-1">
                  {stream.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span
                    className={`text-sm font-medium ${stream.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {stream.change}
                  </span>
                </div>
              </div>
              <div className="bg-blue-100 p-2 rounded-full">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">{stream.description}</p>
            <p className="text-xs text-slate-600 mt-1">{stream.details}</p>
          </div>
        ))}
      </div>

      {/* Revenue Streams Table */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">Revenue Streams</h2>
          <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
            <select className="text-sm border border-slate-300 rounded-lg px-3 py-1">
              <option>All Stream Types</option>
              <option>Subscription</option>
              <option>Advertising</option>
              <option>Commission</option>
              <option>Featured</option>
            </select>
            <select className="text-sm border border-slate-300 rounded-lg px-3 py-1">
              <option>All Statuses</option>
              <option>Active</option>
              <option>Pending</option>
              <option>Completed</option>
            </select>
          </div>
        </div>
        <Table data={tableData} columns={tableColumns} loading={false} />
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" size="sm">
            View All Revenue Streams
          </Button>
        </div>
      </div>

      {/* Payment Gateway Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">
            Payment Gateways
          </h2>
          <div className="space-y-4">
            {paymentGateways.map((gateway, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
              >
                <div className="flex items-center">
                  <div className="bg-green-100 p-2 rounded-lg mr-4">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">
                      {gateway.name}
                    </h3>
                    <p className="text-sm text-slate-500">Connected</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">
                    Success Rate:{' '}
                    <span className="font-medium">{gateway.successRate}</span>
                  </p>
                  <p className="text-sm text-slate-600">
                    Failed:{' '}
                    <span className="font-medium">
                      {gateway.failedPayments}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-200">
            <Button variant="secondary" size="md">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Failed Payments
            </Button>
          </div>
        </div>

        {/* Financial Reports */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">
            Financial Reports
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
              <div>
                <h3 className="font-medium text-slate-900">
                  Monthly Financial Summary
                </h3>
                <p className="text-sm text-slate-500">November 2025</p>
              </div>
              <Button variant="secondary" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
              <div>
                <h3 className="font-medium text-slate-900">
                  Tax Reports (VAT)
                </h3>
                <p className="text-sm text-slate-500">
                  VAT breakdown for Q4 2025
                </p>
              </div>
              <Button variant="secondary" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
              <div>
                <h3 className="font-medium text-slate-900">Payout Schedule</h3>
                <p className="text-sm text-slate-500">
                  For partners and agents
                </p>
              </div>
              <Button variant="secondary" size="sm">
                View
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueCenterPage;
