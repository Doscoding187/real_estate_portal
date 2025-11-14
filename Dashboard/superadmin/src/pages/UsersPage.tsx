import React, { useState } from 'react';
import {
  Plus,
  Users,
  TrendingUp,
  Calendar,
  Eye,
  MessageSquare,
  Download,
} from 'lucide-react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';

const UsersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedUser, setSelectedUser] = useState<Record<
    string,
    React.ReactNode
  > | null>(null);

  // User stats cards data
  const userStats = [
    {
      title: 'Total Registered Users',
      value: '3,421',
      change: '+142 this month',
      icon: <Users className="h-6 w-6 text-blue-600" />,
      color: 'bg-blue-100',
    },
    {
      title: 'Active This Month',
      value: '1,847',
      change: '+89 this month',
      icon: <TrendingUp className="h-6 w-6 text-green-600" />,
      color: 'bg-green-100',
    },
    {
      title: 'New Signups',
      value: '245',
      change: '+12% from last month',
      icon: <Calendar className="h-6 w-6 text-purple-600" />,
      color: 'bg-purple-100',
    },
    {
      title: 'Engagement Rate',
      value: '54%',
      change: '+3% from last month',
      icon: <TrendingUp className="h-6 w-6 text-cyan-600" />,
      color: 'bg-cyan-100',
    },
  ];

  // User segments
  const userSegments = [
    { id: 'all', name: 'All Users' },
    { id: 'buyers', name: 'Buyers' },
    { id: 'renters', name: 'Renters' },
    { id: 'sellers', name: 'Individual Sellers (For Sale By Owner)' },
    { id: 'inactive', name: 'Inactive Users' },
  ];

  // User table data
  const userData: Record<string, React.ReactNode>[] = [
    {
      id: 1,
      name: 'John Smith',
      email: 'john.smith@email.com',
      type: 'Buyer',
      registration: '2025-01-15',
      lastActive: '2025-11-12',
      saved: 12,
      inquiries: 3,
      status: 'Active',
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      type: 'Renter',
      registration: '2025-03-22',
      lastActive: '2025-11-11',
      saved: 8,
      inquiries: 5,
      status: 'Active',
    },
    {
      id: 3,
      name: 'Mike Williams',
      email: 'mike.w@email.com',
      type: 'Seller',
      registration: '2025-02-10',
      lastActive: '2025-11-10',
      saved: 0,
      inquiries: 12,
      status: 'Active',
    },
    {
      id: 4,
      name: 'Emma Davis',
      email: 'emma.d@email.com',
      type: 'Buyer',
      registration: '2025-10-05',
      lastActive: '2025-11-05',
      saved: 5,
      inquiries: 1,
      status: 'Inactive',
    },
  ];

  const userColumns = [
    { key: 'name', title: 'Name', sortable: true },
    { key: 'email', title: 'Email', sortable: true },
    { key: 'type', title: 'Type', sortable: true },
    { key: 'registration', title: 'Registration Date', sortable: true },
    { key: 'lastActive', title: 'Last Active', sortable: true },
    { key: 'saved', title: 'Saved Properties', sortable: true },
    { key: 'inquiries', title: 'Inquiries Sent', sortable: true },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value: string) => (
        <Badge
          variant={
            value === 'Active'
              ? 'success'
              : value === 'Inactive'
                ? 'default'
                : 'error'
          }
        >
          {value}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: unknown, record: Record<string, React.ReactNode>) => (
        <div className="flex space-x-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedUser(record)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm">
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-3">
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Users Module</h1>
            <p className="text-slate-600 text-sm">
              Manage end-users (non-professionals)
            </p>
          </div>
          <Button variant="primary" size="md">
            <Plus className="h-4 w-4 mr-1" />
            Add User
          </Button>
        </div>
      </div>

      {/* User Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {userStats.map((stat, index) => (
          <div key={index} className="card p-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-slate-600 text-sm font-medium">
                  {stat.title}
                </h3>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {stat.value}
                </p>
                <p className="text-xs text-slate-500 mt-1">{stat.change}</p>
              </div>
              <div className={`p-2 rounded-full ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* User Segments Tabs */}
      <div className="card p-3 mb-4">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-6 overflow-x-auto">
            {userSegments.map(segment => (
              <button
                key={segment.id}
                onClick={() => setActiveTab(segment.id)}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === segment.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {segment.name}
              </button>
            ))}
          </nav>
        </div>

        {/* User Table */}
        <div className="mt-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900">Users</h2>
            <div className="flex flex-wrap gap-1 mt-2 md:mt-0">
              <select className="text-sm border border-slate-300 rounded-lg px-2 py-1">
                <option>All Statuses</option>
                <option>Active</option>
                <option>Inactive</option>
                <option>Suspended</option>
              </select>
              <Button variant="secondary" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
          <Table data={userData} columns={userColumns} loading={false} />
        </div>
      </div>

      {/* User Profile Modal */}
      {selectedUser && (
        <Modal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          title={`User Profile: ${selectedUser.name as string}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="card p-3">
                  <p className="text-sm text-slate-600">Name</p>
                  <p className="font-bold text-slate-900">
                    {selectedUser.name as string}
                  </p>
                </div>
                <div className="card p-3">
                  <p className="text-sm text-slate-600">Email</p>
                  <p className="font-bold text-slate-900">
                    {selectedUser.email as string}
                  </p>
                </div>
                <div className="card p-3">
                  <p className="text-sm text-slate-600">User Type</p>
                  <p className="font-bold text-slate-900">
                    {selectedUser.type as string}
                  </p>
                </div>
                <div className="card p-3">
                  <p className="text-sm text-slate-600">Status</p>
                  <p className="font-bold text-slate-900">
                    <Badge
                      variant={
                        selectedUser.status === 'Active'
                          ? 'success'
                          : selectedUser.status === 'Inactive'
                            ? 'default'
                            : 'error'
                      }
                    >
                      {selectedUser.status as string}
                    </Badge>
                  </p>
                </div>
                <div className="card p-3">
                  <p className="text-sm text-slate-600">Registration Date</p>
                  <p className="font-bold text-slate-900">
                    {selectedUser.registration as string}
                  </p>
                </div>
                <div className="card p-3">
                  <p className="text-sm text-slate-600">Last Active</p>
                  <p className="font-bold text-slate-900">
                    {selectedUser.lastActive as string}
                  </p>
                </div>
              </div>
            </div>

            {/* Activity Timeline */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                Activity Timeline
              </h3>
              <div className="space-y-3">
                <div className="flex">
                  <div className="flex flex-col items-center mr-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="w-0.5 h-full bg-slate-200"></div>
                  </div>
                  <div className="pb-3">
                    <p className="font-medium text-slate-900">
                      Saved 3 properties
                    </p>
                    <p className="text-xs text-slate-500">2 hours ago</p>
                  </div>
                </div>
                <div className="flex">
                  <div className="flex flex-col items-center mr-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="w-0.5 h-full bg-slate-200"></div>
                  </div>
                  <div className="pb-3">
                    <p className="font-medium text-slate-900">
                      Sent inquiry to Century Properties
                    </p>
                    <p className="text-xs text-slate-500">1 day ago</p>
                  </div>
                </div>
                <div className="flex">
                  <div className="flex flex-col items-center mr-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      Registered account
                    </p>
                    <p className="text-xs text-slate-500">2 weeks ago</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Communication History */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                Communication History
              </h3>
              <div className="space-y-2">
                <div className="p-3 border border-slate-200 rounded-lg">
                  <div className="flex justify-between">
                    <p className="font-medium text-slate-900">Welcome email</p>
                    <p className="text-xs text-slate-500">2025-11-12</p>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Sent automatically after registration
                  </p>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg">
                  <div className="flex justify-between">
                    <p className="font-medium text-slate-900">
                      Property alert: New listings in Sandton
                    </p>
                    <p className="text-xs text-slate-500">2025-11-10</p>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Weekly property alert based on saved searches
                  </p>
                </div>
              </div>
            </div>

            {/* POPIA Actions */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                POPIA Compliance
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm">
                  Export User Data
                </Button>
                <Button variant="danger" size="sm">
                  Delete User Data
                </Button>
              </div>
            </div>

            {/* Admin Notes */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                Admin Notes
              </h3>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-700 text-sm">
                  User has shown interest in premium listings. Consider offering
                  a trial subscription.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200">
              <Button variant="primary" size="sm">
                Send Message
              </Button>
              <Button variant="secondary" size="sm">
                View All Activity
              </Button>
              <Button variant="danger" size="sm">
                Suspend User
              </Button>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="secondary" onClick={() => setSelectedUser(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default UsersPage;
