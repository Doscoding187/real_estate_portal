import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import StatCard from '../components/common/StatCard';
import Table from '../components/common/Table';
import PropertyStatsCard from '../components/common/PropertyStatsCard';

// Icons (using simple SVG components)
const MenuIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const BellIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const SearchIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const PlusIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const XIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const DeveloperDashboard: React.FC = () => { // Padding fix applied
  // State for active tab
  const [activeTab, setActiveTab] = useState('overview');
  
  // State for modals
  const [isCreateDevelopmentModalOpen, setIsCreateDevelopmentModalOpen] = useState(false);
  const [isViewLeadModalOpen, setIsViewLeadModalOpen] = useState(false);
  const [isTeamManagementModalOpen, setIsTeamManagementModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  
  // Mock data
  const statsData = [
    { title: 'Total Developments', value: '24', change: '+12%', icon: '🏢' },
    { title: 'Active Leads', value: '142', change: '+8%', icon: '👥' },
    { title: 'Revenue', value: '$1.2M', change: '+15%', icon: '💰' },
    { title: 'Conversion Rate', value: '24.3%', change: '+3.2%', icon: '📈' },
  ];

  // Property statistics data
  const propertyStatsData = [
    { title: 'Apartments', value: '127 Units', percentage: '+40%', color: 'bg-blue-50', icon: 'apartment' as const },
    { title: 'Houses', value: '93 Units', percentage: '+20%', color: 'bg-green-50', icon: 'house' as const },
    { title: 'Commercial', value: '8 Units', percentage: '+15%', color: 'bg-amber-50', icon: 'building' as const },
  ];
  
  const developmentsData = [
    { id: 1, name: 'Skyline Towers', location: 'Downtown', units: 120, status: 'In Progress', progress: 65 },
    { id: 2, name: 'Green Valley', location: 'Suburbs', units: 85, status: 'Planning', progress: 20 },
    { id: 3, name: 'Harbor View', location: 'Waterfront', units: 210, status: 'Completed', progress: 100 },
    { id: 4, name: 'Mountain Ridge', location: 'Uptown', units: 65, status: 'In Progress', progress: 40 },
  ];
  
  const leadsData = [
    { id: 1, name: 'John Smith', email: 'john@example.com', phone: '(555) 123-4567', status: 'Hot', source: 'Website', date: '2023-06-15' },
    { id: 2, name: 'Sarah Johnson', email: 'sarah@example.com', phone: '(555) 987-6543', status: 'Warm', source: 'Referral', date: '2023-06-14' },
    { id: 3, name: 'Michael Brown', email: 'michael@example.com', phone: '(555) 456-7890', status: 'Cold', source: 'Social Media', date: '2023-06-12' },
    { id: 4, name: 'Emily Davis', email: 'emily@example.com', phone: '(555) 234-5678', status: 'Hot', source: 'Event', date: '2023-06-10' },
  ];
  
  const salesData = [
    { month: 'Jan', revenue: 4000, leads: 24 },
    { month: 'Feb', revenue: 3000, leads: 13 },
    { month: 'Mar', revenue: 2000, leads: 18 },
    { month: 'Apr', revenue: 2780, leads: 21 },
    { month: 'May', revenue: 1890, leads: 15 },
    { month: 'Jun', revenue: 2390, leads: 22 },
  ];
  
  const statusColors: Record<string, 'success' | 'warning' | 'danger' | 'primary' | 'default'> = {
    'Completed': 'success',
    'In Progress': 'warning',
    'Planning': 'primary',
    'Hot': 'danger',
    'Warm': 'warning',
    'Cold': 'default',
  };
  
  // Handler functions
  const handleCreateDevelopment = () => {
    setIsCreateDevelopmentModalOpen(true);
  };
  
  const handleCloseCreateDevelopment = () => {
    setIsCreateDevelopmentModalOpen(false);
  };
  
  const handleViewLead = () => {
    setIsViewLeadModalOpen(true);
  };
  
  const handleCloseViewLead = () => {
    setIsViewLeadModalOpen(false);
  };
  
  const handleManageTeam = () => {
    setIsTeamManagementModalOpen(true);
  };
  
  const handleCloseTeamManagement = () => {
    setIsTeamManagementModalOpen(false);
  };
  
  const handleContactSupport = () => {
    setIsSupportModalOpen(true);
  };
  
  const handleCloseSupport = () => {
    setIsSupportModalOpen(false);
  };
  
  const handleSubmitSupportTicket = () => {
    // Handle support ticket submission
    console.log('Support ticket submitted');
    handleCloseSupport();
  };
  
  const handleInviteTeamMember = () => {
    // Handle team member invitation
    console.log('Team member invited');
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-slate-800">PropertyDev Dashboard</h1>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            <li>
              <button 
                onClick={() => setActiveTab('overview')}
                className={`w-full text-left px-4 py-2 rounded-md ${activeTab === 'overview' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Dashboard Overview
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('developments')}
                className={`w-full text-left px-4 py-2 rounded-md ${activeTab === 'developments' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Developments
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('leads')}
                className={`w-full text-left px-4 py-2 rounded-md ${activeTab === 'leads' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Leads & Inquiries
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('analytics')}
                className={`w-full text-left px-4 py-2 rounded-md ${activeTab === 'analytics' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Analytics & Reports
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('marketing')}
                className={`w-full text-left px-4 py-2 rounded-md ${activeTab === 'marketing' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Marketing Tools
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('billing')}
                className={`w-full text-left px-4 py-2 rounded-md ${activeTab === 'billing' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Billing & Subscription
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('profile')}
                className={`w-full text-left px-4 py-2 rounded-md ${activeTab === 'profile' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Developer Profile
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('support')}
                className={`w-full text-left px-4 py-2 rounded-md ${activeTab === 'support' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Support & Resources
              </button>
            </li>
          </ul>
        </nav>
        <div className="p-4 border-t">
          <button 
            onClick={handleManageTeam}
            className="w-full text-left px-4 py-2 rounded-md text-slate-600 hover:bg-slate-100"
          >
            Team Management
          </button>
          <button 
            onClick={handleContactSupport}
            className="w-full text-left px-4 py-2 rounded-md text-slate-600 hover:bg-slate-100"
          >
            Contact Support
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center">
              <button className="mr-4 text-slate-500">
                <MenuIcon />
              </button>
              <h2 className="text-lg font-semibold text-slate-800">Developer Dashboard</h2>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search"
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="absolute left-3 top-2.5 text-slate-400">
                  <SearchIcon />
                </div>
              </div>
              <button className="text-slate-500">
                <BellIcon />
              </button>
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">JD</span>
                </div>
                <span className="ml-2 text-sm font-medium text-slate-700">John Developer</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
                <p className="text-slate-600">Welcome back! Here's what's happening with your developments today.</p>
              </div>
              
              {/* Property Statistics Cards */}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Property Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {propertyStatsData.map((stat, index) => (
                    <PropertyStatsCard
                      key={index}
                      title={stat.title}
                      value={stat.value}
                      percentage={stat.percentage}
                      color={stat.color}
                      icon={stat.icon}
                      onClick={() => console.log(`Clicked on ${stat.title}`)}
                    />
                  ))}
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {statsData.map((stat, index) => (
                  <StatCard 
                    key={index}
                    label={stat.title}
                    value={stat.value}
                    change={stat.change}
                    icon={stat.icon}
                    color="bg-white"
                  />
                ))}
              </div>
              
              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Revenue Overview</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="revenue" fill="#3b82f6" name="Revenue ($)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Leads Conversion</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={salesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="leads" stroke="#10b981" name="Leads" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              
              {/* Recent Developments */}
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Recent Developments</h3>
                  <Button variant="primary" onClick={handleCreateDevelopment}>
                    <PlusIcon />
                    <span className="ml-2">Add Development</span>
                  </Button>
                </div>
                <Table
                  columns={[
                    { key: 'name', title: 'Development Name' },
                    { key: 'location', title: 'Location' },
                    { key: 'units', title: 'Units' },
                    { key: 'status', title: 'Status', render: (value) => <Badge variant={statusColors[value] || 'default'}>{value}</Badge> },
                    { key: 'progress', title: 'Progress', render: (value) => (
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${value}%` }}
                        ></div>
                      </div>
                    )},
                  ]}
                  data={developmentsData}
                />
              </div>
            </div>
          )}
          
          {/* Developments Tab */}
          {activeTab === 'developments' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Developments Management</h1>
                <p className="text-slate-600">Manage all your property developments in one place.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">All Developments</h3>
                  <Button variant="primary" onClick={handleCreateDevelopment}>
                    <PlusIcon />
                    <span className="ml-2">Add Development</span>
                  </Button>
                </div>
                <div className="p-4"><Table 
                  columns={[
                    { key: 'name', title: 'Development Name' },
                    { key: 'location', title: 'Location' },
                    { key: 'units', title: 'Units' },
                    { key: 'status', title: 'Status', render: (value) => <Badge variant={statusColors[value] || 'default'}>{value}</Badge> },
                    { key: 'progress', title: 'Progress', render: (value) => (
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${value}%` }}
                        ></div>
                      </div>
                    )},
                  ]}
                  data={developmentsData}
                />
              </div>
            </div>
          )}
          
          {/* Leads Tab */}
          {activeTab === 'leads' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Leads & Inquiries</h1>
                <p className="text-slate-600">Track and manage all your potential customers.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">All Leads</h3>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Search leads"
                      className="px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button variant="primary">
                      <SearchIcon />
                    </Button>
                  </div>
                </div>
                <Table 
                  columns={[
                    { key: 'name', title: 'Name' },
                    { key: 'email', title: 'Email' },
                    { key: 'phone', title: 'Phone' },
                    { key: 'status', title: 'Status', render: (value) => <Badge variant={statusColors[value] || 'default'}>{value}</Badge> },
                    { key: 'source', title: 'Source' },
                    { key: 'date', title: 'Date' },
                    { key: 'actions', title: 'Actions', render: () => (
                      <Button variant="secondary" size="sm" onClick={handleViewLead}>
                        View
                      </Button>
                    )},
                  ]}
                  data={leadsData}
                />
              </div>
            </div>
          )}
          
          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Analytics & Reports</h1>
                <p className="text-slate-600">Gain insights into your business performance.</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Revenue Trends</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={salesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name="Revenue ($)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Lead Sources</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Website', value: 45 },
                            { name: 'Referral', value: 25 },
                            { name: 'Social Media', value: 15 },
                            { name: 'Events', value: 10 },
                            { name: 'Other', value: 5 },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {[
                            { name: 'Website', value: 45 },
                            { name: 'Referral', value: 25 },
                            { name: 'Social Media', value: 15 },
                            { name: 'Events', value: 10 },
                            { name: 'Other', value: 5 },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Performance Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard 
                    label="Conversion Rate"
                    value="24.3%"
                    change="+3.2%"
                    icon="ðŸ“ˆ"
                    color="bg-white"
                  />
                  <StatCard 
                    label="Avg. Deal Size"
                    value="$85,000"
                    change="+5.1%"
                    icon="ðŸ’°"
                    color="bg-white"
                  />
                  <StatCard 
                    label="Customer Retention"
                    value="87%"
                    change="+2.3%"
                    icon="ðŸ”„"
                    color="bg-white"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Marketing Tab */}
          {activeTab === 'marketing' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Marketing Tools</h1>
                <p className="text-slate-600">Promote your developments and attract more leads.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Email Campaigns</h3>
                  <p className="text-slate-600 mb-4">Create and send targeted email campaigns to your leads.</p>
                  <Button variant="primary" className="w-full">
                    Create Campaign
                  </Button>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Social Media</h3>
                  <p className="text-slate-600 mb-4">Schedule posts and track engagement across platforms.</p>
                  <Button variant="primary" className="w-full">
                    Schedule Post
                  </Button>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Virtual Tours</h3>
                  <p className="text-slate-600 mb-4">Create immersive virtual tours of your developments.</p>
                  <Button variant="primary" className="w-full">
                    Create Tour
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Billing & Subscription</h1>
                <p className="text-slate-600">Manage your subscription and payment information.</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Current Plan</h3>
                  <div className="border border-slate-200 rounded-lg p-6 mb-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-xl font-bold text-slate-900">Professional Plan</h4>
                        <p className="text-slate-600">$299/month</p>
                      </div>
                      <Badge variant="success">Active</Badge>
                    </div>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center">
                        <span className="text-green-500 mr-2">âœ“</span>
                        <span>Up to 50 developments</span>
                      </li>
                      <li className="flex items-center">
                        <span className="text-green-500 mr-2">âœ“</span>
                        <span>Unlimited leads</span>
                      </li>
                      <li className="flex items-center">
                        <span className="text-green-500 mr-2">âœ“</span>
                        <span>Advanced analytics</span>
                      </li>
                      <li className="flex items-center">
                        <span className="text-green-500 mr-2">âœ“</span>
                        <span>Priority support</span>
                      </li>
                    </ul>
                    <div className="flex space-x-3">
                      <Button variant="primary">Upgrade Plan</Button>
                      <Button variant="secondary">Cancel Subscription</Button>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Payment Method</h3>
                  <div className="border border-slate-200 rounded-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-3 rounded-lg mr-4">
                          <span className="text-blue-800 font-bold">VISA</span>
                        </div>
                        <div>
                          <p className="font-medium">Visa ending in 4242</p>
                          <p className="text-slate-600">Expires 12/2025</p>
                        </div>
                      </div>
                      <Button variant="secondary">Edit</Button>
                    </div>
                    <Button variant="outline" className="w-full">
                      Add Payment Method
                    </Button>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Billing History</h3>
                  <div className="space-y-4">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="flex justify-between items-center pb-4 border-b border-slate-100">
                        <div>
                          <p className="font-medium">Professional Plan</p>
                          <p className="text-sm text-slate-600">June 1, 2023</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">$299.00</p>
                          <Badge variant="success">Paid</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Developer Profile</h1>
                <p className="text-slate-600">Manage your company profile and settings.</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Company Information</h3>
                  <form className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Company Name</label>
                      <input
                        type="text"
                        className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2"
                        
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Email</label>
                      <input
                        type="email"
                        className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2"
                        
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Phone</label>
                      <input
                        type="tel"
                        className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2"
                        
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Address</label>
                      <textarea
                        className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2"
                        rows={3}
                        
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Website</label>
                      <input
                        type="url"
                        className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2"
                        
                      />
                    </div>
                    
                    <div className="flex space-x-3">
                      <Button variant="primary">Save Changes</Button>
                      <Button variant="secondary">Cancel</Button>
                    </div>
                  </form>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Profile Picture</h3>
                  <div className="flex flex-col items-center">
                    <div className="h-24 w-24 rounded-full bg-blue-500 flex items-center justify-center mb-4">
                      <span className="text-2xl font-medium text-white">SP</span>
                    </div>
                    <Button variant="outline" className="w-full mb-2">
                      Upload New
                    </Button>
                    <Button variant="secondary" className="w-full">
                      Remove
                    </Button>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-4">Branding</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Primary Color</label>
                      <div className="flex items-center mt-1">
                        <div className="h-8 w-8 rounded-md bg-blue-600 mr-2"></div>
                        <input
                          type="text"
                          className="flex-1 border border-slate-300 rounded-md shadow-sm p-2"
                          
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Logo</label>
                      <div className="border border-dashed border-slate-300 rounded-md p-4 text-center mt-1">
                        <p className="text-slate-500">No logo uploaded</p>
                        <Button variant="outline" size="sm" className="mt-2">
                          Upload Logo
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Support Tab */}
          {activeTab === 'support' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Support & Resources</h1>
                <p className="text-slate-600">Get help and access learning resources.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Help Center</h3>
                  <p className="text-slate-600 mb-4">Browse our knowledge base for answers to common questions.</p>
                  <Button variant="primary" className="w-full mb-4">
                    Browse Help Articles
                  </Button>
                  
                  <h4 className="font-medium text-slate-900 mt-6 mb-3">Popular Topics</h4>
                  <ul className="space-y-2">
                    <li><a href="#" className="text-blue-600 hover:underline">Getting Started Guide</a></li>
                    <li><a href="#" className="text-blue-600 hover:underline">Managing Developments</a></li>
                    <li><a href="#" className="text-blue-600 hover:underline">Lead Management Best Practices</a></li>
                    <li><a href="#" className="text-blue-600 hover:underline">Setting Up Marketing Campaigns</a></li>
                  </ul>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Support</h3>
                  <p className="text-slate-600 mb-4">Can't find what you're looking for? Our support team is here to help.</p>
                  <Button variant="primary" className="w-full mb-4" onClick={handleContactSupport}>
                    Submit Support Ticket
                  </Button>
                  
                  <h4 className="font-medium text-slate-900 mt-6 mb-3">Other Resources</h4>
                  <ul className="space-y-2">
                    <li><a href="#" className="text-blue-600 hover:underline">Video Tutorials</a></li>
                    <li><a href="#" className="text-blue-600 hover:underline">Webinars</a></li>
                    <li><a href="#" className="text-blue-600 hover:underline">API Documentation</a></li>
                    <li><a href="#" className="text-blue-600 hover:underline">Community Forum</a></li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </main>
        
        {/* Modals */}
        {/* Create Development Modal */}
        {isCreateDevelopmentModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-900">Add New Development</h3>
                  <button 
                    onClick={handleCloseCreateDevelopment}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    <XIcon />
                  </button>
                </div>
                
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Development Name</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2"
                      placeholder="Development name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Location</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2"
                      placeholder="Location"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Number of Units</label>
                    <input
                      type="number"
                      className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2"
                      placeholder="Number of units"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Status</label>
                    <select className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2">
                      <option>Planning</option>
                      <option>In Progress</option>
                      <option>Completed</option>
                    </select>
                  </div>
                  
                  <div className="mt-6 flex justify-end space-x-3">
                    <Button 
                      variant="secondary" 
                      onClick={handleCloseCreateDevelopment}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="primary" 
                      type="submit"
                    >
                      Create Development
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        
        {/* View Lead Modal */}
        {isViewLeadModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-900">Lead Details</h3>
                  <button 
                    onClick={handleCloseViewLead}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    <XIcon />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Name</label>
                      <p className="mt-1 text-slate-900">John Smith</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Email</label>
                      <p className="mt-1 text-slate-900">john@example.com</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Phone</label>
                      <p className="mt-1 text-slate-900">(555) 123-4567</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Status</label>
                      <p className="mt-1"><Badge variant="danger">Hot</Badge></p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Message</label>
                    <p className="mt-1 text-slate-900">
                      Interested in purchasing a 3-bedroom apartment in one of our upcoming developments.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Notes</label>
                    <textarea
                      className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2"
                      rows={3}
                      placeholder="Add notes"
                    />
                  </div>
                  
                  <div className="mt-6 flex justify-end space-x-3">
                    <Button 
                      variant="secondary" 
                      onClick={handleCloseViewLead}
                    >
                      Close
                    </Button>
                    <Button 
                      variant="primary"
                    >
                      Save Notes
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Team Management Modal */}
        {isTeamManagementModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-900">Team Management</h3>
                  <button 
                    onClick={handleCloseTeamManagement}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    <XIcon />
                  </button>
                </div>
                
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-slate-900 mb-4">Invite Team Member</h4>
                  <div className="flex">
                    <input
                      type="email"
                      className="flex-1 border border-slate-300 rounded-l-md p-2"
                      placeholder="Email address"
                    />
                    <Button variant="primary" className="rounded-l-none" onClick={handleInviteTeamMember}>
                      Invite
                    </Button>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-bold text-slate-900 mb-4">Team Members</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                          <span className="text-sm font-medium text-white">JD</span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-slate-900">John Developer</p>
                          <p className="text-xs text-slate-500">Admin</p>
                        </div>
                      </div>
                      <Button variant="secondary" size="sm">
                        Remove
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                          <span className="text-sm font-medium text-white">SJ</span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-slate-900">Sarah Johnson</p>
                          <p className="text-xs text-slate-500">Sales Manager</p>
                        </div>
                      </div>
                      <Button variant="secondary" size="sm">
                        Remove
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center">
                          <span className="text-sm font-medium text-white">MW</span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-slate-900">Mike Williams</p>
                          <p className="text-xs text-slate-500">Marketing</p>
                        </div>
                      </div>
                      <Button variant="secondary" size="sm">
                        Remove
                      </Button>
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
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-900">Contact Support</h3>
                  <button 
                    onClick={handleCloseSupport}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    <XIcon />
                  </button>
                </div>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmitSupportTicket();
                }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Subject</label>
                      <input
                        type="text"
                        className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2"
                        placeholder="Subject"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Category</label>
                      <select className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2">
                        <option>Billing</option>
                        <option>Technical Issue</option>
                        <option>Feature Request</option>
                        <option>Account Management</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Description</label>
                      <textarea
                        className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2"
                        placeholder="Describe your issue"
                        rows={5}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end space-x-3">
                    <Button 
                      variant="secondary" 
                      onClick={handleCloseSupport}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="primary" 
                      type="submit"
                    >
                      Submit Ticket
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeveloperDashboard;
