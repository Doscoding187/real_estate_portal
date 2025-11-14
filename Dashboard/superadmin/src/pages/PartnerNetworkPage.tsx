import React, { useState } from 'react';
import {
  Plus,
  TrendingUp,
  Users,
  FileText,
  Upload,
  Eye,
  Edit,
  BarChart3,
  Calendar,
  Filter,
  ChevronDown,
} from 'lucide-react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import TextInput from '../components/common/TextInput';
import Select from '../components/common/Select';
import Textarea from '../components/common/Textarea';

const PartnerNetworkPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);

  // Partner overview cards data
  const partnerStats = [
    {
      title: 'Total Partners',
      value: '42',
      change: '+3 this month',
      icon: <Users className="h-6 w-6 text-blue-600" />,
      color: 'bg-blue-100',
    },
    {
      title: 'Active Partnerships',
      value: '38',
      change: '+2 this month',
      icon: <TrendingUp className="h-6 w-6 text-green-600" />,
      color: 'bg-green-100',
    },
    {
      title: 'Commission Earned',
      value: 'R 24,800',
      change: '+18.5%',
      icon: <TrendingUp className="h-6 w-6 text-purple-600" />,
      color: 'bg-purple-100',
    },
    {
      title: 'Top Partner',
      value: 'FNB Property',
      change: 'R 8,200 this month',
      icon: <BarChart3 className="h-6 w-6 text-cyan-600" />,
      color: 'bg-cyan-100',
    },
  ];

  // Partner categories
  const partnerCategories = [
    { id: 'all', name: 'All Partners' },
    { id: 'bond', name: 'Bond Originators' },
    { id: 'moving', name: 'Moving Companies' },
    { id: 'insurance', name: 'Insurance Providers' },
    { id: 'cleaning', name: 'Cleaning Services' },
    { id: 'inspectors', name: 'Home Inspectors' },
    { id: 'designers', name: 'Interior Designers' },
    { id: 'solar', name: 'Solar Installers (SA-specific!)' },
    { id: 'security', name: 'Security Companies (SA-specific!)' },
  ];

  // Partner table data
  const partnerData = [
    {
      id: 1,
      name: 'FNB Property',
      category: 'Bond Originators',
      status: 'Active',
      commissionRate: '2.5%',
      leadsSent: 142,
      conversions: 89,
      revenue: 'R 32,450',
      commission: 'R 8,200',
      joinDate: '2025-01-15',
    },
    {
      id: 2,
      name: '123 Movers',
      category: 'Moving Companies',
      status: 'Active',
      commissionRate: '15%',
      leadsSent: 98,
      conversions: 76,
      revenue: 'R 18,750',
      commission: 'R 2,812',
      joinDate: '2025-03-22',
    },
    {
      id: 3,
      name: 'Santam Insurance',
      category: 'Insurance Providers',
      status: 'Active',
      commissionRate: '20%',
      leadsSent: 76,
      conversions: 65,
      revenue: 'R 24,800',
      commission: 'R 4,960',
      joinDate: '2025-02-10',
    },
    {
      id: 4,
      name: 'Sparkle Clean',
      category: 'Cleaning Services',
      status: 'Pending',
      commissionRate: '10%',
      leadsSent: 0,
      conversions: 0,
      revenue: 'R 0',
      commission: 'R 0',
      joinDate: '2025-11-05',
    },
  ];

  const partnerColumns = [
    { key: 'name', title: 'Partner Name', sortable: true },
    { key: 'category', title: 'Category', sortable: true },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value: string) => (
        <Badge
          variant={
            value === 'Active'
              ? 'success'
              : value === 'Pending'
                ? 'warning'
                : 'error'
          }
        >
          {value}
        </Badge>
      ),
    },
    { key: 'commissionRate', title: 'Commission Rate', sortable: true },
    { key: 'leadsSent', title: 'Leads Sent', sortable: true },
    { key: 'conversions', title: 'Conversions', sortable: true },
    { key: 'revenue', title: 'Revenue Generated', sortable: true },
    { key: 'commission', title: 'Commission Earned', sortable: true },
    { key: 'joinDate', title: 'Join Date', sortable: true },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: any) => (
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedPartner(record)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Partner offers data
  const offerData = [
    {
      id: 1,
      title: 'First-time buyer bond discount',
      partner: 'FNB Property',
      details: '0.5% discount on bond initiation fees',
      status: 'Active',
      impressions: 1240,
      clicks: 89,
      conversions: 24,
    },
    {
      id: 2,
      title: 'Free home security consultation',
      partner: 'ADT Security',
      details: 'Complimentary security assessment for new homeowners',
      status: 'Active',
      impressions: 870,
      clicks: 65,
      conversions: 18,
    },
    {
      id: 3,
      title: 'Solar panel installation discount',
      partner: 'SolarWorld SA',
      details: '15% off for HomeFind.za customers',
      status: 'Scheduled',
      impressions: 0,
      clicks: 0,
      conversions: 0,
    },
  ];

  const offerColumns = [
    { key: 'title', title: 'Offer Title', sortable: true },
    { key: 'partner', title: 'Partner Name', sortable: true },
    { key: 'details', title: 'Offer Details', sortable: true },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value: string) => (
        <Badge
          variant={
            value === 'Active'
              ? 'success'
              : value === 'Scheduled'
                ? 'warning'
                : 'default'
          }
        >
          {value}
        </Badge>
      ),
    },
    { key: 'impressions', title: 'Impressions', sortable: true },
    { key: 'clicks', title: 'Clicks', sortable: true },
    { key: 'conversions', title: 'Conversions', sortable: true },
    {
      key: 'actions',
      title: 'Actions',
      render: () => (
        <div className="flex space-x-2">
          <Button variant="secondary" size="sm">
            Edit
          </Button>
          <Button variant="secondary" size="sm">
            Duplicate
          </Button>
        </div>
      ),
    },
  ];

  // Form state for add partner modal
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    email: '',
    phone: '',
    commissionType: '',
    commissionRate: '',
    description: '',
    website: '',
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
    console.log('Partner data:', formData);
    setIsAddModalOpen(false);
    // Reset form
    setFormData({
      name: '',
      category: '',
      email: '',
      phone: '',
      commissionType: '',
      commissionRate: '',
      description: '',
      website: '',
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Partner Network Management
            </h1>
            <p className="text-slate-600">
              Manage ecosystem partners (bond originators, movers, insurance,
              etc.)
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Partner
          </Button>
        </div>
      </div>

      {/* Partner Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {partnerStats.map((stat, index) => (
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

      {/* Partner Categories Tabs */}
      <div className="card p-6 mb-6">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {partnerCategories.map(category => (
              <button
                key={category.id}
                onClick={() => setActiveTab(category.id)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === category.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {category.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Partner Table */}
        <div className="mt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Partners</h2>
            <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
              <select className="text-sm border border-slate-300 rounded-lg px-3 py-1">
                <option>All Statuses</option>
                <option>Active</option>
                <option>Pending</option>
                <option>Suspended</option>
              </select>
            </div>
          </div>
          <Table data={partnerData} columns={partnerColumns} loading={false} />
        </div>
      </div>

      {/* Partner Offers Management */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">Partner Offers</h2>
          <div className="flex gap-2 mt-2 md:mt-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsOfferModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Offer
            </Button>
          </div>
        </div>
        <Table data={offerData} columns={offerColumns} loading={false} />
      </div>

      {/* Add Partner Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Partner"
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                label="Partner Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />

              <Select
                label="Category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                options={[
                  { value: '', label: 'Select Category' },
                  { value: 'bond', label: 'Bond Originators' },
                  { value: 'moving', label: 'Moving Companies' },
                  { value: 'insurance', label: 'Insurance Providers' },
                  { value: 'cleaning', label: 'Cleaning Services' },
                  { value: 'inspectors', label: 'Home Inspectors' },
                  { value: 'designers', label: 'Interior Designers' },
                  { value: 'solar', label: 'Solar Installers (SA-specific!)' },
                  {
                    value: 'security',
                    label: 'Security Companies (SA-specific!)',
                  },
                ]}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
              />

              <TextInput
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Commission Type"
                name="commissionType"
                value={formData.commissionType}
                onChange={handleInputChange}
                options={[
                  { value: '', label: 'Select Type' },
                  { value: 'percentage', label: 'Percentage' },
                  { value: 'fixed', label: 'Fixed Amount' },
                  { value: 'tiered', label: 'Tiered' },
                ]}
              />

              <TextInput
                label="Commission Rate"
                name="commissionRate"
                value={formData.commissionRate}
                onChange={handleInputChange}
                placeholder="e.g., 2.5% or R500"
              />
            </div>

            <Textarea
              label="Description/Bio"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Partner description for public profile"
              rows={3}
            />

            <TextInput
              label="Website/Social Links"
              name="website"
              value={formData.website}
              onChange={handleInputChange}
              placeholder="https://example.com"
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Agreement Upload
              </label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-4 text-slate-500" />
                    <p className="mb-2 text-sm text-slate-500">
                      <span className="font-semibold">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-xs text-slate-500">PDF (MAX. 10MB)</p>
                  </div>
                  <input type="file" className="hidden" accept=".pdf" />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Logo Upload
              </label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-4 text-slate-500" />
                    <p className="mb-2 text-sm text-slate-500">
                      <span className="font-semibold">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-xs text-slate-500">
                      PNG, JPG (MAX. 5MB)
                    </p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" />
                </label>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Add Partner
            </Button>
          </div>
        </form>
      </Modal>

      {/* Partner Performance Modal */}
      {selectedPartner && (
        <Modal
          isOpen={!!selectedPartner}
          onClose={() => setSelectedPartner(null)}
          title={`Partner Performance: ${selectedPartner.name}`}
          size="xl"
        >
          <div className="space-y-6">
            {/* Performance Metrics */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Performance Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-4">
                  <p className="text-sm text-slate-600">Total Leads Sent</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {selectedPartner.leadsSent}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-sm text-slate-600">Conversion Rate</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {selectedPartner.leadsSent > 0
                      ? `${((selectedPartner.conversions / selectedPartner.leadsSent) * 100).toFixed(1)}%`
                      : '0%'}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-sm text-slate-600">Average Deal Value</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {selectedPartner.conversions > 0
                      ? `R ${(parseFloat(selectedPartner.revenue.replace('R ', '').replace(',', '')) / selectedPartner.conversions).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`
                      : 'R 0'}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-sm text-slate-600">
                    Total Commission Earned
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {selectedPartner.commission}
                  </p>
                </div>
              </div>
            </div>

            {/* Monthly Performance Chart */}
            <div className="card p-4">
              <h4 className="font-medium text-slate-900 mb-4">
                Monthly Performance
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
                      Oct {index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-slate-900 mb-3">
                  Top Referring Agents/Agencies
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">
                      PropCity Estates
                    </span>
                    <span className="text-sm font-medium">24 leads</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">
                      Cape Town Properties
                    </span>
                    <span className="text-sm font-medium">18 leads</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">
                      Johannesburg Real Estate
                    </span>
                    <span className="text-sm font-medium">15 leads</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-slate-900 mb-3">
                  Customer Feedback/Ratings
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">
                      Average Rating
                    </span>
                    <span className="text-sm font-medium">4.7/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">
                      Positive Reviews
                    </span>
                    <span className="text-sm font-medium">89%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">
                      Response Rate
                    </span>
                    <span className="text-sm font-medium">92%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment History */}
            <div>
              <h4 className="font-medium text-slate-900 mb-3">
                Payment History
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        2025-10-15
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        R 8,200
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <Badge variant="success">Paid</Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        2025-09-15
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        R 7,800
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <Badge variant="success">Paid</Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        2025-08-15
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        R 6,950
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <Badge variant="success">Paid</Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
              <Button variant="primary">Send Leads</Button>
              <Button variant="secondary">Adjust Commission</Button>
              <Button variant="secondary">View Agreement</Button>
              <Button variant="danger">Suspend Partner</Button>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setSelectedPartner(null)}
            >
              Close
            </Button>
          </div>
        </Modal>
      )}

      {/* Add Offer Modal */}
      <Modal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        title="Add New Offer"
        size="md"
      >
        <form>
          <div className="space-y-4">
            <TextInput
              label="Offer Title"
              name="offerTitle"
              placeholder="e.g., First-time buyer bond discount"
              required
            />

            <Select
              label="Partner"
              name="offerPartner"
              options={[
                { value: '', label: 'Select Partner' },
                { value: 'fnb', label: 'FNB Property' },
                { value: 'movers', label: '123 Movers' },
                { value: 'santam', label: 'Santam Insurance' },
              ]}
              required
            />

            <Textarea
              label="Offer Details"
              name="offerDetails"
              placeholder="Describe the offer details"
              rows={3}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput label="Start Date" name="startDate" type="date" />

              <TextInput label="End Date" name="endDate" type="date" />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setIsOfferModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Add Offer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PartnerNetworkPage;
