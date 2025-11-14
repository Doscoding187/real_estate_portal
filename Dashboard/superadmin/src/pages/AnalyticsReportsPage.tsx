import React, { useState } from 'react';
import {
  Download,
  TrendingUp,
  BarChart3,
  MapPin,
  Monitor,
  Smartphone,
  Tablet,
  ChevronDown,
  Calendar,
  Filter,
} from 'lucide-react';
import Button from '../components/common/Button';
import RevenueChart from '../components/common/RevenueChart';

const AnalyticsReportsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('30');

  // Traffic analytics data
  const trafficData = [
    { metric: 'Total Visits', value: '24,580', change: '+12.5%' },
    { metric: 'Unique Visitors', value: '18,420', change: '+8.3%' },
    { metric: 'Bounce Rate', value: '32.4%', change: '-2.1%' },
  ];

  // Traffic sources data
  const trafficSources = [
    { source: 'Direct', percentage: 35, color: 'bg-blue-500' },
    { source: 'Organic', percentage: 28, color: 'bg-green-500' },
    { source: 'Paid', percentage: 22, color: 'bg-purple-500' },
    { source: 'Social', percentage: 10, color: 'bg-orange-500' },
    { source: 'Referral', percentage: 5, color: 'bg-cyan-500' },
  ];

  // Top pages data
  const topPages = [
    { title: '3 Bed House in Sandton', views: '1,240', type: 'property' },
    { title: 'Cape Town Luxury Apartment', views: '980', type: 'property' },
    { title: 'How to Sell Your Property Fast', views: '870', type: 'blog' },
    { title: 'Market Trends 2025', views: '760', type: 'blog' },
    { title: 'Homepage', views: '2,450', type: 'landing' },
  ];

  // Conversion funnel data
  const conversionFunnel = [
    { stage: 'Visitors', count: '24,580', rate: '100%' },
    { stage: 'Property Views', count: '8,750', rate: '35.6%' },
    { stage: 'Contact Agent', count: '3,240', rate: '37.0%' },
    { stage: 'Leads Generated', count: '1,890', rate: '58.3%' },
    { stage: 'Viewings Scheduled', count: '1,240', rate: '65.6%' },
    { stage: 'Transactions', count: '890', rate: '71.8%' },
  ];

  // User behavior data
  const userBehavior = [
    { metric: 'Avg. Session Duration', value: '4m 32s' },
    { metric: 'Pages per Session', value: '3.8' },
  ];

  // Device breakdown data
  const deviceBreakdown = [
    {
      device: 'Desktop',
      percentage: 45,
      icon: <Monitor className="h-4 w-4" />,
    },
    {
      device: 'Mobile',
      percentage: 50,
      icon: <Smartphone className="h-4 w-4" />,
    },
    { device: 'Tablet', percentage: 5, icon: <Tablet className="h-4 w-4" /> },
  ];

  // Geographic distribution data (SA provinces)
  const geographicData = [
    { province: 'Gauteng', percentage: 35, color: 'bg-blue-500' },
    { province: 'Western Cape', percentage: 22, color: 'bg-green-500' },
    { province: 'KwaZulu-Natal', percentage: 18, color: 'bg-purple-500' },
    { province: 'Eastern Cape', percentage: 8, color: 'bg-orange-500' },
    { province: 'Free State', percentage: 5, color: 'bg-cyan-500' },
    { province: 'Limpopo', percentage: 4, color: 'bg-pink-500' },
    { province: 'Mpumalanga', percentage: 3, color: 'bg-yellow-500' },
    { province: 'North West', percentage: 3, color: 'bg-indigo-500' },
    { province: 'Northern Cape', percentage: 2, color: 'bg-teal-500' },
  ];

  // Listing performance data
  const listingPerformance = [
    {
      property: '3 Bed House in Sandton',
      views: '1,240',
      timeToSell: '42 days',
      featured: true,
    },
    {
      property: 'Cape Town Luxury Apartment',
      views: '980',
      timeToSell: '58 days',
      featured: false,
    },
    {
      property: 'Johannesburg Office Space',
      views: '870',
      timeToSell: '65 days',
      featured: true,
    },
    {
      property: 'Durban Beachfront Unit',
      views: '760',
      timeToSell: '72 days',
      featured: false,
    },
    {
      property: 'Pretoria Family Home',
      views: '650',
      timeToSell: '55 days',
      featured: true,
    },
  ];

  // Report templates
  const reportTemplates = [
    {
      name: 'Monthly Revenue Report',
      description: 'Comprehensive revenue analysis',
    },
    {
      name: 'User Growth Report',
      description: 'User acquisition and retention metrics',
    },
    {
      name: 'Partner Performance Report',
      description: 'Agency and partner performance',
    },
    {
      name: 'Marketing ROI Report',
      description: 'Campaign effectiveness and ROI',
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Analytics & Reports
            </h1>
            <p className="text-slate-600">
              Data-driven insights for business decisions
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <select
                className="text-sm border border-slate-300 rounded-lg px-3 py-2 appearance-none bg-white pr-8"
                value={dateRange}
                onChange={e => setDateRange(e.target.value)}
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="365">Last Year</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
            <Button variant="primary" size="md">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>
      </div>

      {/* Traffic Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Page Views Chart */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-900">Page Views</h2>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Filter
              </Button>
            </div>
          </div>
          <div className="h-64">
            <RevenueChart />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            {trafficData.map((item, index) => (
              <div
                key={index}
                className="text-center p-3 bg-slate-50 rounded-lg"
              >
                <p className="text-sm text-slate-600">{item.metric}</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {item.value}
                </p>
                <p className="text-sm text-green-600 font-medium mt-1">
                  {item.change}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic Sources */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">
            Traffic Sources
          </h2>
          <div className="space-y-4">
            {trafficSources.map((source, index) => (
              <div key={index}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">
                    {source.source}
                  </span>
                  <span className="text-sm text-slate-900 font-medium">
                    {source.percentage}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`${source.color} h-2 rounded-full`}
                    style={{ width: `${source.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Integrated with Google Analytics
            </p>
          </div>
        </div>
      </div>

      {/* Top Pages and Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Pages */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Top Pages</h2>
          <div className="space-y-4">
            {topPages.map((page, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-slate-900">{page.title}</p>
                  <p className="text-sm text-slate-500 capitalize">
                    {page.type}
                  </p>
                </div>
                <span className="font-medium text-slate-900">
                  {page.views} views
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">
            Conversion Funnel
          </h2>
          <div className="space-y-4">
            {conversionFunnel.map((stage, index) => (
              <div key={index} className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                  <span className="text-sm font-bold text-blue-600">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-900">
                      {stage.stage}
                    </span>
                    <span className="text-slate-900">{stage.count}</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <div className="w-full bg-slate-200 rounded-full h-2 mr-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${parseFloat(stage.rate)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-slate-500 w-12">
                      {stage.rate}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Behavior and Geographic Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* User Behavior */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">
            User Behavior
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {userBehavior.map((item, index) => (
              <div
                key={index}
                className="text-center p-4 bg-slate-50 rounded-lg"
              >
                <p className="text-sm text-slate-600">{item.metric}</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <h3 className="font-medium text-slate-900 mb-4">Device Breakdown</h3>
          <div className="space-y-3">
            {deviceBreakdown.map((device, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="mr-3 text-slate-500">{device.icon}</div>
                  <span className="text-sm font-medium text-slate-700">
                    {device.device}
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-24 bg-slate-200 rounded-full h-2 mr-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${device.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-slate-900 w-10">
                    {device.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">
            Geographic Distribution (SA Provinces)
          </h2>
          <div className="space-y-4">
            {geographicData.map((province, index) => (
              <div key={index}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">
                    {province.province}
                  </span>
                  <span className="text-sm text-slate-900 font-medium">
                    {province.percentage}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`${province.color} h-2 rounded-full`}
                    style={{ width: `${province.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Listing Performance and Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Listing Performance */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">
            Listing Performance
          </h2>
          <div className="space-y-4">
            {listingPerformance.map((listing, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {listing.property}
                  </p>
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-slate-500 mr-3">
                      {listing.views} views
                    </span>
                    <span className="text-xs text-slate-500">
                      {listing.timeToSell}
                    </span>
                    {listing.featured && (
                      <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                        Featured
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reports Generator */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">
            Reports Generator
          </h2>
          <div className="space-y-4 mb-6">
            <h3 className="font-medium text-slate-900">
              Pre-built Report Templates
            </h3>
            {reportTemplates.map((report, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border border-slate-200 rounded-lg"
              >
                <div>
                  <p className="font-medium text-slate-900">{report.name}</p>
                  <p className="text-sm text-slate-500">{report.description}</p>
                </div>
                <Button variant="secondary" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200">
            <Button variant="primary" size="md" className="w-full">
              Create Custom Report
            </Button>
            <Button variant="secondary" size="md" className="w-full mt-3">
              Schedule Automated Reports
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsReportsPage;
