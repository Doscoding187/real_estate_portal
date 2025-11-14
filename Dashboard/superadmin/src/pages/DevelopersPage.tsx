import React, { useState } from 'react';
import {
  Plus,
  Building2,
  CheckCircle,
  Clock,
  TrendingUp,
  Eye,
  Edit,
  FileCheck,
} from 'lucide-react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';

const DevelopersPage: React.FC = () => {
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [selectedDeveloper, setSelectedDeveloper] = useState<Record<
    string,
    React.ReactNode
  > | null>(null);

  // Developer dashboard cards data
  const developerStats = [
    {
      title: 'Total Developers',
      value: '24',
      change: '+3 this month',
      icon: <Building2 className="h-6 w-6 text-blue-600" />,
      color: 'bg-blue-100',
    },
    {
      title: 'Active Projects',
      value: '67',
      change: '+8 this month',
      icon: <TrendingUp className="h-6 w-6 text-green-600" />,
      color: 'bg-green-100',
    },
    {
      title: 'Total Units Listed',
      value: '2,847',
      change: '+142 this month',
      icon: <TrendingUp className="h-6 w-6 text-purple-600" />,
      color: 'bg-purple-100',
    },
    {
      title: 'Developer Revenue',
      value: 'R 124,500',
      change: '+15.2%',
      icon: <TrendingUp className="h-6 w-6 text-cyan-600" />,
      color: 'bg-cyan-100',
    },
  ];

  // Developer table data
  const developerData: Record<string, React.ReactNode>[] = [
    {
      id: 1,
      name: 'Century Properties',
      registration: '2025/123456/07',
      subscription: 'Premium',
      projects: 5,
      units: 240,
      soldRented: 180,
      status: 'Active',
      joined: '2025-01-15',
    },
    {
      id: 2,
      name: 'Sandton Developments',
      registration: '2024/987654/07',
      subscription: 'Enterprise',
      projects: 3,
      units: 180,
      soldRented: 142,
      status: 'Active',
      joined: '2024-11-22',
    },
    {
      id: 3,
      name: 'Cape Town Builders',
      registration: '2025/456789/07',
      subscription: 'Basic',
      projects: 2,
      units: 95,
      soldRented: 68,
      status: 'Active',
      joined: '2025-03-10',
    },
    {
      id: 4,
      name: 'Durban Housing Co',
      registration: '2025/321654/07',
      subscription: 'Premium',
      projects: 4,
      units: 156,
      soldRented: 98,
      status: 'Pending',
      joined: '2025-10-05',
    },
  ];

  const developerColumns = [
    { key: 'name', title: 'Developer Name', sortable: true },
    {
      key: 'registration',
      title: 'Company Registration (CIPC)',
      sortable: true,
    },
    { key: 'subscription', title: 'Subscription Tier', sortable: true },
    { key: 'projects', title: 'Active Projects', sortable: true },
    { key: 'units', title: 'Total Units', sortable: true },
    { key: 'soldRented', title: 'Units Sold/Rented', sortable: true },
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
    { key: 'joined', title: 'Joined Date', sortable: true },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: unknown, record: Record<string, React.ReactNode>) => (
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedDeveloper(record)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
          {record.status === 'Pending' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsApprovalModalOpen(true)}
            >
              <FileCheck className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Projects management data
  const projectData: Record<string, React.ReactNode>[] = [
    {
      id: 1,
      name: 'Sandton Heights',
      location: 'Sandton, Johannesburg',
      totalUnits: 120,
      availableUnits: 42,
      priceRange: 'R 1.2M - R 3.5M',
      status: 'Under Construction',
      launchDate: '2025-09-15',
    },
    {
      id: 2,
      name: 'Cape Residences',
      location: 'Cape Town',
      totalUnits: 80,
      availableUnits: 18,
      priceRange: 'R 850K - R 2.1M',
      status: 'Completed',
      launchDate: '2025-06-20',
    },
    {
      id: 3,
      name: 'Durban Waterfront',
      location: 'Durban',
      totalUnits: 140,
      availableUnits: 75,
      priceRange: 'R 950K - R 2.8M',
      status: 'Planning',
      launchDate: '2026-01-10',
    },
  ];

  const projectColumns = [
    { key: 'name', title: 'Project Name', sortable: true },
    { key: 'location', title: 'Location', sortable: true },
    { key: 'totalUnits', title: 'Total Units', sortable: true },
    { key: 'availableUnits', title: 'Available Units', sortable: true },
    { key: 'priceRange', title: 'Price Range', sortable: true },
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
    { key: 'launchDate', title: 'Launch Date', sortable: true },
    {
      key: 'actions',
      title: 'Actions',
      render: () => (
        <div className="flex space-x-2">
          <Button variant="secondary" size="sm">
            View
          </Button>
          <Button variant="secondary" size="sm">
            Feature
          </Button>
          <Button variant="secondary" size="sm">
            Reports
          </Button>
        </div>
      ),
    },
  ];

  // Approval requirements
  const approvalRequirements = [
    {
      name: 'Company registration (CIPC)',
      status: 'Completed',
      verified: true,
    },
    {
      name: 'NHBRC registration (SA-specific!)',
      status: 'Pending',
      verified: false,
    },
    { name: 'Tax clearance', status: 'Completed', verified: true },
    { name: 'Project portfolio', status: 'Completed', verified: true },
    { name: 'Sales team details', status: 'Pending', verified: false },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Developers Module
            </h1>
            <p className="text-slate-600">
              Manage property developer accounts (separate from agencies)
            </p>
          </div>
          <Button variant="primary" size="md">
            <Plus className="h-4 w-4 mr-2" />
            Add Developer
          </Button>
        </div>
      </div>

      {/* Developer Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {developerStats.map((stat, index) => (
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

      {/* Developer Table */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">Developers</h2>
          <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
            <select className="text-sm border border-slate-300 rounded-lg px-3 py-1">
              <option>All Statuses</option>
              <option>Active</option>
              <option>Pending</option>
              <option>Suspended</option>
            </select>
            <select className="text-sm border border-slate-300 rounded-lg px-3 py-1">
              <option>All Subscriptions</option>
              <option>Basic</option>
              <option>Premium</option>
              <option>Enterprise</option>
            </select>
          </div>
        </div>
        <Table
          data={developerData}
          columns={developerColumns}
          loading={false}
        />
      </div>

      {/* Projects Management */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            Projects Management
          </h2>
          <div className="flex gap-2 mt-2 md:mt-0">
            <select className="text-sm border border-slate-300 rounded-lg px-3 py-1">
              <option>All Statuses</option>
              <option>Planning</option>
              <option>Under Construction</option>
              <option>Completed</option>
            </select>
          </div>
        </div>
        <Table data={projectData} columns={projectColumns} loading={false} />
      </div>

      {/* Developer Approval Modal */}
      <Modal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        title="Developer Approval Process"
        size="lg"
      >
        {selectedDeveloper && (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900">
                {selectedDeveloper.name as string}
              </h3>
              <p className="text-slate-600">
                Company Registration: {selectedDeveloper.registration as string}
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-slate-900">
                Approval Requirements
              </h4>
              {approvalRequirements.map((req, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border border-slate-200 rounded-lg"
                >
                  <span className="text-sm text-slate-700">{req.name}</span>
                  <div className="flex items-center">
                    {req.verified ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    ) : (
                      <Clock className="h-5 w-5 text-orange-500 mr-2" />
                    )}
                    <Badge variant={req.verified ? 'success' : 'warning'}>
                      {req.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setIsApprovalModalOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="primary">Approve Developer</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Developer Details Modal */}
      {selectedDeveloper && !isApprovalModalOpen && (
        <Modal
          isOpen={!!selectedDeveloper}
          onClose={() => setSelectedDeveloper(null)}
          title={`Developer Details: ${selectedDeveloper.name as string}`}
          size="lg"
        >
          <div className="space-y-6">
            {/* Developer Information */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Developer Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-4">
                  <p className="text-sm text-slate-600">Company Name</p>
                  <p className="text-lg font-bold text-slate-900">
                    {selectedDeveloper.name as string}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-sm text-slate-600">
                    Company Registration (CIPC)
                  </p>
                  <p className="text-lg font-bold text-slate-900">
                    {selectedDeveloper.registration as string}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-sm text-slate-600">Subscription Tier</p>
                  <p className="text-lg font-bold text-slate-900">
                    {selectedDeveloper.subscription as string}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-sm text-slate-600">Status</p>
                  <p className="text-lg font-bold text-slate-900">
                    <Badge
                      variant={
                        selectedDeveloper.status === 'Active'
                          ? 'success'
                          : selectedDeveloper.status === 'Pending'
                            ? 'warning'
                            : 'error'
                      }
                    >
                      {selectedDeveloper.status as string}
                    </Badge>
                  </p>
                </div>
              </div>
            </div>

            {/* Project Summary */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Project Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card p-4">
                  <p className="text-sm text-slate-600">Active Projects</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {selectedDeveloper.projects as number}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-sm text-slate-600">Total Units</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {selectedDeveloper.units as number}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-sm text-slate-600">Units Sold/Rented</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {selectedDeveloper.soldRented as number}
                  </p>
                </div>
              </div>
            </div>

            {/* Projects List */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Projects
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Project Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Units
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        Sandton Heights
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        120 units
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <Badge variant="warning">Under Construction</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <Button variant="secondary" size="sm">
                          View
                        </Button>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        Premium Residences
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        80 units
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <Badge variant="success">Completed</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <Button variant="secondary" size="sm">
                          View
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
              <Button variant="primary">Edit Developer</Button>
              <Button variant="secondary">View All Projects</Button>
              <Button variant="secondary">Send Message</Button>
              {selectedDeveloper.status === 'Pending' && (
                <Button
                  variant="success"
                  onClick={() => setIsApprovalModalOpen(true)}
                >
                  Approve Developer
                </Button>
              )}
              <Button variant="danger">Suspend Developer</Button>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setSelectedDeveloper(null)}
            >
              Close
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DevelopersPage;
