import React, { useState } from 'react';
import {
  Home,
  TrendingUp,
  Users,
  Eye,
  Phone,
  Mail,
  Filter,
  Search,
  Plus,
  MoreHorizontal,
  BarChart3,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  Star,
} from 'lucide-react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';

const AgenciesSmartDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for property listings
  const propertyListings = [
    {
      id: 1,
      title: 'Modern Apartment in Sandton',
      type: 'Apartment',
      price: 'R 2,500,000',
      status: 'Active',
      location: 'Sandton, Johannesburg',
      views: 1240,
      inquiries: 24,
      daysOnMarket: 15,
      agent: 'John Smith',
    },
    {
      id: 2,
      title: 'Luxury Villa in Cape Town',
      type: 'House',
      price: 'R 8,750,000',
      status: 'Under Offer',
      location: 'Cape Town CBD',
      views: 2100,
      inquiries: 42,
      daysOnMarket: 8,
      agent: 'Sarah Johnson',
    },
    {
      id: 3,
      title: 'Suburban Family Home',
      type: 'House',
      price: 'R 3,200,000',
      status: 'New',
      location: 'Fourways, Johannesburg',
      views: 850,
      inquiries: 18,
      daysOnMarket: 3,
      agent: 'Mike Williams',
    },
  ];

  // Mock data for performance metrics
  const performanceMetrics = [
    { title: 'Total Listings', value: '124', change: '+12%', icon: Home },
    { title: 'Active Listings', value: '89', change: '+5%', icon: Eye },
    { title: 'Total Inquiries', value: '1,240', change: '+18%', icon: Mail },
    { title: 'Avg. Days on Market', value: '24', change: '-3%', icon: Clock },
  ];

  // Mock data for recent inquiries
  const recentInquiries = [
    {
      id: 1,
      clientName: 'Robert Brown',
      property: 'Modern Apartment in Sandton',
      contact: '+27 82 123 4567',
      date: '2025-11-12',
      status: 'New',
    },
    {
      id: 2,
      clientName: 'Jennifer Davis',
      property: 'Luxury Villa in Cape Town',
      contact: '+27 83 987 6543',
      date: '2025-11-11',
      status: 'Contacted',
    },
    {
      id: 3,
      clientName: 'Thomas Wilson',
      property: 'Suburban Family Home',
      contact: '+27 72 555 1234',
      date: '2025-11-10',
      status: 'Viewing Scheduled',
    },
  ];

  // Mock data for property status distribution
  const propertyStatusData = [
    { status: 'Active', count: 89, color: 'bg-green-500' },
    { status: 'Under Offer', count: 24, color: 'bg-yellow-500' },
    { status: 'Sold', count: 11, color: 'bg-blue-500' },
  ];

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'listings', name: 'Property Listings' },
    { id: 'analytics', name: 'Performance Analytics' },
    { id: 'leads', name: 'Leads & Inquiries' },
  ];

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Agencies Smart Business Dashboard</h1>
        <p className="text-slate-600">Manage your property portfolio and business performance</p>
      </div>

      {/* Dashboard Tabs */}
      <div className="mb-6">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {performanceMetrics.map((metric, index) => (
              <div key={index} className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">{metric.title}</p>
                    <p className="text-2xl font-bold text-slate-900">{metric.value}</p>
                    <p className="text-sm text-green-600">{metric.change} from last month</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <metric.icon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Property Listings */}
            <div className="lg:col-span-2">
              <div className="card p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900">Recent Property Listings</h2>
                  <Button variant="primary" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Listing
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Property
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Views
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Inquiries
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Agent
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {propertyListings.map(property => (
                        <tr key={property.id}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-slate-900">{property.title}</div>
                              <div className="text-sm text-slate-500">{property.location}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge
                              variant={
                                property.status === 'Active'
                                  ? 'success'
                                  : property.status === 'Under Offer'
                                  ? 'warning'
                                  : 'default'
                              }
                            >
                              {property.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                            {property.views}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                            {property.inquiries}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                            {property.agent}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                            <Button variant="secondary" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Property Status Distribution */}
            <div>
              <div className="card p-4 mb-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Property Status Distribution</h2>
                <div className="space-y-4">
                  {propertyStatusData.map((status, index) => (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{status.status}</span>
                        <span className="text-sm font-medium text-slate-900">{status.count}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${status.color}`}
                          style={{ width: `${(status.count / 124) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card p-4">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <Button variant="secondary" className="w-full justify-start">
                    <Home className="h-4 w-4 mr-2" />
                    Add New Property
                  </Button>
                  <Button variant="secondary" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Agents
                  </Button>
                  <Button variant="secondary" className="w-full justify-start">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Analytics Report
                  </Button>
                  <Button variant="secondary" className="w-full justify-start">
                    <Star className="h-4 w-4 mr-2" />
                    Feature Listing
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Property Listings Tab */}
      {activeTab === 'listings' && (
        <div>
          {/* Search and Filters */}
          <div className="card p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="w-full md:w-60">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search properties..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <select className="text-sm border border-slate-300 rounded-lg px-3 py-2">
                  <option>All Statuses</option>
                  <option>Active</option>
                  <option>Under Offer</option>
                  <option>Sold</option>
                </select>
                <select className="text-sm border border-slate-300 rounded-lg px-3 py-2">
                  <option>All Types</option>
                  <option>House</option>
                  <option>Apartment</option>
                  <option>Townhouse</option>
                </select>
                <Button variant="secondary">
                  <Filter className="h-4 w-4 mr-1" />
                  Filter
                </Button>
                <Button variant="primary">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Property
                </Button>
              </div>
            </div>
          </div>

          {/* Property Listings Table */}
          <div className="card p-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Property
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Performance
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Agent
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {propertyListings.map(property => (
                    <tr key={property.id}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-slate-900">{property.title}</div>
                          <div className="text-sm text-slate-500 flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {property.location}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                        {property.type}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                        {property.price}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge
                          variant={
                            property.status === 'Active'
                              ? 'success'
                              : property.status === 'Under Offer'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {property.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-slate-900">{property.views} views</div>
                        <div className="text-sm text-slate-500">{property.inquiries} inquiries</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                        {property.agent}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <Button variant="secondary" size="sm" className="mr-1">
                          Edit
                        </Button>
                        <Button variant="secondary" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Performance Analytics Tab */}
      {activeTab === 'analytics' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Performance Metrics */}
            <div className="lg:col-span-2">
              <div className="card p-4 mb-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Performance Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Eye className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-slate-600">Total Views</p>
                        <p className="text-xl font-bold text-slate-900">12,450</p>
                      </div>
                    </div>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Mail className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-slate-600">Total Inquiries</p>
                        <p className="text-xl font-bold text-slate-900">1,240</p>
                      </div>
                    </div>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <DollarSign className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-slate-600">Avg. Property Value</p>
                        <p className="text-xl font-bold text-slate-900">R 4,200,000</p>
                      </div>
                    </div>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Clock className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-slate-600">Avg. Days on Market</p>
                        <p className="text-xl font-bold text-slate-900">24 days</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Chart Placeholder */}
              <div className="card p-4">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Listing Performance Trends</h2>
                <div className="bg-slate-100 border-2 border-dashed rounded-xl w-full h-64 flex items-center justify-center">
                  <p className="text-slate-500">Performance chart visualization would appear here</p>
                </div>
              </div>
            </div>

            {/* Additional Analytics */}
            <div>
              <div className="card p-4 mb-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Top Performing Properties</h2>
                <div className="space-y-4">
                  {propertyListings.map(property => (
                    <div key={property.id} className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="bg-slate-200 border-2 border-dashed rounded-xl w-16 h-16" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-slate-900">{property.title}</div>
                        <div className="text-sm text-slate-500">{property.views} views</div>
                        <div className="flex items-center mt-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-slate-600 ml-1">{property.inquiries} inquiries</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agent Performance */}
              <div className="card p-4">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Agent Performance</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">John Smith</span>
                    <span className="text-sm font-medium text-slate-900">24 listings</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Sarah Johnson</span>
                    <span className="text-sm font-medium text-slate-900">18 listings</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Mike Williams</span>
                    <span className="text-sm font-medium text-slate-900">12 listings</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leads & Inquiries Tab */}
      {activeTab === 'leads' && (
        <div>
          <div className="card p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Lead Management</h2>
                <p className="text-sm text-slate-600">Manage and track all property inquiries</p>
              </div>
              <Button variant="primary">
                <Plus className="h-4 w-4 mr-1" />
                Add Lead
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Inquiries */}
            <div className="lg:col-span-2">
              <div className="card p-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Client
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Property
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {recentInquiries.map(inquiry => (
                        <tr key={inquiry.id}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-slate-900">{inquiry.clientName}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                            {inquiry.property}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                            {inquiry.contact}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                            {inquiry.date}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge
                              variant={
                                inquiry.status === 'New'
                                  ? 'default'
                                  : inquiry.status === 'Contacted'
                                  ? 'warning'
                                  : 'success'
                              }
                            >
                              {inquiry.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                            <Button variant="secondary" size="sm" className="mr-1">
                              View
                            </Button>
                            <Button variant="secondary" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Lead Status Distribution */}
            <div>
              <div className="card p-4 mb-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Lead Status Distribution</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">New</span>
                      <span className="text-sm font-medium text-slate-900">12</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="h-2 rounded-full bg-blue-500" style={{ width: '30%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">Contacted</span>
                      <span className="text-sm font-medium text-slate-900">18</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="h-2 rounded-full bg-yellow-500" style={{ width: '45%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">Viewing Scheduled</span>
                      <span className="text-sm font-medium text-slate-900">8</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="h-2 rounded-full bg-green-500" style={{ width: '20%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">Closed</span>
                      <span className="text-sm font-medium text-slate-900">5</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="h-2 rounded-full bg-purple-500" style={{ width: '12%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card p-4">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Lead Management Actions</h2>
                <div className="space-y-3">
                  <Button variant="secondary" className="w-full justify-start">
                    <Phone className="h-4 w-4 mr-2" />
                    Call New Leads
                  </Button>
                  <Button variant="secondary" className="w-full justify-start">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Follow-up Emails
                  </Button>
                  <Button variant="secondary" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Viewings
                  </Button>
                  <Button variant="secondary" className="w-full justify-start">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Conversion Rates
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgenciesSmartDashboard;