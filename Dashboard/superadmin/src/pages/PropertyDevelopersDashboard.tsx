import React, { useState } from 'react';
import {
  Plus,
  Building2,
  TrendingUp,
  Users,
  Eye,
  Edit,
  BarChart3,
  MessageSquare,
  CreditCard,
  Bell,
  FileText,
  Settings,
  Search,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Table from '../components/common/Table';
import StatCard from '../components/common/StatCard';

const PropertyDevelopersDashboard: React.FC = () => {
  // State for modals and filters
  const [isCreateDevelopmentModalOpen, setIsCreateDevelopmentModalOpen] =
    useState(false);
  const [isEditDevelopmentModalOpen, setIsEditDevelopmentModalOpen] =
    useState(false);
  const [isPreviewDevelopmentModalOpen, setIsPreviewDevelopmentModalOpen] =
    useState(false);
  const [isLeadDetailModalOpen, setIsLeadDetailModalOpen] = useState(false);
  const [isMessagingModalOpen, setIsMessagingModalOpen] = useState(false);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [isTeamManagementOpen, setIsTeamManagementOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [selectedDevelopment, setSelectedDevelopment] = useState<any>(null);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [analyticsFilters, setAnalyticsFilters] = useState({
    dateRange: 'last30days',
    development: 'all',
  });
  const [subscriptionPlan, setSubscriptionPlan] = useState('pro');
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'lead',
      message: 'New lead received for Sandton Heights',
      time: '2 min ago',
      read: false,
    },
    {
      id: 2,
      type: 'message',
      message: 'Sarah Johnson: Thanks for the information',
      time: '1 hour ago',
      read: false,
    },
    {
      id: 3,
      type: 'billing',
      message: 'Your subscription will renew in 3 days',
      time: '1 day ago',
      read: true,
    },
  ]);

  // Lead management functions
  const handleUpdateLeadStatus = (id: number, status: string) => {
    // Implementation for updating lead status
    console.log(`Updating lead ${id} status to ${status}`);
    setLeadsData(prev =>
      prev.map(lead => (lead.id === id ? { ...lead, status } : lead))
    );
  };

  const handleSetFollowUp = (id: number) => {
    // Implementation for setting follow-up
    console.log(`Setting follow-up for lead ${id}`);
    // In a real implementation, this would open a date picker or similar
  };

  const handleAddTag = (id: number, tag: string) => {
    // Implementation for adding tags to a lead
    console.log(`Adding tag '${tag}' to lead ${id}`);
    setLeadsData(prev =>
      prev.map(lead =>
        lead.id === id
          ? { ...lead, tags: lead.tags ? `${lead.tags}, ${tag}` : tag }
          : lead
      )
    );
  };

  const handleExportLeads = () => {
    // Implementation for exporting leads
    console.log('Exporting leads');
    // In a real implementation, this would call the /api/leads/export endpoint
  };

  const handleIntegrateWithCRM = () => {
    // Implementation for CRM integration
    console.log('Integrating with CRM');
    // In a real implementation, this would connect to EspoCRM or internal system
  };

  const handleStoreLeadSource = (id: number, source: string) => {
    // Implementation for storing lead source
    console.log(`Storing lead source '${source}' for lead ${id}`);
    setLeadsData(prev =>
      prev.map(lead => (lead.id === id ? { ...lead, source } : lead))
    );
  };

  // Analytics functions
  const handleFilterChange = (filter: string, value: string) => {
    setAnalyticsFilters(prev => ({
      ...prev,
      [filter]: value,
    }));
  };

  const handleDownloadReport = () => {
    // Implementation for downloading PDF report
    console.log('Downloading analytics report');
    // In a real implementation, this would call the backend to generate and download a PDF
  };

  // Communication & Collaboration functions
  const handleOpenMessaging = () => {
    setIsMessagingModalOpen(true);
  };

  const handleCloseMessaging = () => {
    setIsMessagingModalOpen(false);
  };

  const handleMarkNotificationAsRead = (id: number) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  // Billing & Subscription functions
  const handleUpgradePlan = (plan: string) => {
    setSubscriptionPlan(plan);
    console.log(`Upgrading to ${plan} plan`);
    // In a real implementation, this would call the /api/subscriptions endpoint
  };

  const handleDownloadInvoice = (id: string) => {
    console.log(`Downloading invoice ${id}`);
    // In a real implementation, this would download the invoice PDF
  };

  // Developer Profile & Branding functions
  const handleOpenProfileEditor = () => {
    setIsProfileEditorOpen(true);
  };

  const handleCloseProfileEditor = () => {
    setIsProfileEditorOpen(false);
  };

  const handleOpenTeamManagement = () => {
    setIsTeamManagementOpen(true);
  };

  const handleCloseTeamManagement = () => {
    setIsTeamManagementOpen(false);
  };

  const handleSaveProfile = () => {
    console.log('Saving profile');
    // In a real implementation, this would call the /api/developer/profile endpoint
    handleCloseProfileEditor();
  };

  const handleInviteTeamMember = () => {
    console.log('Inviting team member');
    // In a real implementation, this would call the /api/developer/team endpoint
  };

  // Support & Resources functions
  const handleOpenSupport = () => {
    setIsSupportModalOpen(true);
  };

  const handleCloseSupport = () => {
    setIsSupportModalOpen(false);
  };

  const handleSubmitSupportTicket = () => {
    console.log('Submitting support ticket');
    // In a real implementation, this would call the /api/support/tickets endpoint
    handleCloseSupport();
  };

  // CRUD functions for developments
  const handleCreateDevelopment = () => {
    // Implementation for creating a new development
    console.log('Creating new development');
    setIsCreateDevelopmentModalOpen(false);
  };

  const handleUpdateDevelopment = () => {
    // Implementation for updating a development
    console.log('Updating development');
    setIsEditDevelopmentModalOpen(false);
  };

  const handleDeleteDevelopment = (id: number) => {
    // Implementation for deleting a development
    console.log('Deleting development with id:', id);
    setDevelopmentsData(prev => prev.filter(dev => dev.id !== id));
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleMediaUpload = () => {
    // Implementation for handling media uploads
    console.log('Handling media upload');
  };

  const handleFeatureDevelopment = (id: number) => {
    // Implementation for featuring a development
    console.log('Featuring development with id:', id);
  };

  // Mock data for developer dashboard
  const developerStats = [
    {
      label: 'Total Developments',
      value: '12',
      change: '+2 this month',
      icon: <Building2 className="h-6 w-6 text-blue-600" />,
      color: 'bg-blue-100',
    },
    {
      label: 'Total Leads',
      value: '1,248',
      change: '+142 this month',
      icon: <Users className="h-6 w-6 text-green-600" />,
      color: 'bg-green-100',
    },
    {
      label: 'Units Sold',
      value: '247',
      change: '+24 this month',
      icon: <TrendingUp className="h-6 w-6 text-purple-600" />,
      color: 'bg-purple-100',
    },
    {
      label: 'Marketing Spend',
      value: 'R 42,500',
      change: 'ROI: 3.2x',
      icon: <CreditCard className="h-6 w-6 text-cyan-600" />,
      color: 'bg-cyan-100',
    },
    {
      label: 'Avg. Engagement',
      value: '72%',
      change: '+5% from last month',
      icon: <BarChart3 className="h-6 w-6 text-amber-600" />,
      color: 'bg-amber-100',
    },
    {
      label: 'Conversion Rate',
      value: '24.5%',
      change: '+3.2% from last month',
      icon: <TrendingUp className="h-6 w-6 text-emerald-600" />,
      color: 'bg-emerald-100',
    },
  ];

  // Recent activity data
  const recentActivity = [
    {
      id: 1,
      user: 'John Smith',
      action: 'submitted a lead for Sandton Heights',
      time: '2 min ago',
    },
    {
      id: 2,
      user: 'Sarah Johnson',
      action: 'viewed your development listing',
      time: '1 hour ago',
    },
    {
      id: 3,
      user: 'Mike Williams',
      action: 'inquired about Cape Residences',
      time: '3 hours ago',
    },
    {
      id: 4,
      user: 'Platform Admin',
      action: 'approved your new development',
      time: '5 hours ago',
    },
  ];

  // Chart data
  const trafficData = [
    { name: 'Jan', views: 4000, leads: 240 },
    { name: 'Feb', views: 3000, leads: 138 },
    { name: 'Mar', views: 2000, leads: 980 },
    { name: 'Apr', views: 2780, leads: 390 },
    { name: 'May', views: 1890, leads: 480 },
    { name: 'Jun', views: 2390, leads: 380 },
  ];

  const conversionData = [
    { name: 'Week 1', rate: 24 },
    { name: 'Week 2', rate: 32 },
    { name: 'Week 3', rate: 28 },
    { name: 'Week 4', rate: 35 },
  ];

  const leadGrowthData = [
    { name: 'Jan', leads: 120 },
    { name: 'Feb', leads: 180 },
    { name: 'Mar', leads: 150 },
    { name: 'Apr', leads: 220 },
    { name: 'May', leads: 280 },
    { name: 'Jun', leads: 320 },
  ];

  const trafficSourcesData = [
    { name: 'Organic Search', value: 400 },
    { name: 'Paid Ads', value: 300 },
    { name: 'Social Media', value: 200 },
    { name: 'Direct', value: 100 },
    { name: 'Referrals', value: 50 },
  ];

  const adPerformanceData = [
    { name: 'Facebook', clicks: 1200, conversions: 48, cost: 600 },
    { name: 'Google', clicks: 800, conversions: 64, cost: 800 },
    { name: 'Instagram', clicks: 600, conversions: 36, cost: 300 },
    { name: 'LinkedIn', clicks: 300, conversions: 15, cost: 200 },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Developments data
  const [developmentsData, setDevelopmentsData] = useState([
    {
      id: 1,
      name: 'Sandton Heights',
      slug: 'sandton-heights',
      location: 'Sandton, Johannesburg',
      units: 120,
      available: 42,
      leads: 86,
      status: 'Under Construction',
      performance: 'High',
      priceRange: 'R 1.2M - R 3.5M',
      description: 'Luxury residential development in the heart of Sandton',
      amenities: 'Swimming Pool, Gym, Parking, Security',
    },
    {
      id: 2,
      name: 'Cape Residences',
      slug: 'cape-residences',
      location: 'Cape Town',
      units: 80,
      available: 18,
      leads: 64,
      status: 'Completed',
      performance: 'Medium',
      priceRange: 'R 850K - R 2.1M',
      description: 'Modern apartments with stunning ocean views',
      amenities: 'Swimming Pool, Gym, Parking',
    },
    {
      id: 3,
      name: 'Durban Waterfront',
      slug: 'durban-waterfront',
      location: 'Durban',
      units: 140,
      available: 75,
      leads: 42,
      status: 'Planning',
      performance: 'Low',
      priceRange: 'R 950K - R 2.8M',
      description: 'Upcoming waterfront development with premium amenities',
      amenities: 'Swimming Pool, Gym, Parking, Security, Restaurant',
    },
  ]);

  const developmentsColumns = [
    { key: 'name', title: 'Development Name', sortable: true },
    { key: 'location', title: 'Location', sortable: true },
    {
      key: 'units',
      title: 'Total Units',
      sortable: true,
      render: (value: number) => `${value} units`,
    },
    {
      key: 'available',
      title: 'Available Units',
      sortable: true,
      render: (value: number) => `${value} units`,
    },
    { key: 'leads', title: 'Leads', sortable: true },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value: string) => (
        <Badge
          variant={
            value === 'Completed'
              ? 'success'
              : value === 'Under Construction'
                ? 'warning'
                : 'default'
          }
        >
          {value}
        </Badge>
      ),
    },
    {
      key: 'performance',
      title: 'Performance',
      sortable: true,
      render: (value: string) => (
        <Badge
          variant={
            value === 'High'
              ? 'success'
              : value === 'Medium'
                ? 'warning'
                : 'default'
          }
        >
          {value}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: any) => (
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSelectedDevelopment(record);
              setIsPreviewDevelopmentModalOpen(true);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSelectedDevelopment(record);
              setIsEditDevelopmentModalOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm">
            Feature
          </Button>
        </div>
      ),
    },
  ];

  // Leads data
  const [leadsData, setLeadsData] = useState([
    {
      id: 1,
      name: 'John Smith',
      development: 'Sandton Heights',
      contact: 'john@example.com',
      phone: '+27 82 123 4567',
      source: 'Organic',
      date: '2025-10-15',
      status: 'New',
      tags: 'First Time Buyer, High Budget',
      notes: 'Interested in 3-bedroom units',
      communicationHistory:
        'Initial inquiry about Sandton Heights (Email on 2025-10-15)',
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      development: 'Cape Residences',
      contact: 'sarah@example.com',
      phone: '+27 83 987 6543',
      source: 'Paid Ad',
      date: '2025-10-14',
      status: 'Contacted',
      tags: 'Investor, Quick Decision',
      notes: 'Looking for rental investment opportunities',
      communicationHistory:
        'Initial inquiry (Email on 2025-10-14), Call (2025-10-15)',
    },
    {
      id: 3,
      name: 'Mike Williams',
      development: 'Durban Waterfront',
      contact: 'mike@example.com',
      phone: '+27 72 555 1234',
      source: 'Referral',
      date: '2025-10-14',
      status: 'Qualified',
      tags: 'Repeat Customer, Premium Buyer',
      notes: 'Previously purchased unit in Sandton Heights',
      communicationHistory:
        'Referral (Email on 2025-10-14), Call (2025-10-15), Meeting (2025-10-16)',
    },
  ]);

  const leadsColumns = [
    { key: 'name', title: 'Lead Name', sortable: true },
    { key: 'development', title: 'Development', sortable: true },
    { key: 'contact', title: 'Email', sortable: true },
    { key: 'phone', title: 'Phone', sortable: true },
    { key: 'source', title: 'Source', sortable: true },
    { key: 'date', title: 'Date', sortable: true },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value: string) => (
        <Badge
          variant={
            value === 'New'
              ? 'default'
              : value === 'Contacted'
                ? 'warning'
                : 'success'
          }
        >
          {value}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: any) => (
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSelectedLead(record);
              setIsLeadDetailModalOpen(true);
            }}
          >
            View
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleUpdateLeadStatus(record.id, 'Contacted')}
          >
            Mark Contacted
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSetFollowUp(record.id)}
          >
            Follow Up
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Developer Dashboard
            </h1>
            <p className="text-slate-600">
              Manage your developments, track leads, and analyze performance
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsCreateDevelopmentModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Development
          </Button>
        </div>
      </div>

      {/* Dashboard Tabs */}
      <div className="mb-6">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('developments')}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'developments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              My Developments
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'leads'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Leads & Inquiries
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('marketing')}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'marketing'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Marketing
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'billing'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Billing
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'support'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Support
            </button>
          </nav>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-6">
            {developerStats.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Traffic Chart */}
            <div className="card p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Page Views & Leads
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={trafficData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="views" fill="#3b82f6" name="Page Views" />
                    <Bar dataKey="leads" fill="#10b981" name="Leads" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Conversion Rate Chart */}
            <div className="card p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Conversion Rate
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={conversionData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="#8b5cf6"
                      activeDot={{ r: 8 }}
                      name="Conversion %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Lead Growth Chart */}
            <div className="card p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Lead Growth
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={leadGrowthData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="leads" fill="#f59e0b" name="Leads" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Traffic Sources Chart */}
            <div className="card p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Traffic Sources
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={trafficSourcesData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {trafficSourcesData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Activity and Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2 card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">
                  Recent Activity
                </h2>
                <Button variant="secondary" size="sm">
                  View All
                </Button>
              </div>
              <div className="space-y-4">
                {recentActivity.map(activity => (
                  <div key={activity.id} className="flex items-start">
                    <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                      <Bell className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-slate-900">
                        {activity.user}
                      </p>
                      <p className="text-sm text-slate-600">
                        {activity.action}
                      </p>
                      <p className="text-xs text-slate-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Quick Actions
              </h2>
              <div className="space-y-3">
                <Button variant="secondary" className="w-full justify-start">
                  <Building2 className="h-4 w-4 mr-2" />
                  Add New Development
                </Button>
                <Button variant="secondary" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics Report
                </Button>
                <Button variant="secondary" className="w-full justify-start">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Check Messages
                </Button>
                <Button variant="secondary" className="w-full justify-start">
                  <CreditCard className="h-4 w-4 mr-2" />
                  View Billing
                </Button>
                <Button variant="secondary" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Marketing Resources
                </Button>
                <Button variant="secondary" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Account Settings
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Developments Tab */}
      {activeTab === 'developments' && (
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              My Developments
            </h2>
            <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search developments..."
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <select className="text-sm border border-slate-300 rounded-lg px-3 py-2">
                <option>All Statuses</option>
                <option>Planning</option>
                <option>Under Construction</option>
                <option>Completed</option>
              </select>
              <Button variant="secondary" size="sm">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Table
            data={developmentsData}
            columns={developmentsColumns}
            loading={false}
          />
        </div>
      )}

      {/* Leads Tab */}
      {activeTab === 'leads' && (
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Leads & Inquiries
            </h2>
            <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <select className="text-sm border border-slate-300 rounded-lg px-3 py-2">
                <option>All Developments</option>
                <option>Sandton Heights</option>
                <option>Cape Residences</option>
                <option>Durban Waterfront</option>
              </select>
              <select className="text-sm border border-slate-300 rounded-lg px-3 py-2">
                <option>All Sources</option>
                <option>Organic</option>
                <option>Paid Ad</option>
                <option>Referral</option>
                <option>Social Media</option>
              </select>
              <select className="text-sm border border-slate-300 rounded-lg px-3 py-2">
                <option>All Statuses</option>
                <option>New</option>
                <option>Contacted</option>
                <option>Qualified</option>
              </select>
              <Button variant="secondary" size="sm" onClick={handleExportLeads}>
                Export
              </Button>
            </div>
          </div>
          <Table data={leadsData} columns={leadsColumns} loading={false} />
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Analytics Dashboard
            </h2>
            <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
              <select
                className="text-sm border border-slate-300 rounded-lg px-3 py-2"
                value={analyticsFilters.dateRange}
                onChange={e => handleFilterChange('dateRange', e.target.value)}
              >
                <option value="last7days">Last 7 Days</option>
                <option value="last30days">Last 30 Days</option>
                <option value="last90days">Last 90 Days</option>
                <option value="yearToDate">Year to Date</option>
              </select>
              <select
                className="text-sm border border-slate-300 rounded-lg px-3 py-2"
                value={analyticsFilters.development}
                onChange={e =>
                  handleFilterChange('development', e.target.value)
                }
              >
                <option value="all">All Developments</option>
                <option value="sandton-heights">Sandton Heights</option>
                <option value="cape-residences">Cape Residences</option>
                <option value="durban-waterfront">Durban Waterfront</option>
              </select>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadReport}
              >
                Download Report
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Traffic Chart */}
            <div className="card p-4">
              <h3 className="font-medium text-slate-900 mb-4">
                Page Views & Leads
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={trafficData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="views" fill="#3b82f6" name="Page Views" />
                    <Bar dataKey="leads" fill="#10b981" name="Leads" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Conversion Rate Chart */}
            <div className="card p-4">
              <h3 className="font-medium text-slate-900 mb-4">
                Conversion Rate
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={conversionData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="#8b5cf6"
                      activeDot={{ r: 8 }}
                      name="Conversion %"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Traffic Sources Chart */}
            <div className="card p-4">
              <h3 className="font-medium text-slate-900 mb-4">
                Traffic Sources
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={trafficSourcesData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {trafficSourcesData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ad Performance Chart */}
            <div className="card p-4">
              <h3 className="font-medium text-slate-900 mb-4">
                Ad Performance
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={adPerformanceData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="clicks"
                      fill="#0ea5e9"
                      name="Clicks"
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="conversions"
                      fill="#84cc16"
                      name="Conversions"
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="cost"
                      fill="#f97316"
                      name="Cost (R)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Marketing Tab */}
      {activeTab === 'marketing' && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">
            Marketing Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="card p-5">
              <div className="bg-blue-100 p-3 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">
                Featured Listings
              </h3>
              <p className="text-slate-600 text-sm mb-4">
                Promote your developments to reach more potential buyers.
              </p>
              <Button variant="primary" size="sm">
                Manage
              </Button>
            </div>
            <div className="card p-5">
              <div className="bg-green-100 p-3 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Ad Campaigns</h3>
              <p className="text-slate-600 text-sm mb-4">
                Create and manage targeted advertising campaigns.
              </p>
              <Button variant="primary" size="sm">
                Create
              </Button>
            </div>
            <div className="card p-5">
              <div className="bg-purple-100 p-3 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">
                Social Media Boost
              </h3>
              <p className="text-slate-600 text-sm mb-4">
                Amplify your developments on our social channels.
              </p>
              <Button variant="primary" size="sm">
                Boost
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Development Modal */}
      {isCreateDevelopmentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-900">
                Add New Development
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Development Name *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="e.g., Sandton Heights"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="e.g., Sandton, Johannesburg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Total Units *
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="e.g., 120"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Price Range *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="e.g., R 1.2M - R 3.5M"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="Describe your development..."
                  ></textarea>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Amenities
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="e.g., Swimming Pool, Gym, Parking, Security"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Media Upload
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Plus className="h-8 w-8 text-slate-400" />
                      <p className="text-slate-600">
                        Drag and drop images or click to upload
                      </p>
                      <p className="text-xs text-slate-500">
                        Supports JPG, PNG, PDF up to 10MB
                      </p>
                      <Button variant="secondary" size="sm" className="mt-2">
                        Select Files
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 sticky bottom-0 bg-white z-10 flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setIsCreateDevelopmentModalOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="primary">Create Development</Button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {isLeadDetailModalOpen && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                Lead Details: {selectedLead.name}
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsLeadDetailModalOpen(false)}
              >
                Close
              </Button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="card p-4">
                  <h4 className="font-bold text-slate-900 mb-3">
                    Contact Information
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-600">Name</p>
                      <p className="font-medium">{selectedLead.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Email</p>
                      <p className="font-medium">{selectedLead.contact}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Phone</p>
                      <p className="font-medium">{selectedLead.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Development</p>
                      <p className="font-medium">{selectedLead.development}</p>
                    </div>
                  </div>
                </div>
                <div className="card p-4">
                  <h4 className="font-bold text-slate-900 mb-3">
                    Lead Information
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-600">Status</p>
                      <Badge
                        variant={
                          selectedLead.status === 'New'
                            ? 'default'
                            : selectedLead.status === 'Contacted'
                              ? 'warning'
                              : 'success'
                        }
                      >
                        {selectedLead.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Source</p>
                      <p className="font-medium">{selectedLead.source}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Date</p>
                      <p className="font-medium">{selectedLead.date}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Tags</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedLead.tags &&
                          selectedLead.tags
                            .split(', ')
                            .map((tag: string, index: number) => (
                              <Badge key={index} variant="default">
                                {tag}
                              </Badge>
                            ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card p-4 mb-6">
                <h4 className="font-bold text-slate-900 mb-3">Notes</h4>
                <p className="text-slate-700">{selectedLead.notes}</p>
              </div>
              <div className="card p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-slate-900">
                    Communication History
                  </h4>
                  <Button variant="secondary" size="sm">
                    Add Communication
                  </Button>
                </div>
                <div className="space-y-3">
                  {selectedLead.communicationHistory &&
                    selectedLead.communicationHistory
                      .split(', ')
                      .map((item: string, index: number) => (
                        <div
                          key={index}
                          className="border-l-2 border-blue-500 pl-3 py-1"
                        >
                          <p className="text-sm font-medium">{item}</p>
                        </div>
                      ))}
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-slate-200 flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  onClick={() =>
                    handleUpdateLeadStatus(selectedLead.id, 'Contacted')
                  }
                >
                  Mark as Contacted
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleSetFollowUp(selectedLead.id)}
                >
                  Set Follow-up
                </Button>
                <Button variant="secondary">Add Tag</Button>
                <Button variant="secondary">Export Lead</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Development Modal */}
      {isEditDevelopmentModalOpen && selectedDevelopment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-900">
                Edit Development: {selectedDevelopment.name}
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Development Name *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="e.g., Sandton Heights"
                    defaultValue={selectedDevelopment.name}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="e.g., Sandton, Johannesburg"
                    defaultValue={selectedDevelopment.location}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Total Units *
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="e.g., 120"
                    defaultValue={selectedDevelopment.units}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Price Range *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="e.g., R 1.2M - R 3.5M"
                    defaultValue={selectedDevelopment.priceRange}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="Describe your development..."
                    defaultValue={selectedDevelopment.description}
                  ></textarea>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Amenities
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="e.g., Swimming Pool, Gym, Parking, Security"
                    defaultValue={selectedDevelopment.amenities}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Media
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-100 h-24 flex items-center justify-center">
                        <img
                          src="/placeholder-image.jpg"
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="p-2 flex justify-between items-center">
                        <span className="text-xs text-slate-600 truncate">
                          sandton1.jpg
                        </span>
                        <Button variant="danger" size="sm">
                          Remove
                        </Button>
                      </div>
                    </div>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-100 h-24 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-slate-400" />
                      </div>
                      <div className="p-2 flex justify-between items-center">
                        <span className="text-xs text-slate-600 truncate">
                          brochure.pdf
                        </span>
                        <Button variant="danger" size="sm">
                          Remove
                        </Button>
                      </div>
                    </div>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center p-4">
                      <Plus className="h-6 w-6 text-slate-400" />
                      <span className="text-xs text-slate-500 mt-1">
                        Add Media
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 sticky bottom-0 bg-white z-10 flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setIsEditDevelopmentModalOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="primary">Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Billing & Subscription
            </h2>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleUpgradePlan('premium')}
            >
              Upgrade Plan
            </Button>
          </div>

          {/* Pricing Plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Free Plan */}
            <div className="card p-6 border border-slate-200 rounded-lg">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Free</h3>
              <p className="text-3xl font-bold text-slate-900 mb-4">
                R 0
                <span className="text-lg font-normal text-slate-600">
                  /month
                </span>
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-slate-600">Up to 2 developments</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-slate-600">Basic analytics</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-slate-600">Email support</span>
                </li>
              </ul>
              <Button
                variant="secondary"
                className="w-full"
                disabled={subscriptionPlan === 'free'}
              >
                {subscriptionPlan === 'free' ? 'Current Plan' : 'Select Plan'}
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="card p-6 border-2 border-blue-500 rounded-lg relative">
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                POPULAR
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Pro</h3>
              <p className="text-3xl font-bold text-slate-900 mb-4">
                R 499
                <span className="text-lg font-normal text-slate-600">
                  /month
                </span>
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-slate-600">Up to 10 developments</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-slate-600">Advanced analytics</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-slate-600">Priority support</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-slate-600">Marketing tools</span>
                </li>
              </ul>
              <Button
                variant="primary"
                className="w-full"
                disabled={subscriptionPlan === 'pro'}
              >
                {subscriptionPlan === 'pro' ? 'Current Plan' : 'Select Plan'}
              </Button>
            </div>

            {/* Premium Plan */}
            <div className="card p-6 border border-slate-200 rounded-lg">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Premium</h3>
              <p className="text-3xl font-bold text-slate-900 mb-4">
                R 999
                <span className="text-lg font-normal text-slate-600">
                  /month
                </span>
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-slate-600">Unlimited developments</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-slate-600">Premium analytics</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-slate-600">24/7 dedicated support</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-slate-600">
                    Advanced marketing tools
                  </span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-slate-600">Custom branding</span>
                </li>
              </ul>
              <Button
                variant="secondary"
                className="w-full"
                disabled={subscriptionPlan === 'premium'}
              >
                {subscriptionPlan === 'premium'
                  ? 'Current Plan'
                  : 'Select Plan'}
              </Button>
            </div>
          </div>

          {/* Billing History */}
          <div className="card p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Billing History
            </h3>
            <Table
              data={[
                {
                  id: 1,
                  date: '2025-10-01',
                  description: 'Pro Plan Subscription',
                  amount: 'R 499.00',
                  status: 'Paid',
                },
                {
                  id: 2,
                  date: '2025-09-01',
                  description: 'Pro Plan Subscription',
                  amount: 'R 499.00',
                  status: 'Paid',
                },
                {
                  id: 3,
                  date: '2025-08-01',
                  description: 'Pro Plan Subscription',
                  amount: 'R 499.00',
                  status: 'Paid',
                },
                {
                  id: 4,
                  date: '2025-07-01',
                  description: 'Pro Plan Subscription',
                  amount: 'R 499.00',
                  status: 'Paid',
                },
              ]}
              columns={[
                { key: 'date', title: 'Date' },
                { key: 'description', title: 'Description' },
                { key: 'amount', title: 'Amount' },
                {
                  key: 'status',
                  title: 'Status',
                  render: (value: string) => (
                    <Badge variant={value === 'Paid' ? 'success' : 'default'}>
                      {value}
                    </Badge>
                  ),
                },
                {
                  key: 'actions',
                  title: 'Actions',
                  render: (_: any, record: any) => (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDownloadInvoice(record.id)}
                    >
                      Download
                    </Button>
                  ),
                },
              ]}
            />
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Developer Profile
            </h2>
            <div className="flex space-x-2 mt-2 md:mt-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleOpenTeamManagement}
              >
                Manage Team
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenProfileEditor}
              >
                Edit Profile
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="lg:col-span-1 card p-6">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-slate-600">JD</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  John Developer
                </h3>
                <p className="text-slate-600 mb-2">Premium Developer</p>
                <Badge variant="success" className="mb-4">
                  Verified
                </Badge>
                <p className="text-slate-600 text-sm">Member since Jan 2024</p>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600">Email</p>
                  <p className="font-medium">john@developer.co.za</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Phone</p>
                  <p className="font-medium">+27 12 345 6789</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Company</p>
                  <p className="font-medium">Developer Properties Ltd</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Website</p>
                  <p className="font-medium text-blue-600">
                    www.developer.co.za
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Bio</p>
                  <p className="font-medium">
                    Specializing in luxury residential developments in major
                    South African cities.
                  </p>
                </div>
              </div>
            </div>

            {/* Activity & Stats */}
            <div className="lg:col-span-2">
              <div className="card p-6 mb-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">
                  Performance Metrics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard
                    label="Total Developments"
                    value="12"
                    change="+2 this month"
                    icon={<Building2 className="h-6 w-6 text-blue-600" />}
                    color="bg-blue-100"
                  />
                  <StatCard
                    label="Active Leads"
                    value="248"
                    change="+32 this month"
                    icon={<Users className="h-6 w-6 text-green-600" />}
                    color="bg-green-100"
                  />
                  <StatCard
                    label="Units Sold"
                    value="47"
                    change="+8 this month"
                    icon={<TrendingUp className="h-6 w-6 text-purple-600" />}
                    color="bg-purple-100"
                  />
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">
                  Recent Activity
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-slate-900">
                        Added new development: Sandton Heights
                      </p>
                      <p className="text-xs text-slate-500">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-slate-900">
                        Received 3 new leads
                      </p>
                      <p className="text-xs text-slate-500">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-slate-900">
                        Subscription payment processed
                      </p>
                      <p className="text-xs text-slate-500">3 days ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support Tab */}
      {activeTab === 'support' && (
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Support & Resources
            </h2>
            <Button variant="primary" size="sm" onClick={handleOpenSupport}>
              Contact Support
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* FAQ Section */}
            <div className="card p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Frequently Asked Questions
              </h3>
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-4">
                  <h4 className="font-medium text-slate-900 mb-2">
                    How do I add a new development?
                  </h4>
                  <p className="text-slate-600 text-sm">
                    Navigate to the 'My Developments' tab and click the 'Add
                    Development' button. Fill in all required details and
                    submit.
                  </p>
                </div>
                <div className="border-b border-slate-200 pb-4">
                  <h4 className="font-medium text-slate-900 mb-2">
                    How can I upgrade my subscription?
                  </h4>
                  <p className="text-slate-600 text-sm">
                    Go to the 'Billing' tab and select a new plan. You'll be
                    charged a prorated amount for the remainder of your billing
                    cycle.
                  </p>
                </div>
                <div className="border-b border-slate-200 pb-4">
                  <h4 className="font-medium text-slate-900 mb-2">
                    How do I track lead conversions?
                  </h4>
                  <p className="text-slate-600 text-sm">
                    Visit the 'Analytics' tab to view detailed reports on lead
                    sources, conversion rates, and performance metrics.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">
                    Where can I find marketing resources?
                  </h4>
                  <p className="text-slate-600 text-sm">
                    Check the 'Marketing' tab for templates, guides, and tools
                    to help promote your developments.
                  </p>
                </div>
              </div>
            </div>

            {/* Tutorials Section */}
            <div className="card p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Tutorials & Guides
              </h3>
              <div className="space-y-4">
                <div className="flex items-start p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">
                      Getting Started Guide
                    </h4>
                    <p className="text-slate-600 text-sm">
                      Learn the basics of the developer dashboard
                    </p>
                  </div>
                </div>
                <div className="flex items-start p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center mr-3">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">
                      Analytics Dashboard Tutorial
                    </h4>
                    <p className="text-slate-600 text-sm">
                      Understanding your performance metrics
                    </p>
                  </div>
                </div>
                <div className="flex items-start p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center mr-3">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">
                      Lead Management Best Practices
                    </h4>
                    <p className="text-slate-600 text-sm">
                      Maximize your conversion rates
                    </p>
                  </div>
                </div>
                <div className="flex items-start p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center mr-3">
                    <CreditCard className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">
                      Billing & Subscription Guide
                    </h4>
                    <p className="text-slate-600 text-sm">
                      Managing your account and payments
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messaging Modal */}
      {isMessagingModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Messages</h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCloseMessaging}
              >
                Close
              </Button>
            </div>
            <div className="p-6">
              <div className="mb-4 h-80 overflow-y-auto bg-slate-50 rounded-lg p-4">
                <div className="space-y-4">
                  <div className="flex justify-start">
                    <div className="max-w-xs bg-white rounded-lg p-3 shadow">
                      <p className="text-sm">
                        Hi there! I'm interested in your Sandton Heights
                        development.
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Sarah Johnson - 10:30 AM
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-xs bg-blue-100 rounded-lg p-3 shadow">
                      <p className="text-sm">
                        Thank you for your interest! I'd be happy to provide
                        more details. When would you like to schedule a viewing?
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        You - 10:32 AM
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-xs bg-white rounded-lg p-3 shadow">
                      <p className="text-sm">How about tomorrow at 2 PM?</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Sarah Johnson - 10:35 AM
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-l-lg"
                  placeholder="Type your message..."
                />
                <Button variant="primary" className="rounded-l-none">
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Editor Modal */}
      {isProfileEditorOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Edit Profile</h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCloseProfileEditor}
              >
                Close
              </Button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="md:col-span-2 flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-slate-600">
                      JD
                    </span>
                  </div>
                  <Button variant="secondary" size="sm">
                    Upload Logo
                  </Button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    defaultValue="John Developer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    defaultValue="Developer Properties Ltd"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    defaultValue="john@developer.co.za"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    defaultValue="+27 12 345 6789"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    defaultValue="https://www.developer.co.za"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    defaultValue="Specializing in luxury residential developments in major South African cities."
                  ></textarea>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <Button variant="secondary" onClick={handleCloseProfileEditor}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSaveProfile}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Management Modal */}
      {isTeamManagementOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                Team Management
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCloseTeamManagement}
              >
                Close
              </Button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-slate-900">Team Members</h4>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleInviteTeamMember}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Invite Member
                  </Button>
                </div>
                <Table
                  data={[
                    {
                      id: 1,
                      name: 'John Developer',
                      email: 'john@developer.co.za',
                      role: 'Owner',
                      status: 'Active',
                    },
                    {
                      id: 2,
                      name: 'Sarah Manager',
                      email: 'sarah@developer.co.za',
                      role: 'Manager',
                      status: 'Active',
                    },
                    {
                      id: 3,
                      name: 'Mike Agent',
                      email: 'mike@developer.co.za',
                      role: 'Agent',
                      status: 'Active',
                    },
                  ]}
                  columns={[
                    { key: 'name', title: 'Name' },
                    { key: 'email', title: 'Email' },
                    { key: 'role', title: 'Role' },
                    {
                      key: 'status',
                      title: 'Status',
                      render: (value: string) => (
                        <Badge
                          variant={value === 'Active' ? 'success' : 'default'}
                        >
                          {value}
                        </Badge>
                      ),
                    },
                    {
                      key: 'actions',
                      title: 'Actions',
                      render: () => (
                        <div className="flex space-x-2">
                          <Button variant="secondary" size="sm">
                            Edit
                          </Button>
                          <Button variant="danger" size="sm">
                            Remove
                          </Button>
                        </div>
                      ),
                    },
                  ]}
                />
              </div>

              <div>
                <h4 className="font-medium text-slate-900 mb-4">
                  Invite Team Member
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="team@developer.co.za"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Role
                    </label>
                    <select className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                      <option>Agent</option>
                      <option>Manager</option>
                      <option>Viewer</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <Button variant="primary">Send Invitation</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support Modal */}
      {isSupportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                Contact Support
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCloseSupport}
              >
                Close
              </Button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Brief description of your issue"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Category
                </label>
                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  <option>Billing</option>
                  <option>Technical Issue</option>
                  <option>Feature Request</option>
                  <option>Account Management</option>
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={6}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Please provide detailed information about your issue or question..."
                ></textarea>
              </div>
              <div className="flex justify-end">
                <Button variant="primary" onClick={handleSubmitSupportTicket}>
                  Submit Ticket
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Development Modal */}
      {isPreviewDevelopmentModalOpen && selectedDevelopment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                Development Preview: {selectedDevelopment.name}
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsPreviewDevelopmentModalOpen(false)}
              >
                Close
              </Button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <div className="bg-slate-200 h-64 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-slate-500">
                    Development Image Gallery
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="success">{selectedDevelopment.status}</Badge>
                  <Badge variant="default">
                    {selectedDevelopment.units} Units
                  </Badge>
                  <Badge variant="warning">
                    {selectedDevelopment.available} Available
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">Details</h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-slate-600">Location</p>
                      <p className="font-medium">
                        {selectedDevelopment.location}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Price Range</p>
                      <p className="font-medium">
                        {selectedDevelopment.priceRange}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Amenities</p>
                      <p className="font-medium">
                        {selectedDevelopment.amenities}
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">Description</h4>
                  <p className="text-slate-700">
                    {selectedDevelopment.description}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-slate-200">
                <h4 className="font-bold text-slate-900 mb-4">
                  Lead Capture Form Preview
                </h4>
                <div className="card p-4 max-w-md">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        placeholder="+27 12 345 6789"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Message
                      </label>
                      <textarea
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        placeholder="I'm interested in this development..."
                      ></textarea>
                    </div>
                    <Button variant="primary" className="w-full">
                      Submit Interest
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyDevelopersDashboard;
