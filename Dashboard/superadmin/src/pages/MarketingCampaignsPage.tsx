import React, { useState } from 'react';
import {
  Plus,
  TrendingUp,
  BarChart3,
  Play,
  Pause,
  Copy,
  Eye,
  ChevronDown,
  Calendar,
  Filter,
  ExternalLink,
} from 'lucide-react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';

const MarketingCampaignsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('30');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);

  // Campaign dashboard cards data
  const campaignStats = [
    {
      title: 'Active Campaigns',
      value: '12',
      change: '+2 this month',
      icon: <BarChart3 className="h-6 w-6 text-blue-600" />,
      color: 'bg-blue-100',
    },
    {
      title: 'Total Ad Spend',
      value: 'R 45,800',
      change: '+15.2%',
      icon: <TrendingUp className="h-6 w-6 text-green-600" />,
      color: 'bg-green-100',
    },
    {
      title: 'Cost Per Lead',
      value: 'R 245',
      change: '-8.3%',
      icon: <TrendingUp className="h-6 w-6 text-purple-600" />,
      color: 'bg-purple-100',
    },
    {
      title: 'Campaign ROI',
      value: '3.2x',
      change: '+0.4x',
      icon: <TrendingUp className="h-6 w-6 text-cyan-600" />,
      color: 'bg-cyan-100',
    },
  ];

  // Campaign list data
  const campaignData = [
    {
      id: 1,
      name: 'Q4 Property Showcase',
      type: 'Google Ads',
      status: 'Active',
      budget: 'R 15,000',
      spend: 'R 12,450',
      impressions: '245,890',
      clicks: '3,240',
      ctr: '1.32%',
      leads: '89',
      costPerLead: 'R 140',
      roi: '4.2x',
    },
    {
      id: 2,
      name: 'Premium Listings Promotion',
      type: 'Meta Ads',
      status: 'Active',
      budget: 'R 10,000',
      spend: 'R 8,750',
      impressions: '187,420',
      clicks: '2,890',
      ctr: '1.54%',
      leads: '76',
      costPerLead: 'R 115',
      roi: '3.8x',
    },
    {
      id: 3,
      name: 'Cape Town Market Report',
      type: 'SEO',
      status: 'Completed',
      budget: 'R 5,000',
      spend: 'R 4,800',
      impressions: '98,750',
      clicks: '4,560',
      ctr: '4.62%',
      leads: '142',
      costPerLead: 'R 34',
      roi: '6.1x',
    },
    {
      id: 4,
      name: 'Agent Network Expansion',
      type: 'LinkedIn',
      status: 'Paused',
      budget: 'R 8,000',
      spend: 'R 3,200',
      impressions: '76,540',
      clicks: '1,240',
      ctr: '1.62%',
      leads: '32',
      costPerLead: 'R 100',
      roi: '2.5x',
    },
  ];

  const campaignColumns = [
    { key: 'name', title: 'Campaign Name', sortable: true },
    { key: 'type', title: 'Type', sortable: true },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value: string) => (
        <Badge
          variant={
            value === 'Active'
              ? 'success'
              : value === 'Paused'
                ? 'warning'
                : 'default'
          }
        >
          {value}
        </Badge>
      ),
    },
    { key: 'budget', title: 'Budget', sortable: true },
    { key: 'spend', title: 'Spend', sortable: true },
    { key: 'impressions', title: 'Impressions', sortable: true },
    { key: 'clicks', title: 'Clicks', sortable: true },
    { key: 'ctr', title: 'CTR', sortable: true },
    { key: 'leads', title: 'Leads Generated', sortable: true },
    { key: 'costPerLead', title: 'Cost Per Lead', sortable: true },
    { key: 'roi', title: 'ROI', sortable: true },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: any) => (
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedCampaign(record)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm">
            <Pause className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Integration status data
  const integrations = [
    { name: 'Google Ads API', status: 'Connected', color: 'bg-green-500' },
    { name: 'Meta Ads API', status: 'Connected', color: 'bg-green-500' },
    { name: 'Google Analytics', status: 'Connected', color: 'bg-green-500' },
    { name: 'CRM (EspoCRM)', status: 'Disconnected', color: 'bg-red-500' },
  ];

  // Form state for create campaign modal
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    audience: '',
    budget: '',
    startDate: '',
    endDate: '',
    goals: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Campaign data:', formData);
    setIsCreateModalOpen(false);
    // Reset form
    setFormData({
      name: '',
      type: '',
      audience: '',
      budget: '',
      startDate: '',
      endDate: '',
      goals: '',
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Marketing Campaigns
            </h1>
            <p className="text-slate-600">
              Track digital marketing ROI and campaign performance
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
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </div>
        </div>
      </div>

      {/* Campaign Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {campaignStats.map((stat, index) => (
          <div key={index} className="card p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-slate-600 text-sm font-medium">
                  {stat.title}
                </h3>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stat.value}
                </p>
                <p className="text-sm text-slate-500 mt-1">{stat.change}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Campaign List/Table */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">Campaigns</h2>
          <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
            <select className="text-sm border border-slate-300 rounded-lg px-3 py-1">
              <option>All Types</option>
              <option>Google Ads</option>
              <option>Meta Ads</option>
              <option>LinkedIn</option>
              <option>SEO</option>
            </select>
            <select className="text-sm border border-slate-300 rounded-lg px-3 py-1">
              <option>All Statuses</option>
              <option>Active</option>
              <option>Paused</option>
              <option>Completed</option>
            </select>
          </div>
        </div>
        <Table data={campaignData} columns={campaignColumns} loading={false} />
      </div>

      {/* Integration Status */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-6">
          Integration Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {integrations.map((integration, index) => (
            <div
              key={index}
              className="flex items-center p-4 border border-slate-200 rounded-lg"
            >
              <div
                className={`w-3 h-3 rounded-full ${integration.color} mr-3`}
              ></div>
              <div>
                <p className="font-medium text-slate-900">{integration.name}</p>
                <p className="text-sm text-slate-500">{integration.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Campaign Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Campaign"
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Campaign Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Campaign Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Type</option>
                <option value="Google Ads">Google Ads</option>
                <option value="Meta Ads">Meta Ads</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="SEO">SEO</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Target Audience
              </label>
              <input
                type="text"
                name="audience"
                value={formData.audience}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Property buyers in Gauteng"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Budget (R)
                </label>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Goals
                </label>
                <select
                  name="goals"
                  value={formData.goals}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Goal</option>
                  <option value="leads">Leads</option>
                  <option value="traffic">Traffic</option>
                  <option value="signups">Signups</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Campaign
            </Button>
          </div>
        </form>
      </Modal>

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <Modal
          isOpen={!!selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
          title={`Campaign Details: ${selectedCampaign.name}`}
          size="xl"
        >
          <div className="space-y-6">
            {/* Performance Overview */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Performance Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card p-4">
                  <p className="text-sm text-slate-600">Impressions</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {selectedCampaign.impressions}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-sm text-slate-600">Clicks</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {selectedCampaign.clicks}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-sm text-slate-600">CTR</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {selectedCampaign.ctr}
                  </p>
                </div>
              </div>
            </div>

            {/* Performance Chart */}
            <div className="card p-4">
              <h4 className="font-medium text-slate-900 mb-4">
                Performance Over Time
              </h4>
              <div className="h-48 flex items-end space-x-2">
                {[65, 80, 60, 90, 75, 85, 70].map((height, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center flex-1"
                  >
                    <div
                      className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition"
                      style={{ height: `${height}%` }}
                    ></div>
                    <span className="text-xs text-slate-500 mt-1">
                      Day {index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-slate-900 mb-3">
                  Audience Insights
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Age 25-34</span>
                    <span className="text-sm font-medium">42%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Age 35-44</span>
                    <span className="text-sm font-medium">31%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Age 45-54</span>
                    <span className="text-sm font-medium">18%</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-slate-900 mb-3">
                  Top Performing Ads
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">
                      Luxury Apartment Ad
                    </span>
                    <span className="text-sm font-medium">245 clicks</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">
                      Family Home Ad
                    </span>
                    <span className="text-sm font-medium">198 clicks</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">
                      Beachfront Unit Ad
                    </span>
                    <span className="text-sm font-medium">167 clicks</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Geographic Performance */}
            <div>
              <h4 className="font-medium text-slate-900 mb-3">
                Geographic Performance
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Gauteng</span>
                  <div className="flex items-center">
                    <div className="w-24 bg-slate-200 rounded-full h-2 mr-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: '65%' }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-10">65%</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Western Cape</span>
                  <div className="flex items-center">
                    <div className="w-24 bg-slate-200 rounded-full h-2 mr-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: '22%' }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-10">22%</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">KwaZulu-Natal</span>
                  <div className="flex items-center">
                    <div className="w-24 bg-slate-200 rounded-full h-2 mr-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: '13%' }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-10">13%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setSelectedCampaign(null)}
            >
              Close
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MarketingCampaignsPage;
