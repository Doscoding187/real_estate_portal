import React, { useState } from 'react';
import {
  Plus,
  Users,
  Award,
  Clock,
  Star,
  Eye,
  Building,
  FileText,
} from 'lucide-react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';

const AgentsPage: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState<Record<
    string,
    React.ReactNode
  > | null>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  // Agent table data
  const agentData: Record<string, React.ReactNode>[] = [
    {
      id: 1,
      name: 'James Wilson',
      ffc: 'FFC2025-12345',
      agency: 'PropCity Estates',
      status: 'Active',
      listings: 24,
      leads: 42,
      performance: '4.8/5',
      joined: '2025-01-15',
    },
    {
      id: 2,
      name: 'Sarah Thompson',
      ffc: 'FFC2024-98765',
      agency: 'Cape Town Properties',
      status: 'Active',
      listings: 18,
      leads: 36,
      performance: '4.6/5',
      joined: '2024-11-22',
    },
    {
      id: 3,
      name: 'Michael Brown',
      ffc: 'FFC2025-45678',
      agency: 'Independent',
      status: 'Pending',
      listings: 0,
      leads: 0,
      performance: '0/5',
      joined: '2025-10-05',
    },
    {
      id: 4,
      name: 'Lisa Davis',
      ffc: 'FFC2023-32165',
      agency: 'Johannesburg Real Estate',
      status: 'Active',
      listings: 32,
      leads: 58,
      performance: '4.9/5',
      joined: '2023-08-10',
    },
  ];

  const agentColumns = [
    { key: 'name', title: 'Agent Name', sortable: true },
    { key: 'ffc', title: 'FFC Number', sortable: true },
    { key: 'agency', title: 'Agency', sortable: true },
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
    { key: 'listings', title: 'Active Listings', sortable: true },
    { key: 'leads', title: 'Leads Generated', sortable: true },
    { key: 'performance', title: 'Performance Score', sortable: true },
    { key: 'joined', title: 'Joined Date', sortable: true },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: unknown, record: Record<string, React.ReactNode>) => (
        <div className="flex space-x-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedAgent(record)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm">
            <Building className="h-4 w-4" />
          </Button>
          {record.status === 'Pending' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsVerificationModalOpen(true)}
            >
              <FileText className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Verification requirements
  const verificationRequirements = [
    { name: 'FFC Certificate', status: 'Completed', verified: true },
    { name: 'ID Document', status: 'Pending', verified: false },
    { name: 'Proof of Address', status: 'Completed', verified: true },
    {
      name: 'NQF Level 4 Qualification',
      status: 'Not Required',
      verified: true,
    },
  ];

  return (
    <div className="p-3">
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Agents Module</h1>
            <p className="text-slate-600 text-sm">
              Manage individual agents (can be independent or under agencies)
            </p>
          </div>
          <Button variant="primary" size="md">
            <Plus className="h-4 w-4 mr-1" />
            Add Agent
          </Button>
        </div>
      </div>

      {/* Agent Table */}
      <div className="card p-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Agents</h2>
          <div className="flex flex-wrap gap-1 mt-2 md:mt-0">
            <select className="text-sm border border-slate-300 rounded-lg px-2 py-1">
              <option>All Statuses</option>
              <option>Active</option>
              <option>Pending</option>
              <option>Suspended</option>
            </select>
            <select className="text-sm border border-slate-300 rounded-lg px-2 py-1">
              <option>All Agencies</option>
              <option>Independent</option>
              <option>PropCity Estates</option>
              <option>Cape Town Properties</option>
            </select>
          </div>
        </div>
        <Table data={agentData} columns={agentColumns} loading={false} />
      </div>

      {/* Agent Details Modal */}
      {selectedAgent && (
        <Modal
          isOpen={!!selectedAgent}
          onClose={() => setSelectedAgent(null)}
          title={`Agent Profile: ${selectedAgent.name as string}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                Agent Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="card p-3">
                  <p className="text-sm text-slate-600">Agent Name</p>
                  <p className="font-bold text-slate-900">
                    {selectedAgent.name as string}
                  </p>
                </div>
                <div className="card p-3">
                  <p className="text-sm text-slate-600">FFC Number</p>
                  <p className="font-bold text-slate-900">
                    {selectedAgent.ffc as string}
                  </p>
                </div>
                <div className="card p-3">
                  <p className="text-sm text-slate-600">Agency</p>
                  <p className="font-bold text-slate-900">
                    {selectedAgent.agency as string}
                  </p>
                </div>
                <div className="card p-3">
                  <p className="text-sm text-slate-600">Status</p>
                  <p className="font-bold text-slate-900">
                    <Badge
                      variant={
                        selectedAgent.status === 'Active'
                          ? 'success'
                          : selectedAgent.status === 'Pending'
                            ? 'warning'
                            : 'error'
                      }
                    >
                      {selectedAgent.status as string}
                    </Badge>
                  </p>
                </div>
                <div className="card p-3">
                  <p className="text-sm text-slate-600">Joined Date</p>
                  <p className="font-bold text-slate-900">
                    {selectedAgent.joined as string}
                  </p>
                </div>
                <div className="card p-3">
                  <p className="text-sm text-slate-600">Performance Score</p>
                  <p className="font-bold text-slate-900">
                    {selectedAgent.performance as string}
                  </p>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                Performance Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="card p-3">
                  <div className="flex items-center">
                    <Award className="h-5 w-5 text-blue-500 mr-2" />
                    <p className="text-sm text-slate-600">Total Listings</p>
                  </div>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {selectedAgent.listings as number}
                  </p>
                </div>
                <div className="card p-3">
                  <div className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-500 mr-2" />
                    <p className="text-sm text-slate-600">Avg. Quality Score</p>
                  </div>
                  <p className="text-xl font-bold text-slate-900 mt-1">4.7/5</p>
                </div>
                <div className="card p-3">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-green-500 mr-2" />
                    <p className="text-sm text-slate-600">Response Time</p>
                  </div>
                  <p className="text-xl font-bold text-slate-900 mt-1">2.4h</p>
                </div>
                <div className="card p-3">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-purple-500 mr-2" />
                    <p className="text-sm text-slate-600">Lead Conversion</p>
                  </div>
                  <p className="text-xl font-bold text-slate-900 mt-1">68%</p>
                </div>
              </div>
            </div>

            {/* Client Reviews */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                Client Reviews
              </h3>
              <div className="space-y-3">
                <div className="p-3 border border-slate-200 rounded-lg">
                  <div className="flex justify-between">
                    <p className="font-medium text-slate-900">
                      Excellent service and communication
                    </p>
                    <Badge variant="success">5/5</Badge>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    "James helped me find my dream home in just 2 weeks. Highly
                    recommended!"
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Posted by John Smith - 2025-11-01
                  </p>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg">
                  <div className="flex justify-between">
                    <p className="font-medium text-slate-900">
                      Professional and knowledgeable
                    </p>
                    <Badge variant="success">4/5</Badge>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    "Sarah was very helpful in finding the right property for
                    our needs."
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Posted by Mary Johnson - 2025-10-25
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200">
              <Button variant="primary" size="sm">
                Send Message
              </Button>
              <Button variant="secondary" size="sm">
                View All Listings
              </Button>
              <Button variant="secondary" size="sm">
                Assign to Agency
              </Button>
              {selectedAgent.status === 'Pending' && (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => setIsVerificationModalOpen(true)}
                >
                  Verify Agent
                </Button>
              )}
              <Button variant="danger" size="sm">
                Suspend Agent
              </Button>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="secondary" onClick={() => setSelectedAgent(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}

      {/* Agent Verification Modal */}
      <Modal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        title="Agent Verification"
        size="md"
      >
        {selectedAgent && (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {selectedAgent.name as string}
              </h3>
              <p className="text-slate-600">
                FFC Number: {selectedAgent.ffc as string}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-slate-900">Required Documents</h4>
              {verificationRequirements.map((req, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 border border-slate-200 rounded-lg"
                >
                  <span className="text-sm text-slate-700">{req.name}</span>
                  <div className="flex items-center">
                    {req.verified ? (
                      <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                    ) : (
                      <div className="h-2 w-2 bg-orange-500 rounded-full mr-2"></div>
                    )}
                    <Badge variant={req.verified ? 'success' : 'warning'}>
                      {req.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end space-x-2">
              <Button
                variant="secondary"
                onClick={() => setIsVerificationModalOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="primary">Verify Agent</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AgentsPage;
