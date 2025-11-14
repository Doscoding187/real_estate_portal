import React, { useState } from 'react';
import {
  Plus,
  Home,
  Search,
  Grid3X3,
  Share2,
  Calendar,
  Eye,
  RotateCcw,
  BarChart3,
  MousePointer,
  Users,
} from 'lucide-react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';

const FeaturedPlacementsPage: React.FC = () => {
  const [selectedPlacement, setSelectedPlacement] = useState<Record<
    string,
    React.ReactNode
  > | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Placement types cards data
  const placementTypes = [
    {
      title: 'Homepage Hero',
      icon: <Home className="h-6 w-6 text-blue-600" />,
      currentListing: '3 Bed House in Sandton',
      price: 'R 15,000/week',
      availableSlots: 1,
      revenue: 'R 60,000',
      color: 'bg-blue-100',
    },
    {
      title: 'Search Results Top Placement',
      icon: <Search className="h-6 w-6 text-green-600" />,
      activeListings: 24,
      price: 'R 2,500/listing/week',
      totalRevenue: 'R 45,000',
      color: 'bg-green-100',
    },
    {
      title: 'Category Featured',
      icon: <Grid3X3 className="h-6 w-6 text-purple-600" />,
      categories: 5,
      price: 'R 5,000/category/week',
      totalRevenue: 'R 25,000',
      color: 'bg-purple-100',
    },
    {
      title: 'Social Media Promotion',
      icon: <Share2 className="h-6 w-6 text-cyan-600" />,
      posts: 12,
      price: 'R 1,200/post',
      totalRevenue: 'R 14,400',
      color: 'bg-cyan-100',
    },
  ];

  // Active featured listings table data
  const featuredListingsData: Record<string, React.ReactNode>[] = [
    {
      id: 1,
      title: 'Luxury Penthouse in Sandton',
      type: 'Homepage Hero',
      owner: 'PropCity Estates',
      start: '2025-11-01',
      end: '2025-11-07',
      price: 'R 15,000',
      impressions: 12450,
      clicks: 342,
      leads: 28,
      status: 'Active',
    },
    {
      id: 2,
      title: 'Modern Apartment in Cape Town',
      type: 'Search Results Top',
      owner: 'Cape Town Properties',
      start: '2025-11-05',
      end: '2025-11-12',
      price: 'R 2,500',
      impressions: 8750,
      clicks: 210,
      leads: 15,
      status: 'Active',
    },
    {
      id: 3,
      title: 'Commercial Office Space',
      type: 'Category Featured',
      owner: 'Johannesburg Real Estate',
      start: '2025-11-10',
      end: '2025-11-17',
      price: 'R 5,000',
      impressions: 5620,
      clicks: 180,
      leads: 22,
      status: 'Scheduled',
    },
    {
      id: 4,
      title: 'Family Home in Durban',
      type: 'Social Media Promotion',
      owner: 'Durban Homes',
      start: '2025-10-25',
      end: '2025-10-31',
      price: 'R 1,200',
      impressions: 9800,
      clicks: 156,
      leads: 12,
      status: 'Expired',
    },
  ];

  const featuredListingsColumns = [
    { key: 'title', title: 'Property Title', sortable: true },
    { key: 'type', title: 'Placement Type', sortable: true },
    { key: 'owner', title: 'Owner', sortable: true },
    { key: 'start', title: 'Start Date', sortable: true },
    { key: 'end', title: 'End Date', sortable: true },
    { key: 'price', title: 'Price Paid', sortable: true },
    { key: 'impressions', title: 'Impressions', sortable: true },
    { key: 'clicks', title: 'Clicks', sortable: true },
    { key: 'leads', title: 'Leads Generated', sortable: true },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value: string) => (
        <Badge
          variant={
            value === 'Active'
              ? 'success'
              : value === 'Scheduled'
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
      render: (_: unknown, record: Record<string, React.ReactNode>) => (
        <div className="flex space-x-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedPlacement(record)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm">
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Calendar data for booking system
  const calendarData = [
    { date: '2025-11-15', slots: 3, booked: 1, status: 'available' },
    { date: '2025-11-16', slots: 3, booked: 2, status: 'limited' },
    { date: '2025-11-17', slots: 3, booked: 3, status: 'full' },
    { date: '2025-11-18', slots: 3, booked: 0, status: 'available' },
    { date: '2025-11-19', slots: 3, booked: 1, status: 'available' },
    { date: '2025-11-20', slots: 3, booked: 2, status: 'limited' },
    { date: '2025-11-21', slots: 3, booked: 3, status: 'full' },
  ];

  return (
    <div className="p-3">
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Featured Placements
            </h1>
            <p className="text-slate-600 text-sm">
              Manage paid property boosts and premium placements
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsBookingModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Book Placement
          </Button>
        </div>
      </div>

      {/* Placement Types Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {placementTypes.map((type, index) => (
          <div
            key={index}
            className="card p-3 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-slate-900 font-medium">{type.title}</h3>
                <div className="mt-2 space-y-1">
                  {'currentListing' in type && (
                    <p className="text-xs text-slate-600">
                      <span className="font-medium">Current:</span>{' '}
                      {type.currentListing}
                    </p>
                  )}
                  {'activeListings' in type && (
                    <p className="text-xs text-slate-600">
                      <span className="font-medium">Active:</span>{' '}
                      {type.activeListings} listings
                    </p>
                  )}
                  {'categories' in type && (
                    <p className="text-xs text-slate-600">
                      <span className="font-medium">Categories:</span>{' '}
                      {type.categories}
                    </p>
                  )}
                  {'posts' in type && (
                    <p className="text-xs text-slate-600">
                      <span className="font-medium">Posts:</span> {type.posts}
                    </p>
                  )}
                  <p className="text-xs text-slate-600">
                    <span className="font-medium">Price:</span> {type.price}
                  </p>
                  {'availableSlots' in type && (
                    <p className="text-xs text-slate-600">
                      <span className="font-medium">Available:</span>{' '}
                      {type.availableSlots} slots
                    </p>
                  )}
                  <p className="text-xs text-slate-600">
                    <span className="font-medium">Revenue:</span>{' '}
                    {type.totalRevenue || type.revenue}
                  </p>
                </div>
              </div>
              <div className={`p-2 rounded-full ${type.color}`}>
                {type.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Active Featured Listings Table */}
      <div className="card p-3 mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Active Featured Listings
          </h2>
          <div className="flex flex-wrap gap-1 mt-2 md:mt-0">
            <select className="text-sm border border-slate-300 rounded-lg px-2 py-1">
              <option>All Placement Types</option>
              <option>Homepage Hero</option>
              <option>Search Results Top</option>
              <option>Category Featured</option>
              <option>Social Media Promotion</option>
            </select>
            <select className="text-sm border border-slate-300 rounded-lg px-2 py-1">
              <option>All Statuses</option>
              <option>Active</option>
              <option>Scheduled</option>
              <option>Expired</option>
            </select>
          </div>
        </div>
        <Table
          data={featuredListingsData}
          columns={featuredListingsColumns}
          loading={false}
        />
      </div>

      {/* Booking System Calendar */}
      <div className="card p-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Booking System</h2>
          <div className="flex gap-1 mt-2 md:mt-0">
            <Button variant="secondary" size="sm">
              <Calendar className="h-4 w-4 mr-1" />
              This Week
            </Button>
            <Button variant="secondary" size="sm">
              Next Week
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {calendarData.map((day, index) => (
            <div
              key={index}
              className={`border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow ${
                day.status === 'full'
                  ? 'bg-red-50 border-red-200'
                  : day.status === 'limited'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-green-50 border-green-200'
              }`}
              onClick={() => setIsBookingModalOpen(true)}
            >
              <div className="text-center">
                <p className="font-medium text-slate-900 text-sm">
                  {new Date(day.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                  })}
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {new Date(day.date).getDate()}
                </p>
                <div className="mt-1 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Slots:</span>
                    <span className="font-medium">{day.slots}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Booked:</span>
                    <span className="font-medium">{day.booked}</span>
                  </div>
                </div>
                <div className="mt-1">
                  {day.status === 'full' ? (
                    <Badge variant="error" size="sm">
                      Full
                    </Badge>
                  ) : day.status === 'limited' ? (
                    <Badge variant="warning" size="sm">
                      Limited
                    </Badge>
                  ) : (
                    <Badge variant="success" size="sm">
                      Available
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-xs text-slate-600">Available</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
              <span className="text-xs text-slate-600">
                Limited Availability
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              <span className="text-xs text-slate-600">Fully Booked</span>
            </div>
          </div>
        </div>
      </div>

      {/* Placement Details Modal */}
      {selectedPlacement && (
        <Modal
          isOpen={!!selectedPlacement}
          onClose={() => setSelectedPlacement(null)}
          title={`Placement Details: ${selectedPlacement.title as string}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Placement Information */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                Placement Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="card p-3">
                  <p className="text-sm text-slate-600">Property Title</p>
                  <p className="font-bold text-slate-900">
                    {selectedPlacement.title as string}
                  </p>
                </div>
                <div className="card p-3">
                  <p className="text-sm text-slate-600">Placement Type</p>
                  <p className="font-bold text-slate-900">
                    {selectedPlacement.type as string}
                  </p>
                </div>
                <div className="card p-3">
                  <p className="text-sm text-slate-600">Owner</p>
                  <p className="font-bold text-slate-900">
                    {selectedPlacement.owner as string}
                  </p>
                </div>
                <div className="card p-3">
                  <p className="text-sm text-slate-600">Status</p>
                  <p className="font-bold text-slate-900">
                    <Badge
                      variant={
                        selectedPlacement.status === 'Active'
                          ? 'success'
                          : selectedPlacement.status === 'Scheduled'
                            ? 'warning'
                            : 'default'
                      }
                    >
                      {selectedPlacement.status as string}
                    </Badge>
                  </p>
                </div>
                <div className="card p-3">
                  <p className="text-sm text-slate-600">Start Date</p>
                  <p className="font-bold text-slate-900">
                    {selectedPlacement.start as string}
                  </p>
                </div>
                <div className="card p-3">
                  <p className="text-sm text-slate-600">End Date</p>
                  <p className="font-bold text-slate-900">
                    {selectedPlacement.end as string}
                  </p>
                </div>
                <div className="card p-3">
                  <p className="text-sm text-slate-600">Price Paid</p>
                  <p className="font-bold text-slate-900">
                    {selectedPlacement.price as string}
                  </p>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                Performance Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="card p-3">
                  <div className="flex items-center">
                    <Eye className="h-5 w-5 text-blue-500 mr-2" />
                    <p className="text-sm text-slate-600">Impressions</p>
                  </div>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {selectedPlacement.impressions as number}
                  </p>
                </div>
                <div className="card p-3">
                  <div className="flex items-center">
                    <MousePointer className="h-5 w-5 text-green-500 mr-2" />
                    <p className="text-sm text-slate-600">Clicks</p>
                  </div>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {selectedPlacement.clicks as number}
                  </p>
                </div>
                <div className="card p-3">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-purple-500 mr-2" />
                    <p className="text-sm text-slate-600">Leads Generated</p>
                  </div>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {selectedPlacement.leads as number}
                  </p>
                </div>
              </div>
            </div>

            {/* Performance Chart */}
            <div className="card p-3">
              <h4 className="font-medium text-slate-900 mb-3">
                Performance Over Time
              </h4>
              <div className="h-40 flex items-end space-x-1">
                {[65, 80, 60, 90, 75, 85, 70].map((height, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center flex-1"
                  >
                    <div
                      className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition"
                      style={{ height: `${height}%` }}
                    ></div>
                    <span className="text-xs text-slate-500 mt-1">
                      Day {index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200">
              <Button variant="primary" size="sm">
                Extend Placement
              </Button>
              <Button variant="secondary" size="sm">
                View Property
              </Button>
              <Button variant="secondary" size="sm">
                Generate Report
              </Button>
              <Button variant="danger" size="sm">
                Issue Refund
              </Button>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setSelectedPlacement(null)}
            >
              Close
            </Button>
          </div>
        </Modal>
      )}

      {/* Booking Modal */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title="Book Featured Placement"
        size="md"
      >
        <form className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Property
              </label>
              <select className="w-full px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                <option>Select Property</option>
                <option>3 Bed House in Sandton</option>
                <option>Luxury Penthouse in Sandton</option>
                <option>Modern Apartment in Cape Town</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Placement Type
              </label>
              <select className="w-full px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                <option>Select Type</option>
                <option>Homepage Hero</option>
                <option>Search Results Top</option>
                <option>Category Featured</option>
                <option>Social Media Promotion</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              className="w-full px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Special requirements or instructions"
            ></textarea>
          </div>

          <div className="flex justify-end space-x-2 pt-3">
            <Button
              variant="secondary"
              onClick={() => setIsBookingModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Book Placement
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FeaturedPlacementsPage;
