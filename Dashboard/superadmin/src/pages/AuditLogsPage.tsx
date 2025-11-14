import React, { useState } from 'react';
import { Search, Calendar, User, Activity } from 'lucide-react';

const AuditLogsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('last7days');

  // Mock data
  const auditLogs = [
    {
      id: 1,
      user: 'Admin User',
      action: 'Approved agency registration',
      target: 'PropCity Estates',
      timestamp: '2025-11-12 14:30:22',
      ip: '192.168.1.100',
      status: 'Success',
    },
    {
      id: 2,
      user: 'Admin User',
      action: 'Rejected property listing',
      target: '3 Bed House in Waterfall',
      timestamp: '2025-11-12 13:45:17',
      ip: '192.168.1.100',
      status: 'Success',
    },
    {
      id: 3,
      user: 'Sarah Johnson',
      action: 'Updated subscription plan',
      target: 'Cape Town Properties',
      timestamp: '2025-11-12 11:22:05',
      ip: '203.0.113.45',
      status: 'Success',
    },
    {
      id: 4,
      user: 'Admin User',
      action: 'Created new subscription tier',
      target: 'Enterprise Plan',
      timestamp: '2025-11-12 09:15:33',
      ip: '192.168.1.100',
      status: 'Success',
    },
    {
      id: 5,
      user: 'Mike Williams',
      action: 'Failed login attempt',
      target: 'Admin Panel',
      timestamp: '2025-11-12 08:42:11',
      ip: '198.51.100.22',
      status: 'Failed',
    },
    {
      id: 6,
      user: 'Admin User',
      action: 'Updated platform settings',
      target: 'Payment Gateway',
      timestamp: '2025-11-11 16:30:45',
      ip: '192.168.1.100',
      status: 'Success',
    },
  ];

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Success':
        return 'bg-green-100 text-green-600';
      case 'Failed':
        return 'bg-red-100 text-red-500';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
        <p className="text-slate-600">
          Track all administrative actions and system events
        </p>
      </div>

      {/* Filter Bar */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search logs..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
            >
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="last90days">Last 90 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <select className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="All">All Users</option>
              <option value="Admin User">Admin User</option>
              <option value="Sarah Johnson">Sarah Johnson</option>
              <option value="Mike Williams">Mike Williams</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                >
                  User
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                >
                  Action
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                >
                  Target
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                >
                  Timestamp
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                >
                  IP Address
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {auditLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-slate-900">
                          {log.user}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-900">{log.action}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{log.target}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {log.timestamp}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {log.ip}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`status-badge ${getStatusBadgeClass(log.status)}`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-sm text-slate-700">
            Showing <span className="font-medium">1</span> to{' '}
            <span className="font-medium">6</span> of{' '}
            <span className="font-medium">42</span> results
          </div>
          <div className="flex space-x-2">
            <button className="btn-secondary px-3 py-1 text-sm">
              Previous
            </button>
            <button className="btn-primary px-3 py-1 text-sm">Next</button>
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="card p-6 mt-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">
          Activity Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-2xl font-bold text-slate-900">142</p>
                <p className="text-sm text-slate-600">Total Actions</p>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-green-500"></div>
              </div>
              <div className="ml-3">
                <p className="text-2xl font-bold text-slate-900">138</p>
                <p className="text-sm text-slate-600">Successful</p>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-red-500"></div>
              </div>
              <div className="ml-3">
                <p className="text-2xl font-bold text-slate-900">4</p>
                <p className="text-sm text-slate-600">Failed</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogsPage;
