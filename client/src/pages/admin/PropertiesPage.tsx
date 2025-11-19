import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, Plus } from 'lucide-react';
import { PropertyMegaRow } from '@/components/admin/PropertyMegaRow';
import { PropertyDrawer } from '@/components/admin/PropertyDrawer';
import { HealthMonitor } from '@/components/admin/HealthMonitor';
import { useInView } from 'react-intersection-observer';

export default function PropertiesPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProperty, setSelectedProperty] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { ref, inView } = useInView();

  // Fetch Stats
  const { data: stats, isLoading: isLoadingStats } = trpc.admin.getPropertiesStats.useQuery();

  // Fetch Properties with Infinite Scroll
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = trpc.admin.listProperties.useInfiniteQuery(
    {
      limit: 20,
      search: searchTerm || undefined,
      status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
    },
    {
      getNextPageParam: (lastPage) => {
        if (lastPage.pagination.page < lastPage.pagination.totalPages) {
          return lastPage.pagination.page + 1;
        }
        return undefined;
      },
    }
  );

  // Load more when scrolling to bottom
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  // Redirect if not authenticated or not super admin
  if (!isAuthenticated || user?.role !== 'super_admin') {
    setLocation('/login');
    return null;
  }

  const handleView = (property: any) => {
    setSelectedProperty(property);
    setIsDrawerOpen(true);
  };

  const handleEdit = (property: any) => {
    // Navigate to edit page (placeholder)
    console.log('Edit', property.id);
  };

  const handleDelete = (property: any) => {
    if (confirm('Are you sure you want to delete this listing?')) {
      console.log('Delete', property.id);
    }
  };

  const handleApprove = (property: any) => {
    console.log('Approve', property.id);
    // Call mutation here
  };

  const handleReject = (property: any) => {
    console.log('Reject', property.id);
    // Call mutation here
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Property Listings</h1>
            <p className="text-slate-500">Central Command: Monitor and moderate listings</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" /> Add New Listing
          </Button>
        </div>

        {/* Health Monitor */}
        <HealthMonitor stats={stats} isLoading={isLoadingStats} />

        {/* Filters */}
        <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm py-4 mb-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by title, address, or city..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="bg-white">
              <Filter className="h-4 w-4 mr-2" /> More Filters
            </Button>
          </div>
        </div>

        {/* Listings List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500">Loading listings...</div>
          ) : !data?.pages[0].properties.length ? (
            <div className="py-12 text-center text-slate-500">
              No properties found matching your filters.
            </div>
          ) : (
            <>
              {data.pages.map((page, i) => (
                <div key={i}>
                  {page.properties.map((property: any) => (
                    <PropertyMegaRow
                      key={property.id}
                      property={property}
                      onView={handleView}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onApprove={handleApprove}
                      onReject={handleReject}
                    />
                  ))}
                </div>
              ))}
              
              {/* Infinite Scroll Trigger */}
              <div ref={ref} className="py-8 text-center">
                {isFetchingNextPage ? (
                  <span className="text-slate-400 text-sm">Loading more...</span>
                ) : hasNextPage ? (
                  <span className="text-slate-400 text-sm">Scroll for more</span>
                ) : (
                  <span className="text-slate-400 text-sm">End of results</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Drawer */}
        <PropertyDrawer
          property={selectedProperty}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </div>
    </div>
  );
}
