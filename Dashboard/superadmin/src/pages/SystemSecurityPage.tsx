import React, { useState } from 'react';
import {
  Shield,
  Activity,
  Database,
  Users,
  Clock,
  Search,
  Download,
  Upload,
  AlertTriangle,
  Lock,
  User,
  History,
  Filter,
} from 'lucide-react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Table from '../components/common/Table';
import TextInput from '../components/common/TextInput';

const SystemSecurityPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('health');
  const [searchQuery, setSearchQuery] = useState('');

  // System tabs
  const systemTabs = [
    {
      id: 'health',
      name: 'System Health',
      icon: <Activity className="h-4 w-4" />,
    },
    { id: 'audit', name: 'Audit Logs', icon: <History className="h-4 w-4" /> },
    {
      id: 'backup',
      name: 'Backup & Restore',
      icon: <Upload className="h-4 w-4" />,
    },
    {
      id: 'alerts',
      name: 'Security Alerts',
      icon: <AlertTriangle className="h-4 w-4" />,
    },
    {
      id: 'access',
      name: 'Access Control',
      icon: <Lock className="h-4 w-4" />,
    },
    {
      id: 'compliance',
      name: 'Compliance',
      icon: <Shield className="h-4 w-4" />,
    },
  ];

  // System health data
  const healthStats = [
    {
      title: 'Uptime',
      value: '99.9%',
      status: 'healthy',
      icon: <Activity className="h-6 w-6 text-green-600" />,
      color: 'bg-green-100',
    },
    {
      title: 'Response Time',
      value: '124ms',
      status: 'healthy',
      icon: <Clock className="h-6 w-6 text-blue-600" />,
      color: 'bg-blue-100',
    },
    {
      title: 'Active Sessions',
      value: '1,247',
      status: 'healthy',
      icon: <Users className="h-6 w-6 text-purple-600" />,
      color: 'bg-purple-100',
    },
    {
      title: 'Database Size',
      value: '24.5 GB',
      status: 'warning',
      icon: <Database className="h-6 w-6 text-yellow-600" />,
      color: 'bg-yellow-100',
    },
  ];

  // Audit logs data
  const auditLogsData: Record<string, React.ReactNode>[] = [
    {
      timestamp: '2025-11-12 14:30:22',
      admin: 'Sarah Johnson',
      action: 'Approved listing',
      entity: 'Listing #12458',
      ip: '192.168.1.105',
      device: 'Chrome on Windows',
    },
    {
      timestamp: '2025-11-12 13:45:17',
      admin: 'Michael Chen',
      action: 'Suspended user',
      entity: 'User #8741',
      ip: '192.168.1.87',
      device: 'Firefox on macOS',
    },
    {
      timestamp: '2025-11-12 12:20:05',
      admin: 'Sarah Johnson',
      action: 'Changed settings',
      entity: 'Commission rates',
      ip: '192.168.1.105',
      device: 'Chrome on Windows',
    },
  ];

  // Audit logs columns
  const auditLogsColumns = [
    { key: 'timestamp', title: 'Timestamp' },
    { key: 'admin', title: 'Admin Name' },
    { key: 'action', title: 'Action' },
    { key: 'entity', title: 'Entity Affected' },
    { key: 'ip', title: 'IP Address' },
    { key: 'device', title: 'Device/Browser' },
  ];

  // Backup data
  const backupData = {
    lastBackup: '2025-11-12 02:00:00',
    frequency: 'Daily',
    storage: 'AWS S3 (Encrypted)',
    nextBackup: '2025-11-13 02:00:00',
  };

  // Security alerts data
  const securityAlertsData: Record<string, React.ReactNode>[] = [
    {
      id: 1,
      type: 'Failed Login',
      description: '5 failed login attempts from IP 192.168.2.45',
      timestamp: '2025-11-12 15:30:22',
      status: <Badge variant="warning">Warning</Badge>,
    },
    {
      id: 2,
      type: 'Rate Limit',
      description: 'API rate limit exceeded for endpoint /api/listings',
      timestamp: '2025-11-12 14:45:17',
      status: <Badge variant="warning">Warning</Badge>,
    },
    {
      id: 3,
      type: 'Unauthorized Access',
      description: 'Unauthorized access attempt to admin panel',
      timestamp: '2025-11-12 11:20:05',
      status: <Badge variant="error">Critical</Badge>,
    },
  ];

  // Security alerts columns
  const securityAlertsColumns = [
    { key: 'type', title: 'Type' },
    { key: 'description', title: 'Description' },
    { key: 'timestamp', title: 'Timestamp' },
    { key: 'status', title: 'Status' },
  ];

  // Access control data
  const accessControlData: Record<string, React.ReactNode>[] = [
    {
      id: 1,
      name: 'Sarah Johnson',
      role: 'Super Admin',
      permissions: 'All Access',
      lastLogin: '2025-11-12 14:30:22',
      status: <Badge variant="success">Active</Badge>,
    },
    {
      id: 2,
      name: 'Michael Chen',
      role: 'Content Manager',
      permissions: 'Content, Users',
      lastLogin: '2025-11-12 13:45:17',
      status: <Badge variant="success">Active</Badge>,
    },
    {
      id: 3,
      name: 'David Williams',
      role: 'Support Agent',
      permissions: 'Tickets, Users',
      lastLogin: '2025-11-12 10:15:33',
      status: <Badge variant="success">Active</Badge>,
    },
  ];

  // Access control columns
  const accessControlColumns = [
    { key: 'name', title: 'Name' },
    { key: 'role', title: 'Role' },
    { key: 'permissions', title: 'Permissions' },
    { key: 'lastLogin', title: 'Last Login' },
    { key: 'status', title: 'Status' },
  ];

  // Compliance data
  const complianceData: Record<string, React.ReactNode>[] = [
    {
      id: 1,
      request: 'Data Deletion Request',
      user: 'John Smith (#8741)',
      date: '2025-11-10',
      status: <Badge variant="warning">Pending</Badge>,
    },
    {
      id: 2,
      request: 'Data Export Request',
      user: 'Mary Johnson (#9264)',
      date: '2025-11-09',
      status: <Badge variant="success">Completed</Badge>,
    },
    {
      id: 3,
      request: 'Data Deletion Request',
      user: 'Robert Brown (#7523)',
      date: '2025-11-08',
      status: <Badge variant="success">Completed</Badge>,
    },
  ];

  // Compliance columns
  const complianceColumns = [
    { key: 'request', title: 'Request Type' },
    { key: 'user', title: 'User' },
    { key: 'date', title: 'Date Requested' },
    { key: 'status', title: 'Status' },
  ];

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System & Security</h1>
        <p className="text-gray-600">
          Platform health, security, and compliance
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {systemTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              <span className="ml-2">{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* System Health Dashboard */}
      {activeTab === 'health' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {healthStats.map((stat, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className={`rounded-full p-3 ${stat.color}`}>
                    {stat.icon}
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {stat.value}
                    </p>
                    <p
                      className={`text-xs ${
                        stat.status === 'healthy'
                          ? 'text-green-600'
                          : 'text-yellow-600'
                      }`}
                    >
                      {stat.status === 'healthy' ? 'Operational' : 'Warning'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Logs */}
      {activeTab === 'audit' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Audit Logs</h2>
            <div className="flex space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <TextInput
                  type="text"
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="secondary">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
          <Table data={auditLogsData} columns={auditLogsColumns} />
        </div>
      )}

      {/* Backup & Restore */}
      {activeTab === 'backup' && (
        <div>
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Backup Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Last Backup</p>
                <p className="font-semibold">{backupData.lastBackup}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Backup Frequency</p>
                <p className="font-semibold">{backupData.frequency}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Storage Location</p>
                <p className="font-semibold">{backupData.storage}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Next Backup</p>
                <p className="font-semibold">{backupData.nextBackup}</p>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Manual Backup
              </Button>
              <Button variant="secondary">
                <Download className="h-4 w-4 mr-2" />
                Download Backup
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Restore from Backup
            </h2>
            <div className="flex items-center space-x-3">
              <TextInput
                type="text"
                placeholder="Select backup date..."
                className="flex-1"
              />
              <Button variant="secondary">Restore</Button>
            </div>
          </div>
        </div>
      )}

      {/* Security Alerts */}
      {activeTab === 'alerts' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Security Alerts
            </h2>
            <Button variant="secondary">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
          <Table data={securityAlertsData} columns={securityAlertsColumns} />
        </div>
      )}

      {/* Access Control */}
      {activeTab === 'access' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Access Control
            </h2>
            <Button>
              <User className="h-4 w-4 mr-2" />
              Invite Admin
            </Button>
          </div>
          <Table data={accessControlData} columns={accessControlColumns} />

          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Roles & Permissions
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Permissions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Super Admin
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      Full access to all modules
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Button variant="secondary" size="sm">
                        Edit
                      </Button>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Content Manager
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      Content, Users, Communications
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Button variant="secondary" size="sm">
                        Edit
                      </Button>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Support Agent
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      Tickets, Users
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Button variant="secondary" size="sm">
                        Edit
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Compliance */}
      {activeTab === 'compliance' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Compliance (POPIA)
            </h2>
            <Button variant="secondary">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
          <Table data={complianceData} columns={complianceColumns} />

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-md font-semibold text-gray-900 mb-4">
                Cookie Consent Logs
              </h3>
              <div className="text-sm text-gray-500">
                <p>Total consents: 24,568</p>
                <p>Pending review: 12</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-md font-semibold text-gray-900 mb-4">
                Policy Versions
              </h3>
              <div className="text-sm text-gray-500">
                <p>Current: v2.1 (2025-10-15)</p>
                <p>Previous: v2.0 (2025-06-20)</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemSecurityPage;
