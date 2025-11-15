import React, { useState } from 'react';
import {
  Plus,
  MapPin,
  Phone,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';
import Button from '@/components/admin/Button';
import Badge from '@/components/admin/Badge';
import Table from '@/components/admin/Table';
import Modal from '@/components/admin/Modal';
import TextInput from '@/components/admin/TextInput';

const AgenciesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgency, setSelectedAgency] = useState<Record<
    string,
    React.ReactNode
  > | null>(null);

  // Mock data for agencies
  const agenciesData: Record<string, React.ReactNode>[] = [
    {
      id: 1,
      name: 'PropCity Estates',
      location: 'Sandton, Johannesburg',
      properties: 124,
      agents: 12,
      status: 'Active',
      contact: '+27 11 123 4567',
    },
    {
      id: 2,
      name: 'Cape Town Properties',
      location: 'Cape Town CBD',
      properties: 89,
      agents: 8,
      status: 'Active',
      contact: '+27 21 987 6543',
    },
    {
      id: 3,
      name: 'Durban Homes',
      location: 'Durban Central',
      properties: 67,
      agents: 6,
      status: 'Pending',
      contact: '+27 31 555 1234',
    },
  ];

  const agencyColumns = [
    { key: 'name', title: 'Agency Name', sortable: true },
    { key: 'location', title: 'Location', sortable: true },
    { key: 'properties', title: 'Properties Listed', sortable: true },
    { key: 'agents', title: 'Agents', sortable: true },
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
    { key: 'contact', title: 'Contact', sortable: true },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: unknown, record: Record<string, React.ReactNode>) => (
        <div className="flex space-x-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedAgency(record)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="danger" size="sm">
            <Trash2 className="h-4 w-4" />
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
            <h1 className="text-xl font-bold text-slate-900">
              Agency Management
            </h1>
            <p className="text-slate-600 text-sm">
              Manage real estate agencies and their listings
            </p>
          </div>
          <Button variant="primary" size="md">
            <Plus className="h-4 w-4 mr-1" />
            Add Agency
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-3 mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="w-full md:w-60">
            <TextInput
              placeholder="Search agencies..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              icon={<Search className="h-4 w-4 text-slate-400" />}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            <select className="text-sm border border-slate-300 rounded-lg px-2 py-1">
              <option>All Statuses</option>
              <option>Active</option>
              <option>Pending</option>
              <option>Suspended</option>
            </select>
            <Button variant="secondary" size="sm">
              <Filter className="h-4 w-4 mr-1" />
              Filter
            </Button>
          </div>
        </div>
      </div>

      {/* Agencies Table */}
      <div className="card p-3">
        <Table data={agenciesData} columns={agencyColumns} loading={false} />
      </div>

      {/* Agency Detail Modal */}
      {selectedAgency && (
        <Modal
          isOpen={!!selectedAgency}
          onClose={() => setSelectedAgency(null)}
          title={selectedAgency.name as string}
          size="md"
        >
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="card p-3">
                <p className="text-sm text-slate-600">Agency Name</p>
                <p className="font-medium text-slate-900">
                  {selectedAgency.name as string}
                </p>
              </div>
              <div className="card p-3">
                <p className="text-sm text-slate-600">Location</p>
                <p className="font-medium text-slate-900 flex items-center">
                  <MapPin className="h-4 w-4 mr-1 text-slate-500" />
                  {selectedAgency.location as string}
                </p>
              </div>
              <div className="card p-3">
                <p className="text-sm text-slate-600">Properties Listed</p>
                <p className="font-medium text-slate-900">
                  {selectedAgency.properties as number}
                </p>
              </div>
              <div className="card p-3">
                <p className="text-sm text-slate-600">Agents</p>
                <p className="font-medium text-slate-900">
                  {selectedAgency.agents as number}
                </p>
              </div>
              <div className="card p-3">
                <p className="text-sm text-slate-600">Status</p>
                <p className="font-medium text-slate-900">
                  <Badge
                    variant={
                      selectedAgency.status === 'Active'
                        ? 'success'
                        : selectedAgency.status === 'Pending'
                          ? 'warning'
                          : 'error'
                    }
                  >
                    {selectedAgency.status as string}
                  </Badge>
                </p>
              </div>
              <div className="card p-3">
                <p className="text-sm text-slate-600">Contact</p>
                <p className="font-medium text-slate-900 flex items-center">
                  <Phone className="h-4 w-4 mr-1 text-slate-500" />
                  {selectedAgency.contact as string}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3">
              <Button
                variant="secondary"
                onClick={() => setSelectedAgency(null)}
              >
                Close
              </Button>
              <Button variant="primary">Edit Agency</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AgenciesPage;
