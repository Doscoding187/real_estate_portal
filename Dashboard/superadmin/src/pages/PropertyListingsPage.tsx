import React, { useState } from 'react';
import { Plus, MapPin, Eye, Edit, Trash2, Search, Filter } from 'lucide-react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import TextInput from '../components/common/TextInput';

const PropertyListingsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<Record<
    string,
    React.ReactNode
  > | null>(null);

  // Mock data for property listings
  const propertyData: Record<string, React.ReactNode>[] = [
    {
      id: 1,
      title: 'Modern Apartment in Sandton',
      location: 'Sandton, Johannesburg',
      price: 'R 2,500,000',
      type: 'Apartment',
      status: 'Approved',
      listed: '2025-11-01',
      agent: 'James Wilson',
    },
    {
      id: 2,
      title: 'Luxury House in Cape Town',
      location: 'Cape Town CBD',
      price: 'R 8,750,000',
      type: 'House',
      status: 'Pending',
      listed: '2025-11-05',
      agent: 'Sarah Thompson',
    },
    {
      id: 3,
      title: 'Beachfront Villa in Durban',
      location: 'Durban North',
      price: 'R 12,500,000',
      type: 'Villa',
      status: 'Rejected',
      listed: '2025-10-28',
      agent: 'Michael Brown',
    },
  ];

  const propertyColumns = [
    { key: 'title', title: 'Property Title', sortable: true },
    { key: 'location', title: 'Location', sortable: true },
    { key: 'price', title: 'Price', sortable: true },
    { key: 'type', title: 'Type', sortable: true },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value: string) => (
        <Badge
          variant={
            value === 'Approved'
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
    { key: 'listed', title: 'Listed Date', sortable: true },
    { key: 'agent', title: 'Listing Agent', sortable: true },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: unknown, record: Record<string, React.ReactNode>) => (
        <div className="flex space-x-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedProperty(record)}
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
              Property Listings
            </h1>
            <p className="text-slate-600 text-sm">
              Manage property listings and moderation
            </p>
          </div>
          <Button variant="primary" size="md">
            <Plus className="h-4 w-4 mr-1" />
            Add Property
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-3 mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="w-full md:w-60">
            <TextInput
              placeholder="Search properties..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              icon={<Search className="h-4 w-4 text-slate-400" />}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            <select className="text-sm border border-slate-300 rounded-lg px-2 py-1">
              <option>All Statuses</option>
              <option>Approved</option>
              <option>Pending</option>
              <option>Rejected</option>
            </select>
            <select className="text-sm border border-slate-300 rounded-lg px-2 py-1">
              <option>All Types</option>
              <option>House</option>
              <option>Apartment</option>
              <option>Villa</option>
            </select>
            <Button variant="secondary" size="sm">
              <Filter className="h-4 w-4 mr-1" />
              Filter
            </Button>
          </div>
        </div>
      </div>

      {/* Property Listings Table */}
      <div className="card p-3">
        <Table data={propertyData} columns={propertyColumns} loading={false} />
      </div>

      {/* Property Detail Modal */}
      {selectedProperty && (
        <Modal
          isOpen={!!selectedProperty}
          onClose={() => setSelectedProperty(null)}
          title={selectedProperty.title as string}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="card p-3">
                <p className="text-sm text-slate-600">Property Title</p>
                <p className="font-medium text-slate-900">
                  {selectedProperty.title as string}
                </p>
              </div>
              <div className="card p-3">
                <p className="text-sm text-slate-600">Location</p>
                <p className="font-medium text-slate-900 flex items-center">
                  <MapPin className="h-4 w-4 mr-1 text-slate-500" />
                  {selectedProperty.location as string}
                </p>
              </div>
              <div className="card p-3">
                <p className="text-sm text-slate-600">Price</p>
                <p className="font-medium text-slate-900">
                  {selectedProperty.price as string}
                </p>
              </div>
              <div className="card p-3">
                <p className="text-sm text-slate-600">Type</p>
                <p className="font-medium text-slate-900">
                  {selectedProperty.type as string}
                </p>
              </div>
              <div className="card p-3">
                <p className="text-sm text-slate-600">Status</p>
                <p className="font-medium text-slate-900">
                  <Badge
                    variant={
                      selectedProperty.status === 'Approved'
                        ? 'success'
                        : selectedProperty.status === 'Pending'
                          ? 'warning'
                          : 'error'
                    }
                  >
                    {selectedProperty.status as string}
                  </Badge>
                </p>
              </div>
              <div className="card p-3">
                <p className="text-sm text-slate-600">Listing Agent</p>
                <p className="font-medium text-slate-900">
                  {selectedProperty.agent as string}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3">
              <Button
                variant="secondary"
                onClick={() => setSelectedProperty(null)}
              >
                Close
              </Button>
              <Button variant="primary">Edit Property</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PropertyListingsPage;
